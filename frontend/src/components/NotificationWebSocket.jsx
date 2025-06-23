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
  
  // Строгое отслеживание показанных уведомлений
  const shownNotificationsRef = useRef(new Set());
  const lastProcessedNotificationRef = useRef(null);

  // Функция для проверки, показывали ли мы уже это уведомление
  const isNotificationShown = useCallback((notificationId) => {
    return shownNotificationsRef.current.has(notificationId);
  }, []);

  // Функция для отметки уведомления как показанного
  const markNotificationShown = useCallback((notificationId) => {
    shownNotificationsRef.current.add(notificationId);
    
    // Очистка старых записей каждые 100 уведомлений
    if (shownNotificationsRef.current.size > 100) {
      const oldEntries = Array.from(shownNotificationsRef.current).slice(0, 50);
      oldEntries.forEach(id => shownNotificationsRef.current.delete(id));
    }
  }, []);

  // Обработчик сообщений WebSocket
  const handleWebSocketMessage = useCallback((data) => {
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
          console.warn('NotificationWebSocket: У уведомления отсутствует ID, генерируем временный:', notification.id);
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
        
        
        // Отправляем кастомное событие для Header
        try {
          const notificationEvent = new CustomEvent('newNotificationReceived', {
            detail: notification
          });
          window.dispatchEvent(notificationEvent);
        } catch (error) {
          console.error('NotificationWebSocket: Ошибка отправки события для Header:', error);
        }
        
        // Показываем Toast уведомление в интерфейсе
        const toastId = toast(notification.message, {
          duration: 6000,
          position: 'top-right',
          style: {
            background: '#363636',
            color: '#fff',
          },
        });

        // Проигрываем звук
        try {
          soundService.playNotification();
        } catch (error) {
          console.error('NotificationWebSocket: Ошибка воспроизведения звука:', error);
        }

        // Отправляем браузерное уведомление НАПРЯМУЮ здесь
        
        // Определяем настройки уведомления
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
              // Обработчик клика по браузерному уведомлению
              
              // Закрываем Toast, если он еще открыт
              toast.dismiss(toastId);
              
              // Фокусируем окно браузера сначала
              if (window.focus) {
                window.focus();
              }
              
              // Небольшая задержка для корректной фокусировки
              setTimeout(() => {
                // Навигация в зависимости от типа уведомления
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
                  console.error('NotificationWebSocket: Ошибка навигации:', error);
                  // Запасной вариант - переход на главную
                  navigate('/');
                }
              }, 100);
            }
          }
        ).catch(error => {
          console.error('NotificationWebSocket: ❌ Ошибка отправки браузерного уведомления:', error);
        });
      } else {
        // Логируем другие типы сообщений
        console.debug('NotificationWebSocket: Получено сообщение другого типа:', {
          type: data.type,
          hasData: !!data
        });
      }
    } catch (error) {
      console.error('NotificationWebSocket: Ошибка обработки WebSocket сообщения:', error);
    }
  }, [navigate, isNotificationShown, markNotificationShown]);

  // Подключение к WebSocket для уведомлений
  useEffect(() => {
    if (!isAuthenticated || !user || !token) {
      return;
    }

    // Проверяем что user.id существует и не undefined
    if (!user.id || user.id === 'undefined') {
      console.warn('NotificationWebSocket: User ID отсутствует или undefined, пропускаем подключение');
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
          console.error('NotificationWebSocket: User ID недействителен для WebSocket подключения');
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
            console.error('NotificationWebSocket: Ошибка парсинга WebSocket сообщения:', error, 'Raw data:', event.data);
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
          console.error('NotificationWebSocket: Ошибка WebSocket:', error);
        };

      } catch (error) {
        console.error('NotificationWebSocket: Ошибка создания WebSocket соединения:', error);
        
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
          console.error('NotificationWebSocket: Ошибка при запросе разрешений:', error);
        }
      }, 2000); // Увеличил задержку до 2 секунд

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user?.id]); // Изменил зависимости

  return null;
};

export default NotificationWebSocket; 