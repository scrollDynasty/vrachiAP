// WebSocket сервис для централизованного управления WebSocket соединениями
import api from '../api';
import { WS_BASE_URL } from '../api';

// Синглтон для хранения соединений
class WebSocketService {
  constructor() {
    // Объект для хранения активных соединений
    this.connections = {};
    
    // Флаг, указывающий, что соединения должны быть закрыты при размонтировании
    this.isShuttingDown = false;
    
    // Интервалы пинга
    this.pingIntervals = {};
    
    // Объект для хранения обработчиков сообщений
    this.messageHandlers = {};
    
    // Для отслеживания попыток переподключения
    this.reconnectAttempts = {};
    this.reconnectTimers = {};
    this.maxReconnectAttempts = 3; // Уменьшаем количество попыток переподключения
    
    // Флаги для отслеживания переподключений в процессе
    this.reconnectingFlags = {};

    // Глобальные замки для синхронизации создания соединений
    this.connectionLocks = {};
    
    // Токены соединений для предотвращения race conditions
    this.connectionTokens = {};
    
    // Счётчики запросов на соединение для дебаггинга
    this.connectionRequestCounts = {};

    // Привязываем методы к контексту
    this.getNotificationConnection = this.getNotificationConnection.bind(this);
    this.getConsultationConnection = this.getConsultationConnection.bind(this);
    this.closeAllConnections = this.closeAllConnections.bind(this);
    this.closeConnection = this.closeConnection.bind(this);
    
    // Добавляем обработчик перед закрытием страницы
    window.addEventListener('beforeunload', this.closeAllConnections);
    
    // Отслеживаем состояние подключения к сети
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
    
    // Отслеживаем изменения видимости страницы
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
  }
  
