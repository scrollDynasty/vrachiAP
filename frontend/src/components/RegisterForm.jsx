// frontend/src/components/RegisterForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Spinner, Checkbox, Card, CardHeader, CardBody, Input, Select, SelectItem, Divider, Radio, RadioGroup, Textarea } from '@nextui-org/react';
import api from '../api'; // Импортируем API для получения списка районов
import { useNavigate } from 'react-router-dom';

function RegisterForm({ onSubmit, isLoading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [userType, setUserType] = useState('patient'); // Только пациент
  const [formError, setFormError] = useState(null);
  const [districts, setDistricts] = useState([]);
  const [district, setDistrict] = useState('');
  const [fullName, setFullName] = useState(''); // ФИО
  const [phone, setPhone] = useState(''); // Номер телефона
  const [address, setAddress] = useState(''); // Адрес
  const [medicalInfo, setMedicalInfo] = useState(''); // Медицинская информация
  const [agreeTos, setAgreeTos] = useState(false);
  const [registrationSuccessful, setRegistrationSuccessful] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const navigate = useNavigate();

  // Загрузка списка районов при монтировании компонента
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const districtsData = await api.getDistricts();
        setDistricts(districtsData);
      } catch (error) {
        console.error('Failed to load districts:', error);
      }
    };
    
    fetchDistricts();
  }, []);

  // Проверяем совпадение паролей при изменении любого из них
  useEffect(() => {
    if (password && confirmPassword) {
      setPasswordMismatch(password !== confirmPassword);
    } else {
      setPasswordMismatch(false);
    }
  }, [password, confirmPassword]);

  // Валидация формы
  const validateForm = () => {
    // Базовая валидация полей
    if (!email) return "Пожалуйста, введите email";
    if (!password) return "Пожалуйста, введите пароль";
    if (password !== confirmPassword) return "Пароли не совпадают";
    if (passwordMismatch) return "Пароли не совпадают";
    if (password.length < 8) return "Пароль должен содержать минимум 8 символов";
    if (!fullName) return "Пожалуйста, введите ваше ФИО";
    if (!phone) return "Пожалуйста, введите номер телефона";
    if (!district) return "Пожалуйста, выберите район проживания";
    if (!address) return "Пожалуйста, введите ваш адрес";
    if (!agreeTos) return "Вы должны согласиться с условиями использования";
    
    // Email валидация
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return "Пожалуйста, введите корректный email";
    }
    
    // Телефонная валидация (простая)
    const phoneRegex = /^[+]?[0-9]{10,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      return "Пожалуйста, введите корректный номер телефона (от 10 до 15 цифр)";
    }
    
    return null;
  };

  // Функция для обновления состояния пароля с проверкой совпадения
  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  // Функция для обновления состояния подтверждения пароля с проверкой совпадения
  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
  };

  // Обработчик отправки формы
  const handleSubmit = async (event) => {
    event.preventDefault();
    
    // Сбрасываем ошибку перед валидацией
    setFormError(null);
    
    // Валидация формы
    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    
    try {
      // Подготовка данных для регистрации
      const userData = {
        email: email.trim(),
        password: password,
        role: "patient", // Всегда роль пациента
        district: district,
        full_name: fullName.trim(),
        contact_phone: phone.trim(),
        contact_address: address.trim(),
        medical_info: medicalInfo.trim()
      };
      
      console.log("RegisterForm: Sending registration data", { 
        email: userData.email,
        role: userData.role,
        hasPassword: !!userData.password,
        district: userData.district
      });
      
      // Вызываем функцию onSubmit из родительского компонента
      const result = await onSubmit(userData);
      
      console.log("RegisterForm: Registration result", result);
      
      // Проверяем результат на явный признак неудачной регистрации
      if (result && result.success === false) {
        console.error('Registration failed with explicit failure:', result.error);
        setFormError(result.error || "Ошибка при регистрации. Пожалуйста, попробуйте позже.");
        // Так как ошибка уже обработана, не пробрасываем её дальше
        return;
      }
      
      // Если регистрация успешна и требуется подтверждение email
      if (result && result.success === true && result.requiresEmailVerification) {
        // Сохраняем данные в локальное хранилище для возможного повторного использования
        try {
          localStorage.setItem('vrach_registration_profile', JSON.stringify({
            email: email.trim(),
            timestamp: new Date().toISOString()
          }));
        } catch (e) {
          console.error('Error saving registration data to localStorage:', e);
        }
        
        // Обновляем состояние для отображения сообщения об успешной регистрации
        setRegistrationSuccessful(true);
        setVerificationRequired(true);
        setRegisteredEmail(email.trim());
      } else if (result && result.success === true) {
        // Если регистрация успешна, но не требуется подтверждение email
        setRegistrationSuccessful(true);
        setVerificationRequired(false);
        setRegisteredEmail(email.trim());
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Если есть оригинальное сообщение об ошибке в error.message, используем его
      const errorMessage = error.message || "Ошибка при регистрации";
      console.log("Original error message:", errorMessage);
      
      // Обработка ошибок
      if (error.response) {
        const status = error.response.status;
        let detail = error.response.data?.detail || '';
        
        // Выводим подробную информацию для отладки
        console.log("RegisterForm: Error details:", {
          status,
          statusText: error.response.statusText,
          data: error.response.data,
          detail: error.response.data?.detail
        });
        
        // Если есть детали ошибки в ответе, используем их
        if (detail) {
          console.log("Registration error detail from server:", detail);
          
          // Проверяем разные типы ошибок по сообщению
          if (detail.toLowerCase().includes('email') && detail.toLowerCase().includes('уже зарегистрирован')) {
            setFormError("Этот email уже зарегистрирован. Пожалуйста, используйте другой email или выполните вход.");
          } else if (detail.toLowerCase().includes('телефон') && detail.toLowerCase().includes('уже зарегистрирован')) {
            setFormError("Этот номер телефона уже зарегистрирован. Пожалуйста, используйте другой номер или выполните вход.");
          } else if (detail.toLowerCase().includes('уже зарегистрирован')) {
            setFormError("Этот пользователь уже зарегистрирован. Пожалуйста, используйте другие данные или выполните вход.");
          } else if (detail.toLowerCase().includes('already registered')) {
            setFormError("Этот пользователь уже зарегистрирован. Пожалуйста, используйте другие данные или выполните вход.");
          } else {
            // Показываем оригинальное сообщение от сервера
            setFormError(detail);
          }
        } else {
          // Если нет деталей, используем статус для формирования сообщения
          if (status === 400) {
            setFormError("Ошибка в данных регистрации. Пожалуйста, проверьте все поля.");
          } else if (status === 409) {
            setFormError("Пользователь с такими данными уже существует.");
          } else {
            setFormError("Ошибка регистрации: " + errorMessage);
          }
        }
      } else if (errorMessage) {
        // Если нет ответа, но есть сообщение об ошибке, показываем его
        setFormError(errorMessage);
      } else {
        // Общее сообщение, если ничего другого не подходит
        setFormError("Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.");
      }
    }
  };

  // Если регистрация прошла успешно, показываем сообщение об этом
  if (registrationSuccessful) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Card className="shadow-xl border border-gray-100">
          <CardHeader className="flex flex-col gap-1 items-center bg-green-50 py-6">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-green-100 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-green-800">Регистрация успешна!</h2>
            <p className="text-green-600 text-sm">Ваш аккаунт успешно создан</p>
          </CardHeader>
          
          <CardBody className="px-6 py-8">
            {verificationRequired ? (
              <div className="space-y-6">
                <div className="bg-blue-50 p-5 rounded-lg text-blue-700 border border-blue-200">
                  <h3 className="font-bold text-lg mb-2">Подтвердите ваш Email</h3>
                  <p className="mb-3">Мы отправили письмо с ссылкой для подтверждения на адрес:</p>
                  <div className="p-3 bg-white rounded-md border border-blue-100 font-medium text-center mb-3">
                    {registeredEmail}
                  </div>
                  <p className="mb-2">Пожалуйста, проверьте вашу почту и нажмите на ссылку для активации аккаунта.</p>
                  <p className="text-sm text-blue-600">Письмо может прийти в течение нескольких минут. Проверьте также папку "Спам".</p>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold">Что делать дальше?</h4>
                  <ol className="list-decimal list-inside space-y-2 pl-4">
                    <li>Проверьте ваш почтовый ящик</li>
                    <li>Найдите письмо от MedCare</li>
                    <li>Нажмите на ссылку для подтверждения в письме</li>
                    <li>После подтверждения вы сможете войти в систему</li>
                  </ol>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <Button 
                    color="primary" 
                    className="w-full py-6 font-semibold"
                    onClick={() => navigate('/verify-email')}
                  >
                    Подтвердить email
                  </Button>
                  <Button 
                    color="default" 
                    variant="flat"
                    className="w-full py-6 font-semibold"
                    onClick={() => navigate('/login')}
                  >
                    Перейти к входу
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-green-50 p-5 rounded-lg text-green-700 border border-green-200">
                  <h3 className="font-bold text-lg mb-2">Регистрация завершена</h3>
                  <p>Ваш аккаунт успешно создан. Теперь вы можете войти в систему.</p>
                </div>
                
                <Button 
                  color="primary" 
                  className="w-full py-6 font-semibold"
                  onClick={() => navigate('/login')}
                >
                  Перейти к входу
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="shadow-xl border border-gray-100">
        <CardHeader className="flex flex-col gap-1 items-center bg-primary-50 py-6">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-primary-100 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary-800">Регистрация</h2>
          <p className="text-primary-600 text-sm">Создайте новый аккаунт в MedCare</p>
        </CardHeader>
        
        <CardBody className="px-6 py-8">
          {/* Отображение загрузки */}
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl shadow-xl flex flex-col items-center">
                <Spinner size="lg" color="primary" className="mb-4" />
                <p className="text-gray-700 font-medium">Регистрация...</p>
              </div>
            </div>
          )}
          
          {/* Отображаем ошибку */}
          {(error || formError) && (
            <div className="p-4 rounded-lg mb-6 bg-red-50 text-red-700 border border-red-200">
              <p className="font-medium">{error || formError}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">ФИО и контактные данные</h3>
              
              <Input
                type="text"
                label="ФИО"
                placeholder="Введите ваше полное имя"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                variant="bordered"
                radius="sm"
                fullWidth
                isRequired
                startContent={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
              
              <Input
                type="tel"
                label="Номер телефона"
                placeholder="Введите ваш номер телефона"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                variant="bordered"
                radius="sm"
                fullWidth
                isRequired
                startContent={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                }
              />
              
              <Input
                type="text"
                label="Адрес"
                placeholder="Введите ваш адрес"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                variant="bordered"
                radius="sm"
                fullWidth
                isRequired
                startContent={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                }
              />
            </div>
            
            <Divider />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Район проживания</h3>
              
              <Select
                label="Район проживания"
                placeholder="Выберите район"
                variant="bordered"
                radius="sm"
                fullWidth
                isRequired
                selectedKeys={district ? [district] : []}
                onSelectionChange={(keys) => {
                  if (keys.size > 0) {
                    setDistrict(Array.from(keys)[0]);
                  } else {
                    setDistrict('');
                  }
                }}
                startContent={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                }
              >
                {districts.map((district) => (
                  <SelectItem key={district} value={district}>
                    {district}
                  </SelectItem>
                ))}
              </Select>
            </div>
            
            <Divider />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Медицинская информация</h3>
              
              <Textarea
                label="Медицинская информация"
                placeholder="Введите информацию о вашем здоровье, хронических заболеваниях, аллергиях и т.д."
                value={medicalInfo}
                onChange={(e) => setMedicalInfo(e.target.value)}
                variant="bordered"
                radius="sm"
                fullWidth
                minRows={3}
                maxRows={5}
              />
            </div>
            
            <Divider />
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Учётные данные</h3>
              
              <Input
                type="email"
                label="Email"
                placeholder="Введите ваш email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                variant="bordered"
                radius="sm"
                fullWidth
                isRequired
                startContent={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="password"
                  label="Пароль"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={handlePasswordChange}
                  variant="bordered"
                  radius="sm"
                  fullWidth
                  isRequired
                  isInvalid={passwordMismatch}
                  color={passwordMismatch ? "danger" : "default"}
                  errorMessage={passwordMismatch ? "Пароли не совпадают" : ""}
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />
                
                <Input
                  type="password"
                  label="Подтверждение пароля"
                  placeholder="Повторите пароль"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  variant="bordered"
                  radius="sm"
                  fullWidth
                  isRequired
                  isInvalid={passwordMismatch}
                  color={passwordMismatch ? "danger" : "default"}
                  errorMessage={passwordMismatch ? "Пароли не совпадают" : ""}
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  }
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <Checkbox
                isSelected={agreeTos}
                onValueChange={setAgreeTos}
                color="primary"
              >
                <span className="text-sm">
                  Я согласен с <a href="#" className="text-primary-600 hover:underline">условиями использования</a> и <a href="#" className="text-primary-600 hover:underline">политикой конфиденциальности</a>
                </span>
              </Checkbox>
              
              <Button
                type="submit"
                color="primary"
                className="w-full py-6 font-semibold"
                isLoading={isLoading}
                isDisabled={!agreeTos}
              >
                {isLoading ? <Spinner size="sm" color="white" /> : 'Зарегистрироваться'}
              </Button>
              
              <div className="text-center mt-4">
                <p className="text-gray-600">
                  Уже есть аккаунт?{' '}
                  <button 
                    onClick={() => navigate('/login')}
                    className="text-primary-600 hover:underline font-medium"
                  >
                    Войти
                  </button>
                </p>
              </div>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default RegisterForm;