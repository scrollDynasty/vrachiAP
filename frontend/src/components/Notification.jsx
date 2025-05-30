import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Chip } from '@nextui-org/react';
import { notificationsApi } from '../api';

// Безопасная проверка поддержки нативных уведомлений браузера
// Проверяем, что window существует (SSR-совместимость) и Notification API доступен
const isBrowserNotificationSupported = typeof window !== 'undefined' && 'Notification' in window;

// Компонент для запроса разрешения на отправку уведомлений
function NotificationPermissionHandler() {
  const [permissionState, setPermissionState] = useState(
    isBrowserNotificationSupported ? Notification.permission : 'denied'
  );
  
  // Запрос разрешения на отправку уведомлений
  const requestPermission = async () => {
    if (!isBrowserNotificationSupported) return;
    
    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      console.log('Статус разрешения уведомлений:', permission);
    } catch (error) {
      console.error('Ошибка при запросе разрешения на уведомления:', error);
    }
  };
  
  // При первом рендере проверяем статус разрешения
  useEffect(() => {
    // Если уже есть разрешение, не делаем ничего
    if (permissionState === 'granted') return;
    
    // Если статус "default" (не определен), запрашиваем разрешение
    if (permissionState === 'default') {
      requestPermission();
    }
  }, [permissionState]);
  
  // Если уведомления не поддерживаются или уже есть разрешение, не отображаем ничего
  if (!isBrowserNotificationSupported || permissionState === 'granted') {
    return null;
  }
  
  // Отображаем запрос только если статус "denied" или "default"
  return (
    <Card className="mb-4 shadow-md border-primary" style={{ borderLeftWidth: '4px' }}>
      <CardBody className="p-4">
        <div className="flex items-start gap-4">
          <div className="rounded-full p-2 bg-primary-100 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-grow">
            <h4 className="text-lg font-semibold">Включить уведомления</h4>
            <p className="text-gray-600 mb-3">
              Получайте мгновенные уведомления о статусе ваших заявок и важных обновлениях.
            </p>
            <Button 
              color="primary" 
              variant="flat"
              onClick={requestPermission}
            >
              Разрешить уведомления
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// Функция для отправки браузерного уведомления
function sendBrowserNotification(title, options = {}) {
  try {
    // Проверяем поддержку API
    if (typeof window === 'undefined' || !window.Notification) return false;
    if (!isBrowserNotificationSupported) return false;
    
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

// Компонент для отображения уведомления о статусе заявки на роль врача
function DoctorApplicationNotification({ application, onClose }) {
  if (!application) return null;
  
  // Автоматическое скрытие уведомления через 15 секунд
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('Автоматическое закрытие уведомления через 15 секунд, ID:', application.id);
      if (onClose) {
        onClose();
      }
    }, 15000); // 15 секунд
    
    // Очистка таймера при размонтировании компонента
    return () => clearTimeout(timer);
  }, [application.id, onClose]);
  
  // Функция для определения типа уведомления и отображения соответствующего стиля
  const getNotificationDetails = () => {
    switch (application.status) {
      case 'approved':
        return {
          title: 'Заявка одобрена!',
          message: 'Ваша заявка на получение роли врача одобрена. Теперь вы можете создать профиль врача и начать консультировать пациентов.',
          color: 'success',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      case 'rejected':
        return {
          title: 'Заявка отклонена',
          message: application.admin_comment 
            ? `Ваша заявка на получение роли врача отклонена. Причина: ${application.admin_comment}` 
            : 'Ваша заявка на получение роли врача отклонена.',
          color: 'danger',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-danger-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      default:
        return {
          title: 'Статус заявки обновлен',
          message: 'Ваша заявка на получение роли врача обновлена.',
          color: 'primary',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
    }
  };
  
  const { title, message, color, icon } = getNotificationDetails();
  
  // Простая функция для обработки закрытия
  const handleCloseClick = () => {
    console.log('Закрываем уведомление с ID:', application.id);
    if (onClose) {
      onClose();
    }
  };
  
  return (
    <Card 
      className={`mb-4 shadow-md border-${color}`}
      style={{ borderLeftWidth: '4px' }}
    >
      <CardBody className="p-4">
        <div className="flex items-start gap-4">
          <div className={`rounded-full p-2 bg-${color}-100 flex-shrink-0`}>
            {icon}
          </div>
          <div className="flex-grow">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-semibold">{title}</h4>
                <Chip size="sm" color={color} variant="flat" className="mt-1 mb-2">
                  {application.status === 'approved' ? 'Одобрено' : 
                   application.status === 'rejected' ? 'Отклонено' : 'Обновлено'}
                </Chip>
                <p className="text-gray-600">{message}</p>
              </div>
              <button 
                type="button"
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-500 flex items-center justify-center transition-colors border border-transparent hover:border-gray-200"
                onClick={handleCloseClick}
                aria-label="Закрыть"
                style={{ minWidth: '32px', minHeight: '32px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {application.status === 'approved' && (
              <div className="mt-3">
                <Button 
                  color="success" 
                  variant="flat"
                  href="/profile"
                  as="a"
                >
                  Перейти к профилю
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

// Компонент для отслеживания и отображения статусов заявок
function ApplicationStatusTracker() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastAppIds, setLastAppIds] = useState(new Set());
  
  // Загружаем статусы заявок при монтировании компонента
  useEffect(() => {
    // Загружаем уведомления при первом рендеринге компонента
    fetchApplicationUpdates();
    
    // Установим интервал для периодической проверки новых уведомлений (каждые 5 минут)
    const intervalId = setInterval(() => {
      fetchApplicationUpdates();
    }, 5 * 60 * 1000); // 5 минут в миллисекундах
    
    // Очистим интервал при размонтировании компонента
    return () => clearInterval(intervalId);
  }, []);
  
  // Получение статусов заявок
  const fetchApplicationUpdates = async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.checkDoctorApplicationUpdates();
      
      console.log('Получены обновления заявок:', data);
      
      // Проверяем, что data - это массив перед использованием
      if (!Array.isArray(data)) {
        console.error('Ошибка: полученные данные не являются массивом', data);
        setApplications([]);
        return;
      }
      
      // Отображаем только обработанные заявки (approved/rejected)
      // и только те, которые были обработаны недавно (за последние 24 часа)
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 часа назад
      
      const recentApplications = data.filter(app => {
        // Фильтруем по статусу
        if (app.status !== 'approved' && app.status !== 'rejected') {
          return false;
        }
        
        // Проверяем, что заявка была обработана недавно
        if (app.processed_at) {
          const processedDate = new Date(app.processed_at);
          return processedDate > oneDayAgo;
        }
        
        return false;
      });
      
      // Проверяем на новые уведомления и отправляем браузерные уведомления
      const currentAppIds = new Set(recentApplications.map(app => app.id));
      const newAppIds = [...currentAppIds].filter(id => !lastAppIds.has(id));
      
      // Если есть новые уведомления, отправляем браузерные уведомления
      for (const appId of newAppIds) {
        const app = recentApplications.find(a => a.id === appId);
        if (app) {
          // Определяем тип уведомления
          let title = "Обновление статуса заявки";
          let body = "Ваша заявка на получение роли врача обновлена.";
          
          if (app.status === 'approved') {
            title = "Заявка одобрена!";
            body = "Ваша заявка на получение роли врача одобрена. Теперь вы можете создать профиль врача и начать консультировать пациентов.";
          } else if (app.status === 'rejected') {
            title = "Заявка отклонена";
            body = app.admin_comment 
              ? `Ваша заявка на получение роли врача отклонена. Причина: ${app.admin_comment}`
              : "Ваша заявка на получение роли врача отклонена.";
          }
          
          // Отправляем уведомление
          sendBrowserNotification(title, {
            body,
            tag: `application-${app.id}`, // Уникальный тег для уведомления
            onClick: () => window.location.href = '/profile' // При клике перейти в профиль
          });
        }
      }
      
      // Обновляем набор последних полученных ID
      setLastAppIds(currentAppIds);
      
      // Обновляем состояние с полученными заявками
      setApplications(recentApplications);
    } catch (error) {
      console.error('Не удалось получить обновления заявок:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Обработчик закрытия уведомления
  const handleDismissNotification = async (applicationId) => {
    console.log('Закрытие уведомления с ID:', applicationId);
    
    // Удаляем уведомление из текущего списка при закрытии
    setApplications(prev => prev.filter(app => Number(app.id) !== Number(applicationId)));
    
    // Отправляем на сервер информацию о том, что пользователь просмотрел уведомление
    try {
      await notificationsApi.markAsViewed(applicationId);
      console.log(`Уведомление ${applicationId} отмечено как просмотренное на сервере`);
    } catch (error) {
      console.error('Ошибка при отметке уведомления как просмотренного:', error);
    }
  };
  
  // Если загружаемся или нет заявок, ничего не отображаем
  if (loading && applications.length === 0) return null;
  
  return (
    <div className="mb-8">
      {/* Компонент для запроса разрешения на уведомления */}
      <NotificationPermissionHandler />
      
      {/* Отображаем уведомления о заявках */}
      {applications.map(application => (
        <DoctorApplicationNotification 
          key={application.id}
          application={application}
          onClose={() => handleDismissNotification(application.id)}
        />
      ))}
    </div>
  );
}

export { 
  DoctorApplicationNotification, 
  ApplicationStatusTracker,
  NotificationPermissionHandler, 
  sendBrowserNotification 
}; 