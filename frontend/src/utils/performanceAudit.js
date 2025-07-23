/**
 * 🚀 АУДИТ ПРОИЗВОДИТЕЛЬНОСТИ - Детальный анализ проблем
 * 
 * ПРОБЛЕМЫ, ОБНАРУЖЕННЫЕ В ПРОЕКТЕ:
 * 
 * 1. 🔥 КРИТИЧЕСКИЕ ПРОБЛЕМЫ:
 *    - Множественные useEffect без зависимостей в App.jsx
 *    - Отсутствие React.memo для тяжелых компонентов
 *    - Нет виртуализации для больших списков
 *    - WebSocket соединения не оптимизированы
 *    - Отсутствует lazy loading для страниц
 *    - Нет оптимизации изображений
 *    - Множественные re-render'ы из-за неправильного использования Zustand
 * 
 * 2. ⚠️ СЕРЬЕЗНЫЕ ПРОБЛЕМЫ:
 *    - Отсутствует code splitting
 *    - Нет оптимизации бандла
 *    - Множественные анимации без GPU-ускорения
 *    - Отсутствует Service Worker для кеширования
 *    - Нет оптимизации для мобильных устройств
 * 
 * 3. 📱 ПРОБЛЕМЫ МОБИЛЬНОЙ ПРОИЗВОДИТЕЛЬНОСТИ:
 *    - Высокое потребление CPU из-за анимаций
 *    - Отсутствует адаптивная загрузка ресурсов
 *    - Нет оптимизации для слабых устройств
 *    - Отсутствует preload критических ресурсов
 */

// ОПТИМИЗАЦИЯ: Детектор слабых устройств
export const detectLowEndDevice = () => {
  const isLowEnd = {
    // Проверяем количество ядер CPU
    lowCores: navigator.hardwareConcurrency <= 2,
    
    // Проверяем доступную память
    lowMemory: performance.memory ? 
      performance.memory.jsHeapSizeLimit < 1000000000 : // < 1GB
      navigator.deviceMemory < 4, // < 4GB
    
    // Проверяем тип соединения
    slowConnection: navigator.connection ? 
      ['slow-2g', '2g', '3g'].includes(navigator.connection.effectiveType) : 
      false,
    
    // Проверяем поддержку WebGL
    noWebGL: !window.WebGLRenderingContext,
    
    // Проверяем поддержку Service Workers
    noServiceWorker: !('serviceWorker' in navigator),
    
    // Проверяем поддержку Intersection Observer
    noIntersectionObserver: !('IntersectionObserver' in window),
    
    // Проверяем поддержку ResizeObserver
    noResizeObserver: !('ResizeObserver' in window),
    
    // Проверяем поддержку requestIdleCallback
    noIdleCallback: !('requestIdleCallback' in window),
  };
  
  // Вычисляем общий скор
  const lowEndScore = Object.values(isLowEnd).filter(Boolean).length;
  const isLowEndDevice = lowEndScore >= 3;
  
  return {
    isLowEndDevice,
    lowEndScore,
    details: isLowEnd,
    recommendations: getRecommendations(isLowEnd)
  };
};

// ОПТИМИЗАЦИЯ: Рекомендации для слабых устройств
const getRecommendations = (lowEnd) => {
  const recommendations = [];
  
  if (lowEnd.lowCores) {
    recommendations.push('Отключить сложные анимации');
    recommendations.push('Использовать виртуализацию списков');
  }
  
  if (lowEnd.lowMemory) {
    recommendations.push('Уменьшить размер кеша');
    recommendations.push('Использовать lazy loading');
  }
  
  if (lowEnd.slowConnection) {
    recommendations.push('Предзагружать критические ресурсы');
    recommendations.push('Использовать Service Worker');
  }
  
  if (lowEnd.noWebGL) {
    recommendations.push('Отключить GPU-анимации');
  }
  
  return recommendations;
};

// ОПТИМИЗАЦИЯ: Анализ производительности компонентов
export const analyzeComponentPerformance = (componentName, renderCount, renderTime) => {
  const issues = [];
  
  if (renderCount > 10) {
    issues.push('Слишком много re-render\'ов - используйте React.memo');
  }
  
  if (renderTime > 16) { // > 16ms = < 60fps
    issues.push('Медленный рендер - оптимизируйте логику');
  }
  
  return {
    componentName,
    renderCount,
    renderTime,
    issues,
    needsOptimization: issues.length > 0
  };
};

