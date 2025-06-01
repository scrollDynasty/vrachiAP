import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  
  // Храним WebSocketService instance
  const webSocketServiceRef = useRef(null);
  
  // Импортируем WebSocketService если он еще не был импортирован
  useEffect(() => {
    // Импортируем WebSocketService динамически, если он еще не был импортирован
    if (!webSocketServiceRef.current) {
      import('../services/webSocketService').then(module => {
        webSocketServiceRef.current = module.default;
      }).catch(error => {
        console.error('Ошибка при импорте WebSocketService:', error);
      });
    }
    
    return () => {
      // Очистка при размонтировании
      mountedRef.current = false;
    };
  }, []);
  
  // Функция для проверки, было ли уже показано уведомление
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
    
    // Сохраняем ID показанных уведомлений в localStorage, чтобы предотвратить
    // повторный показ после перезагрузки страницы
    try {
      const shownNotificationsStr = localStorage.getItem('shownNotifications');
      let shownNotifications = {};
      
      if (shownNotificationsStr) {
        shownNotifications = JSON.parse(shownNotificationsStr);
      }
      
      shownNotifications[notificationId] = Date.now();
      
      // Очищаем старые записи (старше 5 минут)
      const now = Date.now();
      const timeThreshold = 5 * 60 * 1000; // 5 минут
      
      Object.keys(shownNotifications).forEach(id => {
        if (now - shownNotifications[id] > timeThreshold) {
          delete shownNotifications[id];
        }
      });
      
      localStorage.setItem('shownNotifications', JSON.stringify(shownNotifications));
    } catch (e) {
      console.error('Ошибка при сохранении показанных уведомлений в localStorage:', e);
    }
    
    // Очищаем старые ID через 5 минут, чтобы не накапливать их бесконечно
    setTimeout(() => {
      if (mountedRef.current) {
        shownNotificationsRef.current.delete(notificationId);
      }
    }, 5 * 60 * 1000); // 5 минут
  };
  
  // Загружаем показанные уведомления из localStorage при монтировании
  useEffect(() => {
    try {
      const shownNotificationsStr = localStorage.getItem('shownNotifications');
      
      if (shownNotificationsStr) {
        const shownNotifications = JSON.parse(shownNotificationsStr);
        const now = Date.now();
        const timeThreshold = 5 * 60 * 1000; // 5 минут
        
        Object.entries(shownNotifications).forEach(([id, timestamp]) => {
          if (now - timestamp < timeThreshold) {
            shownNotificationsRef.current.set(id, timestamp);
          }
        });
      }
    } catch (e) {
      console.error('Ошибка при загрузке показанных уведомлений из localStorage:', e);
    }
  }, []);
  
  // Периодическая очистка старых уведомлений
  useEffect(() => {
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
    
    return () => {
      clearInterval(cleanupInterval);
    };
  }, []);
  
  // Обработчик сообщений WebSocket
  const handleWebSocketMessage = useCallback((data) => {
    try {
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
      } else if (data.type === 'login_success' && mountedRef.current) {
        // Для уведомлений о входе используем уникальный ключ
        const loginKey = `login_${Date.now()}`;
        
        // Проверяем, показывали ли мы уже уведомление о входе недавно
        const lastLoginTime = localStorage.getItem('lastLoginNotificationTime');
        const now = Date.now();
        
        if (!lastLoginTime || (now - parseInt(lastLoginTime)) > 5000) {
          toast.success('Вы успешно авторизованы', {
            duration: 3000,
          });
          
          // Запоминаем время показа уведомления о входе
          localStorage.setItem('lastLoginNotificationTime', now.toString());
        }
      }
    } catch (error) {
      console.error('Ошибка при обработке WebSocket сообщения:', error);
    }
  }, []);
  
  // Эффект для соединения с WebSocket при монтировании компонента
  useEffect(() => {
    if (isAuthenticated && user && user.id && webSocketServiceRef.current && !socket) {
      // Используем WebSocketService для установки соединения
      webSocketServiceRef.current.getNotificationConnection(
        user.id,
        handleWebSocketMessage,
        (status, message) => {
          console.log(`NotificationWebSocket: Статус соединения изменился на ${status}`, message || '');
        }
      ).then(newSocket => {
        if (newSocket && mountedRef.current) {
          setSocket(newSocket);
        }
      }).catch(error => {
        console.error('Ошибка при получении соединения WebSocket:', error);
      });
    }
    
    return () => {
      // Очистка при размонтировании или изменении зависимостей
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [isAuthenticated, user, handleWebSocketMessage, socket]);
  
  // Ничего не отображаем, этот компонент только для логики
  return null;
};

export default NotificationWebSocket; 