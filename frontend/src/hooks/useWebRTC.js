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
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);

  // Функции для обработки сигнализации
  const handleOffer = useCallback(async (offer) => {
    const peer = peerRef.current;
    if (!peer) {
      console.error('Peer соединение не готово');
      return;
    }
    
    try {
      console.log('Устанавливаем remote description (offer):', offer);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      
      console.log('Создаем answer');
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      
      console.log('Отправляем answer через WebSocket');
      if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
        signalingSocket.send(JSON.stringify({ 
          type: 'answer', 
          sdp: answer 
        }));
        console.log('Answer отправлен:', answer);
      } else {
        console.error('WebSocket не готов для отправки answer');
      }
    } catch (error) {
      console.error('Ошибка при обработке offer:', error);
    }
  }, [signalingSocket]);

  const handleAnswer = useCallback(async (answer) => {
    const peer = peerRef.current;
    if (!peer) {
      console.error('Peer соединение не готово');
      return;
    }
    
    try {
      console.log('Устанавливаем remote description (answer):', answer);
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote description установлен успешно');
    } catch (error) {
      console.error('Ошибка при обработке answer:', error);
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate) => {
    const peer = peerRef.current;
    if (!peer) {
      console.error('Peer соединение не готово');
      return;
    }
    
    try {
      console.log('Добавляем ICE кандидат');
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Ошибка при добавлении ICE кандидата:', error);
    }
  }, []);

  // Инициализация медиа и peer соединения
  const start = useCallback(async () => {
    console.log('Начинаем инициализацию WebRTC...');
    
    try {
      // Получаем медиа поток в зависимости от типа звонка
      const isVideoCall = callType === 'video';
      console.log('Запрашиваем медиа поток. Видео:', isVideoCall, 'Аудио: true');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true
      });
      
      console.log('Медиа поток получен. Треки:', stream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        label: t.label
      })));
      
      console.log('Локальный медиа-поток получен');
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Отключаем эхо
        localVideoRef.current.playsInline = true;
        localVideoRef.current.autoplay = true;
        
        // Попытка воспроизведения
        localVideoRef.current.play().catch(e => {
          console.log('Не удалось автоматически воспроизвести локальное видео:', e);
        });
      }
      
      // Создаем peer connection
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      console.log('Peer соединение создано');
      peerRef.current = peer;
      
      // Добавляем локальные треки
      stream.getTracks().forEach(track => {
        console.log('Трек добавлен:', track.kind);
        peer.addTrack(track, stream);
      });
      
      // Обработчики событий peer connection
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('Отправляем ICE кандидат через WebSocket');
          if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
            signalingSocket.send(JSON.stringify({
              type: 'ice-candidate',
              candidate: event.candidate
            }));
          }
        }
      };
      
      peer.ontrack = (event) => {
        console.log('Получен удаленный поток:', event.streams[0]);
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          remoteVideoRef.current.playsInline = true;
          remoteVideoRef.current.autoplay = true;
          
          // Попытка воспроизведения
          remoteVideoRef.current.play().catch(e => {
            console.log('Не удалось автоматически воспроизвести удаленное видео:', e);
          });
        }
      };
      
      peer.onconnectionstatechange = () => {
        console.log('Состояние соединения изменилось:', peer.connectionState);
        setConnectionState(peer.connectionState);
        
        if (peer.connectionState === 'connected') {
          console.log('WebRTC соединение установлено!');
          setCallActive(true);
          // Сбрасываем состояние ожидания ответа при установке соединения
          if (onCallAccepted) {
            onCallAccepted();
          }
        }
      };
      
      // НЕ создаем offer сразу - дождемся готовности WebSocket
      // Offer будет создан в отдельной функции после установки WebSocket соединения
      console.log('WebRTC инициализирован, ожидаем готовности WebSocket для создания offer');
      
    } catch (error) {
      console.error('Ошибка при инициализации WebRTC:', error);
      
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
  }, [isCaller, signalingSocket, localVideoRef, remoteVideoRef, callType]);

  // Остановка WebRTC
  const stop = useCallback(() => {
    console.log('Останавливаем WebRTC...');
    
    // Останавливаем локальный поток
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
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
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    setCallActive(false);
    setConnectionState('closed');
    
    console.log('WebRTC остановлен');
  }, [localVideoRef, remoteVideoRef]);

  // Обработка сигнализации
  useEffect(() => {
    if (!signalingSocket) return;

    const handleMessage = (event) => {
      try {
        if (!event || !event.data) {
          console.log('Получено пустое WebSocket сообщение');
          return;
        }
        
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (parseError) {
          console.error('Ошибка парсинга JSON:', parseError);
          return;
        }
        
        console.log('Получено WebSocket сообщение:', data);
        
        if (!data || typeof data !== 'object') {
          console.warn('Получено некорректное сообщение:', data);
          return;
        }
        
        if (!data.type) {
          console.warn('Получено сообщение без типа:', data);
          return;
        }

        switch (data.type) {
          case 'connection-established':
            console.log('WebSocket соединение установлено для звонка');
            break;
          case 'offer':
            console.log('Получен offer от собеседника');
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
            console.log('Получен answer от собеседника');
            if (data.sdp && typeof data.sdp === 'object') {
              handleAnswer(data.sdp);
            } else {
              console.error('Answer получен, но данные некорректны:', data.sdp);
            }
            break;
          case 'ice-candidate':
            console.log('Получен ICE кандидат от собеседника');
            if (data.candidate && typeof data.candidate === 'object') {
              handleIceCandidate(data.candidate);
            } else {
              console.error('ICE кандидат получен, но данные некорректны:', data.candidate);
            }
            break;
          case 'call-accepted':
            console.log('Звонок принят собеседником');
            setCallActive(true);
            // Вызываем callback для обработки принятия звонка
            if (onCallAccepted) {
              onCallAccepted();
            }
            break;
          case 'call-ended':
            console.log('Звонок завершен собеседником');
            setCallActive(false);
            if (onCallEnd) {
              onCallEnd();
            }
            break;
          default:
            console.log('Неизвестный тип сообщения:', data.type);
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
  const toggleMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setMicEnabled(track.enabled);
      });
    }
  };

  // Управление камерой
  const toggleCam = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        setCamEnabled(track.enabled);
      });
    }
  };

  // Создание offer после готовности WebSocket
  const createOffer = useCallback(async () => {
    const peer = peerRef.current;
    if (!peer) {
      console.error('Peer соединение не готово для создания offer');
      return;
    }
    
    if (!signalingSocket || signalingSocket.readyState !== WebSocket.OPEN) {
      console.error('WebSocket не готов для отправки offer');
      return;
    }
    
    try {
      console.log('Создаем offer для WebRTC соединения');
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      
      console.log('Отправляем offer через WebSocket');
      signalingSocket.send(JSON.stringify({
        type: 'offer',
        sdp: offer
      }));
      console.log('Offer отправлен:', offer);
    } catch (error) {
      console.error('Ошибка при создании offer:', error);
    }
  }, [signalingSocket]);

  // Завершение звонка
  const endCall = () => {
    console.log('Завершение звонка...');
    setCallActive(false);
    
    // Отправляем уведомление о завершении звонка через WebSocket
    if (signalingSocket && signalingSocket.readyState === WebSocket.OPEN) {
      try {
        signalingSocket.send(JSON.stringify({
          type: 'call-ended'
        }));
        console.log('Уведомление о завершении звонка отправлено');
      } catch (error) {
        console.error('Ошибка при отправке уведомления о завершении звонка:', error);
      }
    }
    
    // Останавливаем WebRTC
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Очищаем видео элементы
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    // Вызываем callback
    if (onCallEnd) onCallEnd();
  };

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
    createOffer
  };
} 