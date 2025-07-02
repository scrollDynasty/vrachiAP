import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Textarea, Spinner, Select, SelectItem } from '@nextui-org/react';
import { motion } from 'framer-motion';
import api from '../api';
import { getRegions, getDistrictsByRegion, availableLanguages, translateLanguage } from '../constants/uzbekistanRegions';
import { useTranslation } from './LanguageSelector';
import { translateRegion, translateDistrict } from './RegionTranslations';

// Функция для перевода специализаций
const translateSpecialization = (specialization, t) => {
  const specializationMap = {
    'Терапевт': t('therapist'),
    'Кардиолог': t('cardiologist'),
    'Невролог': t('neurologist'),
    'Хирург': t('surgeon'),
    'Педиатр': t('pediatrician'),
    'Офтальмолог': t('ophthalmologist'),
    'Стоматолог': t('dentist'),
    'Гинеколог': t('gynecologist'),
    'Уролог': t('urologist'),
    'Эндокринолог': t('endocrinologist'),
    'Дерматолог': t('dermatologist'),
    'Психиатр': t('psychiatrist'),
    'Онколог': t('oncologist'),
    'Отоларинголог (ЛОР)': t('otolaryngologist'),
    'Ортопед': t('orthopedist')
  };
  
  return specializationMap[specialization] || specialization;
};

// Анимационные варианты для элементов
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } }
};

const slideUp = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

