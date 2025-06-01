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
    console.log(`[WebSocketService] Запрос соединения для ${connectionKey} (запрос #${this.connectionRequestCounts[connectionKey]})`);
    
    // Если соединение уже существует и открыто, возвращаем его
    if (this.connections[connectionKey] && this.connections[connectionKey].readyState === WebSocket.OPEN) {
      console.log(`[WebSocketService] Возвращаю существующее активное соединение для ${connectionKey}`);
      
      // Обновляем обработчик сообщений
      if (onMessage && onMessage !== this.messageHandlers[connectionKey]) {
        this.messageHandlers[connectionKey] = onMessage;
      }
      
      if (onStatusChange) onStatusChange('connected');
      
      return this.connections[connectionKey];
    }
    
    // Если есть активная блокировка на это соединение, ждём завершения
    if (this.connectionLocks[connectionKey]) {
      console.log(`[WebSocketService] Соединение ${connectionKey} уже инициализируется, ожидание...`);
      
      if (onStatusChange) onStatusChange('connecting');
      
      // Ждем до 3 секунд, периодически проверяя, создано ли соединение
      let attempts = 0;
      const maxAttempts = 15; // 3 секунды при интервале в 200 мс
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
        
        // Если соединение уже создано, возвращаем его
        if (this.connections[connectionKey] && this.connections[connectionKey].readyState === WebSocket.OPEN) {
          console.log(`[WebSocketService] Дождались создания соединения ${connectionKey}`);
          
          // Обновляем обработчик сообщений, если передан новый
          if (onMessage && this.messageHandlers[connectionKey] !== onMessage) {
            this.messageHandlers[connectionKey] = onMessage;
          }
          
          if (onStatusChange) onStatusChange('connected');
          return this.connections[connectionKey];
        }
        
        // Если блокировка снята, но соединение не создано, прекращаем ожидание
        if (!this.connectionLocks[connectionKey]) {
          break;
        }
      }
      
      // Если мы дождались снятия блокировки, но соединение все еще не создано
      if (!this.connectionLocks[connectionKey] && 
          (!this.connections[connectionKey] || this.connections[connectionKey].readyState !== WebSocket.OPEN)) {
        // Продолжаем выполнение и пытаемся создать соединение сами
        console.log(`[WebSocketService] Блокировка снята, но соединение ${connectionKey} не создано, создаем новое`);
      } else if (this.connectionLocks[connectionKey]) {
        // Если блокировка все еще активна после ожидания, сообщаем об ошибке
        console.error(`[WebSocketService] Превышено время ожидания создания соединения ${connectionKey}`);
        if (onStatusChange) onStatusChange('error', 'Не удалось установить соединение с сервером');
        return null;
      }
    }
    
    // Устанавливаем блокировку
    this.connectionLocks[connectionKey] = true;
    
    try {
      // Если соединение существует, но не в состоянии OPEN, закрываем его
      if (this.connections[connectionKey]) {
        try {
          console.log(`[WebSocketService] Закрываю неактивное соединение для ${connectionKey} (состояние: ${this.connections[connectionKey].readyState})`);
          this.connections[connectionKey].close(1000, 'Закрыто перед переподключением');
        } catch (closeError) {
          console.warn(`[WebSocketService] Ошибка при закрытии неактивного соединения для ${connectionKey}:`, closeError);
        }
        
        // Удаляем ссылку на соединение
        delete this.connections[connectionKey];
      }
      
      // Запрашиваем токен для WebSocket
      console.log(`[WebSocketService] Запрашиваю токен для WebSocket соединения ${connectionKey}`);
      
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
      
      // Используем относительный URL для WebSocket через прокси Vite
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}${this.wsBaseUrl}/ws/notifications/${userId}?token=${token}`;
      
      console.log(`[WebSocketService] Создаю новое WebSocket соединение: ${wsUrl.split('?')[0]}?token=***`);
      
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
        console.log(`[WebSocketService] Соединение ${connectionKey} успешно установлено`);
        
        // Если передан callback изменения статуса, вызываем его
        if (onStatusChange) onStatusChange('connected');
        
        // Освобождаем блокировку ТОЛЬКО после успешного открытия соединения
        this.connectionLocks[connectionKey] = false;
      };
      
      socket.onmessage = (event) => {
        try {
          // Разбираем сообщение JSON
          const data = JSON.parse(event.data);
          console.log(`[WebSocketService] Получено сообщение для ${connectionKey}:`, data);
          
          // Если есть обработчик сообщений, вызываем его
          if (this.messageHandlers[connectionKey]) {
            this.messageHandlers[connectionKey](data);
          }
        } catch (error) {
          console.error(`[WebSocketService] Ошибка при обработке сообщения для ${connectionKey}:`, error);
        }
      };
      
      socket.onclose = (event) => {
        console.log(`[WebSocketService] Соединение ${connectionKey} закрыто:`, event.code, event.reason);
        
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
      
      return null;
    }
  }
  
  // Получить соединение для чата консультации
  async getConsultationConnection(consultationId, onMessage, onStatusChange) {
    const connectionKey = `consultation_${consultationId}`;
    
    // Увеличиваем счётчик запросов
    this.connectionRequestCounts[connectionKey] = (this.connectionRequestCounts[connectionKey] || 0) + 1;
    
    // Проверяем, есть ли активное соединение, прежде чем проверять блокировку
    if (this.connections[connectionKey] && this.connections[connectionKey].readyState === WebSocket.OPEN) {
      console.log(`[WebSocketService] Возвращаю существующее активное соединение для ${connectionKey}`);
      
      // Обновляем обработчик сообщений, если передан новый
      if (onMessage && this.messageHandlers[connectionKey] !== onMessage) {
        this.messageHandlers[connectionKey] = onMessage;
      }
      
      // Если передан callback изменения статуса, вызываем его
      if (onStatusChange) onStatusChange('connected');
      
      return this.connections[connectionKey];
    }
    
    // Если есть активная блокировка на это соединение, ждём завершения
    if (this.connectionLocks[connectionKey]) {
      // Вместо возврата null, ждем завершения предыдущего запроса
      console.log(`[WebSocketService] Соединение ${connectionKey} уже инициализируется, ожидание...`);
      
      if (onStatusChange) onStatusChange('connecting');
      
      // Ждем до 3 секунд, периодически проверяя, создано ли соединение
      let attempts = 0;
      const maxAttempts = 15; // 3 секунды при интервале в 200 мс
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200));
        attempts++;
        
        // Если соединение уже создано, возвращаем его
        if (this.connections[connectionKey] && this.connections[connectionKey].readyState === WebSocket.OPEN) {
          console.log(`[WebSocketService] Дождались создания соединения ${connectionKey}`);
          
          // Обновляем обработчик сообщений, если передан новый
          if (onMessage && this.messageHandlers[connectionKey] !== onMessage) {
            this.messageHandlers[connectionKey] = onMessage;
          }
          
          if (onStatusChange) onStatusChange('connected');
          return this.connections[connectionKey];
        }
        
        // Если блокировка снята, но соединение не создано, прекращаем ожидание
        if (!this.connectionLocks[connectionKey]) {
          break;
        }
      }
      
      // Если мы дождались снятия блокировки, но соединение все еще не создано
      if (!this.connectionLocks[connectionKey] && 
          (!this.connections[connectionKey] || this.connections[connectionKey].readyState !== WebSocket.OPEN)) {
        // Продолжаем выполнение и пытаемся создать соединение сами
        console.log(`[WebSocketService] Блокировка снята, но соединение ${connectionKey} не создано, создаем новое`);
      } else if (this.connectionLocks[connectionKey]) {
        // Если блокировка все еще активна после ожидания, сообщаем об ошибке
        console.error(`[WebSocketService] Превышено время ожидания создания соединения ${connectionKey}`);
        if (onStatusChange) onStatusChange('error', 'Не удалось установить соединение с сервером');
        return null;
      }
    }
    
    // Устанавливаем блокировку
    this.connectionLocks[connectionKey] = true;
    
    try {
      // Если соединение существует, но не в состоянии OPEN, закрываем его
      if (this.connections[connectionKey]) {
        try {
          console.log(`[WebSocketService] Закрываю неактивное соединение для ${connectionKey} (состояние: ${this.connections[connectionKey].readyState})`);
          this.connections[connectionKey].close(1000, 'Закрыто перед переподключением');
        } catch (closeError) {
          console.warn(`[WebSocketService] Ошибка при закрытии неактивного соединения для ${connectionKey}:`, closeError);
        }
        
        // Удаляем ссылку на соединение
        delete this.connections[connectionKey];
      }
      
      // Запрашиваем токен для WebSocket
      console.log(`[WebSocketService] Запрашиваю токен для WebSocket соединения ${connectionKey}`);
      
      // Если передан callback изменения статуса, вызываем его
      if (onStatusChange) onStatusChange('connecting');
      
      // Получаем токен для WebSocket
      let token;
      try {
        const tokenResponse = await api.get('/api/ws-token');
        if (tokenResponse && tokenResponse.status === 200 && tokenResponse.data && tokenResponse.data.token) {
          token = tokenResponse.data.token;
          console.log(`[WebSocketService] Получен токен для WebSocket: ${token.substring(0, 10)}...`);
        } else {
          console.error(`[WebSocketService] Неверный формат ответа при получении токена WebSocket:`, tokenResponse);
          
          // Освобождаем блокировку
          this.connectionLocks[connectionKey] = false;
          
          // Если передан callback изменения статуса, вызываем его
          if (onStatusChange) onStatusChange('error', 'Не удалось получить токен для WebSocket');
          
          return null;
        }
      } catch (tokenError) {
        console.error(`[WebSocketService] Ошибка при получении токена WebSocket:`, tokenError);
        
        // Освобождаем блокировку
        this.connectionLocks[connectionKey] = false;
        
        // Если передан callback изменения статуса, вызываем его
        if (onStatusChange) onStatusChange('error', 'Не удалось получить токен для WebSocket');
        
        return null;
      }
      
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
      try {
        // Формируем URL для WebSocket - исправляем путь, убираем дублирование /ws
        const wsUrl = `${this.wsProtocol}//${this.wsHost}/ws/consultations/${consultationId}?token=${token}`;
        
        // Безопасно логируем URL без токена
        try {
          console.log(`[WebSocketService] Создаю новое WebSocket соединение: ${wsUrl.split('?')[0]}?token=***`);
        } catch (logError) {
          console.log(`[WebSocketService] Создаю новое WebSocket соединение (не удалось отобразить URL)`);
        }
        
        // Создаем WebSocket соединение
        const socket = new WebSocket(wsUrl);
        
        // Устанавливаем обработчики событий
        socket.onopen = () => {
          console.log(`[WebSocketService] Соединение ${connectionKey} успешно установлено`);
          
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
          console.log(`[WebSocketService] Соединение ${connectionKey} закрыто:`, event.code, event.reason);
          
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
        
        // Сохраняем соединение
        this.connections[connectionKey] = socket;
        
        return socket;
      } catch (socketError) {
        console.error(`[WebSocketService] Ошибка при создании WebSocket соединения ${connectionKey}:`, socketError);
        
        // Освобождаем блокировку
        this.connectionLocks[connectionKey] = false;
        
        // Если передан callback изменения статуса, вызываем его
        if (onStatusChange) onStatusChange('error', 'Не удалось создать WebSocket соединение');
        
        return null;
      }
    } catch (error) {
      console.error(`[WebSocketService] Общая ошибка при получении соединения ${connectionKey}:`, error);
      
      // Освобождаем блокировку
      this.connectionLocks[connectionKey] = false;
      
      // Если передан callback изменения статуса, вызываем его
      if (onStatusChange) onStatusChange('error', 'Произошла ошибка при подключении');
      
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