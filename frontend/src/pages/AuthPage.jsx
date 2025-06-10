// frontend/src/pages/AuthPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Удаляем Link, так как будем использовать кнопки
// Импортируем хук для доступа к стору аутентификации
import useAuthStore from '../stores/authStore';

// Импортируем компоненты форм ( LoginForm и RegisterForm )
import LoginForm from '../components/LoginForm';
import RegisterForm from '../components/RegisterForm';

// Импортируем компоненты NextUI
import { Card, CardBody, CardHeader, Avatar, Divider, Button, Tooltip } from '@nextui-org/react';
// Импортируем иконки
import { LockIcon, UserPlusIcon } from './AuthIcons';

// Импортируем компонент кнопки Google
import GoogleButton from 'react-google-button';

import { motion, AnimatePresence } from 'framer-motion';

import MedicalLoader from '../components/MedicalLoader';
import { useTranslation, LanguageSelector } from '../components/LanguageSelector';

import { DIRECT_API_URL } from '../api';

// Страница для Входа и Регистрации пользователя. Отображается на маршрутах /login, /register и корневом / (для неавторизованных).
function AuthPage() {
  const { t } = useTranslation();
  
  // Состояние для активной вкладки ('login' - Вход, 'register' - Регистрация)
  const [currentTab, setCurrentTab] = useState('login'); // Изначально активна вкладка Входа
  const [animateCard, setAnimateCard] = useState(false);
  const [formTransition, setFormTransition] = useState(false);
  // Состояние для отслеживания завершения регистрации с требованием подтверждения email
  const [registrationCompleted, setRegistrationCompleted] = useState(false);

  const navigate = useNavigate(); // Хук для программной навигации
  const location = useLocation(); // Хук для получения информации о текущем URL (путь, параметры и т.д.)

  // Получаем состояние и функции из стора аутентификации
  // isAuthLoading: статус загрузки инициализации стора при старте приложения
  // isAuthenticated: статус авторизации пользователя
  // authError: последняя ошибка, связанная с аутентификацией (логин, регистрация) из стора
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isAuthLoading = useAuthStore(state => state.isLoading);
  const authError = useAuthStore(state => state.error);
  const user = useAuthStore(state => state.user);
  const pendingVerificationEmail = useAuthStore(state => state.pendingVerificationEmail);
  // Получаем функции логина и регистрации из стора. Они будут переданы компонентам форм.
  const login = useAuthStore((state) => state.login);
  const registerUser = useAuthStore((state) => state.register);
  const processGoogleAuth = useAuthStore((state) => state.processGoogleAuth); // Функция для обработки результатов OAuth2 Google
  // Получаем статус загрузки конкретного процесса (логин/регистрация) из стора.
  const isFormLoading = useAuthStore((state) => state.isLoading);

  // Запускаем анимацию карточки после монтирования и устанавливаем текущую вкладку
  useEffect(() => {
    setAnimateCard(true);
    
    // Устанавливаем текущую вкладку на основе URL
    const currentPath = location.pathname;
    
    if (currentPath === '/register') {
      setCurrentTab('register');
    } else {
      setCurrentTab('login');
    }
  }, [location.pathname]);

  useEffect(() => {
    // Проверяем все необходимые условия для редиректа на главную
    const shouldRedirect = 
      isAuthenticated && // Пользователь аутентифицирован
      user && // Есть данные пользователя
      !authError && // Нет ошибок
      !isAuthLoading && // Загрузка завершена
      useAuthStore.getState().token; // Есть валидный токен

    if (shouldRedirect) {
      navigate('/');
    }
  }, [isAuthenticated, user, authError, isAuthLoading, navigate, pendingVerificationEmail]);

  // Сброс ошибки при смене пути
  useEffect(() => {
    useAuthStore.setState({ error: null });
  }, [location.pathname]);

  // Проверяем, есть ли ошибка, связанная с Google Auth
  const isGoogleAuthError = authError && authError.includes("registered with Google");

  // Обработчик входа пользователя
  const handleLogin = async (email, password, rememberMe = false) => {
    
    try {
      // Очищаем текущее состояние перед новой попыткой входа
      useAuthStore.setState({ error: null });
      
      // Вызываем функцию login из authStore
      await login(email, password);
      
      // Здесь можно выполнить дополнительные действия после успешного входа
      // Но редирект должен происходить автоматически в useEffect с зависимостью от isAuthenticated
    } catch (error) {
      console.error('AuthPage: Login failed:', error);
      
      // Логируем детали ошибки для отладки
      console.error('AuthPage: Error details:', {
        message: error.message,
        response: error.response ? {
          status: error.response.status,
          data: error.response.data
        } : 'No response'
      });
      
      // Проверяем, что состояние в authStore корректно сброшено
      if (useAuthStore.getState().isAuthenticated || useAuthStore.getState().user || useAuthStore.getState().token) {
        console.warn('AuthPage: Auth state not properly reset after login failure, forcing reset');
        
        // Принудительно сбрасываем состояние, если оно не было сброшено в login
        useAuthStore.setState({
          isAuthenticated: false,
          user: null,
          token: null,
          error: error.message || "Ошибка при входе"
        });
      }
      
      // Пробрасываем ошибку дальше, чтобы компонент LoginForm мог её обработать
      throw error;
    }
  };

  // Обработчик регистрации пользователя
  const handleRegister = async (userData) => {

    try {
      // Очищаем текущее состояние перед новой попыткой регистрации
      useAuthStore.setState({ error: null });

      // Вызываем функцию register из authStore
      const result = await registerUser(userData);


      // Проверяем результат регистрации
      if (result && result.success === false) {
        console.error('AuthPage: Registration failed with error:', result.error);
        
        // Дополнительно проверяем содержимое ошибки для лучшей диагностики
        if (result.error && typeof result.error === 'string') {
          if (result.error.toLowerCase().includes('email') && 
              result.error.toLowerCase().includes('уже зарегистрирован')) {
            console.warn('AuthPage: Email already registered error detected');
            return result;
          } else if (result.error.toLowerCase().includes('телефон') && 
                     result.error.toLowerCase().includes('уже зарегистрирован')) {
            console.warn('AuthPage: Phone number already registered error detected');
            return result;
          } else if (result.error.toLowerCase().includes('уже зарегистрирован')) {
            console.warn('AuthPage: User already registered error detected');
            return result;
          }
        }
        
        // Если регистрация не удалась - НЕ перенаправляем на страницу верификации
        return result;
      }

      // Проверяем, требуется ли подтверждение email
      if (result && result.requiresEmailVerification) {
        // Вместо установки флага для перенаправления на страницу подтверждения,
        // сразу перенаправляем на домашнюю страницу
        navigate('/');
      } else if (useAuthStore.getState().isAuthenticated) {
        // Редирект произойдет автоматически через useEffect с isAuthenticated
      }

      return result;
    } catch (error) {
      console.error('AuthPage: Registration failed:', error);
      
      // Дополнительно логируем подробности ошибки, если они доступны
      if (error.response) {
        console.error('AuthPage: Error response details:', {
          status: error.response.status,
          data: error.response.data,
          detail: error.response.data?.detail
        });
      }
      
      // Проверяем, что состояние корректно сброшено
      if (useAuthStore.getState().isAuthenticated || useAuthStore.getState().user || useAuthStore.getState().token) {
        console.warn('AuthPage: Auth state not properly reset after registration failure, forcing reset');
        
        useAuthStore.setState({
          isAuthenticated: false,
          user: null,
          token: null,
          error: error.message || "Ошибка при регистрации"
        });
      }
      
      // Пробрасываем ошибку для обработки в форме
      throw error;
    }
  };

  // Обработчик входа через Google
  const handleGoogleLogin = () => {
    // Вместо вызова функции, которая не существует, перенаправляем на Google OAuth
    // Получаем URL эндпоинта для авторизации Google из переменных окружения
    const googleAuthUrl = import.meta.env.VITE_GOOGLE_AUTH_URL || 
                          `${DIRECT_API_URL}/auth/google/login`;
    
    // Перенаправляем пользователя на URL авторизации Google
    window.location.href = googleAuthUrl;
  };

  // Обработчики переключения вкладок
  const handleLoginTabClick = () => {
    setFormTransition(true);
    setTimeout(() => {
      navigate('/login');
      setFormTransition(false);
    }, 150);
  };

  const handleRegisterTabClick = () => {
    setFormTransition(true);
    setTimeout(() => {
      navigate('/register');
      setFormTransition(false);
    }, 150);
  };

  // Показываем лоадер только при начальной загрузке
  if (isAuthLoading && !user && !authError) {
    return null; // Не показываем лоадер, так как эту функцию берет на себя PageTransitionLoader
  }

  // Не показываем страницу, если пользователь уже аутентифицирован
  if (isAuthenticated && user && !authError && !isAuthLoading) {
    return null;
  }

  // Основной UI страницы AuthPage
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden auth-page-container">
      {/* Селектор языка в правом верхнем углу */}
      <div className="absolute top-4 right-4 z-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-white/95 backdrop-blur-lg border border-white/40 rounded-full p-1.5 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-white/100"
        >
          <LanguageSelector variant="button" />
        </motion.div>
      </div>
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
      
      {/* Анимированные частицы */}
      <ParticlesBackground />

      {/* Главный контент */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8 relative z-10"
      >
        <div className="mb-3">
          <motion.div
            className="relative inline-block"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
            >
                                    Healzy
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
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-lg text-gray-600 max-w-md mx-auto relative"
        >
          <span className="bg-gradient-to-r from-gray-700 to-gray-500 bg-clip-text text-transparent font-medium">
            {t("platformDescription")}
          </span>
        </motion.p>
      </motion.div>
      
      <div className={`w-full max-w-md mx-auto z-10 transition-all duration-150 ${animateCard ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <motion.div
          whileHover={{ 
            y: -5,
            transition: { type: "spring", stiffness: 300, damping: 20 }
          }}
          className="framer-motion-card"
        >
          <Card className="bg-white/90 border border-white/30 shadow-2xl overflow-hidden nextui-card">
            {/* Анимированная линия вверху */}
            <motion.div 
              className="h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            />
            
            {/* Световые блики */}
            <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full bg-pink-400/20 mix-blend-multiply opacity-70"></div>
            <div className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full bg-blue-400/20 mix-blend-multiply opacity-70"></div>
            
            <CardHeader className="flex flex-col items-center pb-0 pt-8 bg-gradient-to-b from-indigo-50/50 to-transparent">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.3 }}
                whileHover={{ 
                  scale: 1.05, 
                  rotate: [0, -5, 5, -5, 0],
                  transition: { duration: 0.5 }
                }}
              >
                <div className="relative">
                  <Avatar
                    icon={currentTab === 'login' ? <LockIcon /> : <UserPlusIcon />}
                    className="w-20 h-20 text-white bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-2"
                  />
                  <motion.div
                    className="absolute -inset-2 rounded-full bg-gradient-to-r from-blue-500/40 to-indigo-500/40 -z-10"
                    animate={{ 
                      scale: [1, 1.1, 1],
                      opacity: [0.6, 0.8, 0.6]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>
              </motion.div>
              
              <motion.h1 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-2xl font-bold mt-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
              >
{currentTab === 'login' ? t('welcome') : t('createNewAccount')}
              </motion.h1>
              
              <motion.p 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="text-center text-gray-500 mt-1 mb-4 max-w-xs"
              >
                {currentTab === 'login' 
                  ? t('loginSystemAccess')
                  : t('registerForConsultations')}
              </motion.p>
              
              {/* Переключатель вкладок */}
              <div className="flex w-full border-b border-gray-200 justify-center mt-2">
                <motion.button 
                  type="button"
                  className={`px-6 py-3 font-medium text-sm transition-all relative ${
                    currentTab === 'login' 
                      ? 'text-primary border-b-2 border-primary -mb-px' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  onClick={handleLoginTabClick}
                  disabled={isFormLoading || formTransition}
                  whileHover={{ scale: currentTab !== 'login' ? 1.05 : 1 }}
                  whileTap={{ scale: currentTab !== 'login' ? 0.95 : 1 }}
                >
                  <div className="flex items-center gap-2">
                    <motion.svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      animate={currentTab === 'login' ? {
                        rotate: [0, -10, 0, 10, 0],
                        scale: [1, 1.1, 1]
                      } : {}}
                      transition={{ duration: 1, repeat: currentTab === 'login' ? 1 : 0 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </motion.svg>
{t('loginTab')}
                  </div>
                  {currentTab === 'login' && (
                    <motion.div 
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600"
                      layoutId="activeTab"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
                <motion.button 
                  type="button"
                  className={`px-6 py-3 font-medium text-sm transition-all relative ${
                    currentTab === 'register' 
                      ? 'text-primary border-b-2 border-primary -mb-px' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                  onClick={handleRegisterTabClick}
                  disabled={isFormLoading || formTransition}
                  whileHover={{ scale: currentTab !== 'register' ? 1.05 : 1 }}
                  whileTap={{ scale: currentTab !== 'register' ? 0.95 : 1 }}
                >
                  <div className="flex items-center gap-2">
                    <motion.svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-4 w-4" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      animate={currentTab === 'register' ? {
                        rotate: [0, -10, 0, 10, 0],
                        scale: [1, 1.1, 1]
                      } : {}}
                      transition={{ duration: 1, repeat: currentTab === 'register' ? 1 : 0 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </motion.svg>
{t('registerTab')}
                  </div>
                  {currentTab === 'register' && (
                    <motion.div 
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600"
                      layoutId="activeTab"
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                </motion.button>
              </div>
            </CardHeader>
            
            <CardBody className="py-6 px-8">
              {/* Отображение сообщения об ошибке */}
              <AnimatePresence>
                {authError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="bg-danger-50 text-danger p-4 rounded-xl mb-6 shadow-sm border border-danger-200"
                  >
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <p className="font-medium">{authError}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Сообщение о Google Auth, если есть ошибка связанная с Google */}
              <AnimatePresence>
                {isGoogleAuthError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-6 shadow-sm border border-blue-200"
                  >
                    <div className="flex items-center mb-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-medium">{t('googleLogin')}</p>
                    </div>
                    <p className="text-sm pl-7">{t('googleLoginHint')} {t("loginWithGoogle")} {t('belowText')}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Вход через Google */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="flex justify-center mb-6"
              >
                <motion.button 
                  className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border ${isGoogleAuthError ? 'border-blue-300 bg-blue-50 shadow-md ring-2 ring-blue-200' : 'border-gray-300'} rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all relative overflow-hidden group`}
                  onClick={handleGoogleLogin}
                  disabled={isFormLoading || formTransition}
                  whileHover={{ scale: 1.02, boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative z-10 flex items-center justify-center gap-3 w-full">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                      <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                      <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                      <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                      <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                    </svg>
                    <span className="font-medium text-gray-700">{t('googleLogin')}</span>
                  </div>
                  
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-gray-100 to-white opacity-0 group-hover:opacity-100"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.4 }}
                  />
                </motion.button>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="flex items-center mb-6"
              >
                <Divider className="flex-1" />
                <span className="px-4 text-gray-500 text-sm">{t('or')}</span>
                <Divider className="flex-1" />
              </motion.div>

              {/* Подсказка о том, что если пользователь зарегистрирован через Google, нужно использовать Google для входа */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                <Tooltip 
                  content={t('googleLoginTooltip')}
                  placement="bottom"
                  color="primary"
                  className="mb-4"
                >
                  <div className="text-xs text-center text-gray-500 mb-4 cursor-help">
                    <span className="flex items-center justify-center gap-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t("alreadyGoogleRegistered")}
                    </span>
                  </div>
                </Tooltip>
              </motion.div>

              {/* Условное отображение формы в зависимости от активной вкладки */}
              <div className="transition-all duration-150 min-h-[360px]">
                <AnimatePresence mode="wait">
                  <motion.div 
                    key={currentTab}
                    initial={{ 
                      opacity: 0, 
                      x: currentTab === 'login' ? -20 : 20,
                      rotateY: currentTab === 'login' ? -5 : 5
                    }}
                    animate={{ 
                      opacity: 1, 
                      x: 0,
                      rotateY: 0
                    }}
                    exit={{ 
                      opacity: 0, 
                      x: currentTab === 'login' ? 20 : -20,
                      rotateY: currentTab === 'login' ? 5 : -5
                    }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 400,
                      damping: 30,
                      duration: 0.2
                    }}
                    style={{ perspective: 1000 }}
                    className={`transform transition-all duration-150 ${formTransition ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                  >
                    {currentTab === 'login' && (
                      <div className="animate-fade-in">
                        <LoginForm onSubmit={handleLogin} isLoading={isFormLoading} error={authError} />
                      </div>
                    )}
                    {currentTab === 'register' && (
                      <div className="animate-fade-in">
                        <RegisterForm onSubmit={handleRegister} isLoading={isFormLoading} error={authError} />
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Информация о преимуществах платформы */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="mt-8 text-gray-600 border-t border-gray-100 pt-6"
              >
                <p className="mb-3 font-medium text-center">{t("platformAdvantages")}</p>
                <div className="space-y-2">
                  <motion.div 
                    className="flex items-center gap-2 text-sm group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7, duration: 0.3 }}
                    whileHover={{ x: 3 }}
                  >
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.2 }}
                      transition={{ duration: 0.4 }}
                      className="flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                    <span className="group-hover:text-gray-800 transition-colors">{t("convenientDoctorSearch")}</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center gap-2 text-sm group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.8, duration: 0.3 }}
                    whileHover={{ x: 3 }}
                  >
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.2 }}
                      transition={{ duration: 0.4 }}
                      className="flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                    <span className="group-hover:text-gray-800 transition-colors">{t("onlineConsultationsAnywhere")}</span>
                  </motion.div>
                  <motion.div 
                    className="flex items-center gap-2 text-sm group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9, duration: 0.3 }}
                    whileHover={{ x: 3 }}
                  >
                    <motion.div
                      whileHover={{ rotate: 360, scale: 1.2 }}
                      transition={{ duration: 0.4 }}
                      className="flex-shrink-0"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </motion.div>
                    <span className="group-hover:text-gray-800 transition-colors">{t("secureDataExchange")}</span>
                  </motion.div>
                </div>
              </motion.div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Информационная секция под формой авторизации */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="mt-8 text-center text-gray-600"
        >
          <p className="text-sm flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
{t('needHelp')} <motion.a 
              href="#" 
              className="text-primary hover:text-primary-dark hover:underline font-medium transition-colors relative inline-block"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="relative z-10">{t('contactUs')}</span>
              <motion.span 
                className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 origin-left"
                initial={{ scaleX: 0 }}
                whileHover={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.a>
          </p>
          <p className="text-xs mt-4 text-gray-500">
            <motion.a 
              href="/admin-piisa-popa" 
              className="text-gray-500 hover:text-purple-700 flex items-center justify-center gap-1 transition-colors"
              whileHover={{ scale: 1.05, color: "#9333ea" }}
              whileTap={{ scale: 0.95 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Вход для администраторов
            </motion.a>
          </p>
        </motion.div>
      </div>
      
      {/* Анимированная иллюстрация или декоративный элемент */}
      <div className="fixed bottom-0 left-0 w-full h-16 bg-gradient-to-t from-indigo-100/50 to-transparent pointer-events-none"></div>
    </div>
  );
}

export default AuthPage; // Экспорт компонента по умолчанию

// Компонент для анимированных частиц на фоне
const ParticlesBackground = () => {
  // Создаем массив случайных частиц
  const particles = Array.from({ length: 20 }).map((_, index) => ({
    id: index,
    size: Math.random() * 4 + 2, // от 2px до 6px
    x: Math.random() * 100, // случайное положение по горизонтали (%)
    y: Math.random() * 100, // случайное положение по вертикали (%)
    duration: Math.random() * 15 + 10, // от 10 до 25 секунд
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full bg-white opacity-60"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            boxShadow: '0 0 10px rgba(255, 255, 255, 0.8)'
          }}
          animate={{
            y: ["0%", "100%"],
            x: [
              `${particle.x}%`, 
              `${Math.max(0, Math.min(100, particle.x + (Math.random() * 20 - 10)))}%`,
              `${Math.max(0, Math.min(100, particle.x + (Math.random() * 20 - 10)))}%`,
              `${particle.x}%`
            ],
            opacity: [0.7, 0.4, 0.7]
          }}
          transition={{
            y: {
              repeat: Infinity,
              duration: particle.duration,
              ease: "linear",
              delay: particle.delay
            },
            x: {
              repeat: Infinity,
              duration: particle.duration,
              times: [0, 0.3, 0.7, 1],
              ease: "easeInOut",
              delay: particle.delay
            },
            opacity: {
              repeat: Infinity,
              duration: particle.duration / 2,
              ease: "easeInOut",
              repeatType: "reverse",
              delay: particle.delay
            }
          }}
        />
      ))}
    </div>
  );
};