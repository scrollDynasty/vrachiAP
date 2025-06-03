import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
import '../styles/AppIcon.css'; // Импортируем наши стили
import { motion } from 'framer-motion';
import { PulseLoader } from 'react-spinners';
import { useTheme } from 'next-themes';
import soundService from '../services/soundService'; // Импортируем soundService
import NotificationIcon from './NotificationIcon'; // Импортируем новый компонент для иконки уведомления

function Header() {
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const { totalUnread, fetchUnreadCounts } = useChatStore();
  const navigate = useNavigate();
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
      console.error('Ошибка при чтении фото профиля из localStorage:', error);
    }

    // Добавляем слушатель события для обновления изображения профиля
    const handleProfileImageUpdate = (event) => {
      const { profileImage } = event.detail;
      console.log('Header: Получено событие обновления аватарки:', profileImage);
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
          console.log('[Header] Запрашиваем разрешения на браузерные уведомления');
          try {
            const permission = await Notification.requestPermission();
            console.log('[Header] Результат запроса разрешений:', permission);
          } catch (error) {
            console.error('[Header] Ошибка при запросе разрешений:', error);
          }
        } else {
          console.log('[Header] Статус разрешений на уведомления:', Notification.permission);
        }
      } else {
        console.log('[Header] Браузер не поддерживает уведомления');
      }
    };
    
    initData();
    
    // Слушаем кастомные события от NotificationWebSocket для добавления уведомлений
    const handleNewNotification = (event) => {
      const notification = event.detail;
      console.log('[Header] Получено новое уведомление через событие:', notification);
      
      // Добавляем уведомление в локальный список, если его еще нет
      setNotifications(prev => {
        // Проверяем, нет ли уже такого уведомления
        const exists = prev.some(n => n.id === notification.id);
        if (exists) {
          console.log('[Header] Уведомление уже существует в списке');
          return prev;
        }
        
        // Добавляем новое уведомление в начало списка
        return [notification, ...prev];
      });
      
      // Проигрываем звук (дублируется с NotificationWebSocket, но это нормально для надежности)
      try {
        soundService.playNotification();
        console.log('[Header] Звук уведомления проигран');
      } catch (error) {
        console.error('[Header] Ошибка воспроизведения звука:', error);
      }
      
      // НЕ отправляем браузерное уведомление отсюда - это делается в NotificationWebSocket
      // Это предотвращает дублирование push-уведомлений
      console.log('[Header] Браузерное уведомление будет отправлено из NotificationWebSocket');
      
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
      console.log('[Header] Очистка при размонтировании или изменении пользователя');
      
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
        console.warn('Получен неожиданный формат данных уведомлений:', response.data);
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
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
      console.error('Failed to mark notification as read:', error);
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
  
  // Обработчики навигации
  const handleProfileClick = () => navigate('/profile');
  const handleHistoryClick = () => navigate('/history');
  const handleSearchDoctorsClick = () => navigate('/search-doctors');
  const handleLogout = () => logout();
  
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
      console.error('Ошибка при загрузке локальных уведомлений:', e);
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
            <div className="flex items-center gap-2 transition-all hover:scale-105">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Soglom</span>
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>
      
      {/* Логотип для десктопа */}
      <NavbarContent className="hidden sm:flex">
        <NavbarBrand>
          <Link to="/" className="flex items-center">
            <div className="flex items-center gap-2 transition-all hover:scale-105">
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">Soglom</span>
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>
      
      {/* Ссылки навигации для десктопа */}
      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        {isAuthenticated && (
          <>
            <NavbarItem>
              <Link to="/" className="text-gray-700 hover:text-primary transition-colors relative group">
                Главная
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </NavbarItem>
            
            {user?.role === 'patient' && (
              <NavbarItem>
                <Link to="/search-doctors" className="text-gray-700 hover:text-primary transition-colors relative group">
                  Найти врача
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </NavbarItem>
            )}
            
            {user?.role === 'admin' && (
              <NavbarItem>
                <Link to="/admin" className="text-gray-700 hover:text-purple-600 transition-colors relative group">
                  Админ-панель
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-purple-600 transition-all duration-300 group-hover:w-full"></span>
                </Link>
              </NavbarItem>
            )}
            
            {user?.role !== 'admin' && (
              <NavbarItem>
                <Badge content={totalUnread > 0 ? totalUnread : null} color="danger" shape="circle" size="sm">
                  <Link to="/history" className="text-gray-700 hover:text-primary transition-colors relative group">
                    История
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                </Badge>
              </NavbarItem>
            )}
          </>
        )}
      </NavbarContent>
      
      {/* Правая часть навигации */}
      <NavbarContent justify="end">
        {isAuthenticated ? (
          <>
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
                    <p className="font-medium">Уведомления</p>
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
                            console.error('Failed to mark all notifications as read:', error);
                          }
                        }}
                      >
                        Отметить все как прочитанные
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
                          // Предотвращаем стандартное поведение клика для кнопки "Подробнее"
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
                              <Badge color="primary" variant="flat" size="sm">Новое</Badge>
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
                                {isExpanded ? 'Свернуть' : 'Подробнее'}
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
                if (key === 'search') handleSearchDoctorsClick();
                if (key === 'admin-panel') navigate('/admin');
                if (key === 'logout') handleLogout();
              }}>
                <DropdownItem key="profile" textValue="Профиль" className="py-3">
                  <div className="flex flex-col">
                    <span className="font-semibold">{user?.profile?.firstName || user?.email}</span>
                    <span className="text-xs text-gray-500">{user?.email}</span>
                  </div>
                </DropdownItem>
                
                <DropdownItem key="role" textValue="Роль" className="text-gray-500 text-xs py-2" isReadOnly>
                  {user?.role === 'patient' ? 'Пациент' : 
                   user?.role === 'doctor' ? 'Врач' : 
                   user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </DropdownItem>
                
                <DropdownItem key="divider" textValue="Разделитель" className="h-px bg-gray-200 my-1" isReadOnly/>
                
                {user?.role !== 'admin' && (
                  <DropdownItem key="profile-settings" textValue="Настройки профиля" className="py-2.5 hover:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Настройки профиля
                    </div>
                  </DropdownItem>
                )}
                
                {user?.role === 'admin' && (
                  <DropdownItem key="admin-panel" textValue="Админ-панель" className="py-2.5 hover:bg-purple-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Админ-панель
                    </div>
                  </DropdownItem>
                )}
                
                {user?.role !== 'admin' && (
                  <DropdownItem key="history" textValue="История" className="py-2.5 hover:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      История
                    </div>
                  </DropdownItem>
                )}
                
                {user?.role === 'patient' && (
                  <DropdownItem key="search" textValue="Найти врача" className="py-2.5 hover:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Найти врача
                    </div>
                  </DropdownItem>
                )}
                
                <DropdownItem key="logout" textValue="Выйти" color="danger" className="py-2.5">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Выйти
                  </div>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </>
        ) : (
          <>
            <NavbarItem className="hidden lg:flex">
              <Link to="/login">
                <Button color="primary" variant="flat">
                  Войти
                </Button>
              </Link>
            </NavbarItem>
            <NavbarItem>
              <Link to="/register">
                <Button color="primary" variant="solid">
                  Регистрация
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
              <Link to="/" className="w-full py-2 text-gray-700 hover:text-primary transition-colors">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Главная
                </div>
              </Link>
            </NavbarMenuItem>
            
            {user?.role === 'admin' && (
              <NavbarMenuItem>
                <Link to="/admin" className="w-full py-2 text-gray-700 hover:text-purple-600 transition-colors">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Админ-панель
                  </div>
                </Link>
              </NavbarMenuItem>
            )}
            
            {user?.role === 'patient' && (
              <NavbarMenuItem>
                <Link to="/search-doctors" className="w-full py-2 text-gray-700 hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Найти врача
                  </div>
                </Link>
              </NavbarMenuItem>
            )}
            
            {user?.role !== 'admin' && (
              <NavbarMenuItem>
                <div className="flex items-center gap-2">
                  <Link to="/history" className="w-full text-gray-700 hover:text-primary text-lg font-medium">
                    История
                  </Link>
                  {totalUnread > 0 && (
                    <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                      {totalUnread}
                    </span>
                  )}
                </div>
              </NavbarMenuItem>
            )}
            
            {user?.role !== 'admin' && (
              <NavbarMenuItem>
                <Link to="/profile" className="w-full py-2 text-gray-700 hover:text-primary transition-colors">
                  <div className="flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Настройки профиля
                  </div>
                </Link>
              </NavbarMenuItem>
            )}
            
            <NavbarMenuItem>
              <div className="w-full py-2 cursor-pointer text-red-600 hover:text-red-700 transition-colors" onClick={handleLogout}>
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Выйти
                </div>
              </div>
            </NavbarMenuItem>
          </>
        ) : null}
      </NavbarMenu>
    </Navbar>
  );
}

export default Header; 