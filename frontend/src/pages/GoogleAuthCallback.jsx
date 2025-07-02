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
      console.warn('GoogleAuthCallback: Обнаружены возможные конфликтующие расширения (inpage.js)');
      return true;
    }
    
    return false;
  } catch (e) {
    console.error('GoogleAuthCallback: Ошибка при проверке расширений', e);
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
      console.error('GoogleAuthCallback: Проблема с доступом к sessionStorage', e);
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
      console.error('GoogleAuthCallback: Проблема с доступом к localStorage', e);
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
        console.error('Error checking processed codes:', e);
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
        console.error('Error adding to processed codes:', e);
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
          console.warn('GoogleAuthCallback: Работаем в режиме совместимости из-за конфликтующих расширений');
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
              console.error('GoogleAuthCallback: Error importing API:', apiImportError);
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
              console.error('GoogleAuthCallback: Error setting token in localStorage:', localStorageError);
            }
            
            // Используем функцию для установки токена
            try {
              // Сначала очищаем заголовки, чтобы избежать использования старого токена
              api.defaults.headers.common['Authorization'] = null;
              delete api.defaults.headers.common['Authorization'];
              
              // Устанавливаем новый токен
              setAuthToken(token);
            } catch (tokenSetError) {
              console.error('GoogleAuthCallback: Error setting token via API:', tokenSetError);
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
              console.error('GoogleAuthCallback: Error updating auth store:', storeError);
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
            console.error('GoogleAuthCallback: Error processing direct token:', error);
            setStatus('error');
            setErrorMessage('Ошибка при обработке токена авторизации');
            return;
          }
        }
        
        // Получаем код из URL
        const code = searchParams.get('code');
        
        // Если код отсутствует, показываем ошибку
        if (!code) {
          console.error("No authorization code found in URL");
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
          console.error('Google auth processing failed:', authError);
          handleAuthError(authError);
        }
      } catch (error) {
        console.error('Google auth processing failed:', error);
        handleAuthError(error);
      } finally {
        // Очищаем статус обработки в сессии
        const currentCode = searchParams.get('code');
        if (currentCode) {
          try {
            sessionStorage.removeItem(`google_auth_code_${currentCode}`);
          } catch (clearError) {
            console.error('Error clearing session storage:', clearError);
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
        <Card className="max-w-lg w-full mx-auto shadow-xl border border-white/30 bg-white/90 backdrop-blur-sm">
          <CardBody className="py-10 px-6 text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              {t('authSuccessful', 'Авторизация успешна!')}
            </h2>
            <p className="text-gray-600 text-sm">
              {t('redirectingToHome', 'Вы будете перенаправлены на главную страницу...')}
            </p>
            
            {/* Анимированные точки загрузки */}
            <div className="flex space-x-2 justify-center mt-4">
              {[0, 1, 2].map((index) => (
                <div
                  key={index}
                  className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse"
                  style={{animationDelay: `${index * 0.2}s`}}
                />
              ))}
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