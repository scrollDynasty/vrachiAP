import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, Spinner, Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea } from '@nextui-org/react';
import { toast } from 'react-hot-toast';
import ConsultationChat from '../components/ConsultationChat';
import api from '../api';
import useAuthStore from '../stores/authStore';

// Страница консультации
function ConsultationPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasReview, setHasReview] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [doctorName, setDoctorName] = useState('Врач');
  const [patientName, setPatientName] = useState('Пациент');

  const { user } = useAuthStore();

  const isDoctor = user?.id === consultation?.doctor_id;
  const isPatient = user?.id === consultation?.patient_id;

  // Загрузка данных консультации
  const fetchConsultation = async () => {
    try {
      const response = await api.get(`/api/consultations/${consultationId}`);
      setConsultation(response.data);
      
      // Если консультация завершена, проверяем наличие отзыва
      if (response.data.status === 'completed') {
        await checkReview();
      }
      
      // Загружаем имена доктора и пациента из их профилей
      try {
        // Загружаем профиль доктора
        const doctorResponse = await api.get(`/doctors/${response.data.doctor_id}/profile`);
        if (doctorResponse.data && doctorResponse.data.full_name) {
          setDoctorName(doctorResponse.data.full_name);
        }
        
        // Загружаем профиль пациента
        try {
          const patientProfileResponse = await api.get(`/patients/${response.data.patient_id}/profile`);
          if (patientProfileResponse.data && patientProfileResponse.data.full_name) {
            setPatientName(patientProfileResponse.data.full_name);
          }
        } catch (patientError) {
          console.log('Не удалось загрузить профиль пациента:', patientError);
          // Если не получилось загрузить профиль через /users/{id}/profile
          // Пробуем другой эндпоинт
          try {
            const patientUserResponse = await api.get(`/admin/users/${response.data.patient_id}/profile`);
            if (patientUserResponse.data && patientUserResponse.data.full_name) {
              setPatientName(patientUserResponse.data.full_name);
            }
          } catch (adminError) {
            console.log('Не удалось загрузить профиль пациента через админ API:', adminError);
          }
        }
      } catch (profileError) {
        console.error('Ошибка загрузки профилей:', profileError);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching consultation:', error);
      
      const errorMessage = error.response?.data?.detail || 
        'Не удалось загрузить данные консультации.';
        
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  };
  
  // Проверка наличия отзыва
  const checkReview = async () => {
    try {
      // Проверяем только если консультация завершена, чтобы избежать ненужных запросов
      if (!consultation || consultation.status !== 'completed') {
        setHasReview(false);
        return;
      }
      
      // Проверяем localStorage - если отзыв уже был добавлен ранее
      const reviewKey = `review_added_${consultationId}`;
      if (localStorage.getItem(reviewKey) === 'true') {
        console.log('Отзыв уже был добавлен ранее (из localStorage в ConsultationPage)');
        setHasReview(true);
        return;
      }
      
      const response = await api.get(`/api/consultations/${consultationId}/review`);
      
      // Если пришел 200 статус, значит отзыв есть
      setHasReview(true);
      // Сохраняем в localStorage для будущих проверок
      localStorage.setItem(reviewKey, 'true');
      
    } catch (error) {
      // Если 404, то отзыва нет, что нормально - не выводим ошибку в консоль
      if (error.response?.status === 404) {
        setHasReview(false);
      } else {
        console.error('Error checking review:', error);
      }
    }
  };
  
  // Начало консультации (активация)
  const startConsultation = async () => {
    try {
      // Показываем индикатор загрузки
      toast.loading('Начинаем консультацию...');
      
      const response = await api.post(`/api/consultations/${consultationId}/start`);
      
      // Обновляем локальное состояние
      setConsultation(response.data);
      
      // Очищаем предыдущие состояния, связанные с отзывами и проверками
      sessionStorage.removeItem(`review_check_${consultationId}`);
      sessionStorage.removeItem(`review_shown_${consultationId}`);
      
      // Закрываем индикатор загрузки
      toast.dismiss();
      
      // Показываем красивое уведомление в правом верхнем углу
      toast.success('Консультация успешно началась', {
        position: 'top-right',
        duration: 4000,
        icon: '✓'
      });
      
      // Уведомляем пациента о начале консультации через систему уведомлений
      try {
        await api.post(`/api/consultations/${consultationId}/notify`, {
          message: 'Врач начал консультацию. Вы можете начать общение.'
        });
        console.log('Уведомление о начале консультации отправлено пациенту');
      } catch (notifyError) {
        console.error('Ошибка отправки уведомления:', notifyError);
        // Не показываем ошибку пользователю, это некритичная операция
      }
      
      // Сбрасываем кэш сообщений и состояние для чистого начала
      try {
        const chatRefreshKey = `message_request_count_${consultationId}`;
        const firstRequestTimeKey = `message_first_request_time_${consultationId}`;
        const lastActivityKey = `last_activity_time_${consultationId}`;
        
        // Сбрасываем счетчики запросов
        sessionStorage.removeItem(chatRefreshKey);
        sessionStorage.removeItem(firstRequestTimeKey);
        sessionStorage.removeItem(lastActivityKey);
      } catch (storageError) {
        console.warn('Ошибка при очистке счетчиков запросов:', storageError);
      }
      
      // Принудительно обновляем компонент чата с небольшой задержкой
      setTimeout(() => {
        handleConsultationUpdated();
      }, 300);
      
    } catch (error) {
      // Закрываем индикатор загрузки
      toast.dismiss();
      
      console.error('Error starting consultation:', error);
      
      const errorMessage = error.response?.data?.detail || 
        'Не удалось начать консультацию.';
        
      toast.error(errorMessage);
    }
  };
  
  // Позволяет дочерним компонентам открыть модалку отзыва
  useEffect(() => {
    window.showReviewModal = (callback) => {
      setIsReviewModalOpen(true);
      window.reviewCallback = callback;
    };
    return () => { 
      window.showReviewModal = undefined;
      window.reviewCallback = undefined;
    };
  }, []);

  // Отправка отзыва о консультации
  const submitReview = async () => {
    // Проверяем заполнение обязательных полей
    if (!reviewRating) {
      toast.error('Пожалуйста, укажите рейтинг.');
      return;
    }
    
    // Комментарий теперь необязательный - удаляем проверку
    
    try {
      setSubmittingReview(true);
      
      await api.post(`/api/consultations/${consultationId}/review`, {
        rating: reviewRating,
        // Отправляем комментарий только если он заполнен, иначе null
        comment: reviewComment.trim() || null
      });
      
      // Сохраняем информацию об отправке отзыва в localStorage
      localStorage.setItem(`review_added_${consultationId}`, 'true');
      sessionStorage.setItem(`review_added_${consultationId}`, 'true');
      
      toast.success('Спасибо за ваш отзыв!');
      setIsReviewModalOpen(false);
      setHasReview(true);
      
      // Вызываем колбэк, если есть
      if (typeof window.reviewCallback === 'function') {
        window.reviewCallback(true);
      }
      
      // Перенаправляем на главную страницу
      toast.success('Перенаправление на главную страницу...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (error) {
      console.error('Error submitting review:', error);
      
      const errorMessage = error.response?.data?.detail || 
        'Не удалось отправить отзыв.';
        
      toast.error(errorMessage);
      
      // Вызываем колбэк с false, если есть
      if (typeof window.reviewCallback === 'function') {
        window.reviewCallback(false);
      }
    } finally {
      setSubmittingReview(false);
    }
  };
  
  // Загрузка данных при первом рендере
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchConsultation();
      setLoading(false);
      
      // Дополнительная проверка отзыва через 1 секунду после загрузки
      setTimeout(async () => {
        // Принудительно проверяем наличие отзыва в localStorage
        const reviewKey = `review_added_${consultationId}`;
        if (localStorage.getItem(reviewKey) === 'true') {
          console.log('Отзыв уже существует в localStorage, устанавливаем hasReview = true');
          setHasReview(true);
          setIsReviewModalOpen(false); // Закрываем модальное окно, если оно открыто
          return;
        }
        
        // Повторно проверяем через API
        try {
          const response = await api.get(`/api/consultations/${consultationId}/review`);
          if (response.data && response.data.id) {
            console.log('Повторная проверка API: отзыв существует');
            localStorage.setItem(reviewKey, 'true');
            sessionStorage.setItem(reviewKey, 'true');
            setHasReview(true);
            setIsReviewModalOpen(false); // Закрываем модальное окно, если оно открыто
          }
        } catch (error) {
          if (error.response?.status !== 404) {
            console.error('Ошибка при повторной проверке отзыва:', error);
          }
        }
      }, 1000);
    };
    
    loadData();
  }, [consultationId]);
  
  // Автоматически открываем отзыв после завершения консультации (только если пациент, нет отзыва и нет записи в localStorage)
  useEffect(() => {
    // Проверяем localStorage перед открытием модального окна
    const reviewKey = `review_added_${consultationId}`;
    const reviewShownKey = `review_shown_${consultationId}`;
    
    const hasReviewInLocalStorage = localStorage.getItem(reviewKey) === 'true';
    const reviewShownRecently = sessionStorage.getItem(reviewShownKey) === 'true';
    
    console.log('Проверка перед автоматическим открытием модального окна:', {
      hasReview,
      hasReviewInLocalStorage,
      reviewShownRecently,
      isPatient,
      status: consultation?.status
    });
    
    if (
      consultation &&
      consultation.status === 'completed' &&
      isPatient &&
      !hasReview &&
      !hasReviewInLocalStorage &&
      !reviewShownRecently &&
      !isReviewModalOpen
    ) {
      console.log('Автоматически открываем модальное окно отзыва');
      // Отмечаем, что модальное окно было показано в этой сессии
      sessionStorage.setItem(reviewShownKey, 'true');
      setTimeout(() => setIsReviewModalOpen(true), 500);
    }
  }, [consultation, isPatient, hasReview, isReviewModalOpen, consultationId]);
  
  // Функция обработки обновления консультации
  const handleConsultationUpdated = () => {
    // Перезагружаем данные консультации
    fetchConsultation();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[80vh]">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-danger-50">
          <CardBody>
            <p className="text-danger">Ошибка: {error}</p>
            <Button 
              color="primary" 
              className="mt-4"
              onPress={() => navigate('/history')}
            >
              Вернуться к списку консультаций
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  // Проверяем, может ли пользователь писать сообщения
  const canSendMessages = 
    (consultation.status === 'active' || consultation.status === 'waiting') && 
    (isDoctor || isPatient) &&
    (isDoctor || consultation.message_count < consultation.message_limit);

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            Консультация
          </h1>
          <div className="flex gap-2 mt-1">
            <Chip 
              size="sm" 
              color={
                consultation.status === 'active' ? 'success' : 
                consultation.status === 'completed' ? 'secondary' : 
                'primary'
              }
            >
              {consultation.status === 'active' ? 'Активна' : 
               consultation.status === 'completed' ? 'Завершена' : 
               'Ожидает начала'}
            </Chip>
            {isPatient && (
              <Chip size="sm" color="primary">
                Сообщений: {consultation.message_count}/{consultation.message_limit}
              </Chip>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Кнопка для начала консультации (только для врача) */}
          {isDoctor && consultation.status === 'pending' && (
            <Button 
              color="success" 
              onPress={startConsultation}
            >
              Начать консультацию
            </Button>
          )}
          
          <Button 
            color="default" 
            variant="light"
            onPress={() => navigate('/history')}
          >
            К списку консультаций
          </Button>
        </div>
      </div>
      
      {consultation.patient_note && isDoctor && (
        <Card className="mb-6 shadow-sm">
          <CardBody className="p-4">
            <h3 className="text-md font-semibold mb-2">Сопроводительное письмо пациента:</h3>
            <p className="text-gray-700">{consultation.patient_note}</p>
          </CardBody>
        </Card>
      )}
      
      {/* Компонент чата */}
      <ConsultationChat 
        consultationId={consultationId} 
        consultation={consultation}
        onConsultationUpdated={handleConsultationUpdated}
        canSendMessages={canSendMessages}
        isDoctor={isDoctor}
        isPatient={isPatient}
        patientName={patientName}
        doctorName={doctorName}
      />
      
      {/* Модальное окно для отправки отзыва */}
      <Modal 
        isOpen={isReviewModalOpen && 
               localStorage.getItem(`review_added_${consultationId}`) !== 'true'} 
        onClose={() => setIsReviewModalOpen(false)}
        closeButton={consultation?.status === 'completed' && !hasReview ? false : true}
        isDismissable={consultation?.status === 'completed' && !hasReview ? false : true}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">Оставить отзыв о консультации</ModalHeader>
          <ModalBody>
            <div className="mb-4">
              <label className="block mb-2">
                Оценка: <span className="text-red-500">*</span>
              </label>
              <div className="flex space-x-2 text-2xl">
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    className={`cursor-pointer ${star <= reviewRating ? "text-yellow-500" : "text-gray-300"}`}
                    onClick={() => setReviewRating(star)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block mb-2">
                Комментарий: <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Расскажите о вашем опыте консультации..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                isRequired
              />
            </div>
          </ModalBody>
          <ModalFooter>
            {!(consultation?.status === 'completed' && !hasReview) && (
              <Button 
                color="danger" 
                variant="light" 
                onPress={() => setIsReviewModalOpen(false)}
              >
                Отмена
              </Button>
            )}
            <Button 
              color="primary" 
              onPress={submitReview}
              isLoading={submittingReview}
            >
              Отправить отзыв
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default ConsultationPage; 