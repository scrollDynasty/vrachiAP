import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
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
    const notification = new Notification(title || 'Уведомление', {
      icon: '/favicon.ico', // можно заменить на логотип приложения
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
  // Используем useRef для хранения списка уже показанных уведомлений
  const shownNotificationsRef = useRef(new Set());
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
      return shownNotificationsRef.current.has(notificationId);
    };
    
    // Отметка, что нотификация показана
    const markNotificationShown = (notificationId) => {
      shownNotificationsRef.current.add(notificationId);
      
      // Очищаем старые ID через 5 минут, чтобы не накапливать их бесконечно
      setTimeout(() => {
        if (mountedRef.current) {
          shownNotificationsRef.current.delete(notificationId);
        }
      }, 5 * 60 * 1000); // 5 минут
    };
    
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
        
        console.log('Получаем токен для WebSocket...');
        // Получаем токен для WebSocket
        const tokenResponse = await api.get('/api/ws-token');
        const wsToken = tokenResponse.data.token;
        
        console.log('Создаем WebSocket соединение...');
        // Создаем WebSocket соединение
        const ws = new WebSocket(`ws://127.0.0.1:8000/ws/notifications/${user.id}?token=${wsToken}`);
        
        ws.onopen = () => {
          console.log('WebSocket соединение установлено');
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
            console.log('Получено WebSocket сообщение:', data);
            
            // Обрабатываем новое уведомление
            if (data.type === 'new_notification' && data.notification && mountedRef.current) {
              const notification = data.notification;
              
              // Проверяем, не показывали ли мы уже это уведомление
              if (!isNotificationShown(notification.id)) {
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
                console.log(`Уведомление ${notification.id} уже было показано ранее, пропускаем`);
              }
            }
          } catch (error) {
            console.error('Ошибка при обработке WebSocket сообщения:', error);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket ошибка:', error);
          isConnectingRef.current = false;
          serverClosedRef.current = true;
        };
        
        ws.onclose = (event) => {
          console.log(`WebSocket соединение закрыто с кодом ${event.code}`);
          
          // Если компонент всё еще монтирован
          if (mountedRef.current) {
            setSocket(null);
            isConnectingRef.current = false;
            
            // Проверяем, было ли соединение закрыто сервером или браузером из-за ошибки
            // Если да, пытаемся переподключиться с увеличением интервала
            if (serverClosedRef.current) {
              // Увеличиваем счетчик попыток
              reconnectAttemptsRef.current += 1;
              
              // Вычисляем время задержки с экспоненциальным увеличением (мин. 3с, макс. 30с)
              const delay = Math.min(
                3000 * Math.pow(1.5, Math.min(reconnectAttemptsRef.current, 5)),
                30000
              );
              
              console.log(`Переподключение через ${delay}мс (попытка ${reconnectAttemptsRef.current})`);
              
              // Планируем переподключение
              clearTimeout(reconnectTimerRef.current);
              reconnectTimerRef.current = setTimeout(() => {
                if (mountedRef.current) {
                  connectToWebSocket();
                }
              }, delay);
            }
          }
        };
      } catch (error) {
        console.error('Ошибка при подключении WebSocket:', error);
        isConnectingRef.current = false;
        serverClosedRef.current = true;
        
        // Пробуем переподключиться через некоторое время
        reconnectAttemptsRef.current += 1;
        const delay = Math.min(
          3000 * Math.pow(1.5, Math.min(reconnectAttemptsRef.current, 5)),
          30000
        );
        
        console.log(`Переподключение через ${delay}мс (попытка ${reconnectAttemptsRef.current})`);
        
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          if (mountedRef.current) {
            connectToWebSocket();
          }
        }, delay);
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
      
      if (socket) {
        cleanupWebsocket(socket);
      }
    };
  }, [isAuthenticated, user, socket]);
  
  // Ничего не отображаем, этот компонент только для логики
  return null;
};

export default NotificationWebSocket; 