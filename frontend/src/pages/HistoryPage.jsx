import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Tabs, Tab, Spinner, Divider, Button, Avatar, Badge } from '@nextui-org/react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import api from '../api';
import { motion } from 'framer-motion';
import { useTranslation } from '../components/LanguageSelector.jsx';

// Компонент страницы истории консультаций и платежей
function HistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { unreadMessages, fetchUnreadCounts } = useChatStore();
  const [activeTab, setActiveTab] = useState("consultations");
  const [consultations, setConsultations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [doctorProfiles, setDoctorProfiles] = useState({});
  const [patientProfiles, setPatientProfiles] = useState({});
  const [userAvatars, setUserAvatars] = useState({});
  
  // Загружаем консультации при монтировании компонента или смене вкладки
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get('/api/consultations');
        setConsultations(response.data);
        
        // Собираем уникальные ID врачей и пациентов
        const doctorIds = new Set();
        const patientIds = new Set();
        
        response.data.forEach(consultation => {
          if (user.role === 'patient') {
            doctorIds.add(consultation.doctor_id);
          } else {
            patientIds.add(consultation.patient_id);
          }
        });
        
        // Загружаем данные о врачах, если пользователь - пациент
        if (user.role === 'patient' && doctorIds.size > 0) {
          const doctorData = {};
          const avatarData = {};
          
          for (const doctorId of doctorIds) {
            try {
              const response = await api.get(`/doctors/${doctorId}/profile`);
              doctorData[doctorId] = response.data;
              
              // Сохраняем путь к аватару
              if (response.data.avatar_path) {
                                    avatarData[doctorId] = `https://healzy.uz${response.data.avatar_path}`;
              }
            } catch (error) {
              doctorData[doctorId] = { full_name: `Врач #${doctorId}` };
            }
          }
          
          setDoctorProfiles(doctorData);
          setUserAvatars(avatarData);
        }
        
        // Загружаем данные о пациентах, если пользователь - врач
        if (user.role === 'doctor' && patientIds.size > 0) {
          const patientData = {};
          const avatarData = { ...userAvatars };
          
          for (const patientId of patientIds) {
            try {
              const response = await api.get(`/patients/${patientId}/profile`);
              patientData[patientId] = response.data;
              
              // Сохраняем путь к аватару
              if (response.data.avatar_path) {
                                    avatarData[patientId] = `https://healzy.uz${response.data.avatar_path}`;
              }
            } catch (error) {
              patientData[patientId] = { full_name: `${t('patient')} #${patientId}` };
            }
          }
          
          setPatientProfiles(patientData);
          setUserAvatars(avatarData);
        }
        
        // Fetch unread messages - обновленный безопасный вызов с обработкой ошибок
        try {
          await fetchUnreadCounts();
        } catch (error) {
          // Пропускаем ошибки загрузки непрочитанных сообщений
        }
        
      } catch (error) {
        setError(t('failedToLoadHistory'));
      } finally {
        setLoading(false);
      }
    };
    
    // Загружаем консультации, только если активна вкладка консультаций
    if (activeTab === "consultations") {
      fetchConsultations();
    }
  }, [activeTab, user.role]);
  
  // Функция для получения цвета статуса консультации
  const getConsultationStatusColor = (status) => {
    switch(status) {
      case "completed": return "success";
      case "active": return "warning";
      case "pending": return "primary";
      case "cancelled": return "danger";
      default: return "default";
    }
  };
  
  // Функция для получения текста статуса консультации
  const getConsultationStatusText = (status) => {
    switch(status) {
      case "completed": return t('completed');
      case "active": return t('active');
      case "pending": return t('pending');
      case "cancelled": return t('cancelled');
      default: return t('unknown');
    }
  };
  
  // Функция для получения градиента статуса консультации
  const getStatusGradient = (status) => {
    switch(status) {
      case "completed": return "from-green-500 to-emerald-600";
      case "active": return "from-yellow-500 to-amber-600";
      case "pending": return "from-blue-500 to-indigo-600";
      case "cancelled": return "from-red-500 to-rose-600";
      default: return "from-gray-500 to-gray-600";
    }
  };
  
  // Форматирование даты для отображения
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };
  
  // Форматирование времени
  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString('ru-RU', options);
  };
  
  // Переход к консультации
  const goToConsultation = (consultationId) => {
    navigate(`/consultations/${consultationId}`);
  };
  
  // Получение имени врача или пациента для отображения
  const getParticipantName = (consultation) => {
    if (user.role === 'patient') {
      const doctorProfile = doctorProfiles[consultation.doctor_id];
      return doctorProfile && doctorProfile.full_name 
        ? doctorProfile.full_name 
        : `${t('doctor')} #${consultation.doctor_id}`;
    } else {
      const patientProfile = patientProfiles[consultation.patient_id];
      return patientProfile && patientProfile.full_name 
        ? patientProfile.full_name 
        : `${t('patient')} #${consultation.patient_id}`;
    }
  };
  
  // Получение аватара пользователя
  const getUserAvatar = (consultation) => {
    if (user.role === 'patient') {
      return userAvatars[consultation.doctor_id];
    } else {
      return userAvatars[consultation.patient_id];
    }
  };
  
  // Проверка на наличие непрочитанных сообщений
  const hasUnreadMessages = (consultationId) => {
    return unreadMessages[consultationId] && unreadMessages[consultationId] > 0;
  };
  
  // Получение количества непрочитанных сообщений
  const getUnreadCount = (consultationId) => {
    return unreadMessages[consultationId] || 0;
  };
  
  // Компонент карточки консультации
  const ConsultationCard = ({ consultation, index }) => {
    const statusGradient = getStatusGradient(consultation.status);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
        whileHover={{ y: -5, scale: 1.01 }}
        className="mb-3 sm:mb-4"
      >
        <Card 
          shadow="sm" 
          className="overflow-hidden border border-gray-100 hover:shadow-md transition-all"
          isPressable
          onPress={() => goToConsultation(consultation.id)}
        >
          {/* Цветная полоса статуса сверху */}
          <div className={`h-1 sm:h-1.5 bg-gradient-to-r ${statusGradient} w-full`}></div>
          
          <CardBody className="p-0">
            {/* Мобильная версия - одна колонка во всю ширину */}
            <div className="block lg:hidden">
              <div className="p-4 space-y-4">
                {/* Информация о враче/пациенте */}
                <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
                  <Avatar 
                    src={getUserAvatar(consultation)} 
                    fallback={
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center h-full">
                        {getParticipantName(consultation).charAt(0)}
                      </div>
                    }
                    size="lg"
                    className="border-2 border-white shadow-sm flex-shrink-0"
                  />
                  <div className="flex-grow min-w-0">
                    <div className="font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 break-words">
                      {getParticipantName(consultation)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {user.role === 'patient' ? t('doctor') : t('patient')}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${statusGradient} text-white text-sm font-medium shadow-sm`}>
                    {getConsultationStatusText(consultation.status)}
                  </div>
                </div>

                {/* Детали консультации */}
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-sm text-gray-600">{t('creationDate')}:</div>
                    <div className="font-medium text-sm">{formatDate(consultation.created_at)}</div>
                  </div>
                  {consultation.started_at && (
                    <div>
                      <div className="text-sm text-gray-600">{t('startTime')}:</div>
                      <div className="font-medium text-sm">{formatTime(consultation.started_at)}</div>
                    </div>
                  )}
                </div>

                {/* Сообщения и кнопка */}
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-2">{t('messages')}:</div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                        {consultation.message_count} / {consultation.message_limit}
                      </div>
                      {consultation.message_count > 0 && consultation.status === 'active' && (
                        hasUnreadMessages(consultation.id) ? (
                          <Badge content={getUnreadCount(consultation.id)} color="danger" variant="flat" size="sm">
                            <span className="text-xs text-danger font-medium">{t('newMessages')}</span>
                          </Badge>
                        ) : (
                          <span className="text-xs text-success font-medium">{t('hasMessages')}</span>
                        )
                      )}
                    </div>
                  </div>
                  
                  <div 
                    className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm text-white px-4 py-3 rounded-full flex items-center justify-center gap-2 cursor-pointer hover:shadow-md transition-all text-base font-medium"
                    onClick={() => goToConsultation(consultation.id)}
                  >
                    <span>{hasUnreadMessages(consultation.id) ? t('readChat') : t('openChat')}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Десктопная версия - две колонки */}
            <div className="hidden lg:flex lg:flex-row">
              {/* Левая колонка с информацией о собеседнике */}
              <div className="lg:w-1/3 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col justify-center items-start">
                <div className="flex flex-row items-start gap-3 mb-3 w-full">
                  <Avatar 
                    src={getUserAvatar(consultation)} 
                    fallback={
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center h-full">
                        {getParticipantName(consultation).charAt(0)}
                      </div>
                    }
                    size="lg"
                    className="border-2 border-white shadow-sm flex-shrink-0"
                  />
                  <div className="text-left flex-grow min-w-0">
                    <div className="font-semibold text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 break-words">
                      {getParticipantName(consultation)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {user.role === 'patient' ? t('doctor') : t('patient')}
                    </div>
                  </div>
                </div>
                
                <Divider className="my-3 bg-gradient-to-r from-transparent via-indigo-200 to-transparent w-full" />
                
                <div className="flex flex-col items-start">
                  <div className="text-sm text-gray-600">{t('status')}:</div>
                  <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${statusGradient} text-white text-sm font-medium shadow-sm mt-1`}>
                    {getConsultationStatusText(consultation.status)}
                  </div>
                </div>
              </div>
              
              {/* Правая колонка с деталями и действиями */}
              <div className="lg:w-2/3 p-4">
                <div className="flex flex-col h-full">
                  <div className="flex flex-row justify-between mb-3">
                    <div className="text-left">
                      <div className="text-sm text-gray-600">{t('creationDate')}:</div>
                      <div className="font-medium">{formatDate(consultation.created_at)}</div>
                    </div>
                    
                    {consultation.started_at && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600">{t('startTime')}:</div>
                        <div className="font-medium">{formatTime(consultation.started_at)}</div>
                      </div>
                    )}
                  </div>
                  
                  <Divider className="my-3" />
                  
                  <div className="flex-grow">
                    <div className="flex flex-row justify-between items-center">
                      <div className="text-left">
                        <div className="text-sm text-gray-600 mb-1">{t('messages')}:</div>
                        <div className="flex items-center gap-2">
                          <div className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                            {consultation.message_count} / {consultation.message_limit}
                          </div>
                          
                          {consultation.message_count > 0 && consultation.status === 'active' && (
                            hasUnreadMessages(consultation.id) ? (
                              <Badge content={getUnreadCount(consultation.id)} color="danger" variant="flat" size="sm">
                                <span className="text-xs text-danger font-medium">{t('newMessages')}</span>
                              </Badge>
                            ) : (
                              <span className="text-xs text-success font-medium">{t('hasMessages')}</span>
                            )
                          )}
                        </div>
                      </div>
                      
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm text-white px-4 py-2 rounded-full flex items-center gap-2 cursor-pointer hover:shadow-md transition-all"
                        onClick={() => goToConsultation(consultation.id)}
                      >
                        <span>{hasUnreadMessages(consultation.id) ? t('readChat') : t('openChat')}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </motion.div>
    );
  };
  
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
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-70 pointer-events-none">
        <motion.div 
          className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-gradient-to-r from-blue-300/20 to-indigo-300/20"
          animate={{
            y: [0, 20, 0],
            scale: [1, 1.05, 1],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute bottom-20 right-[10%] w-80 h-80 rounded-full bg-gradient-to-r from-purple-300/20 to-indigo-300/20"
          animate={{
            y: [0, -25, 0],
            scale: [1, 1.05, 1],
            rotate: [0, -5, 0, 5, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 relative z-10">
        <motion.h1 
          className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 text-center sm:text-left"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {t('consultationHistory')}
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Tabs 
            selectedKey={activeTab}
            onSelectionChange={setActiveTab}
            variant="underlined"
            className="w-full"
            classNames={{
              tab: "py-2 px-3 sm:px-6 text-sm sm:text-base",
              tabContent: "group-data-[selected=true]:text-primary font-medium",
              cursor: "bg-gradient-to-r from-blue-500 to-indigo-600",
              panel: "pt-4 sm:pt-6",
              tabList: "w-full justify-center sm:justify-start"
            }}
          >
            <Tab 
              key="consultations" 
              title={t('consultations')} 
              className="py-1 px-0"
            >
              <Card shadow="sm" className="mt-2 sm:mt-4 border border-gray-100 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 sm:px-4 py-3 sm:py-4">
                  <h2 className="text-base sm:text-lg font-medium">{t('history')}</h2>
                </CardHeader>
                <CardBody className="p-2 sm:p-4">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Spinner size="lg" color="primary" />
                    </div>
                  ) : error ? (
                    <motion.div 
                      className="py-8 px-5 text-danger text-center bg-danger-50 rounded-lg border border-danger-100"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-4 text-danger" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-lg font-medium">{error}</p>
                    </motion.div>
                  ) : consultations.length === 0 ? (
                    <motion.div 
                      className="py-8 sm:py-12 px-3 sm:px-5 text-center"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <p className="text-lg sm:text-xl text-gray-500 font-medium mb-4">{t('noConsultationsYet')}</p>
                      {user.role === 'patient' && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3, duration: 0.5 }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Button 
                            color="primary" 
                            className="mt-4 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md px-4 sm:px-6 py-3 sm:py-6 text-sm sm:text-base"
                            onPress={() => navigate('/search-doctors')}
                            size="lg"
                            radius="full"
                          >
                            {t('findDoctor')}
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="space-y-4">
                      {consultations.map((consultation, index) => (
                        <ConsultationCard 
                          key={consultation.id} 
                          consultation={consultation}
                          index={index}
                        />
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </Tab>
            <Tab key="payments" title={t('payments')} className="py-1 px-0">
              <Card shadow="sm" className="mt-2 sm:mt-4 border border-gray-100 overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 sm:px-4 py-3 sm:py-4">
                  <h2 className="text-base sm:text-lg font-medium">{t('paymentHistory')}</h2>
                </CardHeader>
                <CardBody className="p-4 sm:p-8">
                  <motion.div 
                    className="text-center text-gray-500 py-8 sm:py-12"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-lg sm:text-xl font-medium mb-2">{t('paymentHistoryComingSoon')}</p>
                    <p className="text-gray-400 text-sm sm:text-base">{t('workingOnFeature')}</p>
                  </motion.div>
                </CardBody>
              </Card>
            </Tab>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}

export default HistoryPage; 