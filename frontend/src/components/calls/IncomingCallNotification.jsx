import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Avatar } from '@nextui-org/react';
import { Phone, Video, PhoneOff, PhoneCall, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api';
import useAuthStore from '../../stores/authStore';

const IncomingCallNotification = ({ 
  call, 
  isOpen, 
  onClose, 
  onAccept, 
  onReject 
}) => {
  const [callerName, setCallerName] = useState('Звонящий');
  const [callerAvatar, setCallerAvatar] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audio] = useState(new Audio('/sounds/notification.mp3'));
  const { user } = useAuthStore();

  // Воспроизводим звук при входящем звонке
  useEffect(() => {
    if (isOpen && call) {
      // Воспроизводим звук в цикле
      audio.loop = true;
      audio.play().catch(e => {});
      
      // Останавливаем звук при закрытии модального окна
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [isOpen, call, audio]);

  // Загружаем информацию о звонящем
  useEffect(() => {
    const loadCallerInfo = async () => {
      if (!call?.caller_id) return;

      try {
        // Определяем роль звонящего и загружаем соответствующий профиль
        const consultation = await api.get(`/api/consultations/${call.consultation_id}`);
        const consultationData = consultation.data;

        if (call.caller_id === consultationData.doctor_id) {
          // Звонящий - врач
          const doctorResponse = await api.get(`/doctors/${call.caller_id}/profile`);
          if (doctorResponse.data) {
            setCallerName(doctorResponse.data.full_name || 'Врач');
            setCallerAvatar(doctorResponse.data.avatar_url);
          }
        } else {
          // Звонящий - пациент
          const patientResponse = await api.get(`/patients/${call.caller_id}/profile`);
          if (patientResponse.data) {
            setCallerName(patientResponse.data.full_name || 'Пациент');
            setCallerAvatar(patientResponse.data.avatar_url);
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке информации о звонящем:', error);
      }
    };

    if (isOpen && call) {
      loadCallerInfo();
    }
  }, [isOpen, call]);

  const handleAccept = async () => {
    setIsProcessing(true);
    audio.pause(); // Останавливаем звук
    
    try {
      await api.post(`/api/calls/${call.id}/accept`);
      toast.success('Звонок принят');
      
      if (onAccept) {
        onAccept(call);
      }
      
      onClose();
    } catch (error) {
      console.error('Ошибка при принятии звонка:', error);
      toast.error('Ошибка при принятии звонка');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    audio.pause(); // Останавливаем звук
    
    try {
      await api.post(`/api/calls/${call.id}/reject`);
      toast.success('Звонок отклонен');
      
      if (onReject) {
        onReject(call);
      }
      
      onClose();
    } catch (error) {
      console.error('Ошибка при отклонении звонка:', error);
      toast.error('Ошибка при отклонении звонка');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!call) return null;

  const isVideoCall = call.call_type === 'video';
  const CallIcon = isVideoCall ? Video : Phone;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      size="sm"
      isDismissable={false}
      hideCloseButton
      classNames={{
        base: "bg-gradient-to-br from-white via-blue-50 to-purple-50 rounded-3xl shadow-2xl border border-blue-200/50 backdrop-blur-lg",
        body: "p-0",
        backdrop: "bg-black/60 backdrop-blur-md"
      }}
    >
      <ModalContent className="overflow-hidden">
        {/* Декоративный фон */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tl from-purple-400 to-pink-400 rounded-full blur-xl"></div>
        </div>

        <div className="relative z-10 p-8">
          {/* Анимированные кольца вокруг аватара */}
          <div className="flex justify-center mb-6 relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 border-4 border-blue-400/30 rounded-full animate-ping"></div>
              <div className="absolute w-28 h-28 border-4 border-purple-400/30 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
              <div className="absolute w-24 h-24 border-4 border-pink-400/30 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
            </div>
            
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-1 shadow-2xl">
                <Avatar
                  src={callerAvatar}
                  name={callerName}
                  size="lg"
                  className="w-full h-full text-xl"
                  fallback={<User size={32} className="text-white" />}
                />
              </div>
              {/* Иконка типа звонка */}
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-xl animate-bounce border-2 border-white">
                <CallIcon size={20} className="text-white" />
              </div>
            </div>
          </div>

          {/* Информация о звонящем */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
              {callerName}
            </h3>
            <p className="text-gray-600 font-medium flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              {isVideoCall ? 'Входящий видеозвонок' : 'Входящий аудиозвонок'}
            </p>
          </div>

          {/* Кнопки управления */}
          <div className="flex justify-center items-center gap-8">
            {/* Кнопка отклонения */}
            <Button
              isIconOnly
              size="lg"
              onPress={handleReject}
              isLoading={isProcessing}
              disabled={isProcessing}
              className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-xl border-2 border-red-400/50 transition-all duration-300 transform hover:scale-110"
            >
              <PhoneOff size={28} />
            </Button>

            {/* Кнопка принятия */}
            <Button
              isIconOnly
              size="lg"
              onPress={handleAccept}
              isLoading={isProcessing}
              disabled={isProcessing}
              className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-xl border-2 border-green-400/50 transition-all duration-300 transform hover:scale-110"
            >
              <PhoneCall size={28} />
            </Button>
          </div>

          {/* Дополнительная информация */}
          <div className="text-center mt-6">
            <p className="text-xs text-gray-500">
              Нажмите чтобы ответить на звонок
            </p>
          </div>
        </div>
      </ModalContent>
    </Modal>
  );
};

export default IncomingCallNotification;