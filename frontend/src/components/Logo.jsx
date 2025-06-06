import React from 'react';
import { brandColors } from '../theme';

const Logo = ({ size = 'medium', variant = 'full', className = '' }) => {
  const sizes = {
    small: { width: 120, height: 40, iconSize: 32, fontSize: '18px' },
    medium: { width: 160, height: 50, iconSize: 40, fontSize: '24px' },
    large: { width: 200, height: 60, iconSize: 48, fontSize: '30px' }
  };
  
  const currentSize = sizes[size];
  
  const LogoIcon = ({ size: iconSize }) => (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Медицинский крест в центре */}
      <circle
        cx="24"
        cy="24"
        r="22"
        fill="url(#gradient1)"
        stroke={brandColors.primary[600]}
        strokeWidth="2"
      />
      
      {/* Крест */}
      <rect
        x="21"
        y="12"
        width="6"
        height="24"
        rx="2"
        fill="white"
      />
      <rect
        x="12"
        y="21"
        width="24"
        height="6"
        rx="2"
        fill="white"
      />
      
      {/* Сердцебиение линия */}
      <path
        d="M8 24h4l2-6 4 12 2-6h4"
        stroke={brandColors.secondary[500]}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.8"
      />
      
      {/* Градиенты */}
      <defs>
        <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={brandColors.primary[500]} />
          <stop offset="50%" stopColor={brandColors.primary[600]} />
          <stop offset="100%" stopColor={brandColors.secondary[500]} />
        </linearGradient>
      </defs>
    </svg>
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
          <span 
            className="font-bold tracking-tight"
            style={{ 
              fontSize: currentSize.fontSize,
              background: `linear-gradient(135deg, ${brandColors.primary[600]}, ${brandColors.secondary[500]})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            Soglom
          </span>
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