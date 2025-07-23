import axios from 'axios';

// Определяем базовый URL нашего бэкенда
// Используем переменную окружения VITE_API_URL если она есть, иначе используем localhost для разработки
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'; // Local development URL

export const DIRECT_API_URL = API_BASE_URL;

export const WS_BASE_URL = ''; // Пустая строка для использования относительных путей через прокси

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json', // По умолчанию отправляем JSON
  },
  // Важно для работы с куками
  withCredentials: true,
  // Изменяем параметры для правильной обработки ошибок
  validateStatus: status => status >= 200 && status < 300, // Считаем успешными только 2xx ответы
});

// Добавляем интерцепторы для логирования запросов и добавления токена
api.interceptors.request.use(
  config => {
    try {
      // Проверяем, есть ли токен в localStorage перед каждым запросом
      const token = localStorage.getItem('auth_token');
      
      // Проверяем, не установлен ли заголовок Authorization явно в конфигурации запроса
      const hasExplicitAuth = config.headers && 
                            (config.headers['Authorization'] || config.headers.Authorization);
      
      // Проверяем, не является ли это маршрутом, который не требует авторизации
      const isPublicRoute = config.url && (
        config.url.includes('/auth/') || 
        config.url.includes('/token') || 
        config.url.includes('/login') ||
        config.url.includes('/register') ||
        config.url.includes('/api/doctors') ||
        config.url.includes('/api/specializations') ||
        config.url.includes('/api/districts') ||
        config.url === '/status' ||
        /\/api\/doctors\/\d+/.test(config.url)
      );
      
      if (token && !hasExplicitAuth) {
        // Устанавливаем токен в заголовки для всех запросов, если он не установлен явно
        config.headers['Authorization'] = `Bearer ${token}`;
        
        // Дополнительная проверка, что заголовок установился корректно
        if (!config.headers['Authorization'] || config.headers['Authorization'] !== `Bearer ${token}`) {
          // Отключаем предупреждение, просто тихо повторяем попытку
          // console.warn(`⚠️ Interceptor: Authorization header was not set correctly for ${config.url}`);
          
          // Еще одна попытка установить заголовок
          config.headers.Authorization = `Bearer ${token}`;
          config.headers.common = config.headers.common || {};
          config.headers.common['Authorization'] = `Bearer ${token}`;
        }
        
        // Отключаем логирование токена для всех запросов
      } else if (!token && !hasExplicitAuth && !isPublicRoute) {
        // Полностью отключаем предупреждение о токене
        // console.warn(`⚠️ Interceptor: Токен отсутствует для запроса к ${config.url}`);
      }
      
      // Проверяем запросы к несуществующим эндпоинтам
      if (config.url && config.url.includes('/token/ws')) {
        // Создаем ошибку для отмены запроса
        const error = new Error('Запрос к несуществующему эндпоинту /token/ws отменен');
        return Promise.reject(error);
      }
      
      // Полноценное логирование запроса
      const logLevel = config.url.includes('csrf-token') || config.url.includes('change-password') 
        ? 'info' // Важные запросы логируем с уровнем info
        : 'debug'; // Остальные с уровнем debug

      if (logLevel === 'info') {
        // Для методов с телом обрабатываем данные
        if (config.data) {
          try {
            // Маскируем пароли для безопасности
            const safeData = { ...config.data };
            if (safeData.current_password) safeData.current_password = '********';
            if (safeData.new_password) safeData.new_password = '********';
          } catch (e) {
          }
        }
      }
      
      return config;
    } catch (interceptorError) {
      // Возвращаем исходный конфиг без изменений, чтобы запрос мог продолжиться
      return config;
    }
  },
  error => {
    return Promise.reject(error);
  }
);

// Добавляем интерцепторы для логирования ответов
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    
    // Проверяем наличие статуса ошибки
    if (error.response) {
      
      // Если ошибка 401 (неавторизован), значит токен истек или недействителен
      if (error.response.status === 401) {
        
        // Получаем текущий URL, чтобы исключить страницы авторизации
        const currentPath = window.location.pathname;
        if (['/login', '/register', '/auth/google/callback'].includes(currentPath)) {
          // Если мы на странице авторизации, просто возвращаем ошибку
          return Promise.reject(error);
        }
        
        // Пробуем получить токен из localStorage
        const currentToken = localStorage.getItem('auth_token');
        if (!currentToken) {
          // Если токена вообще нет, перенаправляем на логин
          window.location.href = '/login';
          return Promise.reject(error);
        }
        
        // Очищаем localStorage от неработающего токена
        try {
          localStorage.removeItem('auth_token');
          
          // Удаляем заголовок авторизации из дефолтных заголовков
          delete api.defaults.headers.common['Authorization'];
        } catch (e) {
        }
        
        // Перенаправляем на страницу входа
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }
    
    return Promise.reject(error);
  }
);

