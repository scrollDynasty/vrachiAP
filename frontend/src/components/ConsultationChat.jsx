import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Textarea, Spinner, Card, CardBody, CardHeader, Divider, Badge, Chip, Avatar, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, CardFooter } from '@nextui-org/react';
import { toast } from 'react-hot-toast';
import api from '../api';
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
    px-4 py-2 rounded-lg max-w-[70%] 
    ${isMyMessage ? 
      (message.temporary ? 'bg-blue-300' : 'bg-primary') : 
      'bg-gray-100'
    } 
    ${isMyMessage ? 'text-white' : ''}
    transition-all duration-300 ease-in-out
    ${!message.temporary && 'animate-fade-in'}
  `;
  
  return (
    <div className={`flex mb-4 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
      {!isMyMessage && (
        <Avatar src={avatarUrl} className="mr-2" size="sm" />
      )}
      <div className={messageClasses.trim()}>
        <div className="text-sm">{message.content}</div>
        <div className={`text-xs mt-1 flex items-center ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatTime(message.sent_at)}
          {renderMessageStatus()}
        </div>
      </div>
      {isMyMessage && (
        <Avatar src={avatarUrl} className="ml-2" size="sm" />
      )}
    </div>
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

  // Эффект для инициализации чата
  useEffect(() => {
    // Если нет ID консультации или данных консультации, не делаем ничего
    if (!consultationId || !consultation) {
      return;
    }
    
    console.log(`[Chat] Инициализация чата для консультации ${consultationId}, статус: ${consultation.status}`);
    
    // Сбрасываем флаги при инициализации
    isUnmounting.current = false;
    disableReconnect.current = false;
    
    // Инициализируем только WebSocket, без загрузки истории через REST API
    const initializeChat = async () => {
      try {
        setLoading(true);
        
        // Проверяем, инициализировано ли соединение уже
        if (!wsInitializedRef.current) {
          console.log(`[Chat] Создание нового WebSocket соединения для консультации ${consultationId}`);
          
          // Запрашиваем только токен для WebSocket без загрузки истории через REST API
          const wsConnection = await webSocketService.getConsultationConnection(
            consultationId,
            handleWebSocketMessage,
            updateConnectionStatus
          );
          
          if (wsConnection) {
            console.log('[Chat] WebSocket соединение успешно установлено');
            wsInitializedRef.current = true;
            // История будет загружена через WebSocket
          } else {
            console.warn('[WebSocket] Не удалось установить WebSocket соединение');
            toast.error('Ошибка соединения с сервером. Попробуйте обновить страницу.');
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
        toast.error(message, { id: 'connection-error', duration: 3000 });
      }
      // Если есть сохраненные сообщения, показываем уведомление о режиме offline
      if (messages.length > 0) {
        setStatusMessage(`Нет соединения с сервером (Последняя синхронизация: ${new Date().toLocaleTimeString()})`);
      }
    } else if (status === 'connected') {
      setStatusMessage(null);
    } else {
      setStatusMessage('Подключение к серверу...');
    }
  };

  // Завершение консультации - только через WebSocket
  const completeConsultation = async () => {
    setIsCompleteModalOpen(false); // Закрываем модальное окно сразу
    
    // Получаем WebSocket соединение из сервиса
    const wsConnection = await webSocketService.getConsultationConnection(
      consultationId,
      handleWebSocketMessage,
      updateConnectionStatus
    );
    
    // Проверяем соединение WebSocket
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      toast.error('Нет соединения с сервером. Проверьте подключение к интернету.');
      return;
    }
    
    try {
      // Показываем индикатор загрузки
      toast.loading('Завершение консультации...', {id: 'complete-consultation'});
      
      // Отправляем через WebSocket
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
          toast.dismiss('complete-consultation');
          toast.error('Сервер не ответил на запрос завершения консультации. Попробуйте позже.');
          
          reject(new Error('Таймаут при завершении консультации'));
        }, 5000);
        
        // Отправляем запрос на завершение
        wsConnection.send(JSON.stringify({
          type: 'status_update',
          consultation_id: Number(consultationId),
          status: 'completed'
        }));
        
        console.log("[WebSocket] Запрос на завершение консультации отправлен");
      });
      
      // Ждем подтверждения
      await completePromise;
      
      // Успешное завершение
      toast.dismiss('complete-consultation');
      toast.success('Консультация успешно завершена');
      
      // Обновляем данные консультации через колбэк
      if (onConsultationUpdated) {
        onConsultationUpdated();
      }
    } catch (error) {
      toast.dismiss('complete-consultation');
      console.error("Ошибка при завершении консультации:", error);
      toast.error("Ошибка при завершении консультации. Пожалуйста, попробуйте еще раз.");
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
                    });
                  } else {
                    console.warn('[Chat] Функция showReviewModal не найдена');
                  }
                }, 1000);
              }
            }
          }
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

  // Отправка сообщения через WebSocket
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
    
    // Получаем WebSocket соединение из сервиса
    const wsConnection = await webSocketService.getConsultationConnection(
      consultationId,
      handleWebSocketMessage,
      updateConnectionStatus
    );
    
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      try {
        // Отправляем сообщение через WebSocket
        wsConnection.send(JSON.stringify({
          type: 'message',
          content: content.trim(),
          temp_id: tempId
        }));
        
        console.log(`[WebSocket] Сообщение отправлено: ${content.trim()}`);
      } catch (error) {
        console.error('[WebSocket] Ошибка при отправке сообщения:', error);
        toast.error('Не удалось отправить сообщение. Попробуйте еще раз.');
        
        // Удаляем временное сообщение
        setMessages(prevMessages => prevMessages.filter(m => m.id !== tempId));
      }
    } else {
      console.error('[WebSocket] Соединение не установлено');
      toast.error('Соединение с сервером потеряно. Переподключение...');
      
      // Удаляем временное сообщение
      setMessages(prevMessages => prevMessages.filter(m => m.id !== tempId));
    }
    
    // Очищаем поле ввода
    setNewMessage('');
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
    if (!newMessage.trim() || !canSendMessages) return;
    
    try {
      // Отправляем сообщение и получаем результат
      await sendMessage(newMessage);
      
      // Устанавливаем фокус обратно на поле ввода
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    } catch (error) {
      console.error('Ошибка при отправке сообщения:', error);
      // Ошибка уже будет показана в sendMessage
    }
  };

  if (loading || !consultation) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-[70vh] max-h-[700px] w-full bg-white rounded-xl shadow-md mb-6 border border-gray-200">
      <div className="chat-header flex justify-between items-center p-3 bg-blue-50 rounded-t-lg">
        <div className="flex items-center">
          <span className="text-md font-semibold">
            {isDoctor ? `Пациент: ${patientName || 'Неизвестный пациент'}` : `Врач: ${doctorName || 'Неизвестный врач'}`}
          </span>
          <Badge
            color={connectionStatus === 'connected' ? 'success' : connectionStatus === 'connecting' ? 'warning' : 'danger'}
            content={connectionStatus === 'connected' ? 'Онлайн' : connectionStatus === 'connecting' ? 'Подключение...' : 'Оффлайн'}
            placement="bottom-right"
            className="ml-2"
          />
        </div>
        
        {/* Счетчик сообщений для пациента */}
        {isPatient && consultation && (
          <div className={`flex items-center text-sm font-medium ${isMessageLimitReached ? 'bg-red-100 px-2 py-1 rounded animate-pulse' : ''}`}>
            <div className="mr-2">
              Сообщений: <span className={isMessageLimitReached ? 'text-red-600 font-bold' : patientMessageCount > consultation.message_limit * 0.8 ? 'text-orange-500 font-semibold' : ''}>
                {patientMessageCount}/{consultation.message_limit}
              </span>
            </div>
            <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  isMessageLimitReached ? 'bg-red-600' : 
                  messageCountProgress > 90 ? 'bg-red-500' : 
                  messageCountProgress > 75 ? 'bg-orange-500' : 
                  messageCountProgress > 50 ? 'bg-yellow-500' : 
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(messageCountProgress, 100)}%` }}
              ></div>
            </div>
            
            {/* Предупреждение о достижении лимита */}
            {isMessageLimitReached && (
              <div className="ml-2 text-xs text-red-600 font-bold animate-pulse">
                Лимит достигнут!
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-center">
          <Chip
            color={consultation.status === 'active' ? 'success' : consultation.status === 'pending' ? 'warning' : 'default'}
            variant="flat"
            size="sm"
          >
            {consultation.status === 'active' ? 'Активна' : 
             consultation.status === 'pending' ? 'Ожидает' : 
             consultation.status === 'completed' ? 'Завершена' : 'Неизвестно'}
          </Chip>
          
          {isDoctor && consultation.status === 'active' && (
            <Button
              color="danger"
              variant="light"
              size="sm"
              className="ml-2"
              onClick={() => setIsCompleteModalOpen(true)}
            >
              Завершить
            </Button>
          )}
        </div>
      </div>
      
      {/* Статус соединения */}
      {statusMessage && (
        <div className="p-2 bg-yellow-50 border-b border-yellow-100 text-center text-sm">
          <div className="flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-yellow-800">{statusMessage}</span>
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 bg-white" style={{ minHeight: 0 }}>
        {loading ? (
          <div className="flex justify-center py-4">
            <Spinner size="lg" color="primary" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            {consultation.status === 'pending' || consultation.status === 'waiting' 
              ? (isPatient ? 'Ожидается начало консультации врачом' : 'Нажмите "Начать консультацию" для запуска чата')
              : 'Нет сообщений. Начните диалог!'}
          </p>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatMessage 
                key={message.id}
                message={message}
                currentUserId={user?.id}
                patientAvatar={patientAvatar}
                doctorAvatar={doctorAvatar}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>
      <div className="p-4 border-t bg-gray-50 rounded-b-xl sticky bottom-0 z-10">
        {connectionStatus !== 'connected' && (
          <div className={`text-xs mb-2 text-center ${connectionStatus === 'connecting' ? 'text-blue-500' : 'text-red-500'}`}>
            {connectionStatus === 'connecting' 
              ? 'Соединение с сервером...' 
              : 'Нет соединения с сервером'}
            {lastSyncTime && (
              <span className="ml-1">
                (Последняя синхронизация: {new Date(lastSyncTime).toLocaleTimeString()})
              </span>
            )}
          </div>
        )}
        
        {canSendMessages ? (
          <div className="flex w-full gap-2">
            <Input
              fullWidth
              placeholder="Введите сообщение..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={consultation.status === 'completed'}
              ref={textareaRef}
            />
            <Button 
              color="primary"
              onPress={handleSendMessage}
              disabled={consultation.status === 'completed' || !newMessage.trim()}
            >
              Отправить
            </Button>
          </div>
        ) : (
          <p className="text-center w-full text-gray-500">
            {consultation.status === 'completed' 
              ? 'Консультация завершена'
              : isPatient && (consultation.status === 'pending' || consultation.status === 'waiting')
                ? 'Ожидается начало консультации врачом'
                : isPatient && consultation.message_count >= consultation.message_limit
                  ? 'Достигнут лимит сообщений'
                  : 'Отправка сообщений недоступна'}
          </p>
        )}
      </div>
      {/* Модальное окно для подтверждения завершения консультации */}
      <Modal isOpen={isCompleteModalOpen} onClose={() => setIsCompleteModalOpen(false)}>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">Завершение консультации</ModalHeader>
          <ModalBody>
            <p>Вы уверены, что хотите завершить эту консультацию? После завершения дальнейшее общение будет недоступно.</p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setIsCompleteModalOpen(false)}>
              Отмена
            </Button>
            <Button color="danger" onPress={completeConsultation}>
              Завершить
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}

export default ConsultationChat; 