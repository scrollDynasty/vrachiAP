import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, CardFooter, Divider, Pagination, Spinner, Chip, Select, SelectItem, Avatar } from '@nextui-org/react';
import { doctorsApi } from '../api';
import api from '../api';
import useAuthStore from '../stores/authStore';
import AvatarWithFallback from '../components/AvatarWithFallback';
import RequestConsultationModal from '../components/RequestConsultationModal';
import { useTranslation } from '../components/LanguageSelector';
import { motion } from 'framer-motion';
import { useMediaQuery } from 'react-responsive';
import { availableLanguages, translateLanguage } from '../constants/uzbekistanRegions';
import { translateRegion, translateDistrict, getDistrictNameById } from '../components/RegionTranslations';

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

// Функция для получения URL аватара из разных возможных полей
const getAvatarSource = (doctorData) => {
  if (!doctorData) return undefined;

  
  // Проверяем в порядке приоритета
  if (doctorData.avatar_path) {
    return doctorData.avatar_path;
  }
  
  if (doctorData.photo_path) {
    return doctorData.photo_path;
  }
  
  if (doctorData.user && doctorData.user.avatar_path) {
    return doctorData.user.avatar_path;
  }
  
  if (doctorData.avatar) {
    return doctorData.avatar;
  }
  
  // Проверяем наличие фотографии из заявки врача
  if (doctorData.application_photo_path) {
    return doctorData.application_photo_path;
  }
  
  // Дополнительная проверка поля photo, которое могло быть загружено при подаче заявки
  if (doctorData.photo) {
    return doctorData.photo;
  }
  
  // Пробуем создать стандартный путь, если знаем user_id
  if (doctorData.user_id) {
    const possiblePhotoPath = `/uploads/photos/doctor_${doctorData.user_id}.jpg`;
    return possiblePhotoPath;
  }
  
  return undefined;
};



