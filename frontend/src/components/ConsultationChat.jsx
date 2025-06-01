import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Textarea, Spinner, Card, CardBody, CardHeader, Divider, Badge, Chip, Avatar, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, CardFooter } from '@nextui-org/react';
import { toast } from 'react-hot-toast';
import api, { consultationsApi } from '../api';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import { useNavigate } from 'react-router-dom';
import webSocketService from '../services/webSocketService';

// Подавляем ошибки 404 для конкретных URL
const suppressedEndpoints = [
  '/api/consultations/*/review',
  '/api/consultations/*/messages/read'
];

// Перехватываем запросы axios для подавления ошибок
const setupApiInterceptors = () => {
  // Не устанавливаем перехватчик, если он уже установлен
  if (api.interceptors.response.handlers.some(h => h.fulfilled && h.fulfilled.name === 'suppressErrorsHandler')) {
    return;
  }
  
  // Устанавливаем перехватчик для подавления 404 ошибок для определенных URL
  api.interceptors.response.use(
    response => response, 
    error => {
      // Проверяем, что ошибка содержит информацию о запросе
      if (error.response && error.response.status === 404 && error.config && error.config.url) {
        // Проверяем, подходит ли URL под маску подавления
        const shouldSuppress = suppressedEndpoints.some(endpoint => {
          const pattern = endpoint.replace('*', '.*');
          const regex = new RegExp(pattern);
          return regex.test(error.config.url);
        });
        
        if (shouldSuppress) {
          console.log(`[API] Подавлена ошибка 404 для ${error.config.url}`);
          // Возвращаем "пустой" успешный ответ
          return Promise.resolve({ 
            status: 200, 
            data: null,
            suppressed: true,
            originalError: { status: 404, message: error.message }
          });
        }
      }
      
      // Для всех остальных ошибок пробрасываем их дальше
      return Promise.reject(error);
    }
  );
};

// Устанавливаем перехватчики при импорте компонента
setupApiInterceptors();

// Вспомогательная функция для безопасного получения значений из localStorage
const getItem = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.error('Ошибка при чтении из localStorage:', e);
    return null;
  }
};

