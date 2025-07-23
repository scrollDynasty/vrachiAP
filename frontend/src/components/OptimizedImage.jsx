import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

// ОПТИМИЗАЦИЯ: Компонент для оптимизированной загрузки изображений
const OptimizedImage = ({
  src,
  alt = '',
  width,
  height,
  className = '',
  style = {},
  lazy = true,
  placeholder = '/placeholder.png',
  fallback = '/fallback.png',
  quality = 80,
  format = 'auto', // 'auto', 'webp', 'jpeg', 'png'
  sizes = '100vw',
  onLoad,
  onError,
  enableAnimations = true,
  optimizeForMobile = false,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // ОПТИМИЗАЦИЯ: Определяем поддержку WebP
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  };

  // ОПТИМИЗАЦИЯ: Генерируем оптимизированный URL изображения
  const getOptimizedSrc = () => {
    if (!src) return placeholder;

    // ОПТИМИЗАЦИЯ: Добавляем параметры оптимизации
    const url = new URL(src, window.location.origin);
    
    if (width) url.searchParams.set('w', width);
    if (height) url.searchParams.set('h', height);
    if (quality) url.searchParams.set('q', quality);
    
    // ОПТИМИЗАЦИЯ: Автоматический выбор формата
    if (format === 'auto') {
      if (supportsWebP()) {
        url.searchParams.set('f', 'webp');
      } else {
        url.searchParams.set('f', 'jpeg');
      }
    } else {
      url.searchParams.set('f', format);
    }

    // ОПТИМИЗАЦИЯ: Добавляем параметры для мобильных устройств
    if (optimizeForMobile) {
      url.searchParams.set('mobile', '1');
    }

    return url.toString();
  };

  // ОПТИМИЗАЦИЯ: Intersection Observer для lazy loading
  useEffect(() => {
    if (!lazy || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: '50px 0px', // Загружаем за 50px до появления
        threshold: 0.1
      }
    );

    observer.observe(imgRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [lazy]);

  // ОПТИМИЗАЦИЯ: Обработчик загрузки изображения
  const handleLoad = (event) => {
    setIsLoaded(true);
    setHasError(false);
    if (onLoad) onLoad(event);
  };

  // ОПТИМИЗАЦИЯ: Обработчик ошибки загрузки
  const handleError = (event) => {
    setHasError(true);
    if (onError) onError(event);
  };

  // ОПТИМИЗАЦИЯ: Предзагрузка изображения
  useEffect(() => {
    if (isInView && src) {
      const img = new Image();
      img.src = getOptimizedSrc();
      img.onload = () => setIsLoaded(true);
      img.onerror = () => setHasError(true);
    }
  }, [isInView, src]);

  // ОПТИМИЗАЦИЯ: Стили для оптимизации
  const imageStyle = {
    width: width || 'auto',
    height: height || 'auto',
    objectFit: 'cover',
    willChange: 'opacity',
    transform: 'translateZ(0)',
    contain: 'layout style paint',
    ...style
  };

  // ОПТИМИЗАЦИЯ: Определяем источник изображения
  const imageSrc = hasError ? fallback : (isInView ? getOptimizedSrc() : placeholder);

  // ОПТИМИЗАЦИЯ: Рендер с анимациями
  if (enableAnimations && !optimizeForMobile) {
    return (
      <motion.div
        ref={imgRef}
        className={`optimized-image-container ${className}`}
        style={imageStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoaded ? 1 : 0.3 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        {...props}
      >
        <img
          src={imageSrc}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            willChange: 'opacity',
            transform: 'translateZ(0)'
          }}
          loading={lazy ? 'lazy' : 'eager'}
          sizes={sizes}
          onLoad={handleLoad}
          onError={handleError}
        />
      </motion.div>
    );
  }

  // ОПТИМИЗАЦИЯ: Рендер без анимаций для мобильных устройств
  return (
    <div
      ref={imgRef}
      className={`optimized-image-container ${className}`}
      style={imageStyle}
      {...props}
    >
      <img
        src={imageSrc}
        alt={alt}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: isLoaded ? 1 : 0.3,
          transition: 'opacity 0.3s ease-out',
          willChange: 'opacity',
          transform: 'translateZ(0)'
        }}
        loading={lazy ? 'lazy' : 'eager'}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};

// ОПТИМИЗАЦИЯ: HOC для создания оптимизированных изображений
export const withImageOptimization = (Component, options = {}) => {
  return React.memo(({ src, ...props }) => (
    <OptimizedImage
      src={src}
      {...options}
      {...props}
    />
  ));
};

// ОПТИМИЗАЦИЯ: Компонент для аватаров с оптимизациями
export const OptimizedAvatar = ({ src, size = 40, ...props }) => {
  return (
    <OptimizedImage
      src={src}
      width={size}
      height={size}
      className="rounded-full"
      placeholder="/default-avatar.png"
      fallback="/default-avatar.png"
      quality={70}
      format="webp"
      {...props}
    />
  );
};

// ОПТИМИЗАЦИЯ: Компонент для баннеров с оптимизациями
export const OptimizedBanner = ({ src, height = 200, ...props }) => {
  return (
    <OptimizedImage
      src={src}
      height={height}
      className="w-full"
      placeholder="/banner-placeholder.png"
      fallback="/banner-placeholder.png"
      quality={85}
      format="auto"
      sizes="100vw"
      {...props}
    />
  );
};

// ОПТИМИЗАЦИЯ: Компонент для галереи с оптимизациями
export const OptimizedGalleryImage = ({ src, ...props }) => {
  return (
    <OptimizedImage
      src={src}
      className="gallery-image"
      quality={90}
      format="webp"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      enableAnimations={false}
      {...props}
    />
  );
};

export default OptimizedImage; 