// Функция для установки токена аутентификации в заголовки
export const setAuthToken = (token) => {
  try {
    if (token) {
      // Проверяем валидность токена (должен быть строкой и непустым)
      if (typeof token !== 'string' || token.trim() === '') {
        return false;
      }
    
      // Сначала очищаем предыдущий токен и заголовки
      localStorage.removeItem('auth_token');
      
      try {
        delete api.defaults.headers.common['Authorization'];
        delete api.defaults.headers.Authorization;
      } catch (headerError) {
      }
      
      // Сразу синхронно сохраняем токен в localStorage без таймаута
      localStorage.setItem('auth_token', token);
      
      try {
        // Устанавливаем токен для всех последующих запросов в разных форматах
        if (api && api.defaults && api.defaults.headers) {
          if (!api.defaults.headers.common) api.defaults.headers.common = {};
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          api.defaults.headers.Authorization = `Bearer ${token}`;
        } else {
        }
      } catch (apiHeaderError) {
        // Даже если не удалось установить заголовки, токен сохранен в localStorage
        // и будет использован при следующих запросах через интерцептор
      }
      
      try {
        if (api && api.defaults && api.defaults.headers && api.defaults.headers.common && api.defaults.headers.common['Authorization']) {
        } else {
        }
      } catch (logError) {
      }
      
      return true;
    } else {
      // Удаляем токен из заголовков и localStorage при выходе
      try {
        delete api.defaults.headers.common['Authorization'];
        delete api.defaults.headers.Authorization;
      } catch (cleanupError) {
      }
      
      localStorage.removeItem('auth_token');
      return true;
    }
  } catch (error) {
    return false;
  }
};

// Функция для загрузки токена из localStorage при инициализации приложения
export const loadStoredToken = () => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    setAuthToken(token);
    return true;
  }
  return false;
};

// Инициализация: загружаем токен из localStorage при старте
loadStoredToken();

// Функция для выполнения выхода пользователя
export const logout = async () => {
  try {
    // Удаляем токен из localStorage и заголовков
    setAuthToken(null);
    
    // Перенаправляем на страницу входа
    window.location.href = '/login';
    return true;
  } catch (error) {
    return false;
  }
};

// Вспомогательная функция для получения CSRF токена
export const getCsrfToken = async () => {
  try {
    const response = await api.get('/csrf-token');
    return response.data.csrf_token;
  } catch (error) {
    throw error;
  }
};

