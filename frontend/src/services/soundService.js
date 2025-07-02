// ОПТИМИЗАЦИЯ: Сервис для работы со звуковыми уведомлениями с асинхронной загрузкой
class SoundService {
  constructor() {
    this.sounds = new Map(); // Используем Map для лучшей производительности
    this.loadingPromises = new Map(); // Кеш промисов загрузки
    this.isSupported = true;
    this.isEnabled = true;
    this.audioContext = null; // Для Web Audio API
    this.loadedBuffers = new Map(); // Кеш для AudioBuffer
    
    // ОПТИМИЗАЦИЯ: Проверяем поддержку Audio API с fallback
    try {
      new Audio();
      // Инициализируем Web Audio API для лучшей производительности
      this.initWebAudio();
    } catch (error) {
      this.isSupported = false;
    }
    
    if (this.isSupported) {
      // ОПТИМИЗАЦИЯ: Отложенная загрузка звуков
      this.preloadSoundsAsync();
    }
  }
  
  // ОПТИМИЗАЦИЯ: Инициализация Web Audio API для лучшей производительности
  initWebAudio() {
    try {
      window.AudioContext = window.AudioContext || window.webkitAudioContext;
      if (window.AudioContext) {
        this.audioContext = new AudioContext();
      }
    } catch (error) {
      // Web Audio API недоступен, используем HTML5 Audio
    }
  }
  
  // ОПТИМИЗАЦИЯ: Асинхронная предварительная загрузка звуков
  async preloadSoundsAsync() {
    const soundFiles = [
      { name: 'message', path: '/sounds/message.mp3' },
      { name: 'notification', path: '/sounds/notification.mp3' }
    ];
    
    // ОПТИМИЗАЦИЯ: Параллельная загрузка всех звуков
    const loadPromises = soundFiles.map(soundFile => 
      this.loadSoundAsync(soundFile.name, soundFile.path)
    );
    
    try {
      await Promise.allSettled(loadPromises);
      const loadedCount = Array.from(this.sounds.values()).filter(Boolean).length;
      // Звуки загружены
    } catch (error) {
      // Некоторые звуки не удалось загрузить
    }
  }
  
  // ОПТИМИЗАЦИЯ: Асинхронная загрузка отдельного звука с кешированием
  async loadSoundAsync(name, path) {
    // Проверяем кеш промисов загрузки
    if (this.loadingPromises.has(name)) {
      return this.loadingPromises.get(name);
    }
    
    // Если звук уже загружен, возвращаем его
    if (this.sounds.has(name) && this.sounds.get(name)) {
      return this.sounds.get(name);
    }
    
    const loadPromise = this.performSoundLoad(name, path);
    this.loadingPromises.set(name, loadPromise);
    
    try {
      const result = await loadPromise;
      this.loadingPromises.delete(name);
      return result;
    } catch (error) {
      this.loadingPromises.delete(name);
      throw error;
    }
  }
  
  // ОПТИМИЗАЦИЯ: Загрузка звука с проверкой доступности и таймаутом
  async performSoundLoad(name, path) {
    try {
      // ОПТИМИЗАЦИЯ: Сначала проверяем доступность файла с таймаутом
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      try {
        const response = await fetch(path, { 
          method: 'HEAD',
          signal: controller.signal,
          cache: 'force-cache' // Принудительное кеширование
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Таймаут загрузки');
        }
        throw fetchError;
      }
      
      // ОПТИМИЗАЦИЯ: Пытаемся использовать Web Audio API для лучшей производительности
      if (this.audioContext) {
        try {
          const audioBuffer = await this.loadWithWebAudio(path);
          this.loadedBuffers.set(name, audioBuffer);
          this.sounds.set(name, { type: 'webaudio', buffer: audioBuffer });
          return this.sounds.get(name);
                 } catch (webAudioError) {
           // Web Audio загрузка не удалась, используем HTML5 Audio
         }
      }
      
      // Fallback на HTML5 Audio
      const audio = await this.loadWithHTMLAudio(path);
      this.sounds.set(name, { type: 'html5', audio: audio });
      return this.sounds.get(name);
      
         } catch (error) {
       this.sounds.set(name, null);
       return null;
     }
  }
  
  // ОПТИМИЗАЦИЯ: Загрузка через Web Audio API
  async loadWithWebAudio(path) {
    const response = await fetch(path, { cache: 'force-cache' });
    const arrayBuffer = await response.arrayBuffer();
    return new Promise((resolve, reject) => {
      this.audioContext.decodeAudioData(
        arrayBuffer,
        resolve,
        reject
      );
    });
  }
  
  // ОПТИМИЗАЦИЯ: Загрузка через HTML5 Audio с промисом
  async loadWithHTMLAudio(path) {
    const audio = new Audio();
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Таймаут загрузки HTML5 Audio'));
      }, 3000);
      
