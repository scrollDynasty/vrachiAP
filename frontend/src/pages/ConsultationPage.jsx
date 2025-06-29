import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, Spinner, Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea } from '@nextui-org/react';
import { toast } from 'react-hot-toast';
import ConsultationChat from '../components/ConsultationChat';
import api from '../api';
import useAuthStore from '../stores/authStore';
import ReviewForm from '../components/ReviewForm';
import { useTranslation } from '../components/LanguageSelector';
import CallButtons from '../components/calls/CallButtons';
import VideoCallModal from '../components/calls/VideoCallModal';
import useWebRTC from '../hooks/useWebRTC';
import IncomingCallNotification from '../components/calls/IncomingCallNotification';

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
  const [doctorAvatar, setDoctorAvatar] = useState(null);

  const { user } = useAuthStore();
  const { t } = useTranslation();

  const isDoctor = user?.id === consultation?.doctor_id;
  const isPatient = user?.id === consultation?.patient_id;

  // --- WebRTC state ---
  const [callModalOpen, setCallModalOpen] = useState(false);
  const [callType, setCallType] = useState('audio');
  const [currentCall, setCurrentCall] = useState(null);
  const [signalingSocket, setSignalingSocket] = useState(null);
  const [incomingCallWebSocket, setIncomingCallWebSocket] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [incomingCallModalOpen, setIncomingCallModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [processedCallIds, setProcessedCallIds] = useState(new Set()); // Защита от дублирования
  const [forceResetCallButtons, setForceResetCallButtons] = useState(false); // Для принудительного сброса CallButtons

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // --- WebRTC hook ---
  const {
    start,
    endCall,
    toggleMic,
    toggleCam,
    micEnabled,
    camEnabled,
    callActive,
    connectionState,
    stop,
    createOffer,
    peerReady
  } = useWebRTC({
    localVideoRef,
    remoteVideoRef,
    signalingSocket,
    isCaller: currentCall?.caller_id === user?.id, // Определяем по caller_id
    callType: currentCall?.call_type || 'video', // Передаем тип звонка
    onCallEnd: () => {
      setCallModalOpen(false);
      setCurrentCall(null);
    },
    onError: (err) => {
      setCallModalOpen(false);
      setCurrentCall(null);
      toast.error('Ошибка WebRTC: ' + err.message);
    },
    onOfferReceived: () => {
      // Сбрасываем состояние ожидания ответа при получении offer
      resetWaitingState();
    },
    onCallAccepted: () => {
      // Сбрасываем состояние ожидания ответа при принятии звонка
      resetWaitingState();
    }
  });

  // --- Call initiation ---
  const connectToCallWebSocket = (callId) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/calls/ws/${callId}?token=${localStorage.getItem('auth_token')}`;
    
    // Открываем WebSocket для сигнализации
    const ws = new WebSocket(wsUrl);
    setSignalingSocket(ws);
    
    ws.onopen = () => {
      // Запускаем WebRTC только после установки WebSocket соединения
      setTimeout(() => {
        start(ws); // Передаем WebSocket напрямую
      }, 1000);
    };
    
    ws.onclose = () => {
      setSignalingSocket(null);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket ошибка:', error);
      toast.error('Ошибка подключения к серверу звонков');
    };
  };

  const handleCallInitiated = (callData) => {
    console.log('Звонок инициирован:', callData);
    setCurrentCall(callData);
    setWaitingForAnswer(true);
    setIsCallModalOpen(true);
    
    // Подключаемся к WebSocket для звонка
    if (callData.id) {
      connectToCallWebSocket(callData.id);
    }
  };

  const handleCallAccepted = (callData) => {
    console.log('Звонок принят:', callData);
    setCurrentCall(callData);
    setWaitingForAnswer(false);
    setIsCallModalOpen(true);
    setIncomingCall(null);
    setIncomingCallModalOpen(false);
    
    // Подключаемся к WebSocket для звонка
    if (callData.id) {
      connectToCallWebSocket(callData.id);
    }
  };

  // --- Call end ---
  const handleCallEnded = async () => {
    // Завершаем звонок на бэкенде
    if (currentCall?.id) {
      try {
        await api.post(`/api/calls/${currentCall.id}/end`);
      } catch (error) {
        console.error('Error ending call on backend:', error);
      }
    }
    
    // Останавливаем WebRTC
    if (endCall) {
      endCall();
    }
    
    // Очищаем состояния звонков
    setCurrentCall(null);
    setWaitingForAnswer(false);
    setIsCallModalOpen(false);
    setIncomingCall(null);
    setIncomingCallModalOpen(false);
    
    // Принудительно сбрасываем состояние CallButtons
    setForceResetCallButtons(true);
    setTimeout(() => setForceResetCallButtons(false), 100); // Сбрасываем флаг через короткое время
    
    // Очищаем WebSocket соединения
    if (signalingSocket) {
      signalingSocket.close();
      setSignalingSocket(null);
    }
  };

  // Функция для сброса состояния ожидания ответа
  const resetWaitingState = () => {
    setWaitingForAnswer(false);
  };

  // useEffect для создания offer после готовности peer
  useEffect(() => {
    if (peerReady && signalingSocket && signalingSocket.readyState === WebSocket.OPEN && currentCall) {
      setTimeout(() => {
        createOffer();
      }, 200); // Небольшая задержка для стабильности
    }
  }, [peerReady, signalingSocket, currentCall, createOffer]);

  // Функция для принудительного сброса состояния звонка
  const resetCallState = () => {
    setCurrentCall(null);
    setWaitingForAnswer(false);
    setIsCallModalOpen(false);
    setIncomingCall(null);
    setIncomingCallModalOpen(false);
    
    if (signalingSocket) {
      signalingSocket.close();
      setSignalingSocket(null);
    }
    
    if (stop) {
      stop();
    }
  };

  // --- Incoming call handlers ---
  const handleIncomingCallAccept = (call) => {
    setCurrentCall(call);
    setWaitingForAnswer(false);
    setIsCallModalOpen(true);
    setIncomingCallModalOpen(false);
    setIncomingCall(null);
    
    // Подключаемся к WebSocket для звонка
    if (call.id) {
      connectToCallWebSocket(call.id);
    }
  };

  const handleIncomingCallReject = () => {
    setIncomingCallModalOpen(false);
    setIncomingCall(null);
    setWaitingForAnswer(false);
  };

  // Функция воспроизведения звука уведомления
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.play().catch(() => {});
    } catch (error) {
    }
  };

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
          
          // Если есть аватар доктора, сохраняем его
          if (doctorResponse.data.avatar_url) {
            setDoctorAvatar(doctorResponse.data.avatar_url);
          }
        }
        
        // Загружаем профиль пациента
        try {
          const patientProfileResponse = await api.get(`/patients/${response.data.patient_id}/profile`);
          if (patientProfileResponse.data && patientProfileResponse.data.full_name) {
            setPatientName(patientProfileResponse.data.full_name);
          }
        } catch (patientError) {
          // Не удалось загрузить профиль пациента
          // Если не получилось загрузить профиль через /users/{id}/profile
          // Пробуем другой эндпоинт
          try {
            const patientUserResponse = await api.get(`/admin/users/${response.data.patient_id}/profile`);
            if (patientUserResponse.data && patientUserResponse.data.full_name) {
              setPatientName(patientUserResponse.data.full_name);
            }
          } catch (adminError) {
            // Не удалось загрузить профиль пациента через админ API
          }
        }
      } catch (profileError) {
        // Ошибка загрузки профилей
      }
      
      return response.data;
    } catch (error) {
      // Ошибка получения консультации
      
      const errorMessage = error.response?.data?.detail || 
        'Не удалось загрузить данные консультации.';
        
      setError(errorMessage);
      toast.error(errorMessage);
      return null;
    }
  };
  
  // Загрузка сообщений консультации
  const fetchMessages = async () => {
    try {
      const response = await api.get(`/api/consultations/${consultationId}/messages`);
      // Сообщения загружаются в ConsultationChat компоненте
      return response.data;
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
      return [];
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
        // Отзыв уже был добавлен ранее
        setHasReview(true);
        setIsReviewModalOpen(false); // Принудительно закрываем модальное окно
        return;
      }
      
      const response = await api.get(`/api/consultations/${consultationId}/review`);
      
      // Если пришел 200 статус, значит отзыв есть
      if (response.data && response.data.id) {
        setHasReview(true);
        setIsReviewModalOpen(false); // Принудительно закрываем модальное окно
        
        // Сохраняем в localStorage для будущих проверок
        localStorage.setItem(reviewKey, 'true');
        sessionStorage.setItem(reviewKey, 'true');
        // Отзыв найден в БД, сохранено в localStorage
      }
      
    } catch (error) {
      // Если 404, то отзыва нет, что нормально - не выводим ошибку в консоль
      if (error.response?.status === 404) {
        setHasReview(false);
      } else {
        // Ошибка проверки отзыва
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
      toast.success(t('consultationStarted'), {
        position: 'top-right',
        duration: 4000,
        icon: '✓'
      });
      
      // Уведомляем пациента о начале консультации через систему уведомлений
      try {
        await api.post(`/api/consultations/${consultationId}/notify`, {
          message: 'Врач начал консультацию. Вы можете начать общение.'
        });
        // Уведомление о начале консультации отправлено пациенту
      } catch (notifyError) {
        // Ошибка отправки уведомления
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
        // Ошибка при очистке счетчиков запросов
      }
      
      // Принудительно обновляем компонент чата с небольшой задержкой
      setTimeout(() => {
        handleConsultationUpdated();
      }, 300);
      
    } catch (error) {
      // Закрываем индикатор загрузки
      toast.dismiss();
      
      // Ошибка начала консультации
      
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
      
      toast.success(t('thanksForReview'));
      setIsReviewModalOpen(false);
      setHasReview(true);
      
      // Вызываем колбэк, если есть
      if (typeof window.reviewCallback === 'function') {
        window.reviewCallback(true);
      }
      
      // Перенаправляем на главную страницу
      toast.success(t('redirectingHome'));
      setTimeout(() => {
        navigate('/');
      }, 2000);
      
    } catch (error) {
      // Ошибка отправки отзыва
      
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
          setHasReview(true);
          setIsReviewModalOpen(false); // Закрываем модальное окно, если оно открыто
          return;
        }
        
        // Повторно проверяем через API
        try {
          const response = await api.get(`/api/consultations/${consultationId}/review`);
          if (response.data && response.data.id) {
            localStorage.setItem(reviewKey, 'true');
            sessionStorage.setItem(reviewKey, 'true');
            setHasReview(true);
            setIsReviewModalOpen(false); // Закрываем модальное окно, если оно открыто
          }
        } catch (error) {
          if (error.response?.status !== 404) {
          }
        }
      }, 1000);
    };
    
    loadData();
  }, [consultationId]);
  
  // Функция обработки обновления консультации
  const handleConsultationUpdated = useCallback(async () => {
    try {
      // Загружаем свежие данные консультации
      const refreshedConsultation = await fetchConsultation();
      
      // Если консультация стала завершенной, делаем дополнительную проверку отзыва
      if (refreshedConsultation && refreshedConsultation.status === 'completed') {
        await checkReview();
      }
      
    } catch (error) {
    }
  }, [consultationId]);

  // Функция обработки успешной отправки отзыва  
  const handleReviewSubmitted = useCallback(() => {
    // Сразу обновляем состояние
    setHasReview(true);
    setIsReviewModalOpen(false);
    
    // Сохраняем в localStorage для будущих проверок
    const reviewKey = `review_added_${consultationId}`;
    localStorage.setItem(reviewKey, 'true');
    sessionStorage.setItem(reviewKey, 'true');
    
    // Принудительно перезагружаем данные консультации
    setTimeout(async () => {
      try {
        await fetchConsultation();
        await checkReview(); // Дополнительная проверка
      } catch (error) {
      }
    }, 500);
    
  }, [consultationId]);

  // Автоматически открываем отзыв после завершения консультации (только если пациент, нет отзыва и нет записи в localStorage)
  useEffect(() => {
    // Проверяем localStorage перед открытием модального окна
    const reviewKey = `review_added_${consultationId}`;
    const reviewShownKey = `review_shown_${consultationId}`;
    
    const hasReviewInLocalStorage = localStorage.getItem(reviewKey) === 'true';
    const reviewShownRecently = sessionStorage.getItem(reviewShownKey) === 'true';
    
    // Проверка перед автоматическим открытием модального окна
    
    // Если консультация завершена, но отзыв уже есть - убеждаемся что модальное окно закрыто
    if (consultation?.status === 'completed' && (hasReview || hasReviewInLocalStorage)) {
      setIsReviewModalOpen(false);
      return;
    }
    
    if (
      consultation && 
      consultation.status === 'completed' && 
      isPatient && 
      !hasReview && 
      !hasReviewInLocalStorage &&
      !reviewShownRecently &&
      !isReviewModalOpen
    ) {
      // Отмечаем, что модальное окно было показано в этой сессии
      sessionStorage.setItem(reviewShownKey, 'true');
      setTimeout(() => setIsReviewModalOpen(true), 500);
    }
  }, [consultation, isPatient, hasReview, isReviewModalOpen, consultationId]);

  // Дополнительная защита от повторного открытия модального окна
  useEffect(() => {
    const reviewKey = `review_added_${consultationId}`;
    
    // Проверяем каждые 2 секунды, не появился ли отзыв
    const interval = setInterval(() => {
      if (localStorage.getItem(reviewKey) === 'true' && isReviewModalOpen) {
        setIsReviewModalOpen(false);
        setHasReview(true);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [consultationId, isReviewModalOpen]);

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const loadData = async () => {
      const consultationData = await fetchConsultation();
      if (consultationData) {
        await fetchMessages();
      }
    };

    loadData();

    // WebSocket для входящих звонков
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const callsWsUrl = `${protocol}//${host}/api/calls/ws/incoming/${user?.id}?token=${localStorage.getItem('auth_token')}`;
    
    const callsWs = new WebSocket(callsWsUrl);
    setIncomingCallWebSocket(callsWs);
    
    callsWs.onopen = () => {
      console.log('WebSocket для входящих звонков подключен');
      // Отправляем keep-alive сообщение каждые 30 секунд
      const keepAliveInterval = setInterval(() => {
        if (callsWs.readyState === WebSocket.OPEN) {
          callsWs.send(JSON.stringify({ type: 'keep-alive' }));
        } else {
          clearInterval(keepAliveInterval);
        }
      }, 30000);
    };
    
    callsWs.onclose = () => {
      setIncomingCallWebSocket(null);
    };
    
    callsWs.onerror = (error) => {
      console.error('WebSocket error for incoming calls:', error);
    };

    return () => {
      callsWs.close();
      setIncomingCallWebSocket(null);
    };
  }, [consultationId, user?.id]);

  // Обработка входящих звонков
  useEffect(() => {
    if (!incomingCallWebSocket) return;

    const handleIncomingCallMessage = (event) => {
      try {
        if (!event || !event.data) {
          return;
        }
        
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (parseError) {
          return;
        }
        
        
        if (!data || typeof data !== 'object') {
          return;
        }
        
        if (!data.type) {
          return;
        }
        
        if (data.type === 'incoming_call' && data.call) {
          // Проверяем, не обрабатывали ли мы уже этот звонок
          const callKey = `incoming_${data.call.id}`;
          if (processedCallIds.has(callKey)) {
            return;
          }
          
          setProcessedCallIds(prev => new Set(prev).add(callKey));
          setIncomingCall(data.call);
          setIncomingCallModalOpen(true);
          playNotificationSound();
        } else if (data.type === 'call_accepted') {
          
          // Проверяем дублирование для принятия звонка
          const callKey = `accepted_${data.call_id || data.call?.id}`;
          if (processedCallIds.has(callKey)) {
            return;
          }
          
          setProcessedCallIds(prev => new Set(prev).add(callKey));
          
          // Обновляем состояние звонка и сбрасываем ожидание
          if (data.call) {
            setCurrentCall(data.call);
            setWaitingForAnswer(false);
            setIsCallModalOpen(true);
          } else {
            // Если данных о звонке нет, но уведомление получено, сбрасываем ожидание
            setWaitingForAnswer(false);
          }
          // Дополнительно сбрасываем состояние ожидания
          resetWaitingState();
        } else if (data.type === 'call_ended') {
          console.log('Получено уведомление о завершении звонка:', data);
          // Завершаем звонок локально
          resetCallState();
        } else if (data.type === 'call_rejected') {
          console.log('Получено уведомление об отклонении звонка:', data);
          setIncomingCallModalOpen(false);
          setIncomingCall(null);
          setWaitingForAnswer(false);
        }
      } catch (error) {
        console.error('Error processing incoming call notification:', error);
      }
    };

    incomingCallWebSocket.addEventListener('message', handleIncomingCallMessage);
    
    return () => {
      incomingCallWebSocket.removeEventListener('message', handleIncomingCallMessage);
    };
  }, [incomingCallWebSocket, signalingSocket, stop]);

  // Проверка состояния звонка удалена - теперь используется только в CallButtons

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
    consultation.status === 'active' && // Только в активных консультациях
    (isDoctor || isPatient) &&
    (isDoctor || consultation.message_count < consultation.message_limit);

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Spinner size="lg" color="primary" />
        </div>
      ) : error ? (
        <Card>
          <CardBody className="text-center text-danger py-8">
            <p className="text-xl mb-4">😢 Произошла ошибка</p>
            <p>{error}</p>
            <Button
              color="primary"
              variant="light"
              className="mt-4"
              onPress={() => navigate('/history')}
            >
              {t('backToHistory')}
            </Button>
          </CardBody>
        </Card>
      ) : consultation ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-semibold mb-2">
                {t('consultationNumber')} #{consultation.id}
              </h1>
              <p className="text-gray-600">
                {new Date(consultation.created_at).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Кнопки звонка - показываем только для активных консультаций */}
              {consultation.status === 'active' && (
                <CallButtons
                  consultationId={consultationId}
                  consultation={consultation}
                  onCallInitiated={handleCallInitiated}
                  onCallEnded={handleCallEnded}
                  forceResetCall={forceResetCallButtons}
                />
              )}
              <Button 
                color="primary" 
                variant="light"
                className="hover:bg-primary-100 transition-all duration-300"
                onPress={() => navigate('/history')}
                startContent={<i className="fas fa-arrow-left"></i>}
              >
                {t('toHistory')}
              </Button>
            </div>
          </div>
          
          {/* Кнопка начала консультации для врача */}
          {isDoctor && consultation.status === 'pending' && (
            <Card className="bg-gradient-to-r from-primary-50 to-blue-50 border-none shadow-sm">
              <CardBody className="flex flex-row justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium mb-1">Консультация ожидает начала</h3>
                  <p className="text-sm text-gray-600">
                    Нажмите кнопку, чтобы начать консультацию с пациентом
                  </p>
                </div>
                <Button 
                  color="primary"
                  onPress={startConsultation}
                  className="shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                  startContent={<i className="fas fa-play-circle"></i>}
                >
                  Начать консультацию
                </Button>
              </CardBody>
            </Card>
          )}
          
          {/* Чат консультации */}
          <div className="h-[70vh]">
            <ConsultationChat 
              consultationId={consultationId}
              consultation={consultation}
              onConsultationUpdated={handleConsultationUpdated}
              hasReview={hasReview}
              canSendMessages={canSendMessages}
              isDoctor={isDoctor}
              isPatient={isPatient}
              patientName={patientName}
              doctorName={doctorName}
            />
          </div>
          
          {/* Информация о лимитах сообщений */}
          {isPatient && consultation.status !== 'completed' && (
            <Card className="bg-gray-50 shadow-sm border-none">
              <CardBody>
                <div className="flex items-center gap-2 text-gray-600">
                  <i className="fas fa-info-circle text-primary-500"></i>
                  <p>
                    У вас есть лимит в {consultation.message_limit} сообщений для этой консультации.
                    Используйте их разумно, чтобы получить максимальную пользу от консультации.
                  </p>
                </div>
              </CardBody>
            </Card>
          )}
          
          {/* Форма отзыва - показываем кнопку только если отзыва точно нет */}
          {isPatient && consultation.status === 'completed' && !hasReview && !localStorage.getItem(`review_added_${consultationId}`) && (
            <Card className="bg-gradient-to-r from-warning-50 to-warning-100 border-none shadow-sm animate-pulse">
              <CardBody className="flex flex-row justify-between items-center">
                <div>
                  <h3 className="text-lg font-medium mb-1">Оставьте отзыв о консультации</h3>
                  <p className="text-sm text-gray-600">
                    Ваш отзыв поможет улучшить качество консультаций и поможет другим пациентам
                  </p>
                </div>
                <Button 
                  color="warning"
                  onPress={() => setIsReviewModalOpen(true)}
                  className="shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
                  startContent={<i className="fas fa-star"></i>}
                >
                  Оставить отзыв
                </Button>
              </CardBody>
            </Card>
          )}
        </div>
      ) : (
        <p className="text-center">Консультация не найдена</p>
      )}
      
      {/* Модальное окно для отзыва */}
      <ReviewForm 
        isOpen={isReviewModalOpen} 
        onClose={() => {
          setIsReviewModalOpen(false);
        }} 
        consultationId={consultationId}
        onReviewSubmitted={handleReviewSubmitted}
        doctorName={doctorName}
        doctorAvatar={doctorAvatar}
      />
      {/* Модальное окно звонка */}
      <VideoCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        onEndCall={handleCallEnded}
        onToggleMic={toggleMic}
        onToggleCam={toggleCam}
        micEnabled={micEnabled}
        camEnabled={camEnabled}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        callType={currentCall?.call_type || 'audio'}
        connectionState={connectionState}
        waitingForAnswer={waitingForAnswer}
      />
      
      {/* Модальное окно входящего звонка */}
      <IncomingCallNotification
        call={incomingCall}
        isOpen={incomingCallModalOpen}
        onClose={handleIncomingCallReject}
        onAccept={handleIncomingCallAccept}
        onReject={handleIncomingCallReject}
      />
    </div>
  );
}

export default ConsultationPage; 