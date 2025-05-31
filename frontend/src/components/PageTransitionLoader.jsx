import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MedicalLoader from './MedicalLoader';
import { useLocation } from 'react-router-dom';

/**
 * Компонент для отображения плавной анимации загрузки:
 * 1. При инициализации авторизации
 * 2. При переходе на страницы логин/регистрация
 * 3. Если загрузка любой страницы занимает больше 1.5 секунды
 */
function PageTransitionLoader({ isAuthLoading = false }) {
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const location = useLocation();
  const longLoadTimerRef = useRef(null);
  
  // Определяем, является ли текущая страница страницей авторизации
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  
  // При изменении маршрута показываем загрузку
  useEffect(() => {
    let timer;
    
    // Начинаем анимацию загрузки только для авторизационных страниц сразу,
    // для остальных страниц - только если загрузка долгая
    setIsPageLoading(true);
    
    // Для страниц авторизации или если идет загрузка авторизации - показываем лоадер сразу
    if (isAuthPage || isAuthLoading) {
      setShowLoader(true);
    } else {
      // Для остальных страниц - показываем лоадер только если загрузка занимает больше 1.5 секунды
      setShowLoader(false);
      
      // Установка таймера для отображения лоадера при долгой загрузке
      longLoadTimerRef.current = setTimeout(() => {
        if (isPageLoading) {
          setShowLoader(true);
        }
      }, 1500); // 1.5 секунды
    }
    
    // Скрываем через 1000ms (общее время перехода)
    timer = setTimeout(() => {
      setIsPageLoading(false);
      setShowLoader(false);
    }, 1000);
    
    return () => {
      clearTimeout(timer);
      if (longLoadTimerRef.current) {
        clearTimeout(longLoadTimerRef.current);
      }
    };
  }, [location.pathname, isAuthPage, isAuthLoading]);
  
  // Определяем, нужно ли показывать лоадер
  const shouldShowLoader = isAuthLoading || (isPageLoading && showLoader);
  
  // Определяем текст лоадера в зависимости от типа загрузки
  const loaderText = isAuthLoading 
    ? "Загрузка приложения" 
    : isAuthPage 
      ? "Вход в систему" 
      : "Загрузка страницы";
  
  return (
    <AnimatePresence mode="wait">
      {shouldShowLoader && (
        <motion.div 
          className="fixed inset-0 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Фоновый градиент с размытием и анимацией */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-white/90 to-indigo-50/90 backdrop-filter"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Анимированные декоративные круги */}
          <motion.div 
            className="absolute w-64 h-64 rounded-full bg-red-500/5"
            style={{ top: '30%', right: '15%' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              opacity: [0, 0.7, 0.5],
              rotate: [0, 45]
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          
          <motion.div 
            className="absolute w-40 h-40 rounded-full bg-blue-500/5"
            style={{ bottom: '20%', left: '10%' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [0, 1.2, 1],
              opacity: [0, 0.7, 0.5],
              rotate: [0, -30]
            }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          />
          
          {/* Медицинский лоадер */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10"
          >
            <MedicalLoader text={loaderText} size="large" />
          </motion.div>
          
          {/* Пульсирующий фоновый круг за лоадером */}
          <motion.div 
            className="absolute z-5 w-40 h-40 rounded-full bg-white shadow-lg"
            animate={{ 
              boxShadow: [
                '0 0 0 0 rgba(255,255,255,0)', 
                '0 0 0 20px rgba(255,255,255,0.3)', 
                '0 0 0 40px rgba(255,255,255,0)'
              ],
              scale: [0.95, 1.05, 0.95]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut" 
            }}
          />
          
          {/* Анимированные медицинские иконки */}
          <motion.div 
            className="absolute top-[35%] right-[25%] text-blue-500 opacity-40"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 0.4, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0ZM4.756 4.566c.763-1.424 4.02-.12.952 3.434-4.496-1.596-2.35-4.298-.952-3.434Zm6.559 5.448a.5.5 0 0 1 .548.736A4.498 4.498 0 0 1 7.965 13a4.498 4.498 0 0 1-3.898-2.25.5.5 0 0 1 .548-.736h.005l.017.005.067.015.252.055c.215.046.515.108.857.169.693.124 1.522.242 2.152.242.63 0 1.46-.118 2.152-.242a26.58 26.58 0 0 0 1.109-.224l.067-.015.017-.004.005-.002ZM4.756 4.566c.763-1.424 4.02-.12.952 3.434-4.496-1.596-2.35-4.298-.952-3.434Zm6.559 5.448a.5.5 0 0 1 .548.736A4.498 4.498 0 0 1 7.965 13a4.498 4.498 0 0 1-3.898-2.25.5.5 0 0 1 .548-.736h.005l.017.005.067.015.252.055c.215.046.515.108.857.169.693.124 1.522.242 2.152.242.63 0 1.46-.118 2.152-.242a26.58 26.58 0 0 0 1.109-.224l.067-.015.017-.004.005-.002Z"/>
            </svg>
          </motion.div>
          
          <motion.div 
            className="absolute bottom-[40%] left-[20%] text-green-500 opacity-40"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 0.4, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 16 16">
              <path d="M8 16a6 6 0 0 0 6-6c0-1.655-1.122-2.904-2.432-4.362C10.254 4.176 8.75 2.503 8 0c0 0-6 5.686-6 10a6 6 0 0 0 6 6ZM6.646 4.646l.708.708c-.29.29-.444.696-.444 1.122 0 .426.155.832.444 1.122l-.708.708c-.363-.363-.556-.828-.556-1.296V8L5.5 8a.5.5 0 0 1 0-1H6v-.293c0-.465.193-.926.553-1.297l.093-.093ZM9 10.646A2.646 2.646 0 0 1 11.646 8a.5.5 0 0 1 1 0A3.646 3.646 0 0 0 9 11.646a.5.5 0 0 1 0-1Z"/>
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default PageTransitionLoader; 