function DoctorApplicationForm({ onSuccess }) {
  const { t, currentLanguage } = useTranslation();
  // Состояние для полей формы
  const [fullName, setFullName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [experience, setExperience] = useState('');
  const [education, setEducation] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [languages, setLanguages] = useState([]);
  
  // Состояние для списков из бэкенда
  const [availableRegions, setAvailableRegions] = useState([]);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  
  // Загрузка списков регионов и специализаций
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        
        // Загружаем регионы из константы
        const regions = getRegions();
        setAvailableRegions(regions);
        
        // Загружаем специализации
        const specializationResponse = await api.get('/api/specializations');
        setSpecializations(specializationResponse.data);
      } catch (err) {
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchOptions();
  }, []);

  // Обновляем районы при изменении города
  useEffect(() => {
    if (city) {
      const districts = getDistrictsByRegion(city);
      setAvailableDistricts(districts);
      setDistrict(''); // Сбрасываем район при смене города
    } else {
      setAvailableDistricts([]);
    }
  }, [city]);
  
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

  // Обработчики для новых полей
  const handleCityChange = (e) => {
    const newCity = e.target.value;
    setCity(newCity);
    setDistrict(''); // Сбрасываем район при смене города
  };

  const handleLanguageChange = (selectedKeys) => {
    setLanguages(Array.from(selectedKeys));
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
    
    if (!city) {
      setError('Пожалуйста, выберите город/регион вашей практики');
      return false;
    }

    if (!district) {
      setError('Пожалуйста, укажите район вашей практики');
      return false;
    }

    if (!languages.length) {
      setError('Пожалуйста, выберите языки консультаций');
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
      formData.append('city', city);
      formData.append('district', district);
      formData.append('languages', JSON.stringify(languages));
      
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
      setCity('');
      setDistrict('');
      setLanguages([]);
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
      setError(err.response?.data?.detail || 'Ошибка при отправке заявки. Пожалуйста, попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Если форма успешно отправлена, показываем сообщение об успехе
  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 text-center shadow-md"
      >
        <div className="flex justify-center mb-3">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-2 shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
        <h3 className="text-xl font-bold text-green-700 mb-2">Заявка успешно отправлена!</h3>
        <p className="text-green-600 mb-4">
          Ваша заявка на получение роли врача принята и будет рассмотрена администрацией в ближайшее время.
        </p>
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            color="primary"
            onClick={() => setSuccess(false)}
            className="px-6 py-2 font-medium shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-500"
            radius="lg"
          >
            Отправить еще одну заявку
          </Button>
        </motion.div>
      </motion.div>
    );
  }
  
  // Если загружаются опции, показываем спиннер
  if (loadingOptions) {
    return (
      <div className="flex flex-col justify-center items-center py-10">
        <Spinner size="md" color="primary" className="mb-3" />
        <p className="text-gray-600 text-sm animate-pulse">Загрузка данных...</p>
      </div>
    );
  }
  
  return (
    <motion.form 
      onSubmit={handleSubmit} 
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      className="space-y-6"
    >
      <motion.div variants={fadeIn} className="text-center mb-5">
        <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
          {t('applicationData')}
        </h3>
        <p className="text-gray-600 text-sm">
          {t('fillFormAndDocuments')}
        </p>
      </motion.div>
      
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-r from-red-50 to-pink-50 p-3 rounded-lg border border-red-200 mb-4 shadow-sm"
        >
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-medium text-red-700 text-sm">{error}</p>
          </div>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div variants={staggerContainer} className="space-y-4">
          {/* ФИО */}
          <motion.div variants={slideUp}>
            <Input
              type="text"
              label={t('fullNameLabel') + ' *'}
              placeholder={fullName || "Иванов Иван Иванович"}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              variant="bordered"
              radius="lg"
              fullWidth
              classNames={{
                inputWrapper: "shadow-sm hover:shadow transition-all duration-300 border hover:border-primary/50 focus:border-primary bg-white/70",
                input: "text-base"
              }}
            />
          </motion.div>
          
          {/* Специализация */}
          <motion.div variants={slideUp}>
            <Select
              label={t('specialization') + ' *'}
              placeholder={t('selectSpecialization')}
              value={specialization}
              onChange={(e) => setSpecialization(e.target.value)}
              variant="bordered"
              radius="lg"
              fullWidth
              classNames={{
                trigger: "shadow-sm hover:shadow transition-all duration-300 border hover:border-primary/50 focus:border-primary h-12 bg-white/70",
                value: "text-base"
              }}
            >
              {specializations.map((spec) => (
                <SelectItem key={spec} value={spec}>
                  {translateSpecialization(spec, t)}
                </SelectItem>
              ))}
            </Select>
          </motion.div>
          
          {/* Город/Регион */}
          <motion.div variants={slideUp}>
            <Select
                              label={t('cityRegionLabel') + ' *'}
              placeholder={t('selectCityRegionPractice')}
              value={city}
              onChange={handleCityChange}
              variant="bordered"
              radius="lg"
              fullWidth
              classNames={{
                trigger: "shadow-sm hover:shadow transition-all duration-300 border hover:border-primary/50 focus:border-primary h-12 bg-white/70",
                value: "text-base"
              }}
            >
              {availableRegions.map((region) => (
                <SelectItem key={region} value={region}>
                  {translateRegion(region, currentLanguage)}
                </SelectItem>
              ))}
            </Select>
          </motion.div>

          {/* Район практики */}
          <motion.div variants={slideUp}>
            <Select
                              label={t('practiceDistrictLabel') + ' *'}
                              placeholder={city ? t('selectPracticeDistrict') : t('selectCityFirst')}
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              variant="bordered"
              radius="lg"
              fullWidth
              isDisabled={!city || availableDistricts.length === 0}
              classNames={{
                trigger: "shadow-sm hover:shadow transition-all duration-300 border hover:border-primary/50 focus:border-primary h-12 bg-white/70",
                value: "text-base"
              }}
            >
              {availableDistricts.map((dist) => (
                <SelectItem key={dist} value={dist}>
                  {translateDistrict(dist, currentLanguage)}
                </SelectItem>
              ))}
            </Select>
          </motion.div>

          {/* Языки консультаций */}
          <motion.div variants={slideUp}>
            <Select
              label={t('consultationLanguages') + ' *'}
              placeholder={t('selectConsultationLanguages')}
              selectedKeys={new Set(languages)}
              onSelectionChange={handleLanguageChange}
              variant="bordered"
              radius="lg"
              fullWidth
              selectionMode="multiple"
              classNames={{
                trigger: "shadow-sm hover:shadow transition-all duration-300 border hover:border-primary/50 focus:border-primary min-h-12 bg-white/70",
                value: "text-base"
              }}
            >
              {availableLanguages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {translateLanguage(lang, currentLanguage)}
                </SelectItem>
              ))}
            </Select>
          </motion.div>
          
          {/* Опыт работы */}
          <motion.div variants={slideUp}>
            <Input
              type="text"
              label={t('workExperience') + ' *'}
              placeholder={t('workExperiencePlaceholder')}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              variant="bordered"
              radius="lg"
              fullWidth
              classNames={{
                inputWrapper: "shadow-sm hover:shadow transition-all duration-300 border hover:border-primary/50 focus:border-primary bg-white/70",
                input: "text-base"
              }}
            />
          </motion.div>
        </motion.div>
        
        <motion.div variants={staggerContainer} className="space-y-4">
          {/* Образование */}
          <motion.div variants={slideUp}>
            <Textarea
              label={t('educationField') + ' *'}
              placeholder={t('educationPlaceholder')}
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              variant="bordered"
              radius="lg"
              fullWidth
              minRows={2}
              classNames={{
                inputWrapper: "shadow-sm hover:shadow transition-all duration-300 border hover:border-primary/50 focus:border-primary bg-white/70",
                input: "text-base"
              }}
            />
          </motion.div>
          
          {/* Номер лицензии */}
          <motion.div variants={slideUp}>
            <Input
              type="text"
              label={t('licenseNumber') + ' *'}
              placeholder={t('licenseNumberPlaceholder')}
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              variant="bordered"
              radius="lg"
              fullWidth
              classNames={{
                inputWrapper: "shadow-sm hover:shadow transition-all duration-300 border hover:border-primary/50 focus:border-primary bg-white/70",
                input: "text-base"
              }}
            />
          </motion.div>
          
          {/* Дополнительная информация */}
          <motion.div variants={slideUp}>
            <Textarea
              label={t('additionalInformationField')}
              placeholder={t('additionalInfoPlaceholder')}
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              variant="bordered"
              radius="lg"
              fullWidth
              minRows={2}
              classNames={{
                inputWrapper: "shadow-sm hover:shadow transition-all duration-300 border hover:border-primary/50 focus:border-primary bg-white/70",
                input: "text-base"
              }}
            />
          </motion.div>
        </motion.div>
      </div>
      
      {/* Загрузка файлов */}
      <motion.div variants={fadeIn} className="mt-6 space-y-4">
        <h4 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2">
          {t('documentUpload')}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Фотография */}
          <motion.div variants={slideUp} className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('photographField')} *</label>
            <div 
              className={`border border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-blue-50/50 transition-all duration-300 ${
                photoPreview ? 'border-primary shadow-sm' : 'border-gray-300'
              } bg-white/70`}
              onClick={() => photoInputRef.current?.click()}
            >
              {photoPreview ? (
                <div className="flex flex-col items-center">
                  <img src={photoPreview} alt="Preview" className="w-28 h-28 object-cover rounded-lg mb-1 shadow-sm" />
                  <span className="text-xs text-primary mt-1">{t('clickToChange')}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center py-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="mt-2 block text-sm text-gray-600">{t('clickToUpload')}</span>
                  <span className="mt-1 block text-xs text-gray-400">{t('photoForProfileDesc')}</span>
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
          </motion.div>
          
          {/* Диплом */}
          <motion.div variants={slideUp} className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('diplomaScanField')} *</label>
            <div 
              className={`border border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-blue-50/50 transition-all duration-300 ${
                diploma ? 'border-primary shadow-sm' : 'border-gray-300'
              } bg-white/70`}
              onClick={() => diplomaInputRef.current?.click()}
            >
              <div className="flex flex-col items-center py-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="mt-2 block text-sm text-gray-600 max-w-full truncate">
                  {diplomaName || t('clickToUpload')}
                </span>
                {!diploma && (
                  <span className="mt-1 block text-xs text-gray-400">{t('pdfJpgPng')}</span>
                )}
                {diploma && (
                  <span className="text-xs text-primary mt-1">{t('clickToChange')}</span>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                ref={diplomaInputRef}
                onChange={handleDiplomaChange}
              />
            </div>
          </motion.div>
          
          {/* Лицензия */}
          <motion.div variants={slideUp} className="space-y-1">
            <label className="block text-sm font-semibold text-gray-700 mb-1">{t('licenseScanField')} *</label>
            <div 
              className={`border border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-blue-50/50 transition-all duration-300 ${
                license ? 'border-primary shadow-sm' : 'border-gray-300'
              } bg-white/70`}
              onClick={() => licenseInputRef.current?.click()}
            >
              <div className="flex flex-col items-center py-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="mt-2 block text-sm text-gray-600 max-w-full truncate">
                  {licenseName || t('clickToUpload')}
                </span>
                {!license && (
                  <span className="mt-1 block text-xs text-gray-400">{t('pdfJpgPng')}</span>
                )}
                {license && (
                  <span className="text-xs text-primary mt-1">{t('clickToChange')}</span>
                )}
              </div>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                ref={licenseInputRef}
                onChange={handleLicenseChange}
              />
            </div>
          </motion.div>
        </div>
      </motion.div>
      
      {/* Кнопка отправки */}
      <motion.div 
        className="flex justify-center mt-8"
        variants={fadeIn}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          type="submit"
          color="primary"
          isLoading={isLoading}
          radius="lg"
          className="w-full md:w-1/2 text-md font-medium shadow-md hover:shadow-lg transition-all duration-300 bg-gradient-to-r from-blue-500 to-indigo-600"
        >
          {isLoading ? t('submittingApplication') : t('submitApplication')}
        </Button>
      </motion.div>
    </motion.form>
  );
}

export default DoctorApplicationForm; 