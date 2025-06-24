import React from 'react';
import { motion } from 'framer-motion';

// Цвета бренда Healzy - синие тона
const brandColors = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Основной цвет
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e'
  },
  secondary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6', // Вторичный синий цвет
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a'
  }
};

const Logo = ({ 
  size = 'medium', 
  variant = 'full', 
  className = '',
  animate = true 
}) => {
  // Размеры для разных вариантов
  const sizes = {
    small: {
      width: '120px',
      height: '40px',
      logoSize: '32px',
      fontSize: '18px'
    },
    medium: {
      width: '160px',
      height: '50px',
      logoSize: '48px',
      fontSize: '24px'
    },
    large: {
      width: '240px',
      height: '80px',
      logoSize: '64px',
      fontSize: '32px'
    },
    xlarge: {
      width: '320px',
      height: '120px',
      logoSize: '96px',
      fontSize: '40px'
    }
  };

  const currentSize = sizes[size] || sizes.medium;

  // Компонент логотипа Healzy
  const HealzyLogo = ({ size: logoSize }) => (
    <motion.div
      className="flex items-center justify-center"
      whileHover={animate ? { scale: 1.05 } : {}}
      whileTap={animate ? { scale: 0.95 } : {}}
      transition={{ duration: 0.2 }}
      style={{ width: logoSize, height: logoSize }}
    >
      <img 
        src="/healzy.png?v=2" 
        alt="Healzy Logo" 
        style={{ 
          width: logoSize, 
          height: logoSize,
          objectFit: 'contain'
        }}
      />
    </motion.div>
  );
  
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <HealzyLogo size={currentSize.logoSize} />
      </div>
    );
  }
  
  return (
    <div 
      className={`inline-flex items-center space-x-3 ${className}`}
      style={{ width: currentSize.width, height: currentSize.height }}
    >
      <HealzyLogo size={currentSize.logoSize} />
      
      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <motion.span 
            className="font-bold tracking-tight"
            style={{ 
              fontSize: currentSize.fontSize,
              background: `linear-gradient(135deg, ${brandColors.primary[500]}, ${brandColors.secondary[500]})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
            transition={{ duration: 0.3 }}
          >
            HEALZY
          </motion.span>
        </div>
      )}
    </div>
  );
};

export default Logo; 