import React, { useState, useEffect } from 'react';
import { Card, CardBody, Button, Chip } from '@nextui-org/react';
import { notificationsApi } from '../api';

// Простая проверка поддержки браузерных уведомлений
const isBrowserNotificationSupported = typeof window !== 'undefined' && 
  'Notification' in window;

// Компонент для запроса разрешения на отправку уведомлений
function NotificationPermissionHandler() {
  const [showRequest, setShowRequest] = useState(false);
  
  useEffect(() => {
    // Проверяем localStorage при загрузке
    const wasRequested = localStorage.getItem('notificationPermissionRequested') === 'true';
    const hasPermission = isBrowserNotificationSupported && Notification.permission === 'granted';
    
    // Показываем запрос только если:
    // 1. Уведомления поддерживаются
    // 2. Разрешение не предоставлено
    // 3. Запрос еще не показывался
    setShowRequest(isBrowserNotificationSupported && !hasPermission && !wasRequested);
  }, []);
  
  // Запрос разрешения на отправку уведомлений
  const requestPermission = async () => {
    if (!isBrowserNotificationSupported) {
      return;
    }
    
    try {
      let permission;
      
      // Поддержка как старого, так и нового API
      if (typeof Notification.requestPermission === 'function') {
        const result = Notification.requestPermission();
        
        // Проверяем, возвращается ли Promise
        if (result && typeof result.then === 'function') {
          permission = await result;
        } else {
          // Старый API с callback
          permission = await new Promise((resolve) => {
            Notification.requestPermission(resolve);
          });
        }
      }
      
      // Запоминаем, что запрос был показан
      localStorage.setItem('notificationPermissionRequested', 'true');
      setShowRequest(false);
    } catch (error) {
      // Даже при ошибке скрываем запрос
      localStorage.setItem('notificationPermissionRequested', 'true');
      setShowRequest(false);
    }
  };
  
  // Скрыть запрос без предоставления разрешения
  const dismissRequest = () => {
    localStorage.setItem('notificationPermissionRequested', 'true');
    setShowRequest(false);
  };
  
  // Не показываем ничего, если запрос не нужен
  if (!showRequest) {
    return null;
  }
  
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
            <div className="flex gap-2">
              <Button 
                color="primary" 
                variant="flat"
                onClick={requestPermission}
              >
                Разрешить уведомления
              </Button>
              <Button 
                color="default" 
                variant="bordered"
                onClick={dismissRequest}
              >
                Отклонить
              </Button>
            </div>
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
    if (typeof window === 'undefined' || !window.Notification) {
      return false;
    }
    
    if (!isBrowserNotificationSupported) {
      return false;
    }
    
    // Проверяем разрешение
    if (Notification.permission !== 'granted') {
      return false;
    }
    
    // Создаем новое уведомление
    const notification = new Notification(title || 'Уведомление', {
      icon: '/healzy.png?v=2',
      ...(options || {})
    });
    
    // Обработчики событий
    if (notification) {
      notification.onclick = function() {
        if (window) window.focus();
        if (options && typeof options.onClick === 'function') options.onClick();
        this.close();
      };
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// Компонент для отображения уведомления о статусе заявки на роль врача
function DoctorApplicationNotification({ application, onClose }) {
  const [expanded, setExpanded] = useState(false);
  
  if (!application) return null;
  
  // Автоматическое скрытие уведомления через 15 секунд
  useEffect(() => {
    const timer = setTimeout(() => {
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
    if (onClose) {
      onClose();
    }
  };
  
  // Функция для переключения развернутого состояния
  const toggleExpanded = (e) => {
    e.stopPropagation();
    setExpanded(!expanded);
  };
  
  // Определяем максимальную длину сообщения для сокращенного вида
  const maxLength = 100;
  const isLongMessage = message && message.length > maxLength;
  const displayMessage = expanded || !isLongMessage ? message : `${message.substring(0, maxLength)}...`;
  
  return (
    <Card 
      className={`mb-4 shadow-md border-${color} cursor-pointer transition-all hover:shadow-lg`}
      style={{ borderLeftWidth: '4px' }}
      onClick={toggleExpanded}
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
                <p className="text-gray-600">{displayMessage}</p>
                
                {isLongMessage && (
                  <Button 
                    size="sm" 
                    variant="light" 
                    color="primary" 
                    className="mt-2 px-2 min-w-0" 
                    onClick={toggleExpanded}
                  >
                    {expanded ? 'Свернуть' : 'Показать полностью'}
                  </Button>
                )}
              </div>
              <button 
                type="button"
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 hover:text-red-500 flex items-center justify-center transition-colors border border-transparent hover:border-gray-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCloseClick();
                }}
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
  const [showAll, setShowAll] = useState(false);
  
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
    
    // Удаляем уведомление из текущего списка при закрытии
    setApplications(prev => prev.filter(app => Number(app.id) !== Number(applicationId)));
    
    // Отправляем на сервер информацию о том, что пользователь просмотрел уведомление
    try {
      await notificationsApi.markAsViewed(applicationId);
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
      <div className="max-h-[400px] overflow-y-auto pr-1 notification-scrollbar">
        {applications.map(application => (
          <DoctorApplicationNotification 
            key={application.id}
            application={application}
            onClose={() => handleDismissNotification(application.id)}
          />
        ))}
      </div>
    </div>
  );
}

export { 
  DoctorApplicationNotification, 
  ApplicationStatusTracker,
  NotificationPermissionHandler, 
  sendBrowserNotification 
};

// Экспортируем компонент Notification для обратной совместимости
export const Notification = ({ type, message, onClose }) => {
  if (!message) return null;
  
  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  
  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg text-white shadow-lg ${bgColor}`}>
      <div className="flex items-center justify-between">
        <span>{message}</span>
        {onClose && (
          <button 
            onClick={onClose}
            className="ml-4 text-white hover:text-gray-200"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}; 