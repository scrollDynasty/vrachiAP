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

  // Подключение к глобальному WebSocket для всех звонков пользователя
  useEffect(() => {
    if (!user?.id) return;

    const connectToGlobalCalls = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/calls/ws/incoming/${user.id}?token=${localStorage.getItem('auth_token')}`;

      const ws = new WebSocket(wsUrl);
      setGlobalCallsWebSocket(ws);

      ws.onopen = () => {
        console.log('Глобальный WebSocket для звонков подключен');
        
        // Отправляем keep-alive сообщение каждые 30 секунд
        const keepAliveInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'keep-alive' }));
          } else {
            clearInterval(keepAliveInterval);
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          if (!event || !event.data) return;
          
          const data = JSON.parse(event.data);
          if (!data || typeof data !== 'object' || !data.type) return;

          if (data.type === 'incoming_call' && data.call) {
            // Получили входящий звонок
            setIncomingCall(data.call);
            
            // Показываем браузерное уведомление
            showBrowserNotification(data.call);
            
            // Воспроизводим звук
            playRingtone();
          } else if (data.type === 'call_accepted') {
            // Звонок принят
            setIncomingCall(null);
            stopRingtone();
          } else if (data.type === 'call_ended' || data.type === 'call_rejected') {
            // Звонок завершен или отклонен
            setIncomingCall(null);
            stopRingtone();
          }
        } catch (error) {
          console.error('Error processing global call message:', error);
        }
      };

      ws.onclose = () => {
        setGlobalCallsWebSocket(null);
        // Переподключаемся через 3 секунды
        setTimeout(connectToGlobalCalls, 3000);
      };

      ws.onerror = (error) => {
        console.error('Global calls WebSocket error:', error);
      };
    };

    connectToGlobalCalls();

    return () => {
      if (globalCallsWebSocket) {
        globalCallsWebSocket.close();
        setGlobalCallsWebSocket(null);
      }
      stopRingtone();
    };
  }, [user?.id]);

  // Воспроизведение рингтона
  let ringtoneAudio = null;
  
  const playRingtone = () => {
    try {
      // Создаем аудио объект для рингтона
      ringtoneAudio = new Audio('/sounds/ringtone.mp3');
      ringtoneAudio.loop = true;
      ringtoneAudio.volume = 0.7;
      ringtoneAudio.play().catch(() => {
        // Если автовоспроизведение заблокировано, покажем уведомление
        toast('Входящий звонок!', { icon: '📞' });
      });
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  };

  const stopRingtone = () => {
    if (ringtoneAudio) {
      ringtoneAudio.pause();
      ringtoneAudio.currentTime = 0;
      ringtoneAudio = null;
    }
  };

  // Показ браузерного уведомления
  const showBrowserNotification = async (call) => {
    try {
      // Запрашиваем разрешение на уведомления
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      if (Notification.permission === 'granted') {
        const notification = new Notification('Входящий звонок', {
          body: `${call.call_type === 'video' ? 'Видеозвонок' : 'Аудиозвонок'} от собеседника`,
          icon: '/favicon.ico',
          tag: `call-${call.id}`,
          requireInteraction: true,
          actions: [
            { action: 'accept', title: 'Принять' },
            { action: 'decline', title: 'Отклонить' }
          ]
        });

        notification.onclick = () => {
          window.focus();
          // Переходим к странице консультации
          window.location.href = `/consultation/${call.consultation_id}`;
          notification.close();
        };

        // Автоматически закрываем уведомление через 30 секунд
        setTimeout(() => {
          notification.close();
        }, 30000);
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
    stopRingtone
  };

  return (
    <CallsContext.Provider value={value}>
      {children}
    </CallsContext.Provider>
  );
};