      audio.oncanplaythrough = () => {
        clearTimeout(timeout);
        resolve(audio);
      };
      
      audio.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Ошибка загрузки HTML5 Audio'));
      };
      
      audio.onabort = () => {
        clearTimeout(timeout);
        reject(new Error('Загрузка прервана'));
      };
      
      // ОПТИМИЗАЦИЯ: Настройки для лучшей производительности
      audio.volume = 0.5;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      
      // Начинаем загрузку
      audio.src = path;
    });
  }
  
  // ОПТИМИЗАЦИЯ: Асинхронное воспроизведение с минимальной задержкой
  async play(soundName) {
    if (!this.isSupported || !this.isEnabled) {
      return false;
    }
    
    try {
      let sound = this.sounds.get(soundName);
      
      // Если звук не загружен, пытаемся загрузить его асинхронно
      if (!sound) {
        const soundPath = this.getSoundPath(soundName);
        if (soundPath) {
          sound = await this.loadSoundAsync(soundName, soundPath);
        }
      }
      
      if (!sound) {
        return false;
      }
      
      // ОПТИМИЗАЦИЯ: Воспроизводим через Web Audio API для лучшей производительности
      if (sound.type === 'webaudio' && this.audioContext) {
        return this.playWithWebAudio(sound.buffer);
      }
      
      // Fallback на HTML5 Audio
      if (sound.type === 'html5' && sound.audio) {
        return this.playWithHTMLAudio(sound.audio);
      }
      
      return false;
         } catch (error) {
       return false;
     }
  }
  
  // ОПТИМИЗАЦИЯ: Воспроизведение через Web Audio API
  playWithWebAudio(buffer) {
    try {
      // Возобновляем контекст если нужно (для соблюдения автоплей политик)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = buffer;
      gainNode.gain.value = 0.5; // Громкость
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start(0);
      return true;
         } catch (error) {
       return false;
     }
  }
  
  // ОПТИМИЗАЦИЯ: Воспроизведение через HTML5 Audio
  playWithHTMLAudio(audio) {
    try {
      // ОПТИМИЗАЦИЯ: Клонируем audio для параллельного воспроизведения
      const audioClone = audio.cloneNode();
      audioClone.volume = 0.5;
      audioClone.currentTime = 0;
      
      const playPromise = audioClone.play();
      
             if (playPromise !== undefined) {
         playPromise.catch(error => {
           // HTML5 Audio воспроизведение неудачно
         });
       }
      
      return true;
         } catch (error) {
       return false;
     }
  }
  
  // ОПТИМИЗАЦИЯ: Получение пути к звуку
  getSoundPath(soundName) {
    const soundPaths = {
      'message': '/sounds/message.mp3',
      'notification': '/sounds/notification.mp3'
    };
    return soundPaths[soundName];
  }
  
  // ОПТИМИЗАЦИЯ: Установка состояния с сохранением в localStorage
  setEnabled(enabled) {
    this.isEnabled = enabled;
    try {
      localStorage.setItem('soundService_enabled', String(enabled));
    } catch (error) {
      // Игнорируем ошибки localStorage
    }
  }
  
  // ОПТИМИЗАЦИЯ: Установка громкости для всех звуков
  setVolume(volume) {
    if (!this.isSupported) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    // Обновляем HTML5 Audio элементы
    for (const sound of this.sounds.values()) {
      if (sound && sound.type === 'html5' && sound.audio) {
        sound.audio.volume = clampedVolume;
      }
    }
    
    // Сохраняем настройку
    try {
      localStorage.setItem('soundService_volume', String(clampedVolume));
    } catch (error) {
      // Игнорируем ошибки localStorage
    }
  }
  
  // ОПТИМИЗАЦИЯ: Удобные методы для воспроизведения конкретных звуков
  async playNotification() {
    return this.play('notification');
  }
  
  async playMessage() {
    return this.play('message');
  }
  
  // ОПТИМИЗАЦИЯ: Очистка ресурсов
  dispose() {
    // Останавливаем все загрузки
    for (const promise of this.loadingPromises.values()) {
      promise.catch(() => {}); // Игнорируем ошибки
    }
    this.loadingPromises.clear();
    
    // Освобождаем звуки
    this.sounds.clear();
    this.loadedBuffers.clear();
    
    // Закрываем Audio Context
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
  }
}

// ОПТИМИЗАЦИЯ: Создаем синглтон с восстановлением настроек
const soundService = new SoundService();

// Восстанавливаем настройки из localStorage
try {
  const savedEnabled = localStorage.getItem('soundService_enabled');
  if (savedEnabled !== null) {
    soundService.setEnabled(savedEnabled === 'true');
  }
  
  const savedVolume = localStorage.getItem('soundService_volume');
  if (savedVolume !== null) {
    soundService.setVolume(parseFloat(savedVolume));
  }
} catch (error) {
  // Игнорируем ошибки восстановления настроек
}

export default soundService; 