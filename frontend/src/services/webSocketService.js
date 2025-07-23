/**
 * WebSocket Service - Centralized WebSocket connection management
 * 
 * This service has been refactored to use a centralized WebSocketManager
 * to prevent multiple competing connections and improve stability.
 */

import webSocketServiceAdapter from './webSocketServiceNew';

// Export the adapter as the main service for backward compatibility
export default webSocketServiceAdapter;