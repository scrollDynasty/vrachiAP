import React, { useState, useEffect } from 'react';
import { Button, Tooltip } from '@nextui-org/react';
import { Phone, Video, PhoneOff } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import useAuthStore from '../../stores/authStore';

const CallButtons = ({ 
  consultationId, 
  consultation, 
  onCallInitiated,
  onCallEnded 
}) => {
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const { user } = useAuthStore();

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

  // Проверяем активный звонок
  useEffect(() => {
    const checkActiveCall = async () => {
      // Проверяем только если есть консультация и она активна
      if (!consultationId || !consultation || consultation.status !== 'active') {
        setActiveCall(null);
        return;
      }
      
      try {
        const response = await api.get(`/api/calls/active/${consultationId}`);
        // Проверяем, что звонок действительно активен (не завершен)
        if (response.data && response.data.status === 'active') {
          setActiveCall(response.data);
        } else {
          setActiveCall(null);
        }
      } catch (error) {
        // Если активного звонка нет (404), сбрасываем состояние
        if (error.response?.status === 404) {
          setActiveCall(null);
        } else {
          console.error('Ошибка при проверке активного звонка:', error);
        }
      }
    };

    // Запускаем только если консультация активна
    if (consultation?.status === 'active') {
      checkActiveCall();
      
      // Проверяем каждые 5 секунд только для активных консультаций
      const interval = setInterval(checkActiveCall, 5000);
      
      return () => clearInterval(interval);
    } else {
      // Если консультация не активна, сбрасываем активный звонок
      setActiveCall(null);
    }
  }, [consultationId, consultation]);

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
      toast.success(`${callType === 'video' ? 'Видео' : 'Аудио'} звонок инициирован`);
      
      if (onCallInitiated) {
        onCallInitiated(response.data);
      }
    } catch (error) {
      console.error('Ошибка при инициации звонка:', error);
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
      setActiveCall(null);
      setWaitingForAnswer(false);
      toast.success('Звонок завершен');
      
      if (onCallEnded) {
        onCallEnded();
      }
    } catch (error) {
      console.error('Ошибка при завершении звонка:', error);
      toast.error('Ошибка при завершении звонка');
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
      <div className="flex gap-2">
        {waitingForAnswer ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
            <span className="text-sm text-gray-600">Ожидание ответа...</span>
            <Tooltip content="Отменить звонок">
              <Button
                color="danger"
                variant="flat"
                size="sm"
                isIconOnly
                onPress={endCall}
                className="bg-red-500 text-white hover:bg-red-600"
              >
                <PhoneOff size={16} />
              </Button>
            </Tooltip>
          </div>
        ) : (
          <Tooltip content="Завершить звонок">
            <Button
              color="danger"
              variant="flat"
              size="sm"
              isIconOnly
              onPress={endCall}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              <PhoneOff size={16} />
            </Button>
          </Tooltip>
        )}
      </div>
    );
  }

  // Если звонок недоступен, не показываем кнопки
  if (!canInitiateCall) {
    return null;
  }

  return (
    <div className="flex gap-2">
      <Tooltip content="Аудиозвонок">
        <Button
          color="success"
          variant="flat"
          size="sm"
          isIconOnly
          onPress={() => initiateCall('audio')}
          isLoading={isInitiatingCall}
          disabled={isInitiatingCall}
          className="bg-green-500 text-white hover:bg-green-600"
        >
          <Phone size={16} />
        </Button>
      </Tooltip>
      
      <Tooltip content="Видеозвонок">
        <Button
          color="primary"
          variant="flat"
          size="sm"
          isIconOnly
          onPress={() => initiateCall('video')}
          isLoading={isInitiatingCall}
          disabled={isInitiatingCall}
          className="bg-blue-500 text-white hover:bg-blue-600"
        >
          <Video size={16} />
        </Button>
      </Tooltip>
    </div>
  );
};

export default CallButtons; 