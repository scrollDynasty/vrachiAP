import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Spinner, Textarea, Card, CardBody, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Switch, Select, SelectItem } from '@nextui-org/react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { notificationsApi } from '../api'; // Импортируем API для уведомлений
import api, { getCsrfToken } from '../api'; // Импортируем основной API и функцию для получения CSRF токена
import { uploadAvatar } from '../api'; // Импортируем функцию для загрузки аватара
import AvatarWithFallback from './AvatarWithFallback';
import { useTranslation } from './LanguageSelector'; // Импортируем наш компонент для аватара
import { getRegions, getDistrictsByRegion } from '../constants/uzbekistanRegions'; // Импортируем систему регионов
import { translateRegion, translateDistrict, getDistrictNameById } from './RegionTranslations'; // Импортируем функции перевода

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

const PatientProfileForm = ({ profile, onSave, isLoading, error }) => {
   const { t, currentLanguage } = useTranslation();
   // Состояния для полей формы
   const [full_name, setFullName] = useState('');
   const [contact_phone, setContactPhone] = useState('');
   const [contact_address, setContactAddress] = useState('');
   const [city, setCity] = useState('');
   const [district, setDistrict] = useState('');
   const [medicalInfo, setMedicalInfo] = useState('');

   // Состояния для UI
   const [formLocalError, setFormLocalError] = useState(null); 
   const [isEditing, setIsEditing] = useState(false);

   const [profileImage, setProfileImage] = useState(null);
   const [isUploading, setIsUploading] = useState(false);
   const avatarInputRef = useRef(null);
   
   // Модальные окна для различных действий
   const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
   const [isPrivacyModalOpen, setPrivacyModalOpen] = useState(false);
   const [isNotificationsModalOpen, setNotificationsModalOpen] = useState(false);
   const [isDeleteAccountModalOpen, setDeleteAccountModalOpen] = useState(false);
   
   const [isGoogleAccount, setIsGoogleAccount] = useState(false);
   const [currentPassword, setCurrentPassword] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [passwordError, setPasswordError] = useState(null);
   
   // Настройки уведомлений
   const [emailNotifications, setEmailNotifications] = useState(true);
   const [pushNotifications, setPushNotifications] = useState(true);
   const [appointmentReminders, setAppointmentReminders] = useState(true);
   const [isLoadingNotificationSettings, setIsLoadingNotificationSettings] = useState(false);

   // Состояние для CSRF токена
   const [csrfToken, setCsrfToken] = useState('');
   const [isChangingPassword, setIsChangingPassword] = useState(false);

   // Добавим состояние для хранения способа аутентификации
   const [authProvider, setAuthProvider] = useState('email');

   // Состояния для системы регионов
   const [availableRegions, setAvailableRegions] = useState([]);
   const [availableDistricts, setAvailableDistricts] = useState([]);



   // При монтировании компонента получаем данные пользователя, включая аватар
   useEffect(() => {
      if (profile) {
         
         setFullName(profile.full_name || '');
         setContactPhone(profile.contact_phone || '');
         setContactAddress(profile.contact_address || '');
         setCity(profile.city || '');
         setDistrict(profile.district || '');
         setMedicalInfo((profile.medical_info && profile.medical_info !== 'нету') ? profile.medical_info : '');
         
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
         
         // Проверка метода авторизации
         setIsGoogleAccount(profile.auth_provider === "google");
         
         // Если профиль существует, не включаем режим редактирования по умолчанию
         setIsEditing(false);

         // Отладочное сообщение для проверки данных
      } else {
         // Если профиля нет (null), включаем режим редактирования
         setIsEditing(true);
      }
      
      setFormLocalError(null);
   }, [profile]);

   // Добавляем проверку способа аутентификации при загрузке профиля
   useEffect(() => {
      if (profile) {
         // Устанавливаем начальные значения полей формы из профиля
         setFullName(profile.full_name || '');
         setContactPhone(profile.contact_phone || '');
         setContactAddress(profile.contact_address || '');
         setCity(profile.city || '');
         setDistrict(profile.district || '');
         setMedicalInfo((profile.medical_info && profile.medical_info !== 'нету') ? profile.medical_info : '');
         
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
                  // Игнорируем ошибки получения способа аутентификации
               }
            };
            
            checkAuthProvider();
         }
      }
   }, [profile]);

   // Загрузка настроек уведомлений при монтировании компонента
   useEffect(() => {
      const fetchNotificationSettings = async () => {
         if (!profile) return;
         
         setIsLoadingNotificationSettings(true);
         try {
            const settings = await notificationsApi.getNotificationSettings();
            setEmailNotifications(settings.email_notifications);
            setPushNotifications(settings.push_notifications);
            setAppointmentReminders(settings.appointment_reminders);
         } catch (error) {
            // Игнорируем ошибки загрузки настроек уведомлений
         } finally {
            setIsLoadingNotificationSettings(false);
         }
      };
      
      // Сначала проверяем наличие сохраненных настроек в sessionStorage
      try {
         const savedSettings = sessionStorage.getItem('notificationSettings');
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
   }, [profile]);

   // При монтировании компонента получаем CSRF токен
   useEffect(() => {
      const fetchCsrfToken = async () => {
         try {
            const token = await getCsrfToken();
            setCsrfToken(token);
         } catch (error) {
            // Игнорируем ошибки получения CSRF токена
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

   // Обработчик отправки формы
   const handleSubmit = (event) => {
      event.preventDefault();
      setFormLocalError(null);

      if (!full_name) {
        setFormLocalError("Пожалуйста, укажите ваше полное имя");
        return;
      }

      const profileData = {
         full_name: full_name || null,
         contact_phone: contact_phone || null,
         contact_address: contact_address || null,
         city: city || null,
         district: district || null,
         medical_info: (medicalInfo && medicalInfo !== 'нету' && medicalInfo.trim() !== '') ? medicalInfo : null
      };

      onSave(profileData);
      
      // После успешного сохранения выключаем режим редактирования
      if (!error) {
         setIsEditing(false);
      }
   };
   
   // Обработчик включения режима редактирования
   const handleEditClick = () => {
      setIsEditing(true);
   };
   
   // Обработчик отмены редактирования
   const handleCancelEdit = () => {
      // Восстанавливаем данные из profile и выключаем режим редактирования
      if (profile) {
         setFullName(profile.full_name || '');
         setContactPhone(profile.contact_phone || '');
         setContactAddress(profile.contact_address || '');
         setCity(profile.city || '');
         setDistrict(profile.district || '');
         setMedicalInfo((profile.medical_info && profile.medical_info !== 'нету') ? profile.medical_info : '');
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
   
   // Обработчик изменения пароля
   const handleChangePassword = async (event) => {
      event?.preventDefault();
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
            toast.success(t('passwordChanged'), {
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
   
   // Обработчик загрузки изображения
   const handleImageUpload = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      setIsUploading(true);
      
      // Загружаем аватар на сервер
      uploadAvatar(file)
         .then(response => {
            // Получаем путь к аватару с сервера
            const avatarPath = response.avatar_path;
            
            // Устанавливаем путь к аватару вместо base64 данных
            setProfileImage(avatarPath);
            
            // Показываем уведомление об успешной загрузке
            toast.success(t('profilePhotoUpdated'), {
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
   
   const handleChangePhotoClick = () => {
      // Программно кликаем по скрытому input[type="file"]
      avatarInputRef.current?.click();
   };
   
   // Добавляем обработчик сохранения настроек уведомлений с CSRF защитой
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
         toast.success(t('notificationSettingsSaved'), {
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
         sessionStorage.setItem('notificationSettings', JSON.stringify({
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

   // Добавляем обработчик удаления аккаунта
   const handleDeleteAccount = async () => {
      try {
         // Получаем свежий CSRF-токен перед отправкой
         const freshTokenResponse = await api.get('/csrf-token');
         const freshToken = freshTokenResponse.data.csrf_token;
         
         // Отправляем запрос на удаление аккаунта
         await api.post('/users/me/delete-account', {
            csrf_token: freshToken,
            confirmation: 'удалить' // Подтверждение с фронтенда
         });
         
         // Показываем уведомление об успешном удалении
         toast.success(t('accountDeleted'), {
            position: 'top-right',
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true
         });
         
         // Закрываем модальное окно
         setDeleteAccountModalOpen(false);
         
         // Удаляем токен из localStorage
         localStorage.removeItem('token');
         localStorage.removeItem('profileImage');
         sessionStorage.clear();
         
         // Перенаправляем на страницу логина
         window.location.href = '/login';
      } catch (error) {
         // Показываем сообщение об ошибке
         let errorMessage = 'Не удалось удалить аккаунт. Попробуйте позже.';
         
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
      }
   };

   // Функция для преобразования ID района в его название


   return (
      <motion.div 
         initial="hidden"
         animate="visible"
         variants={fadeIn}
         className="patient-profile-form relative"
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
         
         {/* Аватар и информация о пользователе */}
         <motion.div 
            className="flex flex-col items-center mb-12 pt-4"
            variants={staggerFormContainer}
         >
            <motion.div 
               className="relative group mb-5"
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
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
               <div className="relative z-10">
                  <AvatarWithFallback 
                     src={profileImage} 
                     name={full_name ? full_name.charAt(0).toUpperCase() : "?"} 
                     size="xl"
                     className="h-24 w-24 border-2 border-white shadow-xl" 
                     color="primary"
                  />
               </div>
               
               {isEditing && (
                  <motion.div 
                     className="absolute -bottom-1 -right-1 bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full shadow-lg cursor-pointer z-20"
                     onClick={handleChangePhotoClick}
                     whileHover={{ scale: 1.1, rotate: 5 }}
                     whileTap={{ scale: 0.9 }}
                     initial={{ scale: 0, opacity: 0 }}
                     animate={{ scale: 1, opacity: 1 }}
                     transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 15,
                        delay: 0.2
                     }}
                  >
                     <input 
                        type="file" 
                        ref={avatarInputRef}
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                     />
                     {isUploading ? (
                        <Spinner size="sm" color="white" />
                     ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                     )}
                  </motion.div>
               )}
            </motion.div>
            
            {!isEditing && profile && (
               <motion.div 
                  variants={slideUp} 
                  className="text-center"
               >
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">{full_name}</h2>
                  <div className="flex items-center justify-center mt-2 text-gray-600">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                     </svg>
                     <span>{contact_phone || t('phoneNotSpecified')}</span>
                  </div>
               </motion.div>
            )}
         </motion.div>
      
         {/* Заголовок секции */}
         <div className="mb-6 text-center">
            <motion.div
               variants={slideUp}
               className="relative mb-4 inline-block"
            >
               <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {isEditing ? t('editProfile') : t('profileInformation')}
               </h3>
               <motion.div 
                  className="absolute -bottom-1 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full w-full"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ delay: 0.2, duration: 0.8 }}
               />
            </motion.div>
            
            {!isEditing && profile && (
               <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}
                  className="flex justify-center"
               >
                  <motion.div
                     whileHover={{ scale: 1.05 }}
                     whileTap={{ scale: 0.95 }}
                  >
                     <Button 
                        color="primary" 
                        variant="flat"
                        size="lg"
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 px-8 py-3 font-medium rounded-xl sm:px-8 sm:py-3 md:px-4 md:py-2 md:text-sm lg:px-6 lg:py-2"
                        startContent={
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 md:h-4 md:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                           </svg>
                        }
                        onClick={handleEditClick}
                     >
                        Редактировать профиль
                     </Button>
                  </motion.div>
               </motion.div>
            )}
         </div>
         
         {/* Режим просмотра (нередактируемый) */}
         {!isEditing && profile && (
            <motion.div
               variants={fadeIn}
               initial="hidden"
               animate="visible"
               className="w-full"
            >
               <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-500 border-none">
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
                        
                        <div className="relative z-10 px-8 py-8 space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <motion.div 
                                 className="space-y-6"
                                 initial={{ opacity: 0, x: -20 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 transition={{ delay: 0.2, duration: 0.5 }}
                              >
                                 <div className="space-y-2">
                                    <div className="flex items-center">
                                       <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                          </svg>
                                       </div>
                                       <h4 className="text-sm font-semibold text-blue-600">{t('fullNameLabel')}</h4>
                                    </div>
                                    <p className="text-medium pl-11 font-medium">{full_name || t('notSpecified')}</p>
                                 </div>
                                 
                                 <div className="space-y-2">
                                    <div className="flex items-center">
                                       <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                          </svg>
                                       </div>
                                       <h4 className="text-sm font-semibold text-blue-600">{t('phoneLabel')}</h4>
                                    </div>
                                    <p className="text-medium pl-11 font-medium">{contact_phone || t('notSpecified')}</p>
                                 </div>

                                 <div className="space-y-2">
                                    <div className="flex items-center">
                                       <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                                          </svg>
                                       </div>
                                       <h4 className="text-sm font-semibold text-blue-600">{t('district')}</h4>
                                    </div>
                                    <p className="text-medium pl-11 font-medium">{getDistrictNameById(district, city, currentLanguage)}</p>
                                 </div>
                              </motion.div>
                              
                              <motion.div 
                                 className="space-y-6"
                                 initial={{ opacity: 0, x: 20 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 transition={{ delay: 0.4, duration: 0.5 }}
                              >
                                 <div className="space-y-2">
                                    <div className="flex items-center">
                                       <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                       </div>
                                       <h4 className="text-sm font-semibold text-blue-600">{t('addressLabel')}</h4>
                                    </div>
                                    <p className="text-medium pl-11 font-medium">{contact_address || t('notSpecified')}</p>
                                 </div>
                                 
                                 <div className="space-y-2">
                                    <div className="flex items-center">
                                       <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                          </svg>
                                       </div>
                                       <h4 className="text-sm font-semibold text-blue-600">{t('cityRegion')}</h4>
                                    </div>
                                    <p className="text-medium pl-11 font-medium">{city || 'Не указано'}</p>
                                 </div>
                              </motion.div>
                           </div>
                           
                           <motion.div 
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.6, duration: 0.5 }}
                           >
                              <Divider className="my-4 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 h-0.5" />
                              
                              <div className="space-y-2 mt-6">
                                 <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                       </svg>
                                    </div>
                                    <h4 className="text-sm font-semibold text-blue-600">{t('medicalInfoLabel')}</h4>
                                 </div>
                                 <div className="pl-11 mt-2 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                    <p className="text-medium whitespace-pre-line">{medicalInfo || t('medicalInfoNotSpecified')}</p>
                                 </div>
                              </div>
                           </motion.div>
                        </div>
                     </div>
                  </CardBody>
               </Card>
            </motion.div>
         )}
         
         {/* Режим редактирования */}
         {isEditing && (
            <motion.form 
               onSubmit={handleSubmit}
               initial="hidden"
               animate="visible"
               variants={staggerFormContainer}
               className="space-y-5"
            >
               {/* Вывод ошибки */}
               {(error || formLocalError) && (
                  <motion.div 
                     initial={{ opacity: 0, y: -10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="bg-danger-50 text-danger p-4 rounded-lg mb-4 border-l-4 border-danger shadow-sm"
                  >
                     <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="font-medium">{error || formLocalError}</span>
                     </div>
                  </motion.div>
               )}
               
               <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                  <motion.div
                     variants={slideUp}
                     className="relative group"
                  >
                     <Input
                        label={t('fullName')}
                        placeholder={t('fullNamePlaceholder')}
                        value={full_name}
                        onChange={(e) => setFullName(e.target.value)}
                        variant="bordered"
                        radius="sm"
                        isRequired
                        className="max-w-full"
                        classNames={{
                           inputWrapper: "group-hover:border-blue-500 transition-colors duration-300",
                           label: "text-blue-600 group-hover:text-blue-700 transition-colors duration-300"
                        }}
                        startContent={
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                           </svg>
                        }
                        autoFocus
                     />
                     <motion.div
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded opacity-0 group-hover:opacity-100"
                        initial={{ scaleX: 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                     />
                  </motion.div>
                  
                  <motion.div
                     variants={slideUp}
                     className="relative group"
                  >
                     <Input
                        label={t('contactPhone')}
                        placeholder={t('phonePlaceholder')}
                        value={contact_phone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        variant="bordered"
                        radius="sm"
                        className="max-w-full"
                        classNames={{
                           inputWrapper: "group-hover:border-blue-500 transition-colors duration-300",
                           label: "text-blue-600 group-hover:text-blue-700 transition-colors duration-300"
                        }}
                        startContent={
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                           </svg>
                        }
                     />
                     <motion.div
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded opacity-0 group-hover:opacity-100"
                        initial={{ scaleX: 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                     />
                  </motion.div>
               </div>
               
               <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                  <motion.div
                     variants={slideUp}
                     className="relative group"
                  >
                     <Select
                        label={t('cityLabel')}
                        placeholder={t('cityPlaceholder')}
                        selectedKeys={city ? [city] : []}
                        onChange={handleCityChange}
                        variant="bordered"
                        radius="sm"
                        className="max-w-full"
                        classNames={{
                           trigger: "group-hover:border-blue-500 transition-colors duration-300",
                           label: "text-blue-600 group-hover:text-blue-700 transition-colors duration-300"
                        }}
                        startContent={
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                        }
                     >
                        {availableRegions.map((region) => (
                           <SelectItem key={region} value={region}>
                              {translateRegion(region, currentLanguage)}
                           </SelectItem>
                        ))}
                     </Select>
                     <motion.div
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded opacity-0 group-hover:opacity-100"
                        initial={{ scaleX: 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                     />
                  </motion.div>

                  <motion.div
                     variants={slideUp}
                     className="relative group"
                  >
                     <Select
                        label={t('district')}
                        placeholder={city ? t('districtPlaceholder') : "Сначала выберите город"}
                        selectedKeys={district ? [district] : []}
                        onChange={handleDistrictChange}
                        variant="bordered"
                        radius="sm"
                        className="max-w-full"
                        isDisabled={!city || availableDistricts.length === 0}
                        classNames={{
                           trigger: "group-hover:border-blue-500 transition-colors duration-300",
                           label: "text-blue-600 group-hover:text-blue-700 transition-colors duration-300"
                        }}
                        startContent={
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                           </svg>
                        }
                     >
                        {availableDistricts.map((district) => (
                           <SelectItem key={district} value={district}>
                              {translateDistrict(district, currentLanguage)}
                           </SelectItem>
                        ))}
                     </Select>
                     <motion.div
                        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded opacity-0 group-hover:opacity-100"
                        initial={{ scaleX: 0 }}
                        whileHover={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                     />
                  </motion.div>
               </div>
               
               <motion.div
                  variants={slideUp}
                  className="relative group"
               >
                  <Textarea
                     label={t('addressLabel')}
                     placeholder={t('addressPlaceholder')}
                     value={contact_address}
                     onChange={(e) => setContactAddress(e.target.value)}
                     variant="bordered"
                     radius="sm"
                     className="max-w-full"
                     classNames={{
                        inputWrapper: "group-hover:border-blue-500 transition-colors duration-300",
                        label: "text-blue-600 group-hover:text-blue-700 transition-colors duration-300"
                     }}
                     startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                     }
                  />
                  <motion.div
                     className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded opacity-0 group-hover:opacity-100"
                     initial={{ scaleX: 0 }}
                     whileHover={{ scaleX: 1 }}
                     transition={{ duration: 0.3 }}
                  />
               </motion.div>
               
               
               <motion.div
                  variants={slideUp}
                  className="relative group"
               >
                  <Textarea
                     label={t('medicalInfo')}
                     placeholder={t('medicalInfoPlaceholder')}
                     value={medicalInfo}
                     onChange={(e) => setMedicalInfo(e.target.value)}
                     variant="bordered"
                     radius="sm"
                     minRows={3}
                     maxRows={5}
                     className="max-w-full"
                     classNames={{
                        inputWrapper: "group-hover:border-blue-500 transition-colors duration-300",
                        label: "text-blue-600 group-hover:text-blue-700 transition-colors duration-300"
                     }}
                     startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                     }
                  />
                  <motion.div
                     className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded opacity-0 group-hover:opacity-100"
                     initial={{ scaleX: 0 }}
                     whileHover={{ scaleX: 1 }}
                     transition={{ duration: 0.3 }}
                  />
               </motion.div>
               
               <motion.div 
                  className="flex flex-col space-y-3 pt-5"
                  variants={slideUp}
               >
                  <motion.div
                     whileHover={{ scale: 1.02 }}
                     whileTap={{ scale: 0.98 }}
                  >
                     <Button
                        type="submit"
                        color="primary"
                        isLoading={isLoading}
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md hover:shadow-lg px-5 font-medium w-full py-6 sm:py-4 text-base sm:text-sm min-h-[56px] sm:min-h-[48px] rounded-xl"
                        startContent={!isLoading && (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                           </svg>
                        )}
                     >
                        {isLoading ? t('saving') : t('saveProfile')}
                     </Button>
                  </motion.div>
                  
                  {profile && (
                     <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                     >
                        <Button
                           type="button"
                           color="default"
                           variant="light"
                           onClick={handleCancelEdit}
                           className="px-5 font-medium w-full py-4 sm:py-3 min-h-[48px] sm:min-h-[44px] rounded-xl border border-gray-200 hover:border-gray-300 transition-colors"
                           startContent={
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                           }
                        >
                           {t('cancelEdit')}
                        </Button>
                     </motion.div>
                  )}
               </motion.div>
            </motion.form>
         )}
         
         {/* Настройки аккаунта */}
         {profile && (
            <motion.div 
               className="mt-8 sm:mt-12"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.5, duration: 0.5 }}
            >
               {/* Красивый разделитель */}
               <div className="relative mb-6 sm:mb-8">
                  <div className="absolute inset-0 flex items-center">
                     <div className="w-full border-t border-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                  </div>
                  <div className="relative flex justify-center">
                     <div className="bg-white px-4 sm:px-6">
                        <motion.div 
                           className="flex items-center gap-2 text-gray-500"
                           whileHover={{ scale: 1.05 }}
                           transition={{ type: "spring", stiffness: 300 }}
                        >
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                           <span className="text-sm sm:text-base font-medium">{t('accountSettings')}</span>
                        </motion.div>
                     </div>
                  </div>
               </div>
               
               {/* Карточка с настройками */}
               <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  className="bg-gradient-to-br from-white to-gray-50/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-100 shadow-lg hover:shadow-xl transition-all duration-300"
               >
                  <div className="grid gap-2 sm:gap-3">
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
                              <span className="font-medium text-sm sm:text-base block mb-1">{t('changePassword')}</span>
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
                           <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500/10 to-indigo-500/10 flex items-center justify-center mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                           </div>
                        }
                        onClick={() => setNotificationsModalOpen(true)}
                        className="justify-start hover:bg-blue-50 transition-colors w-full py-4 sm:py-3 min-h-[56px] sm:min-h-[48px] rounded-lg"
                     >
                        <div>
                           <span className="font-medium">{t('notificationSettings')}</span>
                        </div>
                     </Button>
                  </motion.div>
                  
                  {/* Кнопка удаления аккаунта */}
                  <motion.div
                     whileHover={{ x: 5 }}
                     transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                     <Button
                        color="danger"
                        variant="light"
                        startContent={
                           <div className="w-8 h-8 rounded-full bg-danger-50 flex items-center justify-center mr-2">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                           </div>
                        }
                        onClick={() => setDeleteAccountModalOpen(true)}
                        className="justify-start hover:bg-danger-50 transition-colors w-full py-4 sm:py-3 min-h-[56px] sm:min-h-[48px] rounded-lg"
                     >
                        <div>
                           <span className="font-medium">{t('deleteAccount')}</span>
                        </div>
                     </Button>
                  </motion.div>
                  </div>
               </motion.div>
            </motion.div>
         )}
         
         {/* Модальное окно смены пароля */}
         <Modal isOpen={isPasswordModalOpen} onClose={() => !isChangingPassword && setPasswordModalOpen(false)}>
            <ModalContent>
               {(onClose) => (
                  <>
                     <ModalHeader className="flex flex-col gap-1 relative">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-lg"></div>
                        <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Изменение пароля</h2>
                     </ModalHeader>
                     <ModalBody>
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
                                 <span>{passwordError}</span>
                              </div>
                           </motion.div>
                        )}
                        
                        <div className="space-y-4">
                           <div className="relative group">
                              <Input
                                 type="password"
                                 label="Текущий пароль"
                                 value={currentPassword}
                                 onChange={(e) => setCurrentPassword(e.target.value)}
                                 placeholder="Введите текущий пароль"
                                 fullWidth
                                 size="lg"
                                 autoComplete="current-password"
                                 isDisabled={isChangingPassword}
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
                           
                           <div className="relative group">
                              <Input
                                 type="password"
                                 label="Новый пароль"
                                 value={newPassword}
                                 onChange={(e) => setNewPassword(e.target.value)}
                                 placeholder="Минимум 8 символов"
                                 fullWidth
                                 size="lg"
                                 autoComplete="new-password"
                                 isDisabled={isChangingPassword}
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
                                 type="password"
                                 label="Подтверждение нового пароля"
                                 value={confirmPassword}
                                 onChange={(e) => setConfirmPassword(e.target.value)}
                                 placeholder="Повторите новый пароль"
                                 fullWidth
                                 size="lg"
                                 autoComplete="new-password"
                                 isDisabled={isChangingPassword}
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
                     </ModalBody>
                     <ModalFooter>
                        <Button 
                           color="default" 
                           variant="light" 
                           onClick={onClose} 
                           isDisabled={isChangingPassword}
                           className="font-medium"
                        >
                           {t('cancel')}
                        </Button>
                        <Button 
                           color="primary" 
                           onClick={handleChangePassword} 
                           isLoading={isChangingPassword}
                           isDisabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
                           className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md font-medium"
                        >
                           {t('changePassword')}
                        </Button>
                     </ModalFooter>
                  </>
               )}
            </ModalContent>
         </Modal>
         
         {/* Модальное окно настроек уведомлений */}
         <Modal isOpen={isNotificationsModalOpen} onClose={() => !isLoadingNotificationSettings && setNotificationsModalOpen(false)}>
            <ModalContent>
               <ModalHeader className="relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-t-lg"></div>
                  <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{t('notificationSettingsTitle')}</h2>
               </ModalHeader>
               <ModalBody>
                  <div className="space-y-6 py-2">
                     <motion.div 
                        className="flex justify-between items-center p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100/50 shadow-sm"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                     >
                        <div>
                           <h3 className="text-medium font-medium text-blue-800">{t('browserNotifications')}</h3>
                           <p className="text-small text-blue-600">{t('browserNotificationsDesc')}</p>
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
                           <h3 className="text-medium font-medium text-indigo-800">{t('appointmentReminders')}</h3>
                           <p className="text-small text-indigo-600">{t('appointmentRemindersDesc')}</p>
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
                              {t('importantNotificationsInfo')}
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
                     {t('cancel')}
                  </Button>
                  <Button 
                     color="primary" 
                     onClick={handleNotificationsSave} 
                     isLoading={isLoadingNotificationSettings}
                     className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md font-medium"
                  >
                     {t('save')}
                  </Button>
               </ModalFooter>
            </ModalContent>
         </Modal>
         
         {/* Модальное окно удаления аккаунта */}
         <Modal isOpen={isDeleteAccountModalOpen} onClose={() => setDeleteAccountModalOpen(false)}>
            <ModalContent>
               <ModalHeader className="relative">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-danger to-danger-500 rounded-t-lg"></div>
                  <h2 className="text-xl text-danger font-semibold">{t('deleteAccountTitle')}</h2>
               </ModalHeader>
               <ModalBody>
                  <div className="space-y-4">
                     <motion.div 
                        className="bg-danger-50 p-5 rounded-xl border-l-4 border-danger shadow-sm"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                     >
                        <div className="flex items-start">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-danger mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                           </svg>
                           <div>
                              <h3 className="font-medium text-lg text-danger mb-2">{t('deleteAccountWarning')}</h3>
                              <p className="text-sm text-danger-700">{t('deleteAccountDescription')}</p>
                              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-danger-700">
                                 <li>{t('profileDataWillBeDeleted')}</li>
                                 <li>{t('consultationHistoryWillBeUnavailable')}</li>
                                 <li>{t('accountRecoveryImpossible')}</li>
                              </ul>
                           </div>
                        </div>
                     </motion.div>
                     
                     <Divider className="my-4" />
                     
                     <div className="p-4 bg-danger-50/50 rounded-lg">
                        <label className="block text-sm font-medium text-danger-700 mb-2">
                           {t('confirmationRequired')}
                        </label>
                        <Input
                           type="text"
                           placeholder={t('deletePlaceholder')}
                           variant="bordered"
                           color="danger"
                           id="delete-confirmation"
                           className="border-danger-300"
                           classNames={{
                              inputWrapper: "border-danger-300 hover:border-danger-500"
                           }}
                        />
                     </div>
                  </div>
               </ModalBody>
               <ModalFooter>
                  <Button 
                     color="default" 
                     variant="light" 
                     onClick={() => setDeleteAccountModalOpen(false)}
                     className="font-medium"
                  >
                     {t('cancel')}
                  </Button>
                  <Button 
                     color="danger" 
                     className="bg-gradient-to-r from-danger-500 to-red-500 text-white shadow-md font-medium"
                     onClick={() => {
                        const confirmation = document.getElementById('delete-confirmation').value;
                        if (confirmation === t('deletePlaceholder')) {
                           handleDeleteAccount();
                        } else {
                           toast.error(t('deleteConfirmationError'), {
                              position: 'top-right',
                              autoClose: 3000
                           });
                        }
                     }}
                  >
                     {t('deleteAccountButton')}
                  </Button>
               </ModalFooter>
            </ModalContent>
         </Modal>
      </motion.div>
   );
};

export { PatientProfileForm };