import React, { useRef, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Tooltip } from '@nextui-org/react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';

const VideoCallModal = ({
  isOpen,
  onClose,
  onEndCall,
  onToggleMic,
  onToggleCam,
  micEnabled,
  camEnabled,
  localVideoRef,
  remoteVideoRef,
  callType,
  connectionState,
  waitingForAnswer = false
}) => {
  // Автоматически воспроизводим видео при появлении
  useEffect(() => {
    if (isOpen) {
      if (localVideoRef.current) {
        localVideoRef.current.muted = true;
        localVideoRef.current.autoplay = true;
        localVideoRef.current.playsInline = true;
      }
      if (remoteVideoRef.current) {
        remoteVideoRef.current.autoplay = true;
        remoteVideoRef.current.playsInline = true;
      }
    }
  }, [isOpen, localVideoRef, remoteVideoRef]);

  // Обработчик закрытия модального окна
  const handleClose = () => {
    if (onEndCall) {
      onEndCall();
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="3xl" hideCloseButton className="z-50">
      <ModalContent>
        <ModalHeader className="flex flex-col items-center gap-2 pb-2">
          <span className="text-lg font-semibold">
            {callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}
          </span>
          <span className="text-xs text-gray-500">
            {waitingForAnswer ? 'Ожидание ответа...' : 
             connectionState === 'connected' ? 'Подключено' :
             connectionState === 'connecting' ? 'Подключение...' :
             connectionState === 'failed' ? 'Ошибка подключения' :
             `Статус: ${connectionState}`}
          </span>
        </ModalHeader>
        <ModalBody className="flex flex-col md:flex-row gap-4 items-center justify-center bg-black/80 py-6">
          {waitingForAnswer ? (
            <div className="flex flex-col items-center justify-center w-full h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4"></div>
              <p className="text-white text-lg">Ожидание ответа собеседника...</p>
              <p className="text-gray-400 text-sm mt-2">Звонок будет подключен, когда собеседник ответит</p>
            </div>
          ) : callType === 'video' ? (
            <>
              <div className="relative w-64 h-48 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                <video ref={remoteVideoRef} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 text-white text-xs bg-black/60 px-2 py-1 rounded">Собеседник</span>
              </div>
              <div className="relative w-40 h-32 bg-black rounded-lg overflow-hidden flex items-center justify-center border-2 border-primary-500">
                <video ref={localVideoRef} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 text-white text-xs bg-black/60 px-2 py-1 rounded">Вы</span>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full h-64">
              <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <Mic size={48} className="text-white" />
              </div>
              <p className="text-white text-lg">Аудиозвонок активен</p>
              <p className="text-gray-400 text-sm mt-2">Говорите в микрофон</p>
              {/* Скрытые видео элементы для аудио */}
              <video ref={remoteVideoRef} className="hidden" />
              <video ref={localVideoRef} className="hidden" />
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-center gap-4 py-4">
          {!waitingForAnswer && (
            <>
              <Tooltip content={micEnabled ? 'Отключить микрофон' : 'Включить микрофон'}>
                <Button
                  isIconOnly
                  variant="flat"
                  onPress={onToggleMic}
                  className={micEnabled ? 'bg-gray-700 text-white' : 'bg-red-500 text-white'}
                >
                  {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                </Button>
              </Tooltip>
              
              {callType === 'video' && (
                <Tooltip content={camEnabled ? 'Отключить камеру' : 'Включить камеру'}>
                  <Button
                    isIconOnly
                    variant="flat"
                    onPress={onToggleCam}
                    className={camEnabled ? 'bg-gray-700 text-white' : 'bg-red-500 text-white'}
                  >
                    {camEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                  </Button>
                </Tooltip>
              )}
            </>
          )}
          
          <Tooltip content="Завершить звонок">
            <Button
              isIconOnly
              color="danger"
              variant="flat"
              onPress={handleClose}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              <PhoneOff size={20} />
            </Button>
          </Tooltip>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default VideoCallModal; 