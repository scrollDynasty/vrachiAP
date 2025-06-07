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
        console.log('initializeAuth: Starting initialization');
        console.log('initializeAuth: Current pathname:', window.location.pathname);
        console.log('initializeAuth: Current href:', window.location.href);
        
        // Проверяем, не находимся ли мы на странице Google auth callback
        // Если да, то НЕ меняем isLoading, чтобы предотвратить редиректы на логин
        if (window.location.pathname === '/auth/google/callback') {
          console.log('initializeAuth: On Google auth callback page, keeping isLoading=true to prevent redirects');
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
              console.log('initializeAuth: Found token in localStorage');
              console.log('initializeAuth: Token value starts with:', token.substring(0, 10) + '...');
              
              // Пробуем установить токен в заголовки запросов API
              try {
                // Отдельно импортируем функцию установки токена
                const { setAuthToken } = await import('../api');
                const result = setAuthToken(token);
                
                if (result) {
                  console.log('initializeAuth: Token successfully set in headers');
                } else {
                  console.warn('initializeAuth: Failed to set token in headers');
                }
              } catch (tokenSetError) {
                console.error('initializeAuth: Error setting token in API headers:', tokenSetError);
              }
              
              // Устанавливаем необходимые заголовки для запроса проверки аутентификации
              const headers = {
                'Accept': 'application/json, text/plain, */*',
                'Authorization': `Bearer ${token}`
              };
              console.log('initializeAuth: Headers before request:', headers);
              
              // Проверка валидности токена на сервере
              try {
                console.log('initializeAuth: Checking authentication with token');
                const response = await api.get('/users/me', {
                  headers,
                  timeout: 5000 // Добавляем таймаут в 5 секунд
                });
                
                // Если запрос успешен, устанавливаем состояние аутентификации
                if (response && response.data) {
                  console.log('initializeAuth: Token is valid');
                  set({ 
                    token, 
                    isAuthenticated: true, 
                    user: response.data,
                    error: null,
                    isLoading: false
                  });
                  return;
                } else {
                  console.warn('initializeAuth: User data invalid or empty');
                }
              } catch (error) {
                console.error('initializeAuth: Token validation failed:', error.message);
                
                // Если ошибка 401, токен недействителен - очищаем хранилище
                if (error.response && error.response.status === 401) {
                  console.warn('initializeAuth: Token expired or invalid, removing from storage');
                  localStorage.removeItem('auth_token');
                  
                  // Очищаем заголовок авторизации
                  try {
                    delete api.defaults.headers.common['Authorization'];
                    console.log('initializeAuth: Auth header removed');
                  } catch (headerError) {
                    console.error('initializeAuth: Error removing auth header:', headerError);
                  }
                }
              }
            } else {
              console.log('initializeAuth: No token found in localStorage');
            }
          } catch (storageError) {
            console.error('initializeAuth: Error accessing localStorage:', storageError);
          }
        } catch (e) {
          console.error('initializeAuth: Critical error during initialization:', e);
        } finally {
          // В любом случае, завершаем загрузку
          console.log('initializeAuth: Finishing initialization, setting isLoading to false');
          set({ isLoading: false });
        }
        
        // Если мы дошли сюда, значит аутентификация не удалась
        console.log('initializeAuth: No authentication data found, setting to not authenticated');
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
                console.warn('checkAuth: Authorization header not found, but token exists in store');
                console.log('checkAuth: Trying to reapply token');
                setAuthToken(get().token);
              }
            }
          } catch (headerError) {
            console.error('checkAuth: Error checking authorization headers:', headerError);
          }
          
          // Send a request to the protected endpoint to check auth status
          console.log('checkAuth: Sending request to /users/me endpoint');
          const response = await api.get('/users/me', {
            headers: get().token ? { 'Authorization': `Bearer ${get().token}` } : undefined,
            timeout: 5000 // Устанавливаем таймаут в 5 секунд
          });
          
          if (response.status === 200 && response.data) {
            console.log('checkAuth: User authenticated successfully');
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
            console.warn('checkAuth: Invalid response from server');
            set({ 
              isAuthenticated: false, 
              user: null, 
              error: 'Не удалось получить данные пользователя'
            });
            return false;
          }
        } catch (error) {
          // If request fails, user is not authenticated
          console.error('Ошибка при проверке авторизации:', error);
          
          // Проверяем, была ли ошибка из-за отключенной сети
          if (error.message?.includes('Network Error') || !navigator.onLine) {
            console.warn('checkAuth: Network error detected, keeping current auth state');
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
            console.log('login: Authentication successful');
            
            let needsProfile = false;
            const token = response.data?.access_token;
            
            // Сохраняем токен в localStorage
            if (token) {
              console.log('login: Saving access token');
              console.log(`login: Token length: ${token.length}`);
              console.log(`login: Token starts with: ${token.substring(0, 10)}...`);
              
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
                console.log('login: Проверяем наличие профиля пользователя');
                const profileResponse = await api.get('/users/me/profile', {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (profileResponse.status === 200 && profileResponse.data) {
                  // Профиль уже существует
                  console.log('login: Профиль пользователя найден:', profileResponse.data);
                  needsProfile = false;
                }
              } catch (profileError) {
                if (profileError.response && profileError.response.status === 404) {
                  // Профиль не найден, значит действительно нужно создать
                  console.log('login: Профиль не найден, требуется создание');
                  needsProfile = true;
                } else {
                  console.error('login: Ошибка при проверке профиля:', profileError);
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
                  console.log('login: User data received successfully');
                  set({ user: userResponse.data });
                  return true;
                }
              } catch (userError) {
                console.error('login: Error fetching user data:', userError);
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
          console.error('Ошибка при входе:', error);
          
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
      register: async (email, password, role = 'patient') => {
        try {
          console.log('register: Starting registration process');
          
          // Create user account
          const response = await api.post('/auth/register', {
            email,
            password,
            role,
            is_active: true // Auto-activate user
          });
          
          if (response.status === 201) {
            console.log('register: Registration successful');
            
            // Пробуем сразу авторизоваться с теми же данными
            try {
              const loginResult = await get().login(email, password);
              console.log('register: Auto-login after registration successful');
              return { success: true, requiresEmailVerification: false };
            } catch (loginError) {
              console.error('register: Auto-login failed:', loginError);
              
              // Если автологин не удался, возвращаем успех регистрации
              // но требуем ручной авторизации
              set({ 
                pendingVerificationEmail: email,
                error: null
              });
              return { success: true, requiresEmailVerification: true };
            }
          } else {
            throw new Error('Регистрация не удалась');
          }
        } catch (error) {
          console.error('Ошибка при регистрации:', error);
          
          let errorMessage = 'Произошла ошибка при регистрации';
          
          if (error.response) {
            if (error.response.status === 400) {
              if (error.response.data && error.response.data.detail) {
                if (error.response.data.detail.includes('already registered')) {
                  errorMessage = 'Пользователь с таким email уже зарегистрирован';
                } else {
                  errorMessage = error.response.data.detail;
                }
              } else {
                errorMessage = 'Некорректные данные для регистрации';
              }
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
          
          console.log('logout: User logged out successfully');
          
          return true;
        } catch (error) {
          console.error('logout: Error during logout:', error);
          return false;
        }
      },
      
      // Refresh token from server
      refreshToken: async () => {
        try {
          // Проверяем наличие текущего пользователя и токена
          const currentStore = get();
          if (!currentStore.token) {
            console.warn('refreshToken: Нет текущего токена для обновления');
            return false;
          }
          
          // Сохраняем текущий URL
          const currentUrl = window.location.href;
          sessionStorage.setItem('auth_redirect_url', currentUrl);
          
          // Перенаправляем на авторизацию Google
          window.location.href = `${DIRECT_API_URL}/auth/google/login`;
          
          return true;
        } catch (error) {
          console.error('refreshToken: Ошибка при обновлении токена', error);
          return false;
        }
      },
      
      // Fetch current user data
      fetchUserData: async () => {
        try {
          // Сохраняем текущий токен перед запросом
          const currentToken = get().token;
          
          if (!currentToken) {
            console.warn('fetchUserData: No token available');
            return false;
          }
          
          console.log('fetchUserData: Fetching user data with token');
          
          const response = await api.get('/users/me', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          });
          
          if (response.status === 200 && response.data) {
            console.log('fetchUserData: User data fetched successfully');
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
            console.warn('fetchUserData: Invalid response from server');
            return false;
          }
        } catch (error) {
          console.error('fetchUserData: Error fetching user data:', error);
          
          if (error.response && error.response.status === 401) {
            // Token is invalid, clear authentication
            console.warn('fetchUserData: Token invalid, clearing auth');
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
          console.error('Error clearing auth data:', error);
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
          console.log('processGoogleAuth: Processing Google auth code');
          console.log(`processGoogleAuth: Code length: ${code.length}`);
          console.log(`processGoogleAuth: Code begins with: ${code.substring(0, 10)}...`);
          
          // Очистка данных предыдущего пользователя для предотвращения конфликтов
          console.log('processGoogleAuth: Очищаем данные предыдущего пользователя');
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
            console.log('processGoogleAuth: Токен был получен недавно, пропускаем повторный запрос');
            // Проверяем, действительно ли у нас есть действительный токен
            if (get().token) {
              console.log('processGoogleAuth: Используем существующий токен');
              return true;
            }
          }
          
          // Send Google auth request
          const response = await axios.post(`${DIRECT_API_URL}/auth/google`, { 
            code,
            // Устанавливаем длительное время жизни токена - 7 дней
            expires_in_days: 7
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            timeout: 10000, // Увеличиваем таймаут для этого запроса
            withCredentials: true // Необходимо для сохранения cookie
          });
          
          console.log('processGoogleAuth: Google auth request status:', response.status);
          console.log('processGoogleAuth: Google auth response data:', JSON.stringify(response.data).substring(0, 100) + '...');
          
          if (response.status === 200 && response.data) {
            let needsProfile = !!response.data?.need_profile;
            const token = response.data?.access_token;
            
            if (!token) {
              console.error('processGoogleAuth: No access_token in response!');
              throw new Error('Ошибка авторизации: не получен токен доступа');
            }
            
            // Проверяем токен на валидность
            if (typeof token !== 'string' || token.trim() === '') {
              console.error('processGoogleAuth: Invalid token format');
              throw new Error('Ошибка авторизации: неверный формат токена');
            }
            
            console.log('processGoogleAuth: Saving access token');
            console.log(`processGoogleAuth: Token length: ${token.length}`);
            console.log(`processGoogleAuth: Token starts with: ${token.substring(0, 10)}...`);
            
            // Сначала сохраняем токен в localStorage и устанавливаем в заголовки API
            try {
              const tokenSet = setAuthToken(token);
              console.log('processGoogleAuth: Token set successfully:', tokenSet);
              
              // Записываем время получения токена
              sessionStorage.setItem('last_token_time', Date.now().toString());
              console.log('processGoogleAuth: Время получения токена сохранено');
              
              // Очищаем все закешированные данные профиля из регистрации
              localStorage.removeItem('vrach_registration_profile');
              console.log('processGoogleAuth: Очищены кэшированные данные профиля');
              
              // Попробуем извлечь роль пользователя из токена
              try {
                // Простой парсинг JWT токена для получения полезной нагрузки
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                  const payload = JSON.parse(atob(tokenParts[1]));
                  console.log('processGoogleAuth: JWT payload:', payload);
                  
                  // Проверяем наличие роли в токене
                  if (payload.role) {
                    // Сохраняем роль пользователя в localStorage
                    localStorage.setItem('user_role', payload.role);
                    console.log(`processGoogleAuth: Роль пользователя (${payload.role}) сохранена в localStorage из токена`);
                  }
                }
              } catch (tokenParseError) {
                console.error('processGoogleAuth: Ошибка при разборе токена:', tokenParseError);
              }
            } catch (tokenError) {
              console.error('processGoogleAuth: Error setting token:', tokenError);
            }
            
            // Пробуем проверить наличие профиля пользователя перед установкой needsProfileUpdate
            try {
              console.log('processGoogleAuth: Проверяем наличие профиля пользователя');
              const profileResponse = await api.get('/users/me/profile', {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              
              if (profileResponse.status === 200 && profileResponse.data) {
                // Проверяем, что ответ - это объект, а не HTML-страница
                if (typeof profileResponse.data === 'object') {
                // Профиль уже существует
                  console.log('processGoogleAuth: Профиль пользователя найден:', JSON.stringify(profileResponse.data).substring(0, 100) + '...');
                needsProfile = false; // Переопределяем, так как профиль уже существует
                } else {
                  console.warn('processGoogleAuth: Получен некорректный формат ответа профиля');
                  needsProfile = true;
                }
              }
            } catch (profileError) {
              if (profileError.response && profileError.response.status === 404) {
                // Профиль не найден, значит действительно нужно создать
                console.log('processGoogleAuth: Профиль не найден, требуется создание');
                needsProfile = true;
              } else {
                console.error('processGoogleAuth: Ошибка при проверке профиля:', profileError);
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
                console.log('processGoogleAuth: Токен успешно проверен тестовым запросом');
              }
            } catch (testError) {
              console.error('processGoogleAuth: Тестовый запрос не удался', testError);
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
                console.log('processGoogleAuth: User data received successfully');
                
                // Если в данных пользователя есть поле роли, сохраняем его в localStorage
                if (userResponse.data.role) {
                  localStorage.setItem('user_role', userResponse.data.role);
                  console.log(`processGoogleAuth: Роль пользователя (${userResponse.data.role}) сохранена в localStorage из API`);
                }
                
                // Обновляем состояние со всеми данными пользователя
                set({ 
                  user: userResponse.data,
                  error: null
                });
                return true;
              } else {
                console.warn('processGoogleAuth: User data response was not successful');
              }
            } catch (userError) {
              console.error('processGoogleAuth: Error fetching user data:', userError);
            }
            
            // Даже если не удалось получить данные пользователя,
            // флаг аутентификации уже установлен выше
            return true;
          } else {
            throw new Error('Ошибка при авторизации через Google');
          }
        } catch (error) {
          console.error('processGoogleAuth: Error during Google auth', error);
          
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
          console.log('handleEmailVerification: Обработка данных подтверждения', verificationData);

          if (!verificationData || !verificationData.token) {
            throw new Error('Некорректные данные подтверждения email');
          }

          // Устанавливаем токен от подтверждения email
          const token = verificationData.token;
          
          console.log('handleEmailVerification: Сохраняем токен из подтверждения email');
          console.log(`handleEmailVerification: Token length: ${token.length}`);
          console.log(`handleEmailVerification: Token starts with: ${token.substring(0, 10)}...`);
          
          // Устанавливаем токен в localStorage и API
          setAuthToken(token);
          
          // Получаем данные пользователя с новым токеном
          const userResponse = await api.get('/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (userResponse.status === 200 && userResponse.data) {
            console.log('handleEmailVerification: User data received successfully');
            
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
            
            console.log('handleEmailVerification: Email verification completed successfully');
            return true;
          } else {
            throw new Error('Не удалось получить данные пользователя после подтверждения email');
          }
        } catch (error) {
          console.error('handleEmailVerification: Error handling email verification:', error);
          
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