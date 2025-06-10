// frontend/src/pages/HomePage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Chip } from '@nextui-org/react';
import useAuthStore from '../stores/authStore';
import GoogleProfileForm from '../components/GoogleProfileForm';
import { ApplicationStatusTracker } from '../components/Notification';
import { motion } from 'framer-motion';
import { useTranslation } from '../components/LanguageSelector';
import OfflineMode from '../components/OfflineMode';

function HomePage() {
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const needsProfileUpdate = useAuthStore(state => state.needsProfileUpdate);
  const token = useAuthStore(state => state.token);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const navigate = useNavigate();
  const authError = useAuthStore(state => state.error);
  
  // Состояние для отслеживания режима offline
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Перенаправляем на страницу логина, если есть ошибка аутентификации
  useEffect(() => {
    if (authError) {
      navigate('/login');
    }
  }, [authError, navigate]);
  
  // Проверяем состояние пользователя и режим offline
  useEffect(() => {
    // Проверяем, получили ли мы HTML вместо данных пользователя (признак недоступности backend)
    if (user && typeof user === 'string' && user.includes('<!doctype html>')) {
      setIsOfflineMode(true);
    } else if (user && typeof user === 'object' && Object.keys(user).length > 0) {
      setIsOfflineMode(false);
    }
  }, [user, isAuthenticated]);
  
  // Функция для повторной попытки подключения к backend
  const handleRetryConnection = async () => {
    setIsOfflineMode(false);
    
    try {
      // Принудительно переинициализируем авторизацию
      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();
    } catch (error) {
      setIsOfflineMode(true);
    }
  };
  
  // Если есть ошибка аутентификации, не рендерим содержимое страницы
  if (authError) {
    return null;
  }
  
  // Если backend недоступен, показываем offline режим
  if (isOfflineMode && isAuthenticated) {
    return <OfflineMode user={user} onRetry={handleRetryConnection} />;
  }
  
  // Если требуется обновление профиля, показываем форму
  if (needsProfileUpdate) {
    const handleProfileCompletion = (userData) => {
      // Явно сбрасываем флаг needsProfileUpdate
      useAuthStore.setState({ needsProfileUpdate: false });
      
      // Перезагружаем состояние без полной перезагрузки страницы
      setTimeout(() => {
        // Проверяем, что флаг действительно сброшен
        const currentNeedsUpdate = useAuthStore.getState().needsProfileUpdate;
        
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
  
  // Если пользователь администратор, перенаправляем на админ-панель
  if (user?.role === 'admin') {
    navigate('/admin_control_panel_52x9a8');
    return null;
  }
  
  // Карточки для пациента
  const patientCards = [
    {
      title: t('findDoctor'),
      description: t('findDoctorDescription'),
      icon: '🔍',
      action: () => navigate('/search-doctors')
    },
    {
      title: t('history'),
      description: t('historyDescription'),
      icon: '📋',
      action: () => navigate('/history')
    },
    {
      title: t('profileSettings'),
      description: t('profileSettingsDescription'),
      icon: '⚙️',
      action: () => navigate('/profile')
    }
  ];
  
  // Карточки для врача
  const doctorCards = [
    {
      title: t('myConsultations'),
      description: t('myConsultationsDescription'),
      icon: '📅',
      action: () => navigate('/history')
    },
    {
      title: t('profileSettings'),
      description: t('doctorProfileDescription'),
      icon: '⚙️',
      action: () => navigate('/profile')
    },
    {
      title: t('analytics'),
      description: t('analyticsDescription'),
      icon: '📊',
      action: () => alert(t('featureInDevelopment'))
    }
  ];
  
  // Выбираем набор карточек в зависимости от роли
  const serviceCards = user?.role === 'doctor' ? doctorCards : patientCards;

  // Получаем имя пользователя
  const getUserName = () => {
    if (user?.full_name) return user.full_name;
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`;
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return t('user');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
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
            y: [0, 15, 0],
            scale: [1, 1.08, 1],
            rotate: [0, 10, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute bottom-1/4 left-[20%] w-56 h-56 rounded-full bg-gradient-to-r from-cyan-300/20 to-teal-300/20"
          animate={{
            y: [0, -15, 0],
            scale: [1, 1.03, 1],
            rotate: [0, -8, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Компонент уведомлений о статусе заявок */}
        <ApplicationStatusTracker />

        {/* Приветствие */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 flex justify-center">
            <motion.div
              className="relative inline-block"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.h1 
                className="text-4xl sm:text-5xl lg:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                Healzy
              </motion.h1>
              <motion.div 
                className="absolute -z-10 -inset-2 rounded-lg bg-gradient-to-r from-blue-600/20 to-indigo-600/20"
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
          
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
            Добро пожаловать в Healzy
          </h2>
          
          <div className="flex justify-center mb-6">
            <Chip 
              color="primary" 
              variant="flat" 
              size="lg"
              className="text-lg px-6 py-2"
            >
              {getUserName()}
            </Chip>
          </div>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Быстрые действия */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {serviceCards.map((card, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (index * 0.1), duration: 0.5 }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <Card 
                className="cursor-pointer h-full bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden relative"
                isPressable
                onPress={card.action}
              >
                {/* Анимированная линия вверху */}
                <motion.div 
                  className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.5 + (index * 0.1), duration: 0.8 }}
                />
                
                {/* Световые блики */}
                <div className="absolute -top-10 -left-10 w-20 h-20 rounded-full bg-pink-400/10 mix-blend-multiply opacity-70"></div>
                <div className="absolute -bottom-10 -right-10 w-20 h-20 rounded-full bg-blue-400/10 mix-blend-multiply opacity-70"></div>
                
                <CardBody className="p-6 text-center relative">
                  <motion.div 
                    className="text-4xl mb-4"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {card.icon}
                  </motion.div>
                  <h3 className="text-lg font-semibold bg-clip-text text-transparent bg-gradient-to-r from-gray-700 to-gray-900 mb-3">
                    {card.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {card.description}
                  </p>
                </CardBody>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* Информационная секция */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl overflow-hidden relative">
            {/* Анимированная линия вверху */}
            <motion.div 
              className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1, duration: 0.8 }}
            />
            
            {/* Световые блики */}
            <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-pink-400/20 mix-blend-multiply opacity-70"></div>
            <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-blue-400/20 mix-blend-multiply opacity-70"></div>
            
            <CardBody className="p-8 relative">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {t('platformAdvantages')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div 
                  className="text-center"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {t('convenientDoctorSearch')}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Найдите нужного специалиста по специализации
                  </p>
                </motion.div>
                <motion.div 
                  className="text-center"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl">🌍</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {t('onlineConsultationsAnywhere')}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Консультации из любой точки мира
                  </p>
                </motion.div>
                <motion.div 
                  className="text-center"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <span className="text-2xl">🔒</span>
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {t('secureDataExchange')}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    Защищенный обмен медицинскими данными
                  </p>
                </motion.div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default HomePage;