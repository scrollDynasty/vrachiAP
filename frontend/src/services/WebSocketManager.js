/**
 * Centralized WebSocket Manager
 * 
 * This service manages all WebSocket connections in the application to prevent:
 * - Multiple competing connections
 * - Connection leaks and memory issues
 * - Inconsistent reconnection logic
 * - Token management problems
 * 
 * Features:
 * - Single point of connection management
 * - Automatic reconnection with exponential backoff
 * - Token caching and refresh
 * - Connection pooling
 * - Proper cleanup and memory management
 * - Status monitoring and debugging
 */

import api from '../api';

class WebSocketManager {
  constructor() {
    // Connection registry - stores all active connections
    this.connections = new Map();
    
    // Message handlers registry
    this.messageHandlers = new Map();
    
    // Connection status callbacks
    this.statusCallbacks = new Map();
    
    // Token cache with expiration
    this.tokenCache = {
      token: null,
      expiresAt: null,
      refreshPromise: null
    };
    
    // Reconnection state
    this.reconnectAttempts = new Map();
    this.reconnectTimers = new Map();
    this.maxReconnectAttempts = 10;
    this.baseReconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    
    // Keep-alive mechanism
    this.keepAliveIntervals = new Map();
    this.keepAliveInterval = 30000; // 30 seconds
    
    // Connection locks to prevent race conditions
    this.connectionLocks = new Set();
    
    // Global connection state for monitoring
    this.globalConnectionState = {
      totalConnections: 0,
      activeConnections: 0,
      reconnecting: 0,
      lastActivity: Date.now()
    };
    
    // Shutdown flag
    this.isShuttingDown = false;
    
    // Bind methods
    this.createConnection = this.createConnection.bind(this);
    this.closeConnection = this.closeConnection.bind(this);
    this.closeAllConnections = this.closeAllConnections.bind(this);
    
    // Setup cleanup handlers
    this.setupCleanupHandlers();
    
    // Setup network monitoring
    this.setupNetworkMonitoring();
  }
  
