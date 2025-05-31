import React from 'react';
import { motion } from 'framer-motion';

// Компонент анимации загрузки в медицинском стиле с красным плюсом
function MedicalLoader({ text = "Загрузка...", size = "large", color = "#ef4444" }) {
  // Определяем размеры в зависимости от переданного параметра
  const sizes = {
    small: {
      container: "w-8 h-8",
      plus: "w-8 h-8",
      fontSize: "text-xs",
      strokeWidth: 6
    },
    medium: {
      container: "w-12 h-12",
      plus: "w-12 h-12",
      fontSize: "text-sm",
      strokeWidth: 5
    },
    large: {
      container: "w-20 h-20",
      plus: "w-20 h-20",
      fontSize: "text-base",
      strokeWidth: 4
    }
  };

  const currentSize = sizes[size] || sizes.large;
  
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`relative ${currentSize.container} mb-4`}>
        {/* Круг с пульсацией */}
        <motion.div 
          className="absolute inset-0 rounded-full bg-red-500/10"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Второй круг с другой анимацией */}
        <motion.div 
          className="absolute inset-0 rounded-full bg-red-500/5"
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.2
          }}
        />
        
        {/* Белый круг-основа */}
        <div className="absolute inset-0 rounded-full bg-white shadow-lg"></div>
        
        {/* Красный плюс с анимацией вращения */}
        <motion.div 
          className={`absolute inset-0 ${currentSize.plus}`}
          animate={{ rotate: [0, 360] }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path 
              d="M50 15 L50 85 M15 50 L85 50" 
              stroke={color} 
              strokeWidth={currentSize.strokeWidth} 
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ 
                pathLength: 1,
                opacity: 1
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                repeatType: "loop",
                repeatDelay: 1
              }}
            />
          </svg>
        </motion.div>
        
        {/* Декоративные элементы - медицинские кружочки */}
        <motion.div 
          className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"
          animate={{ 
            scale: [1, 1.2, 1],
            y: [0, -3, 0]
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        />
        
        <motion.div 
          className="absolute -bottom-1 -left-1 w-3 h-3 bg-green-500 rounded-full"
          animate={{ 
            scale: [1, 1.2, 1],
            y: [0, 3, 0]
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            repeatType: "reverse",
            delay: 0.3
          }}
        />
      </div>
      
      {/* Текст под анимацией */}
      <motion.p 
        className={`${currentSize.fontSize} text-gray-700 font-medium`}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {text}
      </motion.p>
      
      {/* Тонкая пульсирующая линия под текстом */}
      <motion.div 
        className="h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent mt-1 rounded-full"
        style={{ width: text.length * 8 + 'px' }}
        animate={{ 
          scaleX: [0.7, 1, 0.7],
          opacity: [0.3, 0.7, 0.3]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </div>
  );
}

export default MedicalLoader; 