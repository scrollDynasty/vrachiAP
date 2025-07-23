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
  const remoteStreamRef = useRef(null); // Добавляем ref для удаленного потока
  const socketRef = useRef(null); // Сохраняем ссылку на WebSocket
  const activeRef = useRef(true); // Флаг активности экземпляра
  const timersRef = useRef([]); // Массив для отслеживания всех таймеров

  // Вспомогательные функции для управления таймерами
  const addTimer = useCallback((timerId) => {
    if (activeRef.current) {
      timersRef.current.push(timerId);
    }
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(timerId => {
      clearTimeout(timerId);
    });
    timersRef.current = [];
  }, []);

  const safeSetTimeout = useCallback((callback, delay) => {
    if (!activeRef.current) return null;
    
    const timerId = setTimeout(() => {
      if (activeRef.current) {
        callback();
      }
    }, delay);
    
    addTimer(timerId);
    return timerId;
  }, [addTimer]);

  // Полная остановка всех медиа треков и освобождение устройств
  const stopAllMediaTracks = useCallback(() => {
    console.log('🛑 Начинаем полную остановку всех медиа треков...');
    let tracksCount = 0;
    
    // Собираем все активные треки для подробного логирования
    const allTracks = [];
    
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      allTracks.push(...tracks);
      
      console.log(`📊 Найдено ${tracks.length} треков в локальном потоке:`);
      tracks.forEach((track, index) => {
        console.log(`  Трек ${index + 1}: ${track.kind} "${track.label}" (${track.readyState})`);
        
        try {
          if (track.readyState !== 'ended') {
            console.log(`🛑 Останавливаем трек ${index + 1}: ${track.kind} "${track.label}"`);
            track.stop();
            tracksCount++;
            // Проверяем что трек действительно остановлен
            setTimeout(() => {
              console.log(`  ✅ Трек ${index + 1} состояние после остановки: ${track.readyState}`);
            }, 100);
          } else {
            console.log(`  ⏭️ Трек ${index + 1} уже остановлен`);
          }
        } catch (error) {
          console.warn(`⚠️ Ошибка при остановке трека ${index + 1}:`, error);
        }
      });
      
      // Очищаем ссылку на поток
      localStreamRef.current = null;
      console.log('🔄 Локальный поток очищен');
    }
    
    // Также очищаем удаленный поток
    if (remoteStreamRef.current) {
      const remoteTracks = remoteStreamRef.current.getTracks();
      if (remoteTracks.length > 0) {
        console.log(`📊 Найдено ${remoteTracks.length} треков в удаленном потоке`);
        remoteTracks.forEach((track, index) => {
          try {
            if (track.readyState !== 'ended') {
              console.log(`🛑 Останавливаем удаленный трек ${index + 1}: ${track.kind}`);
              track.stop();
            }
          } catch (error) {
            console.warn(`⚠️ Ошибка при остановке удаленного трека ${index + 1}:`, error);
          }
        });
      }
      remoteStreamRef.current = null;
      console.log('🔄 Удаленный поток очищен');
    }
    
    // Полностью очищаем видео элементы и их источники
    if (localVideoRef && localVideoRef.current) {
      try {
        console.log('🧹 Очищаем локальный видео элемент...');
        localVideoRef.current.pause();
        localVideoRef.current.srcObject = null;
        localVideoRef.current.src = '';
        localVideoRef.current.load();
        console.log('✅ Локальный видео элемент очищен');
      } catch (error) {
        console.warn('⚠️ Ошибка при очистке локального видео элемента:', error);
      }
    }
    
    if (remoteVideoRef && remoteVideoRef.current) {
      try {
        console.log('🧹 Очищаем удаленный видео элемент...');
        remoteVideoRef.current.pause();
        remoteVideoRef.current.srcObject = null;
        remoteVideoRef.current.src = '';
        remoteVideoRef.current.load();
        console.log('✅ Удаленный видео элемент очищен');
      } catch (error) {
        console.warn('⚠️ Ошибка при очистке удаленного видео элемента:', error);
      }
    }
    
    console.log(`✅ Остановлено ${tracksCount} медиа треков`);
    
    // Принудительная проверка через 1.5 секунды на случай "забытых" треков
    setTimeout(() => {
      console.log('🔍 Дополнительная проверка не остановленных треков...');
      
      // Проверяем все треки которые были активны
      allTracks.forEach((track, index) => {
        if (track.readyState !== 'ended') {
          console.warn(`⚠️ Трек ${index + 1} все еще активен: ${track.kind} "${track.label}" (${track.readyState})`);
          try {
            console.log(`🔄 Принудительно останавливаем "забытый" трек ${index + 1}`);
            track.stop();
            setTimeout(() => {
              console.log(`  ✅ "Забытый" трек ${index + 1} финальное состояние: ${track.readyState}`);
            }, 200);
          } catch (error) {
            console.error(`❌ Не удалось принудительно остановить трек ${index + 1}:`, error);
          }
        }
      });
      
      // Дополнительное освобождение устройств через создание и немедленную остановку пустого потока
      console.log('🔄 Принудительное освобождение медиа устройств...');
      
      // Пытаемся получить доступ к камере и микрофону, затем сразу освобождаем
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((tempStream) => {
          console.log('📷 Получен временный поток для освобождения устройств');
          const tempTracks = tempStream.getTracks();
          tempTracks.forEach((track, index) => {
            console.log(`🛑 Останавливаем временный трек ${index + 1}: ${track.kind}`);
            track.stop();
          });
          
          // Финальная проверка освобождения через задержку
          setTimeout(() => {
            console.log('🔍 Проверяем освобождение устройств...');
            navigator.mediaDevices.getUserMedia({ video: false, audio: false })
              .then(() => {
                console.log('✅ Медиа устройства успешно освобождены');
              })
              .catch(() => {
                console.log('✅ Устройства освобождены (ожидаемая ошибка при пустом запросе)');
              });
          }, 500);
        })
        .catch((error) => {
          console.log('ℹ️ Не удалось создать временный поток (это нормально если устройства уже освобождены):', error.message);
        });
    }, 1500);
    
  }, [localVideoRef, remoteVideoRef]);

  // Форсированное освобождение медиа устройств (для случаев когда иконка продолжает гореть)
  const forceReleaseMediaDevices = useCallback(() => {
    console.log('🚨 ФОРСИРОВАННОЕ освобождение медиа устройств начато...');
    
    // Останавливаем все медиа треки
    stopAllMediaTracks();
    
    // Дополнительные попытки освобождения с разными стратегиями
    setTimeout(() => {
      console.log('🔄 Стратегия 1: Создание и остановка временного потока...');
      
      // Создаем пустой медиа поток и сразу его останавливаем
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          console.log('📷 Временный поток создан для принудительного освобождения');
          const tracks = stream.getTracks();
          
          // Немедленно останавливаем все треки
          tracks.forEach((track, index) => {
            console.log(`🛑 Принудительно останавливаем временный трек ${index + 1}: ${track.kind} "${track.label}"`);
            track.stop();
            
            // Проверяем состояние трека через короткую задержку
            setTimeout(() => {
              console.log(`  Временный трек ${index + 1} состояние: ${track.readyState}`);
            }, 100);
          });
          
          // Стратегия 2: Множественные попытки через разные интервалы
          setTimeout(() => {
            console.log('🔄 Стратегия 2: Множественные освобождения...');
            
            for (let i = 0; i < 3; i++) {
              setTimeout(() => {
                console.log(`🔄 Освобождение попытка ${i + 1}/3`);
                
                navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                  .then((tempStream2) => {
                    tempStream2.getTracks().forEach(track => {
                      console.log(`🛑 Быстрая остановка трека: ${track.kind}`);
                      track.stop();
                    });
                  })
                  .catch(() => {
                    console.log(`✅ Попытка ${i + 1}: устройства недоступны (хороший знак)`);
                  });
              }, i * 300);
            }
          }, 500);
          
          // Финальная проверка через более длительный период
          setTimeout(() => {
            console.log('🔍 Финальная проверка освобождения медиа устройств...');
            
            // Пытаемся получить доступ без разрешений - должно не сработать если все освобождено
            navigator.mediaDevices.getUserMedia({ video: false, audio: false })
              .then(() => {
                console.log('✅ Финальная проверка: медиа устройства освобождены');
              })
              .catch(() => {
                console.log('✅ Финальная проверка: устройства освобождены (ожидаемая ошибка)');
              });
              
            // Дополнительная попытка с видео - если не получится, значит освобождено
            navigator.mediaDevices.getUserMedia({ video: { width: 1, height: 1 }, audio: false })
              .then((testStream) => {
                console.warn('⚠️ ВНИМАНИЕ: Удалось получить доступ к камере, принудительно останавливаем');
                testStream.getTracks().forEach(track => {
                  console.log('🛑 Экстренная остановка тестового трека');
                  track.stop();
                });
              })
              .catch(() => {
                console.log('✅ Отличная новость: камера полностью недоступна, значит освобождена');
              });
          }, 2000);
        })
        .catch((error) => {
          console.log('✅ Хорошие новости: не удалось создать временный поток - устройства уже освобождены');
          console.log('   Ошибка:', error.message);
        });
    }, 200);
    
    // Альтернативная стратегия: прямое обращение к getUserMedia с невалидными параметрами
    setTimeout(() => {
      console.log('🔄 Стратегия 3: Альтернативный способ освобождения...');
      
      // Используем различные комбинации параметров для "встряски" системы
      const attempts = [
        { video: { width: { exact: 1 } }, audio: false },
        { video: false, audio: { sampleRate: { exact: 1 } } },
        { video: { deviceId: 'nonexistent' }, audio: false }
      ];
      
      attempts.forEach((constraints, index) => {
        setTimeout(() => {
          navigator.mediaDevices.getUserMedia(constraints)
            .then(stream => {
              console.log(`⚠️ Неожиданно получен поток в попытке ${index + 1}, останавливаем`);
              stream.getTracks().forEach(track => track.stop());
            })
            .catch(() => {
              console.log(`✅ Попытка ${index + 1}: ожидаемая неудача, устройства недоступны`);
            });
        }, index * 100);  
      });
    }, 1000);
    
    console.log('🚨 Форсированное освобождение медиа устройств завершено');
  }, [stopAllMediaTracks]);

  // Функции для обработки сигнализации
  const handleOffer = useCallback(async (offer) => {
    const peer = peerRef.current;
    if (!peer) {
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
      }
    } catch (error) {
      // Тихо игнорируем ошибки
    }
  }, [signalingSocket]);

  const handleAnswer = useCallback(async (answer) => {
    const peer = peerRef.current;
    if (!peer) {
      return;
    }
    
    try {
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      // Тихо игнорируем ошибки
    }
  }, []);

  const handleIceCandidate = useCallback(async (candidate) => {
    const peer = peerRef.current;
    if (!peer) {
      return;
    }
    
    try {
      await peer.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      // Тихо игнорируем ошибки
    }
  }, []);

  // Улучшенная функция настройки локального видео
  const setupLocalVideo = useCallback((stream) => {
    if (!localVideoRef || !localVideoRef.current || !document.contains(localVideoRef.current)) {
      return;
    }
    
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
      if (localVideoRef.current && document.contains(localVideoRef.current)) {
        localVideoRef.current.play().catch(() => {});
      }
    };
    
    localVideoRef.current.oncanplay = () => {
      // Дополнительная попытка воспроизведения
      if (localVideoRef.current && localVideoRef.current.paused && document.contains(localVideoRef.current)) {
        localVideoRef.current.play().catch(() => {});
      }
    };
    
    // Принудительное воспроизведение с улучшенной логикой
    const forcePlay = (attemptNumber = 1) => {
      if (!activeRef.current) return; // Проверяем активность
      
      if (localVideoRef.current && localVideoRef.current.srcObject && document.contains(localVideoRef.current)) {
        localVideoRef.current.play()
          .then(() => {
            // Успешно воспроизведено
          })
          .catch(() => {
            // Если не удалось, попробуем еще раз через небольшой интервал
            if (attemptNumber < 5 && activeRef.current) {
              safeSetTimeout(() => forcePlay(attemptNumber + 1), 500 * attemptNumber);
            }
          });
      }
    };
    
    // Немедленная попытка
    forcePlay();
    
    // Несколько попыток с интервалами
    safeSetTimeout(() => forcePlay(2), 100);
    safeSetTimeout(() => forcePlay(3), 500);
    safeSetTimeout(() => forcePlay(4), 1000);
    safeSetTimeout(() => forcePlay(5), 2000);
    
  }, [safeSetTimeout]);

  // Инициализация медиа и peer соединения
  const start = useCallback(async (passedSocket = null) => {
    // Используем переданный WebSocket или текущий
    const activeSocket = passedSocket || signalingSocket;
    socketRef.current = activeSocket;
    
    try {
      // Получаем медиа поток в зависимости от типа звонка
      const isVideoCall = callType === 'video';
      
              // Запрашиваем доступ к медиа устройствам
      
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
              // Медиа поток получен
      
      // Настраиваем локальное видео с улучшенной логикой
      if (isVideoCall) {
        // Настройка локального видео для видеозвонка
        
        // Функция для настройки видео с повторными попытками
        const trySetupLocalVideo = (attemptNumber = 1) => {
          // Проверяем активность экземпляра
          if (!activeRef.current) {
                          // WebRTC экземпляр неактивен, останавливаем попытки настройки видео
            return;
          }
          
          // Проверяем не только наличие ref, но и что элемент действительно в DOM
          if (localVideoRef && localVideoRef.current && document.contains(localVideoRef.current)) {
                          // localVideoRef доступен
            // Немедленно настраиваем видео элемент
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
            localVideoRef.current.playsInline = true;
            localVideoRef.current.autoplay = true;
            
            // Дополнительная настройка через функцию
            setupLocalVideo(stream);
          } else if (attemptNumber <= 20) { // Увеличили до 20 попыток
            console.warn(`⚠️ localVideoRef не доступен, попытка ${attemptNumber}/20`);
            // Используем экспоненциальную задержку с максимумом в 2 секунды
            const delay = Math.min(500 * Math.pow(1.2, attemptNumber - 1), 2000);
            safeSetTimeout(() => {
              trySetupLocalVideo(attemptNumber + 1);
            }, delay);
          } else {
            console.error('❌ Не удалось настроить локальное видео после 20 попыток');
            // Последняя попытка - попробуем настроить через более длительный интервал
            safeSetTimeout(() => {
              if (activeRef.current && localVideoRef && localVideoRef.current) {
                console.log('🔄 Финальная попытка настройки локального видео');
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.muted = true;
                localVideoRef.current.playsInline = true;
                localVideoRef.current.autoplay = true;
                setupLocalVideo(stream);
              }
            }, 3000);
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
          
          // Сохраняем удаленный поток в ref для последующего восстановления
          remoteStreamRef.current = stream;
          
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
          
          if (!localVideoRef || !localVideoRef.current || !document.contains(localVideoRef.current)) {
            console.warn('⚠️ localVideoRef недоступен после подключения, попробуем позже');
            // Попробуем еще раз через интервалы с экспоненциальной задержкой
            const retryCount = 15; // Увеличили количество попыток
            let attempts = 0;
            
            const retrySetupVideo = () => {
              if (!activeRef.current) return; // Проверяем активность
              
              attempts++;
              if (localVideoRef && localVideoRef.current && document.contains(localVideoRef.current) && localStreamRef.current) {
                console.log('✅ localVideoRef теперь доступен, настраиваем видео');
                setupLocalVideo(localStreamRef.current);
              } else if (attempts < retryCount) {
                console.log(`🔄 Повторная попытка настройки видео после подключения (${attempts}/${retryCount})`);
                safeSetTimeout(retrySetupVideo, 800);
              } else {
                console.error('❌ Не удалось получить доступ к localVideoRef после нескольких попыток');
                // Последняя попытка через большой интервал
                safeSetTimeout(() => {
                  if (activeRef.current && localVideoRef && localVideoRef.current && localStreamRef.current) {
                    console.log('🔄 Финальная попытка настройки видео после подключения');
                    setupLocalVideo(localStreamRef.current);
                  }
                }, 2000);
              }
            };
            
            retrySetupVideo();
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
              // WebRTC инициализация завершена
      
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
            // Остановка WebRTC соединения
    
    // Деактивируем экземпляр чтобы остановить все работающие таймеры
    activeRef.current = false;
    
    // Очищаем все активные таймеры
    clearAllTimers();
    
    // Останавливаем все медиа треки и освобождаем устройства
    stopAllMediaTracks();
    
    // Закрываем peer connection
    if (peerRef.current) {
      try {
        console.log('🔌 Закрываем peer connection');
        peerRef.current.close();
        console.log('✅ Peer connection закрыт');
      } catch (error) {
        console.warn('⚠️ Ошибка при закрытии peer connection:', error);
      }
      peerRef.current = null;
    }
    
    // Удаляем обработчики событий видео элементов
    if (localVideoRef && localVideoRef.current) {
      try {
        localVideoRef.current.onloadedmetadata = null;
        localVideoRef.current.oncanplay = null;
        localVideoRef.current.onplay = null;
        localVideoRef.current.onpause = null;
        localVideoRef.current.onerror = null;
      } catch (error) {
        console.warn('⚠️ Ошибка при удалении обработчиков localVideoRef:', error);
      }
    }
    
    if (remoteVideoRef && remoteVideoRef.current) {
      try {
        remoteVideoRef.current.onloadedmetadata = null;
        remoteVideoRef.current.oncanplay = null;
        remoteVideoRef.current.onplay = null;
        remoteVideoRef.current.onpause = null;
        remoteVideoRef.current.onerror = null;
      } catch (error) {
        console.warn('⚠️ Ошибка при удалении обработчиков remoteVideoRef:', error);
      }
    }
    
    // Сбрасываем все состояния
    setCallActive(false);
    setConnectionState('new'); // Устанавливаем в исходное состояние
    setPeerReady(false);
    setMicEnabled(true);
    setCamEnabled(true);
    socketRef.current = null;
    
          // WebRTC соединение остановлено, медиа устройства освобождены, все таймеры очищены
  }, [clearAllTimers, stopAllMediaTracks]);

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
    if (!activeRef.current || !localStreamRef.current) {
      console.warn('⚠️ Попытка переключения камеры при неактивном состоянии');
      return;
    }
    
    const videoTracks = localStreamRef.current.getVideoTracks();
    
    if (videoTracks.length === 0) {
      console.warn('⚠️ Видео треки не найдены для переключения');
      return;
    }
    
    videoTracks.forEach((track, index) => {
      const oldEnabled = track.enabled;
      track.enabled = !track.enabled;
      
      console.log(`📹 Видео трек ${index + 1} (${track.label}): ${oldEnabled ? 'включена' : 'отключена'} → ${track.enabled ? 'включена' : 'отключена'}`);
      
      // Обновляем состояние на основе любого включенного трека
      setCamEnabled(track.enabled);
    });
    
    // Если камера включена, попробуем снова настроить локальное видео
    const hasEnabledVideo = videoTracks.some(track => track.enabled);
    
    if (hasEnabledVideo && localVideoRef && localVideoRef.current) {
      console.log('🎥 Настраиваем локальное видео после включения камеры');
      setupLocalVideo(localStreamRef.current);
    } else if (!hasEnabledVideo) {
      console.log('📹 Камера выключена, очищаем локальное видео');
      
      // Очищаем видео элемент при выключении камеры
      if (localVideoRef && localVideoRef.current) {
        try {
          localVideoRef.current.pause();
          // НЕ удаляем srcObject полностью, просто ставим на паузу
        } catch (error) {
          console.warn('⚠️ Ошибка при паузе локального видео:', error);
        }
      }
    }
    
    console.log(`✅ Камера ${hasEnabledVideo ? 'включена' : 'выключена'}`);
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
              // Завершение звонка
    
    // Деактивируем экземпляр чтобы остановить все работающие таймеры
    activeRef.current = false;
    
    // Очищаем все активные таймеры
    clearAllTimers();
    
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
    
    // Останавливаем все медиа треки и освобождаем устройства
    stopAllMediaTracks();
    
    // Останавливаем WebRTC
    if (peerRef.current) {
      try {
        console.log('🔌 Закрываем peer connection при завершении звонка');
        peerRef.current.close();
        console.log('✅ Peer connection закрыт при завершении звонка');
      } catch (error) {
        console.warn('⚠️ Ошибка при закрытии peer connection в endCall:', error);
      }
      peerRef.current = null;
    }
    
    // Сбрасываем состояния
    setConnectionState('closed');
    setPeerReady(false);
    setMicEnabled(true);
    setCamEnabled(true);
    socketRef.current = null;
    
    // Вызываем callback
    if (onCallEnd) {
      console.log('✅ Вызываем callback завершения звонка');
      onCallEnd();
    }
    
    console.log('✅ Звонок завершен, медиа устройства освобождены, все таймеры очищены');
    
    // Дополнительное форсированное освобождение медиа устройств через задержку
    setTimeout(() => {
      if (!activeRef.current) { // Убеждаемся что экземпляр действительно неактивен
        console.log('🔄 Дополнительное форсированное освобождение медиа устройств после завершения звонка');
        
        // Вызываем stopAllMediaTracks еще раз для дополнительной гарантии
        if (localStreamRef.current) {
          const tracks = localStreamRef.current.getTracks();
          if (tracks.length > 0) {
            console.log('⚠️ Обнаружены не остановленные треки, принудительно останавливаем');
            tracks.forEach((track, index) => {
              if (track.readyState !== 'ended') {
                console.log(`🛑 Принудительно останавливаем трек ${index + 1}: ${track.kind} (${track.readyState})`);
                track.stop();
              }
            });
          }
        }
        
        // Дополнительная очистка медиа элементов
        if (localVideoRef && localVideoRef.current) {
          try {
            localVideoRef.current.srcObject = null;
            localVideoRef.current.pause();
            localVideoRef.current.load();
          } catch (error) {
            console.warn('⚠️ Ошибка при дополнительной очистке localVideoRef:', error);
          }
        }
        
        if (remoteVideoRef && remoteVideoRef.current) {
          try {
            remoteVideoRef.current.srcObject = null;
            remoteVideoRef.current.pause();
            remoteVideoRef.current.load();
          } catch (error) {
            console.warn('⚠️ Ошибка при дополнительной очистке remoteVideoRef:', error);
          }
        }
        
        console.log('✅ Дополнительное освобождение медиа устройств завершено');
      }
    }, 1500);
    
  }, [signalingSocket, onCallEnd, clearAllTimers, stopAllMediaTracks]);

  // Эффект для проверки и настройки локального видео - улучшенная версия для минимизации
  useEffect(() => {
    if (callActive && callType === 'video' && localStreamRef.current && localVideoRef && localVideoRef.current) {
      // Проверяем состояние локального видео каждую секунду для быстрого восстановления
      const checkVideoStatus = () => {
        if (!activeRef.current || !localVideoRef.current || !localStreamRef.current) {
          return;
        }
        
        const hasVideoTracks = localStreamRef.current.getVideoTracks().length > 0;
        const hasEnabledVideoTracks = localStreamRef.current.getVideoTracks().some(t => t.enabled);
        
        if (hasVideoTracks && hasEnabledVideoTracks) {
          // Проверяем потерю потока
          if (!localVideoRef.current.srcObject) {
            // Потерян поток - восстанавливаем немедленно
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.muted = true;
            localVideoRef.current.playsInline = true;
            localVideoRef.current.autoplay = true;
            localVideoRef.current.play().catch(() => {});
          } 
          // Проверяем паузу
          else if (localVideoRef.current.paused) {
            // На паузе - перезапускаем
            localVideoRef.current.play().catch(() => {});
          }
          // Дополнительная проверка корректности потока
          else if (localVideoRef.current.srcObject !== localStreamRef.current) {
            // Не тот поток - исправляем
            localVideoRef.current.srcObject = localStreamRef.current;
            localVideoRef.current.play().catch(() => {});
          }
        }
        
        // Планируем следующую проверку каждую секунду для быстрой реакции
        if (activeRef.current) {
          safeSetTimeout(checkVideoStatus, 1000);
        }
      };
      
      // Запускаем первую проверку немедленно
      checkVideoStatus();
      
      // Дополнительно реагируем на события видимости страницы
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && activeRef.current) {
          // Страница стала видимой - проверяем видео через короткую задержку
          setTimeout(checkVideoStatus, 100);
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [callActive, callType, setupLocalVideo, safeSetTimeout]);

  // Эффект для проверки и настройки удаленного видео - новый эффект для минимизации
  useEffect(() => {
    if (callActive && callType === 'video' && remoteStreamRef.current && remoteVideoRef && remoteVideoRef.current) {
      // Проверяем состояние удаленного видео каждую секунду для быстрого восстановления
      const checkRemoteVideoStatus = () => {
        if (!activeRef.current || !remoteVideoRef.current || !remoteStreamRef.current) {
          return;
        }
        
        const hasVideoTracks = remoteStreamRef.current.getVideoTracks().length > 0;
        const hasActiveVideoTracks = remoteStreamRef.current.getVideoTracks().some(t => t.readyState === 'live');
        
        if (hasVideoTracks && hasActiveVideoTracks) {
          // Проверяем потерю потока
          if (!remoteVideoRef.current.srcObject) {
            // Потерян поток - восстанавливаем немедленно
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
            remoteVideoRef.current.playsInline = true;
            remoteVideoRef.current.autoplay = true;
            remoteVideoRef.current.play().catch(() => {});
          } 
          // Проверяем паузу
          else if (remoteVideoRef.current.paused) {
            // На паузе - перезапускаем
            remoteVideoRef.current.play().catch(() => {});
          }
          // Дополнительная проверка корректности потока
          else if (remoteVideoRef.current.srcObject !== remoteStreamRef.current) {
            // Не тот поток - исправляем
            remoteVideoRef.current.srcObject = remoteStreamRef.current;
            remoteVideoRef.current.play().catch(() => {});
          }
        }
        
        // Планируем следующую проверку каждую секунду для быстрой реакции
        if (activeRef.current) {
          safeSetTimeout(checkRemoteVideoStatus, 1000);
        }
      };
      
      // Запускаем первую проверку немедленно
      checkRemoteVideoStatus();
      
      // Дополнительно реагируем на события видимости страницы
      const handleRemoteVisibilityChange = () => {
        if (document.visibilityState === 'visible' && activeRef.current) {
          // Страница стала видимой - проверяем удаленное видео через короткую задержку
          setTimeout(checkRemoteVideoStatus, 100);
        }
      };
      
      document.addEventListener('visibilitychange', handleRemoteVisibilityChange);
      
      return () => {
        document.removeEventListener('visibilitychange', handleRemoteVisibilityChange);
      };
    }
  }, [callActive, callType, safeSetTimeout]);

  // Эффект для очистки при размонтировании
  useEffect(() => {
    return () => {
      // Размонтирование useWebRTC - очищаем все ресурсы
      activeRef.current = false;
      clearAllTimers();
      
      // Останавливаем все медиа треки и освобождаем устройства
      stopAllMediaTracks();
      
      // Закрываем peer connection
      if (peerRef.current) {
        try {
          console.log('🔌 Закрываем peer connection при размонтировании');
          peerRef.current.close();
          console.log('✅ Peer connection закрыт при размонтировании');
        } catch (error) {
          console.warn('⚠️ Ошибка при закрытии peer в cleanup:', error);
        }
      }
      
              // Все ресурсы useWebRTC очищены при размонтировании
    };
  }, [clearAllTimers, stopAllMediaTracks]);

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
    peerReady,
    forceReleaseMediaDevices // Функция для принудительного освобождения медиа устройств
  };
} 