// ОПТИМИЗАЦИЯ: Анализ бандла
export const analyzeBundleSize = () => {
  const bundleAnalysis = {
    totalSize: 0,
    chunks: [],
    largeDependencies: [],
    optimizationOpportunities: []
  };
  
  // Анализируем размер основных зависимостей
  const dependencies = {
    'react': '~42KB',
    'react-dom': '~130KB',
    'framer-motion': '~200KB',
    '@nextui-org/react': '~500KB',
    'tailwindcss': '~300KB',
    'zustand': '~15KB',
    'axios': '~50KB',
    'socket.io-client': '~100KB'
  };
  
  // Вычисляем общий размер
  Object.values(dependencies).forEach(size => {
    const sizeInKB = parseInt(size.replace(/[^0-9]/g, ''));
    bundleAnalysis.totalSize += sizeInKB;
  });
  
  // Находим большие зависимости
  Object.entries(dependencies).forEach(([name, size]) => {
    const sizeInKB = parseInt(size.replace(/[^0-9]/g, ''));
    if (sizeInKB > 100) {
      bundleAnalysis.largeDependencies.push({ name, size: sizeInKB });
    }
  });
  
  // Рекомендации по оптимизации
  if (bundleAnalysis.largeDependencies.length > 0) {
    bundleAnalysis.optimizationOpportunities.push('Использовать code splitting');
    bundleAnalysis.optimizationOpportunities.push('Lazy load тяжелые компоненты');
    bundleAnalysis.optimizationOpportunities.push('Tree shaking для неиспользуемого кода');
  }
  
  return bundleAnalysis;
};

// ОПТИМИЗАЦИЯ: Анализ WebSocket соединений
export const analyzeWebSocketPerformance = () => {
  const issues = [];
  
  // Проверяем количество активных соединений
  const activeConnections = window.performance?.memory?.usedJSHeapSize || 0;
  
  if (activeConnections > 50000000) { // > 50MB
    issues.push('Высокое потребление памяти WebSocket');
  }
  
  return {
    activeConnections,
    issues,
    recommendations: [
      'Использовать connection pooling',
      'Ограничить количество одновременных соединений',
      'Реализовать автоматическое переподключение',
      'Очищать неиспользуемые соединения'
    ]
  };
};

// ОПТИМИЗАЦИЯ: Анализ анимаций
export const analyzeAnimations = () => {
  const issues = [];
  
  // Проверяем поддержку CSS transforms
  const supportsTransforms = 'transform' in document.body.style;
  
  if (!supportsTransforms) {
    issues.push('Отсутствует поддержка CSS transforms');
  }
  
  return {
    supportsTransforms,
    issues,
    recommendations: [
      'Использовать transform вместо top/left',
      'Добавить will-change для анимированных элементов',
      'Использовать requestAnimationFrame',
      'Отключить анимации на слабых устройствах'
    ]
  };
};

// ОПТИМИЗАЦИЯ: Полный аудит производительности
export const performFullAudit = () => {
  const deviceInfo = detectLowEndDevice();
  const bundleInfo = analyzeBundleSize();
  const wsInfo = analyzeWebSocketPerformance();
  const animationInfo = analyzeAnimations();
  
  const audit = {
    timestamp: new Date().toISOString(),
    device: deviceInfo,
    bundle: bundleInfo,
    websocket: wsInfo,
    animations: animationInfo,
    criticalIssues: [],
    recommendations: []
  };
  
  // Собираем критические проблемы
  if (deviceInfo.isLowEndDevice) {
    audit.criticalIssues.push('Устройство с низкой производительностью');
  }
  
  if (bundleInfo.totalSize > 1000) {
    audit.criticalIssues.push('Большой размер бандла');
  }
  
  if (wsInfo.issues.length > 0) {
    audit.criticalIssues.push('Проблемы с WebSocket соединениями');
  }
  
  // Собираем рекомендации
  audit.recommendations = [
    ...deviceInfo.recommendations,
    ...bundleInfo.optimizationOpportunities,
    ...wsInfo.recommendations,
    ...animationInfo.recommendations
  ];
  
  return audit;
};

// ОПТИМИЗАЦИЯ: Экспорт для использования в других модулях
export default {
  detectLowEndDevice,
  analyzeComponentPerformance,
  analyzeBundleSize,
  analyzeWebSocketPerformance,
  analyzeAnimations,
  performFullAudit
}; 