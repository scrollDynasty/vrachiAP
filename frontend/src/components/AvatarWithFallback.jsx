import React, { useState, useEffect, forwardRef } from 'react';

/**
 * Компонент для отображения аватара с корректной обработкой URL
 * и запасным вариантом отображения, когда аватар недоступен
 */
const AvatarWithFallback = forwardRef(({ 
  src, 
  name, 
  size = "lg", 
  className = "w-24 h-24", 
  color = "primary", 
  isBordered = true,
  as = "div",
  ...props
}, ref) => {
  const [imageError, setImageError] = useState(!src);
  const [fullSrc, setFullSrc] = useState('');
  
  // Преобразуем размер в пиксели для использования в стилях
  const getSizeInPx = () => {
    switch(size) {
      case 'xs': return 20;
      case 'sm': return 24;
      case 'md': return 32;
      case 'lg': return 48;
      case 'xl': return 80; // Увеличенный размер
      default: return 48;
    }
  };
  
  useEffect(() => {
    if (!src) {
      setImageError(true);
      setFullSrc('');
      return;
    }
    
    setImageError(false);
    
    // Добавляем параметр nocache для обхода кеширования
    const noCacheParam = `?nocache=${Date.now()}`;
    
    // Формируем полный URL для изображения
    if (src.startsWith('/') && !src.startsWith('http')) {
      // Преобразуем относительный путь в абсолютный URL
              const newSrc = `https://healzy.uz${src}${noCacheParam}`;
      setFullSrc(newSrc);
    } else {
      // Если путь уже абсолютный, добавляем параметр nocache
      const newSrc = src.includes('?') ? `${src}&nocache=${Date.now()}` : `${src}${noCacheParam}`;
      setFullSrc(newSrc);
    }
  }, [src]);
  
  // Обработчик ошибки загрузки изображения
  const handleError = (e) => {
    setImageError(true);
  };
  
  // Получаем инициалы имени
  const getInitial = () => {
    if (!name) return "?";
    
    const names = name.split(' ');
    if (names.length === 1) return name.charAt(0).toUpperCase();
    
    return (names[0].charAt(0) + names[1].charAt(0)).toUpperCase();
  };
  
  // Получаем цвет фона
  const getBackgroundColor = () => {
    switch(color) {
      case 'primary': return '#0070F3';
      case 'secondary': return '#7828C8';
      case 'success': return '#17C964';
      case 'warning': return '#F5A524';
      case 'danger': return '#F31260';
      default: return '#0070F3';
    }
  };
  
  // Получаем размер в пикселях
  const sizeInPx = getSizeInPx();
  
  // Базовые стили для контейнера
  const containerStyles = {
    width: `${sizeInPx}px`,
    height: `${sizeInPx}px`,
    borderRadius: '50%', // Круглая форма
    border: isBordered ? `3px solid ${getBackgroundColor()}` : 'none', // Увеличиваю толщину рамки с 2px до 3px
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: getBackgroundColor(), // Всегда устанавливаем фоновый цвет
    padding: 0, // Убираем внутренние отступы
    ...props.style // Объединяем с переданными стилями
  };
  
  // Стили для заглушки (когда изображение отсутствует или ошибка загрузки)
  const fallbackStyles = {
    color: 'white',
    fontSize: `${sizeInPx / 2}px`,
    fontWeight: 600,
    lineHeight: 1,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: getBackgroundColor(),
    borderRadius: '50%', // Круглая форма для заглушки
  };
  
  // Стили для изображения
  const imgStyles = {
    width: '100%',
    height: '100%',
    objectFit: 'cover', // Масштабирует изображение с сохранением пропорций, обрезая лишнее
    display: 'block',
    borderRadius: '50%', // Круглая форма для изображения
    padding: 0, // Убираем внутренние отступы
    margin: 0, // Убираем внешние отступы
    minWidth: '100%', // Гарантируем, что изображение как минимум заполнит контейнер
    minHeight: '100%',
  };
  
  const Wrapper = as;
  
  // Проверяем наличие src и отсутствие ошибок загрузки
  const hasValidImage = !imageError && fullSrc;
  
  return (
    <Wrapper 
      style={containerStyles} 
      className={`${className} rounded-full overflow-hidden`}
      ref={ref} 
      {...props}
      data-testid="avatar-component"
    >
      {hasValidImage ? (
        <img 
          src={fullSrc}
          alt={`Аватар ${name || 'пользователя'}`}
          style={imgStyles}
          onError={handleError}
          width={sizeInPx}
          height={sizeInPx}
          className="rounded-full w-full h-full object-cover"
        />
      ) : (
        <div style={fallbackStyles} className="rounded-full"> {/* Добавляем класс Tailwind для округления */}
          {getInitial()}
        </div>
      )}
    </Wrapper>
  );
});

export default AvatarWithFallback; 