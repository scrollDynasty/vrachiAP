// WebSocket сервис для централизованного управления WebSocket соединениями
import api from '../api';
import { WS_BASE_URL } from '../api';

// Синглтон для хранения соединений
class WebSocketService {
  constructor() {
    // Объект для хранения всех соединений
    this.connections = {};
    
    // Базовый URL для WebSocket
    this.wsBaseUrl = WS_BASE_URL || '/ws';
    
    // Определяем протокол
    this.wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.wsHost = window.location.host;
    
    // Флаг завершения работы (при размонтировании компонента)
    this.isShuttingDown = false;
    
    // Интервалы пинга
    this.pingIntervals = {};
    
    // Объект для хранения обработчиков сообщений
    this.messageHandlers = {};
    
    // Для отслеживания попыток переподключения
    this.reconnectAttempts = {};
    this.reconnectTimers = {};
    this.maxReconnectAttempts = -1; // Бесконечные попытки переподключения (-1 = без лимита)
    this.reconnectInterval = 5000; // Интервал между попытками
    
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
          // Восстанавливаем соединение для уведомлений
          setTimeout(() => {
            this.getNotificationConnection(id, this.messageHandlers[key]);
          }, 1000);
        } else if (type === 'consultation') {
          // Восстанавливаем соединение для консультаций
          setTimeout(() => {
            this.getConsultationConnection(id, this.messageHandlers[key]);
          }, 1500);
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

  // Планирование переподключения
  scheduleReconnect(connectionKey, userId, onMessage, onStatusChange) {
    // Инициализируем счетчик попыток если он не существует
    if (!this.reconnectAttempts[connectionKey]) {
      this.reconnectAttempts[connectionKey] = 0;
    }
    
    // Проверяем лимит попыток (если он установлен)
    if (this.maxReconnectAttempts > 0 && this.reconnectAttempts[connectionKey] >= this.maxReconnectAttempts) {
      if (onStatusChange) onStatusChange('error', 'Не удалось переподключиться после нескольких попыток');
      delete this.reconnectAttempts[connectionKey];
      delete this.messageHandlers[connectionKey];
      return;
    }
    
    // Увеличиваем счетчик попыток
    this.reconnectAttempts[connectionKey]++;
    
    // Рассчитываем задержку с экспоненциальным откладыванием (максимум до 60 секунд)
    const exponentialDelay = Math.min(this.reconnectInterval * Math.pow(1.5, Math.min(this.reconnectAttempts[connectionKey] - 1, 10)), 60000);
    const delay = exponentialDelay;
    
    // Планируем переподключение
    this.reconnectTimers[connectionKey] = setTimeout(async () => {
      // Очищаем таймер
      delete this.reconnectTimers[connectionKey];
      
      // Пытаемся переподключиться
      try {
        const socket = await this.getNotificationConnection(userId, onMessage, onStatusChange);
        if (socket && socket.readyState === WebSocket.OPEN) {
          // Успешное переподключение - сбрасываем счетчик
          delete this.reconnectAttempts[connectionKey];
        }
      } catch (error) {
        // Если переподключение не удалось, планируем следующую попытку
        this.scheduleReconnect(connectionKey, userId, onMessage, onStatusChange);
      }
    }, delay);
  }

  // Получить соединение для уведомлений конкретного пользователя
  async getNotificationConnection(userId, onMessage, onStatusChange) {
    const connectionKey = `notifications_${userId}`;
    
    // Увеличиваем счётчик запросов
    this.connectionRequestCounts[connectionKey] = (this.connectionRequestCounts[connectionKey] || 0) + 1;
    
    // Если соединение уже существует и открыто, возвращаем его
    if (this.connections[connectionKey] && this.connections[connectionKey].readyState === WebSocket.OPEN) {
      
      // Обновляем обработчик сообщений
      if (onMessage && onMessage !== this.messageHandlers[connectionKey]) {
        this.messageHandlers[connectionKey] = onMessage;
      }
      
      if (onStatusChange) onStatusChange('connected');
      
      return this.connections[connectionKey];
    }
    
    // Если есть активная блокировка на это соединение, ждем её снятия
    if (this.connectionLocks[connectionKey]) {
      
      // Ждем максимум 10 секунд снятия блокировки
      let lockWaitAttempts = 0;
      const maxLockWaitAttempts = 50; // 10 секунд при интервале в 200 мс
      
      while (this.connectionLocks[connectionKey] && lockWaitAttempts < maxLockWaitAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200));
        lockWaitAttempts++;
        
        // Проверяем, не создалось ли соединение за это время
        if (this.connections[connectionKey] && this.connections[connectionKey].readyState === WebSocket.OPEN) {
          
          // Обновляем обработчик сообщений
          if (onMessage && this.messageHandlers[connectionKey] !== onMessage) {
            this.messageHandlers[connectionKey] = onMessage;
          }
          
          if (onStatusChange) onStatusChange('connected');
          return this.connections[connectionKey];
        }
      }
      
      // Если блокировка все еще активна, сбрасываем её принудительно
      if (this.connectionLocks[connectionKey]) {
        console.warn(`[WebSocketService] Принудительно сбрасываю блокировку для ${connectionKey} после таймаута`);
        this.connectionLocks[connectionKey] = false;
      }
    }
    
