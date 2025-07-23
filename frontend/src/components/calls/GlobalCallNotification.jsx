import React from 'react';
import { Modal, ModalContent, ModalBody, Button, Card, CardBody } from '@nextui-org/react';
import { Phone, PhoneOff, Video, User, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCalls } from '../../contexts/CallsContext';

const GlobalCallNotification = () => {
  const { incomingCall, outgoingCall, acceptCall, rejectCall, connectionStatus, endOutgoingCall } = useCalls();
  const navigate = useNavigate();

  const handleAccept = async () => {
    const success = await acceptCall(incomingCall.id);
    if (success) {
      // Переходим к странице консультации и передаем параметр что нужно открыть звонок
      navigate(`/consultations/${incomingCall.consultation_id}?openCall=true&callType=${incomingCall.call_type}`);
    }
  };

  const handleReject = async () => {
    const success = await rejectCall(incomingCall.id);
  };

  const handleEndOutgoing = async () => {
    endOutgoingCall();
  };

  // Показываем уведомление о входящем звонке
  if (incomingCall) {
    return (
      <>
        {/* Полноэкранное модальное окно */}
        <Modal 
          isOpen={true} 
          hideCloseButton 
          size="full"
          className="z-[60]"
          classNames={{
            wrapper: "bg-black/90 backdrop-blur-md",
            base: "bg-gradient-to-br from-gray-900 via-black to-gray-900 m-0 max-w-full h-full rounded-none"
          }}
        >
          <ModalContent className="bg-transparent text-white h-full flex items-center justify-center relative overflow-hidden">
            {/* Декоративный фон */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-500 to-pink-500 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
            </div>

            <ModalBody className="flex items-center justify-center h-full relative z-10">
              <div className="text-center max-w-md mx-auto">
                {/* Анимированная аватарка с кольцами */}
                <div className="relative mb-8">
                  {/* Пульсирующие кольца вокруг аватара */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-4 border-blue-400/30 rounded-full animate-ping"></div>
                    <div className="absolute w-56 h-56 border-4 border-purple-400/30 rounded-full animate-ping" style={{animationDelay: '0.5s'}}></div>
                    <div className="absolute w-48 h-48 border-4 border-pink-400/30 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                  </div>
                  
                  <div className="relative w-40 h-40 mx-auto">
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                      <User size={64} className="text-white" />
                    </div>
                    {/* Иконка типа звонка */}
                    <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-xl animate-bounce border-4 border-white">
                      {incomingCall.call_type === 'video' ? (
                        <Video size={24} className="text-white" />
                      ) : (
                        <Phone size={24} className="text-white" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Информация о звонке */}
                <div className="mb-8">
                  <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
                    Входящий звонок
                  </h2>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 shadow-xl mb-4">
                    <p className="text-xl font-semibold mb-2 flex items-center justify-center gap-3">
                      {incomingCall.call_type === 'video' ? (
                        <>
                          <Video size={24} className="text-blue-400" />
                          <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Видеозвонок
                          </span>
                        </>
                      ) : (
                        <>
                          <Phone size={24} className="text-green-400" />
                          <span className="bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                            Аудиозвонок
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-gray-300 text-sm">Консультация #{incomingCall.consultation_id}</p>
                  </div>
                </div>

                {/* Кнопки действий */}
                <div className="flex justify-center gap-8 mb-8">
                  {/* Кнопка отклонения */}
                  <Button
                    isIconOnly
                    size="lg"
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transform hover:scale-110 transition-all duration-300 shadow-2xl border-2 border-red-400/50"
                    onPress={handleReject}
                  >
                    <PhoneOff size={32} />
                  </Button>

                  {/* Кнопка принятия */}
                  <Button
                    isIconOnly
                    size="lg"
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white transform hover:scale-110 transition-all duration-300 shadow-2xl border-2 border-green-400/50 animate-bounce"
                    onPress={handleAccept}
                  >
                    <Phone size={32} />
                  </Button>
                </div>

                {/* Дополнительные действия */}
                <div className="flex justify-center">
                  <Button
                    variant="light"
                    size="sm"
                    className="text-white/80 hover:text-white hover:bg-white/10 rounded-full px-6 py-2 backdrop-blur-sm border border-white/20 transition-all duration-300"
                    startContent={<MessageCircle size={16} />}
                    onPress={handleReject}
                  >
                    Отклонить и написать сообщение
                  </Button>
                </div>
              </div>
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* Дополнительное минимальное уведомление в углу */}
        <div className="fixed top-6 right-6 z-50">
          <Card className="bg-gradient-to-br from-red-500/90 to-red-600/90 border border-red-400/50 shadow-2xl max-w-xs animate-bounce backdrop-blur-lg">
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                  {incomingCall.call_type === 'video' ? (
                    <Video size={20} className="text-white" />
                  ) : (
                    <Phone size={20} className="text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">🔥 Входящий звонок!</p>
                  <p className="text-white/80 text-xs">
                    {incomingCall.call_type === 'video' ? 'Видео' : 'Аудио'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    isIconOnly
                    size="sm"
                    className="w-8 h-8 min-w-8 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                    onPress={handleAccept}
                  >
                    <Phone size={14} />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    className="w-8 h-8 min-w-8 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110"
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
  }

  // Показываем уведомление о исходящем звонке  
  if (outgoingCall) {
    return (
      <div className="fixed top-6 right-6 z-50">
        <Card className="bg-gradient-to-br from-blue-500/90 to-blue-600/90 border border-blue-400/50 shadow-2xl max-w-xs backdrop-blur-lg">
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                {outgoingCall.call_type === 'video' ? (
                  <Video size={20} className="text-white" />
                ) : (
                  <Phone size={20} className="text-white" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  Звонок идет...
                </p>
                <p className="text-white/80 text-xs">
                  {outgoingCall.call_type === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  isIconOnly
                  size="sm"
                  className="w-8 h-8 min-w-8 bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-110"
                  onPress={handleEndOutgoing}
                >
                  <PhoneOff size={14} />
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return null;
};

export default GlobalCallNotification;