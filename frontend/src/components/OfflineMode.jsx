import React from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { useTranslation } from './LanguageSelector';

const OfflineMode = ({ user, onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">Healzy</h1>
          <div className="flex items-center gap-4">
            {user && (
              <div className="text-sm text-gray-600">
                Добро пожаловать, {user.email}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
                          Добро пожаловать в Healzy
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Здоровье в приоритете
          </p>
        </div>

        {/* Status Card */}
        <Card className="max-w-2xl mx-auto mb-8">
          <CardBody className="text-center p-8">
            <div className="text-warning text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-warning mb-4">
              Временная недоступность сервера
            </h2>
            <p className="text-gray-600 mb-6">
              В данный момент серверная часть приложения недоступна. 
              Мы работаем над восстановлением сервиса.
            </p>
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-blue-700">
                <strong>Для администратора:</strong><br/>
                Проверьте состояние backend сервера на localhost:8000
              </p>
            </div>
            {user && (
              <div className="bg-green-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-green-700">
                  ✅ Вы успешно авторизованы как <strong>{user.email}</strong><br/>
                  Роль: <strong>{user.role || 'пациент'}</strong>
                </p>
              </div>
            )}
            <Button 
              color="primary" 
              onClick={onRetry}
              className="mr-4"
            >
              Попробовать снова
            </Button>
            <Button 
              variant="light" 
              onClick={() => window.location.reload()}
            >
              Обновить страницу
            </Button>
          </CardBody>
        </Card>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardBody className="text-center p-6">
              <div className="text-4xl text-blue-500 mb-4">🔍</div>
              <h3 className="text-lg font-semibold mb-2">Найти врача</h3>
              <p className="text-gray-600 text-sm">
                Поиск врачей по специализации и записаться на консультацию
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="text-center p-6">
              <div className="text-4xl text-blue-500 mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-2">История</h3>
              <p className="text-gray-600 text-sm">
                Просмотр истории ваших консультаций и платежей
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="text-center p-6">
              <div className="text-4xl text-blue-500 mb-4">⚙️</div>
              <h3 className="text-lg font-semibold mb-2">Настройки профиля</h3>
              <p className="text-gray-600 text-sm">
                Обновление личной информации и настройки аккаунта
              </p>
            </CardBody>
          </Card>
        </div>

        {/* Footer */}
        <footer className="text-center text-gray-500 text-sm">
          <p>© 2025 Healzy. Все права защищены.</p>
          <div className="flex justify-center gap-4 mt-2">
            <a href="#" className="hover:text-blue-500">Политика конфиденциальности</a>
            <a href="#" className="hover:text-blue-500">Условия использования</a>
            <a href="#" className="hover:text-blue-500">Контакты</a>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default OfflineMode; 