// frontend/src/App.jsx
import React, { useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'

// Импортируем компоненты страниц
import HomePage from './pages/HomePage'
import VerifyEmailPage from './pages/VerifyEmailPage'
import ProfileSettingsPage from './pages/ProfileSettingsPage'
import NotFoundPage from './pages/NotFoundPage'
import AuthPage from './pages/AuthPage'
import SearchDoctorsPage from './pages/SearchDoctorsPage'
import DoctorProfilePage from './pages/DoctorProfilePage'
import HistoryPage from './pages/HistoryPage'
import ConsultationPage from './pages/ConsultationPage'
import GoogleAuthCallback from './pages/GoogleAuthCallback'
import AdminPage from './pages/AdminPage'
import DoctorApplicationPage from './pages/DoctorApplicationPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AboutPage from './pages/AboutPage'
import TabletsPage from './pages/TabletsPage'
import ClinicsPage from './pages/ClinicsPage'
import NewsDetailPage from './pages/NewsDetailPage'
import AIDiagnosisPage from './pages/AIDiagnosisPage'

import Header from './components/Header'
// Импортируем компонент WebSocket-уведомлений
import NotificationWebSocket from './components/NotificationWebSocket'
// Импортируем провайдер для языков
import { LanguageProvider, useTranslation } from './components/LanguageSelector'
// Импортируем провайдер для toast-уведомлений
import { Toaster } from 'react-hot-toast'

// Импортируем хук для доступа к стору аутентификации
import useAuthStore from './stores/authStore'
// Импортируем компонент для защиты роутов, требующих авторизации
import ProtectedRoute from './components/ProtectedRoute'
// Импортируем компонент для проверки подтверждения email
import EmailVerificationRequired from './components/EmailVerificationRequired'
import MedicalLoader from './components/MedicalLoader'
// Импортируем провайдер и компонент для глобальных звонков
import { CallsProvider } from './contexts/CallsContext'
import GlobalCallNotification from './components/calls/GlobalCallNotification'

// Импортируем основные стили
import './index.scss'
import soundService from './services/soundService' // Импортируем soundService

// Компонент футера
function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer 
      className="bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-200 text-center text-gray-600 text-sm"
      style={{
        /* ИСПРАВЛЕНИЕ CLS: Фиксированная высота футера для предотвращения layout shift */
        height: '120px',
        paddingTop: '24px',
        paddingBottom: '24px',
        contain: 'layout style paint',
        willChange: 'contents'
      }}
    >
      <div className="container mx-auto">
        <p>© {new Date().getFullYear()} Healzy. {t('allRightsReserved')}</p>
        <div 
          className="flex justify-center gap-4"
          style={{
            /* ИСПРАВЛЕНИЕ CLS: Фиксированный отступ */
            marginTop: '8px',
            contain: 'layout style'
          }}
        >
          <a href="#" className="hover:text-primary transition-colors">{t('privacyPolicy')}</a>
          <a href="#" className="hover:text-primary transition-colors">{t('termsOfUse')}</a>
          <a href="#" className="hover:text-primary transition-colors">{t('contacts')}</a>
        </div>
      </div>
    </footer>
  );
}

  // Главный компонент приложения, который настраивает роутинг и общую структуру
