import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Spinner, Textarea, Card, CardBody, CardHeader, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Switch, Chip, Select, SelectItem } from '@nextui-org/react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import api, { getCsrfToken } from '../api';
import { notificationsApi } from '../api';
import { uploadAvatar } from '../api';
import AvatarWithFallback from './AvatarWithFallback';
import { useTranslation } from './LanguageSelector';
import { translateRegion, translateDistrict, getDistrictNameById } from './RegionTranslations';
import { getRegions, getDistrictsByRegion } from '../constants/uzbekistanRegions'; // Импортируем систему регионов

// Анимационные варианты для элементов
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } }
};

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerFormContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07
    }
  }
};

function DoctorProfileForm({ profile, onSave, isLoading, error }) {
   const { t, currentLanguage } = useTranslation();
   const [full_name, setFullName] = useState('');
   const [specialization, setSpecialization] = useState('');
   const [experience_years, setExperienceYears] = useState('');
   const [education, setEducation] = useState('');
   const [city, setCity] = useState('');
   const [district, setDistrict] = useState('');
   const [cost_per_consultation, setCostPerConsultation] = useState(0);
   const [formLocalError, setFormLocalError] = useState(null);
   const [profileImage, setProfileImage] = useState(null);
   const [isEditing, setIsEditing] = useState(false);
   
   // Состояние для системы регионов
   const [availableRegions, setAvailableRegions] = useState([]);
   const [availableDistricts, setAvailableDistricts] = useState([]);
   
   // Состояние для модальных окон
   const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
   const [isPrivacyModalOpen, setPrivacyModalOpen] = useState(false);
   
   const [isGoogleAccount, setIsGoogleAccount] = useState(false);
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [passwordError, setPasswordError] = useState(null);
   
   // Настройки уведомлений
   const [emailNotifications, setEmailNotifications] = useState(true);
   const [pushNotifications, setPushNotifications] = useState(true);
   const [appointmentReminders, setAppointmentReminders] = useState(true);
   const [isNotificationsModalOpen, setNotificationsModalOpen] = useState(false);
   const [isLoadingNotificationSettings, setIsLoadingNotificationSettings] = useState(false);

   // Состояние для CSRF-токена
   const [csrfToken, setCsrfToken] = useState('');
   
   // Состояние для смены пароля
   const [isChangingPassword, setIsChangingPassword] = useState(false);

   // Состояние для загрузки изображения профиля
   const [isUploading, setIsUploading] = useState(false);

   // Добавим состояние для хранения способа аутентификации
   const [authProvider, setAuthProvider] = useState('email');

   // Предзаполнение формы при получении данных профиля
   useEffect(() => {
      if (profile) {
         
         setFullName(profile.full_name || '');
         setSpecialization(profile.specialization || '');
         setCostPerConsultation(profile.cost_per_consultation || 0);
         
         // Получаем аватар пользователя
         const loadUserAvatar = async () => {
            try {
               // Проверяем, есть ли аватар в профиле или в связанном пользователе
               if (profile.user && profile.user.avatar_path) {
                  setProfileImage(profile.user.avatar_path);
               } else if (profile.avatar_path) {
                  setProfileImage(profile.avatar_path);
               } else {
                  // Если аватара нет ни в профиле, ни в связанном пользователе, 
                  // пробуем загрузить его через API
                  try {
                     const userResponse = await api.get('/users/me');
                     if (userResponse.data && userResponse.data.avatar_path) {
                        setProfileImage(userResponse.data.avatar_path);
                     } else {
                        setProfileImage(null);
                     }
                  } catch (error) {
                     setProfileImage(null);
                  }
               }
            } catch (error) {
               setProfileImage(null);
            }
         };
         
         loadUserAvatar();
         
         // Преобразуем опыт из строки "X лет" в число
         if (profile.experience) {
            const expYears = parseInt(profile.experience.replace(/\D/g, '')) || '';
            setExperienceYears(expYears);
         }
         
         setEducation((profile.education && profile.education !== 'нету') ? profile.education : '');
         setCity(profile.city || '');
         setDistrict(profile.district || profile.practice_areas || '');
         setIsEditing(false);
         
         // Проверяем способ аутентификации пользователя
         if (profile.auth_provider) {
            setAuthProvider(profile.auth_provider);
         } else {
            // Если информация о способе аутентификации отсутствует в профиле,
            // запрашиваем ее отдельно
            const checkAuthProvider = async () => {
               try {
                  const userResponse = await api.get('/users/me');
                  if (userResponse.data && userResponse.data.auth_provider) {
                     setAuthProvider(userResponse.data.auth_provider);
                  }
               } catch (error) {
               }
            };
            
            checkAuthProvider();
         }
      } else {
         setIsEditing(true);
      }
      
      setFormLocalError(null);
   }, [profile]);

   // При монтировании компонента получаем CSRF токен
   useEffect(() => {
      const fetchCsrfToken = async () => {
         try {
            const token = await getCsrfToken();
            setCsrfToken(token);
         } catch (error) {
         }
      };
      
      fetchCsrfToken();
   }, []);

   // Загружаем список регионов при монтировании
   useEffect(() => {
      const regions = getRegions();
      setAvailableRegions(regions);
   }, []);

   // Обновляем районы при изменении города
   useEffect(() => {
      if (city) {
         const districts = getDistrictsByRegion(city);
         setAvailableDistricts(districts);
      } else {
         setAvailableDistricts([]);
      }
   }, [city]);

   // Загружаем настройки уведомлений
   useEffect(() => {
      // Загрузка настроек уведомлений из API
      const fetchNotificationSettings = async () => {
         try {
            const settings = await notificationsApi.getNotificationSettings();
            setPushNotifications(settings.push_notifications);
            setAppointmentReminders(settings.appointment_reminders);
         } catch (error) {
         }
      };
      
      // Сначала проверяем наличие сохраненных настроек в sessionStorage
      try {
         const savedSettings = sessionStorage.getItem('doctorNotificationSettings');
         if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            
            if (typeof parsedSettings.push_notifications === 'boolean') {
               setPushNotifications(parsedSettings.push_notifications);
            }
            
            if (typeof parsedSettings.appointment_reminders === 'boolean') {
               setAppointmentReminders(parsedSettings.appointment_reminders);
            }
         } else {
            // Если нет сохраненных настроек, загружаем с сервера
            fetchNotificationSettings();
         }
      } catch (error) {
         // При ошибке пробуем загрузить с сервера
         fetchNotificationSettings();
      }
   }, []);

   // Обработчик отправки формы (пустая функция, так как редактирование всех полей запрещено)
   const handleSubmit = (event) => {
      event.preventDefault();
      setFormLocalError(null);

      // Здесь формируем данные для обновления профиля
      // Сейчас мы не разрешаем редактировать никакие поля
      const profileData = {
         full_name: full_name || '',
         specialization: specialization || '',
         experience: experience_years ? `${experience_years} лет` : '',
         education: education || '',
         city: city || '',
         district: district || ''
      };

      onSave(profileData);
      
      // После успешного сохранения выключаем режим редактирования
      if (!error) {
         setIsEditing(false);
      }
   };
   
   // Обработчик загрузки изображения
   const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      setIsUploading(true);
      
      // Загружаем аватар на сервер
      uploadAvatar(file)
         .then(response => {
            // Получаем путь к аватару с сервера
            const avatarPath = response.avatar_path;
            
            // Устанавливаем путь к аватару вместо base64 данных
            setProfileImage(avatarPath);
            
            // Отправляем пользовательское событие, чтобы уведомить другие компоненты
            const profileImageEvent = new CustomEvent('doctorProfileImageUpdated', {
               detail: { profileImage: avatarPath }
            });
            window.dispatchEvent(profileImageEvent);
            
            // Показываем уведомление об успешной загрузке
            toast.success('Фото профиля успешно обновлено', {
               position: 'top-right',
               autoClose: 3000,
               hideProgressBar: false,
               closeOnClick: true,
               pauseOnHover: true,
               draggable: true
            });
         })
         .catch(error => {
            
            // Показываем сообщение об ошибке
            toast.error('Не удалось загрузить фото профиля. Попробуйте позже.', {
               position: 'top-right',
               autoClose: 5000,
               hideProgressBar: false,
               closeOnClick: true,
               pauseOnHover: true,
               draggable: true
            });
         })
         .finally(() => {
            setIsUploading(false);
         });
   };
   
   // Обработчик включения режима редактирования (не используется, так как редактирование неактивно)
   const handleEditClick = () => {
      setIsEditing(true);
   };
   
   // Обработчик отмены редактирования (не используется, так как редактирование неактивно)
   const handleCancelEdit = () => {
      if (profile) {
         setFullName(profile.full_name || '');
         setSpecialization(profile.specialization || '');
         
         // Преобразуем опыт из строки "X лет" в число
         if (profile.experience) {
            const expYears = parseInt(profile.experience.replace(/\D/g, '')) || '';
            setExperienceYears(expYears);
         }
         
         setEducation((profile.education && profile.education !== 'нету') ? profile.education : '');
         setCity(profile.city || '');
         setDistrict(profile.district || profile.practice_areas || '');
      }
      setIsEditing(false);
      setFormLocalError(null);
   };

   // Обработчик изменения города/региона
   const handleCityChange = (e) => {
      const newCity = e.target.value;
      setCity(newCity);
      setDistrict(''); // Сбрасываем район при смене города
   };

   // Обработчик изменения района
   const handleDistrictChange = (e) => {
      setDistrict(e.target.value);
   };
   
   // Обработчик клика на фото
   const handleChangePhotoClick = () => {
      // Программно кликаем по скрытому полю загрузки файла
      document.getElementById('doctor-photo-upload').click();
   };
   
   // Обработчик изменения пароля
   const handlePasswordChange = async (e) => {
      e?.preventDefault();
      setPasswordError(null);
      setIsChangingPassword(true);
      
      try {
         // Валидация
         if (!currentPassword) {
            setPasswordError("Пожалуйста, введите текущий пароль");
            setIsChangingPassword(false);
            return;
         }
         
         if (!newPassword) {
            setPasswordError("Пожалуйста, введите новый пароль");
            setIsChangingPassword(false);
            return;
         }
         
         if (newPassword.length < 8) {
            setPasswordError("Новый пароль должен содержать минимум 8 символов");
            setIsChangingPassword(false);
            return;
         }
         
         if (newPassword !== confirmPassword) {
            setPasswordError("Пароли не совпадают");
            setIsChangingPassword(false);
            return;
         }
         
         // Проверка, что новый пароль не совпадает со старым
         if (newPassword === currentPassword) {
            setPasswordError("Новый пароль должен отличаться от текущего");
            setIsChangingPassword(false);
            return;
         }
         
         // Проверка наличия CSRF токена
         if (!csrfToken) {
            try {
               const tokenResponse = await api.get('/csrf-token');
               setCsrfToken(tokenResponse.data.csrf_token);
            } catch (tokenError) {
               setPasswordError("Ошибка безопасности. Пожалуйста, обновите страницу и попробуйте снова.");
               setIsChangingPassword(false);
               return;
            }
         }
         
         
         // Всегда получаем свежий CSRF токен перед отправкой запроса на смену пароля
         try {
            const freshTokenResponse = await api.get('/csrf-token');
            const freshToken = freshTokenResponse.data.csrf_token;
            
            // Отправляем запрос на смену пароля с свежим CSRF токеном
            const changePasswordResponse = await api.post('/users/me/change-password', {
               csrf_token: freshToken,
               current_password: currentPassword,
               new_password: newPassword
            });
                        
            // Показываем уведомление об успешной смене пароля
            toast.success('Пароль успешно изменен', {
               position: 'top-right',
               autoClose: 3000,
               hideProgressBar: false,
               closeOnClick: true,
               pauseOnHover: true,
               draggable: true
            });
            
            // Очищаем поля формы после успешной смены пароля
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            
            // Закрываем модальное окно
            setPasswordModalOpen(false);
            
            // Получаем новый CSRF токен после успешной операции
            const newToken = await getCsrfToken();
            setCsrfToken(newToken);
            
         } catch (error) {
            // Подробная информация об ошибке для отладки
            if (error.response) {
               // Игнорируем логирование ошибок
            } else if (error.request) {
               // Игнорируем логирование ошибок
            } else {
               // Игнорируем логирование ошибок
            }
            
            // Получаем сообщение ошибки из ответа сервера, если оно есть
            let errorMessage = 'Не удалось изменить пароль. Пожалуйста, проверьте введенные данные.';
            
            if (error.response?.data) {
               if (error.response.status === 401) {
                  errorMessage = 'Неверный текущий пароль. Пожалуйста, проверьте правильность ввода.';
               } else if (error.response.status === 400) {
                  // Специальная обработка для Bad Request
                  if (error.response.data.detail) {
                     const detail = error.response.data.detail;
                     
                     if (detail.includes('Invalid CSRF token') || detail.includes('CSRF token missing')) {
                        errorMessage = 'Ошибка безопасности. Пожалуйста, обновите страницу и попробуйте снова.';
                     } else if (detail.includes('Current password is incorrect') || detail.includes('Wrong password')) {
                        errorMessage = 'Неверный текущий пароль. Пожалуйста, проверьте правильность ввода.';
                     } else if (detail.includes('Password change failed')) {
                        errorMessage = 'Неверный текущий пароль. Пожалуйста, проверьте правильность ввода.';
                     } else {
                        errorMessage = 'Ошибка при смене пароля. Пожалуйста, проверьте введенные данные.';
                     }
                  } else if (typeof error.response.data === 'string') {
                     // Если сервер вернул текстовую ошибку
                     if (error.response.data.includes('Password change failed') || 
                         error.response.data.includes('Current password is incorrect')) {
                        errorMessage = 'Неверный текущий пароль. Пожалуйста, проверьте правильность ввода.';
                     } else {
                        errorMessage = 'Ошибка при смене пароля. Пожалуйста, проверьте введенные данные.';
                     }
                  }
               } else if (error.response.data.detail) {
                  // Проверяем английские сообщения и заменяем их на русские
                  const detail = error.response.data.detail;
                  if (detail.includes('Password change failed')) {
                     errorMessage = 'Ошибка при смене пароля. Пожалуйста, проверьте введенные данные.';
                  } else if (detail.includes('Current password is incorrect')) {
                     errorMessage = 'Неверный текущий пароль. Пожалуйста, проверьте правильность ввода.';
                  } else if (detail.includes('Password too short')) {
                     errorMessage = 'Новый пароль слишком короткий. Минимальная длина - 8 символов.';
                  } else if (detail.includes('Password too weak')) {
                     errorMessage = 'Новый пароль слишком простой. Используйте комбинацию букв, цифр и специальных символов.';
                  } else {
                     // Если получен какой-то другой текст ошибки, используем его
                     errorMessage = detail;
                  }
               }
            }
            
            setPasswordError(errorMessage);
         } finally {
            setIsChangingPassword(false);
         }
      } catch (error) {
         setPasswordError('Произошла неожиданная ошибка. Пожалуйста, попробуйте позже.');
         setIsChangingPassword(false);
      }
   };
   
   // Добавляем обработчик сохранения настроек уведомлений
   const handleNotificationsSave = async () => {
      setIsLoadingNotificationSettings(true);
      try {
         // Получаем свежий CSRF-токен перед отправкой
         const freshTokenResponse = await api.get('/csrf-token');
         const freshToken = freshTokenResponse.data.csrf_token;
         
         // Формируем объект с настройками и проверяем значения
         const notificationSettings = {
            csrf_token: freshToken,
            push_notifications: !!pushNotifications, // Преобразуем в boolean
            appointment_reminders: !!appointmentReminders // Преобразуем в boolean
         };
         
         
         // Отправляем запрос на обновление настроек с CSRF токеном
         await notificationsApi.updateNotificationSettings(notificationSettings);
         
         // Показываем уведомление об успешном сохранении
         toast.success('Настройки уведомлений сохранены', {
            position: 'top-right',
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
         });
         
         // Закрываем модальное окно
         setNotificationsModalOpen(false);
         
         // Получаем новый CSRF токен после успешной операции
         const newToken = await getCsrfToken();
         setCsrfToken(newToken);
         
         // Обновляем состояние приложения, чтобы отразить изменения
         sessionStorage.setItem('doctorNotificationSettings', JSON.stringify({
            push_notifications: notificationSettings.push_notifications,
            appointment_reminders: notificationSettings.appointment_reminders
         }));
      } catch (error) {
         
         // Показываем детальное сообщение об ошибке
         let errorMessage = 'Не удалось сохранить настройки. Попробуйте позже.';
         
         if (error.response && error.response.data) {
            if (typeof error.response.data === 'string') {
               errorMessage = `Ошибка: ${error.response.data}`;
            } else if (error.response.data.detail) {
               errorMessage = `Ошибка: ${error.response.data.detail}`;
            }
         }
         
         toast.error(errorMessage, {
            position: 'top-right',
            autoClose: 5000
         });
      } finally {
         setIsLoadingNotificationSettings(false);
      }
   };

   // Функция для закрытия модального окна смены пароля
   const closePasswordModal = () => {
      if (!isChangingPassword) {
         setPasswordModalOpen(false);
         setPasswordError(null);
      }
   };



   return (
      <motion.div 
         className="w-full max-w-5xl mx-auto relative"
         initial="hidden"
         animate="visible"
         variants={fadeIn}
      >
         {/* Декоративные плавающие элементы на фоне */}
         <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
            <motion.div
               className="absolute top-10 right-10 w-40 h-40 rounded-full bg-gradient-to-br from-blue-300/10 to-indigo-400/10"
               animate={{ 
                  y: [0, -15, 0],
                  x: [0, 10, 0],
                  scale: [1, 1.05, 0.95, 1],
                  rotate: [0, 5, 0, -5, 0],
               }}
               transition={{ 
                  duration: 10, 
                  repeat: Infinity,
                  repeatType: "reverse" 
               }}
            />
            <motion.div
               className="absolute bottom-20 left-5 w-32 h-32 rounded-full bg-gradient-to-tr from-purple-300/10 to-pink-400/10"
               animate={{ 
                  y: [0, 20, 0],
                  x: [0, -10, 0],
                  scale: [1, 0.9, 1.1, 1],
                  rotate: [0, -8, 0, 8, 0],
               }}
               transition={{ 
                  duration: 12, 
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: 1
               }}
            />
            <motion.div
               className="absolute top-1/2 left-1/4 w-24 h-24 rounded-full bg-gradient-to-br from-teal-300/10 to-blue-400/10"
               animate={{ 
                  y: [0, -25, 0, 25, 0],
                  scale: [1, 1.15, 0.9, 1],
                  rotate: [0, 15, 0, -15, 0],
               }}
               transition={{ 
                  duration: 15, 
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: 2
               }}
            />
         </div>
         
         {/* Сообщение об ошибке */}
         {(error || formLocalError) && (
            <motion.div 
               initial={{ opacity: 0, y: -10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-danger-50 text-danger p-4 rounded-xl mb-6 border-l-4 border-danger shadow-sm"
            >
               <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">{error || formLocalError}</p>
               </div>
            </motion.div>
         )}
         
         <motion.div className="mb-8" variants={staggerFormContainer}>
                        <div className="mb-8 text-center">
               <motion.div variants={slideUp} className="relative mb-6 inline-block">
                  <h2 className="text-2xl sm:text-3xl md:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                     {t('doctorProfileSettings')}
                  </h2>
                  <motion.div 
                     className="absolute -bottom-1 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full w-full"
                     initial={{ width: 0 }}
                     animate={{ width: "100%" }}
                     transition={{ delay: 0.2, duration: 0.8 }}
                  />
               </motion.div>
               
               {!isEditing && (
                  <motion.div 
                     variants={slideUp}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: 0.4, duration: 0.5 }}
                     className="flex justify-center"
                  >
                     <Chip 
                        color="primary" 
                        variant="flat" 
                        className="bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200/50"
                        startContent={
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                           </svg>
                        }
                     >
                        <span className="text-blue-800 font-medium">{t('yourProfileFixed')}</span>
                     </Chip>
                  </motion.div>
               )}
            </div>
            
            <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
               {/* Левая колонка - фото профиля и настройки аккаунта */}
               <motion.div 
                  className="lg:w-1/3 space-y-4 sm:space-y-6"
                  variants={slideUp}
               >
                  {/* Фото профиля */}
                  <Card className="shadow-lg hover:shadow-xl transition-all duration-300 overflow-visible border-none">
                     <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                     <CardBody className="p-4 sm:p-6 flex flex-col items-center relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-xl"></div>
                        
                        <div className="relative z-10 flex flex-col items-center">
                           <div className="relative group">
                              <motion.div 
                                 whileHover={{ scale: 1.05 }} 
                                 whileTap={{ scale: 0.95 }}
                                 className="relative"
                                 transition={{ type: "spring", stiffness: 300, damping: 15 }}
                              >
                                 {/* Пульсирующий фоновый градиент */}
                                 <motion.div 
                                    className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100"
                                    animate={{ 
                                       scale: [1, 1.2, 1],
                                       opacity: [0, 0.7, 0],
                                    }}
                                    transition={{ 
                                       duration: 2,
                                       repeat: Infinity,
                                       repeatType: "reverse"
                                    }}
                                 />
                                 
                                 {/* Внешний ореол аватара */}
                                 <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full opacity-80 group-hover:opacity-100 blur-sm"></div>
                                 
                                 {/* Внутренний круг аватара */}
                                 <div className="absolute inset-0 bg-white dark:bg-gray-900 rounded-full shadow-inner"></div>
                                 
                                 {/* Фактический аватар */}
                                 <div className="relative">
                                    <AvatarWithFallback 
                                       src={profileImage} 
                                       name={full_name} 
                                       size="xl"
                                       className="w-40 h-40 mb-2 shadow-lg border-2 border-white" 
                                       color="primary"
                                       style={{ minWidth: '160px', minHeight: '160px' }}
                                    />
                                 </div>
                              </motion.div>
                              
                              <motion.div 
                                 className="mt-4 flex flex-col gap-2"
                                 initial={{ opacity: 0, y: 10 }}
                                 animate={{ opacity: 1, y: 0 }}
                                 transition={{ delay: 0.3 }}
                              >
                                 <input 
                                    type="file" 
                                    id="doctor-photo-upload"
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleImageUpload}
                                 />
                                 <Button
                                    color="primary"
                                    size="sm"
                                    variant="flat"
                                    className="font-medium bg-gradient-to-r from-blue-100 to-indigo-100 hover:from-blue-200 hover:to-indigo-200 transition-all duration-300"
                                    onClick={handleChangePhotoClick}
                                    isDisabled={isUploading}
                                    startContent={
                                       isUploading ? (
                                          <Spinner size="sm" color="primary" />
                                       ) : (
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                       )
                                    }
                                 >
                                    {isUploading ? t('loading') : "Изменить фото"}
                                 </Button>
                              </motion.div>
                           </div>
                           
                           <motion.div 
                              className="text-center mt-3"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.4 }}
                           >
                              <h4 className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent mb-1">
                                 {full_name || 'Ваше имя'}
                              </h4>
                              <p className="text-indigo-600 font-medium">{specialization || 'Специализация'}</p>
                           </motion.div>
                        </div>
                     </CardBody>
                  </Card>
                  
                  {/* Настройки безопасности */}
                  <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-none overflow-hidden">
                     <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                     <CardBody className="p-4 sm:p-5">
                        <div className="flex flex-col h-full">
                           <div className="mb-3 flex items-center">
                              <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-4 sm:w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                 </svg>
                              </div>
                              <h3 className="text-base sm:text-medium font-semibold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">{t('security')}</h3>
                           </div>
                           <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5 pl-13 sm:pl-11">{t('passwordSecuritySettings')}</p>
                           
                           <div className="mt-auto">
                              {/* Кнопки настроек */}
                              <div className="flex flex-col gap-2 sm:gap-3">
                                 {/* Кнопка смены пароля только для пользователей не из Google */}
                                 {authProvider !== "google" && (
                                    <motion.div
                                       whileHover={{ x: 5 }}
                                       transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                    >
                                       <Button
                                          color="primary"
                                          variant="light"
                                          startContent={
                                             <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 flex items-center justify-center mr-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-4 sm:w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                </svg>
                                             </div>
                                          }
                                          onClick={() => setPasswordModalOpen(true)}
                                          className="justify-start hover:bg-blue-50 transition-colors w-full py-4 sm:py-3 min-h-[56px] sm:min-h-[48px] rounded-lg"
                                       >
                                          <div className="text-left">
                                             <span className="font-medium text-sm sm:text-base block mb-1">Сменить пароль</span>
                                             <p className="text-xs sm:text-tiny text-default-500">Обновите пароль для безопасности</p>
                                          </div>
                                       </Button>
                                    </motion.div>
                                 )}
                                 
                                 {/* Кнопка настроек уведомлений */}
                                 <motion.div
                                    whileHover={{ x: 5 }}
                                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                 >
                                    <Button
                                       color="default"
                                       variant="light"
                                       startContent={
                                          <div className="w-10 h-10 sm:w-8 sm:h-8 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 flex items-center justify-center mr-2">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-4 sm:w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                             </svg>
                                          </div>
                                       }
                                       onClick={() => setNotificationsModalOpen(true)}
                                       className="justify-start hover:bg-blue-50 transition-colors w-full py-4 sm:py-3 min-h-[56px] sm:min-h-[48px] rounded-lg"
                                    >
                                       <div className="text-left">
                                          <span className="font-medium text-sm sm:text-base block mb-1">Настройка уведомлений</span>
                                       </div>
                                    </Button>
                                 </motion.div>
                              </div>
                           </div>
                        </div>
                     </CardBody>
                  </Card>
               </motion.div>
               
               {/* Правая колонка - форма профиля */}
               <motion.div className="lg:w-2/3" variants={slideUp}>
                  <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-none overflow-hidden">
                     <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                     <CardBody className="p-0">
                        <div className="relative">
                           {/* Декоративный верхний градиент */}
                           <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 z-0"></div>
                           
                           {/* Декоративная волна */}
                           <div className="absolute top-20 left-0 right-0 h-8 z-0">
                              <svg viewBox="0 0 1440 120" className="w-full h-full">
                                 <motion.path 
                                    d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,90.7C672,85,768,107,864,112C960,117,1056,107,1152,90.7C1248,75,1344,53,1392,42.7L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
                                    fill="url(#gradient)"
                                    animate={{
                                       d: [
                                          "M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,90.7C672,85,768,107,864,112C960,117,1056,107,1152,90.7C1248,75,1344,53,1392,42.7L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z",
                                          "M0,96L48,90.7C96,85,192,75,288,58.7C384,43,480,21,576,32C672,43,768,85,864,96C960,107,1056,85,1152,74.7C1248,64,1344,64,1392,64L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z",
                                          "M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,90.7C672,85,768,107,864,112C960,117,1056,107,1152,90.7C1248,75,1344,53,1392,42.7L1440,32L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
                                       ]
                                    }}
                                    transition={{
                                       duration: 10,
                                       repeat: Infinity,
                                       repeatType: "reverse",
                                       ease: "easeInOut"
                                    }}
                                 />
                                 <defs>
                                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                       <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                                       <stop offset="50%" stopColor="#6366F1" stopOpacity="0.2" />
                                       <stop offset="100%" stopColor="#A855F7" stopOpacity="0.2" />
                                    </linearGradient>
                                 </defs>
                              </svg>
                           </div>
                           
                           <div className="relative z-10 p-8">
                              <form id="doctor-profile-form" onSubmit={handleSubmit}>
                                 <div className="space-y-6">
                                    <motion.div
                                       initial={{ opacity: 0, y: 10 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       transition={{ delay: 0.1 }}
                                    >
                                       <h3 className="text-xl font-semibold mb-5 bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
                                          {t('doctorInfo')}
                                       </h3>
                                    </motion.div>
                                    
                                    <motion.div 
                                       className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100/50 mb-6"
                                       initial={{ opacity: 0, y: 10 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       transition={{ delay: 0.2 }}
                                    >
                                       <div className="flex">
                                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-3 flex-shrink-0">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                             </svg>
                                          </div>
                                          <div>
                                             <p className="text-sm font-medium text-blue-800 mb-1">{t('note', 'Примечание')}:</p>
                                             <p className="text-sm text-blue-700">{t('mainDoctorInfo')}</p>
                                          </div>
                                       </div>
                                    </motion.div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                       <motion.div 
                                          className="space-y-6"
                                          initial={{ opacity: 0, x: -20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: 0.3 }}
                                       >
                                          {/* ФИО (только для просмотра) */}
                                          <div className="relative group">
                                             <Input
                                                label={t('fullName')}
                                                value={full_name}
                                                readOnly
                                                variant="bordered"
                                                isDisabled={true}
                                                className="max-w-full"
                                                startContent={
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                   </svg>
                                                }
                                             />
                                          </div>
                                          
                                          {/* Специализация (только для просмотра) */}
                                          <div className="relative group">
                                             <Input
                                                label={t('specialization')}
                                                value={specialization}
                                                readOnly
                                                variant="bordered"
                                                isDisabled={true}
                                                className="max-w-full"
                                                startContent={
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                                   </svg>
                                                }
                                             />
                                          </div>

                                          {/* Район практики (перемещен сюда) */}
                                          <div className="relative group">
                                             <Input
                                                label={t('practiceDistrict')}
                                                value={district ? getDistrictNameById(district, city, currentLanguage) : t('notSpecified')}
                                                readOnly
                                                variant="bordered"
                                                isDisabled={true}
                                                className="max-w-full"
                                                startContent={
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                                   </svg>
                                                }
                                             />
                                          </div>
                                       </motion.div>
                                       
                                       <motion.div 
                                          className="space-y-6"
                                          initial={{ opacity: 0, x: 20 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: 0.4 }}
                                       >
                                          {/* Опыт работы (только для просмотра) */}
                                          <div className="relative group">
                                             <Input
                                                label={t('workExperience')}
                                                value={experience_years}
                                                readOnly
                                                variant="bordered"
                                                isDisabled={true}
                                                className="max-w-full"
                                                startContent={
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                   </svg>
                                                }
                                                endContent={
                                                   <div className="pointer-events-none flex items-center">
                                                      <span className="text-default-400 text-small">{t('years')}</span>
                                                   </div>
                                                }
                                             />
                                          </div>
                                          
                                          {/* Город/Регион (только для просмотра) */}
                                          <div className="relative group">
                                             <Input
                                                label={t('cityRegion')}
                                                value={city ? translateRegion(city, currentLanguage) : t('notSpecified')}
                                                readOnly
                                                variant="bordered"
                                                isDisabled={true}
                                                className="max-w-full"
                                                startContent={
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                   </svg>
                                                }
                                             />
                                          </div>
                                       </motion.div>
                                    </div>
                                    
                                    {/* Образование (только для просмотра) */}
                                    <motion.div 
                                       className="relative group"
                                       initial={{ opacity: 0, y: 20 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       transition={{ delay: 0.5 }}
                                    >
                                       <Textarea
                                          label={t('education')}
                                          value={education}
                                          readOnly
                                          variant="bordered"
                                          isDisabled={true}
                                          minRows={3}
                                          maxRows={5}
                                          className="max-w-full"
                                          startContent={
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path d="M12 14l9-5-9-5-9 5 9 5z" />
                                                <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                                             </svg>
                                          }
                                       />
                                    </motion.div>

                                    {/* Языки консультаций */}
                                    <motion.div 
                                       className="relative group"
                                       initial={{ opacity: 0, y: 20 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       transition={{ delay: 0.6 }}
                                    >
                                       <div className="flex flex-col space-y-2">
                                          <label className="text-small text-blue-600 font-medium flex items-center">
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                                             </svg>
                                             {t('consultationLanguages')}
                                          </label>
                                          <div className="flex flex-wrap gap-2 p-3 border-2 border-gray-200 rounded-xl bg-gray-50 min-h-[60px] items-start">
                                             {profile?.languages && profile.languages.length > 0 ? (
                                                profile.languages.map((language, index) => (
                                                   <motion.div
                                                      key={index}
                                                      initial={{ opacity: 0, scale: 0.8 }}
                                                      animate={{ opacity: 1, scale: 1 }}
                                                      transition={{ delay: 0.1 * index }}
                                                   >
                                                      <Chip
                                                         variant="flat"
                                                         color="primary"
                                                         className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200/50 font-medium"
                                                         startContent={
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                            </svg>
                                                         }
                                                      >
                                                         {language}
                                                      </Chip>
                                                   </motion.div>
                                                ))
                                             ) : (
                                                <div className="text-gray-500 text-sm flex items-center justify-center w-full py-4">
                                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.994-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                                   </svg>
                                                   {t('consultationLanguagesNotSpecified')}
                                                </div>
                                             )}
                                          </div>
                                       </div>
                                    </motion.div>
                                 </div>
                              </form>
                              
                              {/* Кнопки управления формой */}
                              {isEditing && (
                                 <motion.div 
                                    className="flex flex-col space-y-3 pt-6 mt-6 border-t border-gray-200"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7, duration: 0.5 }}
                                 >
                                    <motion.div
                                       whileHover={{ scale: 1.02 }}
                                       whileTap={{ scale: 0.98 }}
                                    >
                                       <Button 
                                          color="primary" 
                                          type="submit"
                                          form="doctor-profile-form"
                                          disabled={isLoading}
                                          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg font-medium w-full py-6 sm:py-4 text-base sm:text-sm min-h-[56px] sm:min-h-[48px] rounded-xl"
                                          startContent={
                                             isLoading ? null : 
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                             </svg>
                                          }
                                       >
                                          {isLoading ? <Spinner size="sm" /> : t('saveChanges')}
                                       </Button>
                                    </motion.div>
                                    <motion.div
                                       whileHover={{ scale: 1.02 }}
                                       whileTap={{ scale: 0.98 }}
                                    >
                                       <Button 
                                          color="default" 
                                          variant="light" 
                                          onClick={handleCancelEdit}
                                          disabled={isLoading}
                                          className="font-medium w-full py-4 sm:py-3 min-h-[48px] sm:min-h-[44px] rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                                          startContent={
                                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                             </svg>
                                          }
                                       >
                                          {t('cancel')}
                                       </Button>
                                    </motion.div>
                                 </motion.div>
                              )}
                           </div>
                        </div>
                     </CardBody>
                  </Card>
               </motion.div>
            </div>
         </motion.div>
         
         {/* Модальное окно для смены пароля */}
         <Modal isOpen={isPasswordModalOpen} onClose={closePasswordModal}>
            <ModalContent>
               <ModalHeader className="flex flex-col gap-1 relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-lg"></div>
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                     {t('changePassword')}
                  </h2>
               </ModalHeader>
               <ModalBody>
                  <form onSubmit={handlePasswordChange}>
                     {passwordError && (
                        <motion.div 
                           initial={{ opacity: 0, y: -10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="bg-red-50 p-3 rounded-lg mb-4 text-red-600 border-l-4 border-red-500 shadow-sm"
                        >
                           <div className="flex">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p className="text-sm">{passwordError}</p>
                           </div>
                        </motion.div>
                     )}
                     
                     <div className="space-y-4">
                        {!isGoogleAccount && (
                           <div className="relative group">
                              <Input
                                 label={t('currentPassword')}
                                 type="password"
                                 value={currentPassword}
                                 onChange={(e) => setCurrentPassword(e.target.value)}
                                 className="mb-4"
                                 variant="bordered"
                                 classNames={{
                                    inputWrapper: "group-hover:border-blue-500 transition-colors duration-300",
                                    label: "text-blue-600 group-hover:text-blue-700 transition-colors duration-300"
                                 }}
                                 startContent={
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                 }
                              />
                           </div>
                        )}
                        
                        <div className="relative group">
                           <Input
                              label={t('newPassword')}
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="mb-4"
                              variant="bordered"
                              classNames={{
                                 inputWrapper: "group-hover:border-blue-500 transition-colors duration-300",
                                 label: "text-blue-600 group-hover:text-blue-700 transition-colors duration-300"
                              }}
                              startContent={
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                 </svg>
                              }
                           />
                           {newPassword && (
                              <div className="mt-1 px-1">
                                 <div className="flex items-center gap-2">
                                    <div className={`h-1 flex-1 rounded-full ${newPassword.length < 8 ? 'bg-red-300' : 'bg-green-300'}`}></div>
                                    <div className={`h-1 flex-1 rounded-full ${newPassword.length < 10 ? 'bg-red-300' : 'bg-green-300'}`}></div>
                                    <div className={`h-1 flex-1 rounded-full ${newPassword.length < 12 ? 'bg-red-300' : 'bg-green-300'}`}></div>
                                    <div className="text-xs text-default-400">
                                       {newPassword.length < 8 ? 'Слабый' : newPassword.length < 10 ? 'Средний' : 'Сильный'}
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>
                        
                        <div className="relative group">
                           <Input
                              label={t('confirmPassword')}
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              variant="bordered"
                              classNames={{
                                 inputWrapper: "group-hover:border-blue-500 transition-colors duration-300",
                                 label: "text-blue-600 group-hover:text-blue-700 transition-colors duration-300"
                              }}
                              startContent={
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                 </svg>
                              }
                              color={confirmPassword && newPassword && confirmPassword === newPassword ? "success" : "default"}
                           />
                           {confirmPassword && newPassword && (
                              <div className="mt-1 px-1">
                                 {confirmPassword === newPassword ? (
                                    <div className="text-xs text-success flex items-center">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                       </svg>
                                       Пароли совпадают
                                    </div>
                                 ) : (
                                    <div className="text-xs text-danger flex items-center">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                       </svg>
                                       Пароли не совпадают
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>
                     </div>
                  </form>
               </ModalBody>
               <ModalFooter>
                  <Button 
                     variant="flat" 
                     onClick={closePasswordModal} 
                     isDisabled={isChangingPassword}
                     className="font-medium"
                  >
                     Отмена
                  </Button>
                  <Button 
                     color="primary" 
                     onClick={handlePasswordChange} 
                     isLoading={isChangingPassword}
                     isDisabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
                     className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md font-medium"
                  >
                     Изменить пароль
                  </Button>
               </ModalFooter>
            </ModalContent>
         </Modal>
         
         {/* Модальное окно настроек уведомлений */}
         <Modal isOpen={isNotificationsModalOpen} onClose={() => !isLoadingNotificationSettings && setNotificationsModalOpen(false)}>
            <ModalContent>
               <ModalHeader className="relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-lg"></div>
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                     Настройки уведомлений
                  </h2>
               </ModalHeader>
               <ModalBody>
                  <div className="space-y-6 py-2">
                     <motion.div 
                        className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 shadow-sm"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                     >
                        <div>
                           <h3 className="text-medium font-medium text-blue-800">Браузерные уведомления</h3>
                           <p className="text-small text-blue-600">Получать уведомления в браузере когда сайт открыт</p>
                        </div>
                        <Switch 
                           isSelected={pushNotifications}
                           onValueChange={setPushNotifications}
                           color="primary"
                           isDisabled={isLoadingNotificationSettings}
                           classNames={{
                              wrapper: "group-data-[selected=true]:bg-gradient-to-r from-blue-500 to-indigo-600"
                           }}
                        />
                     </motion.div>
                     
                     <motion.div 
                        className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/50 shadow-sm"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                     >
                        <div>
                           <h3 className="text-medium font-medium text-indigo-800">Напоминания о консультациях</h3>
                           <p className="text-small text-indigo-600">Получать напоминания о предстоящих консультациях</p>
                        </div>
                        <Switch 
                           isSelected={appointmentReminders}
                           onValueChange={setAppointmentReminders}
                           color="primary"
                           isDisabled={isLoadingNotificationSettings}
                           classNames={{
                              wrapper: "group-data-[selected=true]:bg-gradient-to-r from-indigo-500 to-purple-600"
                           }}
                        />
                     </motion.div>
                     
                     <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mt-4">
                        <div className="flex items-start">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                           </svg>
                           <p className="text-sm text-blue-700">
                              Вы всегда будете получать важные системные уведомления, независимо от этих настроек.
                           </p>
                        </div>
                     </div>
                  </div>
               </ModalBody>
               <ModalFooter>
                  <Button 
                     color="default" 
                     variant="light" 
                     onClick={() => setNotificationsModalOpen(false)} 
                     isDisabled={isLoadingNotificationSettings}
                     className="font-medium"
                  >
                     Отмена
                  </Button>
                  <Button 
                     color="primary" 
                     onClick={handleNotificationsSave} 
                     isLoading={isLoadingNotificationSettings}
                     className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md font-medium"
                  >
                     Сохранить
                  </Button>
               </ModalFooter>
            </ModalContent>
         </Modal>
      </motion.div>
   );
}

export { DoctorProfileForm };