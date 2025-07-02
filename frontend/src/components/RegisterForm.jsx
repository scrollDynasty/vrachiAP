// frontend/src/components/RegisterForm.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Button, Spinner, Checkbox, Card, CardHeader, CardBody, Input, Select, SelectItem, Divider, Radio, RadioGroup, Textarea } from '@nextui-org/react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api'; // Импортируем API для получения списка районов
import { getRegions, getDistrictsByRegion } from '../constants/uzbekistanRegions';
import { translateRegion, translateDistrict } from './RegionTranslations';
import { useTranslation } from './LanguageSelector'; // Импортируем новую структуру регионов
import { useNavigate } from 'react-router-dom';
import MedicalLoader from './MedicalLoader';

function RegisterForm({ onSubmit, isLoading, error }) {
  const { t, currentLanguage } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMismatch, setPasswordMismatch] = useState(false);
  const [userType, setUserType] = useState('patient'); // Только пациент
  const [formError, setFormError] = useState(null);
  const [availableRegions, setAvailableRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [fullName, setFullName] = useState(''); // ФИО
  const [phone, setPhone] = useState(''); // Номер телефона
  const [address, setAddress] = useState(''); // Адрес
  const [medicalInfo, setMedicalInfo] = useState(''); // Медицинская информация
  const [agreeTos, setAgreeTos] = useState(false);
  const [registrationSuccessful, setRegistrationSuccessful] = useState(false);
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const navigate = useNavigate();

  // Анимационные переменные
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.06,
        duration: 0.4
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  // Декоративные элементы для вау-эффекта - убираем блюр
  const floatingElements = [
    { size: '60px', delay: 0, duration: 8, x: [-10, 10], y: [-5, 5], color: 'from-blue-400/30 to-indigo-400/30' },
    { size: '100px', delay: 1, duration: 10, x: [5, -5], y: [10, -10], color: 'from-purple-400/20 to-pink-400/20' },
    { size: '80px', delay: 2, duration: 12, x: [-8, 8], y: [8, -8], color: 'from-indigo-300/20 to-sky-300/20' },
    { size: '40px', delay: 3, duration: 9, x: [15, -15], y: [-12, 12], color: 'from-cyan-400/20 to-blue-400/20' },
  ];

  // Загрузка списка регионов при монтировании компонента
  useEffect(() => {
    // Загружаем список регионов/областей
    const regions = getRegions();
    setAvailableRegions(regions);
  }, []);

  // Обработчик изменения региона/области
  const handleRegionChange = (e) => {
    const regionName = e.target.value;
    setSelectedRegion(regionName);
    setSelectedDistrict(''); // Сбрасываем выбранный район
    
    // Загружаем районы выбранного региона
    const districts = getDistrictsByRegion(regionName);
    setAvailableDistricts(districts);
  };

  // Проверка валидности email с помощью регулярного выражения
  const isValidEmail = useCallback((email) => {
    // Простая проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }, []);

  // Проверка совпадения паролей
  useEffect(() => {
    if (confirmPassword && password !== confirmPassword) {
      setPasswordMismatch(true);
    } else {
      setPasswordMismatch(false);
    }
  }, [password, confirmPassword]);

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Сбрасываем ошибки перед новой отправкой
    setFormError(null);
    
    // Проверка заполнения обязательных полей
    if (!fullName) {
      setFormError("Пожалуйста, введите ваше полное имя");
      return;
    }
    if (!email) {
      setFormError("Пожалуйста, введите email");
      return;
    }
    if (!password) {
      setFormError("Пожалуйста, введите пароль");
      return;
    }
    if (!confirmPassword) {
      setFormError("Пожалуйста, подтвердите пароль");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setFormError("Пароль должен содержать не менее 8 символов");
      return;
    }
    if (!isValidEmail(email)) {
      setFormError("Пожалуйста, введите корректный email");
      return;
    }
    if (!phone) {
      setFormError("Пожалуйста, введите номер телефона");
      return;
    }
    if (!selectedRegion) {
      setFormError("Пожалуйста, выберите город/область");
      return;
    }
    if (!selectedDistrict) {
      setFormError("Пожалуйста, выберите район");
      return;
    }
    if (!agreeTos) {
      setFormError("Для регистрации необходимо согласиться с условиями использования");
      return;
    }
    
    // Создаем объект с данными пользователя
    // ВАЖНО: отправляем оригинальные названия (selectedRegion/selectedDistrict),
    // а не переведенные версии, чтобы данные в БД были консистентными
    const userData = {
      email: email.trim(),
      password,
      role: userType,
      full_name: fullName.trim(),
      contact_phone: phone.trim(),
      city: selectedRegion,  // оригинальное название города/области (рус)
      district: selectedDistrict,  // оригинальное название района (рус)
      contact_address: address.trim(),
      medical_info: medicalInfo.trim()
    };
    
    try {
      
      // Вызов функции регистрации из родительского компонента (обычно AuthPage.handleRegister)
      const result = await onSubmit(userData);
      
      if (result && result.success === false) {
        setFormError(result.error || "Ошибка при регистрации. Пожалуйста, попробуйте позже.");
        // Так как ошибка уже обработана, не пробрасываем её дальше
        return;
      }
      

      
      // Если регистрация успешна и требуется подтверждение email
      if (result && result.success === true && result.requiresEmailVerification) {
        // Сохраняем данные в локальное хранилище для возможного повторного использования
        try {
          // Создаем объект с данными профиля
          const profileData = {
            email: email.trim(),
            fullName: fullName.trim(),
            phone: phone.trim(),
            city: selectedRegion,  // сохраняем город/область
            district: selectedDistrict,  // сохраняем район
            address: address.trim(),
            medicalInfo: medicalInfo.trim(),
            timestamp: new Date().toISOString()
          };
          
          // Сохраняем в localStorage
          localStorage.setItem('vrach_registration_profile', JSON.stringify(profileData));
        } catch (e) {
          // Игнорируем ошибки сохранения данных
        }
        
        // Обновляем состояние для отображения сообщения об успешной регистрации
        setRegistrationSuccessful(true);
        setVerificationRequired(true);
        setRegisteredEmail(result.email || email.trim());
      } else if (result && result.success === true) {
        // Если регистрация успешна, но не требуется подтверждение email
        setRegistrationSuccessful(true);
        setVerificationRequired(false);
        setRegisteredEmail(email.trim());
      }
      
    } catch (err) {
      // Проверяем, не является ли это ошибкой от расширений браузера
      if (err.message && err.message.includes('inpage.js')) {
        setFormError("Обнаружено вмешательство расширений браузера. Попробуйте отключить расширения или использовать режим инкогнито.");
      } else if (err.message && err.message.includes('Cannot read properties of null')) {
        setFormError("Ошибка интерфейса. Попробуйте обновить страницу или использовать другой браузер.");
      } else {
        setFormError(err.message || "Произошла ошибка при регистрации. Пожалуйста, попробуйте позже.");
      }
    }
  };

  // Если форма уже отправлена и есть ошибка от родительского компонента, показываем ее
  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  // Показать ошибку валидации формы
  const displayError = formError || error;

  // Если регистрация успешна, показываем сообщение об успехе
  if (registrationSuccessful) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto"
      >
        <Card className="bg-white/90 border border-gray-100 shadow-xl">
          <CardBody className="px-8 py-10 text-center">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-3">{t('registrationSuccess')}</h2>
            
            {verificationRequired ? (
              <>
                <p className="text-gray-600 mb-6">
                  {t('verificationEmailSent')} <span className="font-semibold">{registeredEmail}</span>. 
                  {t('verificationInstructions')}
                </p>
                
                <Button
                  color="primary"
                  className="w-full font-semibold text-white py-7 mt-2 bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/30"
                  onClick={() => navigate('/login')}
                  radius="lg"
                >
                  Перейти на страницу входа
                </Button>
                
                <p className="text-sm text-gray-500 mt-6">
                  Не получили письмо? Проверьте папку "Спам" или{' '}
                  <button 
                    className="text-primary font-medium hover:text-primary-dark transition-colors"
                    onClick={() => {/* Логика повторной отправки письма */}}
                  >
                    отправить повторно
                  </button>
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-6">
                  Ваш аккаунт успешно создан. Теперь вы можете войти в систему, используя указанные учетные данные.
                </p>
                
                <Button
                  color="primary"
                  className="w-full font-semibold text-white py-7 mt-2 bg-gradient-to-r from-primary to-indigo-600 shadow-lg shadow-primary/30"
                  onClick={() => navigate('/login')}
                  radius="lg"
                >
                  Перейти на страницу входа
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      </motion.div>
    );
  }

  // Основная форма регистрации
  return (
    <div className="w-full max-w-2xl mx-auto relative register-form">
      {/* Плавающие декоративные элементы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {floatingElements.map((el, index) => (
          <motion.div
            key={index}
            className={`absolute rounded-full bg-gradient-to-br ${el.color} opacity-60`}
            style={{ 
              width: el.size, 
              height: el.size,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              x: el.x,
              y: el.y,
              scale: [1, 1.05, 0.95, 1],
            }}
            transition={{
              repeat: Infinity,
              repeatType: "reverse",
              duration: el.duration,
              delay: el.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
      
      <motion.div
        initial={{ rotateX: -10, scale: 0.95, opacity: 0 }}
        animate={{ rotateX: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
        style={{ perspective: 1000 }}
        className="relative z-10"
      >
        <Card className="bg-white/90 border border-white/20 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 to-purple-50/20 pointer-events-none"></div>
          
          <motion.div 
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 opacity-30"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 180, 270, 360],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          <CardBody className="px-6 py-8">
            <AnimatePresence>
              {displayError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 border border-red-200"
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p>{displayError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.form 
              onSubmit={handleSubmit}
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <motion.h3 
                  className="text-lg font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
                  whileHover={{ scale: 1.02 }}
                >
                  {t("basicInfo")}
                </motion.h3>
                <div className="space-y-4">
                  <Input
                    type="text"
                    label={t("fullName")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("enterFullName")}
                    variant="bordered"
                    radius="lg"
                    autoComplete="name"
                    fullWidth
                    isRequired
                    classNames={{
                      inputWrapper: "bg-white/80 border-2 hover:border-primary focus-within:border-primary transition-all",
                      input: "text-gray-800 placeholder:text-gray-400"
                    }}
                  />
                  
                  <Input
                    type="email"
                    label="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("enterEmail")}
                    variant="bordered"
                    radius="lg"
                    autoComplete="email"
                    fullWidth
                    isRequired
                    classNames={{
                      inputWrapper: "bg-white/80 border-2 hover:border-primary focus-within:border-primary transition-all",
                      input: "text-gray-800 placeholder:text-gray-400"
                    }}
                  />
                  
                  <Input
                    type="tel"
                    label={t("phoneNumber")}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("enterPhoneNumber")}
                    variant="bordered"
                    radius="lg"
                    autoComplete="tel"
                    fullWidth
                    isRequired
                    classNames={{
                      inputWrapper: "bg-white/80 border-2 hover:border-primary focus-within:border-primary transition-all",
                      input: "text-gray-800 placeholder:text-gray-400"
                    }}
                  />
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5 }}
                className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-6"
              />
              
              <motion.div variants={itemVariants}>
                <motion.h3 
                  className="text-lg font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
                  whileHover={{ scale: 1.02 }}
                >
{t("securityInfo")}
                </motion.h3>
                <div className="space-y-4">
                  <Input
                    type="password"
                    label={t('password')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("minimumChars")}
                    variant="bordered"
                    radius="lg"
                    autoComplete="new-password"
                    fullWidth
                    isRequired
                    classNames={{
                      inputWrapper: "bg-white/80 border-2 hover:border-primary focus-within:border-primary transition-all",
                      input: "text-gray-800 placeholder:text-gray-400"
                    }}
                    startContent={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    }
                  />
                  
                  <Input
                    type="password"
                    label={t("confirmPassword")}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("repeatPassword")}
                    variant="bordered"
                    radius="lg"
                    autoComplete="new-password"
                    fullWidth
                    isRequired
                    isInvalid={passwordMismatch}
                    errorMessage={passwordMismatch ? t("passwordsDontMatch") : ""}
                    classNames={{
                      inputWrapper: `bg-white/80 border-2 hover:border-primary focus-within:border-primary transition-all ${passwordMismatch ? 'border-red-500' : ''}`,
                      input: "text-gray-800 placeholder:text-gray-400"
                    }}
                    startContent={
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${passwordMismatch ? 'text-red-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    }
                  />
                </div>
              </motion.div>
              
              <motion.div 
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent my-6"
              />
              
              <motion.div variants={itemVariants}>
                <motion.h3 
                  className="text-lg font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
                  whileHover={{ scale: 1.02 }}
                >
{t("locationInfo")}
                </motion.h3>
                <div className="space-y-4">
                  <Select
                    label={t("cityRegion")}
                    placeholder={t("selectCityRegion")}
                    value={selectedRegion}
                    onChange={handleRegionChange}
                    variant="bordered"
                    radius="lg"
                    fullWidth
                    isRequired
                    classNames={{
                      trigger: "bg-white/80 border-2 hover:border-primary focus-within:border-primary transition-all h-[56px]",
                      value: "text-gray-800"
                    }}
                    startContent={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    }
                  >
                    {availableRegions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {translateRegion(region, currentLanguage)}
                      </SelectItem>
                    ))}
                  </Select>
                  
                  {selectedRegion && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                    >
                      <Select
                        label={t('district')}
                        placeholder={t("selectDistrict")}
                        value={selectedDistrict}
                        onChange={(e) => setSelectedDistrict(e.target.value)}
                        variant="bordered"
                        radius="lg"
                        fullWidth
                        isRequired
                        classNames={{
                          trigger: "bg-white/80 border-2 hover:border-primary focus-within:border-primary transition-all h-[56px]",
                          value: "text-gray-800"
                        }}
                        startContent={
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        }
                      >
                        {availableDistricts.map((district) => (
                          <SelectItem key={district} value={district}>
                            {translateDistrict(district, currentLanguage)}
                          </SelectItem>
                        ))}
                      </Select>
                    </motion.div>
                  )}
                </div>
              </motion.div>
              
              <motion.div variants={itemVariants}>
                <motion.h3 
                  className="text-lg font-semibold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
                  whileHover={{ scale: 1.02 }}
                >
{t("additionalInfo")}
                </motion.h3>
                <div className="space-y-4">
                  <Input
                    type="text"
                    label={t('address')}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t("enterAddress")}
                    variant="bordered"
                    radius="lg"
                    autoComplete="street-address"
                    fullWidth
                    classNames={{
                      inputWrapper: "bg-white/80 border-2 hover:border-primary focus-within:border-primary transition-all",
                      input: "text-gray-800 placeholder:text-gray-400"
                    }}
                    startContent={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    }
                  />
                  
                  <Textarea
                    label={t('medicalInfo')}
                    value={medicalInfo}
                    onChange={(e) => setMedicalInfo(e.target.value)}
                    placeholder={t("medicalInfoPlaceholder")}
                    variant="bordered"
                    radius="lg"
                    fullWidth
                    minRows={3}
                    classNames={{
                      inputWrapper: "bg-white/80 border-2 hover:border-primary focus-within:border-primary transition-all",
                      input: "text-gray-800 placeholder:text-gray-400"
                    }}
                  />
                </div>
              </motion.div>
              
              <motion.div variants={itemVariants} className="space-y-4 pt-4">
                <Checkbox
                  isSelected={agreeTos}
                  onValueChange={setAgreeTos}
                  color="primary"
                  className="items-start"
                  classNames={{
                    label: "text-sm text-left",
                    wrapper: "before:border-2 before:border-gray-300 group-data-[selected=true]:before:border-primary"
                  }}
                >
                  <span className="text-sm">
{t("agreeWith")} <motion.a 
                      href="#" 
                      className="text-primary hover:text-primary-dark font-medium transition-colors relative inline-block"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span>{t("termsOfService")}</span>
                      <motion.span 
                        className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 origin-left"
                        initial={{ scaleX: 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    </motion.a> {t("and")} <motion.a 
                      href="#" 
                      className="text-primary hover:text-primary-dark font-medium transition-colors relative inline-block"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span>{t("privacyPolicy")}</span>
                      <motion.span 
                        className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 origin-left"
                        initial={{ scaleX: 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    </motion.a>
                  </span>
                </Checkbox>
                
                <motion.div 
                  className="relative overflow-hidden group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    color="primary"
                    className="w-full font-semibold text-white py-7 text-base bg-gradient-to-r from-primary to-indigo-600 shadow-lg hover:shadow-xl z-10 relative"
                    isLoading={isLoading}
                    isDisabled={!agreeTos}
                    radius="lg"
                    disableRipple
                    startContent={!isLoading && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    )}
                  >
                    {isLoading ? <div className="flex items-center justify-center"><MedicalLoader size="small" text="" /></div> : t('registerButton')}
                  </Button>
                  
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-indigo-700/80 z-0"
                    initial={{ y: '100%' }}
                    whileHover={{ y: 0 }}
                    transition={{ duration: 0.4 }}
                  />
                </motion.div>
                
                <div className="text-center mt-4">
                  <p className="text-gray-600">
{t('alreadyHaveAccount')} 
                    <motion.a 
                      href="/login"
                      className="text-primary hover:text-primary-dark font-medium transition-colors relative inline-block"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <span className="relative z-10">{t('loginLink')}</span>
                      <motion.span 
                        className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 origin-left"
                        initial={{ scaleX: 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    </motion.a>
                  </p>
                </div>
              </motion.div>
            </motion.form>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}

export default RegisterForm;