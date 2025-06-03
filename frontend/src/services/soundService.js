// Сервис для работы со звуковыми уведомлениями
class SoundService {
  constructor() {
    this.sounds = {};
    this.isSupported = true;
    this.isEnabled = true;
    
    // Проверяем поддержку Audio API
    try {
      new Audio();
    } catch (error) {
      console.warn('[SoundService] Audio API не поддерживается');
      this.isSupported = false;
    }
    
    if (this.isSupported) {
      this.loadSounds();
    }
  }
  
  async loadSounds() {
    const soundFiles = [
      { name: 'message', path: '/sounds/message.mp3' },
      { name: 'notification', path: '/sounds/notification.mp3' }
    ];
    
    for (const soundFile of soundFiles) {
      try {
        // Проверяем доступность файла перед созданием Audio объекта
        const response = await fetch(soundFile.path, { method: 'HEAD' });
        
        if (response.ok) {
          const audio = new Audio();
          
          // Создаем обработчики для успешной загрузки и ошибки
          const loadPromise = new Promise((resolve, reject) => {
            audio.oncanplaythrough = () => {
              console.log(`[SoundService] Звук ${soundFile.name} загружен успешно`);
              resolve();
            };
            
            audio.onerror = () => {
              reject(new Error(`Не удалось загрузить ${soundFile.path}`));
            };
            
            audio.onabort = () => {
              reject(new Error(`Загрузка ${soundFile.name} прервана`));
            };
          });
          
          // Устанавливаем начальную громкость
          audio.volume = 0.5;
          audio.preload = 'auto';
          
          // Начинаем загрузку
          audio.src = soundFile.path;
          
          // Ждем завершения загрузки (или ошибки)
          await Promise.race([
            loadPromise,
            new Promise(resolve => setTimeout(resolve, 3000)) // Таймаут 3 секунды
          ]);
          
          // Сохраняем звук
          this.sounds[soundFile.name] = audio;
        } else {
          // Файл не найден, создаем заглушку
          console.info(`[SoundService] Звуковой файл ${soundFile.path} недоступен, звуки отключены`);
          this.sounds[soundFile.name] = null;
        }
        
      } catch (error) {
        // Файл недоступен или ошибка загрузки
        console.info(`[SoundService] Звуковой файл ${soundFile.path} недоступен, используется беззвучный режим`);
        this.sounds[soundFile.name] = null;
      }
    }
    
    const availableSounds = Object.keys(this.sounds).filter(key => this.sounds[key] !== null);
    console.log(`[SoundService] Инициализация завершена. Доступные звуки: [${availableSounds.join(', ')}]`);
  }
  
  play(soundName) {
    if (!this.isSupported || !this.isEnabled) {
      return;
    }
    
    const sound = this.sounds[soundName];
    if (!sound) {
      // Не логируем как ошибку, просто игнорируем
      return;
    }
    
    try {
      // Сбрасываем позицию воспроизведения
      sound.currentTime = 0;
      
      // Воспроизводим звук
      const playPromise = sound.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Обрабатываем ошибки воспроизведения тихо
          console.debug(`[SoundService] Не удалось воспроизвести звук "${soundName}":`, error.message);
        });
      }
    } catch (error) {
      console.debug(`[SoundService] Ошибка при попытке воспроизвести звук "${soundName}":`, error.message);
    }
  }
  
  setEnabled(enabled) {
    this.isEnabled = enabled;
    console.log(`[SoundService] Звуки ${enabled ? 'включены' : 'отключены'}`);
  }
  
  setVolume(volume) {
    if (!this.isSupported) return;
    
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    Object.values(this.sounds).forEach(sound => {
      if (sound) {
        sound.volume = clampedVolume;
      }
    });
    
    console.log(`[SoundService] Громкость установлена на ${Math.round(clampedVolume * 100)}%`);
  }
  
  // Удобные методы для воспроизведения конкретных звуков
  playNotification() {
    this.play('notification');
  }
  
  playMessage() {
    this.play('message');
  }
}

// Создаем синглтон
const soundService = new SoundService();

export default soundService; 