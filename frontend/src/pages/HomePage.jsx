// frontend/src/pages/HomePage.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Avatar } from '@nextui-org/react';
import useAuthStore from '../stores/authStore';
import GoogleProfileForm from '../components/GoogleProfileForm';
import { ApplicationStatusTracker } from '../components/Notification';
import { motion, AnimatePresence } from 'framer-motion';

function HomePage() {
  const user = useAuthStore(state => state.user);
  const needsProfileUpdate = useAuthStore(state => state.needsProfileUpdate);
  const token = useAuthStore(state => state.token);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const navigate = useNavigate();
  const authError = useAuthStore(state => state.error);
  
  // Добавляем log при монтировании компонента
  useEffect(() => {
    console.log('HomePage: Mounted with user state:', {
      hasUser: !!user,
      needsProfileUpdate,
      hasToken: !!token,
      isAuthenticated,
      isLoading,
      userData: user
    });
    
    // Добавляем подробный лог данных пользователя для отладки аватарки
    if (user) {
      console.log('HomePage: User data details:', {
        avatar_path: user.avatar_path,
        avatar: user.avatar,
        avatarUrl: user.avatarUrl,
        photo: user.photo,
        photoUrl: user.photoUrl,
        profileImage: user.profileImage,
        image: user.image,
        name: user.name,
        email: user.email,
        fullUserObject: user
      });
    }
  }, [user, needsProfileUpdate, token, isAuthenticated, isLoading]);
  
  // Перенаправляем на страницу логина, если есть ошибка аутентификации
  useEffect(() => {
    if (authError) {
      console.log("HomePage: Authentication error detected, redirecting to login page");
      navigate('/login');
    }
  }, [authError, navigate]);
  
  // Логи на каждое изменение ключевых данных
  useEffect(() => {
    console.log('HomePage: User state changed:', {
      hasUser: !!user,
      userData: user,
      isAuthenticated
    });
  }, [user, isAuthenticated]);
  
  // Если есть ошибка аутентификации, не рендерим содержимое страницы
  if (authError) {
    console.log('HomePage: Not rendering due to auth error');
    return null;
  }
  
  // Если требуется обновление профиля, показываем форму
  if (needsProfileUpdate) {
    console.log('HomePage: Showing profile update form');
    
    const handleProfileCompletion = (userData) => {
      console.log('HomePage: Profile updated successfully', userData);
      
      // Явно сбрасываем флаг needsProfileUpdate
      useAuthStore.setState({ needsProfileUpdate: false });
      console.log('HomePage: Set needsProfileUpdate = false');
      
      // Перезагружаем состояние без полной перезагрузки страницы
      setTimeout(() => {
        // Проверяем, что флаг действительно сброшен
        const currentNeedsUpdate = useAuthStore.getState().needsProfileUpdate;
        console.log('HomePage: Current needsProfileUpdate value:', currentNeedsUpdate);
        
        if (!currentNeedsUpdate) {
          // Принудительно обновляем компонент, не перезагружая страницу
          window.location.href = '/';
        } else {
          // Если по какой-то причине флаг не сбросился, перезагрузим страницу
          window.location.reload();
        }
      }, 500);
    };
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 py-12 px-4">
        <div className="w-full max-w-2xl">
          <GoogleProfileForm onCompleted={handleProfileCompletion} />
        </div>
      </div>
    );
  }
  
  console.log('HomePage: Rendering main content with user role:', user?.role);
  
  // Если пользователь администратор, показываем специальную страницу администратора
  if (user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <div className="max-w-screen-xl mx-auto px-4 py-12">
          {/* Приветствие для администратора */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600 mb-2">
              Панель администратора
            </h1>
            <p className="text-gray-600">
              Управление системой и пользователями
            </p>
          </div>
          
          {/* Карточки для администратора */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Card className="hover:shadow-lg transition-shadow">
              <CardBody className="p-6 flex flex-col items-center text-center">
                <div className="text-4xl mb-4">⚙️</div>
                <h3 className="text-xl font-semibold mb-2 text-purple-600">Административная панель</h3>
                <p className="text-gray-600 mb-4">Управление пользователями и заявками врачей</p>
                <Button 
                  color="secondary" 
                  className="mt-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
                  onPress={() => navigate('/admin')}
                >
                  Перейти в админ-панель
                </Button>
              </CardBody>
            </Card>
            
            <Card className="hover:shadow-lg transition-shadow">
              <CardBody className="p-6 flex flex-col items-center text-center">
                <div className="text-4xl mb-4">📈</div>
                <h3 className="text-xl font-semibold mb-2 text-purple-600">Аналитика системы</h3>
                <p className="text-gray-600 mb-4">Статистика использования платформы</p>
                <Button 
                  color="secondary" 
                  className="mt-auto"
                  onPress={() => alert('Функционал в разработке')}
                >
                  В разработке
                </Button>
              </CardBody>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  
  // Определяем приветствие в зависимости от роли
  const welcomeText = user?.role === 'doctor' 
    ? 'Добро пожаловать в ваш личный кабинет врача!' 
    : 'Добро пожаловать в ваш личный кабинет!';
  
  // Карточки для пациента
  const patientCards = [
    {
      title: 'Найти врача',
      description: 'Поиск врачей по специализации и записаться на консультацию',
      icon: '🔍',
      action: () => navigate('/search-doctors')
    },
    {
      title: 'История консультаций',
      description: 'Просмотр истории ваших консультаций и платежей',
      icon: '📋',
      action: () => navigate('/history')
    },
    {
      title: 'Настройки профиля',
      description: 'Обновление личной информации и настройки аккаунта',
      icon: '⚙️',
      action: () => navigate('/profile')
    }
  ];
  
  // Карточки для врача
  const doctorCards = [
    {
      title: 'Мои консультации',
      description: 'Управление текущими и предстоящими консультациями',
      icon: '📅',
      action: () => navigate('/history')
    },
    {
      title: 'Настройки профиля',
      description: 'Обновление профессиональной информации и расписания',
      icon: '⚙️',
      action: () => navigate('/profile')
    },
    {
      title: 'Аналитика',
      description: 'Статистика консультаций и отзывы пациентов',
      icon: '📊',
      action: () => alert('Функционал в разработке')
    }
  ];
  
  // Выбираем набор карточек в зависимости от роли
  const serviceCards = user?.role === 'doctor' ? doctorCards : patientCards;

  console.log('HomePage: Rendering content');

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Динамический градиентный фон */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-0"
        animate={{ 
          background: [
            'linear-gradient(to bottom right, rgba(239, 246, 255, 0.8), rgba(224, 231, 255, 0.8), rgba(237, 233, 254, 0.8))',
            'linear-gradient(to bottom right, rgba(224, 242, 254, 0.8), rgba(219, 234, 254, 0.8), rgba(224, 231, 255, 0.8))',
            'linear-gradient(to bottom right, rgba(236, 254, 255, 0.8), rgba(224, 242, 254, 0.8), rgba(219, 234, 254, 0.8))',
            'linear-gradient(to bottom right, rgba(239, 246, 255, 0.8), rgba(224, 231, 255, 0.8), rgba(237, 233, 254, 0.8))'
          ]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
      />
      
      {/* Анимированная сетка */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <motion.div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px), 
                             linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
          animate={{
            x: [0, -40],
            y: [0, -40]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
      
      {/* Декоративные плавающие элементы */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-70">
        <motion.div 
          className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-gradient-to-r from-blue-300/20 to-indigo-300/20"
          animate={{
            y: [0, 20, 0],
            scale: [1, 1.05, 1],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute bottom-20 right-[10%] w-80 h-80 rounded-full bg-gradient-to-r from-purple-300/20 to-indigo-300/20"
          animate={{
            y: [0, -25, 0],
            scale: [1, 1.05, 1],
            rotate: [0, -5, 0, 5, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute top-1/3 right-[15%] w-40 h-40 rounded-full bg-gradient-to-r from-indigo-300/20 to-blue-300/20"
          animate={{
            x: [0, 15, 0],
            y: [0, -10, 0],
            rotate: [0, 10, 0]
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute bottom-1/4 left-[20%] w-56 h-56 rounded-full bg-gradient-to-r from-cyan-300/20 to-teal-300/20"
          animate={{
            x: [0, -20, 0],
            y: [0, 15, 0],
            rotate: [0, -8, 0]
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {/* Декоративные медицинские элементы */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div 
          className="absolute top-20 right-10 medical-cross w-10 h-10 opacity-10"
          animate={{ 
            rotate: [0, 45, 0, -45, 0],
            scale: [1, 1.1, 1, 0.9, 1]
          }}
          transition={{ 
            duration: 10, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        <motion.div 
          className="absolute bottom-20 left-20 medical-cross w-16 h-16 opacity-10"
          animate={{ 
            rotate: [0, -45, 0, 45, 0],
            scale: [1, 0.9, 1, 1.1, 1]
          }}
          transition={{ 
            duration: 12, 
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        
        <motion.div 
          className="absolute top-1/3 left-10 w-40 h-40 rounded-full bg-red-100/10"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
      </div>
      
      <div className="max-w-screen-xl mx-auto px-4 py-12 relative z-10">
        {/* Компонент уведомлений о статусе заявок */}
        <ApplicationStatusTracker />

        {/* Приветствие */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-5 flex justify-center">
            <motion.div
              className="relative inline-block"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.h1 
                className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                Soglom
              </motion.h1>
              <motion.div 
                className="absolute -z-10 -inset-1 rounded-lg bg-gradient-to-r from-blue-600/20 to-indigo-600/20"
                animate={{ 
                  opacity: [0.5, 0.8, 0.5],
                  scale: [1, 1.05, 1]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-3 flex justify-center items-center"
          >
            <div className="relative">
              {/* Получаем правильный URL аватарки */}
              {(() => {
                // Базовый URL API, если требуется
                const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
                
                // Получаем URL аватарки из объекта пользователя
                let avatarUrl = user?.avatar_path || user?.avatar || user?.avatarUrl || user?.photo || user?.photoUrl || user?.profileImage || user?.image;
                
                // Если аватарка существует, но не начинается с http, добавляем базовый URL
                if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
                  // Убираем слеш в начале пути, если он есть
                  if (avatarUrl.startsWith('/')) {
                    avatarUrl = avatarUrl.substring(1);
                  }
                  avatarUrl = `${apiBaseUrl}/${avatarUrl}`;
                }
                
                console.log('HomePage: Final avatar URL:', avatarUrl);
                
                return (
                  <Avatar 
                    src={avatarUrl || "https://i.pravatar.cc/150?img=3"} // Используем запасное изображение, если аватарка не найдена
                    className="w-24 h-24 shadow-xl border-4 border-white"
                  />
                );
              })()}
              
              <motion.div 
                className="absolute -inset-3 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20"
                animate={{ 
                  scale: [1, 1.1, 1],
                  opacity: [0.6, 0.3, 0.6]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </motion.div>
          
          <motion.h2 
            className="text-3xl font-bold text-gray-800 mb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {welcomeText}
          </motion.h2>
          
          <motion.p 
            className="text-lg text-gray-600 max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <span className="bg-gradient-to-r from-gray-700 to-gray-500 bg-clip-text text-transparent font-medium">
              {user?.role === 'doctor' 
                ? 'Здесь вы можете управлять консультациями и настраивать ваш профиль.'
                : 'Здесь вы можете искать врачей, управлять консультациями и просматривать историю.'
              }
            </span>
          </motion.p>
        </motion.div>
        
        {/* Уведомление о необходимости подтверждения email */}
        {user && !user.is_active && (
          <motion.div 
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-amber-50 border-l-4 border-amber-500 shadow-lg overflow-hidden">
              <motion.div 
                className="h-1 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
              />
              <CardBody className="p-6">
                <div className="flex items-start">
                  <div className="mr-4 text-warning text-2xl">
                    <motion.svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-8 w-8" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      animate={{ 
                        scale: [1, 1.1, 1],
                      }}
                      transition={{ 
                        duration: 1.5, 
                        repeat: Infinity,
                        ease: "easeInOut" 
                      }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </motion.svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-warning mb-1">Требуется подтверждение Email</h3>
                    <p className="text-gray-700 mb-2">
                      Вы не можете использовать полный функционал платформы, пока не подтвердите свой Email.
                      Пожалуйста, проверьте вашу почту и перейдите по ссылке в письме.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        size="sm" 
                        color="warning" 
                        variant="flat"
                        onPress={() => navigate('/verify-email')}
                        className="hover:bg-amber-200 transition-all"
                      >
                        Подробнее
                      </Button>
                      <Button
                        size="sm"
                        color="default"
                        variant="light"
                        onPress={() => window.location.href = 'mailto:support@example.com'}
                        className="hover:bg-gray-100 transition-all"
                      >
                        Возникли проблемы?
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        )}
        
        {/* Карточки сервисов */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {serviceCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * (index + 1) }}
              whileHover={{ y: -8, transition: { type: "spring", stiffness: 300 } }}
            >
              <Card className="bg-white/90 border border-white/30 shadow-2xl overflow-hidden framer-motion-card">
                {/* Анимированная линия вверху */}
                <motion.div 
                  className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.2 * (index + 1), duration: 0.8 }}
                />
                
                {/* Световые блики */}
                <div className="absolute -top-10 -left-10 w-20 h-20 rounded-full bg-pink-400/20 mix-blend-multiply opacity-50"></div>
                <div className="absolute -bottom-10 -right-10 w-20 h-20 rounded-full bg-blue-400/20 mix-blend-multiply opacity-50"></div>
                
                <CardBody className="p-6 flex flex-col items-center text-center">
                  <motion.div 
                    className="relative w-16 h-16 flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full mb-4"
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <span className="text-4xl">{card.icon}</span>
                    <motion.div
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/30 to-indigo-500/30"
                      animate={{ 
                        scale: [1, 1.2, 1],
                        opacity: [0.2, 0.1, 0.2]
                      }}
                      transition={{
                        duration: 2 + index,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    />
                  </motion.div>
                  
                  <h3 className="text-xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">{card.title}</h3>
                  <p className="text-gray-600 mb-4">{card.description}</p>
                  
                  <Button 
                    color="primary" 
                    className="mt-auto bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-xl transition-all"
                    onPress={card.action}
                  >
                    Перейти
                  </Button>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </div>
        
        {/* Ссылки на помощь */}
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <motion.p
            className="text-sm text-gray-600"
            whileHover={{ scale: 1.05 }}
          >
            Нужна помощь? 
            <motion.a 
              href="#" 
              className="ml-1 text-primary relative inline-block font-medium"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10">Связаться с поддержкой</span>
              <motion.span 
                className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 origin-left"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.a>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}

export default HomePage;