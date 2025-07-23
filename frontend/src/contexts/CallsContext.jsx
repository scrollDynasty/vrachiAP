import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { toast } from 'react-hot-toast';
import useAuthStore from '../stores/authStore';
import api from '../api';

const CallsContext = createContext();

export const useCalls = () => {
  const context = useContext(CallsContext);
  if (!context) {
    throw new Error('useCalls must be used within a CallsProvider');
  }
  return context;
};

export const CallsProvider = ({ children }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [outgoingCall, setOutgoingCall] = useState(null); // Добавляем состояние для исходящих звонков
  const [globalCallsWebSocket, setGlobalCallsWebSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { user } = useAuthStore();
  const reconnectTimeoutRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);
  const isManualCloseRef = useRef(false); // Флаг программного закрытия

  // Очистка таймеров при размонтировании
  const clearTimeouts = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  };

  // Подключение к глобальному WebSocket для всех звонков пользователя через централизованный сервис
  useEffect(() => {
    if (!user?.id) return;

    let isActive = true;

    const connectToGlobalCalls = async () => {
      try {
        if (!isActive) return;

        setConnectionStatus('connecting');

        // Импортируем webSocketService динамически
        const webSocketService = (await import('../services/webSocketService')).default;

        // Создаем подключение через централизованный сервис
        const connection = await webSocketService.getCallsConnection(
          user.id,
          (event) => {
            if (!isActive) return;

            try {
              if (!event || !event.data) return;
              
              const data = JSON.parse(event.data);
              if (!data || typeof data !== 'object' || !data.type) return;

              if (data.type === 'incoming_call' && data.call) {
                setIncomingCall(data.call);
                showBrowserNotification(data.call);
                playRingtone();
                
              } else if (data.type === 'call_accepted') {
                setIncomingCall(null);
                setOutgoingCall(null);
                stopRingtone();
              } else if (data.type === 'call_ended') {
                setIncomingCall(null);
                setOutgoingCall(null);
                stopRingtone();
              } else if (data.type === 'call_rejected') {
                setIncomingCall(null);
                setOutgoingCall(null);
                stopRingtone();
                
                toast.error('Звонок был отклонен', {
                  duration: 3000,
                  position: 'top-center',
                });
              }
            } catch (error) {
              // Игнорируем ошибки парсинга
            }
          },
          (status, message) => {
            if (!isActive) return;

            setConnectionStatus(status);
            
            if (status === 'connected') {
              setReconnectAttempts(0);
              
              // Показываем уведомление об успешном подключении только при переподключении
              if (reconnectAttempts > 0) {
                toast.success('📞 Соединение восстановлено', {
                  duration: 2000,
                  position: 'bottom-right',
                });
              }
            } else if (status === 'reconnecting') {
              const attempts = reconnectAttempts + 1;
              setReconnectAttempts(attempts);
            } else if (status === 'error') {
              console.warn('Calls WebSocket connection error:', message);
              setConnectionStatus('disconnected');
            }
          }
        );

        if (connection && isActive) {
          setGlobalCallsWebSocket(connection);
        }

      } catch (error) {
        if (isActive) {
          console.error('Failed to establish calls connection:', error);
          setConnectionStatus('disconnected');
        }
      }
    };

    connectToGlobalCalls();

    // Обработчики событий онлайн/офлайн
    const handleOnline = () => {
      if (isActive) {
        setTimeout(() => connectToGlobalCalls(), 1000);
      }
    };

    const handleOffline = () => {
      if (isActive) {
        setConnectionStatus('disconnected');
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        // Страница стала видимой - проверяем соединение
        setTimeout(() => connectToGlobalCalls(), 500);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Очистка при размонтировании
    return () => {
      isActive = false;
      clearTimeouts();
      
      // Закрываем соединение через централизованный сервис
      if (user?.id) {
        import('../services/webSocketService').then(module => {
          const webSocketService = module.default;
          webSocketService.closeCallsConnection(user.id);
        });
      }
      
      setGlobalCallsWebSocket(null);
      setConnectionStatus('disconnected');
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, reconnectAttempts]);

  // Воспроизведение рингтона
  const ringtoneAudioRef = useRef(null);
  const ringtoneTimeoutRef = useRef(null);
  
  const playRingtone = () => {
    try {
      // Останавливаем предыдущий рингтон если есть
      stopRingtone();
      
      // Создаем новый аудио объект для рингтона
      ringtoneAudioRef.current = new Audio('/sounds/ringtone.mp3');
      ringtoneAudioRef.current.loop = true;
      ringtoneAudioRef.current.volume = 1.0; // Максимальная громкость
      
      // Пытаемся воспроизвести с обработкой ошибок
      const playPromise = ringtoneAudioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Автоматически останавливаем через 60 секунд (увеличиваем время)
            ringtoneTimeoutRef.current = setTimeout(() => {
              stopRingtone();
            }, 60000);
          })
          .catch((error) => {
            // Показываем дополнительное уведомление
            toast('🔊 ВХОДЯЩИЙ ЗВОНОК! Нажмите для воспроизведения звука', {
              icon: '📞',
              duration: 0,
              onClick: () => {
                if (ringtoneAudioRef.current) {
                  ringtoneAudioRef.current.play().catch(() => {});
                }
              },
              style: {
                background: '#EF4444',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
              },
            });
          });
      }
      
          } catch (error) {
        // Игнорируем ошибки рингтона
    }
  };

  const stopRingtone = () => {
    if (ringtoneAudioRef.current) {
      ringtoneAudioRef.current.pause();
      ringtoneAudioRef.current.currentTime = 0;
      ringtoneAudioRef.current = null;
    }
    
    if (ringtoneTimeoutRef.current) {
      clearTimeout(ringtoneTimeoutRef.current);
      ringtoneTimeoutRef.current = null;
    }
  };

  // Показ браузерного уведомления
  const showBrowserNotification = async (call) => {
    try {
      // Проверяем если браузер поддерживает уведомления
      if (!('Notification' in window)) {
        return;
      }
      
      let permission = Notification.permission;
      
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission === 'granted') {
        const notification = new Notification('Входящий звонок', {
          body: `${call.call_type === 'video' ? 'Видеозвонок' : 'Аудиозвонок'} от собеседника`,
          icon: '/favicon.ico',
          tag: `call-${call.id}`,
          requireInteraction: true,
          silent: false
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = `/consultations/${call.consultation_id}`;
          notification.close();
        };

        // Автоматически закрываем через 60 секунд
        setTimeout(() => notification.close(), 60000);
      }
    } catch (error) {
      // Игнорируем ошибки уведомлений
    }
  };

  // Принятие звонка
  const acceptCall = async (callId) => {
    try {
      await api.post(`/api/calls/${callId}/accept`);
      setIncomingCall(null);
      stopRingtone();
      return true;
    } catch (error) {
      toast.error('Ошибка при принятии звонка');
      return false;
    }
  };

  // Отклонение звонка
  const rejectCall = async (callId) => {
    try {
              await api.post(`/api/calls/${callId}/reject`);
      
      setIncomingCall(null);
      setOutgoingCall(null); // Также очищаем исходящий звонок
      stopRingtone();
      return true;
    } catch (error) {
      toast.error('Ошибка при отклонении звонка');
      return false;
    }
  };

  // Функции для управления исходящими звонками
  const startOutgoingCall = (callData) => {
    // Очищаем предыдущее состояние перед новым звонком
    setOutgoingCall(null);
    setIncomingCall(null);
    // Устанавливаем новый звонок с небольшой задержкой для избежания гонки состояний
    setTimeout(() => {
      setOutgoingCall(callData);
    }, 50);
  };

  const endOutgoingCall = () => {
    // Очищаем только если звонок действительно активен
    if (outgoingCall) {
      setOutgoingCall(null);
    }
  };

  const value = {
    incomingCall,
    outgoingCall,
    acceptCall,
    rejectCall,
    stopRingtone,
    connectionStatus,
    reconnectAttempts,
    startOutgoingCall,
    endOutgoingCall
  };

  return (
    <CallsContext.Provider value={value}>
      {children}
    </CallsContext.Provider>
  );
};