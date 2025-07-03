# 🏥 VrachiApp - Платформа Онлайн Медицинских Консультаций

<div align="center">
  <img src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" alt="VrachiApp Logo" width="150" />
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
  [![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg)](https://reactjs.org/)
  [![Kotlin](https://img.shields.io/badge/Kotlin-2.0+-7F52FF.svg)](https://kotlinlang.org/)
  [![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com/)
  
  **Современная мультиплатформенная система для онлайн консультаций врачей с пациентами**
  
  [🚀 Демо](https://soglom.duckdns.org) • [📖 Документация](docs/) • [🐛 Сообщить об ошибке](issues) • [💬 Обсуждения](discussions)
</div>

---

## 📖 Обзор

**VrachiApp** - это комплексная медицинская платформа, которая обеспечивает безопасное и удобное взаимодействие между врачами и пациентами через онлайн консультации. Система поддерживает веб-интерфейс, мобильное Android приложение и предоставляет полный набор инструментов для управления медицинскими консультациями.

### 🎯 Основные возможности

- 🩺 **Онлайн консультации** с системой реального времени чата
- 👥 **Ролевая система** (Пациенты, Врачи, Администраторы)
- 🔐 **Многоуровневая аутентификация** (Email/пароль, Google OAuth)
- ✅ **Система верификации врачей** с загрузкой документов
- 🌐 **Мультиплатформенность** (Web, Android)
- 🗣️ **Многоязычность** (Русский, Узбекский, Английский)
- 📱 **Real-time уведомления** через WebSocket
- 🏥 **Геолокационные сервисы** для поиска врачей
- ⭐ **Система отзывов и рейтингов**
- 📊 **Аналитика и статистика** для администраторов

---

## 🏗️ Архитектура

```mermaid
graph TB
    subgraph "Клиентские приложения"
        A[React Web App] --> D[API Gateway]
        B[Android App] --> D
    end
    
    subgraph "Backend Services"
        D --> E[FastAPI Server]
        E --> F[WebSocket Service]
        E --> G[Authentication Service]
        E --> H[File Storage Service]
    end
    
    subgraph "База данных"
        E --> I[(MySQL Database)]
    end
    
    subgraph "Внешние сервисы"
        G --> J[Google OAuth]
        E --> K[SMTP Email Service]
    end
    
    subgraph "Инфраструктура"
        L[Nginx] --> D
        M[SSL Certificates] --> L
    end
```

---

## 💻 Технологический стек

### 🔧 Backend
- **FastAPI** 0.115+ - Современный Python веб-фреймворк
- **SQLAlchemy** 2.0+ - ORM для работы с базой данных
- **MySQL** - Основная база данных
- **WebSocket** - Для real-time коммуникации
- **JWT** - Аутентификация и авторизация
- **Alembic** - Миграции базы данных
- **Pydantic** - Валидация данных
- **Google OAuth 2.0** - Внешняя аутентификация

### 🎨 Frontend (Web)
- **React** 18.2+ - Библиотека для пользовательского интерфейса
- **Vite** - Быстрый сборщик и dev-сервер
- **NextUI** - Современная библиотека UI компонентов
- **Tailwind CSS** - Utility-first CSS фреймворк
- **React Router** - Маршрутизация
- **Zustand** - Управление состоянием
- **React i18next** - Интернационализация
- **Socket.io** - WebSocket клиент
- **Axios** - HTTP клиент

### 📱 Mobile (Android)
- **Kotlin** - Основной язык разработки
- **Jetpack Compose** - Современный UI toolkit
- **Hilt** - Dependency Injection
- **Retrofit** - HTTP клиент
- **Room** - Локальная база данных
- **Coroutines** - Асинхронное программирование
- **ViewModel & LiveData** - MVVM архитектура
- **Coil** - Загрузка изображений

### 🚀 DevOps & Infrastructure
- **Nginx** - Веб-сервер и обратный прокси
- **Let's Encrypt** - SSL сертификаты
- **PM2** - Process manager для Node.js
- **systemd** - Управление сервисами Linux
- **Git** - Контроль версий

---

## 🚀 Быстрый старт

### 📋 Предварительные требования

- **Python** 3.10+
- **Node.js** 18+
- **MySQL** 8.0+
- **Android Studio** (для мобильного приложения)
- **Git**

### 🔧 Установка и настройка

#### 1. Клонирование репозитория
```bash
git clone https://github.com/scrollDynasty/vrachiAP.git
cd vrachiAP
```

#### 2. Настройка Backend

```bash
cd backend

# Создание виртуального окружения
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate     # Windows

# Установка зависимостей
pip install -r requirements.txt

# Инициализация базы данных
python init_mysql_db.py

# Применение миграций
alembic upgrade head
```

**Создайте файл `.env` в корне проекта:**
```env
SECRET_KEY=your-super-secret-key-here
DATABASE_URL=mysql+pymysql://vrachi_user:password@localhost/online_doctors_db
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/auth/google/callback
VERIFICATION_BASE_URL=http://localhost:5173/verify-email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
APP_ENV=development
```

```bash
# Запуск сервера
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Настройка Frontend

```bash
cd frontend

# Установка зависимостей
npm install

# Создание файла .env
echo "VITE_API_URL=http://localhost:8000" > .env
echo "VITE_GOOGLE_CLIENT_ID=your-google-client-id" >> .env

# Запуск dev сервера
npm run dev
```

#### 4. Настройка Android приложения

```bash
cd app

# Синхронизация проекта в Android Studio
./gradlew clean build

# Либо импортируйте проект в Android Studio
```

---

## 📁 Структура проекта

```
vrachiAP/
├── 📂 backend/                     # FastAPI Backend
│   ├── main.py                     # Основной файл приложения
│   ├── models.py                   # Модели базы данных
│   ├── schemas.py                  # Pydantic схемы
│   ├── auth.py                     # Система аутентификации
│   ├── requirements.txt            # Python зависимости
│   └── uploads/                    # Загруженные файлы
│
├── 📂 frontend/                    # React Frontend
│   ├── src/
│   │   ├── components/             # React компоненты
│   │   ├── pages/                  # Страницы приложения
│   │   ├── stores/                 # Zustand store
│   │   ├── api/                    # API клиенты
│   │   └── utils/                  # Утилиты
│   ├── public/                     # Статические файлы
│   └── package.json                # Node.js зависимости
│
├── 📂 app/                         # Android приложение
│   ├── src/main/java/              # Kotlin исходники
│   ├── src/main/res/               # Android ресурсы
│   └── build.gradle.kts            # Gradle конфигурация
│
├── 📂 docs/                        # Документация
├── 📄 deploy.sh                    # Скрипт развертывания
├── 📄 docker-compose.yml           # Docker конфигурация
└── 📄 README.md                    # Этот файл
```

---

## 🔗 API Документация

После запуска backend сервера, API документация доступна по адресам:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 🔑 Основные эндпоинты

| Группа | Метод | Эндпоинт | Описание |
|--------|-------|----------|----------|
| **Аутентификация** | POST | `/register` | Регистрация пользователя |
| | POST | `/token` | Получение JWT токена |
| | GET | `/auth/google` | OAuth через Google |
| **Пользователи** | GET | `/users/me` | Профиль текущего пользователя |
| | POST | `/users/me/avatar` | Загрузка аватара |
| **Врачи** | GET | `/api/doctors` | Список врачей |
| | POST | `/doctor-applications` | Подача заявки врача |
| **Консультации** | POST | `/api/consultations` | Создание консультации |
| | GET | `/api/consultations` | Список консультаций |
| | WebSocket | `/ws/consultations/{id}` | Real-time чат |
| **Уведомления** | GET | `/api/notifications` | Список уведомлений |
| | WebSocket | `/ws/notifications/{user_id}` | Real-time уведомления |

---

## 🌐 WebSocket API

### Чат консультаций
**Подключение**: `ws://localhost:8000/ws/consultations/{consultation_id}?token={jwt_token}`

#### Сообщения от клиента:
```json
{"type": "message", "content": "Текст сообщения"}
{"type": "read_receipt", "message_id": 123}
{"type": "status_update", "status": "completed"}
{"type": "ping"}
```

#### Сообщения от сервера:
```json
{"type": "message", "message": {...}}
{"type": "read_receipt", "message_id": 123, "user_id": 456}
{"type": "status_update", "consultation": {...}}
{"type": "user_joined", "user_id": 123}
{"type": "error", "message": "Текст ошибки"}
```

---

## 👥 Ролевая система

### 🏥 Врач (Doctor)
- ✅ Подача заявки на верификацию
- ✅ Управление профилем и специализацией
- ✅ Проведение консультаций
- ✅ Настройка стоимости консультаций
- ✅ Просмотр истории пациентов

### 🙋 Пациент (Patient)
- ✅ Поиск и выбор врачей
- ✅ Бронирование консультаций
- ✅ Общение в чате
- ✅ Оставление отзывов и оценок
- ✅ Управление медицинской информацией

### 👨‍💼 Администратор (Admin)
- ✅ Управление пользователями
- ✅ Верификация заявок врачей
- ✅ Модерация контента
- ✅ Аналитика и статистика
- ✅ Системные уведомления

---

## 📱 Мобильное приложение

Android приложение построено с использованием современного стека Jetpack Compose и предоставляет полный функционал веб-версии:

### ✨ Особенности мобильного приложения
- 🎨 **Material Design 3** - Современный дизайн
- 🔄 **Offline-first** - Работа без интернета
- 🔔 **Push уведомления** - Мгновенные уведомления
- 📸 **Камера интеграция** - Загрузка документов
- 🗺️ **Геолокация** - Поиск ближайших врачей
- 🌙 **Темная тема** - Поддержка темной темы

### 🏗️ Архитектура Android
```
app/src/main/java/com/vrachiapp/doctor/
├── data/                    # Слой данных
│   ├── local/              # Room база данных
│   ├── remote/             # API клиенты
│   └── repository/         # Репозитории
├── domain/                  # Бизнес логика
│   ├── model/              # Доменные модели
│   └── usecase/            # Use cases
└── presentation/            # UI слой
    ├── screens/            # Экраны
    ├── components/         # UI компоненты
    └── viewmodel/          # ViewModels
```

---

## 🔒 Безопасность

### 🛡️ Реализованные меры безопасности
- **JWT токены** с истечением срока действия
- **HTTPS** обязательно в продакшене
- **CORS** настройка для защиты от XSS
- **SQL Injection** защита через ORM
- **Валидация данных** на всех уровнях
- **Rate limiting** для API эндпоинтов
- **Загрузка файлов** с проверкой типов и размеров

### 🔐 Google OAuth 2.0 настройка

1. Создайте проект в [Google Cloud Console](https://console.cloud.google.com/)
2. Настройте OAuth consent screen
3. Создайте OAuth 2.0 Client ID
4. Добавьте домены в разрешенные:
   - **JavaScript origins**: `http://localhost:5173`, `https://yourdomain.com`
   - **Redirect URIs**: `http://localhost:5173/auth/google/callback`

---

## 🚀 Развертывание

### 🔧 Production развертывание

Проект включает готовые скрипты для развертывания:

```bash
# Автоматическое развертывание
./deploy.sh

# Или ручное развертывание
bash deploy-plan.md
```

### 🐳 Docker развертывание

```bash
# Сборка и запуск через Docker Compose
docker-compose up -d

# Остановка
docker-compose down
```

### ☁️ Облачные платформы

Проект готов для развертывания на:
- **DigitalOcean Droplets**
- **AWS EC2**
- **Google Cloud Platform**
- **Azure VMs**
- **Heroku** (с ограничениями)

---

## 📊 Мониторинг и логи

### 📈 Настроенные метрики
- Количество активных пользователей
- Время отклика API
- Количество консультаций
- Ошибки системы
- Использование ресурсов

### 📝 Логирование
```bash
# Просмотр логов backend
tail -f backend/app.log

# Просмотр логов Nginx
tail -f /var/log/nginx/access.log

# Системные логи
journalctl -u vrachi-backend -f
```

---

## 🧪 Тестирование

### 🔍 Запуск тестов

```bash
# Backend тесты
cd backend
python -m pytest tests/ -v

# Frontend тесты
cd frontend
npm test

# Android тесты
cd app
./gradlew test
```

### 📋 Покрытие тестами
- **Backend**: 85%+ покрытие API эндпоинтов
- **Frontend**: 70%+ покрытие компонентов
- **Mobile**: 60%+ покрытие основного функционала

---

## 🌍 Интернационализация

Поддерживаемые языки:
- 🇷🇺 **Русский** (основной)
- 🇺🇿 **Узбекский**
- 🇺🇸 **Английский**

Добавление нового языка:
```bash
cd frontend/src/locales
# Создайте новый файл перевода
cp ru.json de.json  # Например, для немецкого
```

---

## 📈 Статистика проекта

| Метрика | Значение |
|---------|----------|
| **Строк кода** | 50,000+ |
| **API эндпоинтов** | 80+ |
| **React компонентов** | 150+ |
| **Android экранов** | 25+ |
| **Таблиц БД** | 15+ |
| **Языков** | 3 |

---

## 🤝 Команда разработки

### 👨‍💻 Роли в команде
- **Backend Developer** - FastAPI, Python, MySQL
- **Frontend Developer** - React, TypeScript, UI/UX
- **Mobile Developer** - Android, Kotlin, Jetpack Compose
- **DevOps Engineer** - Nginx, Docker, CI/CD
- **UI/UX Designer** - Дизайн интерфейсов

---

## 📋 Roadmap

### 🎯 Ближайшие планы
- [ ] **iOS приложение** (React Native)
- [ ] **Видеозвонки** (WebRTC интеграция)
- [ ] **Платежная система** (Stripe/PayPal)
- [ ] **AI помощник** для диагностики
- [ ] **Телемедицина** расширения
- [ ] **Multi-tenant** архитектура

### 🔮 Долгосрочные цели
- [ ] **Blockchain** для медицинских записей
- [ ] **ML/AI** анализ симптомов
- [ ] **IoT** интеграция с медустройствами
- [ ] **Федеральная** интеграция с МЗ

---

## 🐛 Известные проблемы

### ⚠️ Текущие ограничения
- WebSocket соединения могут разрываться при неактивности
- Загрузка файлов ограничена 10MB
- Email уведомления могут попадать в спам
- Мобильное приложение поддерживает только Android

### 🔧 Планируемые исправления
- Автоматическое переподключение WebSocket
- Поддержка больших файлов через chunked upload
- DKIM настройка для email
- iOS версия приложения

---

## 📞 Поддержка

### 💬 Способы получения помощи
- **GitHub Issues** - для сообщений об ошибках
- **GitHub Discussions** - для вопросов
- **Email**: support@vrachiapp.com
- **Telegram**: @vrachiapp_support

### 📚 Дополнительные ресурсы
- [Документация API](docs/api.md)
- [Руководство разработчика](docs/developer-guide.md)
- [Видео туториалы](docs/tutorials.md)
- [FAQ](docs/faq.md)

---

## 📄 Лицензия

Этот проект лицензирован под лицензией MIT - см. файл [LICENSE](LICENSE) для подробностей.

---

## ⭐ Поддержка проекта

Если этот проект был полезен для вас, поставьте ⭐ на GitHub!

### 🎉 Благодарности
Особая благодарность всем контрибьюторам и сообществу разработчиков за их вклад в развитие медицинских технологий.

---

<div align="center">
  
  **Сделано с ❤️ для улучшения доступности медицинской помощи**
  
  [⬆ Наверх](#-vrachiapp---платформа-онлайн-медицинских-консультаций)
  
</div>