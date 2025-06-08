// frontend/src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { NextUIProvider } from '@nextui-org/react'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { ThemeProvider } from '@mui/material/styles';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './App'

// Импортируем стили
import './index.css' // Tailwind CSS
import './index.scss' // SCSS стили
import '@fortawesome/fontawesome-free/css/all.css' // FontAwesome иконки

// Импортируем тему MUI
import muiTheme from './theme/index'

// Используйте здесь ваш реальный Client ID из Google Console
const GOOGLE_CLIENT_ID = "735617581412-e8ceb269bj7qqrv9sl066q63g5dr5sne.apps.googleusercontent.com"

// Утилита для очистки проблемных данных в хранилище браузера
// Может быть вызвана в консоли разработчика: cleanupStorage()
window.cleanupStorage = () => {
  
  // Очистка токенов WebSocket
  const wsTokenKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('ws_token')) {
      wsTokenKeys.push(key);
    }
  }
  
  // Удаляем найденные ключи
  wsTokenKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // Очистка флагов отзывов
  let reviewCount = 0;
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.includes('review_') || key.includes('message_request_'))) {
      sessionStorage.removeItem(key);
      reviewCount++;
    }
  }
  
  
  // Очистка глобальных переменных
  if (window.messageRefreshInterval) {
    clearInterval(window.messageRefreshInterval);
    window.messageRefreshInterval = null;
  }
  
  return 'Очистка завершена. Обновите страницу для применения изменений.';
};

// Утилита для принудительной пометки консультации как имеющей отзыв
// Может быть вызвана в консоли разработчика: markReviewAdded(consultationId)
window.markReviewAdded = (consultationId) => {
  if (!consultationId) {
    return 'Ошибка: необходимо указать ID консультации';
  }
  
  const reviewKey = `review_added_${consultationId}`;
  
  localStorage.setItem(reviewKey, 'true');
  sessionStorage.setItem(reviewKey, 'true');
  
  return `Консультация #${consultationId} отмечена как имеющая отзыв`;
};

// Утилита для проверки наличия отзыва
// Может быть вызвана в консоли разработчика: checkReviewStatus(consultationId)
window.checkReviewStatus = (consultationId) => {
  if (!consultationId) {
    return 'Ошибка: необходимо указать ID консультации';
  }
  
  const reviewKey = `review_added_${consultationId}`;
  const reviewShownKey = `review_shown_${consultationId}`;
  
  const inLocalStorage = localStorage.getItem(reviewKey) === 'true';
  const inSessionStorage = sessionStorage.getItem(reviewKey) === 'true';
  const reviewShown = sessionStorage.getItem(reviewShownKey) === 'true';
  
  const status = {
    inLocalStorage,
    inSessionStorage,
    reviewShown,
    consultationId
  };
  
  return status;
};

// ВАЖНОЕ ИСПРАВЛЕНИЕ: блокируем все запросы к /token/ws
// Это решает проблему с бесконечными запросами к несуществующему эндпоинту
const originalFetch = window.fetch;
window.fetch = function(resource, options) {
  // Если URL содержит /token/ws, блокируем запрос
  if (typeof resource === 'string' && resource.includes('/token/ws')) {
    console.warn('🛑 Заблокирован запрос к несуществующему эндпоинту /token/ws');
    // Возвращаем промис с ошибкой, чтобы код обработки ошибок сработал корректно
    return Promise.reject(new Error('Запрос к /token/ws заблокирован'));
  }
  // Иначе выполняем оригинальный fetch
  return originalFetch.apply(this, arguments);
};

// Перехватываем также XMLHttpRequest для блокирования запросов к /token/ws
const originalXHROpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  if (typeof url === 'string' && url.includes('/token/ws')) {
    console.warn('🛑 Заблокирован XHR запрос к несуществующему эндпоинту /token/ws');
    // Устанавливаем флаг, что запрос должен быть заблокирован
    this._blockRequest = true;
  }
  return originalXHROpen.call(this, method, url, ...args);
};

const originalXHRSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function(...args) {
  if (this._blockRequest) {
    // Эмулируем ошибку, не отправляя запрос
    setTimeout(() => {
      const event = new ProgressEvent('error');
      this.dispatchEvent(event);
    }, 0);
    return;
  }
  return originalXHRSend.apply(this, args);
};

// Обработчик глобальных ошибок
window.addEventListener('error', (event) => {
});

// Убедимся, что DOM готов для рендеринга
const rootElement = document.getElementById('root');
if (!rootElement) {
} else {
  try {
    // Точка входа в приложение
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <BrowserRouter>
          <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <ThemeProvider theme={muiTheme}>
              <NextUIProvider>
                <App />
                <ToastContainer />
              </NextUIProvider>
            </ThemeProvider>
          </GoogleOAuthProvider>
        </BrowserRouter>
      </React.StrictMode>
    )
  } catch (error) {
    // Показываем сообщение об ошибке пользователю
    rootElement.innerHTML = `
      <div style="text-align: center; margin-top: 50px; font-family: Arial, sans-serif;">
        <h1>Произошла ошибка при загрузке приложения</h1>
        <p>Пожалуйста, обновите страницу или попробуйте позже.</p>
        <button onclick="location.reload()">Обновить страницу</button>
      </div>
    `;
  }
}