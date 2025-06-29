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
  const [globalCallsWebSocket, setGlobalCallsWebSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const { user } = useAuthStore();
  const reconnectTimeoutRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);

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

    let isConnecting = false;
    
    const connectToGlobalCalls = () => {
      // Предотвращаем множественные подключения
      if (isConnecting || connectionStatus === 'connecting') {
        console.log('⚠️ Уже подключаемся, пропускаем попытку');
        return;
      }
      
      // Проверяем если уже есть активное соединение
      if (globalCallsWebSocket && globalCallsWebSocket.readyState === WebSocket.OPEN) {
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
      if (globalCallsWebSocket) {
        globalCallsWebSocket.close();
        setGlobalCallsWebSocket(null);
      }

      const ws = new WebSocket(wsUrl);
      setGlobalCallsWebSocket(ws);

      ws.onopen = () => {
        isConnecting = false;
        console.log('✅ Глобальный WebSocket для звонков успешно подключен');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        
        // Очищаем предыдущий keep-alive если есть
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
        }
        
        // Отправляем keep-alive сообщение каждые 30 секунд (возвращаем разумный интервал)
        keepAliveIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'keep-alive', timestamp: Date.now() }));
            console.log('💓 Keep-alive отправлен');
          } else {
            clearInterval(keepAliveIntervalRef.current);
            keepAliveIntervalRef.current = null;
          }
        }, 30000);

        // Показываем уведомление об успешном подключении только при первом подключении
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
            // Получили входящий звонок
            setIncomingCall(data.call);
            
            // Показываем браузерное уведомление
            showBrowserNotification(data.call);
            
            // Воспроизводим звук
            playRingtone();
            
          } else if (data.type === 'call_accepted') {
            console.log('✅ Звонок принят');
            // Звонок принят
            setIncomingCall(null);
            stopRingtone();
          } else if (data.type === 'call_ended' || data.type === 'call_rejected') {
            console.log('❌ Звонок завершен/отклонен');
            // Звонок завершен или отклонен
            setIncomingCall(null);
            stopRingtone();
          }
        } catch (error) {
          console.error('❌ Error processing global call message:', error);
        }
      };

      ws.onclose = (event) => {
        isConnecting = false;
        console.log('🔌 WebSocket соединение закрыто:', event.code, event.reason);
        setGlobalCallsWebSocket(null);
        setConnectionStatus('disconnected');
        
        // Очищаем keep-alive interval
        if (keepAliveIntervalRef.current) {
          clearInterval(keepAliveIntervalRef.current);
          keepAliveIntervalRef.current = null;
        }
        
        // Переподключение только если это не нормальное закрытие
        const maxAttempts = 5; // Уменьшаем количество попыток
        if (event.code !== 1000 && reconnectAttempts < maxAttempts) { // 1000 = нормальное закрытие
          const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempts), 15000); // Более мягкая прогрессия
          console.log(`🔄 Переподключение через ${delay}ms (попытка ${reconnectAttempts + 1}/${maxAttempts})`);
          
          // Очищаем предыдущий таймер если есть
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectToGlobalCalls();
          }, delay);
          
          // Показываем предупреждение только при первой потере соединения
          if (reconnectAttempts === 0) {
            toast.error('⚠️ Потеряно соединение с сервером звонков. Переподключение...', {
              duration: 3000,
              position: 'bottom-right',
            });
          }
        } else if (reconnectAttempts >= maxAttempts) {
          console.log('❌ Превышено максимальное количество попыток переподключения');
          toast.error('❌ Не удалось подключиться к серверу звонков.', {
            duration: 5000,
            position: 'bottom-right',
          });
        }
      };

      ws.onerror = (error) => {
        isConnecting = false;
        console.error('❌ Global calls WebSocket error:', error);
        setConnectionStatus('disconnected');
      };
    };

    // Подключаемся сразу при загрузке
    connectToGlobalCalls();

    return () => {
      console.log('🧹 Очистка CallsProvider...');
      clearTimeouts();
      isConnecting = false;
      
      if (globalCallsWebSocket) {
        globalCallsWebSocket.close();
        setGlobalCallsWebSocket(null);
      }
      stopRingtone();
    };
  }, [user?.id]); // Убираем зависимости от connectionStatus и reconnectAttempts чтобы избежать лишних перерендеров

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
      
      // Автоматически останавливаем через 30 секунд
      ringtoneTimeoutRef.current = setTimeout(() => {
        stopRingtone();
      }, 30000);
      
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

        // Автоматически закрываем через 30 секунд
        setTimeout(() => notification.close(), 30000);
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
      await api.post(`/api/calls/${callId}/reject`);
      setIncomingCall(null);
      stopRingtone();
      return true;
    } catch (error) {
      console.error('Error rejecting call:', error);
      toast.error('Ошибка при отклонении звонка');
      return false;
    }
  };

  const value = {
    incomingCall,
    acceptCall,
    rejectCall,
    stopRingtone,
    connectionStatus,
    reconnectAttempts
  };

  return (
    <CallsContext.Provider value={value}>
      {children}
    </CallsContext.Provider>
  );
};