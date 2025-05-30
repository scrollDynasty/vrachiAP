import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Divider, Spinner, Chip, Tooltip, Avatar, Pagination } from '@nextui-org/react';
import { doctorsApi } from '../api';
import useAuthStore from '../stores/authStore';
import RequestConsultationModal from '../components/RequestConsultationModal';
import api from '../api';
import AvatarWithFallback from '../components/AvatarWithFallback';

// Функция для получения URL аватара из разных возможных полей
const getAvatarSource = (doctorData) => {
  if (!doctorData) return undefined;
  
  console.log('getAvatarSource: Проверка источников аватара', {
    'doctorData.avatar_path': doctorData.avatar_path,
    'doctorData.photo_path': doctorData.photo_path,
    'doctorData.user?.avatar_path': doctorData.user?.avatar_path,
    'doctorData.avatar': doctorData.avatar
  });
  
  // Проверяем в порядке приоритета
  if (doctorData.avatar_path) {
    console.log('Используем avatar_path:', doctorData.avatar_path);
    return doctorData.avatar_path;
  }
  
  if (doctorData.photo_path) {
    console.log('Используем photo_path:', doctorData.photo_path);
    return doctorData.photo_path;
  }
  
  if (doctorData.user && doctorData.user.avatar_path) {
    console.log('Используем user.avatar_path:', doctorData.user.avatar_path);
    return doctorData.user.avatar_path;
  }
  
  if (doctorData.avatar) {
    console.log('Используем avatar:', doctorData.avatar);
    return doctorData.avatar;
  }
  
  if (doctorData.application_photo_path) {
    console.log('Используем application_photo_path:', doctorData.application_photo_path);
    return doctorData.application_photo_path;
  }
  
  // Дополнительная проверка поля photo, которое могло быть загружено при подаче заявки
  if (doctorData.photo) {
    console.log('Используем photo:', doctorData.photo);
    return doctorData.photo;
  }
  
  console.log('Не найден подходящий источник аватара, используем заглушку');
  return undefined;
};

// Компонент для секции информации в профиле
const InfoSection = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold mb-4 inline-block px-5 py-2 bg-gradient-to-r from-primary-500 to-primary-300 text-white rounded-lg shadow-sm">{title}</h3>
    <div className="pl-3 mt-3 border-l-4 border-primary-100">{children}</div>
  </div>
);

// Компонент для отображения звездного рейтинга
const StarRating = ({ rating }) => {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={`text-2xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300'}`}>
          ★
        </span>
      ))}
      <span className="ml-2 text-lg font-semibold">{rating.toFixed(1)}</span>
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
    <Card className="mb-5 shadow-sm hover:shadow-md transition-all">
      <CardBody className="p-5">
        <div className="flex items-start gap-4">
          <AvatarWithFallback 
            size="md" 
            name={review.patientName || 'Пациент'} 
            color="primary"
            className="flex-shrink-0 shadow-sm border-2 border-white"
          />
          <div className="flex-1">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-bold text-gray-800">{review.patientName || 'Пациент'}</h4>
              <span className="text-sm text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                {formatDate(review.created_at)}
              </span>
            </div>
            <div className="mb-3 flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg 
                  key={star} 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill={star <= review.rating ? "#FFB400" : "#E2E8F0"} 
                  className="w-5 h-5"
                >
                  <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                </svg>
              ))}
            </div>
            <p className="text-gray-700 bg-gray-50 p-3 rounded-lg border-l-4 border-primary-300">{review.comment || 'Отзыв без комментария'}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

