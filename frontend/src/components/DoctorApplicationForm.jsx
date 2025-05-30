import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Textarea, Spinner, Select, SelectItem } from '@nextui-org/react';
import api from '../api';

function DoctorApplicationForm({ onSuccess }) {
  // Состояние для полей формы
  const [fullName, setFullName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [district, setDistrict] = useState('');
  
  // Состояние для списков из бэкенда
  const [districts, setDistricts] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  
  // Загрузка списков районов и специализаций
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        // Загружаем районы
        const districtResponse = await api.get('/api/districts');
        setDistricts(districtResponse.data);
        
        // Загружаем специализации
        const specializationResponse = await api.get('/api/specializations');
        setSpecializations(specializationResponse.data);
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err);
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchOptions();
  }, []);
  
  // Состояние для файлов
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [diploma, setDiploma] = useState(null);
  const [diplomaName, setDiplomaName] = useState('');
  const [license, setLicense] = useState(null);
  const [licenseName, setLicenseName] = useState('');
  
  // Состояние для UI
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Refs для файловых инпутов
  const photoInputRef = useRef(null);
  const diplomaInputRef = useRef(null);
  const licenseInputRef = useRef(null);
  
  // Обработчики для файлов
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhoto(file);
      
      // Создаем URL для превью изображения
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleDiplomaChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setDiploma(file);
      setDiplomaName(file.name);
    }
  };
  
  const handleLicenseChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLicense(file);
      setLicenseName(file.name);
    }
  };
  
  // Валидация формы
  const validateForm = () => {
    if (!fullName) {
      setError('Пожалуйста, укажите ваше полное имя');
      return false;
    }
    
    if (!specialization) {
      setError('Пожалуйста, укажите вашу специализацию');
      return false;
    }
    
    if (!experience) {
      setError('Пожалуйста, укажите ваш опыт работы');
      return false;
    }
    
    if (!education) {
      setError('Пожалуйста, укажите ваше образование');
      return false;
    }
    
    if (!licenseNumber) {
      setError('Пожалуйста, укажите номер вашей лицензии/сертификата');
      return false;
    }
    
    if (!district) {
      setError('Пожалуйста, укажите район вашей практики');
      return false;
    }
    
    if (!photo) {
      setError('Пожалуйста, загрузите вашу фотографию');
      return false;
    }
    
    if (!diploma) {
      setError('Пожалуйста, загрузите скан вашего диплома');
      return false;
    }
    
    if (!license) {
      setError('Пожалуйста, загрузите скан вашей лицензии/сертификата');
      return false;
    }
    
    return true;
  };
  
  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Создаем FormData для отправки файлов
      const formData = new FormData();
      formData.append('full_name', fullName);
      formData.append('specialization', specialization);
      formData.append('experience', experience);
      formData.append('education', education);
      formData.append('license_number', licenseNumber);
      formData.append('district', district);
      
      if (additionalInfo) {
        formData.append('additional_info', additionalInfo);
      }
      
      if (photo) {
        formData.append('photo', photo);
      }
      
      if (diploma) {
        formData.append('diploma', diploma);
      }
      
      if (license) {
        formData.append('license_doc', license);
      }
      
      // Отправляем запрос на бэкенд
      const response = await api.post('/doctor-applications', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Если успешно, показываем уведомление и сбрасываем форму
      setSuccess(true);
      
      // Очищаем форму
      setFullName('');
      setSpecialization('');
      setExperience('');
      setEducation('');
      setLicenseNumber('');
      setAdditionalInfo('');
      setDistrict('');
      setPhoto(null);
      setPhotoPreview(null);
      setDiploma(null);
      setDiplomaName('');
      setLicense(null);
      setLicenseName('');
      
      // Сбрасываем файловые инпуты
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (diplomaInputRef.current) diplomaInputRef.current.value = '';
      if (licenseInputRef.current) licenseInputRef.current.value = '';
      
      // Вызываем колбэк успешной отправки
      if (onSuccess) {
        onSuccess(response.data);
      }
      
    } catch (err) {
      console.error('Failed to submit doctor application:', err);
      setError(err.response?.data?.detail || 'Ошибка при отправке заявки. Пожалуйста, попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Если форма успешно отправлена, показываем сообщение об успехе
  if (success) {
    return (
      <div className="bg-green-50 p-6 rounded-lg border border-green-200 text-center shadow-md transition-all">
        <div className="flex justify-center mb-4">
          <div className="bg-green-500 rounded-full p-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-semibold text-green-700 mb-2">Заявка успешно отправлена!</h3>
        <p className="text-green-600 mb-4">
          Ваша заявка на получение роли врача принята и будет рассмотрена администрацией в ближайшее время.
          Мы сообщим вам о результате рассмотрения по электронной почте.
        </p>
        <Button
          color="primary"
          onClick={() => setSuccess(false)}
          className="mt-2 shadow-md hover:shadow-lg transition-shadow"
        >
          Отправить еще одну заявку
        </Button>
      </div>
    );
  }
  
  // Если загружаются опции, показываем спиннер
  if (loadingOptions) {
    return (
      <div className="flex justify-center items-center py-10">
        <Spinner size="lg" color="primary" label="Загрузка данных..." />
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-semibold mb-4 text-center text-primary">Заявка на получение роли врача</h3>
      <p className="text-gray-600 mb-6 text-center">
        Заполните форму ниже, чтобы подать заявку на получение роли врача на нашей платформе.
        После рассмотрения заявки администрацией, вы получите уведомление о результате.
      </p>
      
      {error && (
        <div className="bg-danger-50 text-danger p-4 rounded-lg border border-danger-200 mb-6 shadow-sm">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-medium">{error}</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* ФИО */}
          <Input
            type="text"
            label="Полное имя *"
            placeholder="Иванов Иван Иванович"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            variant="bordered"
            fullWidth
            classNames={{
              inputWrapper: "shadow-sm hover:shadow transition-shadow"
            }}
          />
          
          {/* Специализация */}
          <Select
            label="Специализация *"
            placeholder="Выберите вашу специализацию"
            value={specialization}
            onChange={(e) => setSpecialization(e.target.value)}
            variant="bordered"
            fullWidth
            classNames={{
              trigger: "shadow-sm hover:shadow transition-shadow"
            }}
          >
            {specializations.map((spec) => (
              <SelectItem key={spec} value={spec}>
                {spec}
              </SelectItem>
            ))}
          </Select>
          
          {/* Район практики */}
          <Select
            label="Район практики *"
            placeholder="Выберите район вашей практики"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            variant="bordered"
            fullWidth
            classNames={{
              trigger: "shadow-sm hover:shadow transition-shadow"
            }}
          >
            {districts.map((dist) => (
              <SelectItem key={dist} value={dist}>
                {dist}
              </SelectItem>
            ))}
          </Select>
          
          {/* Опыт работы */}
          <Input
            type="text"
            label="Опыт работы *"
            placeholder="Например: 5 лет в городской клинике"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            variant="bordered"
            fullWidth
            classNames={{
              inputWrapper: "shadow-sm hover:shadow transition-shadow"
            }}
          />
        </div>
        
        <div className="space-y-4">
          {/* Образование */}
          <Textarea
            label="Образование *"
            placeholder="Укажите ваше образование, ВУЗ, годы обучения"
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            variant="bordered"
            fullWidth
            minRows={2}
            classNames={{
              inputWrapper: "shadow-sm hover:shadow transition-shadow"
            }}
          />
          
          {/* Номер лицензии */}
          <Input
            type="text"
            label="Номер лицензии/сертификата *"
            placeholder="Например: 123456789"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            variant="bordered"
            fullWidth
            classNames={{
              inputWrapper: "shadow-sm hover:shadow transition-shadow"
            }}
          />
          
          {/* Дополнительная информация */}
          <Textarea
            label="Дополнительная информация"
            placeholder="Укажите дополнительную информацию, которая может быть полезна (необязательно)"
            value={additionalInfo}
            onChange={(e) => setAdditionalInfo(e.target.value)}
            variant="bordered"
            fullWidth
            minRows={2}
            classNames={{
              inputWrapper: "shadow-sm hover:shadow transition-shadow"
            }}
          />
        </div>
      </div>
      
      {/* Загрузка файлов */}
      <div className="mt-8 space-y-6">
        <h4 className="text-lg font-semibold text-primary">Загрузка документов</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Фотография */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Фотография *</label>
            <div 
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition ${
                photoPreview ? 'border-primary' : 'border-gray-300'
              }`}
              onClick={() => photoInputRef.current?.click()}
            >
              {photoPreview ? (
                <div className="flex flex-col items-center">
                  <img src={photoPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg mb-2" />
                  <span className="text-xs text-gray-500">Нажмите, чтобы изменить</span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="mt-2 block text-sm text-gray-600">Нажмите для загрузки</span>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/*"
                ref={photoInputRef}
                onChange={handlePhotoChange}
              />
            </div>
          </div>
          
          {/* Диплом */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Скан диплома *</label>
            <div 
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition ${
                diploma ? 'border-primary' : 'border-gray-300'
              }`}
              onClick={() => diplomaInputRef.current?.click()}
            >
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="mt-2 block text-sm text-gray-600">
                  {diplomaName || 'Нажмите для загрузки'}
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                ref={diplomaInputRef}
                onChange={handleDiplomaChange}
              />
            </div>
          </div>
          
          {/* Лицензия */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Скан лицензии *</label>
            <div 
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-gray-50 transition ${
                license ? 'border-primary' : 'border-gray-300'
              }`}
              onClick={() => licenseInputRef.current?.click()}
            >
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="mt-2 block text-sm text-gray-600">
                  {licenseName || 'Нажмите для загрузки'}
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                ref={licenseInputRef}
                onChange={handleLicenseChange}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Кнопка отправки */}
      <div className="flex justify-center mt-10">
        <Button
          type="submit"
          color="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full md:w-1/2 shadow-md hover:shadow-lg transition-shadow"
        >
          {isLoading ? "Отправка заявки..." : "Отправить заявку"}
        </Button>
      </div>
    </form>
  );
}

export default DoctorApplicationForm; 