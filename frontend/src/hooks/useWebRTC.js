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

  // Инициализация медиа и peer соединения
  const start = useCallback(async (passedSocket = null) => {
    // Используем переданный WebSocket или текущий
    const activeSocket = passedSocket || signalingSocket;
    socketRef.current = activeSocket;
    
    try {
      // Получаем медиа поток в зависимости от типа звонка
      const isVideoCall = callType === 'video';
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoCall,
        audio: true
      });
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true; // Отключаем эхо
        localVideoRef.current.playsInline = true;
        localVideoRef.current.autoplay = true;
        
        // Попытка воспроизведения
        localVideoRef.current.play().catch(() => {});
      }
      
      // Создаем peer connection
      const peer = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      });
      
      peerRef.current = peer;
      
      // Добавляем локальные треки
      stream.getTracks().forEach(track => {
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
        if (event.streams && event.streams[0]) {
          const stream = event.streams[0];
          
          if (remoteVideoRef.current) {
            if (remoteVideoRef.current.srcObject !== stream) {
              if (remoteVideoRef.current.srcObject) {
                remoteVideoRef.current.pause();
              }
              
              remoteVideoRef.current.srcObject = stream;
              remoteVideoRef.current.playsInline = true;
              remoteVideoRef.current.autoplay = true;
              
              setTimeout(() => {
                if (remoteVideoRef.current && remoteVideoRef.current.srcObject === stream) {
                  remoteVideoRef.current.play().catch(() => {});
                }
              }, 100);
            }
          }
        }
      };
      
      peer.onconnectionstatechange = () => {
        setConnectionState(peer.connectionState);
        
        if (peer.connectionState === 'connected') {
          setCallActive(true);
          if (onCallAccepted) {
            onCallAccepted();
          }
        }
      };
      
      // Устанавливаем флаг готовности peer соединения
      setPeerReady(true);
      
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
  }, [signalingSocket, localVideoRef, remoteVideoRef, callType]);

  // Остановка WebRTC
  const stop = useCallback(() => {
    
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
    setPeerReady(false); // Сбрасываем флаг готовности
    socketRef.current = null; // Очищаем ссылку на WebSocket
    
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
  const endCall = () => {
    setCallActive(false);
    
    // Отправляем уведомление о завершении звонка через WebSocket
    const currentSocket = socketRef.current || signalingSocket;
    if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
      try {
        currentSocket.send(JSON.stringify({
          type: 'call-ended'
        }));
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
    createOffer,
    peerReady
  };
} 