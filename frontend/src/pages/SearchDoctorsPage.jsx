import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, CardFooter, Divider, Pagination, Spinner, Chip, Select, SelectItem, Avatar } from '@nextui-org/react';
import { doctorsApi } from '../api';
import api from '../api';
import useAuthStore from '../stores/authStore';
import AvatarWithFallback from '../components/AvatarWithFallback';
import RequestConsultationModal from '../components/RequestConsultationModal';

// Функция для получения URL аватара из разных возможных полей
const getAvatarSource = (doctorData) => {
  if (!doctorData) return undefined;
  
  console.log('SearchDoctorsPage - getAvatarSource: Проверка источников аватара', {
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
  
  // Проверяем наличие фотографии из заявки врача
  if (doctorData.application_photo_path) {
    console.log('Используем application_photo_path:', doctorData.application_photo_path);
    return doctorData.application_photo_path;
  }
  
  // Дополнительная проверка поля photo, которое могло быть загружено при подаче заявки
  if (doctorData.photo) {
    console.log('Используем photo:', doctorData.photo);
    return doctorData.photo;
  }
  
  // Пробуем создать стандартный путь, если знаем user_id
  if (doctorData.user_id) {
    const possiblePhotoPath = `/uploads/photos/doctor_${doctorData.user_id}.jpg`;
    console.log('Используем сгенерированный путь к фото:', possiblePhotoPath);
    return possiblePhotoPath;
  }
  
  console.log('SearchDoctorsPage: Не найден подходящий источник аватара, используем заглушку');
  return undefined;
};

// Компонент карточки врача в списке
const DoctorCard = ({ doctor, onClick }) => {
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
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
    console.log("Получаем ID врача для консультации:", doctor);
    
    // Берем сначала user_id, затем id как запасной вариант
    const doctorId = doctor.user_id || doctor.id;
    console.log("Найденный ID врача:", doctorId);
    
    return doctorId;
  };
  
  // Обработчик кнопки "Записаться"
  const handleRequestConsultation = () => {
    console.log("Нажата кнопка Записаться для врача:", doctor);
    console.log("ID пользователя врача:", doctor.user_id);
    console.log("ID врача:", doctor.id);
    
    // Проверка наличия ID врача
    if (!doctor.user_id && !doctor.id) {
      console.error("Ошибка: отсутствует ID врача для записи на консультацию");
      alert("Произошла ошибка при попытке записи к врачу. Попробуйте перейти в профиль врача.");
      return;
    }
    
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
  
  return (
    <Card 
      className="mb-4 hover:shadow-md transition-all duration-300 overflow-hidden"
      isPressable 
      onPress={onClick}
      shadow="sm"
    >
      <CardBody className="p-0">
        <div className="flex flex-col">
          {/* Верхняя часть карточки с информацией о враче */}
          <div className="p-4 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                  <AvatarWithFallback 
                    src={getAvatarSource(doctor)} 
                    name={doctor.full_name || "?"}
                    size="lg"
                    className="w-full h-full" 
                    color="primary"
                    style={{ minWidth: "100%", minHeight: "100%" }}
                  />
                </div>
                {doctor.is_verified && (
                  <div className="absolute -bottom-1 -right-1 bg-success-100 p-1 rounded-full border border-white">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-success-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{doctor.full_name || 'Имя не указано'}</h3>
                <div className="flex items-center flex-wrap mt-1 gap-1.5">
                  <Chip color="primary" variant="flat" size="sm" className="text-xs">{doctor.specialization}</Chip>
                  {doctor.is_verified && (
                    <Chip color="success" variant="flat" size="sm" className="text-xs">Проверенный врач</Chip>
                  )}
                </div>
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-primary">{doctor.cost_per_consultation} UZS</div>
              {doctor.rating > 0 && (
                <div className="flex items-center mt-1 justify-end">
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg 
                        key={star} 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill={star <= doctor.rating ? "#FFB400" : "#E2E8F0"} 
                        className="w-3.5 h-3.5"
                      >
                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                      </svg>
                    ))}
                  </div>
                  <span className="ml-1 text-xs text-gray-600">{doctor.rating}</span>
                </div>
              )}
            </div>
          </div>
          
          <Divider />
          
          {/* Нижняя часть карточки с дополнительной информацией */}
          <div className="p-4 bg-gray-50">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-100 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Район</p>
                  <p className="text-sm font-medium">{doctor.district || 'Не указан'}</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="w-8 h-8 flex items-center justify-center rounded-full bg-primary-100 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-500 font-medium">Опыт</p>
                  <p className="text-sm font-medium">{doctor.experience || 'Не указан'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBody>
      <CardFooter className="px-4 py-3 flex justify-between items-center bg-white border-t">
        <Button 
          color="primary" 
          variant="light" 
          size="sm" 
          radius="full" 
          className="font-medium"
          endContent={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          }
        >
          Подробнее
        </Button>
        <Button 
          color="primary" 
          size="sm" 
          radius="full" 
          className="font-medium"
          onPress={handleRequestConsultation}
        >
          Записаться
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
  );
};

// Компонент страницы поиска врачей
function SearchDoctorsPage() {
  const navigate = useNavigate();
  
  // Состояния для фильтров
  const [specialization, setSpecialization] = useState('');
  const [specializations, setSpecializations] = useState([]);
  
  // Состояния для данных
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Состояния для пагинации
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  // Загружаем список специализаций
  useEffect(() => {
    const loadSpecializations = async () => {
      try {
        const specializations = await doctorsApi.getSpecializations();
        setSpecializations(specializations);
      } catch (error) {
        console.error('Failed to load specializations:', error);
      }
    };
    
    loadSpecializations();
  }, []);

  // Загрузка врачей при первом рендере и при изменении фильтров или страницы
  useEffect(() => {
    // Функция для загрузки данных
    const fetchDoctors = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Фильтры для запроса (только специализация)
        const filters = {};
        if (specialization) {
          filters.specialization = specialization;
        }
        
        // Отправляем запрос на API
        const doctorsData = await doctorsApi.getDoctors(filters, page, 10);
        
        // Дополняем данные врачей их фотографиями
        const enhancedDoctorsData = await Promise.all(doctorsData.items.map(async (doctor) => {
          // Если у врача нет аватара, пробуем получить из профиля
          if (!doctor.avatar_path && doctor.user_id) {
            try {
              console.log(`Попытка получить аватар для врача ${doctor.id} из профиля`);
              const profileResp = await api.get(`/doctors/${doctor.user_id}/profile`);
              if (profileResp.data && profileResp.data.user && profileResp.data.user.avatar_path) {
                console.log(`Найден аватар в профиле для врача ${doctor.id}:`, profileResp.data.user.avatar_path);
                doctor.avatar_path = profileResp.data.user.avatar_path;
              }
            } catch (err) {
              console.log(`Не удалось получить профиль для врача ${doctor.id}:`, err);
            }
          }
          return doctor;
        }));
        
        // Обновляем состояние
        setDoctors(enhancedDoctorsData);
        setTotalPages(doctorsData.pages);
        setTotalItems(doctorsData.total);
      } catch (err) {
        console.error('Error fetching doctors:', err);
        setError('Не удалось загрузить список врачей.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDoctors();
  }, [page, specialization]);
  
  // Обработчик поиска (сбрасывает пагинацию и выполняет новый поиск)
  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1); // Сбрасываем страницу на первую при новом поиске
  };
  
  // Обработчик изменения специализации
  const handleSpecializationChange = (e) => {
    setSpecialization(e.target.value);
    setPage(1); // Сбрасываем на первую страницу при изменении фильтра
  };
  
  // Обработчик клика по карточке врача
  const handleDoctorClick = (doctorId) => {
    navigate(`/doctors/${doctorId}`);
  };
  
  return (
    <div className="max-w-screen-xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2 text-center bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Поиск врачей</h1>
      <p className="text-center text-gray-600 mb-8">Найдите подходящего специалиста для консультации</p>
      
      {/* Форма фильтрации */}
      <form onSubmit={handleSearch} className="mb-8 bg-gradient-to-r from-white to-gray-50 p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow">
            <Select
              label="Специализация"
              placeholder="Выберите специализацию"
              value={specialization}
              onChange={handleSpecializationChange}
              variant="bordered"
              radius="sm"
              fullWidth
              className="min-w-full"
            >
              <SelectItem key="" value="">Все специализации</SelectItem>
              {specializations.map((spec) => (
                <SelectItem key={spec} value={spec}>
                  {spec}
                </SelectItem>
              ))}
            </Select>
          </div>
          <Button
            type="submit"
            color="primary"
            isLoading={loading}
            className="md:w-auto w-full"
            size="lg"
            radius="full"
            startContent={
              !loading && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              )
            }
          >
            {loading ? 'Поиск...' : 'Найти врача'}
          </Button>
        </div>
      </form>
      
      {/* Отображение ошибки */}
      {error && (
        <div className="text-danger text-center mb-4 p-4 bg-danger-50 rounded-lg border border-danger-100">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-danger mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}
      
      {/* Индикатор загрузки */}
      {loading && (
        <div className="flex justify-center my-12">
          <Spinner size="lg" color="primary" />
        </div>
      )}
      
      {/* Результаты поиска */}
      {!loading && (
        <>
          {/* Информация о результатах */}
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {doctors.length > 0 ? (
                <>Найдено врачей: <span className="text-primary">{totalItems}</span></>
              ) : (
                'Результаты поиска'
              )}
            </h2>
            
            {doctors.length > 0 && (
              <p className="text-sm text-gray-600">
                Страница {page} из {totalPages}
              </p>
            )}
          </div>
          
          {doctors.length === 0 ? (
            <div className="text-center text-gray-500 my-12 p-8 bg-gray-50 rounded-lg border border-gray-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg font-medium mb-2">Нет врачей, соответствующих вашим критериям поиска</p>
              <p className="text-gray-500">Попробуйте изменить параметры поиска или выбрать другую специализацию</p>
            </div>
          ) : (
            <>
              {/* Список врачей */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {doctors.map(doctor => (
                  <DoctorCard 
                    key={doctor.id} 
                    doctor={doctor} 
                    onClick={() => handleDoctorClick(doctor.id)}
                  />
                ))}
              </div>
              
              {/* Пагинация */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <Pagination
                    total={totalPages}
                    initialPage={page}
                    onChange={setPage}
                    color="primary"
                    showShadow
                    radius="full"
                    classNames={{
                      wrapper: "shadow-sm"
                    }}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default SearchDoctorsPage; 