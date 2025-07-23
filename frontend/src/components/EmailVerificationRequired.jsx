import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { Card, CardBody, CardHeader, Button } from '@nextui-org/react';

/**
 * Компонент для проверки подтверждения email пользователя
 * Ограничивает доступ к функционалу для пользователей, 
 * которые не подтвердили свой email при ручной регистрации
 */
const EmailVerificationRequired = () => {
  // Получаем все необходимые данные отдельными вызовами хука
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);

  // Пока идет проверка аутентификации, не показываем содержимое
  // Загрузку отображает PageTransitionLoader
  if (isLoading) {
    return null;
  }

  // Если пользователь не аутентифицирован, перенаправляем на страницу логина
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Если у пользователя активирован аккаунт (email подтвержден) или аутентификация через Google
  // Google пользователи всегда должны проходить без email verification
  if (user.is_active || user.auth_provider === 'google') {
    return <Outlet />;
  }

  // Если пользователь аутентифицирован, но не подтвердил email
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="flex flex-col pb-0 pt-6">
          <div className="flex justify-center w-full">
            <div className="bg-warning rounded-full w-16 h-16 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center">Требуется подтверждение Email</h1>
        </CardHeader>
        
        <CardBody className="py-8 flex flex-col items-center">
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-warning mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h2 className="text-xl font-bold text-warning mb-4">Подтвердите ваш Email</h2>
            <p className="text-gray-700 mb-6">
              Для доступа к полному функционалу платформы необходимо подтвердить ваш Email-адрес.
              <br />
              Пожалуйста, перейдите по ссылке, которую мы отправили на ваш Email.
            </p>
            <div className="bg-amber-50 p-4 rounded-lg text-amber-700 text-sm mb-6 border border-amber-200">
              <p className="font-medium mb-1">Важно!</p>
              <p>До подтверждения Email у вас нет доступа к редактированию профиля 
              и получению консультаций. Проверьте вашу почту и спам.</p>
            </div>
            <Button
              color="warning"
              variant="flat"
              onClick={() => window.location.href = '/verify-email'}
              className="mr-2"
            >
              Получить помощь
            </Button>
            <Button
              color="primary"
              className="mt-4"
              onPress={() => window.location.href = '/verify-email'}
            >
              Перейти к подтверждению
            </Button>
            <Button
              variant="light"
              className="mt-2"
              onPress={() => window.location.href = '/'}
            >
              На главную
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default EmailVerificationRequired; 