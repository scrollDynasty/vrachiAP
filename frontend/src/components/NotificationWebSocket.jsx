import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import { WS_BASE_URL } from '../api';
import useAuthStore from '../stores/authStore';
import { toast } from 'react-hot-toast';

// Функция для отправки браузерного уведомления
function sendBrowserNotification(title, options = {}) {
  try {
    // Проверяем поддержку API
    if (typeof window === 'undefined' || !window.Notification) return false;
    
    // Проверяем разрешение
    if (!Notification || Notification.permission !== 'granted') return false;
    
    // Создаем новое уведомление
    const notification = new Notification(title || 'Уведомление от Soglom', {
      icon: '/soglom.jpg', // Используем иконку Soglom
      ...(options || {})
    });
    
    // Обработчики событий
    if (notification) {
      notification.onclick = function() {
        // При клике на уведомление фокусируем окно браузера
        if (window) window.focus();
        if (options && typeof options.onClick === 'function') options.onClick();
        this.close();
      };
    }
    
    return true;
  } catch (error) {
    console.error('Ошибка при отправке браузерного уведомления:', error);
    return false;
  }
}

const NotificationWebSocket = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [socket, setSocket] = useState(null);
  
  // Используем Map вместо Set для хранения времени показа уведомлений
  const shownNotificationsRef = useRef(new Map());
  
  // Флаг, указывающий, что компонент монтирован
  const mountedRef = useRef(true);
  
  // Флаг активного соединения для предотвращения циклов переподключения
  const isConnectingRef = useRef(false);
  
  // Счетчик неудачных попыток подключения для увеличения времени между попытками
  const reconnectAttemptsRef = useRef(0);
  
  // ID таймера переподключения
  const reconnectTimerRef = useRef(null);
  
  // Флаг закрытия соединения с сервера (не клиентом)
  const serverClosedRef = useRef(false);
  
  // Соединяемся с WebSocket, когда пользователь авторизован
  useEffect(() => {
    // При монтировании компонента
    mountedRef.current = true;
    
    // Проверка, не была ли уже показана нотификация с таким ID
    const isNotificationShown = (notificationId) => {
      if (!shownNotificationsRef.current.has(notificationId)) {
        return false;
      }
      
      // Проверяем, что уведомление было показано недавно (в течение 5 минут)
      const shownTime = shownNotificationsRef.current.get(notificationId);
      const timeDiff = Date.now() - shownTime;
      const timeThreshold = 5 * 60 * 1000; // 5 минут
      
      return timeDiff < timeThreshold;
    };
    
    // Отметка, что нотификация показана
    const markNotificationShown = (notificationId) => {
      shownNotificationsRef.current.set(notificationId, Date.now());
      
      // Очищаем старые ID через 5 минут, чтобы не накапливать их бесконечно
      setTimeout(() => {
        if (mountedRef.current) {
          shownNotificationsRef.current.delete(notificationId);
        }
      }, 5 * 60 * 1000); // 5 минут
    };
    
    // Периодическая очистка старых уведомлений
    const cleanupInterval = setInterval(() => {
      if (mountedRef.current) {
        const now = Date.now();
        const timeThreshold = 5 * 60 * 1000; // 5 минут
        
        // Удаляем все уведомления старше 5 минут
        shownNotificationsRef.current.forEach((timestamp, id) => {
          if (now - timestamp > timeThreshold) {
            shownNotificationsRef.current.delete(id);
          }
        });
      }
    }, 60 * 1000); // Каждую минуту
    
    const cleanupWebsocket = (ws) => {
      if (ws) {
        try {
          // Удаляем все обработчики событий перед закрытием
          ws.onopen = null;
          ws.onmessage = null;
          ws.onerror = null;
          ws.onclose = null;
          ws.close();
        } catch (e) {
          console.error('Ошибка при закрытии WebSocket соединения:', e);
        }
      }
    };
    
    const connectToWebSocket = async () => {
      // Если уже идет подключение или компонент размонтирован, не продолжаем
      if (isConnectingRef.current || !mountedRef.current || !isAuthenticated || !user) {
        return;
      }
      
      // Устанавливаем флаг подключения
      isConnectingRef.current = true;
      
      try {
        // Закрываем предыдущее соединение, если оно существует
        if (socket) {
          cleanupWebsocket(socket);
          setSocket(null);
        }
        
        // Получаем токен для WebSocket
        const tokenResponse = await api.get('/api/ws-token');
        const wsToken = tokenResponse.data.token;
        
        // Определяем протокол
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        
        // Проверяем, что ID пользователя определен
        if (!user || !user.id) {
          console.error('ID пользователя не определен для WebSocket соединения');
          throw new Error('ID пользователя не определен');
        }
        
        // Формируем URL с проверкой ID пользователя
        const wsUrl = `${protocol}//${window.location.host}${WS_BASE_URL}/ws/notifications/${user.id}?token=${wsToken}`;
        console.log('NotificationWebSocket: Подключение к', wsUrl);
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('NotificationWebSocket: Соединение установлено');
          // Сбрасываем счетчик попыток подключения
          reconnectAttemptsRef.current = 0;
          // Сбрасываем флаг закрытия сервером
          serverClosedRef.current = false;
          
          if (mountedRef.current) {
            setSocket(ws);
            // Сбрасываем флаг подключения
            isConnectingRef.current = false;
          }
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('NotificationWebSocket: Получено сообщение', data);
            
            // Обрабатываем новое уведомление
            if (data.type === 'new_notification' && data.notification && mountedRef.current) {
              const notification = data.notification;
              console.log('NotificationWebSocket: Получено новое уведомление', notification);
              
              // Проверяем, не показывали ли мы уже это уведомление
              if (!isNotificationShown(notification.id)) {
                console.log('NotificationWebSocket: Показываем уведомление', notification.id);
                // Показываем уведомление в интерфейсе
                toast(notification.title, {
                  description: notification.message,
                  duration: 5000,
                });
                
                // Отправляем браузерное уведомление
                sendBrowserNotification(notification.title, {
                  body: notification.message,
                  tag: `notification-${notification.id}`
                });
                
                // Отмечаем, что уведомление показано
                markNotificationShown(notification.id);
              } else {
                console.log('NotificationWebSocket: Уведомление уже было показано', notification.id);
              }
            }
          } catch (error) {
            console.error('Ошибка при обработке WebSocket сообщения:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('NotificationWebSocket: Ошибка соединения', error);
          isConnectingRef.current = false;
          serverClosedRef.current = true;
        };
        
        ws.onclose = (event) => {
          console.log('NotificationWebSocket: Соединение закрыто', event.code, event.reason);
          isConnectingRef.current = false;
          // Если соединение закрыто сервером или произошла ошибка, пытаемся переподключиться
          if (mountedRef.current && (serverClosedRef.current || event.code !== 1000)) {
            const reconnectDelay = Math.min(30000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
            reconnectAttemptsRef.current++;
            console.log(`NotificationWebSocket: Попытка переподключения через ${reconnectDelay}мс`);
            
            // Планируем переподключение
            reconnectTimerRef.current = setTimeout(() => {
              if (mountedRef.current) {
                connectToWebSocket();
              }
            }, reconnectDelay);
          }
        };
      } catch (error) {
        console.error('Ошибка при подключении к WebSocket:', error);
        isConnectingRef.current = false;
        // Планируем повторную попытку
        const reconnectDelay = Math.min(30000, 1000 * Math.pow(2, reconnectAttemptsRef.current));
        reconnectAttemptsRef.current++;
        
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connectToWebSocket();
          }
        }, reconnectDelay);
      }
    };
    
    // Подключаемся при аутентификации
    if (isAuthenticated && user && !socket && !isConnectingRef.current) {
      connectToWebSocket();
    }
    
    // Очистка при размонтировании
    return () => {
      mountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      clearInterval(cleanupInterval);
      
      if (socket) {
        cleanupWebsocket(socket);
      }
    };
  }, [isAuthenticated, user, socket]);
  
  // Ничего не отображаем, этот компонент только для логики
  return null;
};

export default NotificationWebSocket; 