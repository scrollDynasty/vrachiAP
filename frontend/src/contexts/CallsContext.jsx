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
        console.log('⚠️ Уже подключаемся, пропускаем попытку');
        return;
      }
      
      // Проверяем если уже есть активное соединение
      if (currentWs && currentWs.readyState === WebSocket.OPEN) {
        console.log('✅ WebSocket уже подключен, пропускаем');
        return;
      }
      
      isConnecting = true;
      console.log('🔄 Попытка подключения к глобальному WebSocket для звонков...');
      setConnectionStatus('connecting');
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/calls/ws/incoming/${user.id}?token=${localStorage.getItem('auth_token')}`;

      // Закрываем предыдущее соединение если есть
      if (currentWs) {
        console.log('🔌 Закрываем предыдущий глобальный WebSocket');
        isManualCloseRef.current = true;
        try {
          currentWs.close(1000, 'Создание нового соединения');
        } catch (error) {
          console.warn('⚠️ Ошибка при закрытии старого WebSocket:', error);
        }
      }

      const ws = new WebSocket(wsUrl);
      currentWs = ws; // Сохраняем локальную ссылку
      setGlobalCallsWebSocket(ws); // Обновляем состояние

      // Таймаут для соединения
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.warn('⚠️ Таймаут подключения WebSocket, закрываем соединение');
          isConnecting = false;
          ws.close();
        }
      }, 15000);

      ws.onopen = () => {
        isConnecting = false;
        clearTimeout(connectionTimeout);
        console.log('✅ Глобальный WebSocket для звонков успешно подключен');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        
        // Очищаем предыдущий keep-alive если есть
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
        }
        
        // Keep-alive и проверка состояния каждые 30 секунд
        keepAliveIntervalRef.current = setInterval(() => {
          if (currentWs && currentWs.readyState === WebSocket.OPEN) {
            currentWs.send(JSON.stringify({ type: 'keep-alive', timestamp: Date.now() }));
            console.log('💓 Keep-alive отправлен');
          } else {
            console.warn('⚠️ WebSocket не открыт при попытке keep-alive, состояние:', currentWs?.readyState);
            clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
            
            // Если соединение потеряно, пытаемся переподключиться
            if (currentWs && currentWs.readyState === WebSocket.CLOSED && !isManualCloseRef.current) {
              console.log('🔄 Обнаружено потерянное соединение, переподключаемся');
              setTimeout(() => connectToGlobalCalls(), 2000);
            }
          }
        }, 30000);

        // Показываем уведомление об успешном подключении только при переподключении
        if (reconnectAttempts > 0) {
          toast.success('📞 Соединение восстановлено', {
            duration: 2000,
            position: 'bottom-right',
          });
        }
      };

      ws.onmessage = (event) => {
        try {
          if (!event || !event.data) return;
          
          const data = JSON.parse(event.data);
          if (!data || typeof data !== 'object' || !data.type) return;

          console.log('📨 Получено сообщение WebSocket:', data);

          if (data.type === 'incoming_call' && data.call) {
            console.log('📞 ВХОДЯЩИЙ ЗВОНОК!', data.call);
            setIncomingCall(data.call);
            showBrowserNotification(data.call);
            playRingtone();
            
          } else if (data.type === 'call_accepted') {
            console.log('✅ Звонок принят');
            setIncomingCall(null);
            setOutgoingCall(null);
            stopRingtone();
          } else if (data.type === 'call_ended') {
            console.log('❌ Звонок завершен');
            setIncomingCall(null);
            setOutgoingCall(null);
            stopRingtone();
          } else if (data.type === 'call_rejected') {
            console.log('🚫 Звонок отклонен');
            setIncomingCall(null);
            setOutgoingCall(null);
            stopRingtone();
            
            toast.error('Звонок был отклонен', {
              duration: 3000,
              position: 'top-center',
            });
          }
        } catch (error) {
          console.error('Ошибка при обработке WebSocket сообщения:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket для входящих звонков закрыт', event.code, event.reason);
        
        // Убираем keep-alive интервал
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }
        
        isConnecting = false;
        setConnectionStatus('disconnected');
        
        // Переподключаемся только если это не программное закрытие и пользователь онлайн
        if (!isManualCloseRef.current && navigator.onLine) {
          const newReconnectAttempts = reconnectAttempts + 1;
          setReconnectAttempts(newReconnectAttempts);
          
          // Экспоненциальная задержка с максимумом в 30 секунд
          const delay = Math.min(1000 * Math.pow(1.5, newReconnectAttempts - 1), 30000);
          
          console.log(`🔄 Переподключение через ${delay}мс (попытка ${newReconnectAttempts})`);
          
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
        console.error('❌ Ошибка WebSocket для входящих звонков:', error);
        isConnecting = false;
        setConnectionStatus('disconnected');
      };
    };

    // Функция очистки для размонтирования или смены пользователя
    const cleanup = () => {
      isManualCloseRef.current = true;
      clearTimeouts();
      
      if (currentWs) {
        console.log('🧹 Закрываем WebSocket при cleanup');
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
      console.log('🌐 Подключение к интернету восстановлено');
      if (!currentWs || currentWs.readyState !== WebSocket.OPEN) {
        setTimeout(() => connectToGlobalCalls(), 1000);
      }
    };

    const handleOffline = () => {
      console.log('📴 Потеряно подключение к интернету');
      setConnectionStatus('disconnected');
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Страница стала видимой - проверяем соединение
        if (!currentWs || currentWs.readyState !== WebSocket.OPEN) {
          console.log('👁️ Страница стала видимой, проверяем WebSocket');
          setTimeout(() => connectToGlobalCalls(), 500);
        }
      }
    };

    // Периодическая проверка каждую минуту
    const healthCheckInterval = setInterval(() => {
      if (!currentWs || currentWs.readyState !== WebSocket.OPEN) {
        console.log('🔍 Периодическая проверка: глобальный WebSocket не работает, восстанавливаем');
        connectToGlobalCalls();
      }
    }, 60000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Очистка при размонтировании
    return () => {
      cleanup();
      clearInterval(healthCheckInterval);
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
      
      console.log('🔊 Воспроизводим рингтон...');
      
      // Создаем новый аудио объект для рингтона
      ringtoneAudioRef.current = new Audio('/sounds/ringtone.mp3');
      ringtoneAudioRef.current.loop = true;
      ringtoneAudioRef.current.volume = 1.0; // Максимальная громкость
      
      // Пытаемся воспроизвести с обработкой ошибок
      const playPromise = ringtoneAudioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('✅ Рингтон успешно воспроизводится');
          })
          .catch((error) => {
            console.warn('⚠️ Автовоспроизведение заблокировано:', error);
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
      
      // Автоматически останавливаем через 60 секунд (увеличиваем время)
      ringtoneTimeoutRef.current = setTimeout(() => {
        stopRingtone();
      }, 60000);
      
    } catch (error) {
      console.error('❌ Error playing ringtone:', error);
    }
  };

  const stopRingtone = () => {
    console.log('🔇 Останавливаем рингтон...');
    
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
        console.log('❌ Браузер не поддерживает уведомления');
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
      console.error('Error showing browser notification:', error);
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
      console.error('Error accepting call:', error);
      toast.error('Ошибка при принятии звонка');
      return false;
    }
  };

  // Отклонение звонка
  const rejectCall = async (callId) => {
    try {
      console.log('📞 Отправляем запрос на отклонение звонка:', callId);
      await api.post(`/api/calls/${callId}/reject`);
      console.log('✅ Звонок отклонен на сервере');
      
      setIncomingCall(null);
      setOutgoingCall(null); // Также очищаем исходящий звонок
      stopRingtone();
      return true;
    } catch (error) {
      console.error('❌ Error rejecting call:', error);
      toast.error('Ошибка при отклонении звонка');
      return false;
    }
  };

  // Функции для управления исходящими звонками
  const startOutgoingCall = (callData) => {
    console.log('📞 Начинаем исходящий звонок:', callData);
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
      console.log('❌ Завершаем исходящий звонок');
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