// Компонент страницы профиля врача
function DoctorProfilePage() {
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
        console.log('Получены данные о враче:', data);
        console.log('ID врача:', data.id);
        console.log('user_id врача:', data.user_id);
        
        // Подробно выводим все поля объекта data для отладки
        console.log('Все поля объекта data:');
        for (const key in data) {
          console.log(`- ${key}: ${JSON.stringify(data[key])}`);
        }
        
        // Получаем аватар врача
        if (data && data.avatar_path) {
          console.log('Аватар врача:', data.avatar_path);
          console.log('Тип avatar_path:', typeof data.avatar_path);
          console.log('Длина avatar_path:', data.avatar_path.length);
          
          if (data.avatar_path.startsWith('/')) {
            console.log('Путь начинается с /');
          } else {
            console.log('Путь НЕ начинается с /');
          }
        } else {
          console.log('Аватар врача отсутствует в данных API');
          // Проверим, возможно аватар находится в другом поле или вложенном объекте
          if (data.user && data.user.avatar_path) {
            console.log('Найден аватар в поле user.avatar_path:', data.user.avatar_path);
            
            // Добавим avatar_path в объект data для единообразия
            data.avatar_path = data.user.avatar_path;
            console.log('Добавлен avatar_path в объект data:', data.avatar_path);
          }
          if (data.avatar) {
            console.log('Найдено поле avatar:', data.avatar);
            
            // Если avatar_path еще не установлен
            if (!data.avatar_path) {
              data.avatar_path = data.avatar;
              console.log('Установлен avatar_path из поля avatar:', data.avatar_path);
            }
          }
          if (data.photo_path) {
            console.log('Найдено поле photo_path:', data.photo_path);
            
            // Если avatar_path еще не установлен
            if (!data.avatar_path) {
              data.avatar_path = data.photo_path;
              console.log('Установлен avatar_path из поля photo_path:', data.avatar_path);
            }
          }
          // Дополнительная проверка на поле photo, которое могло быть загружено при подаче заявки
          if (data.photo) {
            console.log('Найдено поле photo:', data.photo);
            
            if (!data.avatar_path) {
              data.avatar_path = data.photo;
              console.log('Установлен avatar_path из поля photo:', data.avatar_path);
            }
          }
          // Проверка на application_photo_path - фото из заявки врача
          if (data.application_photo_path) {
            console.log('Найдено поле application_photo_path:', data.application_photo_path);
            
            if (!data.avatar_path) {
              data.avatar_path = data.application_photo_path;
              console.log('Установлен avatar_path из поля application_photo_path:', data.avatar_path);
            }
          }
        }
        
        setDoctor(data);
        
        // Добавим дополнительный запрос для получения профиля пользователя, если avatar_path отсутствует
        if (!data.avatar_path) {
          try {
            console.log('Попытка получить аватар из профиля врача по URL `/doctors/${data.user_id}/profile`');
            const userResponse = await api.get(`/doctors/${data.user_id}/profile`);
            console.log('Получен ответ из профиля врача:', userResponse.data);
            
            if (userResponse.data && userResponse.data.user && userResponse.data.user.avatar_path) {
              console.log('Получен аватар из профиля врача:', userResponse.data.user.avatar_path);
              data.avatar_path = userResponse.data.user.avatar_path;
              setDoctor({...data});
            } else if (userResponse.data && userResponse.data.avatar_path) {
              console.log('Получен аватар из профиля врача (avatar_path):', userResponse.data.avatar_path);
              data.avatar_path = userResponse.data.avatar_path;
              setDoctor({...data});
            }
          } catch (userErr) {
            console.error('Не удалось получить данные профиля врача:', userErr);
            
            // Попробуем получить данные админским запросом из заявок врачей (requires admin role)
            try {
              console.log('Попытка получить данные из админ-панели заявок врачей');
              const adminAppsResponse = await api.get(`/admin/doctor-applications?status=approved`);
              console.log('Получен ответ от админ API заявок:', adminAppsResponse.data);
              
              if (adminAppsResponse.data && adminAppsResponse.data.items) {
                // Найдем заявку для нашего user_id
                const application = adminAppsResponse.data.items.find(app => app.user_id === data.user_id);
                if (application && application.photo_path) {
                  console.log('Найдена заявка с фото в админ-панели:', application.photo_path);
                  data.avatar_path = application.photo_path;
                  // Также сохраним ссылку на фото из заявки
                  data.application_photo_path = application.photo_path;
                  setDoctor({...data});
                }
              }
            } catch (adminErr) {
              console.error('Не удалось получить данные заявок (требуются права админа):', adminErr);
              
              // Последняя попытка: напрямую проверить, существует ли фотография
              try {
                console.log('Проверка доступности возможных путей к фотографии');
                
                // Попробуем создать стандартный путь, если знаем user_id
                if (data.user_id) {
                  const possiblePhotoPath = `/uploads/photos/doctor_${data.user_id}.jpg`;
                  console.log('Проверка возможного пути к фото:', possiblePhotoPath);
                  
                  try {
                    // Проверим, существует ли фото по этому пути
                    const checkResponse = await fetch(`http://127.0.0.1:8000${possiblePhotoPath}`);
                    if (checkResponse.ok) {
                      console.log('Найдено фото по сгенерированному пути:', possiblePhotoPath);
                      data.avatar_path = possiblePhotoPath;
                      setDoctor({...data});
                    } else {
                      console.log('Фото не найдено по сгенерированному пути');
                    }
                  } catch (fetchErr) {
                    console.error('Ошибка при проверке существования фото:', fetchErr);
                  }
                }
              } catch (directErr) {
                console.error('Ошибка при прямой проверке наличия фото:', directErr);
              }
            }
          }
        }
      } catch (err) {
        setError('Не удалось загрузить информацию о враче. Пожалуйста, попробуйте позже.');
        console.error('Error loading doctor profile:', err);
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
                console.log('Не удалось получить данные о пациенте:', err);
                return {...review, patientName: 'Пациент'};
              }
            })
          );
          
          setReviews(reviewsWithPatientInfo);
        }
      } catch (err) {
        console.error('Ошибка при загрузке отзывов:', err);
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
  
  // Отображаем индикатор загрузки
  if (loading) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-8 flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }
  
  // Отображаем сообщение об ошибке
  if (error) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <Card>
          <CardBody>
            <div className="text-danger text-center py-8">
              <p>{error}</p>
              <Button onPress={handleBackToSearch} color="primary" className="mt-4">
                Назад к поиску
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }
  
  // Если доктор не найден
  if (!doctor) {
    return (
      <div className="max-w-screen-xl mx-auto px-4 py-8">
        <Card>
          <CardBody>
            <div className="text-gray-600 text-center py-8">
              <p>Врач не найден. Возможно, он был удален или деактивирован.</p>
              <Button onPress={handleBackToSearch} color="primary" className="mt-4">
                Назад к поиску
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }
  
  // Преобразуем строку specializations в массив
  const specializationsArray = doctor.specializations ? doctor.specializations.split(',').map(s => s.trim()) : [];
  
  // Преобразуем строку practice_areas в массив
  const practiceAreasArray = doctor.practice_areas ? doctor.practice_areas.split(',').map(s => s.trim()) : [];
  
  // Форматирование даты
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };
  
  // Рассчитаем рейтинг врача
  const doctorRating = calculateRating(reviews);
  
  // Основной рендер
  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner size="lg" color="primary" />
        </div>
      ) : error ? (
        <div className="bg-danger-50 text-danger p-6 rounded-lg shadow-sm border border-danger-200">
          <div className="flex items-center mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-semibold">Ошибка</h3>
          </div>
          <p>{error}</p>
          <Button onPress={handleBackToSearch} color="primary" className="mt-4 shadow-sm" radius="full">
            Назад к поиску
          </Button>
        </div>
      ) : doctor ? (
        <div>
          <div className="mb-8">
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
              Назад к поиску
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 items-start mb-8">
            <div className="md:w-1/3">
              <Card className="shadow-md hover:shadow-xl transition-all overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary-400 to-primary-600 w-full"></div>
                <CardBody className="p-6 flex flex-col items-center">
                  {/* Добавляем дополнительную отладочную информацию */}
                  {doctor.avatar_path && (
                    <div className="hidden">
                      <p>DEBUG: Avatar path: {doctor.avatar_path}</p>
                    </div>
                  )}
                  
                  <div className="relative">
                    <AvatarWithFallback 
                      src={getAvatarSource(doctor)} 
                      name={doctor.full_name || "?"}
                      size="xl"
                      className="w-40 h-40 mb-4 shadow-lg border-4 border-white" 
                      isBordered
                      color="primary"
                    />
                    {doctor.is_verified && (
                      <div className="absolute -bottom-2 -right-2 bg-success-100 p-1.5 rounded-full border-2 border-white shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-success-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-1 text-center bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">{doctor.full_name || 'Нет данных'}</h2>
                  <div className="flex gap-2 mb-4 flex-wrap justify-center">
                    <Chip color="primary" variant="flat">{doctor.specialization}</Chip>
                    {doctor.is_verified && (
                      <Chip color="success" variant="flat">Проверенный врач</Chip>
                    )}
                  </div>
                  <Divider className="my-3 w-full" />
                  <div className="flex flex-col gap-4 w-full">
                    <div className="flex justify-between w-full">
                      <span className="text-gray-500">Стоимость консультации:</span>
                      <span className="font-bold text-primary">{doctor.cost_per_consultation} UZS</span>
                    </div>
                    
                    <div className="flex justify-between w-full">
                      <span className="text-gray-500">Рейтинг:</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <svg 
                            key={star} 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill={star <= doctor.rating ? "#FFB400" : "#E2E8F0"} 
                            className="w-4 h-4"
                          >
                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                          </svg>
                        ))}
                        <span className="ml-1 font-semibold">{doctor.rating}</span>
                      </div>
                    </div>
                  </div>
                  {canRequestConsultation() && (
                    <Button
                      color="primary"
                      size="lg"
                      className="mt-6 w-full font-medium shadow-md"
                      onClick={handleRequestConsultation}
                      radius="full"
                      startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                      }
                    >
                      Записаться на консультацию
                    </Button>
                  )}
                </CardBody>
              </Card>
            </div>

            <div className="md:w-2/3">
              <Card className="shadow-md hover:shadow-lg transition-all mb-8 overflow-hidden">
                <div className="h-2 bg-gradient-to-r from-primary-400 to-primary-600 w-full"></div>
                <CardBody className="p-6">
                  <h3 className="text-xl font-bold mb-6 text-center bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">Информация о враче</h3>
                  {doctor.about && (
                    <InfoSection title="О враче">
                      <p className="text-gray-700">{doctor.about}</p>
                    </InfoSection>
                  )}
                  
                  {doctor.education && (
                    <InfoSection title="Образование">
                      <p className="text-gray-700">{doctor.education}</p>
                    </InfoSection>
                  )}
                  
                  {specializationsArray.length > 0 && (
                    <InfoSection title="Специализации">
                      <div className="flex flex-wrap gap-2">
                        {specializationsArray.map((spec, index) => (
                          <Chip key={index} color="primary" variant="flat" className="shadow-sm">
                            {spec}
                          </Chip>
                        ))}
                      </div>
                    </InfoSection>
                  )}
                  
                  {practiceAreasArray.length > 0 && (
                    <InfoSection title="Районы практики">
                      <div className="flex flex-wrap gap-2">
                        {practiceAreasArray.map((area, index) => (
                          <Chip key={index} color="primary" variant="flat" className="shadow-sm">
                            {area}
                          </Chip>
                        ))}
                      </div>
                    </InfoSection>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
          
          {/* Секция с отзывами */}
          <Card className="shadow-md hover:shadow-lg transition-all overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary-400 to-primary-600 w-full"></div>
            <CardBody className="p-6">
              <h3 className="text-xl font-bold mb-6 text-gray-800">Отзывы о враче</h3>
              
              {reviewsLoading ? (
                <div className="flex justify-center py-10">
                  <Spinner color="primary" />
                </div>
              ) : reviewsError ? (
                <div className="text-center text-danger bg-danger-50 p-4 rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>{reviewsError}</p>
                </div>
              ) : reviews.length === 0 ? (
                <div className="text-center text-gray-500 py-10 bg-gray-50 rounded-lg border border-gray-100">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <p className="text-lg font-medium mb-2">У этого врача пока нет отзывов</p>
                  <p className="text-sm text-gray-500">Будьте первым, кто оставит отзыв после консультации</p>
                </div>
              ) : (
                <div>
                  {currentReviews.map((review, index) => (
                    <ReviewItem key={index} review={review} />
                  ))}
                  
                  {/* Пагинация */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6">
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
                    </div>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
          
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
  );
}

export default DoctorProfilePage; 