// API для работы с врачами
export const doctorsApi = {
  // Получение списка врачей с возможностью фильтрации
  getDoctors: async (filters = {}, page = 1, size = 10) => {
    try {
      // Формируем параметры запроса из переданных фильтров
      const params = { page, size, ...filters };
      const response = await api.get('/api/doctors', { params });
          return response.data;
  } catch (error) {
    throw error;
  }
  },

  // Получение детальной информации о враче по ID
  getDoctorById: async (doctorId) => {
    try {
      const response = await api.get(`/api/doctors/${doctorId}`);
          return response.data;
  } catch (error) {
    throw error;
  }
  },
  
  // Получение списка специализаций
  getSpecializations: async () => {
    try {
      const response = await api.get('/api/specializations');
          return response.data;
  } catch (error) {
    throw error;
  }
  },

  // Получение статистики врачей по специализациям
  getSpecializationsStats: async () => {
    try {
      const response = await api.get('/api/specializations/stats');
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

// API для работы с уведомлениями и статусами заявок
export const notificationsApi = {
  // Получение обновлений статуса заявок на роль врача для текущего пользователя
  checkDoctorApplicationUpdates: async () => {
    try {
      const response = await api.get('/users/me/doctor-applications');
          return response.data;
  } catch (error) {
    throw error;
  }
  },
  
  // Получение всех непрочитанных уведомлений для текущего пользователя
  // Примечание: этот эндпоинт нужно будет реализовать на бэкенде
  getUnreadNotifications: async () => {
    try {
      const response = await api.get('/users/me/notifications?unread=true');
      return response.data;
    } catch (error) {
      // Возвращаем пустой массив, если эндпоинт еще не реализован на бэкенде
      return [];
    }
  },
  
  // Отметка уведомления как прочитанного
  // Примечание: этот эндпоинт нужно будет реализовать на бэкенде
  markNotificationAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/users/me/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Отметка уведомления о заявке как просмотренного
  markAsViewed: async (applicationId) => {
    try {
      await api.post('/users/me/notifications/viewed', { application_id: applicationId });
      return true; // Успешно
    } catch (error) {
      return false; // Ошибка
    }
  },
  
  // Получение настроек уведомлений пользователя
  getNotificationSettings: async () => {
    try {
      const response = await api.get('/users/me/notification-settings');
      
      // Сохраняем полученные настройки в локальное хранилище для синхронизации
      try {
        const userInfo = await api.get('/users/me');
        // Определяем ключ хранилища в зависимости от роли пользователя
        const storageKey = userInfo.data.role === 'doctor' ? 
          'doctorNotificationSettings' : 'notificationSettings';
        
        // Сохраняем актуальные настройки
        sessionStorage.setItem(storageKey, JSON.stringify({
          push_notifications: response.data.push_notifications,
          appointment_reminders: response.data.appointment_reminders
        }));
        
      } catch (storageError) {
      }
      
      return response.data;
    } catch (error) {
      
      // Проверяем, есть ли сохраненные настройки
      let savedSettings;
      try {
        const userInfo = await api.get('/users/me');
        const storageKey = userInfo.data.role === 'doctor' ? 
          'doctorNotificationSettings' : 'notificationSettings';
        
        const savedData = sessionStorage.getItem(storageKey);
        if (savedData) {
          savedSettings = JSON.parse(savedData);
          console.info('Используем сохраненные настройки из sessionStorage:', savedSettings);
        }
      } catch (storageError) {
        console.warn('Не удалось получить настройки из sessionStorage:', storageError);
      }
      
      // Возвращаем сохраненные настройки или настройки по умолчанию
      return savedSettings || {
        push_notifications: true,
        appointment_reminders: true
      };
    }
  },
  
  // Обновление настроек уведомлений пользователя
  updateNotificationSettings: async (settings) => {
    try {
      console.info('Отправка настроек уведомлений:', {
        ...settings,
        csrf_token: settings.csrf_token ? '[MASKED]' : 'missing'
      });
      
      // Проверяем наличие CSRF токена
      if (!settings.csrf_token) {
        throw new Error('CSRF токен обязателен для обновления настроек');
      }
      
      // Выполняем запрос на обновление настроек
      const response = await api.put('/users/me/notification-settings', settings);
      console.info('Настройки уведомлений успешно обновлены на сервере');
      
      // Сохраняем обновленные настройки в локальное хранилище
      try {
        const userInfo = await api.get('/users/me');
        // Определяем ключ хранилища в зависимости от роли пользователя
        const storageKey = userInfo.data.role === 'doctor' ? 
          'doctorNotificationSettings' : 'notificationSettings';
        
        // Сохраняем обновленные настройки без csrf_token
        const { csrf_token, ...notificationSettings } = settings;
        sessionStorage.setItem(storageKey, JSON.stringify(notificationSettings));
        
        console.info(`Обновленные настройки уведомлений сохранены в ${storageKey}`);
        
        // Применяем настройки к реальным push-уведомлениям браузера
        if ('Notification' in window) {
          if (notificationSettings.push_notifications) {
            // Запрашиваем разрешение на показ уведомлений, если пользователь включил их
            Notification.requestPermission().then(permission => {
              console.info(`Статус разрешения на push-уведомления: ${permission}`);
            });
          }
        }
      } catch (storageError) {
        console.warn('Не удалось сохранить настройки в sessionStorage:', storageError);
      }
      
      return response.data;
    } catch (error) {
      
      // Проверяем, можно ли повторить запрос
      if (error.response && error.response.status === 403) {
        console.warn('Получена ошибка CSRF. Попытка повторного получения токена и отправки...');
        try {
          // Получаем новый CSRF токен
          const tokenResponse = await api.get('/csrf-token');
          const freshToken = tokenResponse.data.csrf_token;
          
          // Повторяем запрос с новым токеном
          console.info('Повторная отправка с новым CSRF токеном');
          const retryResponse = await api.put('/users/me/notification-settings', {
            ...settings,
            csrf_token: freshToken
          });
          console.info('Настройки уведомлений успешно обновлены при повторной попытке');
          return retryResponse.data;
        } catch (retryError) {
          throw retryError;
        }
      }
      
      throw error;
    }
  },
  
  // Функция для проверки и отладки статуса уведомлений
  checkNotificationsStatus: async () => {
    try {
      // Проверяем настройки из sessionStorage
      console.info('Проверка статуса уведомлений');
      
      let clientSettings = {
        patient: null,
        doctor: null
      };
      
      try {
        const patientSettings = sessionStorage.getItem('notificationSettings');
        if (patientSettings) {
          clientSettings.patient = JSON.parse(patientSettings);
        }
        
        const doctorSettings = sessionStorage.getItem('doctorNotificationSettings');
        if (doctorSettings) {
          clientSettings.doctor = JSON.parse(doctorSettings);
        }
      } catch (e) {
      }
      
      console.info('Локальные настройки уведомлений:', clientSettings);
      
      // Получаем настройки с сервера
      const serverSettings = await api.get('/users/me/notification-settings');
      console.info('Настройки уведомлений на сервере:', serverSettings.data);
      
      return {
        clientSettings,
        serverSettings: serverSettings.data,
        mismatch: JSON.stringify(clientSettings) !== JSON.stringify(serverSettings.data)
      };
    } catch (error) {
      return {
        error: error.message,
        status: 'error'
      };
    }
  }
};

// Получение списка районов Ташкента
api.getDistricts = async () => {
  try {
    const response = await api.get('/api/districts');
    return response.data;
  } catch (error) {
    // Возвращаем статический список районов в случае ошибки
    return [
      "Алмазарский район",
      "Бектемирский район",
      "Мирабадский район",
      "Мирзо-Улугбекский район",
      "Сергелийский район",
      "Учтепинский район",
      "Чиланзарский район",
      "Шайхантаурский район",
      "Юнусабадский район",
      "Яккасарайский район",
      "Яшнабадский район"
    ];
  }
};

// Вспомогательная функция для получения валидного токена доступа для WebSocket
export const getValidTokenForWS = async () => {
  try {
    const response = await api.get('/api/ws-token');
    return response.data.token;
  } catch (error) {
    throw error;
  }
};

// Функция для загрузки аватара пользователя
export const uploadAvatar = async (file) => {
  try {
    // Создаем объект FormData для отправки файла
    const formData = new FormData();
    formData.append('avatar', file);
    
    
    // Отправляем запрос на единственный правильный эндпоинт
    const response = await api.post('/users/me/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Функции для работы с консультациями
export const consultationsApi = {
  // Получение списка консультаций
  getConsultations: async (filters = {}, page = 1, size = 10) => {
    try {
      const params = { page, size, ...filters };
      const response = await api.get('/api/consultations', { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Получение детальной информации о консультации
  getConsultationById: async (consultationId) => {
    try {
      const response = await api.get(`/api/consultations/${consultationId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Получение всех сообщений консультации
  getConsultationMessages: async (consultationId) => {
    try {
      const response = await api.get(`/api/consultations/${consultationId}/messages`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Получение только новых сообщений после указанного времени
  getConsultationMessagesSince: async (consultationId, timestamp) => {
    try {
      const params = { since: timestamp };
      const response = await api.get(`/api/consultations/${consultationId}/messages`, { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  
  // Завершение консультации через API (запасной метод)
  completeConsultation: async (consultationId) => {
    try {
      const response = await api.post(`/api/consultations/${consultationId}/complete`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Загрузка файла в консультацию
  uploadFile: async (consultationId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      
      const response = await api.post(`/api/consultations/${consultationId}/upload-file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Отправка сообщения с файлами
  sendMessageWithFiles: async (consultationId, content, fileData = []) => {
    try {
      const formData = new FormData();
      formData.append('content', content);
      if (fileData.length > 0) {
        formData.append('attachment_ids', JSON.stringify(fileData));
      }
      
      
      const response = await api.post(`/api/consultations/${consultationId}/messages-with-files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
// Экспортируем базовый экземпляр API
export default api;