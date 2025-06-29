import React, { useRef, useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Tooltip } from '@nextui-org/react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Settings, Maximize, Monitor, Users } from 'lucide-react';

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
  const [isMinimized, setIsMinimized] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [callTime, setCallTime] = useState(0);

  // Таймер звонка
  useEffect(() => {
    let interval;
    if (isOpen && connectionState === 'connected' && !waitingForAnswer) {
      interval = setInterval(() => {
        setCallTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOpen, connectionState, waitingForAnswer]);

  // Форматирование времени
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

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

  // Скрытие контролов через 3 секунды
  useEffect(() => {
    let timeout;
    if (showControls && !waitingForAnswer) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls, waitingForAnswer]);

  // Обработчик закрытия модального окна
  const handleClose = () => {
    if (onEndCall) {
      onEndCall();
    }
    if (onClose) {
      onClose();
    }
  };

  if (isMinimized) {
    // Минимизированное окно в углу экрана
    return (
      <div className="fixed bottom-4 right-4 z-50 w-80 h-60 bg-black rounded-lg shadow-2xl border border-gray-600 overflow-hidden">
        <div className="relative h-full w-full">
          {/* Заголовок минимизированного окна */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center">
                  <Users size={12} />
                </div>
                <span className="text-sm font-medium text-white">
                  {callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}
                </span>
              </div>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="text-white hover:bg-white/10 w-6 h-6 min-w-6"
                onPress={() => setIsMinimized(false)}
              >
                <Maximize size={12} />
              </Button>
            </div>
          </div>

          {/* Видео контент */}
          {callType === 'video' ? (
            <div className="h-full w-full relative">
              <video 
                ref={remoteVideoRef} 
                className="w-full h-full object-cover" 
              />
              {/* Локальное видео в углу */}
              <div className="absolute bottom-2 right-2 w-20 h-15 bg-gray-900 rounded overflow-hidden border border-white/20">
                <video 
                  ref={localVideoRef} 
                  className="w-full h-full object-cover" 
                  muted
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-800">
              <div className="text-center">
                <Mic size={24} className="text-white mx-auto mb-2" />
                <p className="text-white text-sm">Аудиозвонок</p>
              </div>
              <video ref={remoteVideoRef} className="hidden" />
              <video ref={localVideoRef} className="hidden" />
            </div>
          )}

          {/* Кнопка завершения */}
          <div className="absolute bottom-2 left-2">
            <Button
              isIconOnly
              size="sm"
              className="w-8 h-8 min-w-8 bg-red-500 hover:bg-red-600 text-white rounded-full"
              onPress={handleClose}
            >
              <PhoneOff size={14} />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      size="full" 
      hideCloseButton 
      className="z-50"
      classNames={{
        wrapper: "bg-black/95",
        base: "bg-black m-0 max-w-full h-full rounded-none"
      }}
    >
      <ModalContent className="bg-black text-white h-full">
        <div 
          className="relative h-full w-full bg-black overflow-hidden cursor-pointer flex items-center justify-center"
          onClick={() => setShowControls(true)}
        >
          {/* Header with call info - показывается всегда при ожидании или когда показываются контролы */}
          {(waitingForAnswer || showControls) && (
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">
                      {callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}
                    </h3>
                    <p className="text-sm text-gray-300">
                      {waitingForAnswer ? 'Ожидание ответа...' : 
                       connectionState === 'connected' ? `Длительность: ${formatTime(callTime)}` :
                       connectionState === 'connecting' ? 'Подключение...' :
                       connectionState === 'failed' ? 'Ошибка подключения' :
                       `Статус: ${connectionState}`}
                    </p>
                  </div>
                </div>
                
                {!waitingForAnswer && (
                  <div className="flex items-center gap-2">
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      className="text-white hover:bg-white/10"
                    >
                      <Settings size={18} />
                    </Button>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      className="text-white hover:bg-white/10"
                      onPress={() => setIsMinimized(true)}
                    >
                      <Monitor size={18} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main video area с правильными пропорциями как в Telegram */}
          {waitingForAnswer ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-blue-500 mb-6"></div>
              <h2 className="text-2xl font-semibold mb-2">Ожидание ответа собеседника</h2>
              <p className="text-gray-400 text-center max-w-md">
                Звонок будет подключен автоматически, когда собеседник ответит на вызов
              </p>
            </div>
          ) : callType === 'video' ? (
            <>
              {/* Контейнер с фиксированными пропорциями как в Telegram */}
              <div className="max-w-4xl max-h-[80vh] w-full h-full flex items-center justify-center">
                <div className="relative w-full h-full max-w-4xl max-h-[80vh] bg-gray-900 rounded-lg overflow-hidden">
                  {/* Remote video с правильными пропорциями */}
                  <video 
                    ref={remoteVideoRef} 
                    className="w-full h-full object-contain bg-gray-900" 
                    poster=""
                  />
                  {!remoteVideoRef.current?.srcObject && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                      <div className="text-center">
                        <div className="w-32 h-32 bg-gray-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                          <Users size={48} className="text-gray-300" />
                        </div>
                        <p className="text-xl text-gray-300">Собеседник</p>
                        <p className="text-sm text-gray-500 mt-1">Видео не подключено</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Local video - picture in picture с адаптивным размером */}
                  <div className="absolute top-4 right-4 w-48 h-36 bg-gray-900 rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl">
                    <video 
                      ref={localVideoRef} 
                      className="w-full h-full object-cover" 
                      muted
                    />
                    {!localVideoRef.current?.srcObject && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-700">
                        <div className="text-center">
                          <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <Users size={20} className="text-gray-300" />
                          </div>
                          <p className="text-xs text-gray-300">Вы</p>
                        </div>
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 text-white text-xs bg-black/60 px-2 py-1 rounded">
                      Вы
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-32 h-32 bg-blue-500 rounded-full flex items-center justify-center mb-6 animate-pulse">
                <Mic size={48} className="text-white" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Аудиозвонок активен</h2>
              <p className="text-gray-400 text-center">
                Говорите в микрофон. Видео отключено для экономии трафика.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Качество связи: отличное
              </div>
              {/* Скрытые видео элементы для аудио */}
              <video ref={remoteVideoRef} className="hidden" />
              <video ref={localVideoRef} className="hidden" />
            </div>
          )}

          {/* Bottom controls */}
          {(waitingForAnswer || showControls) && (
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-6">
              <div className="flex justify-center items-center gap-4">
                {!waitingForAnswer && (
                  <>
                    <Tooltip content={micEnabled ? 'Отключить микрофон' : 'Включить микрофон'}>
                      <Button
                        isIconOnly
                        variant="solid"
                        size="lg"
                        onPress={onToggleMic}
                        className={`w-14 h-14 rounded-full transition-all ${
                          micEnabled 
                            ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                            : 'bg-red-500 hover:bg-red-600 text-white'
                        }`}
                      >
                        {micEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                      </Button>
                    </Tooltip>
                    
                    {callType === 'video' && (
                      <Tooltip content={camEnabled ? 'Отключить камеру' : 'Включить камеру'}>
                        <Button
                          isIconOnly
                          variant="solid"
                          size="lg"
                          onPress={onToggleCam}
                          className={`w-14 h-14 rounded-full transition-all ${
                            camEnabled 
                              ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                              : 'bg-red-500 hover:bg-red-600 text-white'
                          }`}
                        >
                          {camEnabled ? <Video size={24} /> : <VideoOff size={24} />}
                        </Button>
                      </Tooltip>
                    )}
                  </>
                )}
                
                <Tooltip content="Завершить звонок">
                  <Button
                    isIconOnly
                    variant="solid"
                    size="lg"
                    onPress={handleClose}
                    className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all transform hover:scale-105"
                  >
                    <PhoneOff size={24} />
                  </Button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
};

export default VideoCallModal; 