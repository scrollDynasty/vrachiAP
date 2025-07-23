import React, { useState, useEffect } from 'react';
import { Badge } from '@nextui-org/react';
import useAuthStore from '../stores/authStore';

/**
 * Centralized Connection Status Indicator
 * 
 * Shows the overall status of all WebSocket connections using the centralized manager
 */
const ConnectionStatusIndicator = () => {
  const { user, isAuthenticated } = useAuthStore();
  const [connectionStats, setConnectionStats] = useState({
    activeConnections: 0,
    totalConnections: 0,
    reconnecting: 0,
    connections: []
  });
  const [overallStatus, setOverallStatus] = useState('disconnected');

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setConnectionStats({
        activeConnections: 0,
        totalConnections: 0,
        reconnecting: 0,
        connections: []
      });
      setOverallStatus('disconnected');
      return;
    }

    // Update connection status every 2 seconds
    const interval = setInterval(async () => {
      try {
        // Dynamically import the WebSocket manager
        const webSocketService = (await import('../services/webSocketService')).default;
        const stats = webSocketService.getGlobalStats();
        
        setConnectionStats(stats);
        
        // Determine overall status
        if (stats.reconnecting > 0) {
          setOverallStatus('reconnecting');
        } else if (stats.activeConnections > 0) {
          setOverallStatus('connected');
        } else if (stats.totalConnections > 0) {
          setOverallStatus('connecting');
        } else {
          setOverallStatus('disconnected');
        }
      } catch (error) {
        console.error('Failed to get connection stats:', error);
        setOverallStatus('error');
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const getStatusColor = () => {
    switch (overallStatus) {
      case 'connected':
        return 'success';
      case 'connecting':
      case 'reconnecting':
        return 'warning';
      case 'error':
        return 'danger';
      default:
        return 'default';
    }
  };

  const getStatusIcon = () => {
    switch (overallStatus) {
      case 'connected':
        return '📞';
      case 'connecting':
        return '🔄';
      case 'reconnecting':
        return '🔁';
      case 'error':
        return '❌';
      default:
        return '⚫';
    }
  };

  const getStatusText = () => {
    switch (overallStatus) {
      case 'connected':
        return `Connected (${connectionStats.activeConnections}/${connectionStats.totalConnections})`;
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting (${connectionStats.reconnecting})`;
      case 'error':
        return 'Connection Error';
      default:
        return 'Disconnected';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge 
        color={getStatusColor()} 
        variant="flat"
        content={connectionStats.activeConnections || ''}
      >
        <div 
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border"
          title={`WebSocket Status: ${getStatusText()}\nActive: ${connectionStats.activeConnections}\nTotal: ${connectionStats.totalConnections}\nReconnecting: ${connectionStats.reconnecting}`}
        >
          <span className="text-lg">{getStatusIcon()}</span>
          <span className="text-sm font-medium">
            {getStatusText()}
          </span>
        </div>
      </Badge>
    </div>
  );
};

export default ConnectionStatusIndicator;