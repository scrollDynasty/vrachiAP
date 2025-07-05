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

// Импортируем компонент хедера
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

  
  return (
    <LanguageProvider>
      <CallsProvider>
        <div className="App bg-gradient-to-b from-blue-50/30 to-white min-h-screen relative overflow-hidden medical-theme">
      {/* ОПТИМИЗАЦИЯ: Декоративные фоновые элементы БЕЗ Layout Shifts */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* ИСПРАВЛЕНИЕ CLS: Верхний градиентный круг с фиксированной позицией */}
        <motion.div 
          className="absolute rounded-full bg-gradient-to-br from-blue-100/40 to-indigo-100/40"
          style={{
            top: '0px',
            right: '-160px',
            width: '384px',
            height: '384px',
            willChange: 'transform',
            transform: 'translateZ(0)',
            // ИСПРАВЛЕНИЕ CLS: Фиксированные размеры и позиция
            position: 'absolute',
            contain: 'layout style paint'
          }}
          animate={{ 
            // ИСПРАВЛЕНИЕ CLS: Только transform анимации, БЕЗ изменения layout
            transform: [
              'translateZ(0) translateY(0px) rotate(0deg) scale(1)',
              'translateZ(0) translateY(15px) rotate(5deg) scale(1.05)',
              'translateZ(0) translateY(-15px) rotate(0deg) scale(0.95)',
              'translateZ(0) translateY(0px) rotate(-5deg) scale(1)'
            ]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity,
            ease: "easeInOut",
            type: "tween"
          }}
          layout={false}
        />
        
        {/* ИСПРАВЛЕНИЕ CLS: Нижний градиентный круг с фиксированной позицией */}
        <motion.div 
          className="absolute rounded-full bg-gradient-to-br from-red-100/30 to-pink-100/30"
          style={{
            bottom: '-80px',
            left: '-80px',
            width: '320px',
            height: '320px',
            willChange: 'transform',
            transform: 'translateZ(0)',
            // ИСПРАВЛЕНИЕ CLS: Фиксированные размеры и позиция
            position: 'absolute',
            contain: 'layout style paint'
          }}
          animate={{ 
            // ИСПРАВЛЕНИЕ CLS: Только transform анимации, БЕЗ изменения layout
            transform: [
              'translateZ(0) translateY(0px) rotate(0deg) scale(1)',
              'translateZ(0) translateY(-15px) rotate(-5deg) scale(0.95)',
              'translateZ(0) translateY(15px) rotate(0deg) scale(1.05)',
              'translateZ(0) translateY(0px) rotate(5deg) scale(1)'
            ]
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity,
            ease: "easeInOut",
            type: "tween"
          }}
          layout={false}
        />
        
        {/* ИСПРАВЛЕНИЕ CLS: Декоративная волнистая линия БЕЗ layout shifts */}
        <svg 
          style={{
            position: 'absolute',
            bottom: '0px',
            left: '0px',
            right: '0px',
            width: '100%',
            height: '320px',
            transform: 'translateZ(0)',
            contain: 'layout style paint'
          }}
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 1440 320"
        >
          <motion.path 
            fill="#f3f4f6" 
            fillOpacity="0.2"
            d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            animate={{ 
              d: [
                "M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,160L48,181.3C96,203,192,245,288,234.7C384,224,480,160,576,138.7C672,117,768,139,864,176C960,213,1056,267,1152,266.7C1248,267,1344,213,1392,186.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                "M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,213.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
              ]
            }}
            transition={{ 
              duration: 35,
              repeat: Infinity,
              ease: "easeInOut",
              type: "tween"
            }}
            style={{
              willChange: 'd',
              transform: 'translateZ(0)'
            }}
          />
        </svg>
        
        {/* ИСПРАВЛЕНИЕ CLS: Медицинские символы БЕЗ layout shifts */}
        <motion.div 
          className="text-red-500/10"
          initial={{ opacity: 0 }}
          style={{
            position: 'absolute',
            top: '25%',
            right: '40px',
            width: '80px',
            height: '80px',
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
            contain: 'layout style paint'
          }}
          animate={{ 
            // ИСПРАВЛЕНИЕ CLS: Только transform анимации для opacity, rotate, scale
            transform: [
              'translateZ(0) rotate(0deg) scale(0.8)',
              'translateZ(0) rotate(10deg) scale(1)',
              'translateZ(0) rotate(0deg) scale(0.8)',
              'translateZ(0) rotate(-10deg) scale(0.8)',
              'translateZ(0) rotate(0deg) scale(0.8)'
            ],
            opacity: [0, 0.1, 0, 0.1, 0]
          }}
          transition={{ 
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            type: "tween"
          }}
          layout={false}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0zM7 4.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-.5 2.5A.5.5 0 0 1 7 6.5h2a.5.5 0 0 1 0 1H7a.5.5 0 0 1-.5-.5zm-1 1a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-.5 2.5A.5.5 0 0 1 5 10h4a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </motion.div>
        
        <motion.div 
          className="text-blue-500/10"
          initial={{ opacity: 0 }}
          style={{
            position: 'absolute',
            bottom: '33.33%',
            left: '80px',
            width: '100px',
            height: '100px',
            willChange: 'transform, opacity',
            transform: 'translateZ(0)',
            contain: 'layout style paint'
          }}
          animate={{ 
            // ИСПРАВЛЕНИЕ CLS: Только transform анимации для opacity, rotate, scale
            transform: [
              'translateZ(0) rotate(0deg) scale(1)',
              'translateZ(0) rotate(-15deg) scale(1.2)',
              'translateZ(0) rotate(0deg) scale(1)',
              'translateZ(0) rotate(15deg) scale(1)',
              'translateZ(0) rotate(0deg) scale(1)'
            ],
            opacity: [0, 0.1, 0, 0.1, 0]
          }}
          transition={{ 
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5,
            type: "tween"
          }}
          layout={false}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="currentColor" viewBox="0 0 16 16">
            <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-3 9h10V7H4v10Z"/>
            <path d="M2 2a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2Zm11 12h-1v-3a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v3H3V2h10v12Z"/>
          </svg>
        </motion.div>
      </div>
      
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