function App() {
  // Получаем все необходимые данные и функции из стора на верхнем уровне компонента
  const initializeAuth = useAuthStore((state) => state.initializeAuth)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const pendingVerificationEmail = useAuthStore((state) => state.pendingVerificationEmail)
  const isLoading = useAuthStore((state) => state.isLoading)
  const error = useAuthStore((state) => state.error)
  const needsProfileUpdate = useAuthStore((state) => state.needsProfileUpdate)
  
  const navigate = useNavigate()
  const location = useLocation()

  // При первом монтировании компонента инициализируем авторизацию
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth])

  // Перенаправляем неаутентифицированных пользователей на страницу логина
  useEffect(() => {
    // Публичные маршруты, доступные всем пользователям
    const publicRoutes = [
      '/about',           // Добавляем страницу О нас как публичную
      '/login', 
      '/register', 
      '/verify-email',
      '/auth/google/callback',
      '/admin-piisa-popa',
      '/404',
      '/search-doctors',  // Делаем поиск врачей публичным
      '/doctors',         // Делаем профили врачей публичными
      '/news'             // Делаем новости публичными
    ];
    
    // Проверяем, является ли текущий путь публичным
    const isPublicRoute = publicRoutes.some(route => 
      location.pathname === route || location.pathname.startsWith(route)
    );
    
    
    // Если есть ошибка аутентификации - перенаправляем на логин (кроме публичных маршрутов)
    if (!isPublicRoute && error) {
      navigate('/login');
      return;
    }
    
    // Если есть ожидающий подтверждения email и мы не на странице подтверждения - перенаправляем туда
    // ВАЖНО: Делаем это только если нет ошибки аутентификации И ЕСЛИ путь не является домашней страницей
    // Это позволит после регистрации попасть на домашнюю страницу вместо страницы верификации
    if (pendingVerificationEmail && !error && location.pathname !== '/verify-email' && 
        location.pathname !== '/' && location.pathname !== '/login' && location.pathname !== '/register' && 
        location.pathname !== '/auth/google/callback') {
      navigate('/verify-email');
      return;
    }
    
    // Если пользователь авторизован и находится на странице подтверждения email,
    // и нет ожидающих подтверждений, перенаправляем на профиль
    if (isAuthenticated && !isLoading && location.pathname === '/verify-email' && !pendingVerificationEmail) {
      navigate('/');
    }
    
    // Если путь не публичный, загрузка завершена и пользователь не авторизован - перенаправляем на логин
    if (!isPublicRoute && !isLoading && !isAuthenticated) {
      // Добавляем проверку, чтобы не перенаправлять, если мы на странице подтверждения email
      if (location.pathname !== '/verify-email') {
        navigate('/login');
      } else {
        if (!pendingVerificationEmail){
          navigate('/');
        }
      }
    }
    
    // Дополнительная проверка: если мы на главной странице и не авторизованы - перенаправляем на логин
    if (location.pathname === '/' && !isLoading && !isAuthenticated) {
      navigate('/login');
    }
    
    // Дополнительная агрессивная проверка для неавторизованных пользователей
    if (!isLoading && !isAuthenticated && !isPublicRoute) {
      navigate('/login');
    } 
  }, [isLoading, isAuthenticated, navigate, location.pathname, error, pendingVerificationEmail]);

  
  // ОПТИМИЗАЦИЯ: Определяем слабое устройство
  const isLowEndDevice = navigator.hardwareConcurrency <= 2 || 
                        (performance.memory && performance.memory.jsHeapSizeLimit < 1000000000);

  return (
    <LanguageProvider>
      <CallsProvider>
        <div className="App bg-gradient-to-b from-blue-50/30 to-white min-h-screen relative overflow-hidden medical-theme">
      {/* ОПТИМИЗАЦИЯ: Декоративные фоновые элементы только для мощных устройств */}
      {!isLowEndDevice && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {/* Статичные элементы вместо анимированных */}
          <div 
            className="absolute rounded-full bg-gradient-to-br from-blue-100/40 to-indigo-100/40"
            style={{
              top: '0px',
              right: '-160px',
              width: '384px',
              height: '384px',
              transform: 'translateZ(0)',
              position: 'absolute',
              contain: 'layout style paint'
            }}
          />
          
          <div 
            className="absolute rounded-full bg-gradient-to-br from-red-100/30 to-pink-100/30"
            style={{
              bottom: '-80px',
              left: '-80px',
              width: '320px',
              height: '320px',
              transform: 'translateZ(0)',
              position: 'absolute',
              contain: 'layout style paint'
            }}
          />
        </div>
      )}
      
      {/* Компонент анимации перехода между страницами */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <MedicalLoader />
        </div>
      )}
      
      {/* Хедер приложения (показываем только если пользователь аутентифицирован и нет ошибок) */}
      {isAuthenticated && user && !error && <Header />}
      
      {/* Компонент для WebSocket-уведомлений */}
      {isAuthenticated && user && !error && <NotificationWebSocket />}
      
      {/* Глобальные уведомления о звонках */}
      {isAuthenticated && user && !error && <GlobalCallNotification />}
      
      {/* Компонент для отображения toast-уведомлений */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: '#fff',
            color: '#333',
          },
        }}
      />
      
      {/* Основное содержимое */}
      <main className="pt-4 pb-8 relative z-10">
      {/* Определение набора маршрутов приложения с помощью компонента Routes */}
      <Routes>
          {/* Публичные роуты */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
        <Route path="/admin-piisa-popa" element={<AdminLoginPage />} />
        <Route path="/news/:newsId" element={<NewsDetailPage />} />
        
        <Route path="/404" element={<NotFoundPage />} />
          
          {/* Базовые защищенные роуты (требуют только аутентификации) */}
        <Route element={<ProtectedRoute />}>
            {/* Домашняя страница доступна после аутентификации, даже без подтверждения email */}
            <Route path="/" element={<HomePage />} />
            
            {/* Роуты, требующие подтверждения email (для обычной регистрации) */}
            <Route element={<EmailVerificationRequired />}>
              <Route path="/profile" element={<ProfileSettingsPage />} />
              <Route path="/search-doctors" element={<SearchDoctorsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/tablets" element={<TabletsPage />} />
              <Route path="/clinics" element={<ClinicsPage />} />
              <Route path="/ai-diagnosis" element={<AIDiagnosisPage />} />
              {/* Маршрут для публичного профиля врача (доступен только аутентифицированным пользователям) */}
              <Route path="/doctors/:doctorId" element={<DoctorProfilePage />} />
              <Route path="/doctor-application" element={<DoctorApplicationPage />} />
              {/* Маршрут для страницы консультации */}
              <Route path="/consultations/:consultationId" element={<ConsultationPage />} />
            </Route>
        </Route>

          {/* Защищенные роуты с проверкой роли (для админов) */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin_control_panel_52x9a8" element={<AdminPage />} />
              <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* Роут для всех остальных путей - страница 404 Not Found */}
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
      </main>
      
      {/* Футер приложения (показываем только если пользователь аутентифицирован и нет ошибок) */}
      {isAuthenticated && user && !error && <Footer />}
        </div>
      </CallsProvider>
    </LanguageProvider>
  )
}

export default App