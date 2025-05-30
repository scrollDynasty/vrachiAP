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

// Страница для Входа и Регистрации пользователя. Отображается на маршрутах /login, /register и корневом / (для неавторизованных).
function AuthPage() {
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
    console.log('AuthPage: Current path is', currentPath);
    
    if (currentPath === '/register') {
      console.log('AuthPage: Setting tab to register');
      setCurrentTab('register');
    } else {
      console.log('AuthPage: Setting tab to login');
      setCurrentTab('login');
    }
  }, [location.pathname]);

  useEffect(() => {
    console.log('AuthPage REDIRECT CHECK:', { 
      isAuthenticated, 
      user, 
      authError, 
      isAuthLoading,
      token: useAuthStore.getState().token,
      pendingVerificationEmail,
      registrationCompleted
    });

    // Проверяем все необходимые условия для редиректа на главную
    const shouldRedirect = 
      isAuthenticated && // Пользователь аутентифицирован
      user && // Есть данные пользователя
      !authError && // Нет ошибок
      !isAuthLoading && // Загрузка завершена
      useAuthStore.getState().token; // Есть валидный токен

    if (shouldRedirect) {
      console.log('AuthPage: Все условия для редиректа выполнены, перенаправляем на главную');
      navigate('/');
    } else {
      console.log('AuthPage: Условия для редиректа не выполнены:', {
        isAuthenticated,
        hasUser: !!user,
        hasError: !!authError,
        isLoading: isAuthLoading,
        hasToken: !!useAuthStore.getState().token
      });
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
    console.log('AuthPage: Handling login for email:', email);
    
    try {
      // Очищаем текущее состояние перед новой попыткой входа
      useAuthStore.setState({ error: null });
      
      // Вызываем функцию login из authStore
      await login(email, password);
      
      console.log('AuthPage: Login successful, state:', { 
        isAuthenticated: useAuthStore.getState().isAuthenticated,
        hasUser: !!useAuthStore.getState().user,
        hasToken: !!useAuthStore.getState().token,
        error: useAuthStore.getState().error
      });
      
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
    console.log('AuthPage: Handling registration for email:', userData.email);

    try {
      // Очищаем текущее состояние перед новой попыткой регистрации
      useAuthStore.setState({ error: null });

      // Вызываем функцию register из authStore
      const result = await registerUser(userData);

      console.log('AuthPage: Registration result:', result);

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
        console.log('AuthPage: Registration successful, email verification required');
        // Вместо установки флага для перенаправления на страницу подтверждения,
        // сразу перенаправляем на домашнюю страницу
        navigate('/');
      } else if (useAuthStore.getState().isAuthenticated) {
        console.log('AuthPage: Registration successful, user authenticated');
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
                          'http://localhost:8000/auth/google/login';
    
    // Перенаправляем пользователя на URL авторизации Google
    window.location.href = googleAuthUrl;
  };

  // Обработчики переключения вкладок
  const handleLoginTabClick = () => {
    console.log('AuthPage: Login tab clicked');
    setFormTransition(true);
    setTimeout(() => {
      navigate('/login');
      setFormTransition(false);
    }, 300);
  };

  const handleRegisterTabClick = () => {
    console.log('AuthPage: Register tab clicked');
    setFormTransition(true);
    setTimeout(() => {
      navigate('/register');
      setFormTransition(false);
    }, 300);
  };

  // Показываем лоадер только при начальной загрузке
  if (isAuthLoading && !user && !authError) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-5 text-gray-600 font-medium">Загрузка приложения...</p>
        </div>
      </div>
    );
  }

  // Не показываем страницу, если пользователь уже аутентифицирован
  if (isAuthenticated && user && !authError && !isAuthLoading) {
    return null;
  }

  // Основной UI страницы AuthPage
  return (
    <div className="auth-page min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Декоративные элементы */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-5 w-32 h-32 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-20 right-10 w-40 h-40 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-200"></div>
        <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-400"></div>
      </div>
    
      {/* Заголовок сайта */}
      <div className="text-center mb-10 z-10">
        <div className="flex items-center justify-center mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-primary mr-2">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            MedCare
          </h1>
        </div>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          Медицинская платформа для онлайн-консультаций с лучшими специалистами
        </p>
      </div>
      
      <div className={`w-full max-w-md mx-auto z-10 transition-all duration-700 ${animateCard ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <Card className="max-w-md mx-auto shadow-2xl border-none overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3"></div>
          <CardHeader className="flex flex-col items-center pb-0 pt-8 bg-gradient-to-b from-indigo-50 to-transparent">
            <Avatar
              icon={currentTab === 'login' ? <LockIcon /> : <UserPlusIcon />}
              className="w-20 h-20 text-white bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg mb-2"
            />
            <h1 className="text-2xl font-bold mt-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              {currentTab === 'login' ? 'Добро пожаловать!' : 'Создайте аккаунт'}
            </h1>
            <p className="text-center text-gray-500 mt-1 mb-4 max-w-xs">
              {currentTab === 'login' 
                ? 'Войдите в систему для доступа к медицинским консультациям' 
                : 'Зарегистрируйтесь для получения консультаций от специалистов'}
            </p>
            
            {/* Заменяем Link на обычные кнопки с обработчиками */}
            <div className="flex w-full border-b border-gray-200 justify-center mt-2">
              <button 
                type="button"
                className={`px-6 py-3 font-medium text-sm transition-all relative ${
                  currentTab === 'login' 
                    ? 'text-primary border-b-2 border-primary -mb-px' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                onClick={handleLoginTabClick}
                disabled={isFormLoading || formTransition}
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Вход
                </div>
              </button>
              <button 
                type="button"
                className={`px-6 py-3 font-medium text-sm transition-all relative ${
                  currentTab === 'register' 
                    ? 'text-primary border-b-2 border-primary -mb-px' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                onClick={handleRegisterTabClick}
                disabled={isFormLoading || formTransition}
              >
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Регистрация
                </div>
              </button>
            </div>
          </CardHeader>
          
          <CardBody className="py-6 px-8">
            {/* Отображение сообщения об ошибке */}
            {authError && (
              <div className="bg-danger-50 text-danger p-4 rounded-xl mb-6 shadow-sm border border-danger-200 animate-pulse">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="font-medium">{authError}</p>
                </div>
              </div>
            )}

            {/* Сообщение о Google Auth, если есть ошибка связанная с Google */}
            {isGoogleAuthError && (
              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-6 shadow-sm border border-blue-200">
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">Вход через Google</p>
                </div>
                <p className="text-sm pl-7">Если вы зарегистрировались через Google, пожалуйста, используйте кнопку "Войти через Google" ниже.</p>
              </div>
            )}

            {/* Вход через Google */}
            <div className="flex justify-center mb-6">
              <button 
                className={`w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border ${isGoogleAuthError ? 'border-blue-300 bg-blue-50 shadow-md ring-2 ring-blue-200' : 'border-gray-300'} rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition-all`}
                onClick={handleGoogleLogin}
                disabled={isFormLoading || formTransition}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                <span className="font-medium text-gray-700">Войти через Google</span>
              </button>
            </div>

            <div className="flex items-center mb-6">
              <Divider className="flex-1" />
              <span className="px-4 text-gray-500 text-sm">или</span>
              <Divider className="flex-1" />
            </div>

            {/* Подсказка о том, что если пользователь зарегистрирован через Google, нужно использовать Google для входа */}
            <Tooltip 
              content="Если вы зарегистрировались через Google, используйте кнопку 'Войти через Google' выше"
              placement="bottom"
              color="primary"
              className="mb-4"
            >
              <div className="text-xs text-center text-gray-500 mb-4 cursor-help">
                <span className="flex items-center justify-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Уже зарегистрированы через Google?
                </span>
              </div>
            </Tooltip>

            {/* Условное отображение формы в зависимости от активной вкладки */}
            <div className="transition-all duration-300 min-h-[360px]">
              <div className={`transform transition-all duration-300 ${formTransition ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
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
              </div>
            </div>

            {/* Информация о преимуществах платформы */}
            <div className="mt-8 text-gray-600 border-t border-gray-100 pt-6">
              <p className="mb-3 font-medium text-center">Преимущества нашей платформы:</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Удобный поиск врачей по специализации</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Онлайн-консультации из любой точки мира</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Защищенный обмен медицинскими данными</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Информационная секция под формой авторизации */}
        <div className="mt-8 text-center text-gray-600">
          <p className="text-sm flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Нужна помощь? <a href="#" className="text-primary hover:underline font-medium">Свяжитесь с нами</a>
          </p>
          <p className="text-xs mt-4 text-gray-500">
            <a href="/admin-piisa-popa" className="text-gray-500 hover:text-purple-700 flex items-center justify-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Вход для администраторов
            </a>
          </p>
        </div>
      </div>
      
      {/* Анимированная иллюстрация или декоративный элемент */}
      <div className="fixed bottom-0 left-0 w-full h-16 bg-gradient-to-t from-indigo-100/50 to-transparent pointer-events-none"></div>
    </div>
  );
}

export default AuthPage; // Экспорт компонента по умолчанию