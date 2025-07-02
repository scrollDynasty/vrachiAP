import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Chip } from '@nextui-org/react';
import { motion } from 'framer-motion';
import { useTranslation } from '../components/LanguageSelector';

function ClinicsPage() {
  const { t } = useTranslation();
  const [mapLoaded, setMapLoaded] = useState(false);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  useEffect(() => {
    // Загрузка Google Maps API
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        setMapLoaded(true);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAH7MJFPvGXttUw2c2nLG2LI38QpfZ_3_Q&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setMapLoaded(true);
      };
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  useEffect(() => {
    if (mapLoaded) {
      // Инициализация карты
      const map = new window.google.maps.Map(document.getElementById('map'), {
        center: { lat: 41.2995, lng: 69.2401 }, // Ташкент
        zoom: 12,
        styles: [
          {
            featureType: 'poi.medical',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      });

      // Добавляем маркер с информационным окном
      const marker = new window.google.maps.Marker({
        position: { lat: 41.2995, lng: 69.2401 },
        map: map,
        title: 'Пример клиники',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#3B82F6" opacity="0.8"/>
              <circle cx="16" cy="16" r="8" fill="white"/>
              <path d="M12 16h8M16 12v8" stroke="#3B82F6" stroke-width="2" stroke-linecap="round"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(32, 32)
        }
      });

      const infoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; max-width: 200px;">
            <h3 style="margin: 0 0 5px 0; color: #1F2937; font-weight: 600;">Пример клиники</h3>
            <p style="margin: 0; color: #6B7280; font-size: 14px;">Это демонстрационный маркер. Реальные клиники будут добавлены после получения лицензии.</p>
          </div>
        `
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    }
  }, [mapLoaded]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Декоративные плавающие элементы */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-70">
        <motion.div 
          className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-gradient-to-r from-blue-300/20 to-indigo-300/20"
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
          className="absolute bottom-20 right-[10%] w-80 h-80 rounded-full bg-gradient-to-r from-purple-300/20 to-indigo-300/20"
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
      </div>

      <div className="max-w-6xl mx-auto py-8 px-4 relative z-10">
        {/* Заголовок страницы */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">
              {t('clinics', 'Клиники')}
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            {t('clinicsDescription', 'Найдите ближайшие медицинские клиники и центры')}
          </p>
        </motion.div>

        {/* Основной контент */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Карточка с информацией о лицензии */}
          <motion.div variants={cardVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border border-yellow-200 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('licenseNotice', 'Важная информация')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('licenseDescription', 'В связи с отсутствием лицензии на отображение медицинских учреждений, мы пока не можем показывать реальные местоположения клиник')}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Карта */}
          <motion.div variants={cardVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border border-blue-100 shadow-lg overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('mapTitle', 'Карта клиник')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('mapDescription', 'Интерактивная карта для поиска медицинских учреждений')}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="p-0">
                <div className="relative">
                  <div 
                    id="map" 
                    className="w-full h-96 bg-gray-100 flex items-center justify-center"
                    style={{ minHeight: '400px' }}
                  >
                    {!mapLoaded && (
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Загрузка карты...</p>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span>{t('demoMarker', 'Демо маркер')}</span>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </motion.div>

          {/* Информационные карточки */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Карточка 1 */}
            <motion.div variants={cardVariants}>
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:shadow-lg transition-all duration-300 group">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('locationSearch', 'Поиск по местоположению')}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {t('locationSearchDescription', 'Найдите клиники рядом с вашим местоположением')}
                  </p>
                  <Chip 
                    className="mt-3" 
                    color="primary" 
                    variant="flat" 
                    size="sm"
                  >
                    {t('planned', 'Планируется')}
                  </Chip>
                </CardBody>
              </Card>
            </motion.div>

            {/* Карточка 2 */}
            <motion.div variants={cardVariants}>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 hover:shadow-lg transition-all duration-300 group">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('clinicInfo', 'Информация о клиниках')}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {t('clinicInfoDescription', 'Подробная информация о специализации и услугах')}
                  </p>
                  <Chip 
                    className="mt-3" 
                    color="success" 
                    variant="flat" 
                    size="sm"
                  >
                    {t('planned', 'Планируется')}
                  </Chip>
                </CardBody>
              </Card>
            </motion.div>

            {/* Карточка 3 */}
            <motion.div variants={cardVariants}>
              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 hover:shadow-lg transition-all duration-300 group">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('appointmentBooking', 'Запись на прием')}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {t('appointmentDescription', 'Онлайн запись на прием к врачам в выбранной клинике')}
                  </p>
                  <Chip 
                    className="mt-3" 
                    color="secondary" 
                    variant="flat" 
                    size="sm"
                  >
                    {t('planned', 'Планируется')}
                  </Chip>
                </CardBody>
              </Card>
            </motion.div>
          </div>

          {/* Секция с дополнительной информацией */}
          <motion.div variants={cardVariants} className="mt-8">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-lg">
              <CardBody className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {t('comingSoonTitle', 'Скоро будет доступно')}
                  </h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    {t('comingSoonDescription', 'Мы работаем над получением необходимых лицензий для отображения реальных медицинских учреждений. После этого вы сможете найти ближайшие клиники и записаться на прием онлайн.')}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  <Chip color="primary" variant="flat">
                    {t('licenseInProgress', 'Лицензия в процессе')}
                  </Chip>
                  <Chip color="success" variant="flat">
                    {t('developmentActive', 'Разработка активна')}
                  </Chip>
                  <Chip color="warning" variant="flat">
                    {t('betaVersion', 'Бета версия')}
                  </Chip>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default ClinicsPage; 