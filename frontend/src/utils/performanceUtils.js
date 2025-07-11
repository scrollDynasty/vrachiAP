// ОПТИМИЗАЦИЯ: Утилиты для повышения производительности (как у Facebook/Instagram)

/**
 * ОПТИМИЗАЦИЯ: Throttling функция для ограничения частоты вызовов
 * Используется для scroll, resize, mousemove событий
 */
export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

/**
 * ОПТИМИЗАЦИЯ: Debouncing функция для отложенного выполнения
 * Используется для search input, API calls
 */
export const debounce = (func, delay) => {
  let timeoutId;
  
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
};

/**
 * ОПТИМИЗАЦИЯ: RequestAnimationFrame обертка для плавных анимаций
 * Заменяет setTimeout для анимаций
 */
export const rafThrottle = (func) => {
  let ticking = false;
  
  return function (...args) {
    if (!ticking) {
      requestAnimationFrame(() => {
        func.apply(this, args);
        ticking = false;
      });
      ticking = true;
    }
  };
};

/**
 * ОПТИМИЗАЦИЯ: Пакетная обработка DOM операций
 * Группирует множественные DOM изменения в один кадр
 */
export const batchDOMOperations = (operations) => {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      operations.forEach(operation => operation());
      resolve();
    });
  });
};

/**
 * ОПТИМИЗАЦИЯ: Intersection Observer для lazy loading
 * Более эффективная альтернатива scroll событиям
 */
export const createIntersectionObserver = (callback, options = {}) => {
  const defaultOptions = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1
  };
  
  const observerOptions = { ...defaultOptions, ...options };
  
  if ('IntersectionObserver' in window) {
    return new IntersectionObserver(callback, observerOptions);
  }
  
  // Fallback для старых браузеров
  return {
    observe: () => {},
    unobserve: () => {},
    disconnect: () => {}
  };
};

/**
 * ОПТИМИЗАЦИЯ: Мемоизация для тяжелых вычислений
 * Кеширует результаты функций
 */
export const memoize = (func, getKey = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  
  return function (...args) {
    const key = getKey(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = func.apply(this, args);
    cache.set(key, result);
    
    // Очистка кеша при превышении лимита
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  };
};

/**
 * ОПТИМИЗАЦИЯ: Виртуализация списков для больших данных
 * Рендерит только видимые элементы
 */
export const createVirtualList = (items, itemHeight, containerHeight) => {
  return {
    getVisibleItems: (scrollTop) => {
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(
        startIndex + Math.ceil(containerHeight / itemHeight) + 1,
        items.length
      );
      
      return {
        startIndex,
        endIndex,
        items: items.slice(startIndex, endIndex),
        totalHeight: items.length * itemHeight,
        offsetY: startIndex * itemHeight
      };
    }
  };
};

/**
 * ОПТИМИЗАЦИЯ: Мониторинг производительности
 * Отслеживает FPS, память, время отклика
 */
export class PerformanceMonitor {
  constructor() {
    this.fps = 0;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.isRunning = false;
  }
  
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.measureFPS();
    
    // Логируем статистику каждые 5 секунд
    this.intervalId = setInterval(() => {
      this.logPerformanceStats();
    }, 5000);
  }
  
  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
  
  measureFPS() {
    if (!this.isRunning) return;
    
    const currentTime = performance.now();
    this.frameCount++;
    
    if (currentTime >= this.lastTime + 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.frameCount = 0;
      this.lastTime = currentTime;
    }
    
    requestAnimationFrame(() => this.measureFPS());
  }
  
  logPerformanceStats() {
    const memoryInfo = performance.memory ? {
      usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576),
      totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576),
      jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
    } : null;
    
    // Логи удалены для production
  }
  
  getCurrentStats() {
    return {
      fps: this.fps,
      memory: performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576)
      } : null
    };
  }
}

/**
 * ОПТИМИЗАЦИЯ: Глобальный монитор производительности
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * ОПТИМИЗАЦИЯ: Утилиты для работы с изображениями
 */
export const imageUtils = {
  // Предзагрузка изображений
  preloadImage: (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  },
  
  // Ленивая загрузка изображений
  createLazyImageObserver: (callback) => {
    return createIntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback(entry.target);
        }
      });
    });
  }
};

/**
 * ОПТИМИЗАЦИЯ: Проверка поддержки современных API
 */
export const featureDetection = {
  supportsWebP: () => {
    const canvas = document.createElement('canvas');
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  },
  
  supportsIntersectionObserver: () => 'IntersectionObserver' in window,
  
  supportsRequestIdleCallback: () => 'requestIdleCallback' in window,
  
  supportsWebWorkers: () => 'Worker' in window,
  
  supportsWebAudio: () => 'AudioContext' in window || 'webkitAudioContext' in window
};

/**
 * ОПТИМИЗАЦИЯ: Отложенное выполнение задач
 */
export const scheduleIdleTask = (task) => {
  if ('requestIdleCallback' in window) {
    return requestIdleCallback(task);
  } else {
    return setTimeout(task, 0);
  }
};

/**
 * ОПТИМИЗАЦИЯ: Оптимизация событий для touch устройств
 */
export const optimizeTouch = (element, options = {}) => {
  const defaultOptions = {
    passive: true,
    capture: false
  };
  
  const opts = { ...defaultOptions, ...options };
  
  // Используем passive events для лучшей производительности скролла
  if (element && element.addEventListener) {
    const originalAddEventListener = element.addEventListener;
    element.addEventListener = function(type, listener, optionsOrCapture) {
      if (['touchstart', 'touchmove', 'wheel', 'scroll'].includes(type)) {
        optionsOrCapture = typeof optionsOrCapture === 'object' 
          ? { ...optionsOrCapture, passive: true }
          : { passive: true, capture: !!optionsOrCapture };
      }
      originalAddEventListener.call(this, type, listener, optionsOrCapture);
    };
  }
};

/**
 * ОПТИМИЗАЦИЯ: Начальная настройка производительности
 */
export const initPerformanceOptimizations = () => {
  // Запускаем мониторинг производительности только в development режиме
  if (import.meta.env.MODE === 'development') {
    performanceMonitor.start();
    
    // Глобальные функции для отладки
    window.getPerformanceStats = () => performanceMonitor.getCurrentStats();
    window.logPerformance = () => performanceMonitor.logPerformanceStats();
  }
  
  // Оптимизируем touch события для всего документа
  optimizeTouch(document);
  
  // Включаем аппаратное ускорение для body
  if (document.body) {
    document.body.style.transform = 'translateZ(0)';
    document.body.style.willChange = 'scroll-position';
  }
  
  // Оптимизации инициализированы
}; 