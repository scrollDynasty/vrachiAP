import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardBody, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Chip, Tabs, Tab, Spinner, Divider, Button, Avatar, Badge } from '@nextui-org/react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import api from '../api';

// Компонент страницы истории консультаций и платежей
function HistoryPage() {
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
                avatarData[doctorId] = `http://127.0.0.1:8000${response.data.avatar_path}`;
              }
            } catch (error) {
              console.error(`Ошибка загрузки данных о враче ${doctorId}:`, error);
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
                avatarData[patientId] = `http://127.0.0.1:8000${response.data.avatar_path}`;
              }
            } catch (error) {
              console.error(`Ошибка загрузки данных о пациенте ${patientId}:`, error);
              patientData[patientId] = { full_name: `Пациент #${patientId}` };
            }
          }
          
          setPatientProfiles(patientData);
          setUserAvatars(avatarData);
        }
        
        // Fetch unread messages - обновленный безопасный вызов с обработкой ошибок
        try {
          await fetchUnreadCounts();
        } catch (error) {
          console.warn('Не удалось загрузить непрочитанные сообщения, используем кэшированные данные:', error);
        }
        
      } catch (error) {
        console.error('Error fetching consultations:', error);
        setError('Не удалось загрузить историю консультаций. Пожалуйста, попробуйте позже.');
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
      case "completed": return "Завершена";
      case "active": return "Активна";
      case "pending": return "Ожидает";
      case "cancelled": return "Отменена";
      default: return "Неизвестно";
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
        : `Врач #${consultation.doctor_id}`;
    } else {
      const patientProfile = patientProfiles[consultation.patient_id];
      return patientProfile && patientProfile.full_name 
        ? patientProfile.full_name 
        : `Пациент #${consultation.patient_id}`;
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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">История</h1>
      
      <Tabs 
        selectedKey={activeTab}
        onSelectionChange={setActiveTab}
        variant="underlined"
        classNames={{
          tab: "py-2 px-4",
          tabContent: "group-data-[selected=true]:text-primary",
          cursor: "bg-primary",
          panel: "pt-3"
        }}
      >
        <Tab 
          key="consultations" 
          title="Консультации" 
          className="py-1 px-0"
        >
          <Card shadow="sm" className="mt-4">
            <CardHeader className="bg-gray-50 px-5 py-3">
              <h2 className="text-lg font-medium">История консультаций</h2>
            </CardHeader>
            <CardBody className="p-0">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Spinner size="lg" color="primary" />
                </div>
              ) : error ? (
                <div className="py-8 px-5 text-danger text-center">{error}</div>
              ) : consultations.length === 0 ? (
                <div className="py-8 px-5 text-center text-gray-500">
                  <p>У вас пока нет консультаций.</p>
                  {user.role === 'patient' && (
                    <Button 
                      color="primary" 
                      className="mt-4"
                      onPress={() => navigate('/search-doctors')}
                    >
                      Найти врача
                    </Button>
                  )}
                </div>
              ) : (
                <Table aria-label="История консультаций">
                  <TableHeader>
                    <TableColumn>{user.role === 'patient' ? 'Врач' : 'Пациент'}</TableColumn>
                    <TableColumn>Дата и время</TableColumn>
                    <TableColumn>Статус</TableColumn>
                    <TableColumn>Сообщения</TableColumn>
                    <TableColumn>Действия</TableColumn>
                  </TableHeader>
                  <TableBody items={consultations}>
                    {(item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar 
                              src={getUserAvatar(item)} 
                              fallback={
                                <div className="bg-primary text-white flex items-center justify-center h-full">
                                  {getParticipantName(item).charAt(0)}
                                </div>
                              }
                              size="sm"
                            />
                            <div>
                              <div className="font-medium">
                                {getParticipantName(item)}
                              </div>
                              {item.status === 'active' && (
                                <Badge variant="flat" color="success" size="sm">
                                  Активная сессия
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{formatDate(item.created_at)}</div>
                            <div className="text-sm text-gray-500">
                              {item.started_at ? formatTime(item.started_at) : 'Не начата'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Chip
                            color={getConsultationStatusColor(item.status)}
                            variant="flat"
                            size="sm"
                          >
                            {getConsultationStatusText(item.status)}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm flex flex-col">
                            <span>{item.message_count} / {item.message_limit}</span>
                            {item.message_count > 0 && item.status === 'active' && (
                              hasUnreadMessages(item.id) ? (
                                <Badge content={getUnreadCount(item.id)} color="danger" variant="flat" size="sm">
                                  <span className="text-xs text-success">Новые сообщения</span>
                                </Badge>
                              ) : (
                                <span className="text-xs text-success">Есть сообщения</span>
                              )
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button 
                            color="primary" 
                            size="sm" 
                            variant="light"
                            onPress={() => goToConsultation(item.id)}
                          >
                            {hasUnreadMessages(item.id) ? "Прочитать" : "Открыть"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Tab>
        <Tab key="payments" title="Платежи" className="py-1 px-0">
          <Card shadow="sm" className="mt-4">
            <CardHeader className="bg-gray-50 px-5 py-3">
              <h2 className="text-lg font-medium">История платежей</h2>
            </CardHeader>
            <CardBody className="px-5 py-8 text-center text-gray-500">
              {/* Заглушка пока не реализована история платежей */}
              <p>История платежей будет доступна в ближайшее время</p>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
}

export default HistoryPage; 