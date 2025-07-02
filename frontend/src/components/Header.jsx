import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Navbar, 
  NavbarBrand, 
  NavbarContent, 
  NavbarItem, 
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Dropdown, 
  DropdownTrigger, 
  DropdownMenu, 
  DropdownItem, 
  Avatar,
  Button,
  Badge,
  Divider
} from '@nextui-org/react';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import api from '../api';
import AvatarWithFallback from './AvatarWithFallback';
import Logo from './Logo'; // Импортируем новый логотип
import LanguageSelector, { useTranslation } from './LanguageSelector'; // Импортируем селектор языка
import '../styles/AppIcon.css'; // Импортируем наши стили
import { motion } from 'framer-motion';
import { PulseLoader } from 'react-spinners';
import { useTheme } from 'next-themes';
import soundService from '../services/soundService'; // Импортируем soundService
import NotificationIcon from './NotificationIcon'; // Импортируем новый компонент для иконки уведомления
import { useCalls } from '../contexts/CallsContext'; // Импортируем контекст звонков

function Header() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const { totalUnread, fetchUnreadCounts } = useChatStore();
  const { t } = useTranslation(); // Добавляем хук для переводов
  const { connectionStatus, reconnectAttempts } = useCalls(); // Добавляем статус соединения
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [localNotifications, setLocalNotifications] = useState([]);
  const [notificationBell, setNotificationBell] = useState(false);
  
  // Состояние для отслеживания развернутых уведомлений
  const [expandedNotifications, setExpandedNotifications] = useState({});
  
  // Загружаем фото профиля из localStorage при монтировании компонента
  useEffect(() => {
    try {
      const storedProfileImage = localStorage.getItem('profileImage');
      if (storedProfileImage) {
        setProfileImage(storedProfileImage);
      } else if (user && user.avatar_path) {
        // Если аватарка есть в user, но нет в localStorage
        setProfileImage(user.avatar_path);
      }
    } catch (error) {
      // Игнорируем ошибки чтения фото профиля
    }

    // Добавляем слушатель события для обновления изображения профиля
    const handleProfileImageUpdate = (event) => {
      const { profileImage } = event.detail;
      setProfileImage(profileImage);
    };
    
    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);
    
    // Удаляем слушатель события при размонтировании компонента
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
  }, [user]); // Добавляем зависимость от user
  
  // При изменении пользователя загружаем уведомления и непрочитанные сообщения
  useEffect(() => {
    // Если пользователь не авторизован или нет ID, не делаем ничего
    if (!user || !user.id) {
      return;
    }
    
    let notificationInterval;
    let chatInterval;
    
    // Загружаем начальные данные
    const initData = async () => {
      await fetchNotifications();
      await fetchUnreadCounts();
      
      // Проверяем разрешения на браузерные уведомления
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          try {
            const permission = await Notification.requestPermission();
          } catch (error) {
            // Игнорируем ошибки запроса разрешений
          }
        } else {
        }
      } else {
      }
    };
    
    initData();
    
    // Слушаем кастомные события от NotificationWebSocket для добавления уведомлений
    const handleNewNotification = (event) => {
      const notification = event.detail;
      
      // Добавляем уведомление в локальный список, если его еще нет
      setNotifications(prev => {
        // Проверяем, нет ли уже такого уведомления
        const exists = prev.some(n => n.id === notification.id);
        if (exists) {
          return prev;
        }
        
        // Добавляем новое уведомление в начало списка
        return [notification, ...prev];
      });
      
      // Проигрываем звук (дублируется с NotificationWebSocket, но это нормально для надежности)
      try {
        soundService.playNotification();
      } catch (error) {
        // Игнорируем ошибки воспроизведения звука
      }
      
      // НЕ отправляем браузерное уведомление отсюда - это делается в NotificationWebSocket
      // Это предотвращает дублирование push-уведомлений
      
      // Обновляем счетчик непрочитанных уведомлений
      setUnreadCount(prev => prev + 1);
    };

    // Добавляем слушатель кастомного события
    window.addEventListener('newNotificationReceived', handleNewNotification);
    
    // Периодическая проверка уведомлений и сообщений (как резервный вариант)
    notificationInterval = setInterval(fetchNotifications, 120000); // 2 минуты
    chatInterval = setInterval(fetchUnreadCounts, 120000); // 2 минуты
    
    // Очищаем интервалы при размонтировании
    return () => {
      
      if (notificationInterval) clearInterval(notificationInterval);
      if (chatInterval) clearInterval(chatInterval);
      
      // Убираем слушатель кастомного события
      window.removeEventListener('newNotificationReceived', handleNewNotification);
    };
  }, [user?.id]); // Зависимость только от user.id, а не от всего объекта user
  
  // Функция для получения уведомлений
  const fetchNotifications = async () => {
    try {
      // Сбрасываем старые уведомления перед загрузкой
      setNotifications([]);
      setUnreadCount(0);
      
      const response = await api.get('/api/notifications');
      
      // Проверяем, что ответ содержит ожидаемые данные
      if (response.data && Array.isArray(response.data.items)) {
        // Фильтруем уведомления, оставляя только те, которые не прочитаны или созданы недавно (за последние 24 часа)
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 часа назад
        
        const filteredNotifications = response.data.items.filter(notification => {
          // Всегда показываем непрочитанные уведомления
          if (!notification.is_viewed) return true;
          
          // Для прочитанных - проверяем дату создания
          const createdAt = new Date(notification.created_at);
          return createdAt > oneDayAgo;
        });
        
        setNotifications(filteredNotifications);
        setUnreadCount(filteredNotifications.filter(notification => !notification.is_viewed).length);
      } else {
        // Если данные отсутствуют или имеют неправильный формат, устанавливаем пустой массив
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      // В случае ошибки устанавливаем пустые данные
      setNotifications([]);
      setUnreadCount(0);
    }
  };
  
  // Функция для отметки уведомления как прочитанного
  const markAsRead = async (notificationId) => {
    try {
      await api.post(`/api/notifications/${notificationId}/view`);
      fetchNotifications();
    } catch (error) {
      // Игнорируем ошибки отметки как прочитанное
    }
  };
  
  // Получаем первые буквы имени для аватара
  const getAvatarText = () => {
    if (!user) return '?';
    if (user.profile?.firstName && user.profile?.lastName) {
      return `${user.profile.firstName[0]}${user.profile.lastName[0]}`.toUpperCase();
    }
    return user.email && typeof user.email === 'string' ? user.email[0].toUpperCase() : '?';
  };
  
  // Получаем аватар пользователя или используем первую букву email
  const userAvatar = user?.avatar_path ? user.avatar_path : null;
  
  // Обработчики навигации с закрытием мобильного меню
  const handleProfileClick = () => {
    navigate('/profile');
    setIsMenuOpen(false);
  };
  const handleHistoryClick = () => {
    navigate('/history');
    setIsMenuOpen(false);
  };
  const handleSearchDoctorsClick = () => {
    navigate('/search-doctors');
    setIsMenuOpen(false);
  };
  const handleLogout = async () => {
    await logout();
    navigate('/');
  };
  
  // Общий обработчик навигации для мобильного меню
  const handleMobileNavigation = (path) => {
    navigate(path);
    setIsMenuOpen(false);
  };

  // Автоматически закрываем мобильное меню при изменении маршрута
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);
  
  // Использование темной/светлой темы
  const { theme, setTheme } = useTheme();
  
  // Загружаем локальные уведомления из localStorage при монтировании
  useEffect(() => {
    try {
      const savedNotifications = localStorage.getItem('local_notifications');
      if (savedNotifications) {
        setLocalNotifications(JSON.parse(savedNotifications));
      }
    } catch (e) {
      // Игнорируем ошибки загрузки локальных уведомлений
    }
  }, []);
  
  // Функция для переключения состояния развернутости уведомления
  const toggleNotificationExpand = (notificationId) => {
    setExpandedNotifications(prev => ({
      ...prev,
      [notificationId]: !prev[notificationId]
    }));
  };
  
  return (
    <Navbar 
      maxWidth="xl" 
      isBordered
      className="bg-gradient-to-r from-blue-50 to-indigo-50 shadow-sm"
      onMenuOpenChange={setIsMenuOpen}
    >
      {/* Логотип и меню-гамбургер для мобильных устройств */}
      <NavbarContent className="sm:hidden">
        <NavbarMenuToggle 
          aria-label={isMenuOpen ? "Закрыть меню" : "Открыть меню"} 
          className="sm:hidden" 
        />
        <NavbarBrand>
          <Link to="/" className="flex items-center">
            <div className="transition-all hover:scale-105">
              <Logo size="medium" variant="full" />
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>
      
      {/* Логотип для десктопа */}
      <NavbarContent className="hidden sm:flex">
        <NavbarBrand>
          <Link to="/" className="flex items-center">
            <div className="transition-all hover:scale-105">
              <Logo size="medium" variant="full" />
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>
      
      {/* ИСПРАВЛЕНИЕ CLS: Ссылки навигации для десктопа БЕЗ layout shift */}
      <NavbarContent 
        className="hidden sm:flex gap-4" 
        justify="center"
        style={{
          /* ИСПРАВЛЕНИЕ CLS: Фиксированные размеры для предотвращения layout shift */
          contain: 'layout style paint',
          willChange: 'contents',
          minHeight: '40px',
          alignItems: 'center'
        }}
      >
        <NavbarItem>
          <Link 
            to="/about" 
            className="text-gray-700 hover:text-primary transition-colors relative group"
          >
            {t('aboutTitle')}
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
          </Link>
        </NavbarItem>
        
        {isAuthenticated && (
          <>
            <NavbarItem>
              <Link to="/" className="text-gray-700 hover:text-primary transition-colors relative group">
                {t('home')}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </NavbarItem>
            
            {user?.role === 'patient' && (
              <NavbarItem>
                <Link to="/search-doctors" className="text-gray-700 hover:text-primary transition-colors relative group">
                  {t('findDoctor')}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </NavbarItem>
            )}
            
            {user?.role === 'admin' && (
              <NavbarItem>
                <Link to="/admin" className="text-gray-700 hover:text-purple-600 transition-colors relative group">
                  {t('adminPanel')}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </NavbarItem>
            )}
            
            {user?.role !== 'admin' && (
              <NavbarItem>
                <Badge content={totalUnread > 0 ? totalUnread : null} color="danger" shape="circle" size="sm">
                  <Link to="/history" className="text-gray-700 hover:text-primary transition-colors relative group">
                    {t('history')}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                </Badge>
              </NavbarItem>
            )}
            
            {user?.role !== 'admin' && (
              <NavbarItem>
                <Link to="/tablets" className="text-gray-700 hover:text-primary transition-colors relative group">
                  {t('tablets', 'Таблетки')}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </NavbarItem>
            )}
            
            {user?.role !== 'admin' && (
              <NavbarItem>
                <Link to="/clinics" className="text-gray-700 hover:text-primary transition-colors relative group">
                  {t('clinics', 'Клиники')}
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </NavbarItem>
            )}
          </>
        )}
      </NavbarContent>
      
      {/* Правая часть навигации */}
      <NavbarContent justify="end">
        {isAuthenticated ? (
          <>
            {/* Селектор языка для авторизованных */}
            <NavbarItem className="hidden md:flex">
              <LanguageSelector variant="button" />
            </NavbarItem>
            
            {/* Dropdown для уведомлений */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <Button 
                  variant="light" 
                  isIconOnly 
                  aria-label="Уведомления"
                  className="relative flex items-center justify-center"
                  style={{ width: '40px', height: '40px', minWidth: '40px', padding: '0' }}
                >
                  <NotificationIcon isAnimated={notificationBell} />
                  
                  {unreadCount > 0 && (
                    <Badge 
                      color="danger" 
                      content={unreadCount > 99 ? '99+' : unreadCount} 
                      placement="top-right"
                      className="animate-pulse"
                    />
                  )}
                </Button>
              </DropdownTrigger>
              <DropdownMenu 
                aria-label="Уведомления" 
                className="w-96 max-h-[70vh] overflow-auto"
                emptyContent={
                  <div className="py-6 text-center text-gray-500">
                    <p>У вас нет уведомлений</p>
                  </div>
                }
              >
                <DropdownItem isReadOnly className="py-2 sticky top-0 bg-white z-10 shadow-sm" textValue="Заголовок уведомлений">
                  <div className="flex justify-between items-center">
                    <p className="font-medium">{t('notifications')}</p>
                    {notifications.length > 0 && (
                      <Button
                        size="sm"
                        variant="light"
                        color="primary"
                        onPress={async () => {
                          try {
                            await api.post('/api/notifications/mark-all-read');
                            fetchNotifications();
                          } catch (error) {
                            // Игнорируем ошибки отметки всех как прочитанные
                          }
                        }}
                      >
                        {t('markAllRead')}
                      </Button>
                    )}
                  </div>
                </DropdownItem>
                <DropdownItem isReadOnly className="h-px bg-gray-200 my-1" textValue="Разделитель" />
                
                {notifications.length > 0 ? (
                  notifications.map((notification) => {
                    const isExpanded = expandedNotifications[notification.id] || false;
                    const needsExpand = notification.message && notification.message.length > 120;
                    
                    return (
                      <DropdownItem
                        key={`notification-${notification.id}-${notification.created_at}`}
                        textValue={`${notification.title}: ${notification.message}`}
                        className={`py-3 ${!notification.is_viewed ? 'bg-blue-50' : ''}`}
                        onClick={(e) => {
                          // Предотвращаем стандартное поведение клика для кнопки {t(1)}
                          if (e.target.closest('.expand-button')) {
                            e.stopPropagation();
                            e.preventDefault();
                          } else {
                            markAsRead(notification.id);
                          }
                        }}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between">
                            <p className="font-medium">{notification.title}</p>
                            {!notification.is_viewed && (
                              <Badge color="primary" variant="flat" size="sm">{t('newNotification')}</Badge>
                            )}
                          </div>
                          <div>
                            <p className={`text-sm text-gray-600 ${!isExpanded && needsExpand ? 'line-clamp-3' : ''}`}>
                              {notification.message}
                            </p>
                            {needsExpand && (
                              <Button 
                                className="expand-button p-0 h-auto min-w-0 mt-1"
                                size="sm" 
                                variant="light" 
                                color="primary"
                                onClick={() => toggleNotificationExpand(notification.id)}
                              >
                                {isExpanded ? t('collapse') : t('expand')}
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.created_at).toLocaleString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </DropdownItem>
                    );
                  })
                ) : null}
              </DropdownMenu>
            </Dropdown>
            
            {/* Индикатор статуса соединения с сервером звонков */}
            <NavbarItem className="hidden lg:flex">
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-gradient-to-r from-blue-50 to-indigo-50 border border-gray-200">
                <div 
                  className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-green-500' : 
                    connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
                    'bg-red-500'
                  }`} 
                />
                <span className="text-xs text-gray-600">
                  {connectionStatus === 'connected' ? '📞' : 
                   connectionStatus === 'connecting' ? '🔄' : 
                   '❌'}
                </span>
              </div>
            </NavbarItem>
            
            {/* Dropdown с аватаром пользователя */}
            <Dropdown placement="bottom-end">
              <DropdownTrigger>
                <div className="flex items-center gap-2 cursor-pointer p-2 transition-all duration-200 rounded-full hover:bg-default-100">
                  <AvatarWithFallback
                    src={user?.avatar_path || profileImage}
                    name={getAvatarText()}
                    size="sm"
                    className="cursor-pointer user-avatar"
                    color="primary"
                  />
                </div>
              </DropdownTrigger>
              
              <DropdownMenu aria-label="Профиль пользователя" className="shadow-xl rounded-xl" onAction={(key) => {
                if (key === 'profile') handleProfileClick();
                if (key === 'profile-settings') handleProfileClick();
                if (key === 'history') handleHistoryClick();
                if (key === 'tablets') handleMobileNavigation('/tablets');
                if (key === 'clinics') handleMobileNavigation('/clinics');
                if (key === 'search') handleSearchDoctorsClick();
                if (key === 'admin-panel') navigate('/admin');
                if (key === 'logout') handleLogout();
              }}>
                <DropdownItem key="profile" textValue={t('profile')} className="py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold">{user?.profile?.firstName || user?.email}</span>
                    <span className="text-xs text-gray-500">{user?.email}</span>
                  </div>
                </DropdownItem>
                
                <DropdownItem key="role" textValue={t('role')} className="text-gray-500 text-xs py-2" isReadOnly>
                  {user?.role === 'patient' ? t('patient') : 
                   user?.role === 'doctor' ? t('doctor') : 
                   user?.role === 'admin' ? t('admin') : t('user')}
                </DropdownItem>
                
                <DropdownItem key="divider" textValue="Разделитель" className="h-px bg-gray-200 my-1" isReadOnly/>
                
                {user?.role !== 'admin' && (
                  <DropdownItem key="profile-settings" textValue={t('profileSettings')} className="py-2.5 hover:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {t('profileSettings')}
                    </div>
                  </DropdownItem>
                )}
                
                {user?.role === 'admin' && (
                  <DropdownItem key="admin-panel" textValue={t('adminPanel')} className="py-2.5 hover:bg-purple-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('adminPanel')}
                    </div>
                  </DropdownItem>
                )}
                
                {user?.role !== 'admin' && (
                  <DropdownItem key="history" textValue={t('history')} className="py-2.5 hover:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('history')}
                    </div>
                  </DropdownItem>
                )}
                
                {user?.role !== 'admin' && (
                  <DropdownItem key="tablets" textValue={t('tablets', 'Таблетки')} className="py-2.5 hover:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      {t('tablets', 'Таблетки')}
                    </div>
                  </DropdownItem>
                )}
                
                {user?.role !== 'admin' && (
                  <DropdownItem key="clinics" textValue={t('clinics', 'Клиники')} className="py-2.5 hover:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {t('clinics', 'Клиники')}
                    </div>
                  </DropdownItem>
                )}
                
                {user?.role === 'patient' && (
                  <DropdownItem key="search" textValue={t('findDoctor')} className="py-2.5 hover:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {t('findDoctor')}
                    </div>
                  </DropdownItem>
                )}
                
                <DropdownItem key="logout" textValue={t('logout')} color="danger" className="py-2.5">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    {t('logout')}
                  </div>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </>
        ) : (
          <>
            <NavbarItem className="hidden lg:flex">
              <LanguageSelector variant="button" className="mr-2" />
            </NavbarItem>
            <NavbarItem className="hidden lg:flex">
              <Link to="/login">
                <Button color="primary" variant="flat">
                  {t('login')}
                </Button>
              </Link>
            </NavbarItem>
            <NavbarItem>
              <Link to="/register">
                <Button color="primary" variant="solid">
                  {t('register')}
                </Button>
              </Link>
            </NavbarItem>
          </>
        )}
      </NavbarContent>
      
      {/* Мобильное меню */}
      <NavbarMenu className="bg-gradient-to-b from-blue-50 to-white pt-6">
        {isAuthenticated ? (
          <>
            <NavbarMenuItem>
              <button 
                onClick={() => handleMobileNavigation('/about')} 
                className="w-full py-3 text-left text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-blue-50 px-3"
              >
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{t('aboutTitle', 'О нас')}</span>
                </div>
              </button>
            </NavbarMenuItem>
            
            <NavbarMenuItem>
              <button 
                onClick={() => handleMobileNavigation('/')} 
                className="w-full py-3 text-left text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-blue-50 px-3"
              >
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                                      <span className="font-medium">{t('home')}</span>
                </div>
              </button>
            </NavbarMenuItem>
            
            {user?.role === 'admin' && (
              <NavbarMenuItem>
                <button 
                  onClick={() => handleMobileNavigation('/admin')} 
                  className="w-full py-3 text-left text-gray-700 hover:text-purple-600 transition-colors rounded-lg hover:bg-purple-50 px-3"
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{t('adminPanel')}</span>
                  </div>
                </button>
              </NavbarMenuItem>
            )}
            
            {user?.role === 'patient' && (
              <NavbarMenuItem>
                <button 
                  onClick={() => handleMobileNavigation('/search-doctors')} 
                  className="w-full py-3 text-left text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-blue-50 px-3"
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span className="font-medium">{t('findDoctor')}</span>
                  </div>
                </button>
              </NavbarMenuItem>
            )}
            
            {user?.role !== 'admin' && (
              <NavbarMenuItem>
                <button 
                  onClick={() => handleMobileNavigation('/history')} 
                  className="w-full py-3 text-left text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-blue-50 px-3"
                >
                  <div className="flex items-center gap-3 justify-between">
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">{t('history')}</span>
                    </div>
                    {totalUnread > 0 && (
                      <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                        {totalUnread}
                      </span>
                    )}
                  </div>
                </button>
              </NavbarMenuItem>
            )}
            
            {user?.role !== 'admin' && (
              <NavbarMenuItem>
                <button 
                  onClick={() => handleMobileNavigation('/tablets')} 
                  className="w-full py-3 text-left text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-blue-50 px-3"
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    <span className="font-medium">{t('tablets', 'Таблетки')}</span>
                  </div>
                </button>
              </NavbarMenuItem>
            )}
            
            {user?.role !== 'admin' && (
              <NavbarMenuItem>
                <button 
                  onClick={() => handleMobileNavigation('/clinics')} 
                  className="w-full py-3 text-left text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-blue-50 px-3"
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="font-medium">{t('clinics', 'Клиники')}</span>
                  </div>
                </button>
              </NavbarMenuItem>
            )}
            
            {user?.role !== 'admin' && (
              <NavbarMenuItem>
                <button 
                  onClick={() => handleMobileNavigation('/profile')} 
                  className="w-full py-3 text-left text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-blue-50 px-3"
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="font-medium">{t('profileSettings')}</span>
                  </div>
                </button>
              </NavbarMenuItem>
            )}
            
            <NavbarMenuItem>
              <div className="w-full py-3 px-3">
                <div className="flex items-center gap-3 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span className="text-gray-700 font-medium">{t('language')}</span>
                </div>
                <div className="ml-8">
                  <LanguageSelector variant="dropdown" className="w-full" />
                </div>
              </div>
            </NavbarMenuItem>
            
            <NavbarMenuItem>
              <button 
                onClick={handleLogout} 
                className="w-full py-3 text-left text-red-600 hover:text-red-700 transition-colors rounded-lg hover:bg-red-50 px-3"
              >
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-medium">{t('logout')}</span>
                </div>
              </button>
            </NavbarMenuItem>
          </>
        ) : (
          // Меню для неавторизованных пользователей
          <>
            <NavbarMenuItem>
              <button 
                onClick={() => handleMobileNavigation('/about')} 
                className="w-full py-3 text-left text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-blue-50 px-3"
              >
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{t('aboutTitle', 'О нас')}</span>
                </div>
              </button>
            </NavbarMenuItem>
            
            <NavbarMenuItem>
              <button 
                onClick={() => handleMobileNavigation('/login')} 
                className="w-full py-3 text-left text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-blue-50 px-3"
              >
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="font-medium">{t('login')}</span>
                </div>
              </button>
            </NavbarMenuItem>
            
            <NavbarMenuItem>
              <button 
                onClick={() => handleMobileNavigation('/register')} 
                className="w-full py-3 text-left text-gray-700 hover:text-primary transition-colors rounded-lg hover:bg-blue-50 px-3"
              >
                <div className="flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <span className="font-medium">{t('register')}</span>
                </div>
              </button>
            </NavbarMenuItem>
            
            <NavbarMenuItem>
              <div className="w-full py-3 px-3">
                <div className="flex items-center gap-3 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  <span className="text-gray-700 font-medium">{t('language')}</span>
                </div>
                <div className="ml-8">
                  <LanguageSelector variant="dropdown" className="w-full" />
                </div>
              </div>
            </NavbarMenuItem>
                     </>
         )}
      </NavbarMenu>
    </Navbar>
  );
}

export default Header; 