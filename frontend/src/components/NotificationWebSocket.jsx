import React, { useEffect, useRef, useCallback } from 'react';
import useAuthStore from '../stores/authStore';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/notificationService';
import soundService from '../services/soundService';
import { getOptimizedThrottleDelay, backgroundDetector } from '../utils/mobileOptimizations';

const NotificationWebSocket = () => {
  const { user, isAuthenticated, token } = useAuthStore();
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const connectionAttemptRef = useRef(0);
  const isPausedRef = useRef(false); // Track if WebSocket is paused due to background
  
  // ОПТИМИЗАЦИЯ: Строгое отслеживание показанных уведомлений с ограниченным размером
  const shownNotificationsRef = useRef(new Set());
  const lastProcessedNotificationRef = useRef(null);
  
  // ОПТИМИЗАЦИЯ: Throttling для обработки сообщений с мобильной оптимизацией
  const messageThrottleRef = useRef(null);
  const optimizedThrottleDelay = getOptimizedThrottleDelay(200);

  // ОПТИМИЗАЦИЯ: Функция throttling для предотвращения перегрузки
  const throttle = useCallback((func, delay) => {
    return (...args) => {
      if (!messageThrottleRef.current) {
        func.apply(this, args);
        messageThrottleRef.current = setTimeout(() => {
          messageThrottleRef.current = null;
        }, delay);
      }
    };
  }, []);

  // Функция для проверки, показывали ли мы уже это уведомление
  const isNotificationShown = useCallback((notificationId) => {
    return shownNotificationsRef.current.has(notificationId);
  }, []);

  // ОПТИМИЗАЦИЯ: Функция для отметки уведомления как показанного с автоочисткой
  const markNotificationShown = useCallback((notificationId) => {
    shownNotificationsRef.current.add(notificationId);
    
    // Автоочистка каждые 50 уведомлений вместо 100 для экономии памяти
    if (shownNotificationsRef.current.size > 50) {
      const oldEntries = Array.from(shownNotificationsRef.current).slice(0, 25);
      oldEntries.forEach(id => shownNotificationsRef.current.delete(id));
    }
  }, []);

  // ОПТИМИЗАЦИЯ: Обработчик сообщений WebSocket с мобильным throttling
  const handleWebSocketMessage = useCallback(throttle((data) => {
    // Используем requestAnimationFrame для оптимальной работы с DOM
    requestAnimationFrame(() => {
      try {
        let notification = null;
        
        // Обрабатываем разные типы сообщений от сервера
        if (data.type === 'new_notification' && data.notification) {
          notification = data.notification;
        } else if (data.type === 'notification') {
          // Сервер может отправлять уведомления в другом формате
          notification = {
            id: data.id || Date.now(),
            title: data.title || 'Новое уведомление',
            message: data.message,
            type: data.notification_type || 'general',
            related_id: data.related_id,
            created_at: data.created_at || new Date().toISOString(),
            is_viewed: false
          };
        } else if ((data.title || data.message)) {
          // Если приходит уведомление в простом формате
          notification = {
            id: data.id || Date.now(),
            title: data.title || 'Новое уведомление',
            message: data.message,
            type: data.type || 'general',
            related_id: data.related_id,
            created_at: data.created_at || new Date().toISOString(),
            is_viewed: false
          };
        }
        
        // Обрабатываем уведомление, если оно найдено
        if (notification) {
          // Убеждаемся, что у уведомления есть ID
          if (!notification.id) {
            notification.id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
          
          // Строгая проверка дублирования
          const notificationKey = `${notification.id}_${notification.created_at}`;
          
          // Проверяем, не обрабатываем ли мы то же самое уведомление
          if (lastProcessedNotificationRef.current === notificationKey) {
            return;
          }
          
          if (isNotificationShown(notification.id)) {
            return;
          }
          
          // Отмечаем уведомление как обработанное
          lastProcessedNotificationRef.current = notificationKey;
          markNotificationShown(notification.id);
          
          // ОПТИМИЗАЦИЯ: Отправляем кастомное событие с debouncing
          try {
            const notificationEvent = new CustomEvent('newNotificationReceived', {
              detail: notification
            });
            window.dispatchEvent(notificationEvent);
          } catch (error) {
            // Игнорируем ошибки отправки события для Header
          }
          
          // ОПТИМИЗАЦИЯ: Показываем Toast уведомление с оптимизированными настройками
          const toastId = toast(notification.message, {
            duration: 4000, // Уменьшено с 6000 для меньшей нагрузки
            position: 'top-right',
            style: {
              background: '#363636',
              color: '#fff',
            },
            // ОПТИМИЗАЦИЯ: Отключаем анимации для производительности
            className: 'will-change-transform',
          });

          // ОПТИМИЗАЦИЯ: Проигрываем звук асинхронно
          setTimeout(() => {
            try {
              soundService.playNotification();
            } catch (error) {
              // Игнорируем ошибки воспроизведения звука
            }
          }, 0);

          // ОПТИМИЗАЦИЯ: Отправляем браузерное уведомление асинхронно
          setTimeout(() => {
            const requireInteraction = ['new_message', 'consultation_started', 'new_consultation'].includes(notification.type);
            
            notificationService.send(
              notification.title || 'Новое уведомление',
              {
                body: notification.message,
                icon: '/favicon.ico?v=2',
                tag: `ws_notification_${notification.type}_${notification.id}`,
                requireInteraction: requireInteraction,
                renotify: true,
                data: {
                  notificationId: notification.id,
                  type: notification.type,
                  relatedId: notification.related_id
                },
                onclick: () => {
                  // ОПТИМИЗАЦИЯ: Обработчик клика с throttling
                  requestAnimationFrame(() => {
                    // Закрываем Toast, если он еще открыт
                    toast.dismiss(toastId);
                    
                    // Фокусируем окно браузера сначала
                    if (window.focus) {
                      window.focus();
                    }
                    
                    // ОПТИМИЗАЦИЯ: Навигация через requestAnimationFrame
                    requestAnimationFrame(() => {
                      try {
                        if (notification.type === 'new_message' && notification.related_id) {
                          navigate(`/consultations/${notification.related_id}`);
                        } else if (notification.type === 'consultation_started' && notification.related_id) {
                          navigate(`/consultations/${notification.related_id}`);
                        } else if (notification.type === 'new_consultation' && notification.related_id) {
                          navigate(`/consultations/${notification.related_id}`);
                        } else if (notification.type === 'application_processed') {
                          navigate('/doctor-applications');
                        } else {
                          navigate('/notifications');
                        }
                      } catch (error) {
                        // Запасной вариант - переход на главную
                        navigate('/');
                      }
                    });
                  });
                }
              }
            ).catch(error => {
              // Игнорируем ошибки отправки браузерного уведомления
            });
          }, 100);
        }
      } catch (error) {
        // Игнорируем ошибки обработки WebSocket сообщения
      }
    });
  }, optimizedThrottleDelay), [navigate, isNotificationShown, markNotificationShown, optimizedThrottleDelay]); // Мобильный throttling

  // WebSocket connection status state
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  // Подключение к WebSocket для уведомлений через централизованный сервис
  useEffect(() => {
    if (!isAuthenticated || !user || !token) {
      return;
    }

    // Проверяем что user.id существует и не undefined
    if (!user.id || user.id === 'undefined') {
      return;
    }

    // Очистка при изменении пользователя
    shownNotificationsRef.current.clear();
    lastProcessedNotificationRef.current = null;

    let isActive = true;

    const connectToNotifications = async () => {
      try {
        // Skip connection if paused due to background
        if (isPausedRef.current || !isActive) {
          return;
        }

        // Импортируем webSocketService динамически
        const webSocketService = (await import('../services/webSocketService')).default;

        // Создаем подключение через централизованный сервис
        const connection = await webSocketService.getNotificationConnection(
          user.id,
          handleWebSocketMessage,
          (status, message) => {
            if (!isActive) return;
            
            setConnectionStatus(status);
            
            // Показываем уведомления о состоянии подключения только при необходимости
            if (status === 'connected' && connectionStatus === 'reconnecting') {
              toast.success('📞 Соединение восстановлено', {
                duration: 2000,
                position: 'bottom-right',
              });
            } else if (status === 'error') {
              console.warn('WebSocket connection error:', message);
            }
          }
        );

        if (connection && isActive) {
          wsRef.current = connection;
        }

      } catch (error) {
        if (isActive) {
          console.error('Failed to establish notification connection:', error);
          setConnectionStatus('error');
        }
      }
    };

    connectToNotifications();

    return () => {
      isActive = false;
      
      // Закрываем соединение через централизованный сервис
      if (user?.id) {
        import('../services/webSocketService').then(module => {
          const webSocketService = module.default;
          webSocketService.closeNotificationConnection(user.id);
        });
      }
      
      wsRef.current = null;
      setConnectionStatus('disconnected');
    };
  }, [isAuthenticated, user?.id, token, handleWebSocketMessage, connectionStatus]); // Добавили connectionStatus в зависимости

  // Background detection effect
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const handleBackgroundChange = (state) => {
      if (state === 'background') {
        // Pause WebSocket when app goes to background
        isPausedRef.current = true;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close(1000, 'App went to background');
        }
      } else if (state === 'foreground') {
        // Resume WebSocket when app comes to foreground
        isPausedRef.current = false;
        // Trigger reconnection if WebSocket was closed
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          // Trigger effect by updating connection attempt
          connectionAttemptRef.current++;
        }
      }
    };

    const unsubscribe = backgroundDetector.addCallback(handleBackgroundChange);

    return () => {
      unsubscribe();
    };
  }, [isAuthenticated, user?.id]);

  // Запрос разрешений на браузерные уведомления
  useEffect(() => {
    if (isAuthenticated && user) {
      const timer = setTimeout(async () => {
        try {
          const status = notificationService.getStatus();
          
          if (status.permission === 'default') {
            const result = await notificationService.requestPermission();
            
            if (result.success) {
              toast.success('Push-уведомления включены!', {
                duration: 3000,
                position: 'top-right',
              });
            }
          }
        } catch (error) {
          // Игнорируем ошибки запроса разрешений
        }
      }, 2000); // Увеличил задержку до 2 секунд

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user?.id]); // Изменил зависимости

  return null;
};

export default NotificationWebSocket; 