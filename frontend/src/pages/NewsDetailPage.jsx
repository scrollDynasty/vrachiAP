import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardBody, Chip, Button, Spinner } from '@nextui-org/react';
import { motion } from 'framer-motion';
import { useTranslation } from '../components/LanguageSelector';
import { translateNewsItem } from '../utils/autoTranslate';
import api from '../api';

function NewsDetailPage() {
  const { newsId } = useParams();
  const navigate = useNavigate();
  const { t, currentLanguage } = useTranslation();
  const [news, setNews] = useState(null);
  const [translatedNews, setTranslatedNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNews();
  }, [newsId]);

  // Переводим новость при смене языка
  useEffect(() => {
    if (news) {
      translateNewsContent();
    }
  }, [currentLanguage, news]);

  const fetchNews = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/news/published/${newsId}`);
      setNews(response.data);
      
      // Если язык не русский, сразу переводим новость
      if (currentLanguage !== 'ru') {
        await translateSingleNews(response.data);
      } else {
        setTranslatedNews(response.data);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setError(t('newsNotFound') || 'Новость не найдена');
      } else {
        setError(t('newsLoadingError') || 'Ошибка загрузки новости');
      }
    } finally {
      setLoading(false);
    }
  };

  // Функция для перевода новости
  const translateNewsContent = async () => {
    if (!news || currentLanguage === 'ru') {
      setTranslatedNews(news);
      return;
    }

    await translateSingleNews(news);
  };

  const translateSingleNews = async (newsData) => {
    try {
      setTranslating(true);
      const translated = await translateNewsItem(newsData, currentLanguage);
      setTranslatedNews(translated);
    } catch (error) {
      // Если перевод не удался, показываем оригинальную новость
      setTranslatedNews(newsData);
    } finally {
      setTranslating(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const localeMap = {
      'ru': 'ru-RU',
      'uz': 'en-US', // Узбекский locale может не поддерживаться, используем английский
      'en': 'en-US'
    };
    const locale = localeMap[currentLanguage] || 'ru-RU';
    
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (translating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" color="success" />
          <p className="mt-4 text-gray-600">{t('translatingNews')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardBody className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{error}</h2>
            <Button color="primary" onPress={() => navigate('/')}>
              {t('backToHome') || 'Вернуться на главную'}
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!translatedNews) {
    return null;
  }

  const newsToDisplay = translatedNews;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Декоративные плавающие элементы */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-70">
        <motion.div 
          className="absolute top-20 left-[8%] w-64 h-64 rounded-full bg-gradient-to-r from-blue-300/20 to-indigo-300/20"
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
          className="absolute bottom-20 right-[8%] w-80 h-80 rounded-full bg-gradient-to-r from-purple-300/20 to-indigo-300/20"
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
          className="absolute top-1/3 right-[12%] w-40 h-40 rounded-full bg-gradient-to-r from-indigo-300/20 to-blue-300/20"
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
          className="absolute bottom-1/4 left-[15%] w-56 h-56 rounded-full bg-gradient-to-r from-cyan-300/20 to-teal-300/20"
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
        
        <motion.div 
          className="absolute top-1/2 left-[5%] w-32 h-32 rounded-full bg-gradient-to-r from-green-300/15 to-emerald-300/15"
          animate={{
            x: [0, 12, 0],
            y: [0, -18, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 9,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute bottom-1/3 right-[20%] w-28 h-28 rounded-full bg-gradient-to-r from-pink-300/15 to-rose-300/15"
          animate={{
            x: [0, -10, 0],
            y: [0, 12, 0],
            scale: [1, 1.06, 1],
            rotate: [0, 15, 0]
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Кнопка назад */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <Button 
            variant="ghost" 
            onPress={() => navigate('/')}
            startContent={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            }
          >
            {t('backToHome') || 'Вернуться на главную'}
          </Button>
        </motion.div>

        {/* Основная карточка новости */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-2xl overflow-hidden">
            {/* Градиентная полоса */}
            <motion.div 
              className="h-1.5 bg-gradient-to-r from-green-500 via-teal-500 to-blue-500"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.8 }}
            />

            <CardBody className="p-0">
              {/* Изображение новости */}
              {newsToDisplay.image_path && (
                <motion.div
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="relative h-64 md:h-80 overflow-hidden"
                >
                  <img
                    src={`${import.meta.env.VITE_API_URL || 'https://healzy.uz'}${newsToDisplay.image_path}`}
                    alt={newsToDisplay.title}
                    className="w-full h-full object-cover"
                  />
                  {/* Градиентный оверлей */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                  
                  {/* Категория поверх изображения */}
                  <div className="absolute bottom-4 left-4">
                    <Chip color="primary" variant="solid" className="text-white bg-blue-600/80 backdrop-blur-sm">
                      {newsToDisplay.category}
                    </Chip>
                  </div>
                </motion.div>
              )}

              {/* Контент */}
              <div className="p-8">
                {/* Заголовок и мета-информация */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                  className="mb-6"
                >
                  {/* Мета-информация */}
                  <div className="flex flex-wrap gap-4 items-center text-sm text-gray-600 mb-4">
                    <span>{formatDate(newsToDisplay.published_at || newsToDisplay.created_at)}</span>
                    {!newsToDisplay.image_path && (
                      <>
                        <span>•</span>
                        <Chip size="sm" color="primary" variant="flat">
                          {newsToDisplay.category}
                        </Chip>
                      </>
                    )}
                  </div>

                  {/* Заголовок */}
                  <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-4">
                    {newsToDisplay.title}
                  </h1>

                  {/* Краткое описание */}
                  <p className="text-xl text-gray-700 leading-relaxed border-l-4 border-blue-500 pl-4 italic">
                    {newsToDisplay.summary}
                  </p>
                </motion.div>

                {/* Основной контент */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="prose prose-lg max-w-none"
                >
                  <div 
                    className="text-gray-800 leading-relaxed space-y-4"
                    style={{ whiteSpace: 'pre-line' }}
                    dangerouslySetInnerHTML={{ __html: newsToDisplay.content.replace(/\n/g, '<br/>') }}
                  />
                </motion.div>

                {/* Теги */}
                {newsToDisplay.tags && newsToDisplay.tags.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="mt-8 pt-6 border-t border-gray-200"
                  >
                    <h3 className="text-sm font-medium text-gray-700 mb-3">{t('tags')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {newsToDisplay.tags.map((tag, index) => (
                        <Chip key={index} size="sm" variant="flat" color="default">
                          #{tag}
                        </Chip>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Призыв к действию */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.6 }}
                  className="mt-8 pt-6 border-t border-gray-200 text-center"
                >
                  <p className="text-gray-600 mb-4">
                    {t('healthQuestionsRemain')}
                  </p>
                  <Button 
                    color="primary" 
                    size="lg"
                    onPress={() => navigate('/search-doctors')}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg"
                  >
                    {t('findDoctor')}
                  </Button>
                </motion.div>
              </div>
            </CardBody>
          </Card>
        </motion.div>

        {/* Дополнительные действия */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="mt-8 text-center"
        >
          <Button 
            variant="ghost" 
            color="primary"
            onPress={() => navigate('/')}
          >
            {t('readOtherNews')}
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

export default NewsDetailPage; 