import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../api';
import { toast } from 'react-toastify';

// Создаем контекст аутентификации
const AuthContext = createContext(null);

// Провайдер контекста
export const AuthProvider = ({ children }) => {
  // Состояние пользователя, токена и загрузки
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // Эффект для проверки токена при загрузке
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          // Настраиваем токен в заголовках по умолчанию
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Получаем информацию о пользователе
          const response = await api.get('/users/me');
          setUser(response.data);
        } catch (error) {
          console.error('Error loading user:', error);
          // Если ошибка авторизации, очищаем токен
          if (error.response?.status === 401) {
            localStorage.removeItem('token');
            setToken(null);
            delete api.defaults.headers.common['Authorization'];
          }
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  // Функция для входа
  const login = async (email, password) => {
    try {
      const response = await api.post('/token', 
        new URLSearchParams({
          'username': email,
          'password': password
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const { access_token } = response.data;
      
      // Сохраняем токен в localStorage и состоянии
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      // Устанавливаем токен в headers по умолчанию
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Получаем данные пользователя
      const userResponse = await api.get('/users/me');
      setUser(userResponse.data);
      
      return userResponse.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Функция для Google OAuth логина
  const googleLogin = async (code) => {
    try {
      const response = await api.post('/auth/google', { code });
      const { access_token } = response.data;
      
      // Сохраняем токен в localStorage и состоянии
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      // Устанавливаем токен в headers по умолчанию
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Получаем данные пользователя
      const userResponse = await api.get('/users/me');
      setUser(userResponse.data);
      
      return userResponse.data;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  };
  
  // Функция для регистрации
  const register = async (email, password, role) => {
    try {
      const response = await api.post('/register', {
        email,
        password,
        role
      });
      
      // Автоматический вход после регистрации, получаем токен сразу из ответа
      const { access_token } = response.data;
      
      // Сохраняем токен в localStorage и состоянии
      localStorage.setItem('token', access_token);
      setToken(access_token);
      
      // Устанавливаем токен в headers по умолчанию
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Получаем данные пользователя
      const userResponse = await api.get('/users/me');
      setUser(userResponse.data);
      
      // Показываем уведомление о необходимости подтверждения почты
      toast.info('Пожалуйста, подтвердите вашу почту, перейдя по ссылке из письма', {
        autoClose: false
      });
      
      return userResponse.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Функция для выхода
  const logout = () => {
    // Удаляем токен из localStorage и состояния
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    
    // Удаляем токен из headers
    delete api.defaults.headers.common['Authorization'];
  };
  
  // Функция для обновления данных пользователя
  const updateUserData = (userData) => {
    setUser(userData);
  };

  // Предоставляем контекст
  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      loading, 
      login, 
      logout, 
      register, 
      googleLogin,
      updateUserData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук для использования контекста аутентификации
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 