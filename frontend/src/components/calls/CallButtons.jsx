import React, { useState, useEffect } from 'react';
import { Button, Tooltip } from '@nextui-org/react';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import useAuthStore from '../../stores/authStore';
import { useCalls } from '../../contexts/CallsContext';

const CallButtons = ({ 
  consultationId, 
  consultation, 
  onCallInitiated,
  onCallEnded,
  forceResetCall = false // Новый проп для принудительного сброса
}) => {
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const { user } = useAuthStore();
  const { startOutgoingCall, endOutgoingCall } = useCalls();

  // Проверяем, может ли пользователь инициировать звонки
  const canInitiateCall = consultation?.status === 'active' && 
    (user?.id === consultation?.patient_id || user?.id === consultation?.doctor_id);

  // Определяем получателя звонка
  const getReceiverId = () => {
    if (user?.id === consultation?.patient_id) {
      return consultation?.doctor_id;
    } else if (user?.id === consultation?.doctor_id) {
      return consultation?.patient_id;
    }
    return null;
  };

  // Принудительный сброс состояния звонка
  useEffect(() => {
    if (forceResetCall) {
      // Сохраняем текущее состояние для проверки
      const hadActiveCall = activeCall !== null;
      const wasWaitingForAnswer = waitingForAnswer;
      const wasInitiating = isInitiatingCall;
      
      // Сбрасываем состояния
      setActiveCall(null);
      setWaitingForAnswer(false);
      setIsInitiatingCall(false);
      
      // Убираем глобальное уведомление только если был активный звонок
      if (hadActiveCall || wasWaitingForAnswer || wasInitiating) {
        endOutgoingCall();
      }
    }
  }, [forceResetCall, endOutgoingCall]);

  // Проверяем активный звонок
  useEffect(() => {
    // Флаг для отслеживания монтирования компонента
    let mounted = true;
    
    const checkActiveCall = async () => {
      // Проверяем только если компонент все еще смонтирован
      if (!mounted) return;
      
      // Проверяем только если есть консультация и она активна
      if (!consultationId || !consultation || consultation.status !== 'active') {
        // Если консультация не активна, полностью сбрасываем состояние только один раз
        if (mounted && activeCall) {
          setActiveCall(null);
          endOutgoingCall();
        }
        if (mounted && waitingForAnswer) {
          setWaitingForAnswer(false);
        }
        if (mounted && isInitiatingCall) {
          setIsInitiatingCall(false);
        }
        return;
      }
      
      try {
        const response = await api.get(`/api/calls/active/${consultationId}`);
        
        // Проверяем что компонент все еще смонтирован перед обновлением состояния
        if (!mounted) return;
        
        // Проверяем, что звонок действительно активен (не завершен)
        if (response.data && response.data.status === 'active') {
          setActiveCall(response.data);
          // Если звонок принят, убираем состояние ожидания
          if (response.data.status === 'active' && waitingForAnswer) {
            setWaitingForAnswer(false);
          }
        } else {
          // Звонок не активен, сбрасываем все состояния только если они установлены
          if (activeCall) {
            setActiveCall(null);
            endOutgoingCall();
          }
          if (waitingForAnswer) {
            setWaitingForAnswer(false);
          }
          if (isInitiatingCall) {
            setIsInitiatingCall(false);
          }
        }
      } catch (error) {
        // Если компонент размонтирован, не обрабатываем ошибку
        if (!mounted) return;
        
        // Если активного звонка нет (404), сбрасываем состояние
        if (error.response?.status === 404) {
          if (activeCall) {
            setActiveCall(null);
            endOutgoingCall();
          }
          if (waitingForAnswer) {
            setWaitingForAnswer(false);
          }
          if (isInitiatingCall) {
            setIsInitiatingCall(false);
          }
        }
      }
    };

    // Проверяем только при изменении visibility или focus
    if (consultation?.status === 'active') {
      checkActiveCall();
    }
    
    // Event-driven проверка вместо интервала
    const handleVisibilityChange = () => {
      if (!document.hidden && consultation?.status === 'active' && mounted) {
        checkActiveCall();
      }
    };
    
    const handleFocus = () => {
      if (consultation?.status === 'active' && mounted) {
        checkActiveCall();
      }
    };
    
    // Добавляем event listeners только если консультация активна
    if (consultation?.status === 'active') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
    }
    
    return () => {
      mounted = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [consultationId, consultation?.status]); // Убираем лишние зависимости чтобы избежать лишних перерендеров

  const initiateCall = async (callType) => {
    if (!canInitiateCall) {
      toast.error('Звонки доступны только для активных консультаций');
      return;
    }

    const receiverId = getReceiverId();
    if (!receiverId) {
      toast.error('Не удалось определить получателя звонка');
      return;
    }

    setIsInitiatingCall(true);
    setWaitingForAnswer(true);
    
    try {
      const response = await api.post('/api/calls/initiate', {
        consultation_id: consultationId,
        receiver_id: receiverId,
        call_type: callType
      });

      setActiveCall(response.data);
      
      // Показываем глобальное уведомление о том что звонок идет
      startOutgoingCall(response.data);
      
      toast.success(`${callType === 'video' ? 'Видео' : 'Аудио'} звонок инициирован`);
      
      if (onCallInitiated) {
        onCallInitiated(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка при инициации звонка');
      setWaitingForAnswer(false);
    } finally {
      setIsInitiatingCall(false);
    }
  };

  const endCall = async () => {
    if (!activeCall) return;

    try {
      await api.post(`/api/calls/${activeCall.id}/end`);
      
      // Убираем глобальное уведомление
      endOutgoingCall();
      
      setActiveCall(null);
      setWaitingForAnswer(false);
      toast.success('Звонок завершен');
      
      if (onCallEnded) {
        onCallEnded();
      }
    } catch (error) {
      toast.error('Ошибка при завершении звонка');
      
      // Убираем глобальное уведомление даже при ошибке
      endOutgoingCall();
      
      // Даже если запрос не прошел, сбрасываем состояние
      setActiveCall(null);
      setWaitingForAnswer(false);
      if (onCallEnded) {
        onCallEnded();
      }
    }
  };

  // Если есть активный звонок, показываем кнопку завершения
  if (activeCall) {
    return (
      <div className="flex gap-3 items-center">
        {waitingForAnswer ? (
          <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-2xl border border-blue-200/50 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              <span className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Ожидание ответа...
              </span>
            </div>
            <Tooltip content="Отменить звонок">
              <Button
                isIconOnly
                size="sm"
                onPress={endCall}
                className="w-8 h-8 min-w-8 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-lg border border-red-400/50 transition-all duration-300 hover:scale-110"
              >
                <PhoneOff size={14} />
              </Button>
            </Tooltip>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 rounded-2xl border border-green-200/50 shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Звонок активен
                </span>
              </div>
              <Tooltip content="Завершить звонок">
                <Button
                  isIconOnly
                  size="sm"
                  onPress={endCall}
                  className="w-8 h-8 min-w-8 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-lg border border-red-400/50 transition-all duration-300 hover:scale-110"
                >
                  <PhoneOff size={14} />
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Если звонок недоступен, не показываем кнопки
  if (!canInitiateCall) {
    return null;
  }

  return (
    <div className="flex gap-3">
      <Tooltip content="Аудиозвонок">
        <Button
          isIconOnly
          size="sm"
          onPress={() => initiateCall('audio')}
          isLoading={isInitiatingCall}
          disabled={isInitiatingCall}
          className="w-10 h-10 min-w-10 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-lg border border-green-400/50 transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Phone size={18} />
        </Button>
      </Tooltip>
      
      <Tooltip content="Видеозвонок">
        <Button
          isIconOnly
          size="sm"
          onPress={() => initiateCall('video')}
          isLoading={isInitiatingCall}
          disabled={isInitiatingCall}
          className="w-10 h-10 min-w-10 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg border border-blue-400/50 transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Video size={18} />
        </Button>
      </Tooltip>
    </div>
  );
};

export default CallButtons; 