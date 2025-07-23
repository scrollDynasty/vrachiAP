import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Textarea, Spinner, Card, CardBody, CardHeader, Divider, Badge, Chip, Avatar, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Input, CardFooter } from '@nextui-org/react';
import { toast } from 'react-hot-toast';
import api, { consultationsApi } from '../api';
import useAuthStore from '../stores/authStore';
import useChatStore from '../stores/chatStore';
import { useNavigate } from 'react-router-dom';
import webSocketService from '../services/webSocketService';
import { useTranslation } from './LanguageSelector';

// Подавляем ошибки 404 для конкретных URL
const suppressedEndpoints = [
  '/api/consultations/*/review',
  '/api/consultations/*/messages/read'
];

// Перехватываем запросы axios для подавления ошибок
const setupApiInterceptors = () => {
  // Не устанавливаем перехватчик, если он уже установлен
  if (api.interceptors.response.handlers.some(h => h.fulfilled && h.fulfilled.name === 'suppressErrorsHandler')) {
    return;
  }
  
  // Устанавливаем перехватчик для подавления 404 ошибок для определенных URL
  api.interceptors.response.use(
    response => response, 
    error => {
      // Проверяем, что ошибка содержит информацию о запросе
      if (error.response && error.response.status === 404 && error.config && error.config.url) {
        // Проверяем, подходит ли URL под маску подавления
        const shouldSuppress = suppressedEndpoints.some(endpoint => {
          const pattern = endpoint.replace('*', '.*');
          const regex = new RegExp(pattern);
          return regex.test(error.config.url);
        });
        
        if (shouldSuppress) {
          // Возвращаем "пустой" успешный ответ
          return Promise.resolve({ 
            status: 200, 
            data: null,
            suppressed: true,
            originalError: { status: 404, message: error.message }
          });
        }
      }
      
      // Для всех остальных ошибок пробрасываем их дальше
      return Promise.reject(error);
    }
  );
};

// Устанавливаем перехватчики при импорте компонента
setupApiInterceptors();

// Вспомогательная функция для безопасного получения значений из localStorage
const getItem = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
};

