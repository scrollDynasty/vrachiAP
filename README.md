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

**healzy.uz** - это комплексная медицинская платформа, которая обеспечивает безопасное и удобное взаимодействие между врачами и пациентами через онлайн консультации. Система поддерживает веб-интерфейс, мобильное Android приложение и предоставляет полный набор инструментов для управления медицинскими консультациями.

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
- 🧠 **AI Диагностика симптомов** с машинным обучением

---

## 🧠 AI Диагностика

**VrachiApp** включает в себя продвинутую систему искусственного интеллекта для предварительной диагностики медицинских симптомов. Система использует современные нейросети и машинное обучение для анализа симптомов пациентов и предоставления диагностических рекомендаций.

### 🎯 Возможности AI системы

- **🔍 Анализ симптомов** - Интеллектуальный анализ описанных симптомов
- **🏥 Предварительная диагностика** - Определение возможных заболеваний
- **📈 Оценка срочности** - Определение критичности состояния
- **💊 Рекомендации** - Предложения по дальнейшим действиям
- **📚 База знаний** - Обширная медицинская информация
- **🌐 Многоязычность** - Поддержка русского, английского и узбекского языков

### 🧬 Технологии AI

- **🤖 BiomedNLP-PubMedBERT** - Специализированный медицинский трансформер
- **🎛️ Scikit-learn** - Классификаторы симптомов и заболеваний
- **📊 TensorFlow/PyTorch** - Глубокое обучение
- **🔄 Continuous Learning** - Система непрерывного обучения
- **⚡ Real-time Inference** - Быстрый анализ в реальном времени

### 📊 Источники данных

#### Международные медицинские источники:
- **Mayo Clinic** - Авторитетная медицинская информация
- **WebMD** - Медицинские статьи и симптомы
- **PubMed** - Научные медицинские публикации

#### Локальные источники:
- **Русскоязычные медицинские ресурсы**
- **Узбекские медицинские справочники**
- **Локализованная медицинская терминология**

### 🔧 AI Компоненты

```
backend/ai_service/
├── __init__.py           # Основной AI модуль
├── data_collector.py     # Сбор медицинских данных
├── inference.py          # Обработка запросов и предсказания
├── model_trainer.py      # Обучение и переобучение моделей
├── utils.py              # Утилиты, валидация, мониторинг
└── requirements.txt      # AI зависимости
```

### 🚀 Быстрый старт AI системы

#### 1. Установка AI зависимостей
```bash
cd backend
pip install -r ai_service/requirements.txt
```

#### 2. Первоначальная настройка
```bash
# Создание директорий для моделей
mkdir -p ai_service/models ai_service/data

# Загрузка предобученных моделей
python -c "from ai_service.model_trainer import ModelTrainer; ModelTrainer().download_pretrained_models()"
```

#### 3. Сбор данных и обучение
```bash
# Автоматический сбор данных
python -c "from ai_service.data_collector import DataCollector; DataCollector().collect_all_sources(limit=1000)"

# Обучение моделей
python -c "from ai_service.model_trainer import ModelTrainer; ModelTrainer().train_all_models()"
```

### 📋 AI API Эндпоинты

| Группа | Метод | Эндпоинт | Описание |
|--------|-------|----------|----------|
| **AI Диагностика** | POST | `/api/ai/diagnosis` | Анализ симптомов |
| | GET | `/api/ai/disease/{name}` | Информация о заболевании |
| | GET | `/api/ai/patient/history` | История AI диагностики |
| **Администрирование** | POST | `/api/ai/admin/train` | Обучение моделей |
| | POST | `/api/ai/admin/collect-data` | Сбор новых данных |
| | GET | `/api/ai/admin/stats` | Статистика AI системы |

### 🔍 Пример использования AI API

#### Анализ симптомов
```bash
curl -X POST "http://localhost:8000/api/ai/diagnosis" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "symptoms_description": "У меня болит голова уже 3 дня, температура 38.2°C",
    "patient_age": 28,
    "patient_gender": "female",
    "additional_info": "Симптомы усилились после стресса"
  }'
```

#### Ответ AI системы
```json
{
  "success": true,
  "data": {
    "detected_symptoms": [
      {"name": "головная боль", "confidence": 0.95},
      {"name": "лихорадка", "confidence": 0.87}
    ],
    "possible_diseases": [
      {"name": "мигрень", "confidence": 0.78, "urgency": "medium"},
      {"name": "грипп", "confidence": 0.65, "urgency": "high"}
    ],
    "recommendations": [
      "Обратитесь к терапевту для точной диагностики",
      "Пейте больше жидкости",
      "Принимайте жаропонижающие при температуре выше 38.5°C"
    ],
    "urgency_level": "medium",
    "confidence_score": 0.82
  }
}
```

### 🎛️ Административные функции

#### Обучение моделей (только для администраторов)
```bash
# Обучение всех моделей
curl -X POST "http://localhost:8000/api/ai/admin/train" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"model_type": "all", "epochs": 10}'
```

#### Сбор новых данных
```bash
# Сбор данных из медицинских источников
curl -X POST "http://localhost:8000/api/ai/admin/collect-data" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sources": ["mayo_clinic", "webmd", "pubmed"], "limit": 1000}'
```

