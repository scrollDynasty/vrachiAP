import { useEffect, useRef, useCallback, useState } from 'react';
import { throttle, debounce } from '../utils/performanceUtils';

// ОПТИМИЗАЦИЯ: Глобальный пул WebSocket соединений
const connectionPool = new Map();
const MAX_CONNECTIONS = 3; // Ограничиваем количество одновременных соединений
const RECONNECT_DELAY = 1000;
const MAX_RECONNECT_ATTEMPTS = 5;

// ОПТИМИЗАЦИЯ: Класс для управления WebSocket соединениями
class WebSocketManager {
  constructor(url, options = {}) {
    this.url = url;
    this.options = options;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.messageQueue = [];
    this.isConnecting = false;
    this.listeners = new Set();
    this.heartbeatInterval = null;
    this.lastHeartbeat = Date.now();
  }

  // ОПТИМИЗАЦИЯ: Подключение с оптимизациями
  connect() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        
        // ОПТИМИЗАЦИЯ: Устанавливаем таймауты
        this.ws.timeout = 10000;
        
        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          resolve();
        };

        this.ws.onclose = (event) => {
          this.isConnecting = false;
          this.stopHeartbeat();
          
          if (!event.wasClean && this.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // ОПТИМИЗАЦИЯ: Отправка сообщений с throttling
  send = throttle((data) => {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      this.messageQueue.push(data);
    }
  }, 100);

  // ОПТИМИЗАЦИЯ: Обработка сообщений с debouncing
  handleMessage = debounce((event) => {
    try {
      const data = JSON.parse(event.data);
      this.listeners.forEach(listener => listener(data));
    } catch (error) {
      console.warn('WebSocket message parse error:', error);
    }
  }, 50);

  // ОПТИМИЗАЦИЯ: Планирование переподключения
  scheduleReconnect = debounce(() => {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      return;
    }

    this.reconnectAttempts++;
    const delay = RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts - 1);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // Игнорируем ошибки переподключения
      });
    }, delay);
  }, 1000);

  // ОПТИМИЗАЦИЯ: Heartbeat для поддержания соединения
  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        this.lastHeartbeat = Date.now();
      }
    }, 30000); // 30 секунд
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // ОПТИМИЗАЦИЯ: Очистка очереди сообщений
  flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  // ОПТИМИЗАЦИЯ: Добавление слушателя
  addListener(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ОПТИМИЗАЦИЯ: Закрытие соединения
  disconnect() {
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }

    this.listeners.clear();
    this.messageQueue = [];
  }

  // ОПТИМИЗАЦИЯ: Получение состояния соединения
  getState() {
    return {
      readyState: this.ws?.readyState || WebSocket.CLOSED,
      isConnecting: this.isConnecting,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat
    };
  }
}

// ОПТИМИЗАЦИЯ: Получение или создание WebSocket соединения из пула
const getOrCreateConnection = (url, options) => {
  if (connectionPool.has(url)) {
    return connectionPool.get(url);
  }

  // ОПТИМИЗАЦИЯ: Ограничиваем количество соединений
  if (connectionPool.size >= MAX_CONNECTIONS) {
    // Закрываем самое старое соединение
    const oldestUrl = connectionPool.keys().next().value;
    const oldestConnection = connectionPool.get(oldestUrl);
    oldestConnection.disconnect();
    connectionPool.delete(oldestUrl);
  }

  const connection = new WebSocketManager(url, options);
  connectionPool.set(url, connection);
  
  return connection;
};

// ОПТИМИЗАЦИЯ: Хук для использования WebSocket с оптимизациями
export const useOptimizedWebSocket = (url, options = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const connectionRef = useRef(null);
  const messageListenerRef = useRef(null);

  // ОПТИМИЗАЦИЯ: Подключение с оптимизациями
  const connect = useCallback(async () => {
    if (!url) return;

    try {
      const connection = getOrCreateConnection(url, options);
      connectionRef.current = connection;

      await connection.connect();
      setIsConnected(true);
      setError(null);

      // ОПТИМИЗАЦИЯ: Добавляем слушатель сообщений
      messageListenerRef.current = connection.addListener((data) => {
        setLastMessage(data);
      });

    } catch (err) {
      setError(err);
      setIsConnected(false);
    }
  }, [url, options]);

  // ОПТИМИЗАЦИЯ: Отправка сообщений с оптимизациями
  const sendMessage = useCallback((data) => {
    if (connectionRef.current) {
      connectionRef.current.send(data);
    }
  }, []);

  // ОПТИМИЗАЦИЯ: Отключение с очисткой
  const disconnect = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.disconnect();
      connectionRef.current = null;
    }
    
    if (messageListenerRef.current) {
      messageListenerRef.current();
      messageListenerRef.current = null;
    }

    setIsConnected(false);
    setLastMessage(null);
    setError(null);
  }, []);

  // ОПТИМИЗАЦИЯ: Получение состояния соединения
  const getConnectionState = useCallback(() => {
    return connectionRef.current?.getState() || {
      readyState: WebSocket.CLOSED,
      isConnecting: false,
      reconnectAttempts: 0,
      lastHeartbeat: null
    };
  }, []);

  // ОПТИМИЗАЦИЯ: Автоматическое подключение при монтировании
  useEffect(() => {
    if (url) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, connect, disconnect]);

  // ОПТИМИЗАЦИЯ: Очистка при размонтировании
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastMessage,
    error,
    sendMessage,
    connect,
    disconnect,
    getConnectionState
  };
};

// ОПТИМИЗАЦИЯ: Хук для множественных WebSocket соединений
export const useMultipleWebSockets = (urls, options = {}) => {
  const [connections, setConnections] = useState({});

  const connectAll = useCallback(async () => {
    const newConnections = {};
    
    for (const url of urls) {
      try {
        const connection = getOrCreateConnection(url, options);
        await connection.connect();
        newConnections[url] = connection;
      } catch (error) {
        console.warn(`Failed to connect to ${url}:`, error);
      }
    }

    setConnections(newConnections);
  }, [urls, options]);

  const disconnectAll = useCallback(() => {
    Object.values(connections).forEach(connection => {
      connection.disconnect();
    });
    setConnections({});
  }, [connections]);

  useEffect(() => {
    if (urls.length > 0) {
      connectAll();
    }

    return () => {
      disconnectAll();
    };
  }, [urls, connectAll, disconnectAll]);

  return {
    connections,
    connectAll,
    disconnectAll
  };
};

export default useOptimizedWebSocket; 