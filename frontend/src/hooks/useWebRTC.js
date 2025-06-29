import { useRef, useEffect, useState, useCallback } from 'react';

const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

export default function useWebRTC({
  localVideoRef,
  remoteVideoRef,
  signalingSocket,
  isCaller,
  callType = 'video',
  onCallEnd,
  onError,
  onOfferReceived,
  onCallAccepted
}) {
  const [callActive, setCallActive] = useState(false);
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState('new');
  const [peerReady, setPeerReady] = useState(false); // Флаг готовности peer
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null); // Сохраняем ссылку на WebSocket

  // Функции для обработки сигнализации
  const handleOffer = useCallback(async (offer) => {
    const peer = peerRef.current;
    if (!peer) {
      console.error('❌ Peer соединение не готово для обработки offer');
      return;
    }
    
    try {
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      
      const currentSocket = socketRef.current || signalingSocket;
      if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
        currentSocket.send(JSON.stringify({ 
          type: 'answer', 
          sdp: answer 
        }));
      } else {
        console.error('❌ WebSocket не готов для отправки answer');
      }
    } catch (error) {
      console.error('❌ Ошибка при обработке offer:', error);
    }
  }, [signalingSocket]);

  const handleAnswer = useCallback(async (answer) => {
    const peer = peerRef.current;
    if (!peer) {
      console.error('❌ Peer соединение не готово для обработки answer');
      return;
    }
    
    try {
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('❌ Ошибка при обработке answer:', error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate) => {
    const peer = peerRef.current;
    if (!peer) {
      console.error('❌ Peer соединение не готово для ICE кандидата');
      return;
    }
    
    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('❌ Ошибка при добавлении ICE кандидата:', error);
    }
  }, []);

  // Улучшенная функция настройки локального видео
  const setupLocalVideo = useCallback((stream) => {
    if (!localVideoRef || !localVideoRef.current) {
      console.warn('⚠️ localVideoRef не доступен для настройки видео');
      return;
    }
    
    console.log('🎥 Настройка локального видео...');
    console.log('📹 Видео элемент:', localVideoRef.current);
    console.log('📹 Поток:', stream);
    console.log('📹 Видео треки:', stream.getVideoTracks());
    
    // Очищаем старые обработчики
    localVideoRef.current.onloadedmetadata = null;
    localVideoRef.current.oncanplay = null;
    
    // Настраиваем видео элемент
    localVideoRef.current.srcObject = stream;
    localVideoRef.current.muted = true; // Отключаем эхо
    localVideoRef.current.playsInline = true;
    localVideoRef.current.autoplay = true;
    localVideoRef.current.controls = false;
    
    // Убираем poster чтобы видео сразу показывалось
    localVideoRef.current.poster = '';
    
    // Обработчики событий для лучшего контроля
    localVideoRef.current.onloadedmetadata = () => {
      console.log('✅ Метаданные локального видео загружены');
      if (localVideoRef.current) {
        localVideoRef.current.play()
          .then(() => {
            console.log('✅ Локальное видео успешно воспроизводится');
          })
          .catch((error) => {
            console.warn('⚠️ Не удалось автоматически воспроизвести локальное видео:', error);
          });
      }
    };
    
    localVideoRef.current.oncanplay = () => {
      console.log('✅ Локальное видео готово к воспроизведению');
      // Дополнительная попытка воспроизведения
      if (localVideoRef.current && localVideoRef.current.paused) {
        localVideoRef.current.play().catch(() => {});
      }
    };
    
    // Проверяем состояние видео элемента
    console.log('📹 readyState:', localVideoRef.current.readyState);
    console.log('📹 paused:', localVideoRef.current.paused);
    
    // Принудительное воспроизведение
    const forcePlay = () => {
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        console.log('🔄 Попытка принудительного воспроизведения локального видео');
        localVideoRef.current.play()
          .then(() => {
            console.log('✅ Принудительное воспроизведение локального видео успешно');
          })
          .catch((error) => {
            console.warn('⚠️ Принудительное воспроизведение не удалось:', error);
          });
      }
    };
    
    // Немедленная попытка
    forcePlay();
    
    // Несколько попыток с интервалами
    setTimeout(forcePlay, 100);
    setTimeout(forcePlay, 500);
    setTimeout(forcePlay, 1000);
    setTimeout(forcePlay, 2000);
    
  }, []);

  // Инициализация медиа и peer соединения
  const start = useCallback(async (passedSocket = null) => {
    // Используем переданный WebSocket или текущий
    const activeSocket = passedSocket || signalingSocket;
    socketRef.current = activeSocket;
    
    try {
      // Получаем медиа поток в зависимости от типа звонка
      const isVideoCall = callType === 'video';
      
      console.log('🎥 Запрашиваем доступ к медиа устройствам...', { video: isVideoCall, audio: true });
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall ? {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        } : false,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      localStreamRef.current = stream;
      console.log('✅ Медиа поток получен:', stream.getTracks());
      
      // Настраиваем локальное видео с улучшенной логикой
      if (isVideoCall) {
        console.log('📹 Настройка локального видео для видеозвонка');
        
        // Функция для настройки видео с повторными попытками
        const trySetupLocalVideo = (attemptNumber = 1) => {
          if (localVideoRef && localVideoRef.current) {
            console.log(`✅ localVideoRef доступен (попытка ${attemptNumber})`);
            // Немедленно настраиваем видео элемент
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
            localVideoRef.current.playsInline = true;
            localVideoRef.current.autoplay = true;
            
            // Дополнительная настройка через функцию
            setupLocalVideo(stream);
          } else if (attemptNumber < 10) {
            console.warn(`⚠️ localVideoRef не доступен, попытка ${attemptNumber}/10`);
            // Попробуем еще раз через короткий интервал
            setTimeout(() => {
              trySetupLocalVideo(attemptNumber + 1);
            }, 200 * attemptNumber); // Увеличиваем интервал с каждой попыткой
          } else {
            console.error('❌ Не удалось настроить локальное видео после 10 попыток');
          }
        };
        
        // Начинаем попытки настройки видео
        trySetupLocalVideo();
      } else {
        console.log('🎙️ Аудиозвонок - локальное видео не требуется');
      }
      
      // Создаем peer connection
      const peer = new RTCPeerConnection({
        iceServers: STUN_SERVERS
      });
      
      peerRef.current = peer;
      
      // Добавляем локальные треки
      stream.getTracks().forEach(track => {
        console.log('➕ Добавляем трек:', track.kind, track.label);
        peer.addTrack(track, stream);
      });
      
      // Обработчики событий peer connection
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          const currentSocket = socketRef.current;
          
          if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
            try {
              currentSocket.send(JSON.stringify({
                type: 'ice-candidate',
                candidate: event.candidate
              }));
            } catch (error) {
              console.error('Error sending ICE candidate:', error);
            }
          }
        }
      };
      
      peer.ontrack = (event) => {
        console.log('📺 Получен удаленный поток:', event);
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0];
          
          if (remoteVideoRef.current) {
            if (remoteVideoRef.current.srcObject !== stream) {
              if (remoteVideoRef.current.srcObject) {
                remoteVideoRef.current.pause();
              }
              
              console.log('🎥 Настройка удаленного видео...');
              remoteVideoRef.current.srcObject = stream;
              remoteVideoRef.current.playsInline = true;
              remoteVideoRef.current.autoplay = true;
              
              // Немедленная попытка воспроизведения
              remoteVideoRef.current.play()
                .then(() => {
                  console.log('✅ Удаленное видео воспроизводится');
                })
                .catch((error) => {
                  console.warn('⚠️ Не удалось воспроизвести удаленное видео:', error);
                });
            }
          }
        }
      };
      
      peer.onconnectionstatechange = () => {
        console.log('🔗 Состояние соединения изменилось:', peer.connectionState);
        setConnectionState(peer.connectionState);
        
        if (peer.connectionState === 'connected') {
          setCallActive(true);
          console.log('✅ Звонок подключен!');
          
                  // Проверяем и настраиваем локальное видео при подключении
        if (callType === 'video' && localStreamRef.current) {
          console.log('🔄 Проверка локального видео после подключения');
          
          if (!localVideoRef || !localVideoRef.current) {
            console.warn('⚠️ localVideoRef недоступен после подключения, попробуем позже');
            // Попробуем еще раз через небольшой интервал
            const retryCount = 5;
            let attempts = 0;
            
            const retrySetupVideo = setInterval(() => {
              attempts++;
              if (localVideoRef && localVideoRef.current && localStreamRef.current) {
                console.log('✅ localVideoRef теперь доступен, настраиваем видео');
                setupLocalVideo(localStreamRef.current);
                clearInterval(retrySetupVideo);
              } else if (attempts >= retryCount) {
                console.error('❌ Не удалось получить доступ к localVideoRef после нескольких попыток');
                clearInterval(retrySetupVideo);
              }
            }, 500);
          } else {
            if (!localVideoRef.current.srcObject) {
              console.log('⚠️ Локальное видео не настроено, настраиваем сейчас');
              setupLocalVideo(localStreamRef.current);
            } else if (localVideoRef.current.paused) {
              console.log('⚠️ Локальное видео на паузе, запускаем воспроизведение');
              localVideoRef.current.play().catch(() => {});
            }
          }
        }
          
          if (onCallAccepted) {
            onCallAccepted();
          }
        } else if (peer.connectionState === 'failed') {
          console.error('❌ Соединение не удалось');
          if (onError) {
            onError(new Error('Соединение не удалось. Попробуйте еще раз.'));
          }
        } else if (peer.connectionState === 'disconnected') {
          console.warn('⚠️ Соединение потеряно');
        }
      };
      
      // Мониторинг ICE соединения для обнаружения зависания
      peer.oniceconnectionstatechange = () => {
        console.log('🧊 ICE состояние:', peer.iceConnectionState);
        
        if (peer.iceConnectionState === 'failed') {
          console.error('❌ ICE соединение не удалось');
          if (onError) {
            onError(new Error('Не удалось установить прямое соединение. Попробуйте еще раз.'));
          }
        } else if (peer.iceConnectionState === 'disconnected') {
          console.warn('⚠️ ICE соединение потеряно');
        }
      };
      
      // Устанавливаем флаг готовности peer соединения
      setPeerReady(true);
      console.log('✅ WebRTC инициализация завершена');
      
    } catch (error) {
      console.error('❌ Ошибка при инициализации WebRTC:', error);
      
      // Более детальная обработка ошибок
      if (error.name === 'NotAllowedError') {
        console.error('Пользователь отклонил доступ к камере/микрофону');
        if (onError) onError(new Error('Доступ к камере/микрофону отклонен'));
      } else if (error.name === 'NotFoundError') {
        console.error('Камера или микрофон не найдены');
        if (onError) onError(new Error('Камера или микрофон не найдены'));
      } else if (error.name === 'NotReadableError') {
        console.error('Камера или микрофон уже используются');
        if (onError) onError(new Error('Камера или микрофон уже используются'));
      } else {
        if (onError) onError(error);
      }
    }
  }, [signalingSocket, callType, onError, onCallAccepted, localVideoRef, remoteVideoRef]);

  // Остановка WebRTC
  const stop = useCallback(() => {
    console.log('🛑 Остановка WebRTC соединения');
    
    // Останавливаем локальный поток
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('🛑 Останавливаем трек:', track.kind);
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    // Закрываем peer connection
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    
    // Очищаем видео элементы
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      localVideoRef.current.pause();
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.pause();
    }
    
    setCallActive(false);
    setConnectionState('closed');
    setPeerReady(false);
    socketRef.current = null;
    
    console.log('✅ WebRTC соединение остановлено');
  }, [localVideoRef, remoteVideoRef]);

  // Обработка сигнализации
  useEffect(() => {
    if (!signalingSocket) return;

    const handleMessage = (event) => {
      try {
        if (!event || !event.data) {
          return;
        }
        
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (parseError) {
          console.error('Ошибка парсинга JSON:', parseError);
          return;
        }
        
        
        if (!data || typeof data !== 'object') {
          return;
        }
        
        if (!data.type) {
          return;
        }

        switch (data.type) {
          case 'connection-established':
            break;
          case 'offer':
            if (data.sdp && typeof data.sdp === 'object') {
              // Сбрасываем состояние ожидания ответа при получении offer
              if (onOfferReceived) {
                onOfferReceived();
              }
              handleOffer(data.sdp);
            } else {
              console.error('Offer получен, но данные некорректны:', data.sdp);
            }
            break;
          case 'answer':
            if (data.sdp && typeof data.sdp === 'object') {
              handleAnswer(data.sdp);
            } else {
              console.error('Answer получен, но данные некорректны:', data.sdp);
            }
            break;
          case 'ice-candidate':
            if (data.candidate && typeof data.candidate === 'object') {
              handleIceCandidate(data.candidate);
            } else {
              console.error('ICE кандидат получен, но данные некорректны:', data.candidate);
            }
            break;
          case 'call-accepted':
            setCallActive(true);
            // Вызываем callback для обработки принятия звонка
            if (onCallAccepted) {
              onCallAccepted();
            }
            break;
          case 'call-ended':
            setCallActive(false);
            if (onCallEnd) {
              onCallEnd();
            }
            break;
          default:
        }
      } catch (error) {
        console.error('Ошибка при обработке WebSocket сообщения:', error, 'Данные:', event?.data);
      }
    };

    signalingSocket.addEventListener('message', handleMessage);
    return () => {
      signalingSocket.removeEventListener('message', handleMessage);
    };
  }, [signalingSocket, handleOffer, handleAnswer, handleIceCandidate, onCallEnd, onCallAccepted]);

  // Управление микрофоном
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log('🎤 Микрофон:', track.enabled ? 'включен' : 'отключен');
        setMicEnabled(track.enabled);
      });
    }
  }, []);

  // Управление камерой
  const toggleCam = useCallback(() => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
        console.log('📹 Камера:', track.enabled ? 'включена' : 'отключена');
        setCamEnabled(track.enabled);
      });
      
      // Если камера включена, попробуем снова настроить локальное видео
      if (videoTracks.some(track => track.enabled) && localVideoRef.current) {
        setupLocalVideo(localStreamRef.current);
      }
    }
  }, [setupLocalVideo]);

  // Создание offer после готовности WebSocket И peer соединения
  const createOffer = useCallback(async () => {
    
    if (!peerReady) {
      console.error('Peer соединение еще не готово для создания offer');
      return;
    }
    
    const peer = peerRef.current;
    if (!peer) {
      console.error('Peer соединение не найдено');
      return;
    }
    
    const currentSocket = socketRef.current || signalingSocket;
    if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket не готов для отправки offer');
      return;
    }
    
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      
      currentSocket.send(JSON.stringify({
        type: 'offer',
        sdp: offer
      }));
    } catch (error) {
      console.error('Ошибка при создании offer:', error);
    }
  }, [signalingSocket, peerReady]);

  // Завершение звонка
  const endCall = useCallback(() => {
    console.log('📞 Завершение звонка...');
    setCallActive(false);
    
    // Отправляем уведомление о завершении звонка через WebSocket
    const currentSocket = socketRef.current || signalingSocket;
    if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
      try {
        currentSocket.send(JSON.stringify({
          type: 'call-ended'
        }));
        console.log('✅ Уведомление о завершении звонка отправлено');
      } catch (error) {
        console.error('❌ Ошибка при отправке уведомления о завершении звонка:', error);
      }
    }
    
    // Останавливаем WebRTC
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log('🛑 Останавливаем трек при завершении:', track.kind);
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    // Очищаем видео элементы
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
      localVideoRef.current.pause();
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.pause();
    }
    
    // Сбрасываем состояния
    setConnectionState('closed');
    setPeerReady(false);
    socketRef.current = null;
    
    // Вызываем callback
    if (onCallEnd) {
      console.log('✅ Вызываем callback завершения звонка');
      onCallEnd();
    }
    
    console.log('✅ Звонок завершен');
  }, [signalingSocket, localVideoRef, remoteVideoRef, onCallEnd]);

  // Эффект для проверки и настройки локального видео
  useEffect(() => {
    if (callActive && callType === 'video' && localStreamRef.current && localVideoRef && localVideoRef.current) {
      // Проверяем состояние локального видео каждые 2 секунды
      const checkInterval = setInterval(() => {
        if (!localVideoRef.current) {
          clearInterval(checkInterval);
          return;
        }
        
        const hasVideoTracks = localStreamRef.current.getVideoTracks().length > 0;
        const hasEnabledVideoTracks = localStreamRef.current.getVideoTracks().some(t => t.enabled);
        
        if (hasVideoTracks && hasEnabledVideoTracks) {
          if (!localVideoRef.current.srcObject) {
            console.log('⚠️ Локальное видео потеряло поток, восстанавливаем');
            setupLocalVideo(localStreamRef.current);
          } else if (localVideoRef.current.paused) {
            console.log('⚠️ Локальное видео на паузе, перезапускаем');
            localVideoRef.current.play().catch(() => {});
          }
        }
      }, 2000);
      
      return () => clearInterval(checkInterval);
    }
  }, [callActive, callType, setupLocalVideo]);

  return {
    start,
    endCall,
    toggleMic,
    toggleCam,
    micEnabled,
    camEnabled,
    callActive,
    connectionState,
    stop,
    createOffer,
    peerReady
  };
} 