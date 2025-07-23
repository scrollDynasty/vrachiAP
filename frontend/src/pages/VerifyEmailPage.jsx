// frontend/src/pages/VerifyEmailPage.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../api';
import { Button, Spinner, Card, CardHeader, CardBody, Input } from '@nextui-org/react';
import useAuthStore from '../stores/authStore';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { useTranslation } from '../components/LanguageSelector';

const VerifyEmailPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading, success, error, expired, no_token
  const [error, setError] = useState('');
  const [verificationAttempted, setVerificationAttempted] = useState(false);
  const [hasProfileData, setHasProfileData] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendError, setResendError] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const pendingVerificationEmail = useAuthStore((state) => state.pendingVerificationEmail);
  const handleEmailVerification = useAuthStore((state) => state.handleEmailVerification);
  const { isAuthenticated, user } = useAuthStore();
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  // Функция для начала обратного отсчета до редиректа
  const startRedirectCountdown = () => {
    let count = 5;
    setRedirectCountdown(count);
    
    const interval = setInterval(() => {
      count--;
      setRedirectCountdown(count);
      
      if (count <= 0) {
        clearInterval(interval);
        // Проверяем, аутентифицирован ли пользователь
        const isAuth = useAuthStore.getState().isAuthenticated;
        if (isAuth) {
          navigate('/profile');
        } else {
          navigate('/login');
        }
      }
    }, 1000);
  };

  // Функция для верификации email
  const verifyEmail = async (token) => {
    // Проверяем, был ли уже этот токен обработан (чтобы избежать повторных запросов)
    const processedToken = localStorage.getItem('processedVerificationToken');
    if (processedToken === token) {
      setStatus('success');
      
      // Начинаем обратный отсчет для редиректа
      startRedirectCountdown();
      return;
    }
    
    // Проверяем, был ли уже выполнен запрос верификации для этого компонента
    if (verificationAttempted) {
      return;
    }

    // Устанавливаем флаг, что верификация выполняется
    setVerificationAttempted(true);
    
    try {
      const response = await api.get(`/verify-email?token=${token}`);
      
      if (response.status === 200) {
        // Сохраняем токен как обработанный, чтобы избежать повторных запросов
        localStorage.setItem('processedVerificationToken', token);
        
        try {
          // Проверяем доступна ли функция handleEmailVerification
          if (typeof handleEmailVerification === 'function') {
            // Используем функцию обработки подтверждения email
            const result = await handleEmailVerification(response.data);
            
            if (result && result.success) {
              setStatus('success');
              
              // Показываем уведомление об успешном подтверждении
              const message = response.data.already_verified 
                ? t('emailAlreadyConfirmedRedirect')
                : t('emailVerifiedRedirect');
              
              // Проверяем, было ли недавно показано уведомление
              const lastToastTime = localStorage.getItem('lastVerifyToastTime');
              const now = Date.now();
              
              if (!lastToastTime || (now - parseInt(lastToastTime)) > 5000) {
                toast.success(message, {
                  autoClose: 3000
                });
                
                // Сохраняем время показа
                localStorage.setItem('lastVerifyToastTime', now.toString());
              }
              
              // Начинаем обратный отсчет для редиректа
              startRedirectCountdown();
            } else {
              // Если произошла ошибка при обработке подтверждения, устанавливаем статус ошибки
              setStatus('error');
              setError((result && result.error) || 'Ошибка при обработке подтверждения email');
            }
          } else {
            // Если функция недоступна, все равно считаем проверку успешной
            setStatus('success');
            toast.success(t('emailVerified'), { autoClose: 3000 });
            setTimeout(() => navigate('/login'), 3000);
          }
        } catch (verificationError) {
          setStatus('error');
          setError('Произошла ошибка при обработке подтверждения email');
        }
      }
    } catch (err) {
      // Если верификация не удалась, проверяем причину
      if (err.response && err.response.status === 200 && err.response.data && 
          err.response.data.already_verified && err.response.data.access_token) {
        // Если да, обрабатываем его как успешную верификацию
        try {
          // Используем функцию обработки подтверждения email
          const result = await handleEmailVerification(err.response.data);
          
          if (result && result.success) {
            setStatus('success');
            toast.success(t('emailAlreadyVerifiedRedirect'), {
              autoClose: 3000
            });
            startRedirectCountdown();
            return;
          }
        } catch (e) {
          // Пропускаем ошибку обработки подтвержденного токена
        }
      }
          
      if (err.response && err.response.status === 400) {
        const errorDetail = err.response.data.detail || '';
        
        if (errorDetail.includes('expired')) {
          setStatus('expired');
          setError('Срок действия токена истек. Пожалуйста, запросите новую ссылку для подтверждения.');
        } else if (errorDetail.includes('Invalid verification token') || 
                   errorDetail.includes('already been verified') ||
                   errorDetail.includes('Недействительный токен')) {
          // Токен уже был использован или недействительный
          setStatus('already_verified');
          setError('Токен уже был использован или недействителен. Пожалуйста, войдите в систему.');
          
          // Показываем сообщение о необходимости входа
          toast.info('Токен уже подтвержден. Пожалуйста, войдите в систему.', {
            autoClose: 5000
          });
          
          // Через 3 секунды перенаправляем на страницу входа
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else if (errorDetail.includes('already registered') || 
                   errorDetail.includes('уже зарегистрирован')) {
          // Email уже зарегистрирован
          setStatus('already_registered');
          setError(errorDetail);
          
          // Показываем сообщение о том, что email уже зарегистрирован
          toast.warning('Этот email уже зарегистрирован. Пожалуйста, войдите в систему.', {
            autoClose: 5000
          });
          
          // Через 3 секунды перенаправляем на страницу входа
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setStatus('error');
          setError(errorDetail || 'Ошибка подтверждения email');
        }
      } else {
        setStatus('error');
        setError('Произошла ошибка при подтверждении email. Пожалуйста, попробуйте позже.');
      }
    }
  };

  // Проверка наличия токена и данных профиля
  useEffect(() => {
    // Проверяем, есть ли сохраненные данные профиля
    const profileData = localStorage.getItem('vrach_registration_profile');
    if (profileData) {
      try {
        const parsedData = JSON.parse(profileData);
        if (parsedData && typeof parsedData === 'object') {
          setHasProfileData(true);
          
          // Если у нас есть email из регистрации, используем его
          if (parsedData.email) {
            setResendEmail(parsedData.email);
          }
        }
      } catch (e) {
        // Пропускаем ошибку чтения данных профиля
      }
    }

    // Проверка, что пользователь уже аутентифицирован
    if (isAuthenticated && user) {
      navigate('/');
      return;
    }
    
    // Если в URL есть токен подтверждения, то пробуем его верифицировать
    if (token) {
      verifyEmail(token);
    } else if (pendingVerificationEmail) {
    } else {
      // Если нет ни токена, ни ожидающего подтверждения email-а, то перенаправляем на главную
      navigate('/');
    }
  }, [token, navigate, initializeAuth, pendingVerificationEmail, verificationAttempted, handleEmailVerification, isAuthenticated, user]);

  // Функция для перехода на страницу входа
  const goToLogin = () => {
    navigate('/login');
  };

  // Функция для запроса новой ссылки подтверждения email
  const resendVerificationEmail = async () => {
    // Для неавторизованных пользователей запрашиваем email
    setResendError('');
    
    if (!resendEmail || !resendEmail.includes('@')) {
      setResendError('Пожалуйста, введите корректный email');
      return;
    }
    
    setIsResendingEmail(true);
    try {
      const response = await api.post('/resend-verification', { email: resendEmail });
      if (response.status === 200) {
        setResendSuccess(true);
        toast.success(t('newVerificationLinkSent'), {
          autoClose: 5000
        });
        setTimeout(() => {
          setResendSuccess(false);
        }, 5000);
      }
    } catch (error) {
      let errorMessage = 'Не удалось отправить новую ссылку. Проверьте введенный email или попробуйте позже.';
      
      // Если ошибка связана с уже зарегистрированным email
      if (error.response && error.response.data && error.response.data.detail) {
        const detail = error.response.data.detail;
        if (detail.includes('уже зарегистрирован') || detail.includes('already registered')) {
          errorMessage = 'Этот email уже зарегистрирован и подтвержден. Вы можете просто войти в систему.';
          
          // Показываем toast с более информативным сообщением
          toast.info('Email уже подтвержден. Пожалуйста, войдите в систему.', {
            autoClose: 5000
          });
          
          // Через 3 секунды перенаправляем на страницу входа
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          errorMessage = detail;
        }
      }
      
      setResendError(errorMessage);
      toast.error(errorMessage, {
        autoClose: 5000
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  // Рендер страницы в зависимости от статуса
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl animate-fadeIn">
        <CardHeader className="flex flex-col pb-0 pt-6">
          <div className="flex justify-center w-full">
            <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mb-4">
              {(status === 'loading' || status === 'no_token') && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {status === 'success' && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {(status === 'error' || status === 'expired' || status === 'already_verified' || status === 'already_registered') && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">
            {status === 'loading' && 'Проверка токена...'}
            {status === 'success' && 'Email подтвержден!'}
            {status === 'error' && 'Ошибка подтверждения'}
            {status === 'expired' && 'Срок действия токена истек'}
            {status === 'no_token' && 'Токен отсутствует'}
            {status === 'already_verified' && 'Email уже подтвержден'}
            {status === 'already_registered' && 'Email уже зарегистрирован'}
          </h2>
        </CardHeader>
          
        <CardBody className="pb-6 pt-0">
          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Spinner size="lg" color="primary" className="mb-4" />
              <p className="text-gray-600 text-center">
                Пожалуйста, подождите, идет проверка вашего email...
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <div className="flex flex-col items-center justify-center py-6 animate-fadeIn">
              <div className="bg-green-50 p-4 rounded-lg text-green-700 text-sm mb-4 border border-green-200 w-full">
                <p className="font-medium">Поздравляем!</p>
                <p>Ваш email успешно подтвержден. Теперь вы можете пользоваться всеми функциями приложения.</p>
                {redirectCountdown > 0 && (
                  <p className="mt-2 font-medium">
                    Перенаправление на страницу профиля через {redirectCountdown} секунд...
                  </p>
                )}
              </div>
              
              <Button 
                color="primary" 
                className="w-full" 
                onClick={() => navigate('/profile')}
              >
                Перейти в профиль сейчас
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="py-4 animate-fadeIn">
              <div className="bg-red-50 p-4 rounded-lg text-red-700 text-sm mb-4 border border-red-200">
                <p className="font-medium">Ошибка подтверждения email</p>
                <p>{error || 'Произошла ошибка при подтверждении вашего email. Пожалуйста, попробуйте позже или запросите новую ссылку для подтверждения.'}</p>
              </div>
              
              <div className="w-full mb-6">
                {resendSuccess && (
                  <div className="bg-green-50 p-4 rounded-lg text-green-700 text-sm mb-4 border border-green-200 animate-fadeIn">
                    <p className="font-medium">Новое письмо отправлено!</p>
                    <p>Проверьте вашу почту.</p>
                  </div>
                )}

                {resendError && (
                  <div className="bg-red-50 p-4 rounded-lg text-red-700 text-sm mb-4 border border-red-200 animate-fadeIn">
                    <p>{resendError}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Input
                    label="Ваш Email"
                    placeholder="example@mail.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    type="email"
                    isRequired
                    className="animate-fadeIn"
                  />
                  
                  <div className="flex gap-2 justify-center mt-2">
                    <Button
                      color="warning"
                      isLoading={isResendingEmail}
                      onClick={resendVerificationEmail}
                      fullWidth
                      className="animate-fadeIn"
                    >
                      Запросить новую ссылку
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button
                color="primary"
                variant="flat"
                onClick={goToLogin}
                className="w-full animate-fadeIn"
              >
                Вернуться на страницу входа
              </Button>
            </div>
          )}
          
          {status === 'expired' && (
            <div className="py-4 animate-fadeIn">
              <div className="bg-amber-50 p-4 rounded-lg text-amber-700 text-sm mb-4 border border-amber-200">
                <p className="font-medium">Срок действия ссылки истек</p>
                <p>К сожалению, ссылка для подтверждения email устарела. Пожалуйста, запросите новую ссылку.</p>
              </div>
              
              <div className="w-full mb-6">
                {resendSuccess && (
                  <div className="bg-green-50 p-4 rounded-lg text-green-700 text-sm mb-4 border border-green-200 animate-fadeIn">
                    <p className="font-medium">Новое письмо отправлено!</p>
                    <p>Проверьте вашу почту.</p>
                  </div>
                )}

                {resendError && (
                  <div className="bg-red-50 p-4 rounded-lg text-red-700 text-sm mb-4 border border-red-200 animate-fadeIn">
                    <p>{resendError}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Input
                    label="Ваш Email"
                    placeholder="example@mail.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    type="email"
                    isRequired
                    className="animate-fadeIn"
                  />
                  
                  <div className="flex gap-2 justify-center mt-2">
                    <Button
                      color="warning"
                      isLoading={isResendingEmail}
                      onClick={resendVerificationEmail}
                      fullWidth
                      className="animate-fadeIn"
                    >
                      Запросить новую ссылку
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button
                color="primary"
                variant="flat"
                onClick={goToLogin}
                className="w-full animate-fadeIn"
              >
                Вернуться на страницу входа
              </Button>
            </div>
          )}
          
          {status === 'no_token' && (
            <div className="py-4 animate-fadeIn">
              <div className="bg-amber-50 p-4 rounded-lg text-amber-700 text-sm mb-4 border border-amber-200">
                <p className="font-medium">Отсутствует токен подтверждения</p>
                <p>Необходимо перейти по ссылке из письма, отправленного на ваш email.</p>
                <p className="mt-2">Если вы не получили письмо, запросите новую ссылку.</p>
              </div>
              
              <div className="w-full mb-6">
                {resendSuccess && (
                  <div className="bg-green-50 p-4 rounded-lg text-green-700 text-sm mb-4 border border-green-200 animate-fadeIn">
                    <p className="font-medium">Новое письмо отправлено!</p>
                    <p>Проверьте вашу почту.</p>
                  </div>
                )}

                {resendError && (
                  <div className="bg-red-50 p-4 rounded-lg text-red-700 text-sm mb-4 border border-red-200 animate-fadeIn">
                    <p>{resendError}</p>
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <Input
                    label="Ваш Email"
                    placeholder="example@mail.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    type="email"
                    isRequired
                    className="animate-fadeIn"
                  />
                  
                  <div className="flex gap-2 justify-center mt-2">
                    <Button
                      color="warning"
                      isLoading={isResendingEmail}
                      onClick={resendVerificationEmail}
                      fullWidth
                      className="animate-fadeIn"
                    >
                      Запросить новую ссылку
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button
                color="primary"
                variant="flat"
                onClick={goToLogin}
                className="w-full animate-fadeIn"
              >
                Вернуться на страницу входа
              </Button>
            </div>
          )}
          
          {status === 'already_verified' && (
            <div className="py-4 animate-fadeIn">
              <div className="bg-blue-50 p-4 rounded-lg text-blue-700 text-sm mb-4 border border-blue-200">
                <p className="font-medium">Email уже подтвержден</p>
                <p>Ваш email уже был подтвержден ранее. Вы можете войти в систему, используя ваши учетные данные.</p>
              </div>
              
              <Button
                color="primary"
                onClick={goToLogin}
                className="w-full animate-fadeIn"
              >
                Перейти на страницу входа
              </Button>
            </div>
          )}
          
          {status === 'already_registered' && (
            <div className="py-4 animate-fadeIn">
              <div className="bg-yellow-50 p-4 rounded-lg text-yellow-700 text-sm mb-4 border border-yellow-200">
                <p className="font-medium">Email уже зарегистрирован</p>
                <p>{error || 'Этот email уже зарегистрирован. Пожалуйста, войдите в систему, используя ваши учетные данные.'}</p>
              </div>
              
              <Button
                color="primary"
                onClick={goToLogin}
                className="w-full animate-fadeIn"
              >
                Перейти на страницу входа
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
};

export default VerifyEmailPage;