    // Устанавливаем блокировку
    this.connectionLocks[connectionKey] = true;
    
    try {
      // Запрашиваем токен для WebSocket
      
      // Если передан callback изменения статуса, вызываем его
      if (onStatusChange) onStatusChange('connecting');
      
      // Получаем токен для WebSocket
      const { data } = await api.get('/api/ws-token');
      const token = data?.token;
      
      // Проверяем, что токен получен
      if (!token) {
        console.error(`[WebSocketService] Не удалось получить токен для WebSocket соединения ${connectionKey}`);
        
        // Освобождаем блокировку
        this.connectionLocks[connectionKey] = false;
        
        // Если передан callback изменения статуса, вызываем его
        if (onStatusChange) onStatusChange('error', 'Не удалось получить токен для WebSocket');
        
        return null;
      }
      
      // Проверяем, что ID пользователя определен
      if (!userId) {
        console.error('[WebSocketService] ID пользователя не определен для WebSocket соединения');
        this.connectionLocks[connectionKey] = false;
        if (onStatusChange) onStatusChange('error');
        return null;
      }
      
      // Дополнительная проверка на undefined как строку
      if (userId === 'undefined' || userId === undefined || userId === null) {
        console.error('[WebSocketService] ID пользователя недействителен (undefined/null):', userId);
        this.connectionLocks[connectionKey] = false;
        if (onStatusChange) onStatusChange('error', 'Недействительный ID пользователя');
        return null;
      }
      
      // Используем относительный URL для WebSocket через прокси Vite
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/notifications/${userId}?token=${token}`;
      
      
      // Создаем новое соединение
      const socket = new WebSocket(wsUrl);
      
      // Сохраняем соединение (даже до полного открытия, чтобы предотвратить дублирование)
      this.connections[connectionKey] = socket;
      
      // Сохраняем обработчик сообщений
      if (onMessage) {
        this.messageHandlers[connectionKey] = onMessage;
      }
      
      // Настраиваем обработчики событий
      socket.onopen = () => {
        // Если передан callback изменения статуса, вызываем его
        if (onStatusChange) onStatusChange('connected');
        
        // Освобождаем блокировку ТОЛЬКО после успешного открытия соединения
        this.connectionLocks[connectionKey] = false;
        
        // Сбрасываем счетчик попыток переподключения при успешном соединении
        if (this.reconnectAttempts[connectionKey]) {
          delete this.reconnectAttempts[connectionKey];
        }
      };
      
      socket.onmessage = (event) => {
        try {
          // Разбираем сообщение JSON
          const data = JSON.parse(event.data);
          
          // Если есть обработчик сообщений, вызываем его
          if (this.messageHandlers[connectionKey]) {
            this.messageHandlers[connectionKey](data);
          }
        } catch (error) {
          console.error(`[WebSocketService] Ошибка при обработке сообщения для ${connectionKey}:`, error);
        }
      };
      
      socket.onclose = (event) => {
        // Если передан callback изменения статуса, вызываем его
        if (onStatusChange) onStatusChange('disconnected', `Соединение закрыто (${event.code})`);
        
        // Удаляем ссылку на соединение, только если это то же самое соединение
        if (this.connections[connectionKey] === socket) {
          delete this.connections[connectionKey];
        }
        
        // Освобождаем блокировку, если она все еще активна
        if (this.connectionLocks[connectionKey]) {
          this.connectionLocks[connectionKey] = false;
        }
        
        // Автоматическое переподключение для уведомлений
        if (!this.isShuttingDown && event.code !== 1000) { // 1000 = нормальное закрытие
          this.scheduleReconnect(connectionKey, userId, onMessage, onStatusChange);
        } else {
          // Удаляем обработчик сообщений только при нормальном закрытии
          delete this.messageHandlers[connectionKey];
        }
      };
      
      socket.onerror = (error) => {
        console.error(`[WebSocketService] Ошибка соединения ${connectionKey}:`, error);
        
        // Если передан callback изменения статуса, вызываем его
        if (onStatusChange) onStatusChange('error');
        
        // Освобождаем блокировку
        this.connectionLocks[connectionKey] = false;
      };
      
      return socket;
    } catch (error) {
      console.error(`[WebSocketService] Ошибка при создании соединения ${connectionKey}:`, error);
      
      // Если передан callback изменения статуса, вызываем его
      if (onStatusChange) onStatusChange('error');
      
      // Освобождаем блокировку
      this.connectionLocks[connectionKey] = false;
      
      // Удаляем соединение из списка, если оно было создано
      if (this.connections[connectionKey]) {
        delete this.connections[connectionKey];
      }
      
      return null;
    }
  }
  
  // Получить соединение для чата консультации
  async getConsultationConnection(consultationId, onMessage, onStatusChange) {
    const connectionKey = `consultation_${consultationId}`;
    
    // Увеличиваем счётчик запросов
    this.connectionRequestCounts[connectionKey] = (this.connectionRequestCounts[connectionKey] || 0) + 1;
    
    // Если соединение уже существует и открыто, возвращаем его
    if (this.connections[connectionKey] && this.connections[connectionKey].readyState === WebSocket.OPEN) {
      
      // Обновляем обработчик сообщений
      if (onMessage && onMessage !== this.messageHandlers[connectionKey]) {
        this.messageHandlers[connectionKey] = onMessage;
      }
      
      if (onStatusChange) onStatusChange('connected');
      
      return this.connections[connectionKey];
    }
    
    // Если есть активная блокировка на это соединение, ждем её снятия
    if (this.connectionLocks[connectionKey]) {
      
      // Ждем максимум 10 секунд снятия блокировки
      let lockWaitAttempts = 0;
      const maxLockWaitAttempts = 50; // 10 секунд при интервале в 200 мс
      
      while (this.connectionLocks[connectionKey] && lockWaitAttempts < maxLockWaitAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200));
        lockWaitAttempts++;
        
        // Проверяем, не создалось ли соединение за это время
        if (this.connections[connectionKey] && this.connections[connectionKey].readyState === WebSocket.OPEN) {
          
          // Обновляем обработчик сообщений
          if (onMessage && this.messageHandlers[connectionKey] !== onMessage) {
            this.messageHandlers[connectionKey] = onMessage;
          }
          
          if (onStatusChange) onStatusChange('connected');
          return this.connections[connectionKey];
        }
      }
      
      // Если блокировка все еще активна, сбрасываем её принудительно
      if (this.connectionLocks[connectionKey]) {
        console.warn(`[WebSocketService] Принудительно сбрасываю блокировку для ${connectionKey} после таймаута`);
        this.connectionLocks[connectionKey] = false;
      }
    }
    
    // Устанавливаем блокировку
    this.connectionLocks[connectionKey] = true;
    
    try {
      // Запрашиваем токен для WebSocket
      
      // Если передан callback изменения статуса, вызываем его
      if (onStatusChange) onStatusChange('connecting');
      
      // Получаем токен для WebSocket
      const { data } = await api.get('/api/ws-token');
      const token = data?.token;
      
      // Проверяем, что токен получен
      if (!token) {
        console.error(`[WebSocketService] Не удалось получить токен для WebSocket соединения ${connectionKey}`);
        
        // Освобождаем блокировку
        this.connectionLocks[connectionKey] = false;
        
        // Если передан callback изменения статуса, вызываем его
        if (onStatusChange) onStatusChange('error', 'Не удалось получить токен для WebSocket');
        
        return null;
      }
      
      // Создаем новое соединение
      const wsUrl = `${this.wsProtocol}//${this.wsHost}/ws/consultations/${consultationId}?token=${token}`;
      
      
      // Создаем WebSocket соединение
      const socket = new WebSocket(wsUrl);
      
      // Сохраняем соединение
      this.connections[connectionKey] = socket;
      
      // Устанавливаем обработчики событий
      socket.onopen = () => {
        
        // Если передан обработчик сообщений, сохраняем его
        if (onMessage) {
          this.messageHandlers[connectionKey] = onMessage;
        }
        
        // Если передан callback изменения статуса, вызываем его
        if (onStatusChange) onStatusChange('connected');
        
        // Освобождаем блокировку ТОЛЬКО после успешного открытия соединения
        this.connectionLocks[connectionKey] = false;
      };
      
      socket.onclose = (event) => {
        
        // Если передан callback изменения статуса, вызываем его
        if (onStatusChange) onStatusChange('disconnected', `Соединение закрыто (${event.code})`);
        
        // Удаляем ссылку на соединение
        delete this.connections[connectionKey];
        
        // Освобождаем блокировку, если она все еще активна
        if (this.connectionLocks[connectionKey]) {
          this.connectionLocks[connectionKey] = false;
        }
      };
      
      socket.onerror = (error) => {
        console.error(`[WebSocketService] Ошибка соединения ${connectionKey}:`, error);
        
        // Если передан callback изменения статуса, вызываем его
        if (onStatusChange) onStatusChange('error', 'Произошла ошибка WebSocket соединения');
        
        // Освобождаем блокировку, если она все еще активна
        if (this.connectionLocks[connectionKey]) {
          this.connectionLocks[connectionKey] = false;
        }
      };
      
      // Если передан обработчик сообщений, устанавливаем его
      if (onMessage) {
        socket.onmessage = onMessage;
      }
      
      return socket;
    } catch (error) {
      console.error(`[WebSocketService] Общая ошибка при получении соединения ${connectionKey}:`, error);
      
      // Освобождаем блокировку
      this.connectionLocks[connectionKey] = false;
      
      // Если передан callback изменения статуса, вызываем его
      if (onStatusChange) onStatusChange('error', 'Произошла ошибка при подключении');
      
      return null;
    }
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
  
