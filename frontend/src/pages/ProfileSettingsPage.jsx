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
import MedicalLoader from '../components/MedicalLoader';
import { motion } from 'framer-motion';
import { useTranslation } from '../components/LanguageSelector';

// Анимационные варианты
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } }
};

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

// Страница для просмотра и редактирования настроек профиля пользователя (Пациента или Врача)
// Отображается по маршруту /profile (защищен ProtectedRoute)
function ProfileSettingsPage() {
  const { t } = useTranslation();
  
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
         setError(t('userNotAuthorized')); // Это сообщение, вероятно, никогда не будет видно из-за ProtectedRoute
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

      } catch (err) {
        // Обработка ошибок при загрузке профиля (например, 404 Not Found, если профиль еще не создан)
        // Устанавливаем соответствующее сообщение об ошибке загрузки
        // Обрабатываем специфический статус 404 (профиль не найден)
        if (err.response && err.response.status === 404) {
            setError(t('profileNotCreated')); // Специальное сообщение для 404
            setProfileData(null); // Убеждаемся, что profileData null, если профиль не найден
            
            // Проверяем, есть ли сохраненные данные профиля из регистрации
            if (user.role === 'patient' && !isCreatingFromRegistration) {
              const registrationData = parseProfileFromRegistration();
              if (registrationData) {
                // Если есть данные регистрации, создаем профиль автоматически
                setIsCreatingFromRegistration(true);
                
                // Делаем три попытки создания профиля с небольшими интервалами
                let attempt = 0;
                const maxAttempts = 3;
                const attemptCreateProfile = async () => {
                  try {
                    attempt++;
                    
                    const response = await createOrUpdatePatientProfile(registrationData);
                    if (response) {
                      setProfileData(response);
                      setError(null);
                      setSaveSuccess(true);
                      
                      // Удаляем данные регистрации после успешного создания профиля
                      localStorage.removeItem('vrach_registration_profile');
                      
                      // Скрываем сообщение об успехе через 3 секунды
                      setTimeout(() => setSaveSuccess(false), 3000);
                      
                      // Принудительно обновляем страницу для загрузки нового профиля
                      setTimeout(() => window.location.reload(), 3500);
                    }
                  } catch (error) {
                    if (attempt < maxAttempts) {
                      // Делаем паузу перед следующей попыткой
                      setTimeout(attemptCreateProfile, attempt * 1000);
                    } else {
                      setIsCreatingFromRegistration(false);
                    }
                  }
                };
                
                // Запускаем первую попытку с небольшой задержкой
                setTimeout(attemptCreateProfile, 500);
              }
            }
        } else {
            setError(t('errorLoadingProfile')); // Общее сообщение для других ошибок
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
         setError(t('cannotSaveProfile'));
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
        setProfileData(response.data); // Обновляем данные профиля в состоянии компонента с актуальными данными от бэкенда
        setSaveSuccess(true); // Устанавливаем флаг успешного сохранения

        // Обновляем данные пользователя в глобальном хранилище
        if (response.data && response.data.avatar_path) {
          // Проверяем, изменилась ли аватарка
          if (user.avatar_path !== response.data.avatar_path) {
            
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
              // Пропускаем ошибку сохранения в localStorage
            }
          }
        }

        // Скрываем сообщение об успехе через 3 секунды
        setTimeout(() => setSaveSuccess(false), 3000);

     } catch (err) {
        // Обработка ошибок сохранения (например, ошибка валидации на бэкенде, ошибка БД)
         const errorMessage = err.response?.data?.detail || "Ошибка при сохранении профиля. Попробуйте еще раз.";
        setError(errorMessage); // Устанавливаем сообщение об ошибке сохранения (будет отображено в UI ProfileSettingsPage)

     } finally {
        setIsSaving(false); // Завершаем сохранение в любом случае
     }
  };

  // --- Отображение UI страницы настроек профиля ---

  // Если идет загрузка данных профиля, показываем индикатор загрузки
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        <MedicalLoader text="Загрузка профиля" color="#6366f1" />
      </div>
    );
  }

  // Если произошла ошибка загрузки, кроме "Профиль еще не создан"
  // Сообщение "Профиль еще не создан" обрабатывается ниже, отображением формы.
  if (error && error !== "Профиль еще не создан. Пожалуйста, заполните информацию.") {
       return (
         <motion.div 
           initial="hidden"
           animate="visible"
           variants={fadeIn}
           className="py-12 px-6 sm:px-8 lg:px-10 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-[calc(100vh-100px)]"
         >
           <div className="max-w-4xl mx-auto">
             <motion.div 
               variants={slideUp}
               className="text-center mb-10"
             >
               <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-3">
                 Мой профиль
               </h1>
               <p className="text-gray-600">Управляйте личными данными и настройками</p>
             </motion.div>
             
             <motion.div variants={slideUp}>
               <Card className="shadow-lg border-none overflow-hidden mb-6">
                 <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                 
                 <CardHeader className="flex justify-between items-center gap-3 p-8 bg-gradient-to-b from-indigo-50 to-transparent">
                   <div className="flex items-center gap-4">
                     <motion.div
                       whileHover={{ scale: 1.05 }}
                       transition={{ type: "spring", stiffness: 400, damping: 10 }}
                     >
                       <AvatarWithFallback 
                         src={user?.avatar_path || undefined}
                         name={user?.name || user?.email?.charAt(0)?.toUpperCase() || "?"}
                         size="lg"
                         className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white"
                       />
                     </motion.div>
                     <div>
                       <h2 className="text-xl font-semibold">{profileData?.full_name || user?.email || "Пользователь"}</h2>
                       <p className="text-sm text-gray-500">
                        {user?.role === 'patient' ? t('patient') : 
                        user?.role === 'doctor' ? t('doctor') : t('user')}
                       </p>
                     </div>
                   </div>
                 </CardHeader>
                 
                 <Divider />
                 
                 <CardBody className="p-8">
                   <motion.div 
                     variants={slideUp}
                     className="mb-6 bg-danger-50 text-danger p-5 rounded-lg border border-danger-200"
                   >
                     <div className="flex items-center">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                       </svg>
                       <p className="font-medium">{error}</p>
                     </div>
                   </motion.div>

                   {profileData === null && error === t('profileNotCreated') && (
                     <motion.div 
                       variants={slideUp}
                       className="mb-6 bg-blue-50 text-blue-700 p-5 rounded-lg border border-blue-200"
                     >
                       <div className="flex items-center">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <p className="font-medium">{t('profileNotFilledYet')}</p>
                       </div>
                     </motion.div>
                   )}
                   
                   <motion.div 
                     variants={slideUp}
                     className="bg-white rounded-lg p-8 shadow-sm"
                   >
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
                         <p className="text-gray-600">{t('profileNotAvailableForRole')}</p>
                       </div>
                     )}
                   </motion.div>
                 </CardBody>
               </Card>
             </motion.div>
           </div>
         </motion.div>
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Динамический градиентный фон */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-0"
        animate={{ 
          background: [
            'linear-gradient(to bottom right, rgba(239, 246, 255, 0.8), rgba(224, 231, 255, 0.8), rgba(237, 233, 254, 0.8))',
            'linear-gradient(to bottom right, rgba(224, 242, 254, 0.8), rgba(219, 234, 254, 0.8), rgba(224, 231, 255, 0.8))',
            'linear-gradient(to bottom right, rgba(236, 254, 255, 0.8), rgba(224, 242, 254, 0.8), rgba(219, 234, 254, 0.8))',
            'linear-gradient(to bottom right, rgba(239, 246, 255, 0.8), rgba(224, 231, 255, 0.8), rgba(237, 233, 254, 0.8))'
          ]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
      />
      
      {/* Анимированная сетка */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <motion.div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px), 
                             linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
          animate={{
            x: [0, -40],
            y: [0, -40]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
      
      {/* Декоративные плавающие элементы */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Верхний градиентный круг */}
        <motion.div 
          className="absolute top-0 -right-20 sm:-right-40 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] rounded-full bg-gradient-to-br from-blue-200/40 sm:from-blue-200/60 to-indigo-300/40 sm:to-indigo-300/60 blur-[40px] sm:blur-[60px]"
          animate={{ 
            y: [0, 15, -15, 0],
            rotate: [0, 5, 0, -5, 0],
            scale: [1, 1.05, 0.95, 1]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        {/* Нижний градиентный круг */}
        <motion.div 
          className="absolute -bottom-10 sm:-bottom-20 -left-10 sm:-left-20 w-[250px] sm:w-[450px] h-[250px] sm:h-[450px] rounded-full bg-gradient-to-br from-red-200/30 sm:from-red-200/50 to-pink-300/30 sm:to-pink-300/50 blur-[30px] sm:blur-[50px]"
          animate={{ 
            y: [0, -15, 15, 0],
            rotate: [0, -5, 0, 5, 0],
            scale: [1, 0.95, 1.05, 1]
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        {/* Маленькие плавающие круги - скрываем на очень малых экранах */}
        <motion.div 
          className="hidden sm:block absolute top-1/3 left-1/4 w-[200px] h-[200px] rounded-full bg-gradient-to-br from-green-200/50 to-teal-300/50 blur-[40px]"
          animate={{ 
            y: [0, 30, 0],
            x: [0, 15, 0],
            rotate: [0, 10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        <motion.div 
          className="hidden sm:block absolute bottom-1/3 right-1/4 w-[180px] sm:w-[250px] h-[180px] sm:h-[250px] rounded-full bg-gradient-to-br from-purple-200/50 to-indigo-300/50 blur-[35px] sm:blur-[45px]"
          animate={{ 
            y: [0, -20, 0],
            x: [0, -10, 0],
            rotate: [0, -8, 0],
            scale: [1, 0.9, 1]
          }}
          transition={{ 
            duration: 18, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        {/* Дополнительные яркие шарики - скрываем на мобильных */}
        <motion.div 
          className="hidden md:block absolute top-1/2 left-5 sm:left-10 w-[120px] sm:w-[150px] h-[120px] sm:h-[150px] rounded-full bg-gradient-to-r from-violet-300/40 sm:from-violet-300/60 to-fuchsia-300/40 sm:to-fuchsia-300/60 blur-[25px] sm:blur-[30px]"
          animate={{ 
            y: [0, -40, 0],
            x: [0, 20, 0],
            rotate: [0, 20, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 17, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        <motion.div 
          className="hidden md:block absolute bottom-1/4 right-10 sm:right-20 w-[140px] sm:w-[180px] h-[140px] sm:h-[180px] rounded-full bg-gradient-to-r from-rose-200/40 sm:from-rose-200/60 to-pink-300/40 sm:to-pink-300/60 blur-[25px] sm:blur-[35px]"
          animate={{ 
            y: [0, 30, 0],
            x: [0, -25, 0],
            rotate: [0, -15, 0],
            scale: [1, 0.9, 1]
          }}
          transition={{ 
            duration: 22, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
      </div>
      
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="relative z-10 py-6 sm:py-8 lg:py-12 px-4 sm:px-6 lg:px-8 min-h-[calc(100vh-100px)]"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div 
            variants={slideUp}
            className="text-center mb-6 sm:mb-8 lg:mb-10"
          >
            <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-2 sm:mb-3 px-4">
              {t('myProfile')}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 px-4">{t('managePersonalData')}</p>
          </motion.div>
          
          <motion.div variants={slideUp}>
            <Card className="shadow-xl border-none overflow-hidden mb-4 sm:mb-6 hover:shadow-2xl transition-all duration-300 bg-white/90 backdrop-blur-sm mx-2 sm:mx-0">
              {/* Декоративная линия */}
              <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600 relative overflow-hidden">
                <motion.div 
                  className="absolute inset-0 bg-white opacity-30"
                  animate={{ 
                    x: ["0%", "100%"],
                    opacity: [0, 0.3, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 3,
                    ease: "easeInOut"
                  }}
                />
              </div>
            
              <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:justify-between sm:items-center gap-4 p-4 sm:p-6 lg:p-8 bg-gradient-to-b from-indigo-50 to-transparent">
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative"
                  >
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full opacity-0 blur-md"
                      animate={{ 
                        scale: [0.85, 1.05, 0.85], 
                        opacity: [0, 0.3, 0] 
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity,
                        repeatType: "loop" 
                      }}
                    />
                    <AvatarWithFallback 
                      src={user?.avatar_path || undefined}
                      name={user?.name || user?.email?.charAt(0)?.toUpperCase() || "?"}
                      size="lg"
                      className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white z-10 relative w-20 h-20 sm:w-16 sm:h-16"
                    />
                  </motion.div>
                  <div className="text-center sm:text-left">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1">
                      {profileData?.full_name || user?.email || t('user')}
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">
                      {user?.role === 'patient' ? t('patient') : 
                       user?.role === 'doctor' ? t('doctor') : 
                       user?.role === 'admin' ? t('admin') : t('user')}
                    </p>
                  </div>
                </div>
                
                {/* Кнопки действий */}
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  {/* Кнопка для сброса настроек уведомлений */}
                  <Button 
                    color="secondary" 
                    variant="bordered"
                    className="border-gray-300 text-gray-600 hover:border-blue-500 hover:text-blue-600 w-full sm:w-auto text-sm min-h-[44px] touch-manipulation"
                    size="sm"
                    onPress={() => {
                      localStorage.removeItem('notificationPermissionRequested');
                      toast.success('Настройки уведомлений сброшены. При следующем посещении сайта вы снова увидите запрос на разрешение уведомлений.');
                    }}
                    startContent={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    }
                  >
                    Сбросить уведомления
                  </Button>
                  
                  {/* Кнопка для подачи заявки на роль врача (только для пациентов) */}
                  {user?.role === 'patient' && (
                    <Button 
                      color="primary" 
                      variant="shadow"
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md w-full sm:w-auto text-sm min-h-[44px] touch-manipulation"
                      size="sm"
                      onPress={() => window.location.href = '/doctor-application'}
                      startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      }
                    >
                      {t('becomeDoctor')}
                    </Button>
                  )}
                  
                  {/* Ссылка на админ-панель (только для админов) */}
                  {user?.role === 'admin' && (
                    <Button 
                      color="secondary" 
                      variant="shadow"
                      className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md w-full sm:w-auto text-sm min-h-[44px] touch-manipulation"
                      size="sm"
                      onPress={() => window.location.href = '/admin_control_panel_52x9a8'}
                      startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      }
                    >
                      {t('adminPanel')}
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <Divider />
              
              <CardBody className="p-4 sm:p-6 lg:p-8">
                {/* Вывод сообщений */}
                {saveSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 sm:mb-6 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 p-3 sm:p-4 lg:p-5 rounded-lg border border-green-200"
                  >
                    <div className="flex items-center">
                      <motion.div
                        animate={{ scale: [0.8, 1.2, 1] }}
                        transition={{ duration: 0.5 }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                      <p className="font-medium text-sm sm:text-base">{t('profileSavedSuccessfully')}</p>
                    </div>
                  </motion.div>
                )}
                
                {error && error !== t('profileNotCreated') && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 sm:mb-6 bg-gradient-to-r from-red-50 to-rose-50 text-danger p-3 sm:p-4 lg:p-5 rounded-lg border border-danger-200"
                  >
                    <div className="flex items-start">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5 }}
                        className="flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </motion.div>
                      <p className="font-medium text-sm sm:text-base">{error}</p>
                    </div>
                  </motion.div>
                )}

                {profileData === null && error === "Профиль еще не создан. Пожалуйста, заполните информацию." && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mb-4 sm:mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 p-3 sm:p-4 lg:p-5 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-start">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="flex-shrink-0"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </motion.div>
                      <p className="font-medium text-sm sm:text-base">{t('profileNotFilledYet')}</p>
                    </div>
                  </motion.div>
                )}
                
                {/* Формы профиля */}
                <motion.div 
                  variants={slideUp}
                  className="bg-white rounded-xl p-4 sm:p-6 lg:p-8 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100"
                >
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
                      <p className="text-gray-600">{t('profileNotAvailableForRole')}</p>
                    </div>
                  )}
                </motion.div>
              </CardBody>
            </Card>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

// Экспорт компонента по умолчанию
export default ProfileSettingsPage;