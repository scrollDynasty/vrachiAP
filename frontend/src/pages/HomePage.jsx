// frontend/src/pages/HomePage.jsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Chip, ScrollShadow, Input, NextUIProvider, CardHeader, Skeleton, Avatar } from '@nextui-org/react';
import useAuthStore from '../stores/authStore';
import GoogleProfileForm from '../components/GoogleProfileForm';
import { ApplicationStatusTracker } from '../components/Notification';
import { motion } from 'framer-motion';
import { useTranslation } from '../components/LanguageSelector';
import OfflineMode from '../components/OfflineMode';
import api from '../api';
import { doctorsApi } from '../api';
import { Search, Calendar, Clock, ArrowRight, ChevronLeft, ChevronRight, Heart, Shield, Users, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MedicalLoader from '../components/MedicalLoader';

function HomePage() {
  const { t, currentLanguage } = useTranslation();
  const user = useAuthStore(state => state.user);
  const needsProfileUpdate = useAuthStore(state => state.needsProfileUpdate);
  const token = useAuthStore(state => state.token);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const navigate = useNavigate();
  const authError = useAuthStore(state => state.error);
  
  // Состояние для отслеживания режима offline
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  
  // Состояние для новостей
  const [healthNews, setHealthNews] = useState([]);
  const [translatedNews, setTranslatedNews] = useState([]);
  const [loadingNews, setLoadingNews] = useState(true);
  
  // Состояние для поиска
  const [searchQuery, setSearchQuery] = useState('');
  
  // Состояние для карусели специалистов
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  // Состояние для статистики врачей
  const [doctorStats, setDoctorStats] = useState({});
  const [loadingStats, setLoadingStats] = useState(true);
  
  // Перенаправляем на страницу логина, если есть ошибка аутентификации
  useEffect(() => {
    if (authError) {
      navigate('/login');
    }
  }, [authError, navigate]);
  
  // Проверяем состояние пользователя и режим offline
  useEffect(() => {
    // Проверяем, получили ли мы HTML вместо данных пользователя (признак недоступности backend)
    if (user && typeof user === 'string' && user.includes('<!doctype html>')) {
      setIsOfflineMode(true);
    } else if (user && typeof user === 'object' && Object.keys(user).length > 0) {
      setIsOfflineMode(false);
    }
  }, [user, isAuthenticated]);

  // Загружаем новости и статистику врачей при загрузке страницы
  useEffect(() => {
    fetchNews();
    fetchDoctorStats();
  }, []);

  // Перезагружаем новости при смене языка (API вернет переводы)
  useEffect(() => {
    fetchNews();
  }, [currentLanguage]);

  const fetchNews = async () => {
    try {
      setLoadingNews(true);
      // Загружаем только русские новости для оптимизации
      const response = await api.get(`/api/news/published?featured_only=true&limit=4&language=ru`);
      setHealthNews(response.data);
      setTranslatedNews(response.data);
    } catch (error) {
      setHealthNews([]);
      setTranslatedNews([]);
    } finally {
      setLoadingNews(false);
    }
  };

  const fetchDoctorStats = async () => {
    try {
      setLoadingStats(true);
      const stats = await doctorsApi.getSpecializationsStats();
      const statsMap = {};
      stats.forEach(stat => {
        statsMap[stat.specialization] = stat.count;
      });
      setDoctorStats(statsMap);
    } catch (error) {
      setDoctorStats({});
    } finally {
      setLoadingStats(false);
    }
  };
  
  // Функция для повторной попытки подключения к backend
  const handleRetryConnection = async () => {
    setIsOfflineMode(false);
    
    try {
      // Принудительно переинициализируем авторизацию
      const { initializeAuth } = useAuthStore.getState();
      await initializeAuth();
    } catch (error) {
      setIsOfflineMode(true);
    }
  };
  
  // Если есть ошибка аутентификации, не рендерим содержимое страницы
  if (authError) {
    return null;
  }
  
  // Если backend недоступен, показываем offline режим
  if (isOfflineMode && isAuthenticated) {
    return <OfflineMode user={user} onRetry={handleRetryConnection} />;
  }
  
  // Если требуется обновление профиля, показываем форму
  if (needsProfileUpdate) {
    const handleProfileCompletion = (userData) => {
      // Явно сбрасываем флаг needsProfileUpdate
      useAuthStore.setState({ needsProfileUpdate: false });
      
      // Перезагружаем состояние без полной перезагрузки страницы
      setTimeout(() => {
        // Проверяем, что флаг действительно сброшен
        const currentNeedsUpdate = useAuthStore.getState().needsProfileUpdate;
        
        if (!currentNeedsUpdate) {
          // Принудительно обновляем компонент, не перезагружая страницу
          window.location.href = '/';
        } else {
          // Если по какой-то причине флаг не сбросился, перезагрузим страницу
          window.location.reload();
        }
      }, 500);
    };
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-50 to-indigo-50 py-12 px-4">
        <div className="w-full max-w-2xl">
          <GoogleProfileForm onCompleted={handleProfileCompletion} />
        </div>
      </div>
    );
  }
  
  // Если пользователь администратор, перенаправляем на админ-панель
  if (user?.role === 'admin') {
    navigate('/admin_control_panel_52x9a8');
    return null;
  }

  // Основные разделы с иконками для хедера
  const mainSections = [
    {
      icon: '👩‍⚕️',
      title: t('doctors'),
      description: t('searchSpecialists'),
      action: () => navigate('/search-doctors')
    },
    {
      icon: '🏥',
      title: t('clinics'),
      description: t('medicalCenters'),
      action: () => navigate('/clinics')
    },
    {
      icon: '📋',
      title: t('services'),
      description: t('medicalServices'),
      action: () => navigate('/search-doctors')
    },
    {
      icon: '📅',
      title: t('appointment'),
      description: t('onlineAppointment'),
      action: () => navigate('/search-doctors')
    },
    {
      icon: '📰',
      title: t('news'),
      description: t('healthNews'),
      action: () => {
        const newsSection = document.getElementById('news-section');
        newsSection?.scrollIntoView({ behavior: 'smooth' });
      }
    },
    {
      icon: '💬',
      title: t('consultation'),
      description: t('onlineHelp'),
      action: () => navigate('/search-doctors')
    }
  ];

  // Функция для получения количества врачей по специализации
  const getDoctorCount = (specialization) => {
    const count = doctorStats[specialization] || 0;
    return `${count}+ ${t('doctorsCount')}`;
  };

  // Популярные направления медицины с переводами
  const popularDirections = [
    { 
      name: t('cardiology'), 
      icon: '❤️', 
      description: t('heartDiseases'), 
      specialists: getDoctorCount('Кардиолог'),
      backendSpecialization: 'Кардиолог'
    },
    { 
      name: t('neurology'), 
      icon: '🧠', 
      description: t('nervousSystem'), 
      specialists: getDoctorCount('Невролог'),
      backendSpecialization: 'Невролог'
    },
    { 
      name: t('therapy'), 
      icon: '🩺', 
      description: t('generalMedicine'), 
      specialists: getDoctorCount('Терапевт'),
      backendSpecialization: 'Терапевт'
    },
    { 
      name: t('dentistry'), 
      icon: '🦷', 
      description: t('dentalHealth'), 
      specialists: getDoctorCount('Стоматолог'),
      backendSpecialization: 'Стоматолог'
    },
    { 
      name: t('gynecology'), 
      icon: '👩‍⚕️', 
      description: t('womensHealth'), 
      specialists: getDoctorCount('Гинеколог'),
      backendSpecialization: 'Гинеколог'
    },
    { 
      name: t('ophthalmology'), 
      icon: '👁️', 
      description: t('eyeDiseases'), 
      specialists: getDoctorCount('Офтальмолог'),
      backendSpecialization: 'Офтальмолог'
    }
  ];

  // Топ специальности для отдельной секции с переводами
  const topSpecialties = [
    { name: t('cardiologist'), icon: '❤️', description: t('heartAndVessels') },
    { name: t('neurologist'), icon: '🧠', description: t('nervousSystemShort') },
    { name: t('ophthalmologist'), icon: '👁️', description: t('eyeDiseases') },
    { name: t('gynecologist'), icon: '👩‍⚕️', description: t('womensHealth') },
    { name: t('dermatologist'), icon: '🌟', description: t('skinDiseases') },
    { name: t('endocrinologist'), icon: '🔬', description: t('hormonalDisorders') },
    { name: t('pediatrician'), icon: '👶', description: t('childHealth') },
    { name: t('urologist'), icon: '🔬', description: t('genitourinarySystem') },
    { name: t('psychiatrist'), icon: '🧘', description: t('mentalHealth') },
    { name: t('oncologist'), icon: '🎗️', description: t('oncologyTreatment') },
    { name: t('orthopedist'), icon: '🦴', description: t('musculoskeletalSystem') },
    { name: t('otolaryngologist'), icon: '👂', description: t('earNoseThroat') },
    { name: t('gastroenterologist'), icon: '🫁', description: t('digestiveSystem') },
    { name: t('pulmonologist'), icon: '🫁', description: t('lungDiseases') },
    { name: t('proctologist'), icon: '⚕️', description: t('rectalDiseases') }
  ];

  // Функция для форматирования даты новости
  const formatNewsDate = (dateString) => {
    const date = new Date(dateString);
    const localeMap = {
      'ru': 'ru-RU',
      'uz': 'en-US', // Узбекский locale может не поддерживаться, используем английский
      'en': 'en-US'
    };
    const locale = localeMap[currentLanguage] || 'ru-RU';
    
    return date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Функция поиска
  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search-doctors?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  // Логика карусели специалистов - адаптивная
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  // Определяем количество карточек в зависимости от размера экрана
  const getItemsPerSlide = () => {
    if (windowWidth < 768) return 2; // Мобильные - 2 карточки
    if (windowWidth < 1024) return 3; // Планшеты - 3 карточки
    return 4; // Desktop - 4 карточки
  };
  
  const itemsPerSlide = getItemsPerSlide();
  const totalSlides = Math.ceil(topSpecialties.length / itemsPerSlide);

  // Отслеживание изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      setCurrentSlide(0); // Сбрасываем на первый слайд при изменении размера
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Автопрокрутка карусели
  useEffect(() => {
    if (isPaused || totalSlides <= 1) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 4000); // Смена слайда каждые 4 секунды

    return () => clearInterval(interval);
  }, [isPaused, totalSlides]);

  // Навигация карусели
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Получение видимых специалистов для текущего слайда
  const getVisibleSpecialties = () => {
    const startIndex = currentSlide * itemsPerSlide;
    return topSpecialties.slice(startIndex, startIndex + itemsPerSlide);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/30 via-white to-green-50/20 relative overflow-hidden">
      {/* Декоративные плавающие элементы */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-60">
        <motion.div 
          className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-gradient-to-r from-blue-300/15 to-indigo-300/15"
          animate={{
            y: [0, 20, 0],
            scale: [1, 1.05, 1],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute bottom-20 right-[10%] w-80 h-80 rounded-full bg-gradient-to-r from-green-300/15 to-teal-300/15"
          animate={{
            y: [0, -25, 0],
            scale: [1, 1.05, 1],
            rotate: [0, -5, 0, 5, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute top-1/3 right-[15%] w-40 h-40 rounded-full bg-gradient-to-r from-indigo-300/15 to-blue-300/15"
          animate={{
            y: [0, 15, 0],
            scale: [1, 1.08, 1],
            rotate: [0, 10, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute bottom-1/4 left-[20%] w-56 h-56 rounded-full bg-gradient-to-r from-cyan-300/15 to-teal-300/15"
          animate={{
            y: [0, -15, 0],
            scale: [1, 1.03, 1],
            rotate: [0, -8, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* Компонент уведомлений о статусе заявок */}
        <ApplicationStatusTracker />

        {/* Верхняя часть - Поиск и иконки разделов */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Поисковая строка */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Input
                size="lg"
                placeholder={t('searchDoctorsClinicsServices')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                startContent={
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
                endContent={
                  <Button 
                    color="primary" 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600"
                    onPress={handleSearch}
                  >
                    {t('findButton')}
                  </Button>
                }
                className="text-lg"
              />
            </div>
          </div>

          {/* Иконки основных разделов */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 max-w-4xl mx-auto">
            {mainSections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + (index * 0.05), duration: 0.5 }}
                whileHover={{ scale: 1.05, y: -2 }}
                className="cursor-pointer"
                onClick={section.action}
              >
                <Card className="bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-300 border-0 shadow-md hover:shadow-lg">
                  <CardBody className="p-4 text-center">
                    <div className="text-3xl mb-2">{section.icon}</div>
                    <h3 className="font-semibold text-gray-800 text-sm mb-1">{section.title}</h3>
                    <p className="text-xs text-gray-600">{section.description}</p>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Центральный блок - Главный баннер */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 border-0 shadow-2xl overflow-hidden relative">
            {/* Декоративные элементы баннера */}
            <motion.div 
              className="absolute top-0 right-0 w-40 h-40 rounded-full bg-white/10"
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 10, 0]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <motion.div 
              className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-white/5"
              animate={{
                scale: [1, 1.2, 1],
                rotate: [0, -15, 0]
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            <CardBody className="p-8 md:p-12 text-white relative z-10">
              <div className="max-w-4xl mx-auto text-center">
                <motion.h1 
                  className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  {t('yourHealthInReliableHands')}
                </motion.h1>
                
                <motion.p 
                  className="text-xl md:text-2xl mb-8 text-blue-100 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                >
                  {t('modernMedicalPlatform')}
                </motion.p>
                
                <motion.div 
                  className="flex flex-col sm:flex-row gap-4 justify-center"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9, duration: 0.8 }}
                >
                  <Button 
                    size="lg" 
                    className="bg-white text-blue-600 font-semibold hover:bg-blue-50 shadow-lg text-lg px-8 py-6"
                    onPress={() => navigate('/search-doctors')}
                  >
                    🔍 {t('findDoctorButton')}
                  </Button>
                  <Button 
                    size="lg" 
                    variant="bordered" 
                    className="border-white text-white hover:bg-white/10 font-semibold text-lg px-8 py-6"
                    onPress={() => navigate('/search-doctors')}
                  >
                    📅 {t('scheduleAppointmentButton')}
                  </Button>
                </motion.div>

                {/* Элементы доверия */}
                <motion.div 
                  className="mt-8 flex flex-wrap justify-center gap-6 text-blue-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.1, duration: 0.8 }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-sm">{t('certifiedDoctors')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-sm">{t('dataSecurity')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span className="text-sm">{t('support247')}</span>
                  </div>
                </motion.div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Секция популярных направлений */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('popularDirections')}</h2>
              <p className="text-gray-600">{t('chooseSpecialization')}</p>
            </div>
            <Button 
              variant="ghost" 
              className="text-blue-600 hover:text-blue-700"
              onPress={() => navigate('/search-doctors')}
              endContent={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              {t('allDirections')}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularDirections.map((direction, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + (index * 0.1), duration: 0.5 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="cursor-pointer"
                onClick={() => navigate('/search-doctors')}
              >
                <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                  <CardBody className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{direction.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900 mb-2">{direction.name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{direction.description}</p>
                        <Chip size="sm" color="primary" variant="flat" className="text-xs">
                          {loadingStats ? `... ${t('doctorsCount')}` : direction.specialists}
                        </Chip>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Секция новостей здоровья */}
        <motion.div 
          id="news-section"
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.6 }}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('healthMedicineNews')}</h2>
              <p className="text-gray-600">{t('currentArticlesResearch')}</p>
            </div>
            <Button 
              variant="ghost" 
              className="text-blue-600 hover:text-blue-700"
              endContent={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              {t('allNews')}
            </Button>
          </div>

          {loadingNews ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">{t('loadingNews')}</p>
            </div>
          ) : translatedNews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {translatedNews.map((news, index) => (
                <motion.div
                  key={news.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + (index * 0.1), duration: 0.5 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                  className="cursor-pointer"
                  onClick={() => navigate(`/news/${news.id}`)}
                >
                  <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                    <CardBody className="p-0">
                      {/* Изображение новости */}
                      {news.image_path ? (
                        <div className="h-48 overflow-hidden">
                          <img
                            src={`${import.meta.env.VITE_API_URL || 'https://healzy.uz'}${news.image_path}`}
                            alt={news.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <span className="text-4xl">📰</span>
                        </div>
                      )}
                      
                      <div className="p-4">
                                                  <div className="flex justify-between items-center mb-3">
                            <Chip size="sm" color="primary" variant="flat">
                              {news.category}
                            </Chip>
                          <span className="text-xs text-gray-500">
                            {formatNewsDate(news.published_at || news.created_at)}
                          </span>
                        </div>
                        
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 text-sm leading-tight">
                          {news.title}
                        </h3>
                        
                        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed mb-3">
                          {news.summary}
                        </p>
                        
                        <Button 
                          size="sm" 
                          variant="flat" 
                          color="primary" 
                          className="w-full"
                          onPress={(e) => {
                            e.stopPropagation();
                            navigate(`/news/${news.id}`);
                          }}
                        >
                          {t('readButton')}
                        </Button>
                      </div>
                    </CardBody>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📰</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">{t('newsWillAppearSoon')}</h3>
              <p className="text-gray-500">{t('workingOnMedicalNews')}</p>
            </div>
          )}
        </motion.div>

        {/* Секция наших специалистов */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('ourSpecialists')}</h2>
              <div className="flex items-center gap-2">
                <p className="text-gray-600">{t('top15Specializations')}</p>
                {totalSlides > 1 && (
                  <div className="hidden md:flex items-center text-gray-400 text-sm">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-xs">{t('autoSlide')}</span>
                  </div>
                )}
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="text-blue-600 hover:text-blue-700"
              onPress={() => navigate('/search-doctors')}
              endContent={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              {t('allDoctors')}
            </Button>
          </div>

          {/* Карусель специалистов */}
          <div 
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Кнопки навигации */}
            {totalSlides > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm border border-gray-200"
                  aria-label="Предыдущий слайд"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                <button
                  onClick={nextSlide}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-300 backdrop-blur-sm border border-gray-200"
                  aria-label="Следующий слайд"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}
            
            {/* Контейнер слайдов */}
            <div className="overflow-hidden rounded-xl">
              <motion.div 
                className="flex transition-transform duration-500 ease-in-out"
                animate={{ x: `-${currentSlide * 100}%` }}
              >
                {Array.from({ length: totalSlides }, (_, slideIndex) => (
                  <div key={slideIndex} className="w-full flex-shrink-0">
                    <div className={`grid gap-4 p-4 ${
                      itemsPerSlide === 2 ? 'grid-cols-2' : 
                      itemsPerSlide === 3 ? 'grid-cols-3' : 
                      'grid-cols-4'
                    }`}>
                      {topSpecialties
                        .slice(slideIndex * itemsPerSlide, (slideIndex + 1) * itemsPerSlide)
                        .map((specialty, index) => (
                        <motion.div
                          key={slideIndex * itemsPerSlide + index}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.1, duration: 0.4 }}
                          whileHover={{ scale: 1.05, y: -3 }}
                          className="cursor-pointer"
                          onClick={() => navigate('/search-doctors')}
                        >
                          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-all duration-300 h-36">
                            <CardBody className="p-3 text-center flex flex-col items-center justify-center">
                              <div className="text-2xl mb-2">{specialty.icon}</div>
                              <h4 className="font-semibold text-gray-900 text-xs mb-1 leading-tight text-center line-clamp-2">
                                {specialty.name}
                              </h4>
                              <p className="text-xs text-gray-600 line-clamp-2 text-center">
                                {specialty.description}
                              </p>
                            </CardBody>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
            
            {/* Индикаторы */}
            {totalSlides > 1 && (
              <div className="flex justify-center mt-6 gap-2">
                {Array.from({ length: totalSlides }, (_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentSlide 
                        ? 'bg-blue-600 scale-110' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Перейти к слайду ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
          

        </motion.div>

        {/* Дополнительная информация о платформе */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-0 shadow-lg">
            <CardBody className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                {t('whyChooseOurPlatform')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <motion.div 
                  className="text-center"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl">
                    🔍
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {t('convenientDoctorSearchNew')}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {t('findSpecialistsByRating')}
                  </p>
                </motion.div>
                
                <motion.div 
                  className="text-center"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl">
                    🌍
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {t('onlineConsultationsNew')}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {t('getMedicalHelpAnywhere')}
                  </p>
                </motion.div>
                
                <motion.div 
                  className="text-center"
                  whileHover={{ y: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl">
                    🔒
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {t('dataSecurityNew')}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {t('medicalDataProtection')}
                  </p>
                </motion.div>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default HomePage;