  // Обработчик изменения видимости страницы
  handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      this.checkAllConnections();
    } else {
      // Если страница скрыта, прекращаем попытки переподключения
      Object.keys(this.reconnectTimers).forEach(key => {
        if (this.reconnectTimers[key]) {
          clearTimeout(this.reconnectTimers[key]);
          this.reconnectTimers[key] = null;
        }
      });
    }
  }
  
  // Проверяем все соединения
  checkAllConnections() {
    Object.keys(this.connections).forEach(key => {
      const conn = this.connections[key];
      if (conn && (conn.readyState === WebSocket.CLOSED || conn.readyState === WebSocket.CLOSING)) {
        this.closeConnection(key);
      }
    });
  }
  
  // Обработчик возобновления соединения
  handleOnline() {
    // Переподключаем все активные соединения
    Object.keys(this.connections).forEach(key => {
      const conn = this.connections[key];
      if (!conn || conn.readyState === WebSocket.CLOSED || conn.readyState === WebSocket.CLOSING) {
        const [type, id] = key.split('_');
        if (type === 'notifications') {
          this.getNotificationConnection(id, this.messageHandlers[key]);
        } else if (type === 'consultation') {
          this.getConsultationConnection(id, this.messageHandlers[key]);
        }
      }
    });
  }
  
  // Обработчик потери соединения
  handleOffline() {
    // Прекращаем все попытки переподключения
    Object.keys(this.reconnectTimers).forEach(key => {
      if (this.reconnectTimers[key]) {
        clearTimeout(this.reconnectTimers[key]);
        this.reconnectTimers[key] = null;
      }
    });
    
    // Сбрасываем все замки
    this.connectionLocks = {};
  }
  
  // Получить уникальный токен для соединения
  getConnectionToken(connectionKey) {
    const token = `${connectionKey}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    this.connectionTokens[connectionKey] = token;
    return token;
  }
  
  // Проверить, является ли токен актуальным
  isValidToken(connectionKey, token) {
    return this.connectionTokens[connectionKey] === token;
  }

  // Получить соединение для уведомлений конкретного пользователя
  async getNotificationConnection(userId, onMessage, onStatusChange) {
    const connectionKey = `notifications_${userId}`;
    
    // Увеличиваем счётчик запросов
    this.connectionRequestCounts[connectionKey] = (this.connectionRequestCounts[connectionKey] || 0) + 1;
    
    // Если есть активная блокировка на это соединение, ждём завершения
    if (this.connectionLocks[connectionKey]) {
      if (onStatusChange) onStatusChange('connecting');
      return null;
    }
    
    // Устанавливаем блокировку
    this.connectionLocks[connectionKey] = true;
    
    try {
      // Если соединение уже существует и открыто, возвращаем его
      if (this.connections[connectionKey] && this.connections[connectionKey].readyState === WebSocket.OPEN) {
        // Обновляем обработчик сообщений
        if (onMessage && onMessage !== this.messageHandlers[connectionKey]) {
          this.messageHandlers[connectionKey] = onMessage;
        }
        
        if (onStatusChange) onStatusChange('connected');
        
        // Снимаем блокировку
        this.connectionLocks[connectionKey] = false;
        
        return this.connections[connectionKey];
      }
      
      // Закрываем существующее соединение, если оно есть
      if (this.connections[connectionKey]) {
        this.closeConnection(connectionKey);
      }
      
      // Генерируем новый токен для этого запроса соединения
      const connectionToken = this.getConnectionToken(connectionKey);
      
      if (onStatusChange) onStatusChange('connecting');
      
      // Получаем токен для WebSocket
      const { data } = await api.get('/api/ws-token');
      const token = data?.token;
      
      // Проверяем, что наш токен соединения всё ещё актуален
      if (!this.isValidToken(connectionKey, connectionToken)) {
        this.connectionLocks[connectionKey] = false;
        return null;
      }
      
      if (!token) {
        if (onStatusChange) onStatusChange('error');
        this.connectionLocks[connectionKey] = false;
        return null;
      }
      
      // Определяем протокол
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Проверяем, что ID пользователя определен
      if (!userId) {
        console.error('ID пользователя не определен для WebSocket соединения');
        throw new Error('ID пользователя не определен');
      }
      
      // Используем относительный URL для WebSocket через прокси Vite
      const wsUrl = `${protocol}//${window.location.host}${WS_BASE_URL}/ws/notifications/${userId}?token=${token}`;
      
      console.log('Подключение к WebSocket:', wsUrl);
      
      // Создаем новое соединение
      const socket = new WebSocket(wsUrl);
      
      // Повторно проверяем, что наш токен соединения всё ещё актуален
      if (!this.isValidToken(connectionKey, connectionToken)) {
        socket.close();
        this.connectionLocks[connectionKey] = false;
        return null;
      }
      
      // Сохраняем соединение
      this.connections[connectionKey] = socket;
      
      // Сохраняем обработчик сообщений
      if (onMessage) {
        this.messageHandlers[connectionKey] = onMessage;
      }
      
      // Устанавливаем обработчики событий
      socket.onopen = () => {
        // Сбрасываем счетчик попыток переподключения
        this.reconnectAttempts[connectionKey] = 0;
        
        // Отправляем пинг каждые 60 секунд для поддержания соединения
        if (this.pingIntervals[connectionKey]) {
          clearInterval(this.pingIntervals[connectionKey]);
        }
        
        this.pingIntervals[connectionKey] = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            try {
              socket.send(JSON.stringify({ type: 'ping' }));
            } catch (err) {
              clearInterval(this.pingIntervals[connectionKey]);
              this.pingIntervals[connectionKey] = null;
              
              // Если соединение всё ещё открыто, закрываем его
              if (socket.readyState === WebSocket.OPEN) {
                socket.close();
              }
              
              // Пробуем переподключиться
              this.scheduleReconnect(connectionKey, userId, onMessage, onStatusChange);
            }
          } else {
            clearInterval(this.pingIntervals[connectionKey]);
            this.pingIntervals[connectionKey] = null;
            
            // Планируем переподключение
            this.scheduleReconnect(connectionKey, userId, onMessage, onStatusChange);
          }
        }, 60000); // Увеличиваем интервал до 60 сек
        
        if (onStatusChange) onStatusChange('connected');
        
        // Снимаем блокировку
        this.connectionLocks[connectionKey] = false;
      };
      
      socket.onmessage = (event) => {
        // Вызываем обработчик сообщений, если он задан
        if (this.messageHandlers[connectionKey]) {
          try {
            this.messageHandlers[connectionKey](event);
          } catch (error) {
            console.error(`[WebSocketService] Ошибка в обработчике сообщений для ${connectionKey}:`, error);
          }
        }
      };
      
      socket.onclose = (event) => {
        // Очищаем интервал пингов
        if (this.pingIntervals[connectionKey]) {
          clearInterval(this.pingIntervals[connectionKey]);
          this.pingIntervals[connectionKey] = null;
        }
        
        // Если не в процессе закрытия всех соединений и соединение было закрыто неожиданно
        if (!this.isShuttingDown && event.code !== 1000 && event.code !== 1001) {
          // Если не превышено максимальное количество попыток
          if ((this.reconnectAttempts[connectionKey] || 0) < this.maxReconnectAttempts) {
            // Планируем переподключение
            this.scheduleReconnect(connectionKey, userId, onMessage, onStatusChange);
          }
        } else {
          // Удаляем соединение из списка активных
          delete this.connections[connectionKey];
          delete this.messageHandlers[connectionKey];
        }
        
        if (onStatusChange) onStatusChange('disconnected');
        
        // Снимаем блокировку
        this.connectionLocks[connectionKey] = false;
      };
      
      socket.onerror = (error) => {
        if (onStatusChange) onStatusChange('error');
        
        // Закрываем соединение с ошибкой
        this.closeConnection(connectionKey);
        
        // Снимаем блокировку
        this.connectionLocks[connectionKey] = false;
      };
      
      return socket;
    } catch (error) {
      if (onStatusChange) onStatusChange('error');
      
      // Снимаем блокировку
      this.connectionLocks[connectionKey] = false;
      
      return null;
    }
  }
  
  // Получить соединение для чата консультации
  async getConsultationConnection(consultationId, onMessage, onStatusChange) {
    const connectionKey = `consultation_${consultationId}`;
    
    // Увеличиваем счётчик запросов
    this.connectionRequestCounts[connectionKey] = (this.connectionRequestCounts[connectionKey] || 0) + 1;
    
    // Если есть активная блокировка на это соединение, ждём завершения
    if (this.connectionLocks[connectionKey]) {
      if (onStatusChange) onStatusChange('connecting');
      return null;
    }
    
    // Устанавливаем блокировку
    this.connectionLocks[connectionKey] = true;
    
    try {
      // Если соединение уже существует и открыто, возвращаем его
      if (this.connections[connectionKey] && this.connections[connectionKey].readyState === WebSocket.OPEN) {
        // Обновляем обработчик сообщений
        if (onMessage && onMessage !== this.messageHandlers[connectionKey]) {
          this.messageHandlers[connectionKey] = onMessage;
        }
        
        if (onStatusChange) onStatusChange('connected');
        
        // Снимаем блокировку
        this.connectionLocks[connectionKey] = false;
        
        return this.connections[connectionKey];
      }
      
      // Закрываем существующее соединение, если оно есть
      if (this.connections[connectionKey]) {
        this.closeConnection(connectionKey);
      }
      
      // Генерируем новый токен для этого запроса соединения
      const connectionToken = this.getConnectionToken(connectionKey);
      
      if (onStatusChange) onStatusChange('connecting');
      
      // Получаем токен для WebSocket
      const { data } = await api.get('/api/ws-token');
      const token = data?.token;
      
      // Проверяем, что наш токен соединения всё ещё актуален
      if (!this.isValidToken(connectionKey, connectionToken)) {
        this.connectionLocks[connectionKey] = false;
        return null;
      }
      
      if (!token) {
        if (onStatusChange) onStatusChange('error');
        this.connectionLocks[connectionKey] = false;
        return null;
      }
      
      // Определяем хост для WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      
      // Проверяем, что ID консультации определен
      if (!consultationId) {
        console.error('ID консультации не определен для WebSocket соединения');
        throw new Error('ID консультации не определен');
      }
      
      // Используем относительный URL для WebSocket через прокси Vite
      const wsUrl = `${protocol}//${window.location.host}${WS_BASE_URL}/ws/consultations/${consultationId}?token=${token}`;
      
      // Создаем новое соединение
      const socket = new WebSocket(wsUrl);
      
      // Повторно проверяем, что наш токен соединения всё ещё актуален
      if (!this.isValidToken(connectionKey, connectionToken)) {
        socket.close();
        this.connectionLocks[connectionKey] = false;
        return null;
      }
      
      // Сохраняем соединение
      this.connections[connectionKey] = socket;
      
      // Сохраняем обработчик сообщений
      if (onMessage) {
        this.messageHandlers[connectionKey] = onMessage;
      }
      
      // Устанавливаем обработчики событий
      socket.onopen = () => {
        // Сбрасываем счетчик попыток переподключения
        this.reconnectAttempts[connectionKey] = 0;
        
        // Отправляем пинг каждые 60 секунд для поддержания соединения
        if (this.pingIntervals[connectionKey]) {
          clearInterval(this.pingIntervals[connectionKey]);
        }
        
        this.pingIntervals[connectionKey] = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            try {
              socket.send(JSON.stringify({ type: 'ping' }));
            } catch (err) {
              clearInterval(this.pingIntervals[connectionKey]);
              this.pingIntervals[connectionKey] = null;
              
              // Если соединение всё ещё открыто, закрываем его
              if (socket.readyState === WebSocket.OPEN) {
                socket.close();
              }
              
              // Пробуем переподключиться
              this.scheduleReconnect(connectionKey, consultationId, onMessage, onStatusChange, true);
            }
          } else {
            clearInterval(this.pingIntervals[connectionKey]);
            this.pingIntervals[connectionKey] = null;
            
            // Планируем переподключение
            this.scheduleReconnect(connectionKey, consultationId, onMessage, onStatusChange, true);
          }
        }, 60000); // Увеличиваем интервал до 60 сек
        
        if (onStatusChange) onStatusChange('connected');
        
        // Снимаем блокировку
        this.connectionLocks[connectionKey] = false;
      };
      
      socket.onmessage = (event) => {
        // Вызываем обработчик сообщений, если он задан
        if (this.messageHandlers[connectionKey]) {
          try {
            this.messageHandlers[connectionKey](event);
          } catch (error) {
            console.error(`[WebSocketService] Ошибка в обработчике сообщений для ${connectionKey}:`, error);
          }
        }
      };
      
      socket.onclose = (event) => {
        // Очищаем интервал пингов
        if (this.pingIntervals[connectionKey]) {
          clearInterval(this.pingIntervals[connectionKey]);
          this.pingIntervals[connectionKey] = null;
        }
        
        // Если не в процессе закрытия всех соединений и соединение было закрыто неожиданно
        if (!this.isShuttingDown && event.code !== 1000 && event.code !== 1001) {
          // Если не превышено максимальное количество попыток
          if ((this.reconnectAttempts[connectionKey] || 0) < this.maxReconnectAttempts) {
            // Планируем переподключение
            this.scheduleReconnect(connectionKey, consultationId, onMessage, onStatusChange, true);
          }
        } else {
          // Удаляем соединение из списка активных
          delete this.connections[connectionKey];
          delete this.messageHandlers[connectionKey];
        }
        
        if (onStatusChange) onStatusChange('disconnected');
        
        // Снимаем блокировку
        this.connectionLocks[connectionKey] = false;
      };
      
      socket.onerror = (error) => {
        if (onStatusChange) onStatusChange('error');
        
        // Закрываем соединение с ошибкой
        this.closeConnection(connectionKey);
        
        // Снимаем блокировку
        this.connectionLocks[connectionKey] = false;
      };
      
      return socket;
    } catch (error) {
      if (onStatusChange) onStatusChange('error');
      
      // Снимаем блокировку
      this.connectionLocks[connectionKey] = false;
      
      return null;
    }
  }
  
  // Запланировать переподключение
  scheduleReconnect(connectionKey, id, onMessage, onStatusChange, isConsultation = false) {
    // Если соединение с сетью отсутствует, не пытаемся переподключаться
    if (!navigator.onLine) {
      return;
    }
    
    // Если страница скрыта, не выполняем переподключение
    if (document.visibilityState !== 'visible') {
      return;
    }
    
    // Увеличиваем счетчик попыток переподключения
    this.reconnectAttempts[connectionKey] = (this.reconnectAttempts[connectionKey] || 0) + 1;
    
    // Проверяем, не превышено ли максимальное количество попыток
    if (this.reconnectAttempts[connectionKey] > this.maxReconnectAttempts) {
      if (onStatusChange) onStatusChange('error', 'Не удалось подключиться к серверу после нескольких попыток');
      return;
    }
    
    // Рассчитываем задержку с экспоненциальной обратной связью
    const baseDelay = 10000; // 10 секунд (увеличиваем начальную задержку)
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts[connectionKey] - 1), 120000); // Максимум 2 минуты
    
    // Обновляем статус соединения
    if (onStatusChange) onStatusChange('connecting');
    
    // Очищаем предыдущий таймер переподключения, если он существует
    if (this.reconnectTimers[connectionKey]) {
      clearTimeout(this.reconnectTimers[connectionKey]);
    }
    
    // Устанавливаем новый таймер
    this.reconnectTimers[connectionKey] = setTimeout(async () => {
      // Если в процессе закрытия всех соединений, не переподключаемся
      if (this.isShuttingDown) {
        return;
      }
      
      // Если страница скрыта, откладываем переподключение
      if (document.visibilityState !== 'visible') {
        return;
      }
      
      // Переподключаемся в зависимости от типа соединения
      if (isConsultation) {
        await this.getConsultationConnection(id, onMessage, onStatusChange);
      } else {
        await this.getNotificationConnection(id, onMessage, onStatusChange);
      }
    }, delay);
  }
  
  // Закрыть конкретное соединение
  closeConnection(connectionKey) {
    if (this.connections[connectionKey]) {
      try {
        // Очищаем интервал пингов
        if (this.pingIntervals[connectionKey]) {
          clearInterval(this.pingIntervals[connectionKey]);
          this.pingIntervals[connectionKey] = null;
        }
        
        // Очищаем таймер переподключения
        if (this.reconnectTimers[connectionKey]) {
          clearTimeout(this.reconnectTimers[connectionKey]);
          this.reconnectTimers[connectionKey] = null;
        }
        
        // Закрываем соединение
        if (this.connections[connectionKey].readyState === WebSocket.OPEN || 
            this.connections[connectionKey].readyState === WebSocket.CONNECTING) {
          this.connections[connectionKey].close(1000, 'Закрытие по запросу');
        }
        
        // Удаляем соединение из списка активных
        delete this.connections[connectionKey];
        delete this.messageHandlers[connectionKey];
      } catch (error) {
        console.error(`[WebSocketService] Ошибка при закрытии соединения для ${connectionKey}:`, error);
      }
    }
  }
  
  // Закрыть все соединения
  closeAllConnections() {
    // Устанавливаем флаг, что сервис завершает работу
    this.isShuttingDown = true;
    
    // Получаем список ключей соединений
    const connectionKeys = Object.keys(this.connections);
    
    // Закрываем каждое соединение
    connectionKeys.forEach(key => {
      this.closeConnection(key);
    });
    
    // Очищаем все интервалы пингов
    Object.keys(this.pingIntervals).forEach(key => {
      if (this.pingIntervals[key]) {
        clearInterval(this.pingIntervals[key]);
        this.pingIntervals[key] = null;
      }
    });
    
    // Очищаем все таймеры переподключения
    Object.keys(this.reconnectTimers).forEach(key => {
      if (this.reconnectTimers[key]) {
        clearTimeout(this.reconnectTimers[key]);
        this.reconnectTimers[key] = null;
      }
    });
    
    // Сбрасываем все замки соединений
    this.connectionLocks = {};
    
    // Сбрасываем состояние
    this.connections = {};
    this.messageHandlers = {};
    this.reconnectAttempts = {};
    this.connectionTokens = {};
    
    // Сбрасываем флаг
    this.isShuttingDown = false;
  }
}

// Создаем и экспортируем синглтон
const webSocketService = new WebSocketService();
export default webSocketService; 