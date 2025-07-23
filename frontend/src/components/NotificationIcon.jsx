import React from 'react';
import { motion } from 'framer-motion';

// Простой компонент для отображения иконки уведомления
// Чтобы избежать проблем с импортом Font Awesome
const NotificationIcon = ({ isAnimated, className }) => {
  // SVG иконка колокольчика
  const bellIcon = (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 448 512" 
      fill="currentColor" 
      width="24" 
      height="24"
      style={{ minWidth: '24px', minHeight: '24px' }}
      className={className}
    >
      <path d="M224 0c-17.7 0-32 14.3-32 32V51.2C119 66 64 130.6 64 208v18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416H416c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8V208c0-77.4-55-142-128-156.8V32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z"/>
    </svg>
  );

  if (isAnimated) {
    return (
      <motion.div
        initial={{ scale: 1 }}
        animate={{ 
          scale: [1, 1.2, 1],
          rotate: [0, 5, -5, 0] 
        }}
        transition={{ 
          duration: 0.5,
          repeat: 2,
          ease: "easeInOut"
        }}
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 448 512" 
          fill="#0070f3" 
          width="24" 
          height="24"
        >
          <path d="M224 0c-17.7 0-32 14.3-32 32V51.2C119 66 64 130.6 64 208v18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416H416c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8V208c0-77.4-55-142-128-156.8V32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z"/>
        </svg>
      </motion.div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 448 512" 
        fill="#666" 
        width="24" 
        height="24"
      >
        <path d="M224 0c-17.7 0-32 14.3-32 32V51.2C119 66 64 130.6 64 208v18.8c0 47-17.3 92.4-48.5 127.6l-7.4 8.3c-8.4 9.4-10.4 22.9-5.3 34.4S19.4 416 32 416H416c12.6 0 24-7.4 29.2-18.9s3.1-25-5.3-34.4l-7.4-8.3C401.3 319.2 384 273.9 384 226.8V208c0-77.4-55-142-128-156.8V32c0-17.7-14.3-32-32-32zm45.3 493.3c12-12 18.7-28.3 18.7-45.3H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7z"/>
      </svg>
    </div>
  );
};

export default NotificationIcon; 