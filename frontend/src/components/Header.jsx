import React, { useState, useEffect, useRef } from 'react';
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
import webSocketService from '../services/webSocketService';
import AvatarWithFallback from './AvatarWithFallback';

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
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // Используем useRef для отслеживания установленного соединения
  const wsInitializedRef = useRef(false);
  
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
  
  // Обработчик сообщений от WebSocket
  const handleWebSocketMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'new_notification') {
        console.log('Получено новое уведомление через WebSocket:', data.notification);
        
        // Проверяем, нет ли уже такого уведомления в списке
        setNotifications(prev => {
          // Проверяем, есть ли уже уведомление с таким ID
          const exists = prev.some(n => n.id === data.notification.id);
          if (exists) {
            // Если уведомление уже есть, возвращаем текущий список
            return prev;
          }
          // Иначе добавляем новое уведомление в начало списка
          return [data.notification, ...prev];
        });
        
        // Увеличиваем счетчик непрочитанных
        setUnreadCount(prev => prev + 1);
      } else if (data.type === 'pong') {
        // Получен ответ на пинг - соединение активно
        console.debug('WebSocket пинг успешен');
      }
    } catch (error) {
      console.error('Ошибка при обработке WebSocket сообщения:', error);
    }
  };
  
  // При изменении пользователя или каждую минуту проверяем уведомления и непрочитанные сообщения
  useEffect(() => {
    // Если пользователь не авторизован или нет ID, не делаем ничего
    if (!user || !user.id) {
      return;
    }
    
    let notificationInterval;
    let chatInterval;
    
    // Инициализируем WebSocket соединение для уведомлений только один раз
    const initWs = async () => {
      // Проверяем, инициализировано ли соединение
      if (!wsInitializedRef.current) {
        console.log('[Header] Инициализация WebSocket соединения для уведомлений');
        await webSocketService.getNotificationConnection(
          user.id, 
          handleWebSocketMessage,
          setConnectionStatus
        );
        wsInitializedRef.current = true;
      } else {
        console.log('[Header] WebSocket соединение для уведомлений уже инициализировано');
      }
    };
    
    // Загружаем начальные данные и запускаем инициализацию WebSocket
    const initData = async () => {
      await initWs();
      await fetchNotifications();
      await fetchUnreadCounts();
    };
    
    initData();
    
    // Периодическая проверка уведомлений и сообщений (как резервный вариант)
    notificationInterval = setInterval(fetchNotifications, 120000); // 2 минуты
    chatInterval = setInterval(fetchUnreadCounts, 120000); // 2 минуты
    
    // Очищаем интервалы при размонтировании
    return () => {
      if (notificationInterval) clearInterval(notificationInterval);
      if (chatInterval) clearInterval(chatInterval);
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary mr-1">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">MedCare</span>
            </div>
          </Link>
        </NavbarBrand>
      </NavbarContent>
      
      {/* Логотип для десктопа */}
      <NavbarContent className="hidden sm:flex">
        <NavbarBrand>
          <Link to="/" className="flex items-center">
            <div className="flex items-center gap-2 transition-all hover:scale-105">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-primary mr-1">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">MedCare</span>
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
                  isIconOnly
                  variant="light"
                  className="rounded-full"
                >
                  <Badge content={unreadCount || null} color="danger" shape="circle" size="sm">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                    </svg>
                  </Badge>
                </Button>
              </DropdownTrigger>
              <DropdownMenu 
                aria-label="Уведомления" 
                className="w-80"
                emptyContent={
                  <div className="py-6 text-center text-gray-500">
                    <p>У вас нет уведомлений</p>
                  </div>
                }
              >
                <DropdownItem isReadOnly className="py-2">
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
                <DropdownItem isReadOnly className="h-px bg-gray-200 my-1" />
                
                {notifications.length > 0 ? (
                  notifications.slice(0, 5).map((notification) => (
                    <DropdownItem
                      key={notification.id}
                      className={`py-3 ${!notification.is_viewed ? 'bg-blue-50' : ''}`}
                      onPress={() => markAsRead(notification.id)}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between">
                          <p className="font-medium">{notification.title}</p>
                          {!notification.is_viewed && (
                            <Badge color="primary" variant="flat" size="sm">Новое</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(notification.created_at).toLocaleString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </DropdownItem>
                  ))
                ) : null}
                
                {notifications.length > 5 && (
                  <DropdownItem onPress={() => navigate('/notifications')}>
                    <p className="text-center text-primary">Показать все уведомления</p>
                  </DropdownItem>
                )}
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
                    className="cursor-pointer"
                    color="primary"
                  />
                  {connectionStatus === 'connected' && (
                    <span className="hidden sm:block text-xs text-default-500 opacity-70 -mr-1">●</span>
                  )}
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
                
                <DropdownItem key="divider" textValue="Divider" className="h-px bg-gray-200 my-1" isReadOnly/>
                
                {user?.role !== 'admin' && (
                  <DropdownItem key="profile-settings" className="py-2.5 hover:bg-blue-50">
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
                  <DropdownItem key="admin-panel" className="py-2.5 hover:bg-purple-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Админ-панель
                    </div>
                  </DropdownItem>
                )}
                
                {user?.role !== 'admin' && (
                  <DropdownItem key="history" className="py-2.5 hover:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      История
                    </div>
                  </DropdownItem>
                )}
                
                {user?.role === 'patient' && (
                  <DropdownItem key="search" className="py-2.5 hover:bg-blue-50">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Найти врача
                    </div>
                  </DropdownItem>
                )}
                
                <DropdownItem key="logout" color="danger" className="py-2.5">
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