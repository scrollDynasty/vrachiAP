// ОПТИМИЗАЦИЯ: Service Worker для кеширования и улучшения производительности
const CACHE_NAME = 'healzy-v1';
const STATIC_CACHE = 'healzy-static-v1';
const DYNAMIC_CACHE = 'healzy-dynamic-v1';
const API_CACHE = 'healzy-api-v1';

// ОПТИМИЗАЦИЯ: Критические ресурсы для предзагрузки
const CRITICAL_RESOURCES = [
  '/',
  '/index.html',
  '/static/js/main.js',
  '/static/css/main.css',
  '/favicon.ico'
];

// ОПТИМИЗАЦИЯ: Статические ресурсы для кеширования
const STATIC_RESOURCES = [
  '/static/js/',
  '/static/css/',
  '/static/media/',
  '/images/',
  '/sounds/'
];

// ОПТИМИЗАЦИЯ: API эндпоинты для кеширования
const API_ENDPOINTS = [
  '/api/doctors',
  '/api/specializations',
  '/api/cities',
  '/api/countries',
  '/api/languages'
];

// ОПТИМИЗАЦИЯ: Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Кешируем критические ресурсы
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(CRITICAL_RESOURCES);
      }),
      // Предзагружаем основные ресурсы
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll([
          '/static/js/chunk-vendors.js',
          '/static/css/chunk-vendors.css'
        ]);
      })
    ])
  );
  
  // ОПТИМИЗАЦИЯ: Активируем Service Worker немедленно
  self.skipWaiting();
});

// ОПТИМИЗАЦИЯ: Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Очищаем старые кеши
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Берем контроль над всеми клиентами
      self.clients.claim()
    ])
  );
});

// ОПТИМИЗАЦИЯ: Перехват сетевых запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // ОПТИМИЗАЦИЯ: Стратегия кеширования в зависимости от типа запроса
  if (request.method === 'GET') {
    // Критические ресурсы - Cache First
    if (CRITICAL_RESOURCES.includes(url.pathname)) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }

    // Статические ресурсы - Cache First с обновлением в фоне
    if (STATIC_RESOURCES.some(resource => url.pathname.startsWith(resource))) {
      event.respondWith(cacheFirstWithUpdate(request, STATIC_CACHE));
      return;
    }

    // API запросы - Network First с fallback на кеш
    if (API_ENDPOINTS.some(endpoint => url.pathname.startsWith(endpoint))) {
      event.respondWith(networkFirst(request, API_CACHE));
      return;
    }

    // Остальные запросы - Network First
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// ОПТИМИЗАЦИЯ: Стратегия Cache First
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Возвращаем fallback для критических ресурсов
    if (CRITICAL_RESOURCES.includes(new URL(request.url).pathname)) {
      return new Response('Offline', { status: 503 });
    }
    throw error;
  }
}

// ОПТИМИЗАЦИЯ: Cache First с обновлением в фоне
async function cacheFirstWithUpdate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Обновляем кеш в фоне
  fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response);
    }
  }).catch(() => {
    // Игнорируем ошибки обновления
  });
  
  return cachedResponse || fetch(request);
}

// ОПТИМИЗАЦИЯ: Network First с fallback на кеш
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// ОПТИМИЗАЦИЯ: Обработка push уведомлений
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Новое уведомление',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Healzy', options)
    );
  }
});

// ОПТИМИЗАЦИЯ: Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action) {
    // Обработка действий уведомления
    handleNotificationAction(event.action, event.notification.data);
  } else {
    // Открываем приложение при клике на уведомление
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// ОПТИМИЗАЦИЯ: Обработка действий уведомлений
function handleNotificationAction(action, data) {
  switch (action) {
    case 'open_consultation':
      clients.openWindow(`/consultation/${data.consultationId}`);
      break;
    case 'open_profile':
      clients.openWindow('/profile');
      break;
    default:
      clients.openWindow('/');
  }
}

// ОПТИМИЗАЦИЯ: Синхронизация в фоне
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(performBackgroundSync());
  }
});

// ОПТИМИЗАЦИЯ: Выполнение фоновой синхронизации
async function performBackgroundSync() {
  try {
    // Синхронизируем данные с сервером
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        timestamp: Date.now()
      })
    });

    if (response.ok) {
      console.log('Background sync completed');
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// ОПТИМИЗАЦИЯ: Обработка ошибок
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

// ОПТИМИЗАЦИЯ: Обработка необработанных промисов
self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

// ОПТИМИЗАЦИЯ: Периодическая очистка кеша
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(cleanupCache());
  }
});

// ОПТИМИЗАЦИЯ: Очистка старых кешей
async function cleanupCache() {
  const cacheNames = await caches.keys();
  const cachePromises = cacheNames.map(async (cacheName) => {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    // Удаляем кеши старше 7 дней
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const date = response.headers.get('date');
        if (date && new Date(date).getTime() < weekAgo) {
          await cache.delete(request);
        }
      }
    }
  });
  
  await Promise.all(cachePromises);
} 