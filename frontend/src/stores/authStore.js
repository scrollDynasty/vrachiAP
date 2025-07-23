// frontend/src/stores/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api, { logout, setAuthToken, DIRECT_API_URL } from '../api';
import { toast } from 'react-toastify';
import axios from 'axios';

// Store for managing authentication state
const useAuthStore = create(
  persist(
    (set, get) => ({
      // Auth state
      isAuthenticated: false,
      user: null,
      token: null,
      needsProfileUpdate: false,
      error: null,
      isLoading: true,
      pendingVerificationEmail: null,
      
      // Initialize authentication from cookies
      initializeAuth: async () => {
        
        // Проверяем, не находимся ли мы на странице Google auth callback
        // Если да, то НЕ меняем isLoading, чтобы предотвратить редиректы на логин
        if (window.location.pathname === '/auth/google/callback') {
          // НЕ устанавливаем isLoading: false, позволяя GoogleAuthCallback обработать аутентификацию
          // Состояние isLoading: true предотвратит редиректы на /login в App.jsx
          return;
        }
        
        try {
          // Попытка получить токен из localStorage
          try {
            // Получаем токен из localStorage
            const token = localStorage.getItem('auth_token');
            
            if (token) {
              
              // Пробуем установить токен в заголовки запросов API
              try {
                // Отдельно импортируем функцию установки токена
                const { setAuthToken } = await import('../api');
                const result = setAuthToken(token);
                
                if (result) {
                } else {
                }
              } catch (tokenSetError) {
              }
              
              // Устанавливаем необходимые заголовки для запроса проверки аутентификации
              const headers = {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': `Bearer ${token}`
              };
              
              // Проверка валидности токена на сервере
              try {
                const response = await api.get('/users/me', {
                  headers,
                  timeout: 5000 // Добавляем таймаут в 5 секунд
                });
                
                // Если запрос успешен, устанавливаем состояние аутентификации
                if (response && response.data) {
                  set({ 
                    token, 
                    isAuthenticated: true, 
                    user: response.data,
                    error: null,
                    isLoading: false
                  });
                  return;
                } else {
                }
              } catch (error) {
                // Если ошибка 401, токен недействителен - очищаем хранилище
                if (error.response && error.response.status === 401) {
                  localStorage.removeItem('auth_token');
                  
                  // Очищаем заголовок авторизации
                  try {
                    delete api.defaults.headers.common['Authorization'];
                  } catch (headerError) {
                  }
                }
              }
            } else {
            }
          } catch (storageError) {
          }
        } catch (e) {
        } finally {
          // В любом случае, завершаем загрузку
          set({ isLoading: false });
        }
        
        // Если мы дошли сюда, значит аутентификация не удалась
        set({ 
          token: null, 
          isAuthenticated: false, 
          user: null,
          error: null,
          isLoading: false
        });
      },
      
      // Check if we're authenticated
      checkAuth: async () => {
        try {
          // Проверяем, установлены ли заголовки авторизации
          let hasAuthHeader = false;
          
          try {
            if (api && api.defaults && api.defaults.headers) {
              const authHeader = api.defaults.headers.common?.['Authorization'] || api.defaults.headers.Authorization;
              hasAuthHeader = !!authHeader && authHeader.startsWith('Bearer ');
              
              if (!hasAuthHeader && get().token) {
                setAuthToken(get().token);
              }
            }
          } catch (headerError) {
          }
          
          // Send a request to the protected endpoint to check auth status
          const response = await api.get('/users/me', {
            headers: get().token ? { 'Authorization': `Bearer ${get().token}` } : undefined,
            timeout: 5000 // Устанавливаем таймаут в 5 секунд
          });
          
          if (response.status === 200 && response.data) {
            // Update user data in the store
            set({ 
              isAuthenticated: true, 
              user: response.data,
              error: null
            });
            
            // Check if user needs to complete profile
            const isProfileComplete = 
              (response.data.role === 'patient' && response.data.patient_profile) ||
              (response.data.role === 'doctor' && response.data.doctor_profile);
              
            set({ needsProfileUpdate: !isProfileComplete });
            
            return true;
          } else {
            // If response is invalid, user is not authenticated
            set({ 
              isAuthenticated: false, 
              user: null, 
              error: 'Не удалось получить данные пользователя'
            });
            return false;
          }
        } catch (error) {
          // If request fails, user is not authenticated
          
          // Проверяем, была ли ошибка из-за отключенной сети
          if (error.message?.includes('Network Error') || !navigator.onLine) {
            return get().isAuthenticated; // Сохраняем текущее состояние авторизации
          }
          
          set({ 
            isAuthenticated: false, 
            user: null,
            error: error.message || 'Ошибка проверки авторизации'
          });
          
          return false;
        }
      },
      
      // User login
      login: async (email, password) => {
        try {
          // Send login request
          const response = await api.post('/token', {
            username: email,
            password: password
          }, {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          });
          
          // Authentication successful, update state
          if (response.status === 200) {
            
            let needsProfile = false;
            const token = response.data?.access_token;
            
            // Сохраняем токен в localStorage
            if (token) {
              
              // Устанавливаем токен в localStorage и API
              setAuthToken(token);
              
              // Очистка всех остаточных данных от предыдущих сессий
              localStorage.removeItem('vrach_registration_profile');
              sessionStorage.removeItem('last_token_time');
              sessionStorage.removeItem('current_auth_session');
              sessionStorage.removeItem('is_google_auth_in_progress');
              
              // Явно записываем токен в store
              set({ token: token });
              
              // Пробуем проверить наличие профиля пользователя
              try {
                const profileResponse = await api.get('/users/me/profile', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (profileResponse.status === 200 && profileResponse.data) {
                  // Профиль уже существует
                  needsProfile = false;
                }
              } catch (profileError) {
                if (profileError.response && profileError.response.status === 404) {
                  // Профиль не найден, значит действительно нужно создать
                  needsProfile = true;
                } else {
                  // Оставляем значение needsProfile как false по умолчанию
                }
              }
              
              // Устанавливаем состояние аутентификации
              set({ 
                isAuthenticated: true, 
                token: token,
                needsProfileUpdate: needsProfile,
                error: null,
                isLoading: false,
                pendingVerificationEmail: null
              });
              
              // Пробуем получить данные пользователя
              try {
                const userResponse = await api.get('/users/me', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (userResponse.status === 200 && userResponse.data) {
                  set({ user: userResponse.data });
                  return true;
                }
              } catch (userError) {
                // Даже если не удалось получить данные пользователя, токен корректен
              }
              
              return true;
            } else {
              throw new Error('Токен доступа не получен от сервера');
            }
          } else {
            throw new Error('Неверные учетные данные');
          }
        } catch (error) {
          let errorMessage = 'Произошла ошибка при входе в систему';
          
          if (error.response) {
            if (error.response.status === 401) {
              errorMessage = 'Неверный email или пароль';
            } else if (error.response.data && error.response.data.detail) {
              errorMessage = error.response.data.detail;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          set({ 
            isAuthenticated: false, 
            user: null,
            token: null,
            error: errorMessage,
            isLoading: false
          });
          
          throw new Error(errorMessage);
        }
      },
      
      // User registration
      register: async (userData) => {
        try {
          
          // Извлекаем нужные поля или используем объект целиком
          const { email, password, role = 'patient', ...profileData } = userData;
          
          // Create user account
          const response = await api.post('/register', {
            email,
            password,
            role,
            is_active: true, // Auto-activate user
            ...profileData // Передаем остальные данные профиля
          });
          
          if (response.status === 201) {
            
            // Проверяем ответ на наличие флага email_verification_required
            if (response.data.email_verification_required) {
              // Если требуется подтверждение email - НЕ делаем автологин
              set({ 
                pendingVerificationEmail: email,
                error: null,
                isLoading: false // Сбрасываем состояние загрузки
              });
              return { 
                success: true, 
                requiresEmailVerification: true,
                message: response.data.message || "Регистрация успешна! Проверьте почту для подтверждения.",
                email: response.data.email || email
              };
            } else {
              // Если подтверждение email не требуется, пробуем авторизоваться
              try {
                const loginResult = await get().login(email, password);
                return { success: true, requiresEmailVerification: false };
              } catch (loginError) {
                // Если автологин не удался, все равно считаем регистрацию успешной
                set({ 
                  pendingVerificationEmail: email,
                  error: null,
                  isLoading: false
                });
                return { 
                  success: true, 
                  requiresEmailVerification: true,
                  message: "Регистрация успешна! Пожалуйста, войдите в систему."
                };
              }
            }
          } else {
            throw new Error('Регистрация не удалась');
          }
        } catch (error) {
          let errorMessage = 'Произошла ошибка при регистрации';
          
          // Обеспечиваем, что состояние загрузки сброшено
          set({ 
            isLoading: false,
            isAuthenticated: false, 
            user: null, 
            token: null
          });
          
          if (error.response) {
            
            if (error.response.status === 422) {
              // Валидационные ошибки
              if (error.response.data && error.response.data.detail) {
                if (Array.isArray(error.response.data.detail)) {
                  // Обрабатываем массив ошибок валидации
                  const validationErrors = error.response.data.detail.map(err => {
                    const field = err.loc ? err.loc[err.loc.length - 1] : 'unknown';
                    return `${field}: ${err.msg}`;
                  }).join(', ');
                  errorMessage = `Ошибки валидации: ${validationErrors}`;
                } else {
                  errorMessage = error.response.data.detail;
                }
              } else {
                errorMessage = 'Данные не прошли валидацию. Проверьте правильность заполнения формы.';
              }
            } else if (error.response.status === 400) {
              if (error.response.data && error.response.data.detail) {
                if (typeof error.response.data.detail === 'string' && error.response.data.detail.includes('already registered')) {
                  errorMessage = 'Пользователь с таким email уже зарегистрирован';
                } else {
                  errorMessage = error.response.data.detail;
                }
              } else {
                errorMessage = 'Некорректные данные для регистрации';
              }
            } else if (error.response.data && error.response.data.detail) {
              errorMessage = typeof error.response.data.detail === 'string' 
                ? error.response.data.detail 
                : 'Ошибка на сервере';
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          set({ 
            isAuthenticated: false, 
            user: null, 
            token: null,
            error: errorMessage,
            isLoading: false
          });
          
          throw new Error(errorMessage);
        }
      },
      
      // Logout user
      logout: async () => {
        try {
          // Очищаем токен из localStorage
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          localStorage.removeItem('vrach_registration_profile');
          sessionStorage.removeItem('last_token_time');
          sessionStorage.removeItem('current_auth_session');
          sessionStorage.removeItem('is_google_auth_in_progress');
          
          // Очищаем заголовки API
          delete api.defaults.headers.common['Authorization'];
          
          // Сбрасываем состояние в store
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            error: null,
            pendingVerificationEmail: null,
            needsProfileUpdate: false,
            isLoading: false
          });
          
          
          return true;
        } catch (error) {
          return false;
        }
      },
      
      // Refresh token from server
      refreshToken: async () => {
        try {
          // Проверяем наличие текущего пользователя и токена
          const currentStore = get();
          if (!currentStore.token) {
            return false;
          }
          
          // Сохраняем текущий URL
          const currentUrl = window.location.href;
          sessionStorage.setItem('auth_redirect_url', currentUrl);
          
          // Перенаправляем на авторизацию Google
          window.location.href = `${DIRECT_API_URL}/auth/google/login`;
          
          return true;
        } catch (error) {
          return false;
        }
      },
      
      // Fetch current user data
      fetchUserData: async () => {
        try {
          // Сохраняем текущий токен перед запросом
          const currentToken = get().token;
          
          if (!currentToken) {
            return false;
          }
          
          
          const response = await api.get('/users/me', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          });
          
          if (response.status === 200 && response.data) {
            set({ 
              user: response.data,
              error: null
            });
            
            // Check if user needs to complete profile
            const isProfileComplete = 
              (response.data.role === 'patient' && response.data.patient_profile) ||
              (response.data.role === 'doctor' && response.data.doctor_profile);
              
            set({ needsProfileUpdate: !isProfileComplete });
            
            return true;
          } else {
            return false;
          }
        } catch (error) {
          if (error.response && error.response.status === 401) {
            // Token is invalid, clear authentication
            localStorage.removeItem('auth_token');
            set({
              isAuthenticated: false,
              user: null,
              token: null,
              error: 'Сессия истекла, пожалуйста, войдите снова'
            });
          }
          
          return false;
        }
      },
      
      // Reset auth state - only used for testing or in case of critical errors
      resetAuth: () => {
        try {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          localStorage.removeItem('vrach_registration_profile');
          sessionStorage.removeItem('last_token_time');
          api.defaults.headers.common['Authorization'] = '';
        } catch (error) {
        }
        
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          error: null,
          pendingVerificationEmail: null,
          needsProfileUpdate: false
        });
      },
      
      // Process Google Auth
      processGoogleAuth: async (code) => {
        try {
          
          // Очистка данных предыдущего пользователя для предотвращения конфликтов
          // Сохраняем идентификатор текущей авторизации, чтобы не сбросить собственный токен при множественных вызовах
          const authSessionId = sessionStorage.getItem('current_auth_session');
          
          // Очищаем все данные авторизации
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_data');
          localStorage.removeItem('vrach_registration_profile');
          api.defaults.headers.common['Authorization'] = '';
          
          // Устанавливаем новый идентификатор сессии
          const newAuthSessionId = Date.now().toString();
          sessionStorage.setItem('current_auth_session', newAuthSessionId);
          sessionStorage.setItem('is_google_auth_in_progress', 'true');
          
          // Проверяем, если токен уже получен недавно (в течение последней минуты)
          const lastTokenTime = sessionStorage.getItem('last_token_time');
          if (lastTokenTime && (Date.now() - parseInt(lastTokenTime)) < 60000) {
            // Проверяем, действительно ли у нас есть действительный токен
            if (get().token) {
              return true;
            }
          }
          
                      // Send Google auth request to the correct callback endpoint
            const response = await axios.post(`${DIRECT_API_URL}/auth/google/callback`, { 
              code,
              // Устанавливаем длительное время жизни токена - 7 дней
              expires_in_days: 7
            }, {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              timeout: 15000, // Увеличиваем таймаут для этого запроса
              withCredentials: true // Необходимо для сохранения cookie
            });
          
          
          if (response.status === 200 && response.data) {
            let needsProfile = !!response.data?.need_profile;
            const token = response.data?.access_token;
            
            if (!token) {
              throw new Error('Ошибка авторизации: не получен токен доступа');
            }
            
            // Проверяем токен на валидность
            if (typeof token !== 'string' || token.trim() === '') {
              throw new Error('Ошибка авторизации: неверный формат токена');
            }
            
            
            // Сначала сохраняем токен в localStorage и устанавливаем в заголовки API
            try {
              const tokenSet = setAuthToken(token);
              
              // Записываем время получения токена
              sessionStorage.setItem('last_token_time', Date.now().toString());
              
              // Очищаем все закешированные данные профиля из регистрации
              localStorage.removeItem('vrach_registration_profile');
              
              // Попробуем извлечь роль пользователя из токена
              try {
                // Простой парсинг JWT токена для получения полезной нагрузки
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                  const payload = JSON.parse(atob(tokenParts[1]));
                  
                  // Проверяем наличие роли в токене
                  if (payload.role) {
                    // Сохраняем роль пользователя в localStorage
                    localStorage.setItem('user_role', payload.role);
                  }
                }
              } catch (tokenParseError) {
              }
            } catch (tokenError) {
            }
            
            // Пробуем проверить наличие профиля пользователя перед установкой needsProfileUpdate
            try {
              const profileResponse = await api.get('/users/me/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (profileResponse.status === 200 && profileResponse.data) {
                // Проверяем, что ответ - это объект, а не HTML-страница
                if (typeof profileResponse.data === 'object') {
                // Профиль уже существует
                needsProfile = false; // Переопределяем, так как профиль уже существует
                } else {
                  needsProfile = true;
                }
              }
            } catch (profileError) {
              if (profileError.response && profileError.response.status === 404) {
                // Профиль не найден, значит действительно нужно создать
                needsProfile = true;
              } else {
                // Оставляем значение needsProfile из ответа авторизации
              }
            }
            
            // Затем сохраняем токен в store
            set({ 
              token: token,
              needsProfileUpdate: needsProfile,
              isAuthenticated: true, // Сразу устанавливаем флаг аутентификации
              pendingVerificationEmail: null // Очищаем pendingVerificationEmail, потому что Google аутентификация не требует подтверждения email
            });
            
            // Добавляем искусственную задержку перед продолжением для гарантии установки токена
            await new Promise(resolve => setTimeout(resolve, 500));
            
            try {
              // Выполним проверочный запрос для подтверждения работы токена
              const testResponse = await api.get('/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (testResponse.status === 200) {
              }
            } catch (testError) {
              // Даже если тест не удался, продолжаем - возможно, токен еще не применился во всех местах
            }
            
            try {
              // Пробуем получить данные пользователя
              const userResponse = await api.get('/users/me', {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Accept': 'application/json'
                }
              });
              
              if (userResponse.status === 200 && userResponse.data) {
                
                // Если в данных пользователя есть поле роли, сохраняем его в localStorage
                if (userResponse.data.role) {
                  localStorage.setItem('user_role', userResponse.data.role);
                }
                
                // Обновляем состояние со всеми данными пользователя
                set({ 
                  user: userResponse.data,
                  error: null
                });
                return true;
              } else {
              }
            } catch (userError) {
            }
            
            // Даже если не удалось получить данные пользователя,
            // флаг аутентификации уже установлен выше
            return true;
          } else {
            throw new Error('Ошибка при авторизации через Google');
          }
        } catch (error) {
          
          let errorMessage = 'Произошла ошибка при авторизации через Google';
          
          if (error.response) {
            if (error.response.data && error.response.data.detail) {
              errorMessage = error.response.data.detail;
            }
            
            if (error.response.data && error.response.data.error === 'invalid_grant') {
              errorMessage = 'Код авторизации истек или уже был использован. Пожалуйста, попробуйте войти снова.';
            }
          }
          
          set({ 
            isAuthenticated: false, 
            user: null,
            token: null,
            error: errorMessage,
            isLoading: false
          });
          
          throw new Error(errorMessage);
        }
      },
      
      // Функция для обработки подтверждения email
      handleEmailVerification: async (verificationData) => {
        try {

          if (!verificationData || !verificationData.token) {
            throw new Error('Некорректные данные подтверждения email');
          }

          // Устанавливаем токен от подтверждения email
          const token = verificationData.token;
          
          
          // Устанавливаем токен в localStorage и API
          setAuthToken(token);
          
          // Получаем данные пользователя с новым токеном
          const userResponse = await api.get('/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (userResponse.status === 200 && userResponse.data) {
            
            // Проверяем, нужно ли заполнять профиль
            const isProfileComplete = 
              (userResponse.data.role === 'patient' && userResponse.data.patient_profile) ||
              (userResponse.data.role === 'doctor' && userResponse.data.doctor_profile);
            
            // Обновляем состояние с полной информацией
            set({ 
              isAuthenticated: true,
              user: userResponse.data,
              token: token,
              needsProfileUpdate: !isProfileComplete,
              error: null,
              isLoading: false,
              pendingVerificationEmail: null // Очищаем, так как email подтвержден
            });
            
            return true;
          } else {
            throw new Error('Не удалось получить данные пользователя после подтверждения email');
          }
        } catch (error) {
          
          let errorMessage = 'Ошибка при обработке подтверждения email';
          
          if (error.response) {
            if (error.response.data && error.response.data.detail) {
              errorMessage = error.response.data.detail;
            }
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          set({ 
            error: errorMessage,
            isLoading: false
          });
          
          throw new Error(errorMessage);
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        needsProfileUpdate: state.needsProfileUpdate
      })
    }
  )
);

export default useAuthStore;