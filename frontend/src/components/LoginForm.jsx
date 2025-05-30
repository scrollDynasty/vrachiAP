// frontend/src/components/LoginForm.jsx
import React, { useState } from 'react';
import { Button, Spinner, Checkbox, Card, CardBody, CardHeader, Input, Divider } from '@nextui-org/react';

// Создаем кастомный компонент для инпутов
const CustomInput = ({ 
  id, 
  label, 
  value, 
  onChange, 
  type = "text", 
  placeholder, 
  required = false,
  autoComplete = "",
  className = ""
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={id} className="pb-1 text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value || ''} 
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        className="border border-gray-300 rounded-lg px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm text-gray-800 bg-white dark:bg-gray-900 dark:text-white dark:border-gray-700"
      />
    </div>
  );
};

function LoginForm({ onSubmit, isLoading, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState(null);

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Сбрасываем ошибки перед новой отправкой
    setFormError(null);
    
    // Проверка заполнения полей
    if (!email) {
      setFormError("Пожалуйста, введите email");
      return;
    }
    if (!password) {
      setFormError("Пожалуйста, введите пароль");
      return;
    }
    
    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setFormError("Пожалуйста, введите корректный email");
      return;
    }
    
    try {
      // Очищаем любой предыдущий error state перед новой попыткой
      console.log("LoginForm: Submitting login form");
      
      // Вызываем функцию onSubmit, переданную из родительского компонента
      // Обычно это AuthPage.handleLogin, которая вызывает useAuthStore.login
      await onSubmit(email.trim(), password, rememberMe);
      
      // Если успешно (не выброшено исключение), можно ничего не делать,
      // так как перенаправление обычно происходит в родительском компоненте
      console.log("LoginForm: Login successful");
    } catch (error) {
      console.error("LoginForm: Login failed", error);
      
      // Свойство message должно содержать текст ошибки из authStore
      if (error && typeof error === 'object' && error.message) {
        setFormError(error.message);
      } else if (typeof error === 'string') {
        setFormError(error);
      } else {
        setFormError("Произошла ошибка при попытке входа. Пожалуйста, попробуйте позже.");
      }
    }
  };

  // Определение типа ошибки для стилизации
  const getErrorType = () => {
    if (!error) return '';
    
    if (error.includes('Google')) {
      return 'google';
    } else if (error.includes('password')) {
      return 'password';
    } else if (error.includes('verify') || error.includes('confirm')) {
      return 'verification';
    } else {
      return 'other';
    }
  };

  // Получаем соответствующие стили в зависимости от типа ошибки
  const getErrorStyles = () => {
    const errorType = getErrorType();
    switch (errorType) {
      case 'google':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'password':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'verification':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      default:
        return 'bg-red-50 text-red-700 border-red-200';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-xl border border-gray-100">
        <CardHeader className="flex flex-col gap-1 items-center bg-primary-50 py-6">
          <div className="w-16 h-16 flex items-center justify-center rounded-full bg-primary-100 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-primary-800">Вход в систему</h2>
          <p className="text-primary-600 text-sm">Войдите в свой аккаунт MedCare</p>
        </CardHeader>
        
        <CardBody className="px-6 py-8">
          {(error || formError) && (
            <div className={`p-4 rounded-lg mb-6 border ${error ? getErrorStyles() : 'bg-red-50 text-red-700 border-red-200'}`}>
              {error && error.includes('Google') && (
                <div className="flex items-center mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">Вход через Google</p>
                </div>
              )}
              <p className="font-medium">{error || formError}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              type="email"
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Введите ваш email"
              variant="bordered"
              radius="sm"
              autoComplete="email"
              fullWidth
              isRequired
              startContent={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />

            <Input
              type="password"
              label="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите ваш пароль"
              variant="bordered"
              radius="sm"
              autoComplete="current-password"
              fullWidth
              isRequired
              startContent={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />

            <div className="flex justify-between items-center">
              <Checkbox
                isSelected={rememberMe}
                onValueChange={setRememberMe}
                size="sm"
                color="primary"
              >
                <span className="text-gray-700">Запомнить меня</span>
              </Checkbox>
              
              <a href="#" className="text-primary-600 hover:underline text-sm font-medium">
                Забыли пароль?
              </a>
            </div>

            <Button
              type="submit"
              color="primary"
              className="w-full font-semibold text-white py-6"
              isLoading={isLoading}
            >
              {isLoading ? <Spinner size="sm" color="white" /> : 'Войти'}
            </Button>
            
            <div className="text-center mt-6">
              <p className="text-gray-600">
                Нет аккаунта?{' '}
                <a href="/register" className="text-primary-600 hover:underline font-medium">
                  Зарегистрироваться
                </a>
              </p>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}

export default LoginForm;