// Компонент карточки врача в списке
const DoctorCard = ({ doctor, onClick, variant = 'auto', className = '' }) => {
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { t, currentLanguage } = useTranslation();
  const isMobile = useMediaQuery({ maxWidth: 767 });
  
  // Определяем какой вариант использовать
  const currentVariant = variant === 'auto' ? (isMobile ? 'mobile' : 'default') : variant;
  
  // Проверяем, может ли пользователь запрашивать консультацию
  const canRequestConsultation = () => {
    // Проверяем, что пользователь авторизован
    if (!user) return false;
    
    // Проверяем, что пользователь - пациент
    if (user.role !== 'patient') return false;
    
    // Проверяем, что доктор активен
    if (!doctor || doctor.is_active === false) return false;
    
    return true;
  };
  
  // Получаем ID врача для записи на консультацию
  const getDoctorConsultationId = () => {
    
    // Берем сначала user_id, затем id как запасной вариант
    const doctorId = doctor.user_id || doctor.id;
    
    return doctorId;
  };
  
  // Обработчик кнопки "Записаться"
  const handleRequestConsultation = () => {

    
    // Проверка наличия ID врача
    if (!doctor.user_id && !doctor.id) {
      alert(t('doctorAppointmentError'));
      return;
    }
    
    if (!canRequestConsultation()) {
      if (!user) {
        alert(t('loginRequiredForAppointment'));
        navigate('/login');
        return;
      }
      
      if (user.role !== 'patient') {
        alert(t('onlyPatientsCanBook'));
        return;
      }
      
      if (!doctor.is_active) {
        alert(t('doctorUnavailable'));
        return;
      }
    }
    
    // Открываем модальное окно для запроса консультации
    setIsConsultationModalOpen(true);
  };

  // Мобильная/компактная версия карточки
  if (currentVariant === 'mobile' || currentVariant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={className}
      >
        <Card 
          className="w-full hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30 border-1 border-blue-100/50"
          isPressable 
          onPress={onClick}
        >
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          <CardBody className="p-4 sm:p-5">
            <div className="flex items-start gap-4">
              {/* Аватар */}
              <div className="flex-shrink-0 relative">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <AvatarWithFallback
                    src={getAvatarSource(doctor)}
                    name={doctor.full_name || "?"}
                    size="xl"
                    className="ring-2 ring-white shadow-lg border-2 border-white w-16 h-16 sm:w-20 sm:h-20"
                    color="primary"
                  />
                  {doctor.is_verified && (
                    <motion.div 
                      className="absolute -top-1 -right-1 w-6 h-6 bg-success-500 rounded-full flex items-center justify-center shadow-md"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </motion.div>
                  )}
                </motion.div>
              </div>

              {/* Информация о враче */}
              <div className="flex-1 min-w-0">
                <div className="mb-3">
                  <h3 className="font-bold text-gray-900 text-base sm:text-lg bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent truncate mb-1">
                    {doctor.full_name || 'Врач'}
                  </h3>
                  <p className="text-sm text-indigo-600 font-medium mb-2">
                    {translateSpecialization(doctor.specialization, t)}
                  </p>
                  
                  {doctor.is_verified && (
                    <Chip color="success" variant="flat" size="sm" className="text-xs mb-2">
                      {t('verifiedDoctor')}
                    </Chip>
                  )}
                </div>

                {/* Цена */}
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-indigo-600">
                      {doctor.cost_per_consultation} 
                    </span>
                    <span className="text-sm text-gray-500">UZS</span>
                  </div>
                </div>

                {/* Локация */}
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="truncate">
                    {doctor.city || t('notSpecified')}
                  </span>
                </div>

                {/* Языки */}
                {doctor.languages && doctor.languages.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {doctor.languages.slice(0, 3).map((lang, idx) => (
                      <Chip 
                        key={idx}
                        size="sm" 
                        variant="flat"
                        color="primary"
                        className="text-xs"
                      >
                        {lang}
                      </Chip>
                    ))}
                    {doctor.languages.length > 3 && (
                      <span className="text-xs text-gray-500 py-1">
                        +{doctor.languages.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Кнопки действий */}
            <div className="flex gap-2 mt-4">
              <Button
                color="primary"
                variant="light"
                size="md"
                className="flex-1 font-medium"
                startContent={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                onPress={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
              >
                {t('moreDetails')}
              </Button>
              <Button
                color="primary"
                size="md"
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg font-medium"
                startContent={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
                onPress={(e) => {
                  e?.stopPropagation && e.stopPropagation();
                  handleRequestConsultation();
                }}
              >
                {t('bookNow')}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Модальное окно для запроса консультации */}
        <RequestConsultationModal 
          isOpen={isConsultationModalOpen}
          onClose={() => setIsConsultationModalOpen(false)}
          doctorId={getDoctorConsultationId()}
          doctorName={doctor.full_name || `${doctor.last_name || ""} ${doctor.first_name || ""} ${doctor.middle_name || ""}`}
        />
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className="h-full"
    >
      <Card 
        className="overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white to-blue-50/20 border-1 border-blue-100/50 h-full"
      >
        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <CardBody className="p-0 h-full flex flex-col cursor-pointer" onClick={onClick}>
          <div className="flex flex-col h-full">
            {/* Верхняя часть карточки с информацией о враче */}
            <div className="p-5 flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <motion.div 
                    className="w-18 h-18 flex-shrink-0"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <AvatarWithFallback 
                      src={getAvatarSource(doctor)} 
                      name={doctor.full_name || "?"}
                      size="xl"
                      className="w-18 h-18 border-3 border-white shadow-lg" 
                      color="primary"
                    />
                  </motion.div>
                  {doctor.is_verified && (
                    <motion.div 
                      className="absolute -bottom-1 -right-1 bg-success-500 p-1.5 rounded-full border-2 border-white shadow-md"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </motion.div>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 mb-2">{doctor.full_name || 'Имя не указано'}</h3>
                  <div className="flex items-center flex-wrap gap-2">
                    <Chip color="primary" variant="flat" size="md" className="font-medium">{translateSpecialization(doctor.specialization, t)}</Chip>
                    {doctor.is_verified && (
                      <Chip color="success" variant="flat" size="sm">{t('verifiedDoctor')}</Chip>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{doctor.cost_per_consultation} UZS</div>
                {doctor.rating > 0 && (
                  <div className="flex items-center mt-2 justify-end">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <motion.svg 
                          key={star} 
                          xmlns="http://www.w3.org/2000/svg" 
                          viewBox="0 0 24 24" 
                          fill={star <= doctor.rating ? "#FFB400" : "#E2E8F0"} 
                          className="w-4 h-4"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: star * 0.1, type: "spring", stiffness: 300 }}
                        >
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </motion.svg>
                      ))}
                    </div>
                    <span className="ml-2 text-sm text-gray-600 font-medium">{doctor.rating}</span>
                  </div>
                )}
              </div>
            </div>
            
            <Divider />
            
            {/* Нижняя часть карточки с дополнительной информацией */}
            <div className="p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 flex-1">
              {/* Языки */}
              {doctor.languages && doctor.languages.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 font-medium mb-2">{t('languages')}</p>
                  <div className="flex flex-wrap gap-2">
                    {doctor.languages.map((lang, idx) => (
                      <Chip 
                        key={idx}
                        size="sm" 
                        variant="flat"
                        color="primary"
                        className="font-medium"
                      >
                        {lang}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mr-2 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{t('location')}</p>
                    <p className="text-sm font-medium text-gray-700">
                      {(doctor.city && doctor.country) 
                        ? `${translateRegion(doctor.city, currentLanguage)}, ${doctor.country}` 
                        : (doctor.district ? getDistrictNameById(doctor.district, doctor.city, currentLanguage) : t('notSpecified'))
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mr-2 shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">{t('experience')}</p>
                    <p className="text-sm font-medium text-gray-700">
                      {doctor.work_experience && doctor.work_experience.length > 0 
                        ? `${doctor.work_experience.length} ${t('organizations')}`
                        : doctor.experience || t('notSpecified')
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardBody>
        <CardFooter className="px-5 py-4 flex justify-between items-center bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-t border-blue-100/50 mt-auto">
          <Button 
            color="primary" 
            variant="light" 
            size="md" 
            radius="lg" 
            className="font-medium hover:bg-blue-100/50 transition-colors"
            startContent={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            onPress={(e) => {
              e?.stopPropagation && e.stopPropagation();
              onClick();
            }}
          >
            {t('moreDetails')}
          </Button>
          <Button 
            color="primary" 
            size="md" 
            radius="lg" 
            className="font-medium bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-300 px-6"
            startContent={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
            onClick={(e) => {
              e.stopPropagation();
              handleRequestConsultation();
            }}
          >
                                            {t('bookNow')}
          </Button>
        </CardFooter>
        
        {/* Модальное окно для запроса консультации */}
        <RequestConsultationModal 
          isOpen={isConsultationModalOpen}
          onClose={() => setIsConsultationModalOpen(false)}
          doctorId={getDoctorConsultationId()}
          doctorName={doctor.full_name || `${doctor.last_name || ""} ${doctor.first_name || ""} ${doctor.middle_name || ""}`}
        />
      </Card>
    </motion.div>
  );
};

// Компонент страницы поиска врачей
function SearchDoctorsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  // Состояния для фильтров
  const [specialization, setSpecialization] = useState('');
  const [specializations, setSpecializations] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [patientCity, setPatientCity] = useState(''); // Город пациента для автоматической фильтрации
  const { t, currentLanguage } = useTranslation();
  
  // Состояния для данных
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Состояния для пагинации
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Загружаем список специализаций и город пациента
  useEffect(() => {
    const loadSpecializations = async () => {
      try {
        const specializations = await doctorsApi.getSpecializations();
        setSpecializations(specializations);
      } catch (error) {
        // Игнорируем ошибки загрузки специализаций
      }
    };
    
    const loadPatientCity = async () => {
      if (user && user.role === 'patient') {
        try {
          const response = await api.get('/patients/me/profile');
          if (response.data && response.data.city) {
            setPatientCity(response.data.city);
          }
        } catch (error) {
          // Игнорируем ошибки получения города пациента
        }
      }
    };
    
    loadSpecializations();
    loadPatientCity();
  }, [user]);

  // Загрузка врачей при первом рендере и при изменении фильтров или страницы
  useEffect(() => {
    // Функция для загрузки данных
    const fetchDoctors = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Фильтры для запроса
        const filters = {};
        if (specialization) {
          filters.specialization = specialization;
        }
        // Автоматически фильтруем по городу пациента
        if (patientCity) {
          filters.city = patientCity;
        }
        if (selectedLanguage) {
          filters.language = selectedLanguage;
        }
        
        // Отправляем запрос на API
        const doctorsData = await doctorsApi.getDoctors(filters, page, 10);
        
        // Дополняем данные врачей их фотографиями
        const enhancedDoctorsData = await Promise.all(doctorsData.items.map(async (doctor) => {
          // Если у врача нет аватара, пробуем получить из профиля
          if (!doctor.avatar_path && doctor.user_id) {
            try {
              const profileResp = await api.get(`/doctors/${doctor.user_id}/profile`);
              if (profileResp.data && profileResp.data.user && profileResp.data.user.avatar_path) {
                doctor.avatar_path = profileResp.data.user.avatar_path;
              }
            } catch (err) {
            }
          }
          return doctor;
        }));
        
        // Обновляем состояние
        setDoctors(enhancedDoctorsData);
        setTotalPages(doctorsData.pages);
        setTotalItems(doctorsData.total);
      } catch (err) {
        setError('Не удалось загрузить список врачей.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoctors();
  }, [page, specialization, patientCity, selectedLanguage]);
  
  // Обработчик поиска (сбрасывает пагинацию и выполняет новый поиск)
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Сбрасываем страницу на первую при новом поиске
  };
  
  // Обработчики изменения фильтров
  const handleSpecializationChange = (e) => {
    setSpecialization(e.target.value);
    setPage(1);
  };

  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
    setPage(1);
  };
  
  // Обработчик клика по карточке врача
  const handleDoctorClick = (doctorId) => {
    navigate(`/doctors/${doctorId}`);
  };

  // Анимация для элементов страницы
  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Динамический градиентный фон */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-0"
        animate={{ 
          background: [
            'linear-gradient(to bottom right, rgba(239, 246, 255, 0.8), rgba(224, 231, 255, 0.8), rgba(237, 233, 254, 0.8))',
            'linear-gradient(to bottom right, rgba(224, 242, 254, 0.8), rgba(219, 234, 254, 0.8), rgba(224, 231, 255, 0.8))',
            'linear-gradient(to bottom right, rgba(236, 254, 255, 0.8), rgba(224, 242, 254, 0.8), rgba(219, 234, 254, 0.8))',
            'linear-gradient(to bottom right, rgba(239, 246, 255, 0.8), rgba(224, 231, 255, 0.8), rgba(237, 233, 254, 0.8))'
          ]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
      />
      
      {/* Анимированная сетка */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <motion.div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px), 
                             linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
          animate={{
            x: [0, -40],
            y: [0, -40]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
      
      {/* Декоративные плавающие элементы */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-70">
        <motion.div 
          className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-gradient-to-r from-blue-300/20 to-indigo-300/20"
          animate={{
            y: [0, 20, 0],
            scale: [1, 1.05, 1],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute bottom-20 right-[10%] w-80 h-80 rounded-full bg-gradient-to-r from-purple-300/20 to-indigo-300/20"
          animate={{
            y: [0, -25, 0],
            scale: [1, 1.05, 1],
            rotate: [0, -5, 0, 5, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="text-center mb-6 sm:mb-8"
        >
          <div className="mb-3 sm:mb-4 flex justify-center">
            <motion.div
              className="relative inline-block"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.h1 
                className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                                    Healzy
              </motion.h1>
              <motion.div 
                className="absolute -z-10 -inset-1 rounded-lg bg-gradient-to-r from-blue-600/20 to-indigo-600/20"
                animate={{ 
                  opacity: [0.5, 0.8, 0.5],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 px-4">{t('findDoctor')}</h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto px-4">
            <span className="bg-gradient-to-r from-gray-700 to-gray-500 bg-clip-text text-transparent font-medium">
              {t('findSpecialistDescription')}
            </span>
          </p>
        </motion.div>
        
        {/* Форма фильтрации */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <form onSubmit={handleSearch} className="mb-6 sm:mb-8 bg-white/90 border border-white/30 shadow-2xl p-4 sm:p-6 rounded-xl overflow-hidden relative">
            {/* Анимированная линия вверху */}
            <motion.div 
              className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 -mt-4 sm:-mt-6 -mx-4 sm:-mx-6 mb-4 sm:mb-6"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            />
            
            {/* Световые блики */}
            <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-pink-400/20 mix-blend-multiply opacity-70"></div>
            <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-blue-400/20 mix-blend-multiply opacity-70"></div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">
              {/* Специализация */}
              <div>
                <Select
                  label={t('specialization')}
                  placeholder={t('selectSpecialization')}
                  value={specialization}
                  onChange={handleSpecializationChange}
                  variant="bordered"
                  radius="lg"
                  fullWidth
                >
                  <SelectItem key="" value="">{t('allSpecializations')}</SelectItem>
                  {specializations.map((spec) => (
                    <SelectItem key={spec} value={spec}>
                      {translateSpecialization(spec, t)}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {/* Язык */}
              <div>
                <Select
                  label={t('language')}
                  placeholder={t('selectLanguage')}
                  value={selectedLanguage}
                  onChange={handleLanguageChange}
                  variant="bordered"
                  radius="lg"
                  fullWidth
                >
                  <SelectItem key="" value="">{t('allLanguages')}</SelectItem>
                  {availableLanguages.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {translateLanguage(lang, currentLanguage)}
                    </SelectItem>
                  ))}
                </Select>
              </div>

              {/* Кнопка поиска */}
              <div className="flex items-end sm:col-span-2 lg:col-span-1">
                <Button
                  type="submit"
                  color="primary"
                  isLoading={loading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md hover:shadow-lg transition-all"
                  size="lg"
                  radius="lg"
                  startContent={
                    !loading && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    )
                  }
                >
                  <span className="text-sm sm:text-base">{loading ? t('searching') : t('findDoctor')}</span>
                </Button>
              </div>
            </div>
            
            {/* Информация о автоматической фильтрации по городу */}
            {patientCity && (
              <div className="mb-4 text-center px-2">
                <Chip 
                  color="primary" 
                  variant="flat" 
                  size="sm"
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                >
                  <span className="text-xs sm:text-sm">{t('searchInRegion')}: {patientCity}</span>
                </Chip>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                  {t('autoFilterByRegion')}
                </p>
              </div>
            )}
          </form>
        </motion.div>
        
        {/* Отображение ошибки */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-danger text-center mb-4 p-4 bg-danger-50 rounded-lg border border-danger-100 shadow-md"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-danger mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </motion.div>
        )}
        
        {/* Индикатор загрузки */}
        {loading && (
          <div className="flex justify-center my-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Spinner size="lg" color="primary" />
            </motion.div>
          </div>
        )}
        
        {/* Результаты поиска */}
        {!loading && (
          <>
            {/* Информация о результатах */}
            <motion.div 
              className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 px-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <h2 className="text-lg sm:text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                {doctors.length > 0 ? (
                  <>{t('doctorsFound')}: <span className="text-primary">{totalItems}</span></>
                ) : (
                  t('searchResults')
                )}
              </h2>
              
              {doctors.length > 0 && (
                <p className="text-xs sm:text-sm text-gray-600">
                  {t('page')} {page} {t('of')} {totalPages}
                </p>
              )}
            </motion.div>
            
            {doctors.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="text-center text-gray-500 my-12 p-8 bg-white/80 rounded-lg border border-gray-100 shadow-xl"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-medium mb-2 text-gray-700">{t('noDoctorsFound')}</p>
                <p className="text-gray-500">{t('tryChangeSearchParams')}</p>
              </motion.div>
            ) : (
              <>
                {/* Список врачей */}
                <div className="space-y-4 sm:space-y-6 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 md:gap-6 lg:gap-8 xl:gap-10 mb-6 sm:mb-8 px-4 sm:px-6">
                  {doctors.map((doctor, index) => (
                    <DoctorCard 
                      key={doctor.id} 
                      doctor={doctor} 
                      onClick={() => handleDoctorClick(doctor.id)}
                      variant="auto"
                    />
                  ))}
                </div>
                
                {/* Пагинация */}
                {totalPages > 1 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="flex justify-center mt-8"
                  >
                    <Pagination
                      total={totalPages}
                      initialPage={page}
                      onChange={setPage}
                      color="primary"
                      showShadow
                      radius="full"
                      classNames={{
                        wrapper: "shadow-md"
                      }}
                    />
                  </motion.div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default SearchDoctorsPage; 