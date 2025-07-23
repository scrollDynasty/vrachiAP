import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Divider, Spinner, Chip, Tooltip, Avatar, Pagination } from '@nextui-org/react';
import { doctorsApi } from '../api';
import useAuthStore from '../stores/authStore';
import RequestConsultationModal from '../components/RequestConsultationModal';
import api from '../api';
import AvatarWithFallback from '../components/AvatarWithFallback';
import { motion } from 'framer-motion';
import { useTranslation } from '../components/LanguageSelector.jsx';
import { translateRegion, translateDistrict, getDistrictNameById } from '../components/RegionTranslations';
import { translateLanguage } from '../constants/uzbekistanRegions';

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
  
  if (doctorData.application_photo_path) {
    return doctorData.application_photo_path;
  }
  
  // Дополнительная проверка поля photo, которое могло быть загружено при подаче заявки
  if (doctorData.photo) {
    return doctorData.photo;
  }
  
  return undefined;
};

// Компонент для секции информации в профиле
const InfoSection = ({ title, children }) => (
  <motion.div 
    className="mb-6"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <h3 className="text-lg font-semibold mb-4 inline-block px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-md">{title}</h3>
    <motion.div 
      className="pl-3 mt-3 border-l-4 border-indigo-100"
      initial={{ height: 0 }}
      animate={{ height: "auto" }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      {children}
    </motion.div>
  </motion.div>
);

// Компонент для отображения звездного рейтинга
const StarRating = ({ rating }) => {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.span 
          key={star} 
          className={`text-2xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: star * 0.1 }}
        >
          ★
        </motion.span>
      ))}
      <motion.span 
        className="ml-2 text-lg font-semibold"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      >
        {rating.toFixed(1)}
      </motion.span>
    </div>
  );
};

// Компонент для отзыва
const ReviewItem = ({ review }) => {
  // Преобразуем дату в читаемый формат
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
    >
      <Card className="mb-5 shadow-sm hover:shadow-md transition-all overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
        <CardBody className="p-5">
          <div className="flex items-start gap-4">
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <AvatarWithFallback 
                size="md" 
                name={review.patientName || 'Пациент'} 
                color="primary"
                className="flex-shrink-0 shadow-sm border-2 border-white"
              />
            </motion.div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">{review.patientName || 'Пациент'}</h4>
                <span className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                  {formatDate(review.created_at)}
                </span>
              </div>
              <div className="mb-3 flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.svg 
                    key={star} 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill={star <= review.rating ? "#FFB400" : "#E2E8F0"} 
                    className="w-5 h-5"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: star * 0.1, type: "spring", stiffness: 300 }}
                  >
                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                  </motion.svg>
                ))}
              </div>
              <motion.p 
                className="text-gray-700 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 rounded-lg border-l-4 border-indigo-300 shadow-sm"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.4, delay: 0.3 }}
              >
                {review.comment || t('reviewWithoutComment')}
              </motion.p>
            </div>
          </div>
        </CardBody>
      </Card>
    </motion.div>
  );
};

// Функция удалена - используем getDistrictNameById из RegionTranslations.js

// Компонент страницы профиля врача
function DoctorProfilePage() {
  const { t, currentLanguage } = useTranslation();
  const { doctorId } = useParams(); // Получаем ID врача из URL
  const navigate = useNavigate();
  const { user } = useAuthStore(); // Получаем текущего пользователя
  
  // Состояния для данных
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 5;
  
  // Рассчитываем общий рейтинг врача
  const calculateRating = (reviews) => {
    if (!reviews || reviews.length === 0) return 0;
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    return totalRating / reviews.length;
  };
  
  // Проверяем, может ли пользователь запрашивать консультацию
  const canRequestConsultation = () => {
    // Проверяем, что пользователь авторизован
    if (!user) return false;
    
    // Проверяем, что пользователь - пациент
    if (user.role !== 'patient') return false;
    
    // Проверяем, что доктор активен
    if (!doctor || !doctor.is_active) return false;
    
    return true;
  };
  
  // Загружаем данные врача при первом рендере
  useEffect(() => {
    const fetchDoctorData = async () => {
      setLoading(true);
      try {
        const data = await doctorsApi.getDoctorById(doctorId);
        
        
        // Получаем аватар врача
        if (data && data.avatar_path) {
          
          if (data.avatar_path.startsWith('/')) {
          } else {
          }
        } else {
          // Проверим, возможно аватар находится в другом поле или вложенном объекте
          if (data.user && data.user.avatar_path) {
            
            // Добавим avatar_path в объект data для единообразия
            data.avatar_path = data.user.avatar_path;
          }
          if (data.avatar) {
            
            // Если avatar_path еще не установлен
            if (!data.avatar_path) {
              data.avatar_path = data.avatar;
            }
          }
          if (data.photo_path) {
            
            // Если avatar_path еще не установлен
            if (!data.avatar_path) {
              data.avatar_path = data.photo_path;
            }
          }
          // Дополнительная проверка на поле photo, которое могло быть загружено при подаче заявки
          if (data.photo) {
            
            if (!data.avatar_path) {
              data.avatar_path = data.photo;
            }
          }
          // Проверка на application_photo_path - фото из заявки врача
          if (data.application_photo_path) {

            
            if (!data.avatar_path) {
              data.avatar_path = data.application_photo_path;
            }
          }
        }
        
        setDoctor(data);
        
        
        // Добавим дополнительный запрос для получения профиля пользователя, если avatar_path отсутствует
        if (!data.avatar_path) {
          try {
            const userResponse = await api.get(`/doctors/${data.user_id}/profile`);
            
            if (userResponse.data && userResponse.data.user && userResponse.data.user.avatar_path) {
              data.avatar_path = userResponse.data.user.avatar_path;
              setDoctor({...data});
            } else if (userResponse.data && userResponse.data.avatar_path) {
              data.avatar_path = userResponse.data.avatar_path;
              setDoctor({...data});
            }
          } catch (userErr) {
            
            // Попробуем получить данные админским запросом из заявок врачей (requires admin role)
            try {
              const adminAppsResponse = await api.get(`/admin/doctor-applications?status=approved`);
              
              if (adminAppsResponse.data && adminAppsResponse.data.items) {
                // Найдем заявку для нашего user_id
                const application = adminAppsResponse.data.items.find(app => app.user_id === data.user_id);
                if (application && application.photo_path) {
                  data.avatar_path = application.photo_path;
                  // Также сохраним ссылку на фото из заявки
                  data.application_photo_path = application.photo_path;
                  setDoctor({...data});
                }
              }
            } catch (adminErr) {
              
              // Последняя попытка: напрямую проверить, существует ли фотография
              try {
                
                // Попробуем создать стандартный путь, если знаем user_id
                if (data.user_id) {
                  const possiblePhotoPath = `/uploads/photos/doctor_${data.user_id}.jpg`;
                  
                  try {
                    // Проверим, существует ли фото по этому пути
                    const checkResponse = await fetch(`https://healzy.uz${possiblePhotoPath}`);
                    if (checkResponse.ok) {
                      data.avatar_path = possiblePhotoPath;
                      setDoctor({...data});
                    } else {
                    }
                  } catch (fetchErr) {
                  }
                }
              } catch (directErr) {
                // Пропускаем ошибку проверки фото
              }
            }
          }
        }
      } catch (err) {
        setError('Не удалось загрузить информацию о враче. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoctorData();
  }, [doctorId]);
  
  // Загружаем отзывы о враче
  useEffect(() => {
    const fetchReviews = async () => {
      if (!doctorId) return;
      
      setReviewsLoading(true);
      try {
        // Используем id из профиля врача, а не user_id
        if (doctor) {
          const response = await api.get(`/api/doctors/${doctor.id}/reviews`);
          
          // Для каждого отзыва пытаемся получить информацию о пациенте
          const reviewsWithPatientInfo = await Promise.all(
            response.data.map(async (review) => {
              try {
                // Получаем консультацию, чтобы узнать ID пациента
                const consultResponse = await api.get(`/api/consultations/${review.consultation_id}`);
                const patientId = consultResponse.data.patient_id;
                
                // Получаем профиль пациента
                const patientResponse = await api.get(`/patients/${patientId}/profile`);
                
                // Добавляем информацию о пациенте в отзыв
                return {
                  ...review,
                  patientName: patientResponse.data.full_name || 'Пациент'
                };
              } catch (err) {
                return {...review, patientName: 'Пациент'};
              }
            })
          );
          
          setReviews(reviewsWithPatientInfo);
        }
      } catch (err) {
        setReviewsError('Не удалось загрузить отзывы о враче');
      } finally {
        setReviewsLoading(false);
      }
    };
    
    if (doctor) {
      fetchReviews();
    }
  }, [doctor]);
  
  // Обработчик кнопки "Назад к поиску"
  const handleBackToSearch = () => {
    navigate('/search-doctors');
  };
  
  // Обработчик "Подать заявку на консультацию"
  const handleRequestConsultation = () => {
    if (!canRequestConsultation()) {
      if (!user) {
        alert("Для записи на консультацию необходимо войти в систему.");
        navigate('/login');
        return;
      }
      
      if (user.role !== 'patient') {
        alert("Только пациенты могут записываться на консультации.");
        return;
      }
      
      if (!doctor.is_active) {
        alert("К сожалению, этот врач в данный момент недоступен для консультаций.");
        return;
      }
    }
    
    // Открываем модальное окно для запроса консультации
    setIsConsultationModalOpen(true);
  };
  
  // Получаем текущую страницу отзывов
  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = reviews.slice(indexOfFirstReview, indexOfLastReview);
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);
  
  // Основной рендер
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
      
      <div className="max-w-7xl mx-auto py-8 px-4 relative z-10">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" color="primary" />
          </div>
        ) : error ? (
          <motion.div 
            className="bg-danger-50 text-danger p-6 rounded-lg shadow-md border border-danger-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold">Ошибка</h3>
            </div>
            <p>{error}</p>
            <Button onPress={handleBackToSearch} color="primary" className="mt-4 shadow-md" radius="full">
              Назад к поиску
            </Button>
          </motion.div>
        ) : doctor ? (
          <div>
            {(() => {
              // Преобразуем строку specializations в массив
              const specializationsArray = doctor.specializations ? doctor.specializations.split(',').map(s => s.trim()) : [];
              
              // Рассчитаем рейтинг врача
              const doctorRating = calculateRating(reviews);
              
              return (
                <>
                  <motion.div 
                    className="mb-8"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Button 
                      color="primary" 
                      variant="light" 
                      className="mb-6" 
                      startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                      }
                      onPress={handleBackToSearch}
                      radius="full"
                    >
                      {t('backToSearch')}
                    </Button>
                  </motion.div>
                  
                  <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                    <motion.div 
                      className="md:w-2/5"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6 }}
                    >
                      <Card className="shadow-md hover:shadow-xl transition-all overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-full"></div>
                        <CardBody className="p-6 flex flex-col items-center">
                          {/* Добавляем дополнительную отладочную информацию */}
                          {doctor.avatar_path && (
                            <div className="hidden">
                              <p>DEBUG: Avatar path: {doctor.avatar_path}</p>
                            </div>
                          )}
                          
                          <motion.div 
                            className="relative"
                            whileHover={{ scale: 1.05 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <AvatarWithFallback 
                              src={getAvatarSource(doctor)} 
                              name={doctor.full_name || "?"}
                              size="xl"
                              className="w-40 h-40 mb-4 shadow-lg border-4 border-white" 
                              isBordered
                              color="primary"
                            />
                            {doctor.is_verified && (
                              <motion.div 
                                className="absolute -bottom-2 -right-2 bg-success-100 p-1.5 rounded-full border-2 border-white shadow-md"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ 
                                  type: "spring", 
                                  stiffness: 400, 
                                  damping: 10,
                                  delay: 0.5
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-success-600" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </motion.div>
                            )}
                          </motion.div>
                          
                          <motion.h2 
                            className="text-2xl font-bold mb-1 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                          >
                            {doctor.full_name || 'Нет данных'}
                          </motion.h2>
                          
                          <motion.div 
                            className="flex gap-2 mb-4 flex-wrap justify-center"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                          >
                            <Chip color="primary" variant="flat" className="shadow-sm">
                              {translateSpecialization(doctor.specialization, t)}
                            </Chip>
                            {doctor.is_verified && (
                              <Chip color="success" variant="flat" className="shadow-sm">
                                {t('verifiedDoctor')}
                              </Chip>
                            )}
                          </motion.div>
                          
                          <Divider className="my-3 w-full" />
                          
                          <motion.div 
                            className="flex flex-col gap-4 w-full bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-lg shadow-inner"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.4 }}
                          >
                            <div className="flex justify-between w-full">
                              <span className="text-gray-600 font-medium">{t('cost')}:</span>
                              <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                                {doctor.cost_per_consultation} UZS
                              </span>
                            </div>
                            
                            <div className="flex justify-between w-full">
                              <span className="text-gray-600 font-medium">{t('rating')}:</span>
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
                                    transition={{ delay: 0.4 + (star * 0.1), type: "spring", stiffness: 300 }}
                                  >
                                    <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                  </motion.svg>
                                ))}
                                <span className="ml-1 font-semibold">{doctor.rating}</span>
                              </div>
                            </div>
                          </motion.div>
                          
                          {canRequestConsultation() && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.5, delay: 0.6 }}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Button
                                color="primary"
                                size="lg"
                                className="mt-6 w-full font-medium shadow-md bg-gradient-to-r from-blue-500 to-indigo-600 py-6 text-lg"
                                onClick={handleRequestConsultation}
                                radius="full"
                                startContent={
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                                  </svg>
                                }
                              >
                                {t('bookConsultation')}
                              </Button>
                            </motion.div>
                          )}
                        </CardBody>
                      </Card>
                    </motion.div>

                    <motion.div 
                      className="md:w-3/5"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.2 }}
                    >
                      <Card className="shadow-md hover:shadow-lg transition-all mb-8 overflow-hidden">
                        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-full"></div>
                        <CardBody className="p-6">
                          <motion.h3 
                            className="text-xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            {t('doctorInfo')}
                          </motion.h3>
                          
                          {/* Город/Регион практики - показываем в первую очередь */}
                          <InfoSection title={t('practiceLocation')}>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                              <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-lg font-semibold text-gray-800">{doctor.city ? translateRegion(doctor.city, currentLanguage) : t('notSpecified')}</span>
                                    {doctor.district && (
                                      <>
                                        <span className="text-gray-400 text-lg">•</span>
                                        <span className="bg-white px-3 py-1 rounded-full text-sm font-medium text-gray-700 border border-gray-200 shadow-sm">{getDistrictNameById(doctor.district, doctor.city, currentLanguage)}</span>
                                      </>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-600 mt-1">{t('doctorPracticeRegion')}</p>
                                </div>
                              </div>
                            </div>
                          </InfoSection>

                          {doctor.about && (
                            <InfoSection title={t('about')}>
                              <p className="text-gray-700">{doctor.about}</p>
                            </InfoSection>
                          )}
                          
                          {doctor.education && doctor.education !== 'нету' && doctor.education !== '' && (
                            <InfoSection title={t('education')}>
                              <p className="text-gray-700">{doctor.education}</p>
                            </InfoSection>
                          )}
                          
                          {specializationsArray.length > 0 && (
                            <InfoSection title={t('specializations')}>
                              <div className="flex flex-wrap gap-2">
                                {specializationsArray.map((spec, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                                    whileHover={{ scale: 1.05 }}
                                  >
                                    <Chip color="primary" variant="flat" className="shadow-sm">
                                      {translateSpecialization(spec, t)}
                                    </Chip>
                                  </motion.div>
                                ))}
                              </div>
                            </InfoSection>
                          )}

                          {doctor.languages && doctor.languages.length > 0 && (
                            <InfoSection title={t('consultationLanguages')}>
                              <div className="flex flex-wrap gap-2">
                                {doctor.languages.map((language, index) => (
                                  <motion.div
                                    key={index}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1 * index, duration: 0.3 }}
                                    whileHover={{ scale: 1.05 }}
                                  >
                                    <Chip 
                                      color="secondary" 
                                      variant="flat" 
                                      className="shadow-sm bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200"
                                      startContent={
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                        </svg>
                                      }
                                    >
                                      {translateLanguage(language, currentLanguage)}
                                    </Chip>
                                  </motion.div>
                                ))}
                              </div>
                            </InfoSection>
                          )}


                        </CardBody>
                      </Card>
                    </motion.div>
                  </div>
                </>
              );
            })()}
            
            {/* Секция с отзывами */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <Card className="shadow-md hover:shadow-lg transition-all overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 w-full"></div>
                <CardBody className="p-6">
                  <motion.h3 
                    className="text-xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {t('doctorReviews')}
                  </motion.h3>
                  
                  {reviewsLoading ? (
                    <div className="flex justify-center py-10">
                      <Spinner color="primary" />
                    </div>
                  ) : reviewsError ? (
                    <motion.div 
                      className="text-center text-danger bg-danger-50 p-4 rounded-lg"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p>{reviewsError}</p>
                    </motion.div>
                  ) : reviews.length === 0 ? (
                    <motion.div 
                      className="text-center text-gray-500 py-10 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-gray-100 shadow-inner"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-lg font-medium mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">{t('noDoctorReviews')}</p>
                      <p className="text-sm text-gray-500">{t('beFirstToReview')}</p>
                    </motion.div>
                  ) : (
                    <div>
                      {currentReviews.map((review, index) => (
                        <ReviewItem key={index} review={review} />
                      ))}
                      
                      {/* Пагинация */}
                      {totalPages > 1 && (
                        <motion.div 
                          className="flex justify-center mt-6"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.5 }}
                        >
                          <Pagination 
                            total={totalPages} 
                            initialPage={1}
                            page={currentPage}
                            onChange={setCurrentPage}
                            color="primary"
                            showShadow
                            radius="full"
                            classNames={{
                              wrapper: "shadow-sm"
                            }}
                          />
                        </motion.div>
                      )}
                    </div>
                  )}
                </CardBody>
              </Card>
            </motion.div>
            
            {/* Модальное окно для запроса консультации */}
            <RequestConsultationModal 
              isOpen={isConsultationModalOpen}
              onClose={() => setIsConsultationModalOpen(false)}
              doctorId={doctor.user_id}
              doctorName={doctor.full_name || `${doctor.last_name || ""} ${doctor.first_name || ""} ${doctor.middle_name || ""}`}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default DoctorProfilePage; 