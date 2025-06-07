import React from 'react';
import { brandColors } from '../theme';
import { motion } from 'framer-motion';

const Logo = ({ size = 'medium', variant = 'full', className = '' }) => {
  const sizes = {
    small: { width: 120, height: 40, iconSize: 32, fontSize: '18px' },
    medium: { width: 160, height: 50, iconSize: 40, fontSize: '24px' },
    large: { width: 200, height: 60, iconSize: 48, fontSize: '30px' }
  };
  
  const currentSize = sizes[size];
  
  const LogoIcon = ({ size: iconSize }) => (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Внешнее кольцо с градиентом */}
        <circle
          cx="24"
          cy="24"
          r="23"
          fill="url(#outerGradient)"
          stroke="url(#strokeGradient)"
          strokeWidth="1.5"
        />
        
        {/* Внутренний круг */}
        <circle
          cx="24"
          cy="24"
          r="18"
          fill="url(#innerGradient)"
          opacity="0.9"
        />
        
        {/* Стетоскоп */}
        <g transform="translate(12, 8)">
          {/* Трубка стетоскопа */}
          <path
            d="M4 8 C4 4, 8 0, 12 0 C16 0, 20 4, 20 8 L20 16 C20 20, 16 24, 12 24"
            stroke="url(#tubeGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Левое ухо стетоскопа */}
          <circle
            cx="4"
            cy="8"
            r="3"
            fill="url(#earGradient)"
            stroke="#1E40AF"
            strokeWidth="1"
          />
          
          {/* Правое ухо стетоскопа */}
          <circle
            cx="20"
            cy="8"
            r="3"
            fill="url(#earGradient)"
            stroke="#1E40AF"
            strokeWidth="1"
          />
          
          {/* Головка стетоскопа */}
          <circle
            cx="12"
            cy="24"
            r="4"
            fill="url(#stethoscopeGradient)"
            stroke="#1E40AF"
            strokeWidth="1.5"
          />
          
          {/* Внутренний круг головки */}
          <circle
            cx="12"
            cy="24"
            r="2"
            fill="url(#headGradient)"
          />
        </g>
        
        {/* Градиенты */}
        <defs>
          <linearGradient id="outerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="35%" stopColor="#6366F1" />
            <stop offset="70%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#A855F7" />
          </linearGradient>
          
          <linearGradient id="innerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#C084FC" />
          </linearGradient>
          
          <linearGradient id="strokeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="50%" stopColor="#7C2D12" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          
          {/* Градиент для трубки стетоскопа */}
          <linearGradient id="tubeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
          
          {/* Градиент для ушей стетоскопа */}
          <radialGradient id="earGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#F3F4F6" />
            <stop offset="70%" stopColor="#E5E7EB" />
            <stop offset="100%" stopColor="#D1D5DB" />
          </radialGradient>
          
          {/* Градиент для головки стетоскопа */}
          <radialGradient id="stethoscopeGradient" cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="50%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </radialGradient>
          
          <radialGradient id="headGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F87171" />
            <stop offset="100%" stopColor="#EF4444" />
          </radialGradient>
        </defs>
      </svg>
    </motion.div>
  );
  
  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <LogoIcon size={currentSize.iconSize} />
      </div>
    );
  }
  
  return (
    <div 
      className={`inline-flex items-center space-x-3 ${className}`}
      style={{ width: currentSize.width, height: currentSize.height }}
    >
      <LogoIcon size={currentSize.iconSize} />
      
      {variant === 'full' && (
        <div className="flex flex-col leading-none">
          <motion.span 
            className="font-bold tracking-tight"
            style={{ 
              fontSize: currentSize.fontSize,
              background: `linear-gradient(135deg, #3B82F6, #8B5CF6, #A855F7)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
            whileHover={{
              backgroundImage: 'linear-gradient(135deg, #1E40AF, #7C3AED, #9333EA)'
            }}
            transition={{ duration: 0.3 }}
          >
            Soglom
          </motion.span>
          <span 
            className="text-xs font-medium opacity-75"
            style={{ 
              color: brandColors.primary[600],
              fontSize: `${parseInt(currentSize.fontSize) * 0.4}px`
            }}
          >
            Здоровье в приоритете
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo; 