import React, { useState, useRef, useEffect } from 'react';
import { Card, CardBody, Button, Input, Divider, Spinner, Avatar, Chip } from '@nextui-org/react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';
import { toast } from 'react-toastify';
import useAuthStore from '../stores/authStore';
import AvatarWithFallback from './AvatarWithFallback';

function UserProfile() {
  const { user, updateUserData } = useAuth();
  // Альтернативно используем стор для получения детальной информации (включая auth_provider)
  const storeUser = useAuthStore(state => state.user);
  
  const [formState, setFormState] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  // Проверяем, зарегистрирован ли пользователь через Google
  const isGoogleUser = storeUser?.auth_provider === 'google';

  // Обновляем превью аватара при изменении user
  useEffect(() => {
    if (user?.avatar_path) {
      setAvatarPreview(user.avatar_path);
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    
    // Валидация формы
    if (formState.newPassword !== formState.confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }

    if (formState.newPassword.length < 8) {
      toast.error('Новый пароль должен содержать минимум 8 символов');
      return;
    }

    setIsLoading(true);
    
    try {
      await api.post('/users/me/reset-password', {
        current_password: formState.currentPassword,
        new_password: formState.newPassword
      });
      
      toast.success('Пароль успешно изменен');
      
      // Очищаем форму
      setFormState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при смене пароля');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Проверяем тип файла
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Пожалуйста, выберите изображение (JPEG, PNG, GIF, WEBP)');
      return;
    }

    // Создаем превью
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
    
    setAvatar(file);
    
    // Загружаем аватар на сервер
    const formData = new FormData();
    formData.append('avatar', file);
    
    setIsLoading(true);
    try {
      const response = await api.post('/users/me/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Обновляем данные пользователя в контексте
      updateUserData(response.data);
      
      // Обновляем данные в сторе авторизации
      useAuthStore.getState().setUser(response.data);
      
      // Сохраняем обновленного пользователя в localStorage
      localStorage.setItem('user', JSON.stringify(response.data));
      
      toast.success('Аватар успешно обновлен');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при загрузке аватара');
      // Сбрасываем превью при ошибке
      if (user?.avatar_path) {
        setAvatarPreview(user.avatar_path);
      } else {
        setAvatarPreview(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto mt-10 shadow-lg animate-fadeIn">
      <CardBody className="p-6">
        <h2 className="text-2xl font-bold text-center mb-6 text-primary">Настройки профиля</h2>
        
        {/* Аватар */}
        <div className="flex flex-col items-center mb-6">
          <div 
            className="relative cursor-pointer group transition-transform transform hover:scale-105"
            onClick={handleAvatarClick}
          >
            <AvatarWithFallback 
              src={avatarPreview} 
              className="w-24 h-24 text-large"
              name={user?.email?.charAt(0).toUpperCase()}
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <span className="text-white text-xs">Изменить</span>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleAvatarChange}
            accept="image/jpeg,image/png,image/gif,image/webp"
          />
          <p className="text-small text-gray-500 mt-2">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-gray-400">{user?.role === 'patient' ? 'Пациент' : user?.role === 'doctor' ? 'Врач' : 'Администратор'}</p>
            {isGoogleUser && (
              <Chip size="sm" color="primary" variant="flat">Google</Chip>
            )}
          </div>
        </div>
        
        <Divider className="my-4" />
        
        {/* Форма смены пароля только для пользователей с auth_provider=email */}
        {!isGoogleUser && (
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <h3 className="text-lg font-semibold mb-3">Изменение пароля</h3>
            
            <Input
              type="password"
              label="Текущий пароль"
              name="currentPassword"
              value={formState.currentPassword}
              onChange={handleInputChange}
              required
            />
            
            <Input
              type="password"
              label="Новый пароль"
              name="newPassword"
              value={formState.newPassword}
              onChange={handleInputChange}
              required
            />
            
            <Input
              type="password"
              label="Подтвердите новый пароль"
              name="confirmPassword"
              value={formState.confirmPassword}
              onChange={handleInputChange}
              required
            />
            
            <Button 
              type="submit" 
              color="primary" 
              className="w-full"
              isLoading={isLoading}
              isDisabled={!formState.currentPassword || !formState.newPassword || !formState.confirmPassword}
            >
              Изменить пароль
            </Button>
          </form>
        )}
        
        {/* Информация для пользователей Google */}
        {isGoogleUser && (
          <div className="bg-blue-50 p-4 rounded-lg mt-4">
            <h3 className="text-md font-semibold text-blue-700 mb-2">Информация об аккаунте Google</h3>
            <p className="text-sm text-blue-600">
              Вы авторизованы через аккаунт Google. Для управления паролем используйте настройки безопасности Google.
            </p>
          </div>
        )}
        
        {/* Другие настройки профиля */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Настройки уведомлений</h3>
          <p className="text-sm text-gray-500 mb-4">
            Управление уведомлениями будет доступно в ближайших обновлениях.
          </p>
          <Button 
            color="primary" 
            variant="flat" 
            className="w-full"
            isDisabled
          >
            Настроить уведомления
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export default UserProfile; 