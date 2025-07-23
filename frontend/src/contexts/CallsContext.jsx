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

  // Подключение к глобальному WebSocket для всех звонков пользователя
  useEffect(() => {
    if (!user?.id) return;

    let currentWs = null; // Локальная ссылка на текущий WebSocket
    let isConnecting = false;
    
    const connectToGlobalCalls = () => {
      // Предотвращаем множественные подключения
      if (isConnecting) {
        return;
      }
      
      // Проверяем если уже есть активное соединение
      if (currentWs && currentWs.readyState === WebSocket.OPEN) {
        return;
      }
      
      isConnecting = true;
      setConnectionStatus('connecting');
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/calls/ws/incoming/${user.id}?token=${localStorage.getItem('auth_token')}`;

      // Закрываем предыдущее соединение если есть
      if (currentWs) {
        isManualCloseRef.current = true;
        try {
          currentWs.close(1000, 'Создание нового соединения');
        } catch (error) {
          // Игнорируем ошибки закрытия
        }
      }

      const ws = new WebSocket(wsUrl);
      currentWs = ws; // Сохраняем локальную ссылку
      setGlobalCallsWebSocket(ws); // Обновляем состояние

              // Увеличенный таймаут для соединения
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            isConnecting = false;
            ws.close();
          }
        }, 20000);

      ws.onopen = () => {
        isConnecting = false;
        clearTimeout(connectionTimeout);
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        
        // Очищаем предыдущий keep-alive если есть
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
        }
        
        // Keep-alive каждые 60 секунд (уменьшили частоту)
        keepAliveIntervalRef.current = setInterval(() => {
          if (currentWs && currentWs.readyState === WebSocket.OPEN) {
            currentWs.send(JSON.stringify({ type: 'keep-alive', timestamp: Date.now() }));
          } else {
            clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
          }
        }, 60000);

        // Показываем уведомление об успешном подключении только при множественных попытках
        if (reconnectAttempts > 1) {
          toast.success('📞 Соединение восстановлено', {
            duration: 3000,
            position: 'bottom-right',
          });
        }
      };

      ws.onmessage = (event) => {
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
      };

      ws.onclose = (event) => {
        // Убираем keep-alive интервал
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }
        
        isConnecting = false;
        setConnectionStatus('disconnected');
        
        // Переподключаемся только если это не программное закрытие и пользователь онлайн
        // Ограничиваем количество попыток переподключения
        if (!isManualCloseRef.current && navigator.onLine && reconnectAttempts < 5) {
          const newReconnectAttempts = reconnectAttempts + 1;
          setReconnectAttempts(newReconnectAttempts);
          
          // Увеличенная экспоненциальная задержка с максимумом в 60 секунд
          const delay = Math.min(3000 * Math.pow(2, newReconnectAttempts - 1), 60000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isManualCloseRef.current) {
              connectToGlobalCalls();
            }
          }, delay);
        }
        
        // Сбрасываем флаг программного закрытия
        setTimeout(() => {
          isManualCloseRef.current = false;
        }, 1000);
      };

      ws.onerror = (error) => {
        isConnecting = false;
        setConnectionStatus('disconnected');
      };
    };

    // Функция очистки для размонтирования или смены пользователя
    const cleanup = () => {
      isManualCloseRef.current = true;
      clearTimeouts();
      
      if (currentWs) {
        currentWs.close(1000, 'Компонент размонтирован');
        currentWs = null;
      }
      
      setGlobalCallsWebSocket(null);
      setConnectionStatus('disconnected');
    };

    // Инициируем подключение
    connectToGlobalCalls();

    // Обработчики событий онлайн/офлайн
    const handleOnline = () => {
      if (!currentWs || currentWs.readyState !== WebSocket.OPEN) {
        // Сбрасываем счетчик попыток при восстановлении интернета
        setReconnectAttempts(0);
        setTimeout(() => connectToGlobalCalls(), 2000);
      }
    };

    const handleOffline = () => {
      setConnectionStatus('disconnected');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Страница стала видимой - проверяем соединение только если прошло время
        if (!currentWs || currentWs.readyState !== WebSocket.OPEN) {
          // Добавляем задержку и проверку на количество попыток
          if (reconnectAttempts < 3) {
            setTimeout(() => connectToGlobalCalls(), 2000);
          }
        }
      }
    };

    // Убираем периодическую проверку каждую минуту - она создает лишние соединения

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Очистка при размонтировании
    return () => {
      cleanup();
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