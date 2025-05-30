import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import { Card, CardBody, CardHeader, Avatar, Input, Button, Spinner } from '@nextui-org/react';

function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [animateCard, setAnimateCard] = useState(false);
  
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login, user } = useAuthStore();

  // Анимация карточки при монтировании
  useEffect(() => {
    setAnimateCard(true);
  }, []);

  // Перенаправление на админ-панель, если пользователь уже аутентифицирован как админ
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (user && user.role === 'admin') {
        navigate('/admin');
      } else {
        setError('У вас нет прав администратора');
        useAuthStore.getState().logout();
      }
    }
  }, [isAuthenticated, isLoading, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Пожалуйста, заполните все поля');
      return;
    }
    
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Ошибка входа');
    }
  };

  if (isLoading && !error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-5 text-gray-600 font-medium">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50 flex flex-col items-center justify-center p-4">
      {/* Декоративные элементы */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-5 w-32 h-32 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-20 right-10 w-40 h-40 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-200"></div>
        <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-400"></div>
      </div>
      
      {/* Заголовок */}
      <div className="text-center mb-8 z-10">
        <div className="flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-purple-600 mr-2">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
            MedCare Admin
          </h1>
        </div>
        <p className="text-lg text-gray-600">
          Панель администрирования медицинской платформы
        </p>
      </div>
      
      <div className={`w-full max-w-md mx-auto z-10 transition-all duration-700 ${animateCard ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <Card className="max-w-md mx-auto shadow-2xl border-none overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 h-3"></div>
          <CardHeader className="flex flex-col items-center pb-0 pt-8 bg-gradient-to-b from-indigo-50 to-transparent">
            <Avatar
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              className="w-20 h-20 text-white bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg mb-2"
            />
            <h1 className="text-2xl font-bold mt-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">
              Вход для администраторов
            </h1>
            <p className="text-center text-gray-500 mt-1 mb-4 max-w-xs">
              Доступ только для авторизованных сотрудников
            </p>
          </CardHeader>
          
          <CardBody className="py-6 px-8">
            {/* Отображение сообщения об ошибке */}
            {error && (
              <div className="bg-danger-50 text-danger p-4 rounded-xl mb-6 shadow-sm border border-danger-200 animate-pulse">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                id="admin-email"
                label="Email администратора"
                placeholder="Введите email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                variant="bordered"
                isRequired
                labelPlacement="outside"
                radius="sm"
                classNames={{
                  input: "text-base py-2",
                  inputWrapper: "py-0 h-auto min-h-[56px]",
                  label: "pb-2 text-medium",
                  base: "mb-6"
                }}
              />
              
              <Input
                id="admin-password"
                label="Пароль"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                variant="bordered"
                isRequired
                labelPlacement="outside"
                radius="sm"
                classNames={{
                  input: "text-base py-2",
                  inputWrapper: "py-0 h-auto min-h-[56px]",
                  label: "pb-2 text-medium",
                  base: "mb-6"
                }}
              />
              
              <Button
                type="submit"
                color="primary"
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 shadow-md"
                radius="sm"
                isLoading={isLoading}
              >
                {isLoading ? <Spinner size="sm" color="white" /> : 'Войти в систему'}
              </Button>
            </form>
            
            {/* Кнопка быстрого входа для тестирования */}
            <div className="mt-4">
              <Button
                type="button"
                color="secondary"
                variant="flat"
                className="w-full"
                radius="sm"
                onClick={() => {
                  setEmail("admin2@medcare.com");
                  setPassword("admin2");
                  setTimeout(() => {
                    login("admin2@medcare.com", "admin2");
                  }, 100);
                }}
                isDisabled={isLoading}
              >
                Вход для тестирования
              </Button>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Доступ только для администраторов MedCare</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      {/* Нижний декоративный элемент */}
      <div className="fixed bottom-0 left-0 w-full h-16 bg-gradient-to-t from-indigo-100/50 to-transparent pointer-events-none"></div>
    </div>
  );
}

export default AdminLoginPage; 