// Компонент сообщения в чате
const ChatMessage = ({ message, currentUserId, patientAvatar, doctorAvatar }) => {
  const { t } = useTranslation(); // Добавляем импорт функции перевода
  const isMyMessage = message.sender_id === currentUserId;
  
  // Состояние для модального окна с изображением
  const [selectedImage, setSelectedImage] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  // Проверяем наличие вложений
  const hasAttachments = message.attachments && message.attachments.length > 0;
  
  // Функция для открытия изображения в модальном окне
  const openImageModal = (attachment) => {
    setSelectedImage(attachment);
    setIsImageModalOpen(true);
  };
  
  // Функция для скачивания файла
  const downloadFile = async (attachment) => {
    try {
      const fileUrl = `${window.location.origin}${attachment.file_path}`;
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      
      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // Ошибка скачивания файла
    }
  };
  
  // Форматирование времени
  const formatTime = (dateString) => {
    const options = { hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleTimeString(undefined, options);
  };
  
  // Выбираем аватарку в зависимости от роли отправителя
  const getAvatarUrl = () => {
    if (message.sender_role === 'doctor') {
      return doctorAvatar || '/assets/doctor-avatar.png';
    } else {
      return patientAvatar || '/assets/patient-avatar.png';
    }
  };
  
  const avatarUrl = getAvatarUrl();
  
  // Определяем статус сообщения для отображения
  const renderMessageStatus = () => {
    if (message.temporary) {
      return <span className="ml-2 text-gray-400 text-xs italic animate-pulse">⏱️ отправляется...</span>;
    } else if (message.is_read && isMyMessage) {
      return <span className="ml-2 text-blue-100">✓</span>;
    }
    return null;
  };
  
  // CSS классы для сообщения в зависимости от статуса
  const messageClasses = `
    px-4 py-3 rounded-2xl shadow-sm max-w-[70%] 
    ${isMyMessage ? 
      (message.temporary ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 'bg-gradient-to-r from-primary-500 to-primary-600') : 
      'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200'
    } 
    ${isMyMessage ? 'text-white' : 'text-gray-800'}
    transition-all duration-300 ease-in-out
    hover:shadow-md
    ${!message.temporary && 'animate-fade-in'}
    ${message.temporary ? 'opacity-80' : 'opacity-100'}
  `;
  
  return (
    <div className={`flex mb-4 ${isMyMessage ? 'justify-end' : 'justify-start'} animate-slide-in`}>
      {!isMyMessage && (
        <Avatar 
          src={avatarUrl} 
          className="mr-2 ring-2 ring-gray-200 ring-offset-2 shadow-sm transition-all duration-300" 
          size="sm" 
        />
      )}
      <div className={messageClasses.trim()}>
        <div className="text-sm font-medium">{message.content}</div>
        
        {/* Отображение прикрепленных файлов */}
        {message.attachments && message.attachments.length > 0 ? (
          <div className="mt-3 space-y-2">
            {message.attachments.map((attachment, index) => {
              // Определяем тип файла
              const isImage = attachment.content_type?.startsWith('image/') || 
                             attachment.filename?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
              
              // Формируем полный URL к файлу
              const fileUrl = `${window.location.origin}${attachment.file_path}`;
              
              return (
                <div key={index} className="space-y-2">
                  {isImage ? (
                    // Отображение изображения
                    <div 
                      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg group ${
                        isMyMessage ? 'bg-white/10 border border-white/30' : 'bg-gray-50 border border-gray-200'
                      }`}
                      onClick={() => openImageModal(attachment)}
                    >
                      <img 
                        src={fileUrl}
                        alt={attachment.filename}
                        className="max-w-full max-h-64 rounded-lg object-cover"
                        style={{ width: 'auto', height: 'auto' }}
                        onError={(e) => {
                          // Если изображение не загрузилось, показываем как обычный файл
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                      {/* Fallback если изображение не загрузится */}
                      <div 
                        className={`hidden items-center gap-2 p-3 ${
                          isMyMessage ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        <i className="fas fa-image text-lg"></i>
                        <div className="flex-1">
                          <div className="text-sm font-medium truncate">{attachment.filename}</div>
                          <div className="text-xs opacity-75">
                            {(attachment.file_size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </div>
                        <div className="text-xs opacity-75">
                          <i className="fas fa-external-link-alt"></i>
                        </div>
                      </div>
                      {/* Overlay с кнопками действий */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Button
                          size="sm"
                          color="secondary"
                          variant="solid"
                          isIconOnly
                          className="bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(attachment);
                          }}
                        >
                          <i className="fas fa-download"></i>
                        </Button>
                      </div>
                      
                      {/* Overlay с информацией о файле */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                        <div className="text-white text-xs font-medium truncate">
                          {attachment.filename}
                        </div>
                        <div className="text-white/80 text-xs flex items-center justify-between">
                          <span>{(attachment.file_size / 1024 / 1024).toFixed(2)} MB</span>
                          <span className="opacity-75">{t('clickToView')}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Отображение документа/файла
                                         <div 
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-300 hover:shadow-md group ${
                        isMyMessage ? 'bg-white/20 border border-white/30 hover:bg-white/30' : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
                      }`}
                      onClick={() => downloadFile(attachment)}
                    >
                      {/* Иконка в зависимости от типа файла */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                        isMyMessage ? 'bg-white/30' : 'bg-gray-200'
                      }`}>
                        {attachment.content_type === 'application/pdf' ? (
                          <i className="fas fa-file-pdf text-red-500 text-lg"></i>
                        ) : attachment.content_type?.includes('word') || attachment.filename?.match(/\.(doc|docx)$/i) ? (
                          <i className="fas fa-file-word text-blue-500 text-lg"></i>
                        ) : attachment.content_type === 'text/plain' ? (
                          <i className="fas fa-file-alt text-gray-500 text-lg"></i>
                        ) : (
                          <i className="fas fa-file text-gray-500 text-lg"></i>
                        )}
                      </div>
                      
                      {/* Информация о файле */}
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate ${
                          isMyMessage ? 'text-white' : 'text-gray-800'
                        }`}>
                          {attachment.filename}
                        </div>
                        <div className={`text-xs flex items-center gap-2 ${
                          isMyMessage ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          <span>{(attachment.file_size / 1024 / 1024).toFixed(2)} MB</span>
                          <span>•</span>
                          <span className="group-hover:text-primary-500 transition-colors">{t('clickToDownload')}</span>
                        </div>
                      </div>
                      
                      {/* Иконка действия */}
                      <div className={`flex-shrink-0 ${
                        isMyMessage ? 'text-white/60' : 'text-gray-400'
                      }`}>
                        <i className="fas fa-download text-sm"></i>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}
        
        <div className={`text-xs mt-1 flex items-center ${isMyMessage ? 'text-blue-100' : 'text-gray-500'}`}>
          {formatTime(message.sent_at)}
          {renderMessageStatus()}
        </div>
      </div>
      {isMyMessage && (
        <Avatar 
          src={avatarUrl} 
          className="ml-2 ring-2 ring-primary-200 ring-offset-2 shadow-sm transition-all duration-300" 
          size="sm" 
        />
      )}
      
      {/* Модальное окно для просмотра изображений */}
      <Modal 
        isOpen={isImageModalOpen} 
        onClose={() => setIsImageModalOpen(false)}
        size="4xl"
        backdrop="blur"
        className="bg-transparent"
        hideCloseButton
      >
        <ModalContent className="bg-transparent shadow-none">
          <ModalBody className="p-0">
            {selectedImage && (
              <div className="relative bg-black/90 rounded-lg overflow-hidden">
                {/* Заголовок модального окна */}
                <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <h3 className="font-medium text-lg truncate">{selectedImage.filename}</h3>
                      <p className="text-sm opacity-75">
                        {(selectedImage.file_size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        color="secondary"
                        variant="solid"
                        startContent={<i className="fas fa-download"></i>}
                        className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                        onPress={() => downloadFile(selectedImage)}
                                              >
                          {t('downloadFile')}
                        </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="solid"
                        isIconOnly
                        className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                        onPress={() => setIsImageModalOpen(false)}
                      >
                        <i className="fas fa-times"></i>
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Изображение */}
                <div className="flex items-center justify-center min-h-[60vh] max-h-[80vh] p-4">
                  <img 
                    src={`${window.location.origin}${selectedImage.file_path}`}
                    alt={selectedImage.filename}
                    className="max-w-full max-h-full object-contain rounded"
                    style={{ maxHeight: '70vh' }}
                  />
                </div>
                
                {/* Нижняя панель с дополнительными действиями */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <div className="flex items-center justify-center gap-4">
                    <Button
                      size="sm"
                      color="secondary"
                      variant="light"
                      startContent={<i className="fas fa-search-plus"></i>}
                      className="text-white hover:bg-white/20"
                      onPress={() => window.open(`${window.location.origin}${selectedImage.file_path}`, '_blank')}
                    >
                      {t('openFullSize')}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
};

// Добавляю компонент с защитным рендерингом для обработки ошибок
const SafeRender = ({ children, fallback }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error) => {
      setHasError(true);
      return true;
    };

    // Регистрируем глобальный обработчик ошибок
    window.addEventListener('error', errorHandler);
    
    return () => {
      window.removeEventListener('error', errorHandler);
    };
  }, []);

  if (hasError) {
    return fallback || (
      <div className="p-4 bg-danger-50 rounded-lg">
        <p className="text-danger-700">Произошла ошибка при отображении. Попробуйте перезагрузить страницу.</p>
      </div>
    );
  }

  return children;
};

// Функция для безопасного рендеринга анимаций
const SafeStyles = () => {
  return (
    <style>
      {`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes subtle-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        @keyframes message-sent-animation {
          0% { background-color: rgba(59, 130, 246, 0.05); }
          50% { background-color: rgba(59, 130, 246, 0.1); }
          100% { background-color: rgba(59, 130, 246, 0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        
        .animate-subtle-pulse {
          animation: subtle-pulse 2s infinite;
        }
        
        .message-sent-animation {
          animation: message-sent-animation 0.5s ease-out;
        }
      `}
    </style>
  );
};

// Основной компонент чата
function ConsultationChat({ 
  consultationId, 
  consultation, 
  onConsultationUpdated,
  hasReview = false, // Получаем состояние отзыва от родительского компонента
  onMessageCountUpdated,
  onNewMessage,
  canSendMessages,
  isDoctor,
  isPatient,
  patientName,
  doctorName
}) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { markAsRead } = useChatStore();
  
  // Основные состояния для управления сообщениями
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [socketConnection, setSocketConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [errorMessage, setErrorMessage] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [patientAvatar, setPatientAvatar] = useState(null);
  const [doctorAvatar, setDoctorAvatar] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Добавляем состояние для отслеживания обработанных сообщений
  const [processedMessageIds, setProcessedMessageIds] = useState(new Set());
  
  // Дополнительное состояние для отслеживания попыток переподключения
  const [maxReconnectAttempts, setMaxReconnectAttempts] = useState(10);
  
  // Refs
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const textareaRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageBufferRef = useRef([]);
  const fileInputRef = useRef(null);
  
  // Флаги для управления жизненным циклом
  const isUnmounting = useRef(false);  // Флаг для отслеживания размонтирования компонента
  const disableReconnect = useRef(false);  // Флаг для отключения повторных подключений
  const wsInitializedRef = useRef(false); // Флаг для отслеживания инициализации WebSocket
  
  // Состояния для работы с файлами
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Получаем счетчик сообщений пациента и лимит
  const patientMessageCount = useMemo(() => {
    if (!messages || !user) return 0;
    return messages.filter(msg => msg.sender_id === user.id).length;
  }, [messages, user]);
  
  // Прогресс заполнения лимита сообщений (в процентах)
  const messageCountProgress = useMemo(() => {
    if (!consultation) return 0;
    return Math.round((patientMessageCount / consultation.message_limit) * 100);
  }, [patientMessageCount, consultation]);

  // Проверка, достигнут ли лимит сообщений
  const isMessageLimitReached = useMemo(() => {
    if (!consultation || !user) return false;
    return patientMessageCount >= consultation.message_limit;
  }, [patientMessageCount, consultation, user]);
  
  // Скролл чата к последнему сообщению
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Получаем WebSocket-токен с сервера напрямую
  const getWebSocketToken = async () => {
    try {
      
      // Запрашиваем специальный токен для WebSocket соединения
      const response = await api.get('/api/ws-token');
      
      if (response && response.status === 200 && response.data) {
        if (response.data.token) {
          const token = response.data.token;
          return token;
        } else {
          // API вернул ответ, но токен отсутствует
        }
      } else {
        // Неверный формат ответа при получении WebSocket токена
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Удаляю функцию sendMessageViaREST и упрощаю sendMessage, оставляя только WebSocket
  const sendMessage = async (content) => {
    if (!content.trim() || !consultationId) return;
    
    // Создаем временное сообщение для мгновенного отображения
    const tempId = `temp-${Date.now()}`;
    const temporaryMessage = {
      id: tempId,
      content: content.trim(),
      sender_id: user?.id,
      consultation_id: Number(consultationId),
      sent_at: new Date().toISOString(),
      is_read: false,
      temporary: true
    };
    
    // Добавляем временное сообщение в список мгновенно
    setMessages(prevMessages => [...prevMessages, temporaryMessage]);
    
    // Прокручиваем к новому сообщению сразу
    scrollToBottom();
    
    try {
      // Получаем WebSocket соединение
      const wsConnection = await webSocketService.getConsultationConnection(
        consultationId,
        handleWebSocketMessage,
        updateConnectionStatus
      );
      
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        // Отправляем сообщение через WebSocket
        wsConnection.send(JSON.stringify({
          type: 'message',
          content: content.trim(),
          temp_id: tempId
        }));
        
      } else {
        // WebSocket соединение не установлено
        toast.error(t('connectionLost'));
        
        // Удаляем временное сообщение
        setMessages(prevMessages => prevMessages.filter(m => m.id !== tempId));
      }
    } catch (error) {
      // Ошибка при отправке сообщения
      toast.error(t('messageSendFailed'));
      
      // Удаляем временное сообщение
      setMessages(prevMessages => prevMessages.filter(m => m.id !== tempId));
    }
    
    // Очищаем поле ввода
    setInputValue('');
  };

  // Инициализация чата - оставляем только WebSocket логику
  const initializeChat = async () => {
    try {
      setIsSending(true);
      
      // Пробуем загрузить историю сообщений через REST API сразу
      try {
        const messagesResponse = await api.get(`/api/consultations/${consultationId}/messages`);
        
        if (messagesResponse.data && Array.isArray(messagesResponse.data)) {
          
          // Сортируем сообщения по времени
          const sortedMessages = messagesResponse.data.sort((a, b) => {
            return new Date(a.sent_at) - new Date(b.sent_at);
          });
          
          setMessages(sortedMessages);
          
          // Обновляем время последней синхронизации
          setLastSyncTime(new Date());
          
          // Прокручиваем к последнему сообщению после небольшой задержки
          setTimeout(scrollToBottom, 100);
        } else {
        }
      } catch (restError) {
        // Ошибка при загрузке сообщений через REST API
      }
      
      // Инициализируем WebSocket соединение
      if (!wsInitializedRef.current) {
        
        // Запрашиваем токен для WebSocket и создаем соединение
        const wsConnection = await webSocketService.getConsultationConnection(
          consultationId,
          handleWebSocketMessage,
          updateConnectionStatus
        );
        
        if (wsConnection) {
          wsInitializedRef.current = true;
        } else {
          // Не удалось установить WebSocket соединение
          toast.error(t('connectionError'), {
            id: 'ws-connection-error',
            duration: 4000
          });
          updateConnectionStatus('error', t('connectionError'));
        }
      } else {
      }
    } catch (error) {
      // Ошибка при инициализации чата
      toast.error(t('chatLoadError'));
    } finally {
      setIsSending(false);
    }
  };

  // Эффект для инициализации чата при монтировании
  useEffect(() => {
    // Если нет ID консультации или данных консультации, не делаем ничего
    if (!consultationId || !consultation) {
      return;
    }
    
    
    // Сбрасываем флаги при инициализации
    isUnmounting.current = false;
    disableReconnect.current = false;
    
    // Сбрасываем статусное сообщение перед инициализацией
    setErrorMessage(null);
    
    // Запускаем инициализацию
    initializeChat();

    // При размонтировании компонента закрываем WebSocket и очищаем интервалы
    return () => {
      
      // Устанавливаем флаг размонтирования
      isUnmounting.current = true;
      // Отключаем переподключения
      disableReconnect.current = true;
      wsInitializedRef.current = false;
      
      // Явно закрываем соединение консультации
      if (consultationId && webSocketService) {
        webSocketService.closeConsultationConnection(consultationId);
      }
      
      // Очищаем таймеры переподключения, если они есть
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [consultationId]); // Зависимость только от consultationId, а не от объекта consultation
  
  // Обработчик WebSocket сообщений
  const handleWebSocketMessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // Не логируем ping/pong сообщения каждый раз
      if (data.type !== 'pong') {
      }
      
      // Если пришло сообщение о добавлении отзыва, сразу обновляем состояние
      if (data.type === 'review_added') {
        // Уведомляем родительский компонент
        if (onConsultationUpdated) {
          onConsultationUpdated();
        }
        return;
      }
      
      messageHandler(data);
    } catch (error) {
      // Ошибка разбора WebSocket сообщения
    }
  };

  // Эффект для обновления прокрутки при изменении сообщений
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Эффект для автоматического завершения чата при достижении лимита
  useEffect(() => {
    // Если лимит достигнут, консультация активна, и пользователь - пациент
    if (isMessageLimitReached && consultation?.status === 'active' && isPatient) {
      
      // Показываем предупреждение
      toast.error(`${t('messageLimitReached')} (${patientMessageCount}/${consultation.message_limit})`, {
        duration: 5000,
        id: 'message-limit-warning'
      });
      
      // Запускаем таймер для завершения консультации
      const timer = setTimeout(() => {
        autoCompleteConsultation();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isMessageLimitReached, consultation, isPatient, consultationId, patientMessageCount]);

  // Эффект для загрузки аватаров пациента и врача
  useEffect(() => {
    const loadUserAvatars = async () => {
      if (!consultation) return;
      
      try {
        
        // Загружаем аватар врача
        try {
          const doctorResponse = await api.get(`/doctors/${consultation.doctor_id}/profile`);
          if (doctorResponse.data && doctorResponse.data.user && doctorResponse.data.user.avatar_path) {
            setDoctorAvatar(doctorResponse.data.user.avatar_path);
          } else {
            // Пробуем второй вариант без user вложенности
            if (doctorResponse.data && doctorResponse.data.avatar_path) {
              setDoctorAvatar(doctorResponse.data.avatar_path);
            }
          }
        } catch (doctorError) {
          // Ошибка при загрузке аватара врача
        }
        
        // Загружаем аватар пациента
        try {
          const patientResponse = await api.get(`/patients/${consultation.patient_id}/profile`);
          if (patientResponse.data && patientResponse.data.user && patientResponse.data.user.avatar_path) {
            setPatientAvatar(patientResponse.data.user.avatar_path);
          } else {
            // Пробуем второй вариант без user вложенности
            if (patientResponse.data && patientResponse.data.avatar_path) {
              setPatientAvatar(patientResponse.data.avatar_path);
            }
          }
        } catch (patientError) {
          // Ошибка при загрузке аватара пациента
        }
        
      } catch (error) {
        // Ошибка при загрузке аватаров
      }
    };
    
    loadUserAvatars();
  }, [consultation]);

  // Функция для проверки статуса соединения и обновления UI
  const updateConnectionStatus = (status, message = null) => {
    setConnectionStatus(status);
    
    if (status === 'error' || status === 'disconnected') {
      // Если есть сообщения, показываем уведомление о кеше, но не об ошибке соединения
      if (messages.length > 0) {
        setErrorMessage(`Сообщения загружены из кэша`);
      } else {
        // Устанавливаем статусное сообщение только если оно еще не установлено,
        // чтобы избежать дублирования
        if (!errorMessage) {
          setErrorMessage(t('serverConnectionFailed'));
        }
      }
    } else if (status === 'connected') {
      setErrorMessage(null);
    } else if (status === 'connecting' && !errorMessage) {
      setErrorMessage(t('connectingToServer'));
    }
  };

  // Завершение консультации - только через WebSocket
  const completeConsultation = async () => {
    setIsCompleteModalOpen(false); // Закрываем модальное окно сразу
    
    // Показываем индикатор загрузки
    toast.loading(t('finalizingConsultation'), {id: 'complete-consultation'});
    
    try {
      // Сначала пробуем через WebSocket
      
      // Получаем WebSocket соединение из сервиса
      const wsConnection = await webSocketService.getConsultationConnection(
        consultationId,
        handleWebSocketMessage,
        updateConnectionStatus
      );
      
      // Проверяем соединение WebSocket
      if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        
        // Отправляем запрос на завершение через WebSocket
        wsConnection.send(JSON.stringify({
          type: 'status_update',
          consultation_id: Number(consultationId),
          status: 'completed'
        }));
        
        // Запускаем таймер для запасного варианта через HTTP API
        const fallbackTimer = setTimeout(async () => {
          
          try {
            // Пробуем завершить через HTTP API
            const result = await consultationsApi.completeConsultation(consultationId);
            
            toast.dismiss('complete-consultation');
            toast.success(t('consultationCompletedSuccess'));
            
            // Обновляем данные консультации через колбэк
            if (onConsultationUpdated) {
              onConsultationUpdated(result);
            }
          } catch (apiError) {
            // Не удалось завершить консультацию через HTTP API
            toast.dismiss('complete-consultation');
            toast.error(t('completionFailed'));
          }
        }, 5000); // 5 секунд таймаут для WebSocket
        
        // Ждем ответа от сервера о смене статуса
        const statusUpdateListener = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Если получили обновление статуса и консультация завершена
            if (data.type === 'status_update' && 
                data.consultation && 
                data.consultation.id === Number(consultationId) &&
                data.consultation.status === 'completed') {
              
              // Очищаем слушатель и таймер
              wsConnection.removeEventListener('message', statusUpdateListener);
              clearTimeout(fallbackTimer);
              
              // Обновляем UI
              toast.dismiss('complete-consultation');
              toast.success(t('consultationCompletedSuccess'));
              
              // Обновляем данные консультации через колбэк
              if (onConsultationUpdated) {
                onConsultationUpdated(data.consultation);
              }
            }
          } catch (e) {
            // Ошибка при обработке сообщения WebSocket
          }
        };
        
        // Добавляем временный слушатель для обработки ответа о смене статуса
        wsConnection.addEventListener('message', statusUpdateListener);
        
        // Возвращаемся здесь, ожидая, что ответ придет асинхронно
        return;
      } else {
        // Если WebSocket не работает, сразу пробуем через HTTP
        
        // Пробуем завершить через HTTP API
        const result = await consultationsApi.completeConsultation(consultationId);
        
        toast.dismiss('complete-consultation');
        toast.success(t('consultationCompletedSuccess'));
        
        // Обновляем данные консультации через колбэк
        if (onConsultationUpdated) {
          onConsultationUpdated(result);
        }
      }
    } catch (error) {
      // Ошибка при завершении консультации
      toast.dismiss('complete-consultation');
      toast.error(t('completionFailed'));
    }
  };

  // Функция для автоматического завершения консультации
  const autoCompleteConsultation = async () => {
    // Проверяем, что консультация активна
    if (!consultation || consultation.status !== 'active') {
      return;
    }
    
    
    // Показываем уведомление
    toast.loading(t('finalizingConsultation'), {id: 'auto-complete-consultation'});
    
    // Получаем WebSocket соединение из сервиса
    const wsConnection = await webSocketService.getConsultationConnection(
      consultationId,
      handleWebSocketMessage,
      updateConnectionStatus
    );
    
    // Проверяем WebSocket соединение
    if (!wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
      // Нет соединения WebSocket для завершения консультации
      toast.error(t('serverConnectionFailed'), {id: 'auto-complete-consultation'});
      return;
    }
    
    // Создаем Promise, который разрешится при получении подтверждения
    const completePromise = new Promise((resolve, reject) => {
      // Обработчик для получения подтверждения
      const statusHandler = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Если это обновление статуса консультации
          if (data.type === 'status_update' && data.consultation && 
              data.consultation.id === Number(consultationId) && 
              data.consultation.status === 'completed') {
            
            // Удаляем этот обработчик
            wsConnection.removeEventListener('message', statusHandler);
            
            // Отменяем таймаут
            clearTimeout(timeoutId);
            
            // Разрешаем Promise
            resolve(data.consultation);
          }
        } catch (e) {
          // Ошибка при обработке ответа на завершение консультации
        }
      };
      
      // Добавляем обработчик
      wsConnection.addEventListener('message', statusHandler);
      
      // Устанавливаем таймаут
      const timeoutId = setTimeout(() => {
        // Удаляем обработчик
        wsConnection.removeEventListener('message', statusHandler);
        
        // Показываем ошибку
        toast.error(t('autoCompletionFailed'), {id: 'auto-complete-consultation'});
        
        reject(new Error('Таймаут при завершении консультации'));
      }, 5000);
      
      // Отправляем запрос на завершение через WebSocket
      wsConnection.send(JSON.stringify({
        type: 'status_update',
        status: 'completed',
        consultation_id: Number(consultationId),
        auto_completed: true,
        reason: 'Достигнут лимит сообщений'
      }));
      
    });
    
    // Обрабатываем результат
    completePromise
      .then(() => {
        toast.dismiss('auto-complete-consultation');
        toast.success(t('messageLimitAutoComplete'), { duration: 5000 });
        
        // Обновляем данные консультации через колбэк
        if (onConsultationUpdated) {
          onConsultationUpdated({
            ...consultation,
            status: 'completed',
            completed_at: new Date().toISOString()
          });
        }
      })
      .catch((error) => {
      });
  };

  // Предотвращение частого разрыва соединения
  useEffect(() => {
    // Если соединение установлено, сбрасываем счетчик попыток
    if (connectionStatus === 'connected') {
      setReconnectAttempts(0);
    }
    
    // Логируем изменение статуса соединения
  }, [connectionStatus]);
  
  // Проверка здоровья WebSocket соединения
  // Event-driven health check вместо интервалов
  useEffect(() => {
    if (!socketRef.current) return;
    
    const checkConnection = () => {
      const now = new Date();
      
      // Проверяем только при user activity или visibility change
      if ((lastSyncTime && now - lastSyncTime > 40000) || 
          (socketRef.current && socketRef.current.readyState !== WebSocket.OPEN)) {
        
        if (socketRef.current && socketRef.current.readyState !== WebSocket.OPEN) {
          try {
            socketRef.current.close(3000, 'Закрыто проверкой здоровья');
          } catch (error) {
            // Игнорируем ошибки закрытия неактивного соединения
          }
        }
        
        setConnectionStatus('disconnected');
        scheduleReconnect();
      } else if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(JSON.stringify({ type: 'ping' }));
        } catch (error) {
          setConnectionStatus('disconnected');
          scheduleReconnect();
        }
      }
    };
    
    // Проверяем соединение только при важных событиях
    const handleVisibilityChange = () => {
      if (!document.hidden) checkConnection();
    };
    
    const handleFocus = () => checkConnection();
    const handleOnline = () => checkConnection();
    
    // Добавляем event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [socketRef.current, lastSyncTime]);

  // Улучшенная функция обработки сообщений от WebSocket
  const messageHandler = (data) => {
    try {
      // Обработка разных типов сообщений
      switch (data.type) {
        case 'pong':
          // Обновляем время последнего пинга
          setLastSyncTime(new Date());
          break;
          
        case 'message':
          // Получено новое сообщение
          const newMessage = data.message;
          
          // Строгая проверка дублирования
          if (processedMessageIds.has(newMessage.id)) {
            return;
          }
          
          // Отмечаем сообщение как обработанное
          setProcessedMessageIds(prev => new Set([...prev, newMessage.id]));
          
          // Проверяем, не заменяет ли это сообщение временное
          if (data.temp_id) {
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === data.temp_id ? { ...newMessage, id: newMessage.id } : msg
              )
            );
          } else {
            // Добавляем новое сообщение, если его еще нет
            setMessages(prevMessages => {
              // Проверяем, нет ли уже такого сообщения
              const exists = prevMessages.some(msg => msg.id === newMessage.id);
              if (!exists) {
                return [...prevMessages, newMessage];
              }
              return prevMessages;
            });
          }
          
          // Обновляем время последней синхронизации
          setLastSyncTime(new Date());
          
          // Проверяем достижение лимита сообщений
          if (consultation && isPatient && newMessage.sender_id === user?.id) {
            // Подсчитываем сообщения от пациента
            const patientMessageCount = messages.filter(m => m.sender_id === user?.id).length + 1;
            
            
            // Если достигнут лимит сообщений, автоматически завершаем консультацию
            if (patientMessageCount >= consultation.message_limit && consultation.status === 'active') {
              
              // Показываем предупреждение
              toast.error(t('messageLimitReached'), {
                duration: 5000,
                icon: '⚠️'
              });
              
              // Отложенно запускаем завершение консультации
              setTimeout(() => {
                autoCompleteConsultation();
              }, 3000);
            }
          }
          
          // Прокручиваем к новому сообщению
          scrollToBottom();
          break;
          
        case 'messages_history':
        case 'messages_bulk':
          // Получена история сообщений
          const receivedMessages = data.messages || [];
          
          if (receivedMessages.length > 0) {
            // Сортируем сообщения по времени
            const sortedMessages = receivedMessages.sort((a, b) => {
              return new Date(a.sent_at) - new Date(b.sent_at);
            });
            
            setMessages(sortedMessages);
            
            // Обновляем время последней синхронизации
            setLastSyncTime(new Date());
            
            // Прокручиваем к последнему сообщению после небольшой задержки
            setTimeout(scrollToBottom, 100);
          }
          break;
          
        case 'read_receipt':
          // Сообщение прочитано
          const messageId = data.message_id;
          
          // Обновляем статус прочтения в сообщениях
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === messageId ? { ...msg, is_read: true } : msg
            )
          );
          break;
          
        case 'status_update':
          // Обновление статуса консультации
          
          if (data.consultation && data.consultation.status) {
            // Обновляем статус консультации в родительском компоненте
            if (onConsultationUpdated) {
              onConsultationUpdated({
                ...consultation,
                status: data.consultation.status,
                completed_at: data.consultation.completed_at
              });
            }
            
            // Обрабатываем статус "completed" - консультация завершена
            if (data.consultation.status === 'completed') {
              
              // Уведомляем родительский компонент об изменении
              if (onConsultationUpdated) {
                onConsultationUpdated({
                  ...consultation,
                  status: 'completed',
                  completed_at: data.consultation.completed_at
                });
              }
              
              // НЕ показываем модальное окно отзыва здесь - это делает ConsultationPage
              // Просто уведомляем о завершении
            }
          }
          break;
          
        case 'review_added':
          // Получено уведомление о добавлении отзыва
          
          // Обновляем статус отзыва (данный код дублирует логику в handleWebSocketMessage, но оставляем для надежности)
          setIsCompleteModalOpen(true);
          break;
          
        case 'consultation_data':
          // Получены полные данные консультации
          
          // Устанавливаем сообщения из bulk-ответа
          if (data.messages && Array.isArray(data.messages)) {
            const sortedMessages = data.messages.sort((a, b) => {
              return new Date(a.sent_at) - new Date(b.sent_at);
            });
            
            setMessages(sortedMessages);
            
            // Обновляем время последней синхронизации
            setLastSyncTime(new Date());
            
            setTimeout(scrollToBottom, 100);
          }
          
          // Обновляем информацию о консультации, если нужно
          if (data.consultation && onConsultationUpdated) {
            onConsultationUpdated(data.consultation);
          }
          break;
          
        case 'error':
          // Сообщение об ошибке от сервера
          toast.error(data.message || t('unknownError'));
          break;
          
        default:
      }
    } catch (error) {
    }
  };

  // Функция для планирования переподключения с экспоненциальной задержкой
  const scheduleReconnect = () => {
    // Если отключены переподключения или компонент размонтирован - не пытаемся переподключаться
    if (disableReconnect.current || isUnmounting.current) {
      return;
    }
    
    // Увеличиваем счетчик попыток переподключения
    setReconnectAttempts(prev => {
      const newCount = prev + 1;
      
      // Экспоненциальная задержка с верхним пределом 2 минуты
      // Base * 2^attempt с ограничением максимума
      const baseDelay = 1000; // 1 секунда базовой задержки
      const maxDelay = 120000; // 2 минуты максимальной задержки
      
      // Рассчитываем задержку с небольшим случайным смещением (±10%)
      const exponentialDelay = Math.min(baseDelay * Math.pow(1.5, newCount), maxDelay);
      const jitter = (Math.random() * 0.2 - 0.1) * exponentialDelay; // ±10% случайное смещение
      const delay = Math.round(exponentialDelay + jitter);
      
      
      // Если максимальное количество попыток не достигнуто - планируем переподключение
      if (newCount <= maxReconnectAttempts) {
        // Очищаем предыдущий таймер переподключения
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Устанавливаем новый таймер
        reconnectTimeoutRef.current = setTimeout(() => {
          // Проверяем, что компонент не размонтирован и переподключение не отключено
          if (!isUnmounting.current && !disableReconnect.current) {
            initWebSocket();
          } else {
          }
        }, delay);
      } else {
        updateConnectionStatus('error', t('connectionTimeout'));
        disableReconnect.current = true;
      }
      
      return newCount;
    });
  };

  // Отметка всех сообщений в консультации как прочитанных
  const markAllMessages = async () => {
    if (!consultationId || !user?.id) return;
    
    const wsConnection = await webSocketService.getConsultationConnection(
      consultationId,
      handleWebSocketMessage,
      updateConnectionStatus
    );
    
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      try {
        wsConnection.send(JSON.stringify({
          type: 'mark_read'
        }));
      } catch (error) {
      }
    }
  };

  // Отметка сообщения как прочитанного через WebSocket
  const markMessageReadViaREST = async (messageId) => {
    const wsConnection = await webSocketService.getConsultationConnection(
      consultationId,
      handleWebSocketMessage,
      updateConnectionStatus
    );
    
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
      try {
        wsConnection.send(JSON.stringify({
          type: 'read_receipt',
          message_id: messageId
        }));
        
        // Обновляем состояние сообщений сразу
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.id === messageId ? { ...msg, is_read: true } : msg
          )
        );
      } catch (error) {
      }
    }
  };

  // Обработчик клавиш в поле ввода (отправка по Enter)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Обработка отправки сообщения
  const handleSendMessage = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;
    
    // Если есть прикрепленные файлы, используем функцию отправки с файлами
    if (attachedFiles.length > 0) {
      await sendMessageWithFiles();
      return;
    }
    
    // Очищаем поле ввода
    const messageText = inputValue;
    setInputValue('');
    
    // Фокусируемся на текстовом поле для продолжения ввода
    textareaRef.current?.focus();
    
    // Анимация отправки
    try {
      await sendMessage(messageText);
      
      // Добавляем анимацию при успешной отправке
      const chatContainer = document.querySelector('.chat-messages-container');
      if (chatContainer) {
        chatContainer.classList.add('message-sent-animation');
        setTimeout(() => {
          chatContainer.classList.remove('message-sent-animation');
        }, 500);
      }
    } catch (error) {
      toast.error(t('messageSendFailed'));
      
      // Возвращаем текст в поле ввода при ошибке
      setInputValue(messageText);
    }
  };

  // Функции для работы с файлами
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    
    // Проверяем каждый файл
    const validFiles = files.filter(file => {
      // Проверка размера (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: ${t('fileTooLarge')}`);
        return false;
      }
      
      // Проверка типа файла
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name}: ${t('invalidFileType')}`);
        return false;
      }
      
      return true;
    });
    
    if (validFiles.length > 0) {
      setAttachedFiles(prev => [...prev, ...validFiles]);
      toast.success(`${t('fileUploaded')}: ${validFiles.map(f => f.name).join(', ')}`);
    }
    
    // Очищаем input
    event.target.value = '';
  };

  const removeFile = (index) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessageWithFiles = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;
    
    setIsUploading(true);
    
    try {
      if (attachedFiles.length > 0) {
        // Сначала загружаем все файлы и получаем их данные
        const uploadPromises = attachedFiles.map(file => 
          consultationsApi.uploadFile(consultationId, file)
        );
        
        const uploadedFiles = await Promise.all(uploadPromises);
        
        
        // Отправляем сообщение с полными данными файлов
        await consultationsApi.sendMessageWithFiles(
          consultationId,
          inputValue.trim(),
          uploadedFiles  // Передаем полные данные файлов
        );
      } else {
        // Отправляем обычное сообщение
        await sendMessage(inputValue.trim());
      }
      
      // Очищаем поля
      setInputValue('');
      setAttachedFiles([]);
      
      // Прокручиваем к последнему сообщению
      setTimeout(scrollToBottom, 100);
      
    } catch (error) {
      toast.error(t('uploadError'));
    } finally {
      setIsUploading(false);
    }
  };

  // Обработка ошибок рендеринга
  const [renderError, setRenderError] = useState(null);
  
  try {
    if (renderError) {
      return (
        <div className="flex flex-col justify-center items-center h-full p-5 bg-danger-50 rounded-lg">
          <div className="mb-3 text-danger">
            <i className="fas fa-exclamation-triangle text-3xl"></i>
          </div>
          <h3 className="text-xl font-medium mb-2">Ошибка отображения чата</h3>
          <p className="text-gray-600 text-center mb-4">{renderError.message || t('unknownError')}</p>
          <Button 
            color="primary" 
            onClick={() => window.location.reload()}
          >
            Перезагрузить страницу
          </Button>
        </div>
      );
    }
    
    if (isSending || !consultation) {
      return (
        <div className="h-full flex flex-col justify-center items-center bg-white rounded-lg p-6">
          <Spinner size="lg" color="primary" />
          <p className="mt-4 text-gray-600">Загрузка чата...</p>
          <p className="text-xs text-gray-400 mt-2">Если загрузка занимает слишком много времени, попробуйте обновить страницу</p>
        </div>
      );
    }
    
    return (
      <SafeRender
        fallback={
          <Card className="h-full flex flex-col">
            <CardHeader className="border-b">
              <div className="flex justify-between items-center w-full">
                <h3 className="text-lg">Чат консультации</h3>
                <Button 
                  color="primary" 
                  size="sm" 
                  onPress={() => window.location.reload()}
                >
                  Перезагрузить
                </Button>
              </div>
            </CardHeader>
            <CardBody className="flex-grow flex items-center justify-center">
              <div className="text-center">
                <div className="text-danger mb-3">
                  <i className="fas fa-exclamation-triangle text-3xl"></i>
                </div>
                <h3 className="text-xl mb-2">Ошибка отображения чата</h3>
                <p className="text-gray-600 mb-4">Произошла неожиданная ошибка при загрузке чата</p>
              </div>
            </CardBody>
          </Card>
        }
      >
        <Card className="h-full flex flex-col bg-gradient-to-b from-gray-50 to-white shadow-lg border-none overflow-hidden">
          <CardHeader className="px-4 py-3 flex justify-between items-center bg-gradient-to-r from-primary-50 to-blue-50 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-primary-100 p-2 mr-3">
                {isDoctor ? (
                  <i className="fas fa-user-md text-primary-500"></i>
                ) : (
                  <i className="fas fa-stethoscope text-primary-500"></i>
                )}
              </div>
              <div>
                <h3 className="text-lg font-medium">
                  {isDoctor ? patientName : doctorName}
                </h3>
                <div className="flex items-center">
                  <Badge 
                    color={consultation?.status === 'active' ? 'success' : 
                          consultation?.status === 'completed' ? 'default' : 'warning'} 
                    variant="flat"
                    className="mr-2"
                  >
                    {consultation?.status === 'active' ? t('statusActive') : 
                      consultation?.status === 'completed' ? t('statusCompleted') : t('statusWaiting')}
                  </Badge>
                </div>
              </div>
            </div>
            
            {/* Индикатор статуса соединения */}
            {errorMessage && connectionStatus !== 'connected' && (
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm animate-fade-in">
                <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-gray-600">{errorMessage}</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {/* Кнопка отзыва - показываем только если консультация завершена, пользователь - пациент и отзыв еще НЕ оставлен */}
              {isPatient && 
               consultation?.status === 'completed' && 
               !hasReview && 
               !localStorage.getItem(`review_added_${consultationId}`) && (
                <Button 
                  size="sm" 
                  color="warning" 
                  variant="flat"
                  className="animate-pulse hover:animate-none transition-all duration-300"
                  onPress={() => {
                    // Дополнительная проверка перед открытием
                    const reviewKey = `review_added_${consultationId}`;
                    if (localStorage.getItem(reviewKey) === 'true') {
                      return;
                    }
                    
                    if (window.showReviewModal) {
                      window.showReviewModal();
                    } else {
                      toast.error(t('reviewFormError'));
                    }
                  }}
                >
                  Оставить отзыв
                </Button>
              )}
              
              {isDoctor && consultation?.status === 'active' && (
                <Button 
                  size="sm" 
                  color="danger" 
                  variant="light"
                  className="hover:bg-danger-100 transition-all duration-300"
                  onPress={() => {
                    setIsCompleteModalOpen(true);
                  }}
                >
                  Завершить
                </Button>
              )}
              
              <Button 
                size="sm" 
                color="primary" 
                variant="light"
                isIconOnly
                aria-label="Обновить чат"
                onPress={initializeChat}
                className="rounded-full"
              >
                <i className="fas fa-sync-alt"></i>
              </Button>
            </div>
          </CardHeader>
          
          <CardBody className="p-0 flex-grow flex flex-col overflow-hidden">
            {isPatient && consultation?.message_limit > 0 && (
              <div className="px-4 py-2 bg-default-50 border-b border-default-100">
                <div className="flex justify-between items-center text-xs text-default-600 mb-1">
                  <span>Лимит сообщений: {patientMessageCount} из {consultation.message_limit}</span>
                  <span>{messageCountProgress}%</span>
                </div>
                <div className="w-full bg-default-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      messageCountProgress > 80 ? 'bg-danger-500' : 
                      messageCountProgress > 60 ? 'bg-warning-500' : 'bg-success-500'
                    }`}
                    style={{ width: `${messageCountProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {isSending ? (
              <div className="flex-grow flex items-center justify-center p-4">
                <Spinner label={t('loadingMessages')} color="primary" labelColor="primary" />
              </div>
            ) : (
              <>
                <div className="flex-grow overflow-y-auto p-4 chat-messages-container bg-gray-50 bg-opacity-50">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-6">
                      <div className="w-20 h-20 mb-4 flex items-center justify-center rounded-full bg-gray-100">
                        <i className="fas fa-comments text-2xl text-gray-400"></i>
                      </div>
                      <p className="text-lg mb-2">{t('noMessages')}</p>
                      <p className="text-sm">
                        {canSendMessages ? 
                          t('startConversation') : 
                          t('waitForConsultation')}
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message, index) => (
                        <ChatMessage
                          key={message.id || `temp-${index}`}
                          message={message}
                          currentUserId={user?.id}
                          patientAvatar={patientAvatar}
                          doctorAvatar={doctorAvatar}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
                
                <div className="p-4 border-t border-gray-100 bg-white relative">
                  {errorMessage && connectionStatus !== 'connected' && (
                    <div className="absolute -top-8 left-0 right-0 mx-auto w-max px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-xs animate-fade-in shadow-sm">
                      {errorMessage}
                    </div>
                  )}
                  
                  {/* Блок прикрепленных файлов */}
                  {attachedFiles.length > 0 && (
                    <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <i className="fas fa-file-alt text-primary-500"></i>
                        <span className="text-sm font-medium text-gray-700">
                          {t('attachedFiles')} ({attachedFiles.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {attachedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <i className="fas fa-file text-gray-400 flex-shrink-0"></i>
                              <span className="text-sm truncate">{file.name}</span>
                              <span className="text-xs text-gray-400 flex-shrink-0">
                                ({(file.size / 1024 / 1024).toFixed(2)} MB)
                              </span>
                            </div>
                            <Button
                              size="sm"
                              color="danger"
                              variant="light"
                              isIconOnly
                              onPress={() => removeFile(index)}
                              className="flex-shrink-0"
                            >
                              <i className="fas fa-times"></i>
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Textarea
                        ref={textareaRef}
                        fullWidth
                        placeholder={
                          consultation?.status === 'completed' ? t('consultationCompleted') :
                          !canSendMessages ? t('messagingDisabled') :
                          isMessageLimitReached ? t('messageLimitReached') :
                          t('enterMessage')
                        }
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={!canSendMessages || isMessageLimitReached}
                        minRows={1}
                        maxRows={4}
                        className={`transition-all duration-300 ${!canSendMessages ? 'opacity-50' : 'hover:border-primary-300 focus:border-primary-500'}`}
                      />
                    </div>
                    
                    {/* Кнопка прикрепления файлов */}
                    <Button
                      color="default"
                      variant="light"
                      isIconOnly
                      size="lg"
                      className="min-w-12 h-12 hover:bg-gray-100 transition-all duration-300"
                      onPress={() => fileInputRef.current?.click()}
                      disabled={!canSendMessages || isMessageLimitReached}
                    >
                      <i className="fas fa-paperclip"></i>
                    </Button>
                    
                    <Button
                      color="primary"
                      isIconOnly
                      size="lg"
                      className={`min-w-12 h-12 shadow-md hover:shadow-lg transition-all duration-300 ${
                        !canSendMessages || (!inputValue.trim() && attachedFiles.length === 0) ? 'opacity-50' : 'animate-subtle-pulse'
                      }`}
                      onPress={() => {
                        if (attachedFiles.length > 0) {
                          sendMessageWithFiles();
                        } else {
                          handleSendMessage();
                        }
                      }}
                      disabled={!canSendMessages || (!inputValue.trim() && attachedFiles.length === 0) || isMessageLimitReached || isUploading}
                      isLoading={isUploading}
                    >
                      <i className="fas fa-paper-plane"></i>
                    </Button>
                  </div>
                  
                  {/* Скрытый input для выбора файлов */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {isMessageLimitReached && (
                    <div className="mt-2 text-center text-xs text-danger-500 animate-pulse">
                      <i className="fas fa-exclamation-circle mr-1"></i>
                      {t('messageLimitExceeded')}
                    </div>
                  )}
                  
                  {/* Сообщение о завершенной консультации */}
                  {consultation?.status === 'completed' && !canSendMessages && (
                    <div className="mt-2 text-center text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border">
                      <i className="fas fa-check-circle mr-2 text-success-500"></i>
                      {t('consultationCompleted')}. {t('createNewConsultationForQuestions')}.
                    </div>
                  )}
                </div>
              </>
            )}
          </CardBody>
          
          <SafeStyles />
        </Card>
        
        {/* Модальное окно подтверждения завершения консультации */}
        <Modal 
          isOpen={isCompleteModalOpen} 
          onClose={() => {
            setIsCompleteModalOpen(false);
          }}
          className="z-50"
        >
          <ModalContent>
            <ModalHeader className="flex flex-col gap-1">
              {t('completeConsultation')}
            </ModalHeader>
            <ModalBody>
              <p>
                {t('confirmCompleteConsultation')}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {t('patientCanLeaveReview')}
              </p>
            </ModalBody>
            <ModalFooter>
              <Button 
                color="default" 
                variant="light" 
                onPress={() => {
                  setIsCompleteModalOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button 
                color="danger" 
                onPress={() => {
                  completeConsultation();
                }}
              >
                Завершить
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </SafeRender>
    );
  } catch (error) {
    // Сохраняем ошибку в состоянии для следующего рендера
    setRenderError(error);
    
    // Отображаем минимальную заглушку в случае ошибки
    return (
      <div className="flex justify-center items-center h-64 bg-danger-50 rounded-lg">
        <div className="text-center p-5">
          <div className="mb-3 text-danger">
            <i className="fas fa-exclamation-triangle text-3xl"></i>
          </div>
          <p className="text-gray-700">Ошибка отображения чата</p>
          <Button 
            color="primary" 
            size="sm"
            className="mt-3"
            onClick={() => window.location.reload()}
          >
            Перезагрузить
          </Button>
        </div>
      </div>
    );
  }
}

export default ConsultationChat; 