  /**
   * Setup cleanup handlers for page unload and visibility changes
   */
  setupCleanupHandlers() {
    // Cleanup on page unload
    window.addEventListener('beforeunload', this.closeAllConnections);
    
    // Handle visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.handleVisibilityVisible();
      } else {
        this.handleVisibilityHidden();
      }
    });
  }
  
  /**
   * Setup network connectivity monitoring
   */
  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.handleNetworkOnline();
    });
    
    window.addEventListener('offline', () => {
      this.handleNetworkOffline();
    });
  }
  
  /**
   * Handle page becoming visible - check and restore connections
   */
  handleVisibilityVisible() {
    // Check all connections and restore if needed
    setTimeout(() => {
      this.connections.forEach((_, connectionId) => {
        this.checkAndRestoreConnection(connectionId);
      });
    }, 500);
  }
  
  /**
   * Handle page becoming hidden - pause non-critical connections
   */
  handleVisibilityHidden() {
    // Cancel all reconnection attempts to save resources
    this.reconnectTimers.forEach((timer, connectionId) => {
      if (timer) {
        clearTimeout(timer);
        this.reconnectTimers.delete(connectionId);
      }
    });
  }
  
  /**
   * Handle network coming online
   */
  handleNetworkOnline() {
    // Restore all connections after a brief delay
    setTimeout(() => {
      this.connections.forEach((_, connectionId) => {
        this.checkAndRestoreConnection(connectionId);
      });
    }, 1000);
  }
  
  /**
   * Handle network going offline
   */
  handleNetworkOffline() {
    // Cancel all reconnection attempts
    this.reconnectTimers.forEach((timer, connectionId) => {
      if (timer) {
        clearTimeout(timer);
        this.reconnectTimers.delete(connectionId);
      }
    });
    
    // Update global state
    this.globalConnectionState.reconnecting = 0;
  }
  
  /**
   * Get or refresh WebSocket token
   */
  async getWebSocketToken() {
    const now = Date.now();
    
    // Return cached token if still valid (with 5 minute buffer)
    if (this.tokenCache.token && this.tokenCache.expiresAt && 
        now < this.tokenCache.expiresAt - 300000) {
      return this.tokenCache.token;
    }
    
    // If refresh is already in progress, wait for it
    if (this.tokenCache.refreshPromise) {
      return await this.tokenCache.refreshPromise;
    }
    
    // Start token refresh
    this.tokenCache.refreshPromise = this.fetchNewToken();
    
    try {
      const token = await this.tokenCache.refreshPromise;
      return token;
    } finally {
      this.tokenCache.refreshPromise = null;
    }
  }
  
  /**
   * Fetch new WebSocket token from API
   */
  async fetchNewToken() {
    try {
      const response = await api.get('/api/ws-token');
      const token = response.data?.token;
      
      if (!token) {
        throw new Error('Invalid token response');
      }
      
      // Cache token for 1 hour
      this.tokenCache.token = token;
      this.tokenCache.expiresAt = Date.now() + 3600000;
      
      return token;
    } catch (error) {
      // Clear cache on error
      this.tokenCache.token = null;
      this.tokenCache.expiresAt = null;
      throw error;
    }
  }
  
  /**
   * Create or get existing WebSocket connection
   */
  async createConnection(connectionId, config) {
    const {
      endpoint,
      onMessage,
      onStatusChange,
      parameters = {}
    } = config;
    
    // Prevent duplicate connection creation
    const lockKey = `lock_${connectionId}`;
    if (this.connectionLocks.has(lockKey)) {
      // Wait for existing connection creation to complete
      let attempts = 0;
      while (this.connectionLocks.has(lockKey) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
    }
    
    // Return existing connection if available and open
    const existingConnection = this.connections.get(connectionId);
    if (existingConnection && existingConnection.readyState === WebSocket.OPEN) {
      // Update handlers if provided
      if (onMessage) this.messageHandlers.set(connectionId, onMessage);
      if (onStatusChange) this.statusCallbacks.set(connectionId, onStatusChange);
      
      // Notify about existing connection
      if (onStatusChange) onStatusChange('connected');
      
      return existingConnection;
    }
    
    // Set connection lock
    this.connectionLocks.add(lockKey);
    
    try {
      // Get fresh token (skip for calls endpoint that uses auth token)
      let token;
      if (config.useExistingToken && parameters.token) {
        token = parameters.token;
      } else {
        token = await this.getWebSocketToken();
      }
      
      // Build WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsUrl;
      
      if (config.useExistingToken) {
        // For calls endpoint, use the existing format
        wsUrl = `${protocol}//${window.location.host}${endpoint}?token=${encodeURIComponent(token)}`;
      } else {
        // For other endpoints, use the new format
        wsUrl = `${protocol}//${window.location.host}${endpoint}?token=${encodeURIComponent(token)}`;
      }
      
      // Add additional parameters (except token which is already added)
      const urlParams = new URLSearchParams();
      Object.entries(parameters).forEach(([key, value]) => {
        if (key !== 'token' && value !== undefined && value !== null) {
          urlParams.append(key, value);
        }
      });
      
      const finalUrl = urlParams.toString() ? 
        `${wsUrl}&${urlParams.toString()}` : wsUrl;
      
      // Create WebSocket connection
      const ws = new WebSocket(finalUrl);
      
      // Store connection immediately to prevent duplicates
      this.connections.set(connectionId, ws);
      
      // Store handlers
      if (onMessage) this.messageHandlers.set(connectionId, onMessage);
      if (onStatusChange) this.statusCallbacks.set(connectionId, onStatusChange);
      
      // Setup connection event handlers
      this.setupConnectionHandlers(connectionId, ws);
      
      // Update global state
      this.globalConnectionState.totalConnections++;
      this.globalConnectionState.lastActivity = Date.now();
      
      return ws;
      
    } catch (error) {
      // Clean up on error
      this.connections.delete(connectionId);
      this.messageHandlers.delete(connectionId);
      this.statusCallbacks.delete(connectionId);
      
      if (onStatusChange) {
        onStatusChange('error', error.message);
      }
      
      throw error;
    } finally {
      // Release lock
      this.connectionLocks.delete(lockKey);
    }
  }
  
  /**
   * Setup event handlers for WebSocket connection
   */
  setupConnectionHandlers(connectionId, ws) {
    ws.onopen = () => {
      // Update state
      this.globalConnectionState.activeConnections++;
      this.globalConnectionState.lastActivity = Date.now();
      
      // Reset reconnection attempts
      this.reconnectAttempts.delete(connectionId);
      
      // Clear any existing reconnection timer
      const timer = this.reconnectTimers.get(connectionId);
      if (timer) {
        clearTimeout(timer);
        this.reconnectTimers.delete(connectionId);
      }
      
      // Setup keep-alive
      this.setupKeepAlive(connectionId, ws);
      
      // Notify status callback
      const statusCallback = this.statusCallbacks.get(connectionId);
      if (statusCallback) statusCallback('connected');
    };
    
    ws.onmessage = (event) => {
      this.globalConnectionState.lastActivity = Date.now();
      
      try {
        const data = JSON.parse(event.data);
        const messageHandler = this.messageHandlers.get(connectionId);
        
        if (messageHandler) {
          messageHandler(data);
        }
      } catch (error) {
        console.error(`[WebSocketManager] Message parsing error for ${connectionId}:`, error);
      }
    };
    
    ws.onclose = (event) => {
      // Update state
      this.globalConnectionState.activeConnections = Math.max(0, 
        this.globalConnectionState.activeConnections - 1);
      
      // Clean up keep-alive
      this.cleanupKeepAlive(connectionId);
      
      // Remove from connections if this is the current connection
      if (this.connections.get(connectionId) === ws) {
        this.connections.delete(connectionId);
      }
      
      // Notify status callback
      const statusCallback = this.statusCallbacks.get(connectionId);
      if (statusCallback) statusCallback('disconnected', `Connection closed (${event.code})`);
      
      // Schedule reconnection if not a normal closure and not shutting down
      if (!this.isShuttingDown && event.code !== 1000) {
        this.scheduleReconnection(connectionId);
      } else {
        // Clean up handlers on normal closure
        this.messageHandlers.delete(connectionId);
        this.statusCallbacks.delete(connectionId);
      }
    };
    
    ws.onerror = (error) => {
      console.error(`[WebSocketManager] Connection error for ${connectionId}:`, error);
      
      const statusCallback = this.statusCallbacks.get(connectionId);
      if (statusCallback) statusCallback('error', 'Connection error occurred');
    };
  }
  
  /**
   * Setup keep-alive mechanism for connection
   */
  setupKeepAlive(connectionId, ws) {
    // Clear any existing keep-alive
    this.cleanupKeepAlive(connectionId);
    
    const interval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ 
            type: 'keep-alive', 
            timestamp: Date.now() 
          }));
        } catch (error) {
          console.error(`[WebSocketManager] Keep-alive error for ${connectionId}:`, error);
          clearInterval(interval);
          this.keepAliveIntervals.delete(connectionId);
        }
      } else {
        // Clean up if connection is not open
        clearInterval(interval);
        this.keepAliveIntervals.delete(connectionId);
      }
    }, this.keepAliveInterval);
    
    this.keepAliveIntervals.set(connectionId, interval);
  }
  
  /**
   * Clean up keep-alive for connection
   */
  cleanupKeepAlive(connectionId) {
    const interval = this.keepAliveIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.keepAliveIntervals.delete(connectionId);
    }
  }
  
  /**
   * Schedule reconnection with exponential backoff
   */
  scheduleReconnection(connectionId) {
    // Clear any existing timer
    const existingTimer = this.reconnectTimers.get(connectionId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Get current attempt count
    const attempts = this.reconnectAttempts.get(connectionId) || 0;
    
    // Check max attempts
    if (attempts >= this.maxReconnectAttempts) {
      console.warn(`[WebSocketManager] Max reconnection attempts reached for ${connectionId}`);
      this.messageHandlers.delete(connectionId);
      this.statusCallbacks.delete(connectionId);
      return;
    }
    
    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, attempts),
      this.maxReconnectDelay
    );
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    const finalDelay = delay + jitter;
    
    // Update attempt count
    this.reconnectAttempts.set(connectionId, attempts + 1);
    this.globalConnectionState.reconnecting++;
    
    // Schedule reconnection
    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(connectionId);
      this.globalConnectionState.reconnecting = Math.max(0, 
        this.globalConnectionState.reconnecting - 1);
      
      try {
        // Attempt to restore connection
        await this.checkAndRestoreConnection(connectionId);
      } catch (error) {
        console.error(`[WebSocketManager] Reconnection failed for ${connectionId}:`, error);
        // Schedule another attempt
        this.scheduleReconnection(connectionId);
      }
    }, finalDelay);
    
    this.reconnectTimers.set(connectionId, timer);
    
    // Notify status callback
    const statusCallback = this.statusCallbacks.get(connectionId);
    if (statusCallback) {
      statusCallback('reconnecting', `Reconnecting in ${Math.round(finalDelay/1000)}s (attempt ${attempts + 1})`);
    }
  }
  
  /**
   * Check and restore connection if needed
   */
  async checkAndRestoreConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    
    // Skip if connection is already open
    if (connection && connection.readyState === WebSocket.OPEN) {
      return connection;
    }
    
    // Check if we have handlers for this connection
    const messageHandler = this.messageHandlers.get(connectionId);
    const statusCallback = this.statusCallbacks.get(connectionId);
    
    if (!messageHandler && !statusCallback) {
      // No handlers, connection is not needed anymore
      this.connections.delete(connectionId);
      return null;
    }
    
    // Determine connection configuration based on connection ID
    const config = this.getConnectionConfig(connectionId);
    if (!config) {
      console.warn(`[WebSocketManager] Unknown connection type: ${connectionId}`);
      return null;
    }
    
    // Update config with existing handlers
    config.onMessage = messageHandler;
    config.onStatusChange = statusCallback;
    
    // Recreate connection
    return await this.createConnection(connectionId, config);
  }
  
  /**
   * Get connection configuration based on connection ID
   */
  getConnectionConfig(connectionId) {
    if (connectionId.startsWith('notifications_')) {
      const userId = connectionId.replace('notifications_', '');
      return {
        endpoint: `/ws/notifications/${userId}`,
        parameters: {}
      };
    }
    
    if (connectionId.startsWith('consultation_')) {
      const consultationId = connectionId.replace('consultation_', '');
      return {
        endpoint: `/ws/consultations/${consultationId}`,
        parameters: {}
      };
    }
    
    if (connectionId.startsWith('calls_')) {
      const userId = connectionId.replace('calls_', '');
      // For calls, we need to use the existing token from localStorage
      // and handle the endpoint differently
      return {
        endpoint: `/api/calls/ws/incoming/${userId}`,
        parameters: {
          token: localStorage.getItem('auth_token')
        },
        useExistingToken: true // Flag to skip WebSocket token generation
      };
    }
    
    return null;
  }
  
  /**
   * Close specific connection
   */
  closeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    
    if (connection) {
      // Clean up timers
      const timer = this.reconnectTimers.get(connectionId);
      if (timer) {
        clearTimeout(timer);
        this.reconnectTimers.delete(connectionId);
      }
      
      this.cleanupKeepAlive(connectionId);
      
      // Close connection
      if (connection.readyState === WebSocket.OPEN || 
          connection.readyState === WebSocket.CONNECTING) {
        connection.close(1000, 'Connection closed by request');
      }
      
      // Clean up references
      this.connections.delete(connectionId);
      this.messageHandlers.delete(connectionId);
      this.statusCallbacks.delete(connectionId);
      this.reconnectAttempts.delete(connectionId);
    }
  }
  
  /**
   * Close all connections
   */
  closeAllConnections() {
    this.isShuttingDown = true;
    
    // Clear all timers
    this.reconnectTimers.forEach(timer => clearTimeout(timer));
    this.reconnectTimers.clear();
    
    this.keepAliveIntervals.forEach(interval => clearInterval(interval));
    this.keepAliveIntervals.clear();
    
    // Close all connections
    this.connections.forEach((connection, connectionId) => {
      if (connection && 
          (connection.readyState === WebSocket.OPEN || 
           connection.readyState === WebSocket.CONNECTING)) {
        connection.close(1000, 'Application shutting down');
      }
    });
    
    // Clear all data
    this.connections.clear();
    this.messageHandlers.clear();
    this.statusCallbacks.clear();
    this.reconnectAttempts.clear();
    this.connectionLocks.clear();
    
    // Reset global state
    this.globalConnectionState = {
      totalConnections: 0,
      activeConnections: 0,
      reconnecting: 0,
      lastActivity: Date.now()
    };
    
    this.isShuttingDown = false;
  }
  
  /**
   * Get connection status
   */
  getConnectionStatus(connectionId) {
    const connection = this.connections.get(connectionId);
    
    if (!connection) {
      return 'not-created';
    }
    
    switch (connection.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CLOSING:
        return 'closing';
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'unknown';
    }
  }
  
  /**
   * Get global connection statistics
   */
  getGlobalStats() {
    return {
      ...this.globalConnectionState,
      connections: Array.from(this.connections.keys()).map(id => ({
        id,
        status: this.getConnectionStatus(id),
        hasHandlers: this.messageHandlers.has(id) || this.statusCallbacks.has(id)
      }))
    };
  }
  
  /**
   * Send message to specific connection
   */
  sendMessage(connectionId, message) {
    const connection = this.connections.get(connectionId);
    
    if (connection && connection.readyState === WebSocket.OPEN) {
      try {
        const data = typeof message === 'string' ? message : JSON.stringify(message);
        connection.send(data);
        return true;
      } catch (error) {
        console.error(`[WebSocketManager] Send message error for ${connectionId}:`, error);
        return false;
      }
    }
    
    return false;
  }
}

// Create singleton instance
const webSocketManager = new WebSocketManager();

// Make available for debugging
if (typeof window !== 'undefined') {
  window.webSocketManager = webSocketManager;
}

export default webSocketManager;