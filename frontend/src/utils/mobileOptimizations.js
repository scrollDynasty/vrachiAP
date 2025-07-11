// Mobile optimization utilities for performance and battery life

/**
 * Detect if the device is mobile based on user agent and hardware capabilities
 */
export const isMobileDevice = () => {
  return /Android|iPhone|iPad|iPod|Mobile|BlackBerry|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Detect if the device is low-end based on hardware capabilities
 */
export const isLowEndDevice = () => {
  // Check CPU cores (<=2 cores considered low-end)
  const lowCPU = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
  
  // Check memory limit (less than 1GB heap considered low-end)
  const lowMemory = performance.memory && performance.memory.jsHeapSizeLimit < 1000000000;
  
  return lowCPU || lowMemory;
};

/**
 * Get optimized throttle delay based on device capabilities
 */
export const getOptimizedThrottleDelay = (defaultDelay = 200) => {
  if (isMobileDevice()) {
    return isLowEndDevice() ? 1500 : 1000; // Longer delays for mobile devices
  }
  return defaultDelay; // Keep original delay for desktop
};

/**
 * Background/foreground detection utilities
 */
export class BackgroundDetector {
  constructor() {
    this.callbacks = new Set();
    this.isBackground = document.hidden;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.addEventListener('focus', this.handleFocus.bind(this));
    window.addEventListener('blur', this.handleBlur.bind(this));
    
    this.isInitialized = true;
  }

  handleVisibilityChange() {
    const wasBackground = this.isBackground;
    this.isBackground = document.hidden;
    
    if (wasBackground !== this.isBackground) {
      this.notifyCallbacks(this.isBackground ? 'background' : 'foreground');
    }
  }

  handleFocus() {
    if (this.isBackground) {
      this.isBackground = false;
      this.notifyCallbacks('foreground');
    }
  }

  handleBlur() {
    if (!this.isBackground) {
      this.isBackground = true;
      this.notifyCallbacks('background');
    }
  }

  notifyCallbacks(state) {
    this.callbacks.forEach(callback => {
      try {
        callback(state);
      } catch (error) {
        // Silent error handling to prevent breaking other callbacks
      }
    });
  }

  addCallback(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback); // Return unsubscribe function
  }

  removeCallback(callback) {
    this.callbacks.delete(callback);
  }

  isInBackground() {
    return this.isBackground;
  }

  destroy() {
    if (!this.isInitialized) return;
    
    document.removeEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
    window.removeEventListener('focus', this.handleFocus.bind(this));
    window.removeEventListener('blur', this.handleBlur.bind(this));
    
    this.callbacks.clear();
    this.isInitialized = false;
  }
}

// Global background detector instance
export const backgroundDetector = new BackgroundDetector();

/**
 * Initialize mobile optimizations
 */
export const initMobileOptimizations = () => {
  // Initialize background detection
  backgroundDetector.init();

  // Optimize touch events for mobile devices
  if (isMobileDevice()) {
    // Enable passive touch events for better scroll performance
    const passiveEvents = ['touchstart', 'touchmove', 'wheel', 'scroll'];
    
    passiveEvents.forEach(eventType => {
      const originalAddEventListener = document.addEventListener;
      document.addEventListener = function(type, listener, options) {
        if (passiveEvents.includes(type)) {
          if (typeof options === 'boolean') {
            options = { capture: options, passive: true };
          } else if (typeof options === 'object') {
            options = { ...options, passive: true };
          } else {
            options = { passive: true };
          }
        }
        return originalAddEventListener.call(this, type, listener, options);
      };
    });

    // Reduce animation frame rate on low-end devices
    if (isLowEndDevice()) {
      const originalRAF = window.requestAnimationFrame;
      let frameSkip = 0;
      
      window.requestAnimationFrame = function(callback) {
        frameSkip++;
        if (frameSkip % 2 === 0) { // Skip every other frame on low-end devices
          return originalRAF(callback);
        } else {
          return setTimeout(callback, 16); // ~60fps -> ~30fps
        }
      };
    }
  }
};

/**
 * WebSocket optimization for mobile devices
 */
export const createMobileOptimizedWebSocket = (url, protocols, options = {}) => {
  const {
    pauseOnBackground = true,
    reconnectDelay = isMobileDevice() ? 5000 : 1000,
    maxReconnectAttempts = isMobileDevice() ? 3 : 5
  } = options;

  let ws = null;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let isPaused = false;
  
  const connect = () => {
    try {
      ws = new WebSocket(url, protocols);
      return ws;
    } catch (error) {
      if (reconnectAttempts < maxReconnectAttempts) {
        scheduleReconnect();
      }
      return null;
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimer) return;
    
    reconnectAttempts++;
    const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts - 1);
    
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      if (!isPaused) {
        connect();
      }
    }, Math.min(delay, 30000)); // Max 30 seconds delay
  };

  const pause = () => {
    isPaused = true;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close(1000, 'Paused due to background');
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  };

  const resume = () => {
    isPaused = false;
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      connect();
    }
  };

  // Set up background detection if enabled
  if (pauseOnBackground) {
    const unsubscribe = backgroundDetector.addCallback((state) => {
      if (state === 'background') {
        pause();
      } else {
        resume();
      }
    });

    // Return enhanced WebSocket with cleanup
    const originalClose = ws?.close || (() => {});
    if (ws) {
      ws.close = function(...args) {
        unsubscribe();
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
        }
        return originalClose.apply(this, args);
      };
    }
  }

  return connect();
};

export default {
  isMobileDevice,
  isLowEndDevice,
  getOptimizedThrottleDelay,
  BackgroundDetector,
  backgroundDetector,
  initMobileOptimizations,
  createMobileOptimizedWebSocket
};