### 📊 Мониторинг AI системы

#### Основные метрики
- **Точность диагностики** - Процент правильных предсказаний
- **Время ответа** - Среднее время обработки запроса
- **Использование ресурсов** - CPU, RAM, GPU загрузка
- **Количество запросов** - Статистика использования

#### Просмотр статистики
```bash
curl -X GET "http://localhost:8000/api/ai/admin/stats" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

### 🖥️ Интерфейс для пациентов

AI диагностика доступна пациентам через:
- **Веб-интерфейс** - Страница "🧠 AI Диагностика"
- **Мобильное приложение** - Встроенный AI помощник
- **Чат-бот** - Интеграция в систему консультаций

### ⚠️ Важные предупреждения

> **Медицинская ответственность**: AI система предоставляет только предварительную информацию и не заменяет профессиональную медицинскую консультацию. При серьезных симптомах обязательно обратитесь к врачу.

> **Точность данных**: Система постоянно обучается и улучшается, но может давать неточные результаты. Всегда консультируйтесь с квалифицированным медицинским специалистом.

### 📖 Дополнительная документация

Подробная документация по AI системе доступна в файле: **[AI_README.md](AI_README.md)**

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

#### 🧠 AI/ML Стек
- **PyTorch** - Фреймворк глубокого обучения
- **Transformers** - Библиотека от Hugging Face
- **Scikit-learn** - Машинное обучение
- **BiomedNLP-PubMedBERT** - Медицинский трансформер
- **Pandas/NumPy** - Обработка данных
- **BeautifulSoup** - Парсинг медицинских данных
- **AsyncIO** - Асинхронная обработка

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

# AI Configuration
AI_MODEL_PATH=./ai_service/models/
AI_DATA_PATH=./ai_service/data/
HUGGING_FACE_TOKEN=your_hugging_face_token
DEFAULT_MODEL_NAME=microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext
USE_GPU=false
ENABLE_CACHING=true
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
│   ├── ai_router.py                # AI API роуты
│   ├── 📂 ai_service/              # AI система диагностики
│   │   ├── __init__.py             # Основной AI модуль
│   │   ├── data_collector.py       # Сбор медицинских данных
│   │   ├── inference.py            # AI инференс и предсказания
│   │   ├── model_trainer.py        # Обучение моделей
│   │   ├── utils.py                # AI утилиты и валидация
│   │   └── requirements.txt        # AI зависимости
│   ├── requirements.txt            # Python зависимости
│   └── uploads/                    # Загруженные файлы
│
├── 📂 frontend/                    # React Frontend
│   ├── src/
│   │   ├── components/             # React компоненты
│   │   ├── pages/                  # Страницы приложения
│   │   │   └── AIDiagnosisPage.jsx # Страница AI диагностики
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
| **AI Диагностика** | POST | `/api/ai/diagnosis` | Анализ симптомов |
| | GET | `/api/ai/disease/{name}` | Информация о заболевании |
| | GET | `/api/ai/patient/history` | История AI диагностики |
| **AI Администрирование** | POST | `/api/ai/admin/train` | Обучение моделей |
| | POST | `/api/ai/admin/collect-data` | Сбор данных |
| | GET | `/api/ai/admin/stats` | Статистика AI |

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
- 🧠 **Управление AI системой**
  - ✅ Обучение и переобучение моделей
  - ✅ Сбор и обновление медицинских данных
  - ✅ Мониторинг точности диагностики
  - ✅ Настройка AI параметров

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
- 🧠 **AI Помощник** - Встроенная диагностика симптомов
- 🎙️ **Голосовой ввод** - Описание симптомов голосом

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

#### 🧠 AI Метрики
- Количество AI диагностик
- Точность предсказаний моделей
- Время ответа AI системы
- Использование GPU/CPU для AI
- Статистика по источникам данных

### 📝 Логирование
```bash
# Просмотр логов backend
tail -f backend/app.log

# Просмотр логов AI системы
tail -f backend/logs/ai_service.log

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

# AI система тесты
cd backend
python -m pytest ai_service/tests/ -v

# Frontend тесты
cd frontend
npm test

# Android тесты
cd app
./gradlew test
```

### 📋 Покрытие тестами
- **Backend**: 85%+ покрытие API эндпоинтов
- **AI Service**: 80%+ покрытие моделей и алгоритмов
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
| **API эндпоинтов** | 90+ (включая AI) |
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
- [x] **AI Диагностика** - Система анализа симптомов ✅
- [ ] **iOS приложение** (React Native)
- [ ] **Видеозвонки** (WebRTC интеграция)
- [ ] **Платежная система** (Stripe/PayPal)
- [ ] **AI Улучшения** - Голосовой ввод, изображения
- [ ] **Телемедицина** расширения
- [ ] **Multi-tenant** архитектура

### 🔮 Долгосрочные цели
- [ ] **Blockchain** для медицинских записей
- [x] **ML/AI** анализ симптомов ✅
- [ ] **Продвинутый AI** - Анализ медицинских изображений
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
- [🧠 Подробная AI документация](AI_README.md) - **Полное руководство по AI системе**
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