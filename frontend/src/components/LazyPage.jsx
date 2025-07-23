import React, { Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import MedicalLoader from './MedicalLoader';

// ОПТИМИЗАЦИЯ: Компонент для lazy loading страниц с оптимизациями
const LazyPage = ({ 
  component: Component, 
  fallback = <MedicalLoader />,
  preload = false,
  preloadDelay = 2000,
  onLoad,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPreloaded, setIsPreloaded] = useState(false);

  // ОПТИМИЗАЦИЯ: Предзагрузка компонента через заданное время
  useEffect(() => {
    if (preload && !isPreloaded) {
      const timer = setTimeout(() => {
        setIsPreloaded(true);
      }, preloadDelay);

      return () => clearTimeout(timer);
    }
  }, [preload, preloadDelay, isPreloaded]);

  // ОПТИМИЗАЦИЯ: Callback при загрузке
  useEffect(() => {
    if (isLoaded && onLoad) {
      onLoad();
    }
  }, [isLoaded, onLoad]);

  // ОПТИМИЗАЦИЯ: Оптимизированный fallback с GPU-ускорением
  const OptimizedFallback = () => (
    <motion.div
      className="flex items-center justify-center min-h-[400px]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        willChange: 'opacity',
        transform: 'translateZ(0)',
        contain: 'layout style paint'
      }}
    >
      {fallback}
    </motion.div>
  );

  // ОПТИМИЗАЦИЯ: Оптимизированный компонент с memo
  const OptimizedComponent = React.memo(({ componentProps }) => {
    useEffect(() => {
      setIsLoaded(true);
    }, []);

    return <Component {...componentProps} />;
  });

  return (
    <Suspense fallback={<OptimizedFallback />}>
      <OptimizedComponent componentProps={props} />
    </Suspense>
  );
};

// ОПТИМИЗАЦИЯ: HOC для создания lazy компонентов с оптимизациями
export const createLazyComponent = (importFn, options = {}) => {
  const LazyComponent = React.lazy(importFn);
  
  return React.memo((props) => (
    <LazyPage 
      component={LazyComponent} 
      {...options} 
      {...props} 
    />
  ));
};

// ОПТИМИЗАЦИЯ: Предзагрузчик для критических страниц
export const PreloadManager = () => {
  const [preloadedPages, setPreloadedPages] = useState(new Set());

  const preloadPage = (pageName, importFn) => {
    if (preloadedPages.has(pageName)) return;

    // ОПТИМИЗАЦИЯ: Используем requestIdleCallback для неблокирующей предзагрузки
    const preload = () => {
      importFn().then(() => {
        setPreloadedPages(prev => new Set([...prev, pageName]));
      }).catch(() => {
        // Игнорируем ошибки предзагрузки
      });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload, { timeout: 5000 });
    } else {
      setTimeout(preload, 1000);
    }
  };

  return { preloadPage, preloadedPages };
};

export default LazyPage; 