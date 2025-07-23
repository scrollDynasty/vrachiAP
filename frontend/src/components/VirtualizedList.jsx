import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

// ОПТИМИЗАЦИЯ: Компонент для виртуализации больших списков
const VirtualizedList = ({
  items = [],
  itemHeight = 60,
  containerHeight = 400,
  overscan = 5, // Количество элементов для предзагрузки
  renderItem,
  onScroll,
  className = '',
  style = {},
  enableAnimations = true,
  optimizeForMobile = false,
  ...props
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState(null);
  const scrollTimeoutRef = useRef(null);
  const lastScrollTopRef = useRef(0);

  // ОПТИМИЗАЦИЯ: Вычисляем видимые элементы с useMemo
  const visibleItems = useMemo(() => {
    if (!items.length) return { items: [], startIndex: 0, endIndex: 0 };

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );

    return {
      items: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);

  // ОПТИМИЗАЦИЯ: Обработчик скролла с throttling
  const handleScroll = useCallback((event) => {
    const newScrollTop = event.target.scrollTop;
    
    // ОПТИМИЗАЦИЯ: Используем requestAnimationFrame для плавного обновления
    if (scrollTimeoutRef.current) {
      cancelAnimationFrame(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = requestAnimationFrame(() => {
      setScrollTop(newScrollTop);
      
      if (onScroll) {
        onScroll(event);
      }
    });

    lastScrollTopRef.current = newScrollTop;
  }, [onScroll]);

  // ОПТИМИЗАЦИЯ: Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        cancelAnimationFrame(scrollTimeoutRef.current);
      }
    };
  }, []);

  // ОПТИМИЗАЦИЯ: Оптимизированный рендер элемента
  const renderOptimizedItem = useCallback((item, index, actualIndex) => {
    const itemStyle = {
      height: itemHeight,
      position: 'absolute',
      top: actualIndex * itemHeight,
      left: 0,
      right: 0,
      willChange: 'transform',
      transform: 'translateZ(0)',
      contain: 'layout style paint'
    };

    const content = renderItem(item, actualIndex);

    if (enableAnimations && !optimizeForMobile) {
      return (
        <motion.div
          key={actualIndex}
          style={itemStyle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          {content}
        </motion.div>
      );
    }

    return (
      <div key={actualIndex} style={itemStyle}>
        {content}
      </div>
    );
  }, [itemHeight, renderItem, enableAnimations, optimizeForMobile]);

  // ОПТИМИЗАЦИЯ: Контейнер с GPU-ускорением
  const containerStyle = {
    height: containerHeight,
    overflow: 'auto',
    position: 'relative',
    willChange: 'scroll-position',
    transform: 'translateZ(0)',
    contain: 'layout style paint',
    ...style
  };

  // ОПТИМИЗАЦИЯ: Внутренний контейнер для правильного скролла
  const innerStyle = {
    height: visibleItems.totalHeight,
    position: 'relative',
    willChange: 'transform',
    transform: 'translateZ(0)'
  };

  return (
    <div
      ref={setContainerRef}
      className={`virtualized-list ${className}`}
      style={containerStyle}
      onScroll={handleScroll}
      {...props}
    >
      <div style={innerStyle}>
        {visibleItems.items.map((item, index) => 
          renderOptimizedItem(item, index, visibleItems.startIndex + index)
        )}
      </div>
    </div>
  );
};

// ОПТИМИЗАЦИЯ: HOC для создания виртуализированных компонентов
export const withVirtualization = (Component, options = {}) => {
  return React.memo(({ items, ...props }) => {
    const virtualizedProps = {
      items,
      itemHeight: options.itemHeight || 60,
      containerHeight: options.containerHeight || 400,
      overscan: options.overscan || 5,
      renderItem: options.renderItem || ((item) => <Component {...item} {...props} />),
      enableAnimations: options.enableAnimations !== false,
      optimizeForMobile: options.optimizeForMobile || false
    };

    return <VirtualizedList {...virtualizedProps} />;
  });
};

// ОПТИМИЗАЦИЯ: Хук для автоматического определения размеров элементов
export const useVirtualizationConfig = (items, options = {}) => {
  const [itemHeight, setItemHeight] = useState(options.defaultItemHeight || 60);
  const [containerHeight, setContainerHeight] = useState(options.defaultContainerHeight || 400);
  const containerRef = useRef(null);

  // ОПТИМИЗАЦИЯ: Автоматическое определение высоты контейнера
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerHeight(entry.contentRect.height);
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  // ОПТИМИЗАЦИЯ: Автоматическое определение высоты элементов
  useEffect(() => {
    if (containerRef.current && items.length > 0) {
      const firstItem = containerRef.current.querySelector('[data-virtualized-item]');
      if (firstItem) {
        const height = firstItem.getBoundingClientRect().height;
        if (height > 0 && height !== itemHeight) {
          setItemHeight(height);
        }
      }
    }
  }, [items, itemHeight]);

  return {
    containerRef,
    itemHeight,
    containerHeight,
    config: {
      itemHeight,
      containerHeight,
      overscan: options.overscan || 5,
      enableAnimations: options.enableAnimations !== false,
      optimizeForMobile: options.optimizeForMobile || false
    }
  };
};

// ОПТИМИЗАЦИЯ: Компонент для автоматической виртуализации
export const AutoVirtualizedList = ({ items, renderItem, options = {}, ...props }) => {
  const { containerRef, config } = useVirtualizationConfig(items, options);

  return (
    <div ref={containerRef} style={{ height: '100%', ...props.style }}>
      <VirtualizedList
        items={items}
        renderItem={renderItem}
        {...config}
        {...props}
      />
    </div>
  );
};

export default VirtualizedList; 