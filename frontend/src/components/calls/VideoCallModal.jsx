import React, { useRef, useEffect, useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Tooltip } from '@nextui-org/react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Settings, Maximize, Monitor, Users, Minimize2, Volume2, VolumeX } from 'lucide-react';

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
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Таймер звонка - работает независимо от минимизации
  useEffect(() => {
    let interval;
    // Запускаем таймер только когда вкладка активна
    if (isOpen && connectionState === 'connected' && !waitingForAnswer && !document.hidden) {
      interval = setInterval(() => {
        if (!document.hidden) { // Дополнительная проверка при каждом тике
          setCallTime(prev => prev + 1);
        }
      }, 1000);
    } else if (!isOpen) {
      setCallTime(0);
    }
    
    // Паузим/возобновляем таймер при изменении visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (interval) clearInterval(interval);
      } else if (isOpen && connectionState === 'connected' && !waitingForAnswer) {
        if (!interval) {
          interval = setInterval(() => {
            if (!document.hidden) {
              setCallTime(prev => prev + 1);
            }
          }, 1000);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (interval) clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, connectionState, waitingForAnswer]); // Убрал callTime из зависимостей

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

  // Автоматически воспроизводим видео при появлении и изменении состояния минимизации
  useEffect(() => {
    if (isOpen) {
      const ensureVideoPlayback = () => {
        // Локальное видео - работает в любом режиме
        if (localVideoRef.current && localVideoRef.current.srcObject) {
          localVideoRef.current.muted = true;
          localVideoRef.current.autoplay = true;
          localVideoRef.current.playsInline = true;
          
          // Обработчик загрузки метаданных
          const onLoadedMetadata = () => {
            localVideoRef.current.play().catch(() => {});
          };
          
          if (localVideoRef.current.readyState >= 1) {
            // Метаданные уже загружены
            onLoadedMetadata();
          } else {
            localVideoRef.current.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
          }
          
          // Принудительная попытка воспроизведения
          localVideoRef.current.play().catch(() => {});
        }
        
        // Удаленное видео - работает в любом режиме
        if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
          remoteVideoRef.current.autoplay = true;
          remoteVideoRef.current.playsInline = true;
          remoteVideoRef.current.play().catch(() => {});
        }
      };

      // Запускаем сразу
      ensureVideoPlayback();
      
      // Повторяем через разные интервалы для уверенности - в ЛЮБОМ режиме
      const timeouts = [
        setTimeout(ensureVideoPlayback, 100),
        setTimeout(ensureVideoPlayback, 500),
        setTimeout(ensureVideoPlayback, 1000),
        setTimeout(ensureVideoPlayback, 2000) // Дополнительная попытка
      ];
      
      return () => {
        timeouts.forEach(timeout => clearTimeout(timeout));
      };
    }
  }, [isOpen, isMinimized, localVideoRef, remoteVideoRef]);

  // Скрытие контролов через 5 секунд (увеличил для лучшего UX)
  useEffect(() => {
    let timeout;
    if (showControls && !waitingForAnswer && connectionState === 'connected') {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
    return () => clearTimeout(timeout);
  }, [showControls, waitingForAnswer, connectionState]);

  // Event-driven обновление видео вместо интервалов
  useEffect(() => {
    if (!isOpen) return;
    
    const handleVideoEvent = (video) => {
      if (video.srcObject) {
        const stream = video.srcObject;
        const hasVideo = stream.getVideoTracks().some(track => track.enabled);
        
        if (hasVideo && video.paused) {
          video.play().catch(() => {});
        }
      }
    };
    
    // Добавляем слушатели медиа-событий
    const addVideoListeners = (video) => {
      if (!video) return () => {};
      
      const events = ['loadstart', 'loadedmetadata', 'loadeddata', 'canplay', 'play', 'pause'];
      const handler = () => handleVideoEvent(video);
      
      events.forEach(event => video.addEventListener(event, handler));
      
      return () => {
        events.forEach(event => video.removeEventListener(event, handler));
      };
    };
    
    // Начальная проверка
    if (localVideoRef.current) handleVideoEvent(localVideoRef.current);
    if (remoteVideoRef.current) handleVideoEvent(remoteVideoRef.current);
    
    // Добавляем слушатели
    const cleanupLocal = addVideoListeners(localVideoRef.current);
    const cleanupRemote = addVideoListeners(remoteVideoRef.current);
    
    // Проверяем при изменении visibility
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        if (localVideoRef.current) handleVideoEvent(localVideoRef.current);
        if (remoteVideoRef.current) handleVideoEvent(remoteVideoRef.current);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      cleanupLocal();
      cleanupRemote();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isOpen, localVideoRef, remoteVideoRef, connectionState, isMinimized]);

  // Обработчик закрытия модального окна
  const handleClose = () => {
    if (onEndCall) {
      onEndCall();
    }
    if (onClose) {
      onClose();
    }
  };

  // Переключение звука
  const handleToggleSound = () => {
    setSoundEnabled(!soundEnabled);
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = soundEnabled;
    }
  };

  if (isMinimized) {
    // Минимизированное окно в углу экрана с современным дизайном
    return (
      <div className="fixed bottom-6 right-6 z-50 w-80 h-48 rounded-2xl shadow-2xl overflow-hidden border border-white/20 backdrop-blur-lg bg-gradient-to-br from-gray-900/95 to-black/95">
        <div className="relative h-full w-full">
          {/* Заголовок минимизированного окна */}
          <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/70 to-transparent p-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg animate-pulse">
                  <Users size={12} className="text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-white drop-shadow-lg">
                    {callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}
                  </span>
                  <div className="text-xs text-green-400 font-medium">
                    {connectionState === 'connected' ? formatTime(callTime) : 'Подключение...'}
                  </div>
                </div>
              </div>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="text-white hover:bg-white/20 w-7 h-7 min-w-7 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110"
                onPress={() => setIsMinimized(false)}
              >
                <Maximize size={14} />
              </Button>
            </div>
          </div>

          {/* Видео контент */}
          {callType === 'video' ? (
            <div className="h-full w-full relative bg-gradient-to-br from-gray-800 to-gray-900">
              <video 
                ref={remoteVideoRef} 
                className="w-full h-full object-cover" 
                autoPlay
                playsInline
                muted={!soundEnabled}
                onLoadedMetadata={() => {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.play().catch(() => {});
                  }
                }}
              />
              {/* Показываем заглушку только если нет активного видео потока */}
              {!remoteVideoRef.current?.srcObject && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-2 mx-auto shadow-lg animate-pulse">
                      <Users size={24} className="text-white" />
                    </div>
                    <p className="text-xs text-gray-300 font-medium">Собеседник</p>
                  </div>
                </div>
              )}
              
              {/* Локальное видео в углу */}
              <div className="absolute bottom-3 right-3 w-16 h-12 bg-gray-900 rounded-xl overflow-hidden border-2 border-white/30 shadow-lg">
                <video 
                  ref={localVideoRef} 
                  className="w-full h-full object-cover" 
                  muted
                  autoPlay
                  playsInline
                  onLoadedMetadata={() => {
                    if (localVideoRef.current) {
                      localVideoRef.current.play().catch(() => {});
                    }
                  }}
                />
                {!localVideoRef.current?.srcObject && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                    <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
                      <Users size={8} className="text-white" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-900 to-blue-900">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-2 mx-auto animate-pulse shadow-lg">
                  <Mic size={20} className="text-white" />
                </div>
                <p className="text-white text-sm font-medium">Аудиозвонок</p>
              </div>
              <video ref={remoteVideoRef} className="hidden" />
              <video ref={localVideoRef} className="hidden" />
            </div>
          )}

          {/* Кнопка завершения */}
          <div className="absolute bottom-3 left-3">
            <Button
              isIconOnly
              size="sm"
              className="w-9 h-9 min-w-9 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-full shadow-xl border border-red-400/50 transition-all duration-300 hover:scale-110"
              onPress={handleClose}
            >
              <PhoneOff size={16} />
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
        wrapper: "bg-black/95 backdrop-blur-sm",
        base: "bg-gradient-to-br from-gray-900 via-black to-gray-900 m-0 max-w-full h-full rounded-none border-t-4 border-gradient-to-r from-blue-500 to-purple-600"
      }}
    >
      <ModalContent className="bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white h-full relative overflow-hidden">
        {/* Декоративный фон */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-purple-500 to-pink-500 rounded-full blur-3xl"></div>
        </div>
        
        <div 
          className="relative h-full w-full overflow-hidden cursor-pointer flex items-center justify-center z-10"
          onClick={() => setShowControls(true)}
        >
          {/* Header with call info - показывается всегда при ожидании или когда показываются контролы */}
          {(waitingForAnswer || showControls) && (
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/70 to-transparent p-6 backdrop-blur-sm">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                    <Users size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      {callType === 'video' ? 'Видеозвонок' : 'Аудиозвонок'}
                    </h3>
                    <p className="text-sm text-gray-400 font-medium">
                      {waitingForAnswer ? (
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                          Ожидание ответа...
                        </span>
                      ) : connectionState === 'connected' ? (
                        <span className="flex items-center gap-2 text-green-400">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          Длительность: {formatTime(callTime)}
                        </span>
                      ) : connectionState === 'connecting' ? (
                        <span className="flex items-center gap-2 text-blue-400">
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                          Подключение...
                        </span>
                      ) : connectionState === 'failed' ? (
                        <span className="flex items-center gap-2 text-red-400">
                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                          Ошибка подключения
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                          Статус: {connectionState}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                
                {!waitingForAnswer && (
                  <div className="flex items-center gap-3">
                    <Tooltip content="Настройки звука">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        className="text-white hover:bg-white/20 w-10 h-10 min-w-10 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110"
                        onPress={handleToggleSound}
                      >
                        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                      </Button>
                    </Tooltip>
                    <Tooltip content="Свернуть">
                      <Button
                        isIconOnly
                        variant="light"
                        size="sm"
                        className="text-white hover:bg-white/20 w-10 h-10 min-w-10 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110"
                        onPress={() => setIsMinimized(true)}
                      >
                        <Minimize2 size={18} />
                      </Button>
                    </Tooltip>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Main video area с современным дизайном */}
          {waitingForAnswer ? (
            <div className="flex flex-col items-center justify-center h-full relative">
              {/* Анимированный фон */}
              <div className="absolute inset-0 flex items-center justify-center opacity-20">
                <div className="w-64 h-64 border-4 border-blue-500/30 rounded-full animate-spin"></div>
                <div className="absolute w-48 h-48 border-4 border-purple-500/30 rounded-full animate-spin" style={{animationDuration: '3s', animationDirection: 'reverse'}}></div>
                <div className="absolute w-32 h-32 border-4 border-pink-500/30 rounded-full animate-spin" style={{animationDuration: '2s'}}></div>
              </div>
              
              <div className="relative z-10 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-8 mx-auto shadow-2xl animate-pulse">
                  <Video size={36} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  Ожидание ответа собеседника
                </h2>
                <p className="text-gray-400 text-center max-w-md text-lg leading-relaxed">
                  Звонок будет подключен автоматически, когда собеседник ответит на вызов
                </p>
                <div className="mt-6 flex justify-center">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : callType === 'video' ? (
            <>
              {/* Контейнер с фиксированными пропорциями */}
              <div className="max-w-6xl max-h-[85vh] w-full h-full flex items-center justify-center p-4">
                <div className="relative w-full h-full max-w-6xl max-h-[85vh] bg-gradient-to-br from-gray-900 to-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                  {/* Remote video с красивой рамкой */}
                  <video 
                    ref={remoteVideoRef} 
                    className="w-full h-full object-contain bg-gradient-to-br from-gray-900 to-black" 
                    poster=""
                    autoPlay
                    playsInline
                    muted={!soundEnabled}
                    onLoadedMetadata={() => {
                      if (remoteVideoRef.current) {
                        remoteVideoRef.current.play().catch(() => {});
                      }
                    }}
                  />
                  {!remoteVideoRef.current?.srcObject && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <div className="text-center">
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 mx-auto shadow-2xl animate-pulse">
                          <Users size={48} className="text-white" />
                        </div>
                        <p className="text-2xl text-white font-semibold mb-2">Собеседник</p>
                        <p className="text-sm text-gray-400">Видео подключается...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Local video - picture in picture с современным дизайном */}
                  <div className="absolute top-6 right-6 w-40 h-28 sm:w-56 sm:h-40 bg-gradient-to-br from-gray-900 to-black rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl backdrop-blur-sm">
                    <video 
                      ref={localVideoRef} 
                      className="w-full h-full object-cover" 
                      muted
                      autoPlay
                      playsInline
                      onLoadedMetadata={() => {
                        if (localVideoRef.current) {
                          localVideoRef.current.play().catch(() => {});
                        }
                      }}
                    />
                    {!localVideoRef.current?.srcObject && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
                        <div className="text-center">
                          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mb-1 sm:mb-2 mx-auto shadow-lg">
                            <Users size={16} className="text-white sm:hidden" />
                            <Users size={20} className="text-white hidden sm:block" />
                          </div>
                          <p className="text-xs text-gray-300 font-medium">Вы</p>
                        </div>
                      </div>
                    )}
                    <span className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 text-white text-xs bg-black/70 px-2 sm:px-3 py-1 rounded-full backdrop-blur-sm font-medium">
                      Вы
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full relative">
              {/* Анимированный фон для аудио */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <div className="w-96 h-96 border border-blue-500/20 rounded-full animate-ping"></div>
                <div className="absolute w-64 h-64 border border-purple-500/20 rounded-full animate-ping" style={{animationDelay: '1s'}}></div>
                <div className="absolute w-32 h-32 border border-pink-500/20 rounded-full animate-ping" style={{animationDelay: '2s'}}></div>
              </div>
              
              <div className="relative z-10 text-center">
                <div className="w-40 h-40 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mb-8 mx-auto shadow-2xl animate-pulse">
                  <Mic size={64} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-green-400 to-blue-500 bg-clip-text text-transparent">
                  Аудиозвонок активен
                </h2>
                <p className="text-gray-400 text-center text-lg leading-relaxed mb-6">
                  Говорите в микрофон. Видео отключено для экономии трафика.
                </p>
                <div className="flex items-center justify-center gap-3 text-sm">
                  <div className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 font-medium">Отличное качество связи</span>
                  </div>
                </div>
              </div>
              {/* Скрытые видео элементы для аудио */}
              <video ref={remoteVideoRef} className="hidden" />
              <video ref={localVideoRef} className="hidden" />
            </div>
          )}

          {/* Bottom controls с современным дизайном */}
          {(waitingForAnswer || showControls) && (
            <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-8 backdrop-blur-sm">
              <div className="flex justify-center items-center gap-6">
                {!waitingForAnswer && (
                  <>
                    <Tooltip content={micEnabled ? 'Отключить микрофон' : 'Включить микрофон'}>
                      <Button
                        isIconOnly
                        variant="solid"
                        size="lg"
                        onPress={onToggleMic}
                        className={`w-16 h-16 rounded-full transition-all duration-300 transform hover:scale-110 shadow-xl border-2 ${
                          micEnabled 
                            ? 'bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white border-gray-500/50' 
                            : 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-red-400/50'
                        }`}
                      >
                        {micEnabled ? <Mic size={28} /> : <MicOff size={28} />}
                      </Button>
                    </Tooltip>

                    {callType === 'video' && (
                      <Tooltip content={camEnabled ? 'Отключить камеру' : 'Включить камеру'}>
                        <Button
                          isIconOnly
                          variant="solid"
                          size="lg"
                          onPress={onToggleCam}
                          className={`w-16 h-16 rounded-full transition-all duration-300 transform hover:scale-110 shadow-xl border-2 ${
                            camEnabled 
                              ? 'bg-gradient-to-br from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white border-gray-500/50' 
                              : 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-red-400/50'
                          }`}
                        >
                          {camEnabled ? <Video size={28} /> : <VideoOff size={28} />}
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
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white transition-all duration-300 transform hover:scale-110 shadow-xl border-2 border-red-400/50"
                  >
                    <PhoneOff size={28} />
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