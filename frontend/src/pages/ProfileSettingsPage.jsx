// frontend/src/pages/ProfileSettingsPage.jsx
import React, { useEffect, useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // Для перенаправления (если нужно)
import { Link } from 'react-router-dom'; // Импортируем для ссылки на страницу подачи заявки
import api from '../api'; // Импортируем наш API сервис
import useAuthStore from '../stores/authStore'; // Импортируем стор для получения данных пользователя

// Импортируем компоненты форм для Пациента и Врача
import { PatientProfileForm } from '../components/PatientProfileForm'; // <--- ОБНОВЛЕННЫЙ ИМПОРТ
import { DoctorProfileForm } from '../components/DoctorProfileForm'; // <--- ОБНОВЛЕННЫЙ ИМПОРТ

// Импортируем NextUI компоненты
import { Card, CardBody, CardHeader, Divider, Avatar, Button, Spinner, Tabs, Tab } from '@nextui-org/react';
import { toast } from 'react-toastify';
import AvatarWithFallback from '../components/AvatarWithFallback';

// Страница для просмотра и редактирования настроек профиля пользователя (Пациента или Врача)
// Отображается по маршруту /profile (защищен ProtectedRoute)
function ProfileSettingsPage() {
  // Состояние для данных профиля (загруженных с бэкенда)
  // Может хранить либо PatientProfileResponse, либо DoctorProfileResponse, либо null.
  const [profileData, setProfileData] = useState(null);

  // Состояния для UI: статус загрузки данных профиля при открытии страницы
  const [isLoading, setIsLoading] = useState(true);

  // Состояния для UI: ошибки (загрузки или сохранения) и флаг успешного сохранения
  const [error, setError] = useState(null); // Сообщение об ошибке (загрузки или сохранения)
  const [saveSuccess, setSaveSuccess] = useState(false); // Флаг успешного сохранения (для сообщения)
  const [isSaving, setIsSaving] = useState(false); // Флаг процесса сохранения (для индикатора на кнопке формы)
  const [isCreatingFromRegistration, setIsCreatingFromRegistration] = useState(false);

  // Получаем данные текущего пользователя (включая роль) из стора аутентификации
  const { user, isAuthenticated, setUser } = useAuthStore();
  const createOrUpdatePatientProfile = useAuthStore((state) => state.createOrUpdatePatientProfile);
  const parseProfileFromRegistration = useAuthStore((state) => state.parseProfileFromRegistration);
  // const setUser = useAuthStore((state) => state.setUser); // Функция для обновления пользователя в сторе (если понадобится)

  // Эффект выполняется при монтировании компонента и при изменении user.id/isAuthenticated
  useEffect(() => {
    // Проверяем, что пользователь авторизован и объект user доступен.
    // ProtectedRoute уже должен был это проверить, но на всякий случай.
    if (!isAuthenticated || !user) {
         setIsLoading(false);
         setError("Пользователь не авторизован."); // Это сообщение, вероятно, никогда не будет видно из-за ProtectedRoute
         return;
     }

    // Асинхронная функция для загрузки данных профиля с бэкенда
    const fetchProfile = async () => {
       setIsLoading(true); // Начинаем загрузку
       setError(null); // Сбрасываем предыдущие ошибки (загрузки или сохранения)
       setSaveSuccess(false); // Сбрасываем флаг успешного сохранения при новой загрузке

      try {
        // Отправляем GET запрос на эндпоинт бэкенда для получения профиля текущего пользователя.
        // API сервис (axios) автоматически добавляет JWT токен из Local Storage в заголовок Authorization.
        const response = await api.get('/users/me/profile');

        // Сохраняем полученные данные профиля в состояние компонента
        setProfileData(response.data);
        console.log('Profile data loaded:', response.data);

      } catch (err) {
        // Обработка ошибок при загрузке профиля (например, 404 Not Found, если профиль еще не создан)
        console.error('Failed to load profile:', err);
        // Устанавливаем соответствующее сообщение об ошибке загрузки
        // Обрабатываем специфический статус 404 (профиль не найден)
        if (err.response && err.response.status === 404) {
            setError("Профиль еще не создан. Пожалуйста, заполните информацию."); // Специальное сообщение для 404
            setProfileData(null); // Убеждаемся, что profileData null, если профиль не найден
            
            // Проверяем, есть ли сохраненные данные профиля из регистрации
            if (user.role === 'patient' && !isCreatingFromRegistration) {
              const registrationData = parseProfileFromRegistration();
              if (registrationData) {
                // Если есть данные регистрации, создаем профиль автоматически
                setIsCreatingFromRegistration(true);
                console.log('Найдены данные регистрации, автоматически создаем профиль', registrationData);
                
                createOrUpdatePatientProfile(registrationData)
                  .then(response => {
                    if (response) {
                      console.log('Профиль успешно создан из данных регистрации:', response);
                      setProfileData(response);
                      setError(null);
                      setSaveSuccess(true);
                      
                      // Удаляем данные регистрации после успешного создания профиля
                      localStorage.removeItem('vrach_registration_profile');
                      
                      // Скрываем сообщение об успехе через 3 секунды
                      setTimeout(() => setSaveSuccess(false), 3000);
                    }
                  })
                  .catch(error => {
                    console.error('Ошибка при создании профиля из данных регистрации:', error);
                  })
                  .finally(() => {
                    setIsCreatingFromRegistration(false);
                  });
              }
            }
        } else {
            setError("Ошибка при загрузке профиля. Попробуйте позже."); // Общее сообщение для других ошибок
            setProfileData(null);
        }

      } finally {
        setIsLoading(false); // Завершаем загрузку в любом случае
      }
    };

    // Вызываем асинхронную функцию загрузки профиля
    fetchProfile();

    // Зависимости: эффект запускается при монтировании и при изменении user?.id или isAuthenticated.
  }, [user?.id, isAuthenticated, parseProfileFromRegistration, createOrUpdatePatientProfile]);


  // --- Логика сохранения профиля (общая для Пациента и Врача) ---
  // Эта функция будет передана дочерним компонентам форм (PatientProfileForm/DoctorProfileForm)
  // и вызвана ими при отправке формы.
  const handleSaveProfile = async (profileDataFromForm) => {
     setIsSaving(true); // Включаем индикатор сохранения на кнопке формы
     setError(null); // Сбрасываем предыдущие ошибки сохранения
     setSaveSuccess(false); // Сбрасываем предыдущий статус успеха

     // Проверяем, что пользователь авторизован и его роль определена
     if (!user || !(user.role === 'patient' || user.role === 'doctor')) {
         console.error("Attempted to save profile for user with invalid role or not authenticated.");
         setError("Невозможно сохранить профиль. Неверная роль пользователя.");
         setIsSaving(false);
         return;
     }

     // Определяем эндпоинт для сохранения в зависимости от роли пользователя
     // user.role доступен из стора
     const endpoint = user.role === 'patient' ? '/patients/profiles' : '/doctors/profiles';

     try {
        // Отправляем POST запрос на соответствующий эндпоинт с данными формы
        // API сервис (axios) автоматически добавит JWT токен.
        const response = await api.post(endpoint, profileDataFromForm);

        // Если сохранение успешно (бэкенд вернул 201 Created или 200 OK)
        console.log('Profile saved successfully:', response.data);
        setProfileData(response.data); // Обновляем данные профиля в состоянии компонента с актуальными данными от бэкенда
        setSaveSuccess(true); // Устанавливаем флаг успешного сохранения

        // Обновляем данные пользователя в глобальном хранилище
        if (response.data && response.data.avatar_path) {
          // Проверяем, изменилась ли аватарка
          if (user.avatar_path !== response.data.avatar_path) {
            console.log('Avatar path changed, updating user data and triggering events');
            
            // Обновляем данные пользователя в сторе с новой аватаркой
            const updatedUser = { ...user, avatar_path: response.data.avatar_path };
            setUser(updatedUser);
            
            // Отправляем событие для обновления аватарки в других компонентах (например, в Header)
            const event = new CustomEvent('profileImageUpdated', { 
              detail: { profileImage: response.data.avatar_path } 
            });
            window.dispatchEvent(event);
            
            // Также сохраняем в localStorage для совместимости
            try {
              localStorage.setItem('profileImage', response.data.avatar_path);
            } catch (e) {
              console.error('Ошибка при сохранении аватарки в localStorage:', e);
            }
          }
        }

        // Скрываем сообщение об успехе через 3 секунды
        setTimeout(() => setSaveSuccess(false), 3000);

     } catch (err) {
        // Обработка ошибок сохранения (например, ошибка валидации на бэкенде, ошибка БД)
        console.error('Failed to save profile:', err);
         const errorMessage = err.response?.data?.detail || "Ошибка при сохранении профиля. Попробуйте еще раз.";
        setError(errorMessage); // Устанавливаем сообщение об ошибке сохранения (будет отображено в UI ProfileSettingsPage)

     } finally {
        setIsSaving(false); // Завершаем сохранение в любом случае
     }
  };

  // --- Отображение UI страницы настроек профиля ---

  // Если идет загрузка данных профиля
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto"></div>
          <p className="mt-5 text-gray-600 font-medium">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  // Если произошла ошибка загрузки, кроме "Профиль еще не создан"
  // Сообщение "Профиль еще не создан" обрабатывается ниже, отображением формы.
  if (error && error !== "Профиль еще не создан. Пожалуйста, заполните информацию.") {
       return (
         <div className="py-12 px-6 sm:px-8 lg:px-10 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-[calc(100vh-100px)]">
           <div className="max-w-4xl mx-auto">
             <div className="text-center mb-10">
               <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-3">
                 Мой профиль
               </h1>
               <p className="text-gray-600">Управляйте личными данными и настройками</p>
             </div>
             
             <Card className="shadow-lg border-none overflow-hidden mb-6">
               <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
               
               <CardHeader className="flex justify-between items-center gap-3 p-8 bg-gradient-to-b from-indigo-50 to-transparent">
                 <div className="flex items-center gap-4">
                   <AvatarWithFallback 
                     src={user?.avatar_path || undefined}
                     name={user?.name || user?.email?.charAt(0)?.toUpperCase() || "?"}
                     size="lg"
                     className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                   />
                   <div>
                     <h2 className="text-xl font-semibold">{profileData?.full_name || user?.email || "Пользователь"}</h2>
                     <p className="text-sm text-gray-500">
                       {user?.role === 'patient' ? 'Пациент' : 
                        user?.role === 'doctor' ? 'Врач' : 'Пользователь'}
                     </p>
                   </div>
                 </div>
               </CardHeader>
               
               <Divider />
               
               <CardBody className="p-8">
                 <div className="mb-6 bg-danger-50 text-danger p-5 rounded-lg border border-danger-200">
                   <div className="flex items-center">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                     <p className="font-medium">{error}</p>
                   </div>
                 </div>

                 {profileData === null && error === "Профиль еще не создан. Пожалуйста, заполните информацию." && (
                   <div className="mb-6 bg-blue-50 text-blue-700 p-5 rounded-lg border border-blue-200">
                     <div className="flex items-center">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                       </svg>
                       <p className="font-medium">Ваш профиль еще не заполнен. Пожалуйста, заполните информацию ниже.</p>
                     </div>
                   </div>
                 )}
                 
                 <div className="bg-white rounded-lg p-8 shadow-sm">
                   {user.role === 'patient' && (
                     <PatientProfileForm
                       profile={profileData}
                       onSave={handleSaveProfile}
                       isLoading={isSaving}
                       error={error}
                     />
                   )}

                   {user.role === 'doctor' && (
                     <DoctorProfileForm
                       profile={profileData}
                       onSave={handleSaveProfile}
                       isLoading={isSaving}
                       error={error}
                     />
                   )}

                   {user.role !== 'patient' && user.role !== 'doctor' && (
                     <div className="text-center py-4">
                       <p className="text-gray-600">Для вашей роли профиль не предусмотрен в этом разделе.</p>
                     </div>
                   )}
                 </div>
               </CardBody>
             </Card>
           </div>
         </div>
       );
   }

   // Если пользователь не авторизован или нет данных пользователя (хотя ProtectedRoute должен это предотвратить)
   // Этот случай, вероятно, никогда не возникнет благодаря ProtectedRoute и проверке isLoading.
   if (!user) {
        // Можно перенаправить на логин, но ProtectedRoute уже должен это сделать.
        return null; // Ничего не отображаем.
   }


  // Основной UI страницы настроек профиля (после успешной загрузки или если профиль не создан)
  return (
    // Используем контейнер MUI Container для центрирования формы
    <div className="py-12 px-6 sm:px-8 lg:px-10 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-[calc(100vh-100px)]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-3">
            Мой профиль
          </h1>
          <p className="text-gray-600">Управляйте личными данными и настройками</p>
        </div>
        
        <Card className="shadow-lg border-none overflow-hidden mb-6">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          <CardHeader className="flex justify-between items-center gap-3 p-8 bg-gradient-to-b from-indigo-50 to-transparent">
            <div className="flex items-center gap-4">
              <AvatarWithFallback 
                src={user?.avatar_path || undefined}
                name={user?.name || user?.email?.charAt(0)?.toUpperCase() || "?"}
                size="lg"
                className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
              />
              <div>
                <h2 className="text-xl font-semibold">{profileData?.full_name || user?.email || "Пользователь"}</h2>
                <p className="text-sm text-gray-500">
                  {user?.role === 'patient' ? 'Пациент' : 
                   user?.role === 'doctor' ? 'Врач' : 
                   user?.role === 'admin' ? 'Администратор' : 'Пользователь'}
                </p>
              </div>
            </div>
            
            {/* Кнопка для подачи заявки на роль врача (только для пациентов) */}
            {user?.role === 'patient' && (
              <Link to="/doctor-application">
                <Button 
                  color="primary" 
                  variant="flat"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                >
                  Подать заявку на роль врача
                </Button>
              </Link>
            )}
            
            {/* Ссылка на админ-панель (только для админов) */}
            {user?.role === 'admin' && (
              <Link to="/admin_control_panel_52x9a8">
                <Button 
                  color="secondary" 
                  variant="flat"
                >
                  Перейти в админ-панель
                </Button>
              </Link>
            )}
          </CardHeader>
          
          <Divider />
          
          <CardBody className="p-8">
            {/* Вывод сообщений */}
            {saveSuccess && (
              <div className="mb-6 bg-green-50 text-green-700 p-5 rounded-lg border border-green-200 animate-pulse">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="font-medium">Профиль успешно сохранен!</p>
                </div>
              </div>
            )}
            
            {error && error !== "Профиль еще не создан. Пожалуйста, заполните информацию." && (
              <div className="mb-6 bg-danger-50 text-danger p-5 rounded-lg border border-danger-200">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="font-medium">{error}</p>
                </div>
              </div>
            )}

            {profileData === null && error === "Профиль еще не создан. Пожалуйста, заполните информацию." && (
              <div className="mb-6 bg-blue-50 text-blue-700 p-5 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">Ваш профиль еще не заполнен. Пожалуйста, заполните информацию ниже.</p>
                </div>
              </div>
            )}
            
            {/* Формы профиля */}
            <div className="bg-white rounded-lg p-8 shadow-sm">
              {user.role === 'patient' && (
                <PatientProfileForm
                  profile={profileData}
                  onSave={handleSaveProfile}
                  isLoading={isSaving}
                  error={error}
                />
              )}

              {user.role === 'doctor' && (
                <DoctorProfileForm
                  profile={profileData}
                  onSave={handleSaveProfile}
                  isLoading={isSaving}
                  error={error}
                />
              )}

              {user.role !== 'patient' && user.role !== 'doctor' && (
                <div className="text-center py-4">
                  <p className="text-gray-600">Для вашей роли профиль не предусмотрен в этом разделе.</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// Экспорт компонента по умолчанию
export default ProfileSettingsPage;