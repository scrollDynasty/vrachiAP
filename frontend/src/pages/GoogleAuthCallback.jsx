import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { Card, CardBody, Spinner } from '@nextui-org/react';
import GoogleProfileForm from '../components/GoogleProfileForm';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import MedicalLoader from '../components/MedicalLoader';

// Добавляем функцию для проверки наличия конфликтующих расширений
const checkForConflictingExtensions = () => {
  try {
    // Проверяем на наличие расширений, которые могут конфликтовать
    // Эта функция будет вызвана только один раз при монтировании компонента
    const hasInpageScripts = document.querySelectorAll('script[src*="inpage"]').length > 0;
    
    if (hasInpageScripts) {
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
};

function GoogleAuthCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasConflictingExtensions, setHasConflictingExtensions] = useState(false);
  
  // Get auth functions and state from store
  const processGoogleAuth = useAuthStore(state => state.processGoogleAuth);
  const needsProfileUpdate = useAuthStore(state => state.needsProfileUpdate);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const error = useAuthStore(state => state.error);
  
  // Проверяем наличие конфликтующих расширений при монтировании компонента
  useEffect(() => {
    setHasConflictingExtensions(checkForConflictingExtensions());
  }, []);
  
  // Определяем, как хранить информацию о коде
  const getSessionStorage = () => {
    try {
      return window.sessionStorage;
    } catch (e) {
      // Возвращаем объект-пустышку если sessionStorage недоступен
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      };
    }
  };
  
  // Безопасный доступ к localStorage
  const getLocalStorage = () => {
    try {
      return window.localStorage;
    } catch (e) {
      // Возвращаем объект-пустышку если localStorage недоступен
      return {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      };
    }
  };
  
  useEffect(() => {
    // Функция для проверки, был ли код уже обработан
    const checkProcessedCodes = (code) => {
      try {
        // Используем localStorage вместо sessionStorage для более надежного хранения
        const processedCodes = JSON.parse(getLocalStorage().getItem('processedGoogleCodes') || '[]');
        return processedCodes.includes(code);
      } catch (e) {
        return false;
      }
    };
    
    // Функция для добавления кода в список обработанных
    const addToProcessedCodes = (code) => {
      try {
        const processedCodes = JSON.parse(getLocalStorage().getItem('processedGoogleCodes') || '[]');
        if (!processedCodes.includes(code)) {
          // Ограничиваем размер массива до 20 последних кодов
          if (processedCodes.length >= 20) {
            processedCodes.shift(); // Удаляем самый старый код
          }
          processedCodes.push(code);
          getLocalStorage().setItem('processedGoogleCodes', JSON.stringify(processedCodes));
        }
              } catch (e) {
          // Пропускаем ошибки добавления кодов
        }
    };
    
    const processAuth = async () => {
      // Если процесс уже запущен, прерываем выполнение
      if (isProcessing) {
        return;
      }
      
      // Устанавливаем флаг, что процесс начался
      setIsProcessing(true);
      
      try {
        // Если пользователь уже аутентифицирован, перенаправляем его
        if (isAuthenticated) {
          setStatus('success');
          if (!needsProfileUpdate) {
            setTimeout(() => {
              navigate('/');
            }, 1000);
          }
          return;
        }
        
        // Проверяем, есть ли предупреждение о конфликтующих расширениях
        if (hasConflictingExtensions) {
          // Работаем в режиме совместимости
        }
        
        // Проверяем, не получили ли мы токен напрямую
        const token = searchParams.get('token');
        const needProfile = searchParams.get('need_profile') === 'true';
        
        // Если получили токен напрямую от бэкенда - используем его
        if (token) {
          
          try {
            // Импортируем функцию для установки токена
            const { setAuthToken } = await import('../api');
            
            // Загружаем API для запроса
            let api;
            try {
              const apiModule = await import('../api');
              api = apiModule.default;
            } catch (apiImportError) {
              // Создаем временный экземпляр axios
              api = axios.create({
                baseURL: 'https://healzy.uz',
                headers: { 'Authorization': `Bearer ${token}` }
              });
            }
            
            // Очищаем localStorage от старых токенов
            try {
              // Удаляем существующий токен, если он есть
              getLocalStorage().removeItem('auth_token');
              
              // Устанавливаем новый токен
              getLocalStorage().setItem('auth_token', token);
            } catch (localStorageError) {
              // Пропускаем ошибки записи в localStorage
            }
            
            // Используем функцию для установки токена
            try {
              // Сначала очищаем заголовки, чтобы избежать использования старого токена
              api.defaults.headers.common['Authorization'] = null;
              delete api.defaults.headers.common['Authorization'];
              
              // Устанавливаем новый токен
              setAuthToken(token);
            } catch (tokenSetError) {
              // Пропускаем ошибки установки токена через API
            }
            
            // Обновляем состояние в authStore
            try {
              useAuthStore.setState({ 
                isAuthenticated: true, 
                token: token,
                needsProfileUpdate: needProfile,
                error: null,
                isLoading: false
              });
            } catch (storeError) {
              // Пропускаем ошибки обновления store
            }
            
            // Пробуем получить данные пользователя
            try {
              const userResponse = await api.get('/users/me', {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json'
                },
                timeout: 5000 // Устанавливаем таймаут в 5 секунд
              });
              
              if (userResponse.status === 200 && userResponse.data) {
                // Успешно получили данные пользователя
                useAuthStore.setState({ 
                  isAuthenticated: true, 
                  user: userResponse.data,
                  error: null,
                  needsProfileUpdate: needProfile,
                  token: token
                });
                
                setStatus('success');
                
                // Перенаправляем на главную страницу
                setTimeout(() => {
                  navigate('/');
                }, 1500);
                return;
              }
            } catch (userError) {
              console.warn('GoogleAuthCallback: Не удалось получить данные пользователя, но токен валидный:', userError);
              // Продолжаем без данных пользователя - они загрузятся позже
            }
            
            setStatus('success');
            
            // Перенаправляем на главную страницу через короткое время
            setTimeout(() => {
              navigate('/');
            }, 1000);
            return;
            
          } catch (error) {
            setStatus('error');
            setErrorMessage('Ошибка при обработке токена авторизации');
            return;
          }
        }
        
        // Получаем код из URL
        const code = searchParams.get('code');
        
        // Если код отсутствует, показываем ошибку
        if (!code) {
          setStatus('error');
          setErrorMessage('Код авторизации отсутствует. Пожалуйста, попробуйте войти снова.');
          return;
        }
        
        // Проверяем, не обрабатывался ли уже этот код
        const sessionStorage = getSessionStorage();
        const isProcessedInSession = sessionStorage.getItem(`google_auth_code_${code}`);
        if (isProcessedInSession === 'processing') {
          return;
        }
        
        if (checkProcessedCodes(code)) {
          
          // Если пользователь аутентифицирован, просто перенаправляем
          if (isAuthenticated) {
            setStatus('success');
            navigate('/', { replace: true });
            return;
          }
          
          // Иначе перенаправляем на страницу входа
          setStatus('error');
          setErrorMessage('Этот код авторизации уже был использован. Пожалуйста, войдите снова.');
          setTimeout(() => {
            navigate('/login', { replace: true });
          }, 2000);
          return;
        }
        
        // Помечаем код как обрабатываемый в текущей сессии
        sessionStorage.setItem(`google_auth_code_${code}`, 'processing');
        
        
        try {
          // Проверяем, получили ли мы токен напрямую от бэкенда
          if (token) {
            
            // Импортируем функцию для установки токена
            const { setAuthToken } = await import('../api');
            setAuthToken(token);
            
            // Обновляем состояние авторизации
            useAuthStore.setState({
              token: token,
              isAuthenticated: true,
              needsProfileUpdate: needProfile,
              error: null
            });
            
            // Добавляем код в список обработанных
            addToProcessedCodes(code);
            
            // Устанавливаем статус успеха
            setStatus('success');
            
            // Перенаправляем через более короткое время, так как токен уже есть
            setTimeout(() => {
              navigate('/');
            }, 1000);
            
          } else {
            // Если токена нет в URL, значит что-то пошло не так
            throw new Error('Токен авторизации не получен');
          }
        } catch (authError) {
          handleAuthError(authError);
        }
      } catch (error) {
        handleAuthError(error);
      } finally {
        // Очищаем статус обработки в сессии
        const currentCode = searchParams.get('code');
        if (currentCode) {
          try {
            sessionStorage.removeItem(`google_auth_code_${currentCode}`);
          } catch (clearError) {
            // Пропускаем ошибки очистки сессии
          }
        }
        setIsProcessing(false);
      }
    };
    
    // Функция для обработки ошибок аутентификации
    const handleAuthError = (error) => {
      // Если ошибка связана с истекшим кодом, перенаправляем на повторную авторизацию
      if (error.message?.includes('истек') || 
          error.message?.includes('invalid_grant') || 
          error.message?.includes('Code exchange failed')) {
        setStatus('error');
        setErrorMessage('Код авторизации истек или недействителен. Пожалуйста, попробуйте войти снова.');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
        return;
      }
      
      // Если код уже был обработан, но пользователь не авторизован
      if (error.message?.includes('уже был')) {
        setStatus('error');
        setErrorMessage('Этот код авторизации уже был использован. Пожалуйста, войдите снова.');
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
        return;
      }
      
      // Проверяем, если пользователь все же аутентифицирован, несмотря на ошибку
      if (isAuthenticated) {
        setStatus('success');
        if (!needsProfileUpdate) {
          setTimeout(() => {
            navigate('/');
          }, 1500);
        }
      } else {
        setStatus('error');
        setErrorMessage(error.message || 'Произошла ошибка при обработке авторизации через Google');
      }
    };
    
    // Очищаем старые коды (если прошло больше 24 часов)
    const clearOldCodes = () => {
      try {
        const lastCleared = getLocalStorage().getItem('lastCodeClearing');
        const now = Date.now();
        
        if (!lastCleared || now - parseInt(lastCleared, 10) > 24 * 60 * 60 * 1000) {
          getLocalStorage().setItem('processedGoogleCodes', '[]');
          getLocalStorage().setItem('lastCodeClearing', now.toString());
        }
      } catch (e) {
        // Игнорируем ошибки очистки
      }
    };
    
    clearOldCodes();
    processAuth();
  }, [processGoogleAuth, navigate, isProcessing, isAuthenticated, needsProfileUpdate, searchParams, hasConflictingExtensions]);
  
  // Обработчик завершения заполнения профиля
  const handleProfileComplete = async () => {
    // Перенаправляем на главную - токен уже установлен в HTTP-only куки
    navigate('/');
  };


  
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8"
         style={{
           background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
           animation: 'gradientShift 15s ease infinite'
         }}
    >
      {/* Анимированный фон с частицами */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(255, 255, 255, 0.1) 1px, transparent 1px), 
                             linear-gradient(to bottom, rgba(255, 255, 255, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
            animation: 'float 20s linear infinite'
          }}
        />
      </div>
      
      {/* Плавающие декоративные элементы */}
      <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-white/10 animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-24 h-24 rounded-full bg-white/10 animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/3 right-20 w-16 h-16 rounded-full bg-white/10 animate-pulse" style={{animationDelay: '2s'}}></div>
      {hasConflictingExtensions && (
        <div className="fixed top-4 right-4 p-4 bg-yellow-100 border border-yellow-400 rounded shadow-md max-w-md">
          <p className="text-yellow-800">
            <strong>Внимание:</strong> Обнаружены расширения браузера, которые могут мешать процессу авторизации. 
            Если возникают проблемы, попробуйте временно отключить расширения или использовать режим инкогнито.
          </p>
        </div>
      )}
      
      {status === 'processing' && (
        <Card className="max-w-lg w-full mx-auto shadow-xl border border-white/30 bg-white/90">
          <CardBody className="py-10 px-6 text-center">
            <MedicalLoader 
              size="large" 
              message={t('completingGoogleAuth', 'Завершение авторизации...')}
            />
            <p className="mt-4 text-gray-600 text-sm">
              {t('processingGoogleAuth', 'Пожалуйста, подождите, мы обрабатываем вашу авторизацию через Google.')}
            </p>
          </CardBody>
        </Card>
      )}
      
      {status === 'success' && !needsProfileUpdate && (
        <Card className="max-w-lg w-full mx-auto shadow-2xl border border-white/40 bg-white/95 backdrop-blur-md relative overflow-hidden">
          {/* Декоративные элементы */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500"></div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full -translate-y-12 translate-x-12 opacity-50"></div>
          <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-teal-100 to-green-100 rounded-full -translate-y-8 -translate-x-8 opacity-30"></div>
          
          <CardBody className="py-12 px-8 text-center relative z-10">
            {/* Иконка успеха с медицинским крестом */}
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-2xl transform hover:scale-105 transition-transform duration-300">
                {/* Медицинский крест */}
                <div className="relative">
                  <div className="w-8 h-2 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                  <div className="w-2 h-8 bg-white rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                </div>
                {/* Галочка поверх */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white absolute bottom-0 right-0 transform translate-x-2 translate-y-2 bg-emerald-600 rounded-full p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              {/* Пульсирующие кольца */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 border-2 border-emerald-300 rounded-full animate-ping opacity-20"></div>
                <div className="w-32 h-32 border-2 border-green-300 rounded-full animate-ping opacity-10 absolute" style={{animationDelay: '0.5s'}}></div>
              </div>
            </div>
            
            {/* Заголовок */}
            <div className="space-y-3 mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
                {t('authSuccessful', 'Авторизация успешна!')}
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full mx-auto"></div>
            </div>
            
            {/* Описание */}
            <p className="text-gray-600 text-base leading-relaxed mb-6">
              {t('redirectingToHome', 'Добро пожаловать в Healzy! Вы будете перенаправлены на главную страницу...')}
            </p>
            
            {/* Анимированный прогресс */}
            <div className="relative">
              <div className="flex justify-center items-center space-x-3 mb-4">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className="w-2 h-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-500 animate-pulse"
                    style={{
                      animationDelay: `${index * 0.3}s`,
                      animationDuration: '1.5s'
                    }}
                  />
                ))}
              </div>
              
              {/* Дополнительная информация */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg p-3 border border-emerald-200">
                <div className="flex items-center justify-center text-emerald-700 text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Ваши данные в безопасности
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
      
      {status === 'success' && needsProfileUpdate && (
        <div className="w-full max-w-2xl">
          <GoogleProfileForm onCompleted={handleProfileComplete} />
        </div>
      )}
      
      {status === 'error' && (
        <Card className="max-w-lg w-full mx-auto shadow-xl border border-white/30 bg-white/90 backdrop-blur-sm">
          <CardBody className="py-10 px-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent mb-4">
              {t('authError', 'Ошибка авторизации')}
            </h2>
            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              {errorMessage || error || t('authErrorMessage', "Произошла ошибка при обработке авторизации через Google. Пожалуйста, попробуйте еще раз.")}
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              {t('returnToLogin', 'Вернуться на страницу входа')}
            </button>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default GoogleAuthCallback; 