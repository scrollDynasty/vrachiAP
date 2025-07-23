import React, { useEffect, useRef, useCallback } from 'react';
import useAuthStore from '../stores/authStore';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/notificationService';
import soundService from '../services/soundService';

const NotificationWebSocket = () => {
  const { user, isAuthenticated, token } = useAuthStore();
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const connectionAttemptRef = useRef(0);
  
  // ОПТИМИЗАЦИЯ: Строгое отслеживание показанных уведомлений с ограниченным размером
  const shownNotificationsRef = useRef(new Set());
  const lastProcessedNotificationRef = useRef(null);
  
  // ОПТИМИЗАЦИЯ: Throttling для обработки сообщений (как у Instagram)
  const messageThrottleRef = useRef(null);

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

  // ОПТИМИЗАЦИЯ: Обработчик сообщений WebSocket с throttling
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
  }, 200), [navigate, isNotificationShown, markNotificationShown]); // Throttling 200ms

  // Подключение к WebSocket для уведомлений
  useEffect(() => {
    if (!isAuthenticated || !user || !token) {
      return;
    }

    // Проверяем что user.id существует и не undefined
    if (!user.id || user.id === 'undefined') {
      return;
    }

    // Предотвращаем множественные подключения
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }
    
    // Увеличиваем счетчик попыток подключения
    connectionAttemptRef.current++;
    const currentAttempt = connectionAttemptRef.current;

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const baseReconnectDelay = 1000;
    
    // Очистка при изменении пользователя
    shownNotificationsRef.current.clear();
    lastProcessedNotificationRef.current = null;

    const connectWebSocket = async () => {
      try {
        // Проверяем, что это все еще актуальная попытка подключения
        if (currentAttempt !== connectionAttemptRef.current) {
          return;
        }
        
        // Дополнительная проверка user.id перед подключением
        if (!user.id || user.id === 'undefined') {
          return;
        }
        
        // Получаем WebSocket токен через API
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://healzy.uz'}/api/ws-token`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Ошибка получения WebSocket токена: ${response.status}`);
        }

        const data = await response.json();
        const wsToken = data.token;
        
        if (!wsToken) {
          throw new Error('WebSocket токен не получен');
        }

        // Исправляем URL - убираем двойной /ws
        const wsUrl = `${import.meta.env.VITE_WS_URL || 'wss://healzy.uz'}/ws/notifications/${user.id}?token=${encodeURIComponent(wsToken)}`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          reconnectAttempts = 0;
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (error) {
            // Игнорируем ошибки парсинга WebSocket сообщения
          }
        };

        ws.onclose = (event) => {
          wsRef.current = null;
          
          // Переподключение при неожиданном закрытии
          if (reconnectAttempts < maxReconnectAttempts && event.code !== 1000) {
            reconnectAttempts++;
            const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts - 1);
            
            setTimeout(() => {
              if (currentAttempt === connectionAttemptRef.current) {
                connectWebSocket();
              }
            }, delay);
          }
        };

        ws.onerror = (error) => {
          // Игнорируем ошибки WebSocket
        };

      } catch (error) {
        // Переподключение при ошибке получения токена
        if (reconnectAttempts < maxReconnectAttempts && currentAttempt === connectionAttemptRef.current) {
          reconnectAttempts++;
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts - 1);
          
          setTimeout(() => {
            if (currentAttempt === connectionAttemptRef.current) {
              connectWebSocket();
            }
          }, delay);
        }
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, token, handleWebSocketMessage]); // Изменил зависимости

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