import React from 'react';
import { motion } from 'framer-motion';

const MedicalLoader = ({ size = 'medium', message = 'Загрузка...', fullScreen = false }) => {
  const sizes = {
    small: { container: 'w-24 h-24', heart: 'w-8 h-8', pulse: 'w-16 h-16', text: 'text-sm' },
    medium: { container: 'w-32 h-32', heart: 'w-12 h-12', pulse: 'w-24 h-24', text: 'text-base' },
    large: { container: 'w-40 h-40', heart: 'w-16 h-16', pulse: 'w-32 h-32', text: 'text-lg' }
  };
  
  const currentSize = sizes[size];
  
  const LoaderContent = () => (
    <div className="flex flex-col items-center justify-center space-y-6">
      {/* Медицинский крест с пульсирующими кольцами */}
      <div className={`relative ${currentSize.container} flex items-center justify-center`}>
        {/* Внешнее пульсирующее кольцо */}
        <motion.div 
          className={`absolute ${currentSize.pulse} rounded-full border-2 border-blue-300`}
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [1, 0.3, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Среднее пульсирующее кольцо */}
        <motion.div 
          className={`absolute w-20 h-20 rounded-full border-2 border-indigo-400`}
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.8, 0.2, 0.8]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.3
          }}
        />
        
        {/* Внутреннее пульсирующее кольцо */}
        <motion.div 
          className={`absolute w-16 h-16 rounded-full border-2 border-blue-500`}
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.1, 0.6]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.6
          }}
        />
        
        {/* Центральный медицинский крест */}
        <motion.div 
          className="relative z-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-3 shadow-lg"
          animate={{ 
            rotate: [0, 360],
            scale: [1, 1.05, 1]
          }}
          transition={{
            rotate: { duration: 8, repeat: Infinity, ease: "linear" },
            scale: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          <svg className={`${currentSize.heart} text-white`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C12.5523 2 13 2.44772 13 3V11H21C21.5523 11 22 11.4477 22 12C22 12.5523 21.5523 13 21 13H13V21C13 21.5523 12.5523 22 12 22C11.4477 22 11 21.5523 11 21V13H3C2.44772 13 2 12.5523 2 12C2 11.4477 2.44772 11 3 11H11V3C11 2.44772 11.4477 2 12 2Z"/>
          </svg>
        </motion.div>
        
        {/* Плавающие медицинские иконки */}
        {[...Array(4)].map((_, index) => (
          <motion.div
            key={index}
            className="absolute"
            animate={{
              x: [0, 15, -15, 0],
              y: [0, -15, 15, 0],
              rotate: [0, 180, 360]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              delay: index * 0.5,
              ease: "easeInOut"
            }}
            style={{
              left: `${50 + 25 * Math.cos((index * Math.PI) / 2)}%`,
              top: `${50 + 25 * Math.sin((index * Math.PI) / 2)}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="w-4 h-4 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full opacity-60"></div>
          </motion.div>
        ))}
      </div>
      
      {/* Пульсирующая ЭКГ линия */}
      <div className="w-32 h-8 relative overflow-hidden">
        <svg width="128" height="32" viewBox="0 0 128 32" className="absolute inset-0">
          <motion.path
            d="M0 16 L20 16 L25 8 L30 24 L35 8 L40 16 L60 16 L65 4 L70 28 L75 16 L95 16 L100 8 L105 24 L110 8 L115 16 L128 16"
            stroke="url(#ecgGradient)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          <defs>
            <linearGradient id="ecgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3B82F6" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#8B5CF6" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Загрузочный текст */}
      <motion.div 
        className="text-center space-y-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <motion.p 
          className={`font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent ${currentSize.text}`}
          animate={{ opacity: [1, 0.7, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {message}
        </motion.p>
        
        {/* Медицинские точки загрузки */}
        <div className="flex space-x-2 justify-center">
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-sm"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: index * 0.2
              }}
            />
          ))}
        </div>
        
        {/* Подпись */}
        <motion.p 
          className="text-xs text-gray-500 font-medium"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
                            Healzy
        </motion.p>
      </motion.div>
    </div>
  );
  
  if (fullScreen) {
    return (
      <motion.div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <LoaderContent />
      </motion.div>
    );
  }
  
  return <LoaderContent />;
};

// Компактный пульсирующий сердечко для медицинского контекста
export const HeartbeatLoader = ({ className = '' }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <motion.div
      animate={{
        scale: [1, 1.2, 1],
      }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    >
      <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </motion.div>
  </div>
);

// Простой спиннер для маленьких контекстов
export const SimpleSpinner = ({ size = 'medium', color = '#3B82F6' }) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8'
  };
  
  return (
    <motion.div 
      className={`rounded-full border-2 border-gray-200 ${sizeClasses[size]}`}
      style={{ 
        borderTopColor: color, 
        borderRightColor: color 
      }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );
};

export default MedicalLoader; 