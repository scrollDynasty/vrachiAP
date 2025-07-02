import React, { useState, useEffect } from 'react';
import api from '../api';
import { 
  Card, CardBody, CardHeader, Spinner, Button, 
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Pagination, Chip, useDisclosure, Tabs, Tab, Input, Select, SelectItem, Textarea,
  RadioGroup, Radio
} from '@nextui-org/react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@nextui-org/react';
import useAuthStore from '../stores/authStore';
import notificationService from '../services/notificationService';
import { useTranslation } from '../components/LanguageSelector.jsx';
import { getRegions, getDistrictsByRegion } from '../constants/uzbekistanRegions';
import { translateRegion, translateDistrict, getDistrictNameById } from '../components/RegionTranslations';
import NewsForm from '../components/NewsForm';

// Импортируем API_BASE_URL для использования в путях к файлам
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://healzy.uz';

function AdminPage() {
  const { t } = useTranslation();
  // Состояние для заявок докторов
  const [applications, setApplications] = useState([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('pending');
  
  // Состояние для пользователей
  const [users, setUsers] = useState([]);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userProfileLoading, setUserProfileLoading] = useState(false);
  const [newRole, setNewRole] = useState("");
  
  // Состояния для редактирования профиля
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState({});
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Состояние для просмотра деталей заявки
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [adminComment, setAdminComment] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // Состояние для модальных окон подтверждения действий
  const [confirmAction, setConfirmAction] = useState(null); // 'approve' или 'reject'
  const { 
    isOpen: isConfirmModalOpen, 
    onOpen: onConfirmModalOpen, 
    onClose: onConfirmModalClose 
  } = useDisclosure();
  
  // Модальное окно для профиля пользователя
  const { 
    isOpen: isUserModalOpen, 
    onOpen: onUserModalOpen, 
    onClose: onUserModalClose 
  } = useDisclosure();
  
  // Текущая вкладка
  const [activeTab, setActiveTab] = useState('applications');
  
  // Данные пользователя из стора
  const { user } = useAuthStore();
  
  // Добавляем состояния для общего количества пользователей и страниц
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalUsersPages, setTotalUsersPages] = useState(1);
  
  // Состояние для push-уведомлений
  const [notificationTitle, setNotificationTitle] = useState("");
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationType, setNotificationType] = useState("system");
  const [notificationTarget, setNotificationTarget] = useState("all");
  const [selectedRoleForNotification, setSelectedRoleForNotification] = useState("all");
  const [specificUserId, setSpecificUserId] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [notificationResult, setNotificationResult] = useState(null);
  
  // Состояние для статуса браузерных уведомлений
  const [notificationStatus, setNotificationStatus] = useState(null);
  
  // Состояние для новостей
  const [news, setNews] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState(null);
  const [newsPage, setNewsPage] = useState(1);
  const [totalNews, setTotalNews] = useState(0);
  const [totalNewsPages, setTotalNewsPages] = useState(1);
  const [newsCategory, setNewsCategory] = useState('');
  const [newsPublishedOnly, setNewsPublishedOnly] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [isCreatingNews, setIsCreatingNews] = useState(false);
  const [isEditingNews, setIsEditingNews] = useState(false);
  
  // Модальные окна для новостей
  const { 
    isOpen: isNewsModalOpen, 
    onOpen: onNewsModalOpen, 
    onClose: onNewsModalClose 
  } = useDisclosure();
  
  const { 
    isOpen: isNewsFormModalOpen, 
    onOpen: onNewsFormModalOpen, 
    onClose: onNewsFormModalClose 
  } = useDisclosure();
  
  // Загружаем пользователей при первом переключении на вкладку
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    }
  }, [usersPage, activeTab]);
  
  // Загружаем заявки при первом переключении на вкладку
  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    }
  }, [page, selectedStatus, activeTab]);
  
  // Проверяем статус браузерных уведомлений при загрузке
  useEffect(() => {
    if (activeTab === 'notifications') {
      const status = notificationService.getStatus();
      setNotificationStatus(status);
    }
  }, [activeTab]);
  
  // Загружаем новости при переключении на вкладку новостей
  useEffect(() => {
    if (activeTab === 'news') {
      fetchNews();
    }
  }, [newsPage, newsCategory, newsPublishedOnly, activeTab]);
  
  // Функция для тестирования браузерных уведомлений
  const testBrowserNotification = async () => {
    const success = await notificationService.send(
      "Тестовое уведомление",
      {
        body: "Это тестовое браузерное уведомление из админ панели",
        icon: '/favicon.ico?v=2',
        tag: 'admin-test',
        requireInteraction: false,
        duration: 5000
      }
    );
    
    if (success) {
      setNotificationResult({
        success: true,
        message: "Тестовое браузерное уведомление отправлено успешно!"
      });
    } else {
      setNotificationResult({
        success: false,
        message: "Не удалось отправить браузерное уведомление. Проверьте разрешения."
      });
    }
  };
  
  // Функция для запроса разрешений на уведомления
  const requestNotificationPermission = async () => {
    const permission = await notificationService.requestPermission();
    const status = notificationService.getStatus();
    setNotificationStatus(status);
    
    if (permission === 'granted') {
      setNotificationResult({
        success: true,
        message: "Разрешение на браузерные уведомления получено!"
      });
    } else {
      setNotificationResult({
        success: false,
        message: "Разрешение на браузерные уведомления не предоставлено."
      });
    }
  };
  
  // Функция для загрузки заявок
  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/admin/doctor-applications?page=${page}&size=10&status=${selectedStatus}`);
      
      setApplications(response.data.items || response.data);
      setTotalApplications(response.data.total || response.data.length);
      setLoading(false);
    } catch (err) {
      // Ошибка при загрузке заявок
      setError('Ошибка при загрузке заявок. Пожалуйста, проверьте подключение к серверу или обратитесь к администратору.');
      setLoading(false);
    }
  };
  
  // Функция для загрузки пользователей
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      
      // Получаем список пользователей
      const response = await api.get(`/admin/users?page=${usersPage}&size=10`);
      
      // Получаем базовые данные пользователей
      const usersData = response.data.items || response.data;
      
      // Устанавливаем полученные данные
      setUsers(usersData);
      setTotalUsers(response.data.total || response.data.length);
      setTotalUsersPages(response.data.pages || Math.ceil(response.data.length / 10));
      
      setUsersLoading(false);
    } catch (err) {
      // Ошибка при загрузке пользователей
      setUsersError('Ошибка при загрузке пользователей. Пожалуйста, проверьте подключение к серверу или обратитесь к администратору.');
      setUsersLoading(false);
    }
  };
  
  // Функция для загрузки профиля пользователя
  const fetchUserProfile = async (userId) => {
    try {
      setUserProfileLoading(true);
      
      // Запрашиваем только профиль пользователя без второго запроса
      const response = await api.get(`/admin/users/${userId}/profile`);
      
      
      setUserProfile(response.data);
      setUserProfileLoading(false);
    } catch (err) {
      // Ошибка при загрузке профиля пользователя
      setUserProfile({ message: 'Ошибка при загрузке профиля пользователя. Пожалуйста, попробуйте позже.' });
      setUserProfileLoading(false);
    }
  };
  
  // Функция для обработки заявки
  const processApplication = async (id, status, comment = '') => {
    try {
      setLoading(true);
      await api.put(`/admin/doctor-applications/${id}`, {
        status,
        admin_comment: comment
      });
      
      // Обновляем список заявок
      fetchApplications();
      onClose(); // Закрываем модальное окно деталей
      onConfirmModalClose(); // Закрываем модальное окно подтверждения
    } catch (err) {
      // Ошибка при обработке заявки
      setError('Ошибка при обработке заявки. Пожалуйста, попробуйте позже.');
      setLoading(false);
    }
  };
  
  // Обработчик подтверждения одобрения/отклонения заявки
  const handleConfirmAction = () => {
    if (confirmAction === 'approve') {
      processApplication(selectedApplication.id, 'approved', adminComment);
    } else if (confirmAction === 'reject') {
      if (!adminComment.trim()) {
        setError('Пожалуйста, укажите причину отклонения заявки');
        return; // Не закрываем модальное окно и не вызываем processApplication
      }
      processApplication(selectedApplication.id, 'rejected', adminComment);
    }
  };
  
  // Функция для открытия диалога подтверждения
  const showConfirmation = (action) => {
    setConfirmAction(action);
    
    // Если действие - отклонить, и комментарий не введен, показываем предупреждение
    if (action === 'reject' && !adminComment.trim()) {
      setError('Пожалуйста, укажите причину отклонения заявки в поле комментария');
      return; // Не открываем модальное окно
    }
    
    // Сбрасываем ошибку перед открытием модального окна
    setError(null);
    onConfirmModalOpen();
  };
  
  // Функция для просмотра деталей заявки
  const viewApplicationDetails = (application) => {
    setSelectedApplication(application);
    setAdminComment('');
    setError(null); // Сбрасываем ошибку при открытии деталей
    onOpen();
  };
  
  // Функция для просмотра профиля пользователя
  const viewUserProfile = (user) => {
    setSelectedUser(user);
    // Загружаем профиль пользователя
    fetchUserProfile(user.id);
    // Устанавливаем текущую роль
    setNewRole(user.role);
    onUserModalOpen();
  };
  
  // Функция для изменения роли пользователя
  const changeUserRole = async () => {
    if (!selectedUser || selectedUser.role === newRole) return;
    
    try {
      setUsersLoading(true);
      
      // Сохраняем данные о профиле до изменения
      const oldProfile = { ...userProfile };
      
      await api.put(`/admin/users/${selectedUser.id}/role`, { role: newRole });
      
      // Обновляем список пользователей
      fetchUsers();
      
      // Обновляем данные в текущем окне
      setSelectedUser(prev => ({ ...prev, role: newRole }));
      
      // Если меняем роль с пациента на врача, нужно обеспечить копирование данных профиля
      if (selectedUser.role === 'patient' && newRole === 'doctor') {
        // После изменения роли профиль уже должен обновиться автоматически на бэкенде
        // Но мы можем дополнительно запросить обновленный профиль пользователя
        setTimeout(() => {
          fetchUserProfile(selectedUser.id);
        }, 1000);
      }
      
      onUserModalClose(); // Закрываем модальное окно
    } catch (err) {
      // Ошибка при изменении роли пользователя
      setUsersError('Ошибка при изменении роли пользователя. Пожалуйста, попробуйте позже.');
      setUsersLoading(false);
    }
  };
  
  // Функция для начала редактирования профиля
  const startEditingProfile = () => {
    setEditedProfile({...userProfile});
    setIsEditingProfile(true);
  };
  
  // Функция для отмены редактирования профиля
  const cancelEditingProfile = () => {
    setEditedProfile({});
    setIsEditingProfile(false);
  };
  
  // Функция для сохранения изменений профиля
  const saveProfileChanges = async () => {
    if (!selectedUser || !editedProfile) return;
    
    try {
      setIsSavingProfile(true);
      
      // Отправляем обновленные данные профиля
      await api.put(`/admin/users/${selectedUser.id}/profile`, editedProfile);
      
      // Обновляем локальные данные
      setUserProfile(editedProfile);
      
      // Выходим из режима редактирования
      setIsEditingProfile(false);
      setEditedProfile({});
      
      // Обновляем список пользователей
      fetchUsers();
      
      setIsSavingProfile(false);
    } catch (err) {
      // Ошибка при сохранении изменений профиля
      setUsersError('Ошибка при сохранении изменений профиля. Пожалуйста, попробуйте позже.');
      setIsSavingProfile(false);
    }
  };
  
  // Функция для обновления поля в редактируемом профиле
  const updateProfileField = (field, value) => {
    setEditedProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Функция для отображения статуса заявки
  const renderStatus = (status) => {
    switch (status) {
      case 'pending':
        return <Chip color="warning">Ожидает</Chip>;
      case 'approved':
        return <Chip color="success">Одобрено</Chip>;
      case 'rejected':
        return <Chip color="danger">Отклонено</Chip>;
      default:
        return <Chip>{status}</Chip>;
    }
  };
  
  // Функция для форматирования даты
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  // Функция для отображения роли пользователя
  const renderUserRole = (role) => {
    switch (role) {
      case 'admin':
        return <Chip color="secondary">Администратор</Chip>;
      case 'doctor':
        return <Chip color="primary">Врач</Chip>;
      case 'patient':
        return <Chip color="success">Пациент</Chip>;
      default:
        return <Chip>{role}</Chip>;
    }
  };
  
  // Функция рендера таблицы пользователей с информацией, которая доступна из API
  const renderUsersTable = () => {
    return (
      <Table
        aria-label="Таблица пользователей"
        shadow="sm"
        selectionMode="none"
        color="primary"
        isHeaderSticky
        classNames={{
          base: "max-h-[70vh]",
          table: "min-h-[400px]",
        }}
      >
        <TableHeader>
          <TableColumn>ID</TableColumn>
          <TableColumn>Email</TableColumn>
          <TableColumn>Роль</TableColumn>
          <TableColumn>Активен</TableColumn>
          <TableColumn>Имя</TableColumn>
          <TableColumn>Телефон</TableColumn>
          <TableColumn>Район</TableColumn>
          <TableColumn>Дата регистрации</TableColumn>
          <TableColumn width={130}>Действия</TableColumn>
        </TableHeader>
        <TableBody
          items={users}
          isLoading={usersLoading}
          loadingContent={<Spinner label="Загрузка пользователей..." />}
          emptyContent="Пользователи не найдены"
        >
          {(user) => (
            <TableRow key={user.id}>
              <TableCell>{user.id}</TableCell>
              <TableCell>{user.email || "-"}</TableCell>
              <TableCell>{renderUserRole(user.role)}</TableCell>
              <TableCell>
                <Chip color={user.is_active ? "success" : "danger"} variant="flat">
                  {user.is_active ? "Да" : "Нет"}
                </Chip>
              </TableCell>
              <TableCell>{user.full_name || "-"}</TableCell>
              <TableCell>{user.contact_phone || "-"}</TableCell>
              <TableCell>{user.district ? getDistrictNameById(user.district, user.city, 'ru') : "-"}</TableCell>
              <TableCell>{formatDate(user.created_at) || "-"}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onPress={() => viewUserProfile(user)}
                  >
                    {t('moreDetails')}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };
  
  // Обновляем рендер компонента Pagination в секции пользователей, чтобы использовать реальные данные
  const renderUsersPagination = () => {
    return (
      <div className="flex justify-between items-center mt-4">
        <span className="text-gray-500 text-sm">
          Всего: {totalUsers} пользователей
        </span>
        <Pagination
          showControls
          total={totalUsersPages}
          initialPage={usersPage}
          page={usersPage}
          onChange={setUsersPage}
        />
      </div>
    );
  };
  
  // Функция для отправки push-уведомления
  const sendPushNotification = async () => {
    if (!notificationTitle.trim() || !notificationMessage.trim()) {
      setNotificationResult({
        success: false,
        message: "Заголовок и текст уведомления обязательны для заполнения."
      });
      return;
    }
    
    try {
      setIsSendingNotification(true);
      setNotificationResult(null);
      
      // Формируем данные для отправки уведомления
      const notificationData = {
        title: notificationTitle,
        message: notificationMessage,
        type: notificationType,
        target_type: notificationTarget,
        role: selectedRoleForNotification !== "all" ? selectedRoleForNotification : undefined,
        user_id: notificationTarget === "user" ? parseInt(specificUserId) : undefined
      };
      
      
      // Отправляем уведомление напрямую через POST запрос к API
      const response = await api.post('/admin/notifications/send', notificationData);
      
      
      // Формируем сообщение об успехе
      let successMessage = "Уведомление успешно отправлено";
      
      if (notificationTarget === "all") {
        successMessage += " всем пользователям";
      } else if (notificationTarget === "role") {
        successMessage += ` пользователям с ролью "${selectedRoleForNotification}"`;
      } else if (notificationTarget === "user") {
        successMessage += ` пользователю с ID ${specificUserId}`;
      }
      
      setNotificationResult({
        success: true,
        message: successMessage
      });
      
      // Очистка формы после отправки
      setNotificationTitle("");
      setNotificationMessage("");
      
    } catch (error) {
      // Ошибка при отправке уведомления
      
      setNotificationResult({
        success: false,
        message: `Ошибка при отправке уведомления: ${error.response?.data?.detail || error.message}`
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  // Функции для работы с новостями
  const fetchNews = async () => {
    try {
      setNewsLoading(true);
      setNewsError(null);
      
      const params = new URLSearchParams({
        page: newsPage.toString(),
        size: '10',
        ...(newsCategory && { category: newsCategory }),
        ...(newsPublishedOnly && { published_only: 'true' })
      });
      
      const response = await api.get(`/api/news?${params}`);
      
      setNews(response.data.items || []);
      setTotalNews(response.data.total || 0);
      setTotalNewsPages(response.data.pages || 1);
    } catch (error) {
      console.error('Ошибка загрузки новостей:', error);
      setNewsError('Ошибка при загрузке новостей');
    } finally {
      setNewsLoading(false);
    }
  };

  const createNews = () => {
    setSelectedNews(null);
    setIsCreatingNews(true);
    setIsEditingNews(false);
    onNewsFormModalOpen();
  };

  const editNews = (newsItem) => {
    setSelectedNews(newsItem);
    setIsCreatingNews(false);
    setIsEditingNews(true);
    onNewsFormModalOpen();
  };

  const viewNews = (newsItem) => {
    setSelectedNews(newsItem);
    onNewsModalOpen();
  };

  const deleteNews = async (newsId) => {
    if (!confirm('Вы уверены, что хотите удалить эту новость?')) return;
    
    try {
      await api.delete(`/api/news/${newsId}`);
      fetchNews(); // Обновляем список
    } catch (error) {
      console.error('Ошибка удаления новости:', error);
      alert('Ошибка при удалении новости');
    }
  };

  const toggleNewsPublished = async (newsId) => {
    try {
      await api.post(`/api/news/${newsId}/toggle-publish`);
      fetchNews(); // Обновляем список
    } catch (error) {
      console.error('Ошибка изменения статуса публикации:', error);
      alert('Ошибка при изменении статуса публикации');
    }
  };

  const toggleNewsFeatured = async (newsId) => {
    try {
      await api.post(`/api/news/${newsId}/toggle-featured`);
      fetchNews(); // Обновляем список
    } catch (error) {
      console.error('Ошибка изменения статуса рекомендуемой:', error);
      alert('Ошибка при изменении статуса рекомендуемой');
    }
  };

  const formatNewsDate = (dateString) => {
    if (!dateString) return 'Не указано';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderNewsTable = () => {
    return (
      <Table aria-label="Список новостей">
        <TableHeader>
          <TableColumn>ID</TableColumn>
          <TableColumn>Заголовок</TableColumn>
          <TableColumn>Категория</TableColumn>
          <TableColumn>Статус</TableColumn>
          <TableColumn>Рекомендуемая</TableColumn>
          <TableColumn>Дата создания</TableColumn>
          <TableColumn>Действия</TableColumn>
        </TableHeader>
        <TableBody>
          {news.map((newsItem) => (
            <TableRow key={newsItem.id}>
              <TableCell>{newsItem.id}</TableCell>
              <TableCell className="max-w-xs">
                <div className="truncate" title={newsItem.title}>
                  {newsItem.title}
                </div>
              </TableCell>
              <TableCell>{newsItem.category}</TableCell>
              <TableCell>
                <Chip 
                  color={newsItem.is_published ? "success" : "warning"} 
                  variant="flat"
                  size="sm"
                >
                  {newsItem.is_published ? "Опубликована" : "Черновик"}
                </Chip>
              </TableCell>
              <TableCell>
                <Chip 
                  color={newsItem.is_featured ? "primary" : "default"} 
                  variant="flat"
                  size="sm"
                >
                  {newsItem.is_featured ? "Да" : "Нет"}
                </Chip>
              </TableCell>
              <TableCell>{formatNewsDate(newsItem.created_at)}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    color="primary" 
                    variant="flat"
                    onPress={() => viewNews(newsItem)}
                  >
                    Просмотр
                  </Button>
                  <Button 
                    size="sm" 
                    color="secondary" 
                    variant="flat"
                    onPress={() => editNews(newsItem)}
                  >
                    Редактировать
                  </Button>
                  <Button 
                    size="sm" 
                    color={newsItem.is_published ? "warning" : "success"} 
                    variant="flat"
                    onPress={() => toggleNewsPublished(newsItem.id)}
                  >
                    {newsItem.is_published ? "Снять с публикации" : "Опубликовать"}
                  </Button>
                  <Button 
                    size="sm" 
                    color="danger" 
                    variant="flat"
                    onPress={() => deleteNews(newsItem.id)}
                  >
                    Удалить
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderNewsPagination = () => {
    return (
      <div className="flex justify-between items-center mt-4">
        <span className="text-gray-500 text-sm">
          Всего: {totalNews} новостей
        </span>
        <Pagination
          showControls
          total={totalNewsPages}
          initialPage={newsPage}
          page={newsPage}
          onChange={setNewsPage}
        />
      </div>
    );
  };

  return (
    <div className="py-12 px-6 sm:px-8 lg:px-10 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-[calc(100vh-100px)]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-3">
            {t('adminPanelTitle')}
          </h1>
          <p className="text-gray-600">{t('systemUserManagement')}</p>
        </div>
        
        <Card className="shadow-lg border-none overflow-hidden mb-10">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          <CardHeader className="flex justify-between items-center gap-3 p-6 bg-gradient-to-b from-indigo-50 to-transparent">
            <div>
              <h2 className="text-xl font-semibold">{t('administrativePanel')}</h2>
              <p className="text-sm text-gray-500">
                {t('account')} {user?.email} | <span className="text-purple-600 font-semibold">Роль: Администратор</span>
              </p>
            </div>
            <div>
              <Chip color="secondary" variant="flat" className="font-semibold">
                {t('adminPanelTitle')}
              </Chip>
            </div>
          </CardHeader>
          
          <CardBody className="p-0">
            <Tabs 
              selectedKey={activeTab} 
              onSelectionChange={setActiveTab}
              className="p-4"
            >
              <Tab key="applications" title="{t('doctorApplications')}">
                <div className="px-6 py-4 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{t('doctorRoleApplications')}</h3>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={selectedStatus === 'pending' ? 'solid' : 'flat'} 
                        color={selectedStatus === 'pending' ? 'warning' : 'default'}
                        onClick={() => setSelectedStatus('pending')}
                      >
                        Ожидающие
                      </Button>
                      <Button 
                        size="sm" 
                        variant={selectedStatus === 'approved' ? 'solid' : 'flat'} 
                        color={selectedStatus === 'approved' ? 'success' : 'default'}
                        onClick={() => setSelectedStatus('approved')}
                      >
                        Одобренные
                      </Button>
                      <Button 
                        size="sm" 
                        variant={selectedStatus === 'rejected' ? 'solid' : 'flat'} 
                        color={selectedStatus === 'rejected' ? 'danger' : 'default'}
                        onClick={() => setSelectedStatus('rejected')}
                      >
                        Отклоненные
                      </Button>
                      <Button 
                        size="sm" 
                        variant={selectedStatus === '' ? 'solid' : 'flat'} 
                        color={selectedStatus === '' ? 'primary' : 'default'}
                        onClick={() => setSelectedStatus('')}
                      >
                        Все
                      </Button>
                    </div>
                  </div>
                
                  {loading ? (
                    <div className="flex justify-center items-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : error ? (
                    <div className="bg-danger-50 text-danger p-4 rounded-lg">
                      {error}
                    </div>
                  ) : applications.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Нет заявок с выбранным статусом
                    </div>
                  ) : (
                    <>
                      <Table aria-label="Список заявок на роль врача">
                        <TableHeader>
                          <TableColumn>ID</TableColumn>
                          <TableColumn>ФИО</TableColumn>
                          <TableColumn>Специализация</TableColumn>
                          <TableColumn>Дата подачи</TableColumn>
                          <TableColumn>Статус</TableColumn>
                          <TableColumn>Действия</TableColumn>
                        </TableHeader>
                        <TableBody>
                          {applications.map((app) => (
                            <TableRow key={app.id}>
                              <TableCell>{app.id}</TableCell>
                              <TableCell>{app.full_name}</TableCell>
                              <TableCell>{app.specialization}</TableCell>
                              <TableCell>{formatDate(app.created_at)}</TableCell>
                              <TableCell>{renderStatus(app.status)}</TableCell>
                              <TableCell>
                                <Button 
                                  size="sm" 
                                  color="primary" 
                                  variant="flat"
                                  onClick={() => viewApplicationDetails(app)}
                                >
                                  {t('moreDetails')}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      
                      <div className="flex justify-center py-4">
                        <Pagination
                          total={Math.ceil(totalApplications / 10)}
                          page={page}
                          onChange={setPage}
                        />
                      </div>
                    </>
                  )}
                </div>
              </Tab>
              
              <Tab key="users" title="Пользователи">
                <div className="px-6 py-4 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">{t('userManagement')}</h3>
                    <Button 
                      size="sm" 
                      color="primary" 
                      onClick={fetchUsers}
                      isDisabled={usersLoading}
                    >
                      {t('refreshList')}
                    </Button>
                  </div>
                
                  {usersLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : usersError ? (
                    <div className="bg-danger-50 text-danger p-4 rounded-lg">
                      {usersError}
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Нет пользователей в системе
                    </div>
                  ) : (
                    <>
                      {renderUsersTable()}
                      {renderUsersPagination()}
                    </>
                  )}
                </div>
              </Tab>
              
              <Tab key="notifications" title="Уведомления">
                <div className="p-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">{t('notificationManagement')}</h3>
                  
                  {/* Статус браузерных уведомлений */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <h4 className="font-semibold text-blue-600 mb-3">Статус браузерных push-уведомлений</h4>
                    {notificationStatus && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Поддержка браузера:</span>
                          <Chip 
                            color={notificationStatus.supported ? "success" : "danger"} 
                            size="sm"
                            variant="flat"
                          >
                            {notificationStatus.supported ? "Поддерживается" : "Не поддерживается"}
                          </Chip>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Разрешение:</span>
                          <Chip 
                            color={
                              notificationStatus.permission === 'granted' ? "success" : 
                              notificationStatus.permission === 'denied' ? "danger" : "warning"
                            } 
                            size="sm"
                            variant="flat"
                          >
                            {
                              notificationStatus.permission === 'granted' ? "Разрешено" :
                              notificationStatus.permission === 'denied' ? "Заблокировано" :
                              notificationStatus.permission === 'default' ? "Не определено" :
                              notificationStatus.permission
                            }
                          </Chip>
                        </div>
                        <div className="flex gap-2 mt-3">
                          {notificationStatus.permission !== 'granted' && (
                            <Button
                              size="sm"
                              color="primary"
                              variant="flat"
                              onPress={requestNotificationPermission}
                            >
                              Запросить разрешение
                            </Button>
                          )}
                          {notificationStatus.permission === 'granted' && (
                            <Button
                              size="sm"
                              color="secondary"
                              variant="flat"
                              onPress={testBrowserNotification}
                            >
                              Тестировать браузерные уведомления
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-amber-700">
                        <p className="font-medium mb-1">Типы уведомлений в системе:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li><strong>WebSocket уведомления:</strong> Отправляются через WebSocket в реальном времени (только при открытом сайте)</li>
                          <li><strong>Браузерные push-уведомления:</strong> Отображаются в системе уведомлений браузера (работают даже когда сайт закрыт)</li>
                          <li><strong>Toast уведомления:</strong> Всплывающие уведомления в интерфейсе</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <h4 className="font-semibold mb-4">Отправка WebSocket уведомлений</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Input
                          label="Заголовок уведомления"
                          placeholder="Введите заголовок"
                          value={notificationTitle}
                          onChange={(e) => setNotificationTitle(e.target.value)}
                          className="mb-4"
                          variant="bordered"
                          isRequired
                        />
                        
                        <Textarea
                          label="Текст уведомления"
                          placeholder="Введите текст уведомления"
                          value={notificationMessage}
                          onChange={(e) => setNotificationMessage(e.target.value)}
                          className="mb-4"
                          minRows={3}
                          variant="bordered"
                          isRequired
                        />
                        
                        <Select
                          label="Тип уведомления"
                          value={notificationType}
                          onChange={(e) => setNotificationType(e.target.value)}
                          className="mb-4"
                          variant="bordered"
                        >
                          <SelectItem key="system" value="system" textValue="Системное">Системное</SelectItem>
                          <SelectItem key="consultation" value="consultation" textValue={t('consultation')}>Консультация</SelectItem>
                          <SelectItem key="appointment" value="appointment" textValue="Запись">Запись</SelectItem>
                          <SelectItem key="message" value="message" textValue="Сообщение">Сообщение</SelectItem>
                          <SelectItem key="update" value="update" textValue="Обновление">Обновление</SelectItem>
                        </Select>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="p-4 bg-blue-50 rounded-lg mb-4">
                          <h4 className="font-semibold text-blue-600 mb-2">Параметры получателей</h4>
                          
                          <RadioGroup
                            label="Кому отправить уведомление"
                            value={notificationTarget}
                            onValueChange={setNotificationTarget}
                            className="mb-4"
                          >
                            <Radio value="all">Всем пользователям</Radio>
                            <Radio value="role">По роли пользователя</Radio>
                            <Radio value="user">Конкретному пользователю</Radio>
                          </RadioGroup>
                          
                          {notificationTarget === "role" && (
                            <Select
                              label="Выберите роль"
                              value={selectedRoleForNotification}
                              onChange={(e) => setSelectedRoleForNotification(e.target.value)}
                              variant="bordered"
                            >
                              <SelectItem key="all" value="all">Все роли</SelectItem>
                              <SelectItem key="patient" value="patient">Пациенты</SelectItem>
                              <SelectItem key="doctor" value="doctor">Врачи</SelectItem>
                              <SelectItem key="admin" value="admin">Администраторы</SelectItem>
                            </Select>
                          )}
                          
                          {notificationTarget === "user" && (
                            <Input
                              type="number"
                              label="ID пользователя"
                              placeholder="Введите ID пользователя"
                              value={specificUserId}
                              onChange={(e) => setSpecificUserId(e.target.value)}
                              variant="bordered"
                            />
                          )}
                        </div>
                        
                        <div className="flex justify-end mt-4">
                          <Button
                            color="primary"
                            className="w-full md:w-auto"
                            onPress={sendPushNotification}
                            isLoading={isSendingNotification}
                          >
                            Отправить WebSocket уведомление
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    {notificationResult && (
                      <div className={`mt-6 p-4 rounded-lg ${notificationResult.success ? 'bg-success-50 text-success-600' : 'bg-danger-50 text-danger-600'}`}>
                        <div className="flex items-center gap-2">
                          {notificationResult.success ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span>{notificationResult.message}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Tab>
              
              <Tab key="news" title="Новости">
                <div className="px-6 py-4 border-t">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">Управление новостями</h3>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        color="primary" 
                        onPress={createNews}
                      >
                        Создать новость
                      </Button>
                      <Button 
                        size="sm" 
                        color="secondary" 
                        variant="flat"
                        onPress={fetchNews}
                        isDisabled={newsLoading}
                      >
                        Обновить список
                      </Button>
                    </div>
                  </div>
                  
                  {/* Фильтры */}
                  <div className="flex gap-4 mb-4">
                    <Button 
                      size="sm" 
                      variant={!newsPublishedOnly ? 'solid' : 'flat'} 
                      color={!newsPublishedOnly ? 'primary' : 'default'}
                      onPress={() => setNewsPublishedOnly(false)}
                    >
                      Все новости
                    </Button>
                    <Button 
                      size="sm" 
                      variant={newsPublishedOnly ? 'solid' : 'flat'} 
                      color={newsPublishedOnly ? 'success' : 'default'}
                      onPress={() => setNewsPublishedOnly(true)}
                    >
                      Только опубликованные
                    </Button>
                  </div>
                
                  {newsLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <Spinner size="lg" />
                    </div>
                  ) : newsError ? (
                    <div className="bg-danger-50 text-danger p-4 rounded-lg">
                      {newsError}
                    </div>
                  ) : news.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      Нет новостей
                    </div>
                  ) : (
                    <>
                      {renderNewsTable()}
                      {renderNewsPagination()}
                    </>
                  )}
                </div>
              </Tab>
              
              <Tab key="settings" title={t('settings')}>
                <div className="p-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">Настройки системы</h3>
                  <p className="text-gray-500">
                    Настройки системы будут доступны в следующих обновлениях.
                  </p>
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>
      </div>
      
      {/* Модальное окно для просмотра деталей заявки */}
      {selectedApplication && (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              <div className="text-xl">Заявка на роль врача</div>
              <div className="text-small text-gray-500">ID: {selectedApplication.id}</div>
            </ModalHeader>
            <ModalBody>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-medium font-semibold mb-2">Информация о враче</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-small text-gray-500">ФИО:</span>
                      <p>{selectedApplication.full_name}</p>
                    </div>
                    <div>
                      <span className="text-small text-gray-500">Специализация:</span>
                      <p>{selectedApplication.specialization}</p>
                    </div>
                    <div>
                      <span className="text-small text-gray-500">Опыт:</span>
                      <p>{selectedApplication.experience}</p>
                    </div>
                    <div>
                      <span className="text-small text-gray-500">Образование:</span>
                      <p>{selectedApplication.education}</p>
                    </div>
                    <div>
                      <span className="text-small text-gray-500">Номер лицензии:</span>
                      <p>{selectedApplication.license_number}</p>
                    </div>
                    <div>
                      <span className="text-small text-gray-500">Город/Регион:</span>
                      <p>{selectedApplication.city || "-"}</p>
                    </div>
                    <div>
                      <span className="text-small text-gray-500">Район:</span>
                      <p>{selectedApplication.district || "-"}</p>
                    </div>
                    <div>
                      <span className="text-small text-gray-500">Языки консультаций:</span>
                      <p>{selectedApplication.languages ? selectedApplication.languages.join(", ") : "-"}</p>
                    </div>
                    {selectedApplication.additional_info && (
                      <div>
                        <span className="text-small text-gray-500">Дополнительная информация:</span>
                        <p>{selectedApplication.additional_info}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-small text-gray-500">Дата подачи:</span>
                      <p>{formatDate(selectedApplication.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-small text-gray-500">Статус:</span>
                      <div className="mt-1">{renderStatus(selectedApplication.status)}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-medium font-semibold mb-2">Загруженные документы</h3>
                  <div className="space-y-4">
                    {/* Фотография */}
                    <div>
                      <span className="text-small text-gray-500">Фотография:</span>
                      {selectedApplication.photo_path ? (
                        <div className="mt-2 border rounded-md overflow-hidden">
                          <a 
                            href={`${API_BASE_URL}${selectedApplication.photo_path}`} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-primary hover:underline mb-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            Открыть в полном размере
                          </a>
                          <img 
                            src={`${API_BASE_URL}${selectedApplication.photo_path}`} 
                            alt="Фото врача" 
                            className="w-full h-auto max-h-48 object-cover"
                          />
                        </div>
                      ) : (
                        <p className="text-gray-400">Фотография не загружена</p>
                      )}
                    </div>
                    
                    {/* Диплом */}
                    <div>
                      <span className="text-small text-gray-500">Диплом:</span>
                      {selectedApplication.diploma_path ? (
                        <div className="mt-2 border rounded-md overflow-hidden">
                          <a 
                            href={`${API_BASE_URL}${selectedApplication.diploma_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-primary hover:underline mb-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Просмотреть документ в полном размере
                          </a>
                          {selectedApplication.diploma_path.toLowerCase().endsWith('.pdf') ? (
                            <iframe 
                              src={`${API_BASE_URL}${selectedApplication.diploma_path}`} 
                              className="w-full h-48"
                              title="Диплом"
                            ></iframe>
                          ) : (
                            <img 
                              src={`${API_BASE_URL}${selectedApplication.diploma_path}`} 
                              alt="Диплом" 
                              className="w-full h-auto max-h-48 object-cover"
                            />
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400">Диплом не загружен</p>
                      )}
                    </div>
                    
                    {/* Лицензия */}
                    <div>
                      <span className="text-small text-gray-500">Лицензия:</span>
                      {selectedApplication.license_path ? (
                        <div className="mt-2 border rounded-md overflow-hidden">
                          <a 
                            href={`${API_BASE_URL}${selectedApplication.license_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-primary hover:underline mb-2"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            Просмотреть документ в полном размере
                          </a>
                          {selectedApplication.license_path.toLowerCase().endsWith('.pdf') ? (
                            <iframe 
                              src={`${API_BASE_URL}${selectedApplication.license_path}`} 
                              className="w-full h-48"
                              title="Лицензия"
                            ></iframe>
                          ) : (
                            <img 
                              src={`${API_BASE_URL}${selectedApplication.license_path}`} 
                              alt="Лицензия" 
                              className="w-full h-auto max-h-48 object-cover"
                            />
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-400">Лицензия не загружена</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Комментарий администратора */}
              {selectedApplication.status === 'pending' && (
                <div className="mt-4">
                  <Textarea
                    label="Комментарий администратора"
                    placeholder="Укажите причину отклонения или любой другой комментарий"
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    className="w-full"
                    isRequired={true}
                    errorMessage={error && !adminComment.trim() ? error : null}
                    isInvalid={error && !adminComment.trim()}
                  />
                  {confirmAction === 'reject' && !adminComment.trim() && error && (
                    <div className="mt-1 text-danger text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}
              
              {/* Результат рассмотрения */}
              {selectedApplication.status !== 'pending' && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <h3 className="text-medium font-semibold mb-2">Результат рассмотрения</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-small text-gray-500">Статус:</span>
                      <div className="mt-1">{renderStatus(selectedApplication.status)}</div>
                    </div>
                    {selectedApplication.admin_comment && (
                      <div>
                        <span className="text-small text-gray-500">Комментарий администратора:</span>
                        <p>{selectedApplication.admin_comment}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-small text-gray-500">Дата рассмотрения:</span>
                      <p>{formatDate(selectedApplication.processed_at)}</p>
                    </div>
                  </div>
                </div>
              )}
            </ModalBody>
            <ModalFooter>
              {selectedApplication.status === 'pending' && (
                <>
                  <Button
                    color="danger"
                    variant="flat"
                    onPress={() => showConfirmation('reject')}
                    isDisabled={loading}
                  >
                    Отклонить
                  </Button>
                  <Button
                    color="success"
                    onPress={() => showConfirmation('approve')}
                    isDisabled={loading}
                  >
                    Одобрить
                  </Button>
                </>
              )}
              <Button color="default" variant="light" onPress={onClose}>
                {selectedApplication.status === 'pending' ? 'Отмена' : 'Закрыть'}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
      
      {/* Модальное окно подтверждения действия */}
      <Modal isOpen={isConfirmModalOpen} onClose={onConfirmModalClose} size="sm">
        <ModalContent>
          {(onCloseConfirm) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                {confirmAction === 'approve' ? 'Подтверждение одобрения' : 'Подтверждение отклонения'}
              </ModalHeader>
              <ModalBody>
                {confirmAction === 'approve' ? (
                  <p>Вы уверены, что хотите одобрить заявку на роль врача? После одобрения пользователь получит роль врача и сможет создать свой профиль.</p>
                ) : (
                  <p>Вы уверены, что хотите отклонить заявку на роль врача? Пользователь получит уведомление с указанным комментарием.</p>
                )}
                
                {confirmAction === 'reject' && !adminComment.trim() && (
                  <div className="mt-3 text-danger text-sm">
                    Необходимо указать причину отклонения в комментарии.
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="default" variant="light" onPress={onCloseConfirm}>
                  Отмена
                </Button>
                <Button 
                  color={confirmAction === 'approve' ? 'success' : 'danger'} 
                  onPress={handleConfirmAction}
                  isDisabled={confirmAction === 'reject' && !adminComment.trim()}
                >
                  {confirmAction === 'approve' ? 'Подтвердить одобрение' : 'Подтвердить отклонение'}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      
      {/* Модальное окно для просмотра профиля пользователя */}
      <Modal isOpen={isUserModalOpen} onClose={onUserModalClose} size="3xl">
        <ModalContent>
          {() => (
            <>
              <ModalHeader>
                <div className="flex flex-col">
                  <span>Профиль пользователя</span>
                  <span className="text-sm text-gray-500">ID: {selectedUser?.id}</span>
                </div>
              </ModalHeader>
              <ModalBody>
                {userProfileLoading ? (
                  <div className="flex justify-center py-8">
                    <Spinner label="Загрузка профиля..." />
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Основная информация о пользователе */}
                    <Card>
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="flex justify-between items-center w-full">
                          <h3 className="text-lg font-semibold">Основная информация</h3>
                          {renderUserRole(selectedUser?.role)}
                        </div>
                      </CardHeader>
                      <CardBody>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Email</p>
                            <p className="font-medium">{selectedUser?.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Статус</p>
                            <Chip color={selectedUser?.is_active ? "success" : "danger"} variant="flat">
                              {selectedUser?.is_active ? "Активен" : "Неактивен"}
                            </Chip>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Дата регистрации</p>
                            <p className="font-medium">{formatDate(selectedUser?.created_at) || "-"}</p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    {/* Информация о профиле */}
                    {userProfile && (
                      <Card>
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                          <div className="flex justify-between items-center w-full">
                            <h3 className="text-lg font-semibold">Профиль пользователя</h3>
                            {!isEditingProfile && (
                              <Button
                                color="primary"
                                variant="flat"
                                size="sm"
                                onPress={startEditingProfile}
                              >
                                Редактировать
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardBody>
                          {isEditingProfile ? (
                            <div className="space-y-4">
                              {/* Форма редактирования */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Общие поля для всех профилей */}
                                <Input
                                  label="Полное имя"
                                  value={editedProfile.full_name || ""}
                                  onValueChange={(value) => updateProfileField('full_name', value)}
                                />
                                <Input
                                  label="Телефон"
                                  value={editedProfile.contact_phone || ""}
                                  onValueChange={(value) => updateProfileField('contact_phone', value)}
                                />
                                <Select
                                  label="Город"
                                  selectedKeys={editedProfile.city ? [editedProfile.city] : []}
                                  onSelectionChange={(keys) => {
                                    const city = Array.from(keys)[0];
                                    updateProfileField('city', city);
                                    updateProfileField('district', ''); // Сбрасываем район при смене города
                                  }}
                                >
                                  {getRegions().map((region) => (
                                    <SelectItem key={region} value={region}>
                                      {translateRegion(region, 'ru')}
                                    </SelectItem>
                                  ))}
                                </Select>
                                <Select
                                  label="Район"
                                  selectedKeys={editedProfile.district ? [editedProfile.district] : []}
                                  onSelectionChange={(keys) => {
                                    const district = Array.from(keys)[0];
                                    updateProfileField('district', district);
                                  }}
                                  isDisabled={!editedProfile.city}
                                >
                                  {editedProfile.city && getDistrictsByRegion(editedProfile.city).map((district, index) => (
                                    <SelectItem key={district} value={district}>
                                      {translateDistrict(district, 'ru')}
                                    </SelectItem>
                                  ))}
                                </Select>
                                <div className="col-span-2">
                                  <Input
                                    label="Адрес"
                                    value={editedProfile.contact_address || ""}
                                    onValueChange={(value) => updateProfileField('contact_address', value)}
                                  />
                                </div>
                                
                                {/* Поля только для пациентов */}
                                {selectedUser?.role === 'patient' && (
                                  <div className="col-span-2">
                                    <Textarea
                                      label="Медицинская информация"
                                      value={editedProfile.medical_info || ""}
                                      onValueChange={(value) => updateProfileField('medical_info', value)}
                                      rows={3}
                                    />
                                  </div>
                                )}
                                
                                {/* Поля только для врачей */}
                                {selectedUser?.role === 'doctor' && (
                                  <>
                                    <Input
                                      label="Специализация"
                                      value={editedProfile.specialization || ""}
                                      onValueChange={(value) => updateProfileField('specialization', value)}
                                    />
                                    <Input
                                      type="number"
                                      label="Стоимость консультации"
                                      value={editedProfile.cost_per_consultation || ""}
                                      onValueChange={(value) => updateProfileField('cost_per_consultation', value)}
                                    />
                                    <Input
                                      label="Опыт работы"
                                      value={editedProfile.experience || ""}
                                      onValueChange={(value) => updateProfileField('experience', value)}
                                    />
                                    <div className="col-span-2">
                                      <Textarea
                                        label="Образование"
                                        value={editedProfile.education || ""}
                                        onValueChange={(value) => updateProfileField('education', value)}
                                        rows={3}
                                      />
                                    </div>
                                  </>
                                )}
                              </div>
                              
                              {/* Кнопки сохранения/отмены */}
                              <div className="flex gap-2 mt-4">
                                <Button
                                  color="primary"
                                  onPress={saveProfileChanges}
                                  isLoading={isSavingProfile}
                                >
                                  Сохранить
                                </Button>
                                <Button
                                  color="danger"
                                  variant="flat"
                                  onPress={cancelEditingProfile}
                                  isDisabled={isSavingProfile}
                                >
                                  Отмена
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Просмотр профиля */}
                              <div>
                                <p className="text-sm text-gray-500">Полное имя</p>
                                <p className="font-medium">{userProfile.full_name || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Телефон</p>
                                <p className="font-medium">{userProfile.contact_phone || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Город</p>
                                <p className="font-medium">{userProfile.city ? translateRegion(userProfile.city, 'ru') : "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Район</p>
                                <p className="font-medium">{userProfile.district ? getDistrictNameById(userProfile.district, userProfile.city, 'ru') : "-"}</p>
                              </div>
                              <div className="col-span-2">
                                <p className="text-sm text-gray-500">Адрес</p>
                                <p className="font-medium">{userProfile.contact_address || "-"}</p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500">Способ входа</p>
                                <Chip
                                  color={selectedUser?.auth_provider === "google" ? "primary" : "default"}
                                  variant="flat"
                                >
                                  {selectedUser?.auth_provider === "google" ? "Google" : "Email/Пароль"}
                                </Chip>
                              </div>
                              
                              {/* Поля только для пациентов */}
                              {selectedUser?.role === 'patient' && (
                                <div className="col-span-2">
                                  <p className="text-sm text-gray-500">Медицинская информация</p>
                                  <p className="whitespace-pre-wrap bg-gray-50 p-2 rounded mt-1">
                                    {userProfile.medical_info || "-"}
                                  </p>
                                </div>
                              )}
                              
                              {/* Поля только для врачей */}
                              {selectedUser?.role === 'doctor' && (
                                <>
                                  <div>
                                    <p className="text-sm text-gray-500">Специализация</p>
                                    <p className="font-medium">{userProfile.specialization || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Стоимость консультации</p>
                                    <p className="font-medium">{userProfile.cost_per_consultation || "-"} ₽</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Опыт работы</p>
                                    <p className="font-medium">{userProfile.experience || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-gray-500">Верификация</p>
                                    <Chip color={userProfile.is_verified ? "success" : "warning"} variant="flat">
                                      {userProfile.is_verified ? "Верифицирован" : "Не верифицирован"}
                                    </Chip>
                                  </div>
                                  <div className="col-span-2">
                                    <p className="text-sm text-gray-500">Образование</p>
                                    <p className="whitespace-pre-wrap bg-gray-50 p-2 rounded mt-1">
                                      {userProfile.education || "-"}
                                    </p>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    )}

                    {/* Секция управления пользователем */}
                    <Card>
                      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                        <h3 className="text-lg font-semibold">Управление пользователем</h3>
                      </CardHeader>
                      <CardBody>
                        <div className="flex flex-col gap-4">
                          <Select
                            label="Выберите роль"
                            selectedKeys={[newRole]}
                            onChange={(e) => setNewRole(e.target.value)}
                          >
                            <SelectItem key="patient" value="patient">
                              Пациент
                            </SelectItem>
                            <SelectItem key="doctor" value="doctor">
                              Врач
                            </SelectItem>
                            <SelectItem key="admin" value="admin">
                              Администратор
                            </SelectItem>
                          </Select>
                          <Button
                            color="primary"
                            onClick={changeUserRole}
                            disabled={selectedUser?.role === newRole || usersLoading}
                          >
                            Изменить роль
                          </Button>
                          
                          {/* Кнопка сброса пароля только для пользователей не из Google */}
                          {selectedUser && selectedUser.auth_provider !== "google" && (
                            <Button
                              color="warning"
                              variant="flat"
                              className="mt-2"
                            >
                              Сбросить пароль
                            </Button>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onUserModalClose}>
                  Закрыть
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
      
      {/* Модальное окно для просмотра новости */}
      <Modal 
        isOpen={isNewsModalOpen} 
        onClose={onNewsModalClose}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">
              Просмотр новости
            </h2>
          </ModalHeader>
          <ModalBody>
            {selectedNews && (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{selectedNews.title}</h3>
                    <div className="flex gap-2 mb-4">
                      <Chip size="sm" color="primary" variant="flat">
                        {selectedNews.category}
                      </Chip>
                      <Chip 
                        size="sm" 
                        color={selectedNews.is_published ? "success" : "warning"} 
                        variant="flat"
                      >
                        {selectedNews.is_published ? "Опубликована" : "Черновик"}
                      </Chip>
                      {selectedNews.is_featured && (
                        <Chip size="sm" color="secondary" variant="flat">
                          Рекомендуемая
                        </Chip>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 text-right">
                    <p>Создана: {formatNewsDate(selectedNews.created_at)}</p>
                    {selectedNews.published_at && (
                      <p>Опубликована: {formatNewsDate(selectedNews.published_at)}</p>
                    )}
                  </div>
                </div>

                {selectedNews.image_path && (
                  <div className="mb-4">
                    <img
                      src={`${API_BASE_URL}${selectedNews.image_path}`}
                      alt={selectedNews.title}
                      className="w-full max-w-md mx-auto rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Краткое описание:</h4>
                  <p className="text-gray-700 mb-4">{selectedNews.summary}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Полный текст:</h4>
                  <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                    {selectedNews.content}
                  </div>
                </div>

                {selectedNews.tags && selectedNews.tags.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Теги:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedNews.tags.map((tag, index) => (
                        <Chip key={index} size="sm" variant="flat">
                          #{tag}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                {selectedNews.read_time && (
                  <div>
                    <h4 className="font-semibold mb-2">Время чтения:</h4>
                    <p className="text-gray-600">{selectedNews.read_time}</p>
                  </div>
                )}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={onNewsModalClose}>
              Закрыть
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Модальное окно формы создания/редактирования новости */}
      <NewsForm
        isOpen={isNewsFormModalOpen}
        onClose={onNewsFormModalClose}
        onSuccess={(newsData) => {
          fetchNews(); // Обновляем список новостей
          onNewsFormModalClose();
        }}
        news={selectedNews}
        isEditing={isEditingNews}
      />
    </div>
  );
}

export default AdminPage; 