  // Закрыть соединение консультации
  closeConsultationConnection(consultationId) {
    const connectionKey = `consultation_${consultationId}`;
    
    if (this.connections[connectionKey]) {
      
      try {
        const socket = this.connections[connectionKey];
        
        // Удаляем обработчики
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        
        // Закрываем соединение
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close(1000, 'Компонент размонтирован');
        }
      } catch (error) {
        console.error(`[WebSocketService] Ошибка при закрытии соединения ${connectionKey}:`, error);
      }
      
      // Удаляем из списков
      delete this.connections[connectionKey];
      delete this.messageHandlers[connectionKey];
      delete this.connectionLocks[connectionKey];
    }
  }
  
  // Закрыть соединение уведомлений пользователя
  closeNotificationConnection(userId) {
    const connectionKey = `notifications_${userId}`;
    
    if (this.connections[connectionKey]) {
      
      try {
        const socket = this.connections[connectionKey];
        
        // Удаляем обработчики
        socket.onopen = null;
        socket.onclose = null;
        socket.onerror = null;
        socket.onmessage = null;
        
        // Закрываем соединение
        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close(1000, 'Компонент размонтирован');
        }
      } catch (error) {
        console.error(`[WebSocketService] Ошибка при закрытии соединения ${connectionKey}:`, error);
      }
      
      // Удаляем из списков
      delete this.connections[connectionKey];
      delete this.messageHandlers[connectionKey];
      delete this.connectionLocks[connectionKey];
    }
  }

  // Закрыть все соединения и очистить ресурсы
  closeAllConnections() {
    
    this.isShuttingDown = true;
    
    // Отменяем все таймеры переподключения
    Object.keys(this.reconnectTimers).forEach(key => {
      if (this.reconnectTimers[key]) {
        clearTimeout(this.reconnectTimers[key]);
      }
    });
    this.reconnectTimers = {};
    
    // Отменяем все интервалы пинга
    Object.keys(this.pingIntervals).forEach(key => {
      if (this.pingIntervals[key]) {
        clearInterval(this.pingIntervals[key]);
      }
    });
    this.pingIntervals = {};
    
    // Закрываем все соединения
    Object.keys(this.connections).forEach(key => {
      try {
        const socket = this.connections[key];
        if (socket) {
          // Удаляем обработчики
          socket.onopen = null;
          socket.onclose = null;
          socket.onerror = null;
          socket.onmessage = null;
          
          // Закрываем соединение
          if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
            socket.close(1000, 'Приложение закрывается');
          }
        }
      } catch (error) {
        console.error(`[WebSocketService] Ошибка при закрытии соединения ${key}:`, error);
      }
    });
    
    // Очищаем все списки
    this.connections = {};
    this.messageHandlers = {};
    this.connectionLocks = {};
    this.reconnectAttempts = {};
    this.reconnectingFlags = {};
    this.connectionTokens = {};
    this.connectionRequestCounts = {};
    
    this.isShuttingDown = false;
    
  }

  // Проверить состояние соединения
  isConnectionOpen(connectionKey) {
    const socket = this.connections[connectionKey];
    return socket && socket.readyState === WebSocket.OPEN;
  }
  
  // Получить количество активных соединений
  getActiveConnectionsCount() {
    return Object.keys(this.connections).filter(key => {
      const socket = this.connections[key];
      return socket && socket.readyState === WebSocket.OPEN;
    }).length;
  }
}

// Создаем и экспортируем синглтон
const webSocketService = new WebSocketService();
export default webSocketService; 