// Компонент сообщения в чате
const ChatMessage = ({ message, currentUserId, patientAvatar, doctorAvatar }) => {
  const isMyMessage = message.sender_id === currentUserId;
  
  // Форматирование времени
  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };
  
  // Выбираем аватарку в зависимости от роли отправителя
  const getAvatarUrl = () => {
    if (message.sender_role === 'doctor') {
      return doctorAvatar || '/assets/doctor-avatar.png';
    } else {
      return patientAvatar || '/assets/patient-avatar.png';
    }
  };
  
  const avatarUrl = getAvatarUrl();
  
  // Определяем статус сообщения для отображения
  const renderMessageStatus = () => {
    if (message.temporary) {
      return <span className="ml-2 text-gray-400 text-xs italic animate-pulse">⏱️ отправляется...</span>;
    } else if (message.is_read && isMyMessage) {
      return <span className="ml-2 text-blue-100">✓</span>;
    }
    return null;
  };
  
  // CSS классы для сообщения в зависимости от статуса
  const messageClasses = `
    px-4 py-3 rounded-2xl shadow-sm max-w-[70%] 
    ${isMyMessage ? 
      (message.temporary ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 'bg-gradient-to-r from-primary-500 to-primary-600') : 
      'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200'
    } 
    ${isMyMessage ? 'text-white' : 'text-gray-800'}
    transition-all duration-300 ease-in-out
    hover:shadow-md
    ${!message.temporary && 'animate-fade-in'}
    ${message.temporary ? 'opacity-80' : 'opacity-100'}
  `;
  
  return (
    <div className={`flex mb-4 ${isMyMessage ? 'justify-end' : 'justify-start'} animate-slide-in`}>
      {!isMyMessage && (
        <Avatar 
          src={avatarUrl} 
          className="mr-2 ring-2 ring-gray-200 ring-offset-2 shadow-sm transition-all duration-300" 
          size="sm" 
        />
      )}
      <div className={messageClasses.trim()}>
        <div className="text-sm font-medium">{message.content}</div>
        <div className={`text-xs mt-1 flex items-center ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatTime(message.sent_at)}
          {renderMessageStatus()}
        </div>
      </div>
      {isMyMessage && (
        <Avatar 
          src={avatarUrl} 
          className="ml-2 ring-2 ring-primary-200 ring-offset-2 shadow-sm transition-all duration-300" 
          size="sm" 
        />
      )}
    </div>
  );
};

// Добавляю компонент с защитным рендерингом для обработки ошибок
const SafeRender = ({ children, fallback }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error) => {
      console.error('[SafeRender] Поймана ошибка:', error);
      setHasError(true);
      return true;
    };

    // Регистрируем глобальный обработчик ошибок
    window.addEventListener('error', errorHandler);
    
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  if (hasError) {
    return fallback || (
      <div className="p-4 bg-danger-50 rounded-lg">
        <p className="text-danger-700">Произошла ошибка при отображении. Попробуйте перезагрузить страницу.</p>
      </div>
    );
  }

  return children;
};

// Функция для безопасного рендеринга анимаций
const SafeStyles = () => {
  return (
    <style>
      {`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes subtle-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        @keyframes message-sent-animation {
          0% { background-color: rgba(59, 130, 246, 0.05); }
          50% { background-color: rgba(59, 130, 246, 0.1); }
          100% { background-color: rgba(59, 130, 246, 0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        .animate-subtle-pulse {
          animation: subtle-pulse 2s infinite;
        }
        
        .message-sent-animation {
          animation: message-sent-animation 0.5s ease-out;
        }
      `}
    </style>
  );
};

// Основной компонент чата
function ConsultationChat({ consultationId, consultation, onConsultationUpdated, canSendMessages, isDoctor, isPatient, patientName, doctorName }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { markAsRead } = useChatStore();
  
  // Состояния компонента
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [hasReview, setHasReview] = useState(false);
  const [patientAvatar, setPatientAvatar] = useState(null);
  const [doctorAvatar, setDoctorAvatar] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [accessToken, setAccessToken] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);
  
  // Дополнительное состояние для отслеживания попыток переподключения
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  // Константы
  const maxReconnectAttempts = 10; // Максимальное число попыток переподключения
  
  // Refs
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const textareaRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageBufferRef = useRef([]);
  
  // Флаги для управления жизненным циклом
  const isUnmounting = useRef(false);  // Флаг для отслеживания размонтирования компонента
  const disableReconnect = useRef(false);  // Флаг для отключения повторных подключений
  const wsInitializedRef = useRef(false); // Флаг для отслеживания инициализации WebSocket
  
  // Получаем счетчик сообщений пациента и лимит
  const patientMessageCount = useMemo(() => {
    if (!messages || !user) return 0;
    return messages.filter(msg => msg.sender_id === user.id).length;
  }, [messages, user]);
  
  // Прогресс заполнения лимита сообщений (в процентах)
  const messageCountProgress = useMemo(() => {
    if (!consultation) return 0;
    return Math.round((patientMessageCount / consultation.message_limit) * 100);
  }, [patientMessageCount, consultation]);

  // Проверка, достигнут ли лимит сообщений
  const isMessageLimitReached = useMemo(() => {
    if (!consultation || !user) return false;
    return patientMessageCount >= consultation.message_limit;
  }, [patientMessageCount, consultation, user]);
  
  // Скролл чата к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Получаем WebSocket-токен с сервера напрямую
  const getWebSocketToken = async () => {
    try {
      console.log('[Chat] Запрос WebSocket токена с сервера');
      
      // Запрашиваем специальный токен для WebSocket соединения
      const response = await api.get('/api/ws-token');
      
      if (response && response.status === 200 && response.data) {
        if (response.data.token) {
          const token = response.data.token;
          console.log('[Chat] WebSocket токен успешно получен с сервера:', token.substring(0, 10) + '...');
          return token;
        } else {
          console.warn('[Chat] API вернул ответ, но токен отсутствует:', response.data);
        }
      } else {
        console.warn('[Chat] Неверный формат ответа при получении WebSocket токена:', response);
      }
      
      return null;
    } catch (error) {
      console.error('[Chat] Ошибка при запросе WebSocket токена:', error);
      return null;
    }
  };

  // Удаляю функцию sendMessageViaREST и упрощаю sendMessage, оставляя только WebSocket
  const sendMessage = async (content) => {
    if (!content.trim() || !consultationId) return;
    
    // Создаем временное сообщение для мгновенного отображения
    const tempId = `temp-${Date.now()}`;
    const temporaryMessage = {
      id: tempId,
      content: content.trim(),
      sender_id: user?.id,
      consultation_id: Number(consultationId),
      sent_at: new Date().toISOString(),
      is_read: false,
      temporary: true
    };
    
    // Добавляем временное сообщение в список мгновенно
    setMessages(prevMessages => [...prevMessages, temporaryMessage]);
    
    // Прокручиваем к новому сообщению сразу
    scrollToBottom();
    
    try {
      // Получаем WebSocket соединение
      const wsConnection = await webSocketService.getConsultationConnection(
        consultationId,
        handleWebSocketMessage,
        updateConnectionStatus
      );
      
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        // Отправляем сообщение через WebSocket
        wsConnection.send(JSON.stringify({
          type: 'message',
          content: content.trim(),
          temp_id: tempId
        }));
        
        console.log(`[WebSocket] Сообщение отправлено: ${content.trim()}`);
      } else {
        console.error('[WebSocket] Соединение не установлено');
        toast.error('Соединение с сервером потеряно. Попробуйте позже.');
        
        // Удаляем временное сообщение
        setMessages(prevMessages => prevMessages.filter(m => m.id !== tempId));
      }
    } catch (error) {
      console.error('[Chat] Ошибка при отправке сообщения:', error);
      toast.error('Не удалось отправить сообщение. Попробуйте еще раз.');
      
      // Удаляем временное сообщение
      setMessages(prevMessages => prevMessages.filter(m => m.id !== tempId));
    }
    
    // Очищаем поле ввода
    setNewMessage('');
  };

  // Инициализация чата - оставляем только WebSocket логику
  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Пробуем загрузить историю сообщений через REST API сразу
      try {
        console.log(`[Chat] Загрузка истории сообщений через REST API для консультации ${consultationId}`);
        const messagesResponse = await api.get(`/api/consultations/${consultationId}/messages`);
        
        if (messagesResponse.data && Array.isArray(messagesResponse.data)) {
          console.log(`[Chat] Получено ${messagesResponse.data.length} сообщений через REST API`);
          
          // Сортируем сообщения по времени
          const sortedMessages = messagesResponse.data.sort((a, b) => {
            return new Date(a.sent_at) - new Date(b.sent_at);
          });
          
          setMessages(sortedMessages);
          
          // Обновляем время последней синхронизации
          setLastSyncTime(new Date());
          
          // Прокручиваем к последнему сообщению после небольшой задержки
          setTimeout(scrollToBottom, 100);
        } else {
          console.log(`[Chat] Не удалось получить сообщения через REST API или список пуст`);
        }
      } catch (restError) {
        console.error(`[Chat] Ошибка при загрузке сообщений через REST API:`, restError);
      }
      
      // Инициализируем WebSocket соединение
      if (!wsInitializedRef.current) {
        console.log(`[Chat] Создание нового WebSocket соединения для консультации ${consultationId}`);
        
        // Запрашиваем токен для WebSocket и создаем соединение
        const wsConnection = await webSocketService.getConsultationConnection(
          consultationId,
          handleWebSocketMessage,
          updateConnectionStatus
        );
        
        if (wsConnection) {
          console.log('[Chat] WebSocket соединение успешно установлено');
          wsInitializedRef.current = true;
        } else {
          console.warn('[WebSocket] Не удалось установить WebSocket соединение');
          toast.error('Не удалось установить соединение с сервером.', {
            id: 'ws-connection-error',
            duration: 4000
          });
          updateConnectionStatus('error', 'Не удалось установить соединение с сервером');
        }
      } else {
        console.log(`[Chat] WebSocket соединение для консультации ${consultationId} уже инициализировано`);
      }
    } catch (error) {
      console.error('[Chat] Ошибка при инициализации чата:', error);
      toast.error('Ошибка при загрузке чата. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  };

  // Эффект для инициализации чата при монтировании
  useEffect(() => {
    // Если нет ID консультации или данных консультации, не делаем ничего
    if (!consultationId || !consultation) {
      return;
    }
    
    console.log(`[Chat] Инициализация чата для консультации ${consultationId}, статус: ${consultation.status}`);
    
    // Сбрасываем флаги при инициализации
    isUnmounting.current = false;
    disableReconnect.current = false;
    
    // Сбрасываем статусное сообщение перед инициализацией
    setStatusMessage(null);
    
    // Запускаем инициализацию
    initializeChat();

    // При размонтировании компонента закрываем WebSocket и очищаем интервалы
    return () => {
      // Устанавливаем флаг размонтирования
      isUnmounting.current = true;
      // Отключаем переподключения
      disableReconnect.current = true;
      wsInitializedRef.current = false;
      
      // Явно закрываем соединение консультации
      if (consultationId) {
        const connectionKey = `consultation_${consultationId}`;
        webSocketService.closeConnection(connectionKey);
      }
    };
  }, [consultationId]); // Зависимость только от consultationId, а не от объекта consultation
  
  // Обработчик WebSocket сообщений
  const handleWebSocketMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Не логируем ping/pong сообщения каждый раз
      if (data.type !== 'pong') {
        console.log('[WebSocket] Получено сообщение:', data.type);
      }
      
      // Если пришло сообщение о добавлении отзыва, сразу обновляем состояние
      if (data.type === 'review_added') {
        console.log('[WebSocket] Получено уведомление о добавлении отзыва');
        setHasReview(true);
        localStorage.setItem(`review_added_${consultationId}`, 'true');
        
        // Показываем уведомление только для пациента
        if (isPatient) {
          toast.success('Ваш отзыв сохранен');
        }
      }
      
      messageHandler(data);
    } catch (error) {
      console.error('[WebSocket] Ошибка разбора сообщения:', error, event.data);
    }
  };

  // Эффект для обновления прокрутки при изменении сообщений
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Эффект для автоматического завершения чата при достижении лимита
  useEffect(() => {
    // Если лимит достигнут, консультация активна, и пользователь - пациент
    if (isMessageLimitReached && consultation?.status === 'active' && isPatient) {
      console.log('[Chat] Лимит сообщений достигнут, запускаем автоматическое завершение');
      
      // Показываем предупреждение
      toast.error(`Достигнут лимит сообщений (${patientMessageCount}/${consultation.message_limit})`, {
        duration: 5000,
        id: 'message-limit-warning'
      });
      
      // Запускаем таймер для завершения консультации
      const timer = setTimeout(() => {
        autoCompleteConsultation();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isMessageLimitReached, consultation, isPatient, consultationId, patientMessageCount]);

  // Эффект для загрузки аватаров пациента и врача
  useEffect(() => {
    const loadUserAvatars = async () => {
      if (!consultation) return;
      
      try {
        console.log('[Chat] Загрузка аватаров пользователей');
        
        // Загружаем аватар врача
        try {
          const doctorResponse = await api.get(`/doctors/${consultation.doctor_id}/profile`);
          if (doctorResponse.data && doctorResponse.data.user && doctorResponse.data.user.avatar_path) {
            console.log('[Chat] Загружен аватар врача:', doctorResponse.data.user.avatar_path);
            setDoctorAvatar(doctorResponse.data.user.avatar_path);
          } else {
            // Пробуем второй вариант без user вложенности
            if (doctorResponse.data && doctorResponse.data.avatar_path) {
              console.log('[Chat] Загружен аватар врача (альтернативный путь):', doctorResponse.data.avatar_path);
              setDoctorAvatar(doctorResponse.data.avatar_path);
            }
          }
        } catch (doctorError) {
          console.error('[Chat] Ошибка при загрузке аватара врача:', doctorError);
        }
        
        // Загружаем аватар пациента
        try {
          const patientResponse = await api.get(`/patients/${consultation.patient_id}/profile`);
          if (patientResponse.data && patientResponse.data.user && patientResponse.data.user.avatar_path) {
            console.log('[Chat] Загружен аватар пациента:', patientResponse.data.user.avatar_path);
            setPatientAvatar(patientResponse.data.user.avatar_path);
          } else {
            // Пробуем второй вариант без user вложенности
            if (patientResponse.data && patientResponse.data.avatar_path) {
              console.log('[Chat] Загружен аватар пациента (альтернативный путь):', patientResponse.data.avatar_path);
              setPatientAvatar(patientResponse.data.avatar_path);
            }
          }
        } catch (patientError) {
          console.error('[Chat] Ошибка при загрузке аватара пациента:', patientError);
        }
        
      } catch (error) {
        console.error('[Chat] Ошибка при загрузке аватаров:', error);
      }
    };
    
    loadUserAvatars();
  }, [consultation]);

  // Функция для проверки статуса соединения и обновления UI
  const updateConnectionStatus = (status, message = null) => {
    setConnectionStatus(status);
    
    if (status === 'disconnected' || status === 'error') {
      if (message) {
        // Показываем toast только при первоначальной ошибке подключения и только один раз
        const toastId = 'connection-error';
        if (messages.length === 0) {
          toast.error(message, { id: toastId, duration: 3000 });
        }
      }
      
      // Если есть сообщения, показываем уведомление о кеше, но не об ошибке соединения
      if (messages.length > 0) {
        setStatusMessage(`Сообщения загружены из кэша`);
      } else {
        // Устанавливаем статусное сообщение только если оно еще не установлено,
        // чтобы избежать дублирования
        if (!statusMessage) {
          setStatusMessage('Не удалось подключиться к серверу');
        }
      }
    } else if (status === 'connected') {
      setStatusMessage(null);
    } else if (status === 'connecting' && !statusMessage) {
      setStatusMessage('Подключение к серверу...');
    }
  };

  // Завершение консультации - только через WebSocket
  const completeConsultation = async () => {
    setIsCompleteModalOpen(false); // Закрываем модальное окно сразу
    
    // Показываем индикатор загрузки
    toast.loading('Завершение консультации...', {id: 'complete-consultation'});
    
    try {
      // Сначала пробуем через WebSocket
      console.log("[Chat] Запускаем завершение консультации");
      
      // Получаем WebSocket соединение из сервиса
      const wsConnection = await webSocketService.getConsultationConnection(
        consultationId,
        handleWebSocketMessage,
        updateConnectionStatus
      );
      
      // Проверяем соединение WebSocket
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        console.log("[Chat] WebSocket соединение активно, отправляем запрос на завершение");
        
        // Отправляем запрос на завершение через WebSocket
        wsConnection.send(JSON.stringify({
          type: 'status_update',
          consultation_id: Number(consultationId),
          status: 'completed'
        }));
        
        // Запускаем таймер для запасного варианта через HTTP API
        const fallbackTimer = setTimeout(async () => {
          console.log("[Chat] Сработал таймаут WebSocket, пробуем HTTP API");
          
          try {
            // Пробуем завершить через HTTP API
            const result = await consultationsApi.completeConsultation(consultationId);
            
            toast.dismiss('complete-consultation');
            toast.success('Консультация успешно завершена');
            
            // Обновляем данные консультации через колбэк
            if (onConsultationUpdated) {
              onConsultationUpdated(result);
            }
          } catch (apiError) {
            console.error("[Chat] Не удалось завершить консультацию через HTTP API:", apiError);
            toast.dismiss('complete-consultation');
            toast.error('Не удалось завершить консультацию. Пожалуйста, обновите страницу и попробуйте еще раз.');
          }
        }, 5000); // 5 секунд таймаут для WebSocket
        
        // Ждем ответа от сервера о смене статуса
        const statusUpdateListener = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Если получили обновление статуса и консультация завершена
            if (data.type === 'status_update' && 
                data.consultation && 
                data.consultation.id === Number(consultationId) &&
                data.consultation.status === 'completed') {
              
              // Очищаем слушатель и таймер
              wsConnection.removeEventListener('message', statusUpdateListener);
              clearTimeout(fallbackTimer);
              
              // Обновляем UI
              toast.dismiss('complete-consultation');
              toast.success('Консультация успешно завершена');
              
              // Обновляем данные консультации через колбэк
              if (onConsultationUpdated) {
                onConsultationUpdated(data.consultation);
              }
            }
          } catch (e) {
            console.error('[Chat] Ошибка при обработке сообщения WebSocket:', e);
          }
        };
        
        // Добавляем временный слушатель для обработки ответа о смене статуса
        wsConnection.addEventListener('message', statusUpdateListener);
        
        // Возвращаемся здесь, ожидая, что ответ придет асинхронно
        return;
      } else {
        // Если WebSocket не работает, сразу пробуем через HTTP
        console.log("[Chat] WebSocket соединение не активно, пробуем HTTP API");
        
        // Пробуем завершить через HTTP API
        const result = await consultationsApi.completeConsultation(consultationId);
        
        toast.dismiss('complete-consultation');
        toast.success('Консультация успешно завершена');
        
        // Обновляем данные консультации через колбэк
        if (onConsultationUpdated) {
          onConsultationUpdated(result);
        }
      }
    } catch (error) {
      console.error("[Chat] Ошибка при завершении консультации:", error);
      toast.dismiss('complete-consultation');
      toast.error('Не удалось завершить консультацию. Пожалуйста, попробуйте еще раз.');
    }
  };

  // Функция для автоматического завершения консультации
  const autoCompleteConsultation = async () => {
    // Проверяем, что консультация активна
    if (!consultation || consultation.status !== 'active') {
      return;
    }
    
    console.log('[Chat] Выполняем автоматическое завершение консультации');
    
    // Показываем уведомление
    toast.loading('Завершение консультации...', {id: 'auto-complete-consultation'});
    
    // Получаем WebSocket соединение из сервиса
    const wsConnection = await webSocketService.getConsultationConnection(
      consultationId,
      handleWebSocketMessage,
      updateConnectionStatus
    );
    
    // Проверяем WebSocket соединение
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      console.error('[Chat] Нет соединения WebSocket для завершения консультации');
      toast.error('Нет соединения с сервером. Попробуйте позже.', {id: 'auto-complete-consultation'});
      return;
    }
    
    // Создаем Promise, который разрешится при получении подтверждения
    const completePromise = new Promise((resolve, reject) => {
      // Обработчик для получения подтверждения
      const statusHandler = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Если это обновление статуса консультации
          if (data.type === 'status_update' && data.consultation && 
              data.consultation.id === Number(consultationId) && 
              data.consultation.status === 'completed') {
            
            // Удаляем этот обработчик
            wsConnection.removeEventListener('message', statusHandler);
            
            // Отменяем таймаут
            clearTimeout(timeoutId);
            
            // Разрешаем Promise
            resolve(data.consultation);
          }
        } catch (e) {
          console.error('[WebSocket] Ошибка при обработке ответа на завершение консультации:', e);
        }
      };
      
      // Добавляем обработчик
      wsConnection.addEventListener('message', statusHandler);
      
      // Устанавливаем таймаут
      const timeoutId = setTimeout(() => {
        // Удаляем обработчик
        wsConnection.removeEventListener('message', statusHandler);
        
        // Показываем ошибку
        toast.error('Не удалось автоматически завершить консультацию. Обратитесь к врачу.', {id: 'auto-complete-consultation'});
        
        reject(new Error('Таймаут при завершении консультации'));
      }, 5000);
      
      // Отправляем запрос на завершение через WebSocket
      wsConnection.send(JSON.stringify({
        type: 'status_update',
        status: 'completed',
        consultation_id: Number(consultationId),
        auto_completed: true,
        reason: 'Достигнут лимит сообщений'
      }));
      
      console.log("[WebSocket] Запрос на автоматическое завершение консультации отправлен");
    });
    
    // Обрабатываем результат
    completePromise
      .then(() => {
        toast.dismiss('auto-complete-consultation');
        toast.success('Консультация автоматически завершена из-за достижения лимита сообщений', { duration: 5000 });
        
        // Обновляем данные консультации через колбэк
        if (onConsultationUpdated) {
          onConsultationUpdated({
            ...consultation,
            status: 'completed',
            completed_at: new Date().toISOString()
          });
        }
      })
      .catch((error) => {
        console.error("[Chat] Ошибка при автоматическом завершении консультации:", error);
      });
  };

  // Предотвращение частого разрыва соединения
  useEffect(() => {
    // Если соединение установлено, сбрасываем счетчик попыток
    if (connectionStatus === 'connected') {
      setReconnectAttempts(0);
    }
    
    // Логируем изменение статуса соединения
    console.log(`[WebSocket] Статус соединения изменился: ${connectionStatus}`);
  }, [connectionStatus]);
  
  // Проверка здоровья WebSocket соединения
  useEffect(() => {
    // Если нет соединения или страница неактивна, выходим
    if (!socketRef.current || document.visibilityState === 'hidden') {
      return;
    }
    
    // Если соединение установлено, проверяем его каждые 15 секунд
    const healthCheckInterval = setInterval(() => {
      const now = new Date();
      
      // Если последний пинг был более 40 секунд назад или соединение не в состоянии OPEN
      if ((lastSyncTime && now - lastSyncTime > 40000) || 
          (socketRef.current && socketRef.current.readyState !== WebSocket.OPEN)) {
        
        console.log('[WebSocket] Проверка здоровья соединения: соединение не активно');
        
        // Если соединение всё ещё существует, но не в состоянии OPEN, закрываем его
        if (socketRef.current && socketRef.current.readyState !== WebSocket.OPEN) {
          try {
            socketRef.current.close(3000, 'Закрыто проверкой здоровья');
          } catch (error) {
            console.warn('[WebSocket] Ошибка при закрытии неактивного соединения:', error);
          }
        }
        
        // Устанавливаем статус соединения как отключено
        setConnectionStatus('disconnected');
        
        // Запускаем процесс переподключения
        scheduleReconnect();
      } else {
        console.log('[WebSocket] Проверка здоровья соединения: соединение активно');
        
        // Отправляем пинг для проверки соединения
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          try {
            socketRef.current.send(JSON.stringify({ type: 'ping' }));
            console.log('[WebSocket] Отправлен ping в рамках проверки здоровья');
          } catch (error) {
            console.error('[WebSocket] Ошибка при отправке ping:', error);
            setConnectionStatus('disconnected');
            scheduleReconnect();
          }
        }
      }
    }, 15000);
    
    // Очистка интервала при размонтировании
    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [socketRef.current, lastSyncTime]);

  // Улучшенная функция обработки сообщений от WebSocket
  const messageHandler = (data) => {
    try {
      // Обработка разных типов сообщений
      switch (data.type) {
        case 'pong':
          // Обновляем время последнего пинга
          setLastSyncTime(new Date());
          console.log('[WebSocket] Ping успешен, соединение активно');
          break;
          
        case 'message':
          // Получено новое сообщение
          const newMessage = data.message;
          console.log('[WebSocket] Получено новое сообщение');
          
          // Проверяем, не заменяет ли это сообщение временное
          if (data.temp_id) {
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === data.temp_id ? { ...newMessage, id: newMessage.id } : msg
              )
            );
          } else {
            // Добавляем новое сообщение, если его еще нет
            setMessages(prevMessages => {
              // Проверяем, нет ли уже такого сообщения
              const exists = prevMessages.some(msg => msg.id === newMessage.id);
              if (!exists) {
                return [...prevMessages, newMessage];
              }
              return prevMessages;
            });
          }
          
          // Обновляем время последней синхронизации
          setLastSyncTime(new Date());
          
          // Проверяем достижение лимита сообщений
          if (consultation && isPatient && newMessage.sender_id === user?.id) {
            // Подсчитываем сообщения от пациента
            const patientMessageCount = messages.filter(m => m.sender_id === user?.id).length + 1;
            
            console.log(`[Chat] Сообщений от пациента: ${patientMessageCount}/${consultation.message_limit}`);
            
            // Если достигнут лимит сообщений, автоматически завершаем консультацию
            if (patientMessageCount >= consultation.message_limit && consultation.status === 'active') {
              console.log('[Chat] Достигнут лимит сообщений. Автоматическое завершение консультации.');
              
              // Показываем предупреждение
              toast.error('Достигнут лимит сообщений. Консультация будет завершена.', {
                duration: 5000,
                icon: '⚠️'
              });
              
              // Отложенно запускаем завершение консультации
              setTimeout(() => {
                autoCompleteConsultation();
              }, 3000);
            }
          }
          
          // Прокручиваем к новому сообщению
          scrollToBottom();
          break;
          
        case 'messages_history':
        case 'messages_bulk':
          // Получена история сообщений
          const receivedMessages = data.messages || [];
          console.log(`[WebSocket] Получена история сообщений: ${receivedMessages.length} сообщений`);
          
          if (receivedMessages.length > 0) {
            // Сортируем сообщения по времени
            const sortedMessages = receivedMessages.sort((a, b) => {
              return new Date(a.sent_at) - new Date(b.sent_at);
            });
            
            setMessages(sortedMessages);
            
            // Обновляем время последней синхронизации
            setLastSyncTime(new Date());
            
            // Прокручиваем к последнему сообщению после небольшой задержки
            setTimeout(scrollToBottom, 100);
          }
          break;
          
        case 'read_receipt':
          // Сообщение прочитано
          const messageId = data.message_id;
          console.log('[WebSocket] Сообщение отмечено как прочитанное:', messageId);
          
          // Обновляем статус прочтения в сообщениях
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === messageId ? { ...msg, is_read: true } : msg
            )
          );
          break;
          
        case 'status_update':
          // Обновление статуса консультации
          console.log('[WebSocket] Обновление статуса консультации:', data.consultation?.status);
          
          if (data.consultation && data.consultation.status) {
            // Обновляем статус консультации в родительском компоненте
            if (onConsultationUpdated) {
              onConsultationUpdated({
                ...consultation,
                status: data.consultation.status,
                completed_at: data.consultation.completed_at
              });
            }
            
            // Если консультация завершена, показываем уведомление
            if (data.consultation.status === 'completed') {
              toast.success('Консультация успешно завершена', {id: 'complete-consultation'});
              
              // Если это пациент, показываем модальное окно отзыва через 1 секунду
              if (isPatient) {
                setTimeout(() => {
                  // Проверяем, существует ли функция showReviewModal
                  if (window.showReviewModal) {
                    console.log('[Chat] Показываем модальное окно отзыва после завершения консультации');
                    window.showReviewModal((success) => {
                      console.log('[Chat] Результат отправки отзыва:', success ? 'успешно' : 'неудачно');
                      // Если отзыв успешно отправлен, обновляем статус
                      if (success) {
                        setHasReview(true);
                        // Сохраняем информацию об отправке отзыва в localStorage
                        localStorage.setItem(`review_added_${consultationId}`, 'true');
                      }
                    });
                  } else {
                    console.warn('[Chat] Функция showReviewModal не найдена');
                  }
                }, 1000);
              }
            }
          }
          break;
          
        case 'review_added':
          // Получено уведомление о добавлении отзыва
          console.log('[WebSocket] Получено уведомление о добавлении отзыва для консультации:', data.consultation_id || consultationId);
          
          // Обновляем статус отзыва (данный код дублирует логику в handleWebSocketMessage, но оставляем для надежности)
          setHasReview(true);
          
          // Сохраняем информацию в localStorage для сохранения между сессиями
          localStorage.setItem(`review_added_${consultationId}`, 'true');
          break;
          
        case 'consultation_data':
          // Получены полные данные консультации
          console.log('[WebSocket] Получены полные данные консультации');
          
          // Устанавливаем сообщения из bulk-ответа
          if (data.messages && Array.isArray(data.messages)) {
            const sortedMessages = data.messages.sort((a, b) => {
              return new Date(a.sent_at) - new Date(b.sent_at);
            });
            
            console.log(`[WebSocket] Получено ${sortedMessages.length} сообщений из bulk-ответа`);
            setMessages(sortedMessages);
            
            // Обновляем время последней синхронизации
            setLastSyncTime(new Date());
            
            setTimeout(scrollToBottom, 100);
          }
          
          // Обновляем информацию о консультации, если нужно
          if (data.consultation && onConsultationUpdated) {
            onConsultationUpdated(data.consultation);
          }
          break;
          
        case 'error':
          // Сообщение об ошибке от сервера
          console.error('[WebSocket] Ошибка от сервера:', data.message);
          toast.error(data.message || 'Произошла ошибка на сервере');
          break;
          
        default:
          console.log('[WebSocket] Получено сообщение другого типа:', data.type);
      }
    } catch (error) {
      console.error('[WebSocket] Ошибка при обработке сообщения:', error);
    }
  };

  // Функция для планирования переподключения с экспоненциальной задержкой
  const scheduleReconnect = () => {
    // Если отключены переподключения или компонент размонтирован - не пытаемся переподключаться
    if (disableReconnect.current || isUnmounting.current) {
      console.log('[WebSocket] Переподключение отменено: компонент размонтирован или переподключение отключено');
      return;
    }
    
    // Увеличиваем счетчик попыток переподключения
    setReconnectAttempts(prev => {
      const newCount = prev + 1;
      console.log(`[WebSocket] Запланировано переподключение (попытка ${newCount})`);
      
      // Экспоненциальная задержка с верхним пределом 2 минуты
      // Base * 2^attempt с ограничением максимума
      const baseDelay = 1000; // 1 секунда базовой задержки
      const maxDelay = 120000; // 2 минуты максимальной задержки
      
      // Рассчитываем задержку с небольшим случайным смещением (±10%)
      const exponentialDelay = Math.min(baseDelay * Math.pow(1.5, newCount), maxDelay);
      const jitter = (Math.random() * 0.2 - 0.1) * exponentialDelay; // ±10% случайное смещение
      const delay = Math.round(exponentialDelay + jitter);
      
      console.log(`[WebSocket] Задержка перед следующей попыткой: ${delay}ms`);
      
      // Если максимальное количество попыток не достигнуто - планируем переподключение
      if (newCount <= maxReconnectAttempts) {
        // Очищаем предыдущий таймер переподключения
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Устанавливаем новый таймер
        reconnectTimeoutRef.current = setTimeout(() => {
          // Проверяем, что компонент не размонтирован и переподключение не отключено
          if (!isUnmounting.current && !disableReconnect.current) {
            console.log(`[WebSocket] Выполняем попытку переподключения ${newCount}`);
            initWebSocket();
          } else {
            console.log('[WebSocket] Переподключение отменено: компонент размонтирован или переподключение отключено');
          }
        }, delay);
      } else {
        console.warn(`[WebSocket] Достигнуто максимальное количество попыток переподключения (${maxReconnectAttempts})`);
        updateConnectionStatus('error', 'Превышено количество попыток подключения. Пожалуйста, обновите страницу.');
        disableReconnect.current = true;
      }
      
      return newCount;
    });
  };

  // Отметка всех сообщений в консультации как прочитанных
  const markAllMessages = async () => {
    if (!consultationId || !user?.id) return;
    
    const wsConnection = await webSocketService.getConsultationConnection(
      consultationId,
      handleWebSocketMessage,
      updateConnectionStatus
    );
    
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      try {
        console.log('[WebSocket] Отправка запроса на пометку всех сообщений как прочитанных');
        wsConnection.send(JSON.stringify({
          type: 'mark_read'
        }));
      } catch (error) {
        console.error('[WebSocket] Ошибка при отправке пометки прочтения:', error);
      }
    }
  };

  // Отметка сообщения как прочитанного через WebSocket
  const markMessageReadViaREST = async (messageId) => {
    const wsConnection = await webSocketService.getConsultationConnection(
      consultationId,
      handleWebSocketMessage,
      updateConnectionStatus
    );
    
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      try {
        wsConnection.send(JSON.stringify({
          type: 'read_receipt',
          message_id: messageId
        }));
        
        // Обновляем состояние сообщений сразу
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === messageId ? { ...msg, is_read: true } : msg
          )
        );
      } catch (error) {
        console.error('[WebSocket] Ошибка при отправке статуса прочтения:', error);
      }
    }
  };

  // Обработчик клавиш в поле ввода (отправка по Enter)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Обработка отправки сообщения
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    // Очищаем поле ввода
    const messageText = newMessage;
    setNewMessage('');
    
    // Фокусируемся на текстовом поле для продолжения ввода
    textareaRef.current?.focus();
    
    // Анимация отправки
    try {
      await sendMessage(messageText);
      
      // Добавляем анимацию при успешной отправке
      const chatContainer = document.querySelector('.chat-messages-container');
      if (chatContainer) {
        chatContainer.classList.add('message-sent-animation');
        setTimeout(() => {
          chatContainer.classList.remove('message-sent-animation');
        }, 500);
      }
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      toast.error('Не удалось отправить сообщение');
      
      // Возвращаем текст в поле ввода при ошибке
      setNewMessage(messageText);
    }
  };

  // Обработка ошибок рендеринга
  const [renderError, setRenderError] = useState(null);
  
  // Проверяем наличие отзыва в localStorage при монтировании компонента
  useEffect(() => {
    const checkReviewInStorage = () => {
      try {
        // Проверяем общий список отзывов
        const reviewsFromStorage = localStorage.getItem('consultation_reviews');
        if (reviewsFromStorage) {
          const reviews = JSON.parse(reviewsFromStorage);
          // Если есть отзыв для текущей консультации
          if (reviews && reviews[consultationId]) {
            console.log('[Chat] Найден отзыв в localStorage для консультации', consultationId);
            setHasReview(true);
            return;
          }
        }
        
        // Проверяем ключ review_added в localStorage (новый формат)
        const reviewAddedKey = `review_added_${consultationId}`;
        if (localStorage.getItem(reviewAddedKey) === 'true') {
          console.log('[Chat] Найден отзыв в localStorage (новый формат) для консультации', consultationId);
          setHasReview(true);
          return;
        }
        
        // Проверяем также отдельный ключ для текущей консультации (для обратной совместимости)
        const reviewKey = `consultation_${consultationId}_review`;
        const reviewData = localStorage.getItem(reviewKey);
        if (reviewData) {
          console.log('[Chat] Найден отзыв в localStorage (старый формат) для консультации', consultationId);
          setHasReview(true);
        }
      } catch (e) {
        console.error('[Chat] Ошибка при проверке наличия отзыва:', e);
      }
    };
    
    // Проверяем наличие отзыва при монтировании
    checkReviewInStorage();
  }, [consultationId]);
  
  try {
    if (renderError) {
      return (
        <div className="flex flex-col justify-center items-center h-full p-5 bg-danger-50 rounded-lg">
          <div className="mb-3 text-danger">
            <i className="fas fa-exclamation-triangle text-3xl"></i>
          </div>
          <h3 className="text-xl font-medium mb-2">Ошибка отображения чата</h3>
          <p className="text-gray-600 text-center mb-4">{renderError.message || 'Произошла неизвестная ошибка'}</p>
          <Button 
            color="primary" 
            onClick={() => window.location.reload()}
          >
            Перезагрузить страницу
          </Button>
        </div>
      );
    }
    
    if (loading || !consultation) {
      return (
        <div className="h-full flex flex-col justify-center items-center bg-white rounded-lg p-6">
          <Spinner size="lg" color="primary" />
          <p className="mt-4 text-gray-600">Загрузка чата...</p>
          <p className="text-xs text-gray-400 mt-2">Если загрузка занимает слишком много времени, попробуйте обновить страницу</p>
        </div>
      );
    }
    
    return (
      <SafeRender
        fallback={
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center w-full">
                <h3 className="text-lg">Чат консультации</h3>
                <Button 
                  color="primary" 
                  size="sm" 
                  onPress={() => window.location.reload()}
                >
                  Перезагрузить
                </Button>
              </div>
            </CardHeader>
            <CardBody className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <div className="text-danger mb-3">
                  <i className="fas fa-exclamation-triangle text-3xl"></i>
                </div>
                <h3 className="text-xl mb-2">Ошибка отображения чата</h3>
                <p className="text-gray-600 mb-4">Произошла неожиданная ошибка при загрузке чата</p>
              </div>
            </CardBody>
          </Card>
        }
      >
        <Card className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white shadow-lg border-none overflow-hidden">
          <CardHeader className="px-4 py-3 flex justify-between items-center bg-gradient-to-r from-primary-50 to-blue-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary-100 p-2 mr-3">
                {isDoctor ? (
                  <i className="fas fa-user-md text-primary-500"></i>
                ) : (
                  <i className="fas fa-stethoscope text-primary-500"></i>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">
                  {isDoctor ? patientName : doctorName}
                </h3>
                <div className="flex items-center">
                  <Badge 
                    color={consultation?.status === 'active' ? 'success' : 
                          consultation?.status === 'completed' ? 'default' : 'warning'} 
                    variant="flat"
                    className="mr-2"
                  >
                    {consultation?.status === 'active' ? 'Активна' : 
                      consultation?.status === 'completed' ? 'Завершена' : 'Ожидание'}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Индикатор статуса соединения */}
            {statusMessage && connectionStatus !== 'connected' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm animate-fade-in">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-gray-600">{statusMessage}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {/* Кнопка отзыва - показываем только если консультация завершена, пользователь - пациент и отзыв еще НЕ оставлен */}
              {isPatient && consultation?.status === 'completed' && !hasReview && (
                <Button 
                  size="sm" 
                  color="warning" 
                  variant="flat"
                  className="animate-pulse hover:animate-none transition-all duration-300"
                  onPress={() => {
                    if (window.showReviewModal) {
                      window.showReviewModal();
                    } else {
                      toast.error('Не удалось открыть форму отзыва');
                    }
                  }}
                >
                  Оставить отзыв
                </Button>
              )}
              
              {isDoctor && consultation?.status === 'active' && (
                <Button 
                  size="sm" 
                  color="danger" 
                  variant="light"
                  className="hover:bg-danger-100 transition-all duration-300"
                  onPress={() => {
                    console.log('[Chat] Нажата кнопка "Завершить"');
                    console.log('[Chat] Текущий статус модального окна:', isCompleteModalOpen);
                    setIsCompleteModalOpen(true);
                    console.log('[Chat] Новый статус модального окна:', true);
                  }}
                >
                  Завершить
                </Button>
              )}
              
              <Button 
                size="sm" 
                color="primary" 
                variant="light"
                isIconOnly
                aria-label="Обновить чат"
                onPress={initializeChat}
                className="rounded-full"
              >
                <i className="fas fa-sync-alt"></i>
              </Button>
            </div>
          </CardHeader>
          
          <CardBody className="p-0 flex-grow flex flex-col overflow-hidden">
            {isPatient && consultation?.message_limit > 0 && (
              <div className="px-4 py-2 bg-default-50 border-b border-default-100">
                <div className="flex justify-between items-center text-xs text-default-600 mb-1">
                  <span>Лимит сообщений: {patientMessageCount} из {consultation.message_limit}</span>
                  <span>{messageCountProgress}%</span>
                </div>
                <div className="w-full bg-default-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      messageCountProgress > 80 ? 'bg-danger-500' : 
                      messageCountProgress > 60 ? 'bg-warning-500' : 'bg-success-500'
                    }`}
                    style={{ width: `${messageCountProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {loading ? (
              <div className="flex-grow flex items-center justify-center p-4">
                <Spinner label="Загрузка сообщений..." color="primary" labelColor="primary" />
              </div>
            ) : (
              <>
                <div className="flex-grow overflow-y-auto p-4 chat-messages-container bg-gray-50 bg-opacity-50">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
                      <div className="w-20 h-20 mb-4 flex items-center justify-center rounded-full bg-gray-100">
                        <i className="fas fa-comments text-2xl text-gray-400"></i>
                      </div>
                      <p className="text-lg mb-2">Нет сообщений</p>
                      <p className="text-sm">
                        {canSendMessages ? 
                          'Начните диалог, отправив первое сообщение' : 
                          'Дождитесь начала консультации'}
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <ChatMessage
                          key={message.id || `temp-${index}`}
                          message={message}
                          currentUserId={user?.id}
                          patientAvatar={patientAvatar}
                          doctorAvatar={doctorAvatar}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
                
                <div className="p-4 border-t border-gray-100 bg-white relative">
                  {statusMessage && connectionStatus !== 'connected' && (
                    <div className="absolute -top-8 left-0 right-0 mx-auto w-max px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs animate-fade-in shadow-sm">
                      {statusMessage}
                    </div>
                  )}
                  
                  <div className="flex items-end gap-2">
                    <Textarea
                      ref={textareaRef}
                      fullWidth
                      placeholder={
                        !canSendMessages ? "Отправка сообщений недоступна" :
                        isMessageLimitReached ? "Достигнут лимит сообщений" :
                        "Введите сообщение..."
                      }
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={!canSendMessages || isMessageLimitReached}
                      minRows={1}
                      maxRows={4}
                      className={`transition-all duration-300 ${!canSendMessages ? 'opacity-50' : 'hover:border-primary-300 focus:border-primary-500'}`}
                    />
                    <Button
                      color="primary"
                      isIconOnly
                      size="lg"
                      className={`min-w-12 h-12 shadow-md hover:shadow-lg transition-all duration-300 ${
                        !canSendMessages || !newMessage.trim() ? 'opacity-50' : 'animate-subtle-pulse'
                      }`}
                      onPress={handleSendMessage}
                      disabled={!canSendMessages || !newMessage.trim() || isMessageLimitReached}
                    >
                      <i className="fas fa-paper-plane"></i>
                    </Button>
                  </div>
                  
                  {isMessageLimitReached && (
                    <div className="mt-2 text-center text-xs text-danger-500 animate-pulse">
                      <i className="fas fa-exclamation-circle mr-1"></i>
                      Вы достигли лимита сообщений для этой консультации
                    </div>
                  )}
                </div>
              </>
            )}
          </CardBody>
          
          <SafeStyles />
        </Card>
        
        {/* Модальное окно подтверждения завершения консультации */}
        <Modal 
          isOpen={isCompleteModalOpen} 
          onClose={() => {
            console.log('[Chat] Закрытие модального окна без завершения консультации');
            setIsCompleteModalOpen(false);
          }}
          className="z-50"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              Завершение консультации
            </ModalHeader>
            <ModalBody>
              <p>
                Вы уверены, что хотите завершить консультацию? 
                После завершения отправка сообщений будет недоступна.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Пациент получит возможность оставить отзыв о консультации.
              </p>
            </ModalBody>
            <ModalFooter>
              <Button 
                color="default" 
                variant="light" 
                onPress={() => {
                  console.log('[Chat] Отмена завершения консультации');
                  setIsCompleteModalOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button 
                color="danger" 
                onPress={() => {
                  console.log('[Chat] Подтверждение завершения консультации');
                  completeConsultation();
                }}
              >
                Завершить
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </SafeRender>
    );
  } catch (error) {
    console.error('[Chat] Ошибка при рендеринге компонента:', error);
    // Сохраняем ошибку в состоянии для следующего рендера
    setRenderError(error);
    
    // Отображаем минимальную заглушку в случае ошибки
    return (
      <div className="flex justify-center items-center h-64 bg-danger-50 rounded-lg">
        <div className="text-center p-5">
          <div className="mb-3 text-danger">
            <i className="fas fa-exclamation-triangle text-3xl"></i>
          </div>
          <p className="text-gray-700">Ошибка отображения чата</p>
          <Button 
            color="primary" 
            size="sm"
            className="mt-3"
            onClick={() => window.location.reload()}
          >
            Перезагрузить
          </Button>
        </div>
      </div>
    );
  }
}

export default ConsultationChat; 