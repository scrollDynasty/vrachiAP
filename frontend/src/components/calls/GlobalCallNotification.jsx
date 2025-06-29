import React from 'react';
import { Modal, ModalContent, ModalBody, Button, Card, CardBody } from '@nextui-org/react';
import { Phone, PhoneOff, Video, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCalls } from '../../contexts/CallsContext';

const GlobalCallNotification = () => {
  const { incomingCall, acceptCall, rejectCall, connectionStatus } = useCalls();
  const navigate = useNavigate();

  if (!incomingCall) return null;

  const handleAccept = async () => {
    const success = await acceptCall(incomingCall.id);
    if (success) {
      // Переходим к странице консультации
      navigate(`/consultations/${incomingCall.consultation_id}`);
    }
  };

  const handleReject = async () => {
    await rejectCall(incomingCall.id);
  };

  return (
    <>
      {/* Полноэкранное модальное окно */}
      <Modal 
        isOpen={true} 
        hideCloseButton 
        size="full"
        className="z-[60]"
        classNames={{
          wrapper: "bg-black/95 backdrop-blur-sm",
          base: "bg-gradient-to-br from-red-900 via-purple-900 to-black m-0 max-w-full h-full rounded-none animate-pulse"
        }}
      >
        <ModalContent className="bg-transparent text-white h-full flex items-center justify-center">
          <ModalBody className="flex items-center justify-center h-full">
            <div className="text-center max-w-md mx-auto">
              {/* Анимированная аватарка */}
              <div className="relative mb-8">
                <div className="w-48 h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <User size={80} className="text-white" />
                </div>
                {/* Пульсирующие кольца */}
                <div className="absolute inset-0 w-48 h-48 mx-auto">
                  <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-20"></div>
                  <div className="absolute inset-2 bg-blue-400 rounded-full animate-ping opacity-30 animation-delay-150"></div>
                  <div className="absolute inset-4 bg-blue-400 rounded-full animate-ping opacity-40 animation-delay-300"></div>
                </div>
              </div>

              {/* Информация о звонке */}
              <div className="mb-8">
                <h2 className="text-4xl font-bold mb-2 animate-bounce text-red-400">🔥 ВХОДЯЩИЙ ЗВОНОК! 🔥</h2>
                <p className="text-xl text-blue-200 mb-4">
                  {incomingCall.call_type === 'video' ? (
                    <span className="flex items-center justify-center gap-2">
                      <Video size={24} />
                      Видеозвонок
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Phone size={24} />
                      Аудиозвонок
                    </span>
                  )}
                </p>
                <p className="text-gray-300">Консультация #{incomingCall.consultation_id}</p>
              </div>

              {/* Кнопки действий */}
              <div className="flex justify-center gap-8">
                {/* Кнопка отклонения */}
                <Button
                  isIconOnly
                  size="lg"
                  className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 text-white transform hover:scale-110 transition-all shadow-xl"
                  onPress={handleReject}
                >
                  <PhoneOff size={32} />
                </Button>

                {/* Кнопка принятия */}
                <Button
                  isIconOnly
                  size="lg"
                  className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 text-white transform hover:scale-110 transition-all shadow-xl animate-bounce"
                  onPress={handleAccept}
                >
                  <Phone size={32} />
                </Button>
              </div>

              {/* Дополнительные действия */}
              <div className="mt-8 flex justify-center gap-4">
                <Button
                  variant="light"
                  size="sm"
                  className="text-white hover:bg-white/10"
                  onPress={handleReject}
                >
                  Отклонить и написать сообщение
                </Button>
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Дополнительное минимальное уведомление в углу для случаев когда окно не в фокусе */}
      <div className="fixed top-4 right-4 z-50">
        <Card className="bg-red-600/90 border border-red-400 shadow-2xl max-w-xs animate-bounce">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                {incomingCall.call_type === 'video' ? (
                  <Video size={20} className="text-white" />
                ) : (
                  <Phone size={20} className="text-white" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">🔥 ВХОДЯЩИЙ ЗВОНОК!</p>
                <p className="text-gray-300 text-xs">
                  {incomingCall.call_type === 'video' ? 'Видео' : 'Аудио'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  className="w-8 h-8 min-w-8 bg-green-500 hover:bg-green-600 text-white"
                  onPress={handleAccept}
                >
                  <Phone size={14} />
                </Button>
                <Button
                  isIconOnly
                  size="sm"
                  className="w-8 h-8 min-w-8 bg-red-500 hover:bg-red-600 text-white"
                  onPress={handleReject}
                >
                  <PhoneOff size={14} />
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
};

export default GlobalCallNotification;