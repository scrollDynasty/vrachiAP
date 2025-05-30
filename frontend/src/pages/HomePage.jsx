// frontend/src/pages/HomePage.jsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button } from '@nextui-org/react';
import useAuthStore from '../stores/authStore';
import GoogleProfileForm from '../components/GoogleProfileForm';
import { ApplicationStatusTracker } from '../components/Notification';

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
          
          {/* Информация о статусе платформы */}
          <Card className="mt-12 bg-purple-50 max-w-3xl mx-auto">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Статус платформы</h3>
                  <p className="text-gray-600">Все системы работают в штатном режиме</p>
                </div>
                <div className="bg-success rounded-full w-3 h-3"></div>
              </div>
            </CardBody>
          </Card>
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-screen-xl mx-auto px-4 py-12">
        {/* Компонент уведомлений о статусе заявок */}
        <ApplicationStatusTracker />

        {/* Приветствие */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{welcomeText}</h1>
          <p className="text-gray-600">
            {user?.role === 'doctor' 
              ? 'Здесь вы можете управлять консультациями и настраивать ваш профиль.'
              : 'Здесь вы можете искать врачей, управлять консультациями и просматривать историю.'
            }
          </p>
        </div>
        
        {/* Уведомление о необходимости подтверждения email */}
        {user && !user.is_active && (
          <div className="mb-10">
            <Card className="bg-amber-50 border-l-4 border-amber-500 shadow-sm">
              <CardBody>
                <div className="flex items-start">
                  <div className="mr-4 text-warning text-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
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
                      >
                        Подробнее
                      </Button>
                      <Button
                        size="sm"
                        color="default"
                        variant="light"
                        onPress={() => window.location.href = 'mailto:support@example.com'}
                      >
                        Возникли проблемы?
                      </Button>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}
        
        {/* Карточки сервисов */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {serviceCards.map((card, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardBody className="p-6 flex flex-col items-center text-center">
                <div className="text-4xl mb-4">{card.icon}</div>
                <h3 className="text-xl font-semibold mb-2 text-primary">{card.title}</h3>
                <p className="text-gray-600 mb-4">{card.description}</p>
                <Button 
                  color="primary" 
                  className="mt-auto"
                  onPress={card.action}
                >
                  Перейти
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
        
        {/* Информация о статусе платформы */}
        <Card className="mt-12 bg-blue-50">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
        <div>
                <h3 className="text-lg font-semibold text-gray-800">Статус платформы</h3>
                <p className="text-gray-600">Все системы работают в штатном режиме</p>
              </div>
              <div className="bg-success rounded-full w-3 h-3"></div>
           </div>
          </CardBody>
        </Card>
        
        {/* Ссылки на помощь */}
        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>
            Нужна помощь? <a href="#" className="text-primary hover:underline">Связаться с поддержкой</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default HomePage;