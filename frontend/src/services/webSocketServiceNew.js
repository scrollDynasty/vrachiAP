/**
 * WebSocket Service Adapter
 * 
 * This adapter provides backward-compatible interface for existing components
 * while using the centralized WebSocketManager under the hood.
 */

import webSocketManager from './WebSocketManager';

class WebSocketServiceAdapter {
  constructor() {
    this.manager = webSocketManager;
  }
  
  /**
   * Get notification connection for a user
   * Compatible with existing NotificationWebSocket.jsx
   */
  async getNotificationConnection(userId, onMessage, onStatusChange) {
    if (!userId || userId === 'undefined') {
      console.error('[WebSocketService] Invalid user ID for notifications');
      if (onStatusChange) onStatusChange('error', 'Invalid user ID');
      return null;
    }
    
    const connectionId = `notifications_${userId}`;
    
    try {
      const connection = await this.manager.createConnection(connectionId, {
        endpoint: `/ws/notifications/${userId}`,
        onMessage,
        onStatusChange,
        parameters: {}
      });
      
      return connection;
    } catch (error) {
      console.error('[WebSocketService] Failed to create notification connection:', error);
      if (onStatusChange) onStatusChange('error', error.message);
      return null;
    }
  }
  
  /**
   * Get consultation connection for a consultation
   * Compatible with existing ConsultationChat.jsx
   */
  async getConsultationConnection(consultationId, onMessage, onStatusChange) {
    if (!consultationId) {
      console.error('[WebSocketService] Invalid consultation ID');
      if (onStatusChange) onStatusChange('error', 'Invalid consultation ID');
      return null;
    }
    
    const connectionId = `consultation_${consultationId}`;
    
    try {
      const connection = await this.manager.createConnection(connectionId, {
        endpoint: `/ws/consultations/${consultationId}`,
        onMessage: (event) => {
          // Adapter for existing message handler format
          if (onMessage) {
            onMessage(event);
          }
        },
        onStatusChange,
        parameters: {}
      });
      
      return connection;
    } catch (error) {
      console.error('[WebSocketService] Failed to create consultation connection:', error);
      if (onStatusChange) onStatusChange('error', error.message);
      return null;
    }
  }
  
  /**
   * Get calls connection for a user
   * Compatible with existing CallsContext.jsx
   */
  async getCallsConnection(userId, onMessage, onStatusChange) {
    if (!userId || userId === 'undefined') {
      console.error('[WebSocketService] Invalid user ID for calls');
      if (onStatusChange) onStatusChange('error', 'Invalid user ID');
      return null;
    }
    
    const connectionId = `calls_${userId}`;
    
    try {
      const connection = await this.manager.createConnection(connectionId, {
        endpoint: `/api/calls/ws/incoming/${userId}`,
        onMessage,
        onStatusChange,
        parameters: {
          token: localStorage.getItem('auth_token')
        },
        useExistingToken: true // Use existing auth token instead of WebSocket token
      });
      
      return connection;
    } catch (error) {
      console.error('[WebSocketService] Failed to create calls connection:', error);
      if (onStatusChange) onStatusChange('error', error.message);
      return null;
    }
  }
  
  /**
   * Close notification connection
   * Compatible with existing components
   */
  closeNotificationConnection(userId) {
    const connectionId = `notifications_${userId}`;
    this.manager.closeConnection(connectionId);
  }
  
  /**
   * Close consultation connection
   * Compatible with existing components
   */
  closeConsultationConnection(consultationId) {
    const connectionId = `consultation_${consultationId}`;
    this.manager.closeConnection(connectionId);
  }
  
  /**
   * Close calls connection
   * Compatible with existing components
   */
  closeCallsConnection(userId) {
    const connectionId = `calls_${userId}`;
    this.manager.closeConnection(connectionId);
  }
  
  /**
   * Close all connections
   * Compatible with existing components
   */
  closeAllConnections() {
    this.manager.closeAllConnections();
  }
  
  /**
   * Check if connection is open
   * Compatible with existing components
   */
  isConnectionOpen(connectionId) {
    const status = this.manager.getConnectionStatus(connectionId);
    return status === 'connected';
  }
  
  /**
   * Get active connections count
   * Compatible with existing components
   */
  getActiveConnectionsCount() {
    const stats = this.manager.getGlobalStats();
    return stats.activeConnections;
  }
  
  /**
   * Send message to connection
   */
  sendMessage(connectionId, message) {
    return this.manager.sendMessage(connectionId, message);
  }
  
  /**
   * Get connection status
   */
  getConnectionStatus(connectionId) {
    return this.manager.getConnectionStatus(connectionId);
  }
  
  /**
   * Get global connection statistics for debugging
   */
  getGlobalStats() {
    return this.manager.getGlobalStats();
  }
}

// Create singleton instance
const webSocketService = new WebSocketServiceAdapter();

// For backward compatibility, expose original methods
// These will be deprecated in favor of the centralized approach
webSocketService.getNotificationConnection = webSocketService.getNotificationConnection.bind(webSocketService);
webSocketService.getConsultationConnection = webSocketService.getConsultationConnection.bind(webSocketService);
webSocketService.closeAllConnections = webSocketService.closeAllConnections.bind(webSocketService);
webSocketService.closeConnection = webSocketService.manager.closeConnection.bind(webSocketService.manager);
webSocketService.closeConsultationConnection = webSocketService.closeConsultationConnection.bind(webSocketService);
webSocketService.closeNotificationConnection = webSocketService.closeNotificationConnection.bind(webSocketService);

export default webSocketService;