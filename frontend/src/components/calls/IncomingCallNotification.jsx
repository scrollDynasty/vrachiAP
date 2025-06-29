import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Avatar } from '@nextui-org/react';
import { Phone, Video, PhoneOff, PhoneCall } from 'lucide-react';
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
      audio.play().catch(e => console.log('Не удалось воспроизвести звук:', e));
      
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
        base: "bg-white rounded-xl shadow-xl",
        body: "p-6",
        backdrop: "bg-black/50 backdrop-blur-sm"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col items-center gap-2 pb-2">
          <div className="relative">
            <Avatar
              src={callerAvatar}
              name={callerName}
              size="lg"
              className="w-20 h-20 text-lg"
            />
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
              <CallIcon size={16} className="text-white" />
            </div>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">{callerName}</h3>
            <p className="text-sm text-gray-600">
              {isVideoCall ? 'Входящий видеозвонок' : 'Входящий аудиозвонок'}
            </p>
          </div>
        </ModalHeader>
        
        <ModalBody className="text-center py-4">
          <div className="flex justify-center items-center gap-6">
            <Button
              color="success"
              size="lg"
              variant="flat"
              onPress={handleAccept}
              isLoading={isProcessing}
              disabled={isProcessing}
              className="bg-green-500 text-white hover:bg-green-600 min-w-20"
              startContent={<PhoneCall size={20} />}
            >
              Принять
            </Button>
            
            <Button
              color="danger"
              size="lg"
              variant="flat"
              onPress={handleReject}
              isLoading={isProcessing}
              disabled={isProcessing}
              className="bg-red-500 text-white hover:bg-red-600 min-w-20"
              startContent={<PhoneOff size={20} />}
            >
              Отклонить
            </Button>
          </div>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default IncomingCallNotification;