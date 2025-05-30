// frontend/src/components/PatientProfileForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Spinner, Textarea, Card, CardBody, Divider, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Switch, Select, SelectItem } from '@nextui-org/react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { notificationsApi } from '../api'; // Импортируем API для уведомлений
import api, { getCsrfToken } from '../api'; // Импортируем основной API и функцию для получения CSRF токена
import { uploadAvatar } from '../api'; // Импортируем функцию для загрузки аватара
import AvatarWithFallback from './AvatarWithFallback'; // Импортируем наш компонент для аватара

// Анимационные варианты для элементов
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } }
};

const slideUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

// Компонент формы для профиля Пациента
// Используется на странице ProfileSettingsPage для создания или редактирования профиля Пациента.
// Принимает:
// - profile: Объект с текущими данными профиля пациента (null, если профиль не создан).
// - onSave: Функция, которая будет вызвана при отправке формы с данными профиля.
// - isLoading: Флаг, указывающий, идет ли процесс сохранения (передается из родительского компонента).
// - error: Сообщение об ошибке сохранения (передается из родительского компонента).
const PatientProfileForm = ({ profile, onSave, isLoading, error }) => {
   // Состояния для полей формы
   const [full_name, setFullName] = useState('');
   const [contact_phone, setContactPhone] = useState('');
   const [contact_address, setContactAddress] = useState('');
   const [district, setDistrict] = useState('');
   const [medicalInfo, setMedicalInfo] = useState('');

   // Состояния для UI
   const [formLocalError, setFormLocalError] = useState(null); // Локальные ошибки валидации формы
   const [isEditing, setIsEditing] = useState(false); // Флаг режима редактирования

   // Состояние для загрузки изображения профиля
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

   // При монтировании компонента получаем данные пользователя, включая аватар
   useEffect(() => {
      if (profile) {
         console.log('Получен профиль пациента:', profile);
         
         setFullName(profile.full_name || '');
         setContactPhone(profile.contact_phone || '');
         setContactAddress(profile.contact_address || '');
         setDistrict(profile.district || '');
         setMedicalInfo(profile.medical_info || '');
         
         // Получаем аватар пользователя
         const loadUserAvatar = async () => {
            try {
               // Проверяем, есть ли аватар в профиле или в связанном пользователе
               if (profile.user && profile.user.avatar_path) {
                  console.log('Загружен аватар из профиля пациента (user.avatar_path):', profile.user.avatar_path);
                  setProfileImage(profile.user.avatar_path);
               } else if (profile.avatar_path) {
                  console.log('Загружен аватар напрямую из профиля пациента (avatar_path):', profile.avatar_path);
                  setProfileImage(profile.avatar_path);
               } else {
                  // Если аватара нет ни в профиле, ни в связанном пользователе, 
                  // пробуем загрузить его через API
                  try {
                     const userResponse = await api.get('/users/me');
                     if (userResponse.data && userResponse.data.avatar_path) {
                        console.log('Загружен аватар из /users/me API:', userResponse.data.avatar_path);
                        setProfileImage(userResponse.data.avatar_path);
                     } else {
                        console.log('Аватар не найден в API');
                        setProfileImage(null);
                     }
                  } catch (error) {
                     console.error('Ошибка при загрузке аватара из API:', error);
                     setProfileImage(null);
                  }
               }
            } catch (error) {
               console.error('Ошибка при загрузке аватара:', error);
               setProfileImage(null);
            }
         };
         
         loadUserAvatar();
         
         // Проверка метода авторизации
         setIsGoogleAccount(profile.auth_provider === "google");
         
         // Если профиль существует, не включаем режим редактирования по умолчанию
         setIsEditing(false);

         // Отладочное сообщение для проверки данных
         console.log('Medical info:', profile.medical_info);
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
         setDistrict(profile.district || '');
         setMedicalInfo(profile.medical_info || '');
         
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
                  console.error('Ошибка при получении данных о способе аутентификации:', error);
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
            console.error('Ошибка при загрузке настроек уведомлений:', error);
         } finally {
            setIsLoadingNotificationSettings(false);
         }
      };
      
      // Сначала проверяем наличие сохраненных настроек в sessionStorage
      try {
         const savedSettings = sessionStorage.getItem('notificationSettings');
         if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            console.log('Загружены сохраненные настройки уведомлений:', parsedSettings);
            
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
         console.error('Ошибка при загрузке сохраненных настроек уведомлений:', error);
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
            console.error('Ошибка при получении CSRF токена:', error);
         }
      };
      
      fetchCsrfToken();
   }, []);

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
         district: district || null,
         medical_info: medicalInfo || null
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
         setDistrict(profile.district || '');
         setMedicalInfo(profile.medical_info || '');
      }
      setIsEditing(false);
      setFormLocalError(null);
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
            console.error('CSRF токен отсутствует. Получаем новый токен...');
            try {
               const tokenResponse = await api.get('/csrf-token');
               setCsrfToken(tokenResponse.data.csrf_token);
            } catch (tokenError) {
               console.error('Не удалось получить CSRF токен:', tokenError);
               setPasswordError("Ошибка безопасности. Пожалуйста, обновите страницу и попробуйте снова.");
               setIsChangingPassword(false);
               return;
            }
         }
         
         console.log('Отправка запроса на смену пароля...');
         
         // Всегда получаем свежий CSRF токен перед отправкой запроса на смену пароля
         try {
            const freshTokenResponse = await api.get('/csrf-token');
            const freshToken = freshTokenResponse.data.csrf_token;
            console.log('Получен свежий CSRF токен для смены пароля');
            
            // Отправляем запрос на смену пароля с свежим CSRF токеном
            const changePasswordResponse = await api.post('/users/me/change-password', {
               csrf_token: freshToken,
               current_password: currentPassword,
               new_password: newPassword
            });
            
            console.log('Ответ от сервера:', changePasswordResponse);
            
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
            console.error('Ошибка при смене пароля:', error);
            
            // Получаем сообщение ошибки из ответа сервера, если оно есть
            let errorMessage = 'Не удалось изменить пароль. Пожалуйста, проверьте введенные данные.';
            
            if (error.response?.data) {
               if (error.response.status === 401) {
                  errorMessage = 'Неверный текущий пароль. Пожалуйста, проверьте правильность ввода.';
               } else if (error.response.status === 400) {
                  // Специальная обработка для Bad Request
                  if (error.response.data.detail) {
                     const detail = error.response.data.detail;
                     console.info('Детальная ошибка 400:', detail);
                     
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
         console.error('Неожиданная ошибка при смене пароля:', error);
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
            console.error('Ошибка при загрузке аватара:', error);
            
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
         console.log('Получен свежий CSRF токен для настроек уведомлений');
         
         // Формируем объект с настройками и проверяем значения
         const notificationSettings = {
            csrf_token: freshToken,
            push_notifications: !!pushNotifications, // Преобразуем в boolean
            appointment_reminders: !!appointmentReminders // Преобразуем в boolean
         };
         
         console.log('Сохранение настроек уведомлений:', {
            push_notifications: notificationSettings.push_notifications,
            appointment_reminders: notificationSettings.appointment_reminders
         });
         
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
         sessionStorage.setItem('notificationSettings', JSON.stringify({
            push_notifications: notificationSettings.push_notifications,
            appointment_reminders: notificationSettings.appointment_reminders
         }));
      } catch (error) {
         console.error('Ошибка при сохранении настроек уведомлений:', error);
         
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
         toast.success('Аккаунт успешно удален', {
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
         console.error('Ошибка при удалении аккаунта:', error);
         
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

   return (
      <motion.div
         initial="hidden"
         animate="visible"
         variants={fadeIn}
         className="patient-profile-form"
      >
         {/* Аватар пользователя */}
         <div className="flex flex-col items-center mb-8">
            <motion.div 
               whileHover={{ scale: 1.05 }}
               whileTap={{ scale: 0.95 }}
               className="mb-4"
            >
               <AvatarWithFallback 
                  src={profileImage} 
                  name={full_name || profileImage ? `${full_name.split(' ')[0]} ${full_name.split(' ')[1] || ''}` : 'Пользователь'} 
                  size="xl"
                  className="w-40 h-40 mb-2 shadow-md" 
                  color="primary"
                  style={{ minWidth: '160px', minHeight: '160px' }}
               />
            </motion.div>
            
            {isEditing && (
               <motion.div variants={slideUp} className="flex gap-2">
                  <input 
                     type="file" 
                     ref={avatarInputRef}
                     className="hidden" 
                     accept="image/*" 
                     onChange={handleImageUpload}
                  />
                  <Button
                     color="primary"
                     className="font-medium"
                     size="sm"
                     radius="full"
                     onClick={handleChangePhotoClick}
                     isDisabled={isUploading}
                     startContent={
                        isUploading ? (
                           <Spinner size="sm" color="white" />
                        ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                           </svg>
                        )
                     }
                  >
                     {isUploading ? "Загрузка..." : "Изменить фото"}
                  </Button>
               </motion.div>
            )}
         </div>
      
         {/* Заголовок секции и кнопка редактирования */}
         <div className="flex justify-between items-center mb-5">
            <motion.h3 
               variants={slideUp}
               className="text-xl font-semibold text-gray-800 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
            >
               Профиль пациента
            </motion.h3>
            {!isEditing && profile && (
               <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
               >
                  <Button 
                     color="primary" 
                     variant="light" 
                     size="sm"
                     startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                     }
                     onClick={handleEditClick}
                  >
                     Редактировать
                  </Button>
               </motion.div>
            )}
         </div>
         
         {/* Режим просмотра (нередактируемый) */}
         {!isEditing && profile && (
            <motion.div
               variants={slideUp}
               initial="hidden"
               animate="visible"
            >
               <Card className="mb-6 shadow-sm overflow-hidden">
                  <CardBody className="p-6">
                     <motion.div 
                        className="space-y-4"
                        initial="hidden"
                        animate="visible"
                        variants={{
                           hidden: { opacity: 0 },
                           visible: {
                              opacity: 1,
                              transition: {
                                 staggerChildren: 0.1
                              }
                           }
                        }}
                     >
                        <motion.div variants={slideUp}>
                           <h4 className="text-sm font-semibold text-gray-500 mb-1">Полное имя</h4>
                           <p className="text-medium">{full_name || 'Не указано'}</p>
                        </motion.div>
                        
                        <motion.div variants={slideUp}>
                           <h4 className="text-sm font-semibold text-gray-500 mb-1">Контактный телефон</h4>
                           <p className="text-medium">{contact_phone || 'Не указано'}</p>
                        </motion.div>
                        
                        <motion.div variants={slideUp}>
                           <h4 className="text-sm font-semibold text-gray-500 mb-1">Адрес</h4>
                           <p className="text-medium">{contact_address || 'Не указано'}</p>
                        </motion.div>
                        
                        <motion.div variants={slideUp}>
                           <h4 className="text-sm font-semibold text-gray-500 mb-1">Район</h4>
                           <p className="text-medium">{district || 'Не указано'}</p>
                        </motion.div>
                        
                        <Divider className="my-3" />
                        
                        <motion.div variants={slideUp}>
                           <h4 className="text-sm font-semibold text-gray-500 mb-1">Медицинская информация</h4>
                           <p className="text-medium whitespace-pre-line">{medicalInfo || 'Не указано'}</p>
                        </motion.div>
                     </motion.div>
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
               variants={slideUp}
               className="space-y-5"
            >
               {/* Вывод ошибки */}
               {(error || formLocalError) && (
                  <motion.div 
                     className="bg-danger-50 text-danger p-3 rounded-lg mb-4"
                     initial={{ opacity: 0, y: -10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.3 }}
                  >
                     {error || formLocalError}
                  </motion.div>
               )}
               
               <motion.div 
                  variants={slideUp} 
                  className="grid gap-5 md:grid-cols-2"
               >
                  <Input
                     label="Полное имя"
                     placeholder="Введите ваше ФИО"
                     value={full_name}
                     onChange={(e) => setFullName(e.target.value)}
                     variant="bordered"
                     radius="sm"
                     isRequired
                     labelPlacement="outside"
                     className="max-w-full"
                     autoFocus
                     startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                     }
                  />
                  
                  <Input
                     label="Контактный телефон"
                     placeholder="Введите ваш телефон"
                     value={contact_phone}
                     onChange={(e) => setContactPhone(e.target.value)}
                     variant="bordered"
                     radius="sm"
                     labelPlacement="outside"
                     className="max-w-full"
                     startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                     }
                  />
               </motion.div>
               
               <motion.div variants={slideUp}>
                  <Input
                     label="Адрес"
                     placeholder="Введите ваш адрес"
                     value={contact_address}
                     onChange={(e) => setContactAddress(e.target.value)}
                     variant="bordered"
                     radius="sm"
                     labelPlacement="outside"
                     className="max-w-full"
                     startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                     }
                  />
               </motion.div>
               
               <motion.div variants={slideUp}>
                  <Select
                     label="Район"
                     placeholder="Выберите район"
                     selectedKeys={district ? [district] : []}
                     onChange={(e) => setDistrict(e.target.value)}
                     variant="bordered"
                     radius="sm"
                     labelPlacement="outside"
                     className="max-w-full"
                  >
                     <SelectItem key="Алмазарский район" value="Алмазарский район">Алмазарский район</SelectItem>
                     <SelectItem key="Бектемирский район" value="Бектемирский район">Бектемирский район</SelectItem>
                     <SelectItem key="Мирабадский район" value="Мирабадский район">Мирабадский район</SelectItem>
                     <SelectItem key="Мирзо-Улугбекский район" value="Мирзо-Улугбекский район">Мирзо-Улугбекский район</SelectItem>
                     <SelectItem key="Сергелийский район" value="Сергелийский район">Сергелийский район</SelectItem>
                     <SelectItem key="Учтепинский район" value="Учтепинский район">Учтепинский район</SelectItem>
                     <SelectItem key="Чиланзарский район" value="Чиланзарский район">Чиланзарский район</SelectItem>
                     <SelectItem key="Шайхантаурский район" value="Шайхантаурский район">Шайхантаурский район</SelectItem>
                     <SelectItem key="Юнусабадский район" value="Юнусабадский район">Юнусабадский район</SelectItem>
                     <SelectItem key="Яккасарайский район" value="Яккасарайский район">Яккасарайский район</SelectItem>
                     <SelectItem key="Яшнабадский район" value="Яшнабадский район">Яшнабадский район</SelectItem>
                  </Select>
               </motion.div>
               
               <motion.div variants={slideUp}>
                  <Textarea
                     label="Медицинская информация"
                     placeholder="Укажите важную медицинскую информацию (аллергии, хронические заболевания и т.д.)"
                     value={medicalInfo}
                     onChange={(e) => setMedicalInfo(e.target.value)}
                     variant="bordered"
                     radius="sm"
                     labelPlacement="outside"
                     minRows={3}
                     maxRows={5}
                     className="max-w-full"
                  />
               </motion.div>
               
               <motion.div 
                  variants={slideUp} 
                  className="flex justify-center space-x-3 pt-4"
               >
                  {profile && (
                     <Button
                        type="button"
                        color="default"
                        size="md"
                        radius="sm"
                        className="font-medium min-w-[140px]"
                        onClick={handleCancelEdit}
                     >
                        Отмена
                     </Button>
                  )}
                  <Button
                     type="submit"
                     color="primary"
                     size="md"
                     radius="sm"
                     className="font-medium min-w-[140px]"
                     isLoading={isLoading}
                     startContent={!isLoading && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                     )}
                  >
                     {isLoading ? 'Сохранение...' : 'Сохранить профиль'}
                  </Button>
               </motion.div>
            </motion.form>
         )}
         
         {/* Футер с настройками аккаунта */}
         {profile && (
            <motion.div 
               variants={slideUp} 
               className="mt-10"
            >
               <Divider className="my-5" />
               <h3 className="text-lg font-semibold text-gray-800 mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Настройки аккаунта</h3>
               
               <div className="grid gap-3">
                  {/* Кнопка смены пароля только для пользователей не из Google */}
                  {authProvider !== "google" && (
                     <Button
                        color="primary"
                        variant="light"
                        startContent={
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                           </svg>
                        }
                        onClick={() => setPasswordModalOpen(true)}
                        className="justify-start transform transition-transform hover:scale-105"
                     >
                        Сменить пароль
                     </Button>
                  )}
                  
                  {/* Кнопка настроек уведомлений */}
                  <Button
                     color="default"
                     variant="light"
                     startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                     }
                     onClick={() => setNotificationsModalOpen(true)}
                     className="justify-start transform transition-transform hover:scale-105"
                  >
                     Настройка уведомлений
                  </Button>
                  
                  {/* Кнопка удаления аккаунта */}
                  <Button
                     color="danger"
                     variant="light"
                     startContent={
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                     }
                     onClick={() => setDeleteAccountModalOpen(true)}
                     className="justify-start transform transition-transform hover:scale-105"
                  >
                     Удалить аккаунт
                  </Button>
               </div>
            </motion.div>
         )}
         
         {/* Модальное окно смены пароля */}
         <Modal isOpen={isPasswordModalOpen} onClose={() => !isChangingPassword && setPasswordModalOpen(false)}>
            <ModalContent>
               {(onClose) => (
                  <>
                     <ModalHeader className="flex flex-col gap-1">
                        <h2 className="text-xl font-semibold">Изменение пароля</h2>
                     </ModalHeader>
                     <ModalBody>
                        {passwordError && (
                           <div className="bg-red-50 p-3 rounded-lg mb-3 text-red-600 border border-red-200">
                              {passwordError}
                           </div>
                        )}
                        
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
                        />
                        
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
                        />
                        
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
                        />
                     </ModalBody>
                     <ModalFooter>
                        <Button color="default" variant="light" onClick={onClose} isDisabled={isChangingPassword}>
                           Отмена
                        </Button>
                        <Button 
                           color="primary" 
                           onClick={handleChangePassword} 
                           isLoading={isChangingPassword}
                           isDisabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 8}
                        >
                           Изменить пароль
                        </Button>
                     </ModalFooter>
                  </>
               )}
            </ModalContent>
         </Modal>
         
         {/* Модальное окно настроек уведомлений */}
         <Modal isOpen={isNotificationsModalOpen} onClose={() => !isLoadingNotificationSettings && setNotificationsModalOpen(false)}>
            <ModalContent>
               <ModalHeader>Настройки уведомлений</ModalHeader>
               <ModalBody>
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <div>
                           <h3 className="text-medium">Push-уведомления</h3>
                           <p className="text-small text-default-500">Получать уведомления в браузере</p>
                        </div>
                        <Switch 
                           isSelected={pushNotifications}
                           onValueChange={setPushNotifications}
                           color="primary"
                           isDisabled={isLoadingNotificationSettings}
                        />
                     </div>
                     
                     <div className="flex justify-between items-center">
                        <div>
                           <h3 className="text-medium">Напоминания о консультациях</h3>
                           <p className="text-small text-default-500">Получать напоминания о предстоящих консультациях</p>
                        </div>
                        <Switch 
                           isSelected={appointmentReminders}
                           onValueChange={setAppointmentReminders}
                           color="primary"
                           isDisabled={isLoadingNotificationSettings}
                        />
                     </div>
                  </div>
               </ModalBody>
               <ModalFooter>
                  <Button color="default" variant="light" onClick={() => setNotificationsModalOpen(false)} isDisabled={isLoadingNotificationSettings}>
                     Отмена
                  </Button>
                  <Button color="primary" onClick={handleNotificationsSave} isLoading={isLoadingNotificationSettings}>
                     Сохранить
                  </Button>
               </ModalFooter>
            </ModalContent>
         </Modal>
         
         {/* Модальное окно удаления аккаунта */}
         <Modal isOpen={isDeleteAccountModalOpen} onClose={() => setDeleteAccountModalOpen(false)}>
            <ModalContent>
               <ModalHeader className="flex flex-col gap-1">
                  <h2 className="text-xl text-danger">Удаление аккаунта</h2>
               </ModalHeader>
               <ModalBody>
                  <div className="bg-danger-50 p-4 rounded-lg text-danger mb-4">
                     <h3 className="font-medium mb-2">Внимание! Это действие необратимо.</h3>
                     <p>При удалении аккаунта:</p>
                     <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Вся информация вашего профиля будет удалена</li>
                        <li>История консультаций будет недоступна</li>
                        <li>Восстановление аккаунта будет невозможно</li>
                     </ul>
                  </div>
                  
                  <Input
                     type="text"
                     label="Для подтверждения введите 'удалить'"
                     placeholder="удалить"
                     variant="bordered"
                     id="delete-confirmation"
                  />
               </ModalBody>
               <ModalFooter>
                  <Button color="default" variant="light" onClick={() => setDeleteAccountModalOpen(false)}>
                     Отмена
                  </Button>
                  <Button 
                     color="danger" 
                     onClick={() => {
                        const confirmation = document.getElementById('delete-confirmation').value;
                        if (confirmation === 'удалить') {
                           handleDeleteAccount();
                        } else {
                           toast.error('Пожалуйста, введите слово "удалить" для подтверждения', {
                              position: 'top-right',
                              autoClose: 3000
                           });
                        }
                     }}
                  >
                     Удалить аккаунт
                  </Button>
               </ModalFooter>
            </ModalContent>
         </Modal>
      </motion.div>
   );
};

export { PatientProfileForm };