# 🧠 AI Диагностика - Руководство по использованию

Подробное руководство по настройке, обучению и использованию системы AI диагностики в VrachiAP.

## 📋 Содержание

- [Обзор системы](#обзор-системы)
- [Быстрый старт](#быстрый-старт)
- [Установка и настройка](#установка-и-настройка)
- [Обучение моделей](#обучение-моделей)
- [Сбор данных](#сбор-данных)
- [API документация](#api-документация)
- [Использование](#использование)
- [Мониторинг](#мониторинг)
- [Устранение неисправностей](#устранение-неисправностей)

## 🎯 Обзор системы

AI система диагностики использует современные нейросети для анализа медицинских симптомов и предоставления диагностических рекомендаций.

### Основные компоненты

```
backend/ai_service/
├── __init__.py           # Основной модуль AI с классом AIService
├── data_collector.py     # Сбор медицинских данных из открытых источников
├── inference.py          # Модуль инференса для обработки запросов
├── model_trainer.py      # Обучение и переобучение моделей
├── utils.py              # Утилиты, валидация, мониторинг
└── requirements.txt      # Зависимости для AI
```

### Поддерживаемые модели

- **BiomedNLP-PubMedBERT** - Трансформер для медицинских текстов
- **Symptom Classifier** - Классификатор симптомов (sklearn)
- **Disease Classifier** - Классификатор заболеваний (sklearn)
- **Medical Text Processor** - Обработка медицинских текстов

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
cd backend
pip install -r ai_service/requirements.txt
```

### 2. Первоначальная настройка

```bash
# Создание директории для моделей
mkdir -p ai_service/models
mkdir -p ai_service/data

# Загрузка предобученных моделей
python -c "from ai_service.model_trainer import ModelTrainer; ModelTrainer().download_pretrained_models()"
```

### 3. Сбор данных

```bash
# Автоматический сбор данных
python -c "from ai_service.data_collector import DataCollector; DataCollector().collect_all_sources(limit=1000)"
```

### 4. Обучение моделей

```bash
# Обучение всех моделей
python -c "from ai_service.model_trainer import ModelTrainer; ModelTrainer().train_all_models()"
```

### 5. Тестирование

```bash
# Тест AI сервиса
python -c "
from ai_service import AIService
ai = AIService()
result = ai.analyze_symptoms('у меня болит голова и температура')
print(result)
"
```

## 🔧 Установка и настройка

### Системные требования

- **Python**: 3.8+
- **RAM**: минимум 8GB (рекомендуется 16GB)
- **GPU**: опционально, для ускорения обучения
- **Диск**: 10GB свободного места

### Установка Python зависимостей

```bash
# Основные AI библиотеки
pip install torch torchvision torchaudio
pip install transformers
pip install scikit-learn
pip install pandas numpy

# Дополнительные зависимости
pip install requests beautifulsoup4 lxml
pip install aiohttp asyncio
pip install matplotlib seaborn
pip install python-dotenv
```

### Конфигурация

Создайте файл `backend/.env` с настройками:

```env
# AI Configuration
AI_MODEL_PATH=./ai_service/models/
AI_DATA_PATH=./ai_service/data/
HUGGING_FACE_TOKEN=your_token_here

# Model Settings
DEFAULT_MODEL_NAME=microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext
MAX_SEQUENCE_LENGTH=512
BATCH_SIZE=16

# Data Collection
DATA_COLLECTION_ENABLED=true
MAX_ARTICLES_PER_SOURCE=1000
UPDATE_INTERVAL_HOURS=24

# Performance
USE_GPU=true
ENABLE_CACHING=true
CACHE_SIZE=1000
```

## 🎓 Обучение моделей

### Автоматическое обучение (рекомендуется)

#### Через API (для администраторов)

```bash
# Обучение всех моделей
curl -X POST "http://localhost:8000/api/ai/admin/train" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "all",
    "epochs": 10,
    "learning_rate": 0.001,
    "batch_size": 16
  }'

# Обучение конкретной модели
curl -X POST "http://localhost:8000/api/ai/admin/train" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "symptom_classifier",
    "epochs": 5
  }'
```

#### Через Python

```python
from backend.ai_service.model_trainer import ModelTrainer

trainer = ModelTrainer()

# Обучение всех моделей
trainer.train_all_models()

# Обучение конкретных моделей
trainer.train_symptom_classifier(epochs=10)
trainer.train_disease_classifier(epochs=10)
trainer.train_medical_transformer(epochs=5)
```

### Ручное обучение

#### 1. Подготовка данных

```python
from backend.ai_service.data_collector import DataCollector

collector = DataCollector()

# Сбор данных из разных источников
data = collector.collect_training_data()
print(f"Собрано {len(data)} образцов для обучения")
```

#### 2. Обучение классификатора симптомов

```python
from backend.ai_service.model_trainer import ModelTrainer

trainer = ModelTrainer()

# Настройка параметров
config = {
    'epochs': 10,
    'learning_rate': 0.001,
    'batch_size': 16,
    'validation_split': 0.2
}

# Обучение
trainer.train_symptom_classifier(**config)
```

#### 3. Обучение классификатора заболеваний

```python
trainer.train_disease_classifier(
    epochs=15,
    learning_rate=0.0005,
    use_pretrained=True
)
```

#### 4. Обучение трансформера

```python
trainer.train_medical_transformer(
    model_name='microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext',
    epochs=5,
    learning_rate=2e-5
)
```

### Расширенные настройки обучения

```python
# Пример продвинутой конфигурации
advanced_config = {
    'model_type': 'symptom_classifier',
    'architecture': 'random_forest',
    'hyperparameters': {
        'n_estimators': 100,
        'max_depth': 10,
        'random_state': 42
    },
    'cross_validation': True,
    'cv_folds': 5,
    'feature_selection': True,
    'optimize_hyperparameters': True
}

trainer.train_with_config(advanced_config)
```

## 📊 Сбор данных

### Автоматический сбор

#### Через API

```bash
# Сбор из всех источников
curl -X POST "http://localhost:8000/api/ai/admin/collect-data" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sources": ["mayo_clinic", "webmd", "pubmed", "russian_medical"],
    "limit": 1000,
    "languages": ["en", "ru", "uz"]
  }'
```

#### Через Python

```python
from backend.ai_service.data_collector import DataCollector

collector = DataCollector()

# Сбор из всех источников
collector.collect_all_sources(limit=1000)

# Сбор из конкретных источников
collector.collect_mayo_clinic_data(limit=500)
collector.collect_webmd_data(limit=500)
collector.collect_pubmed_data(limit=200)
```

### Поддерживаемые источники

#### Международные источники

- **Mayo Clinic** (`mayo_clinic`)
  - URL: https://www.mayoclinic.org
  - Данные: Симптомы, заболевания, лечение
  - Язык: Английский

- **WebMD** (`webmd`)
  - URL: https://www.webmd.com
  - Данные: Медицинские статьи, симптомы
  - Язык: Английский

- **PubMed** (`pubmed`)
  - URL: https://pubmed.ncbi.nlm.nih.gov
  - Данные: Научные публикации
  - Язык: Английский

#### Русскоязычные источники

- **Википедия** (`wikipedia_ru`)
  - URL: https://ru.wikipedia.org
  - Данные: Медицинские статьи
  - Язык: Русский

- **Справочник заболеваний** (`diseases_ru`)
  - URL: https://diseases.ru
  - Данные: Описания болезней
  - Язык: Русский

#### Узбекские источники

- **Medical.uz** (`medical_uz`)
  - URL: https://medical.uz
  - Данные: Медицинская информация
  - Язык: Узбекский

### Кастомный сбор данных

```python
# Добавление нового источника
class CustomDataCollector(DataCollector):
    def collect_custom_source(self, url, limit=100):
        """Сбор данных из кастомного источника"""
        articles = []
        
        # Ваш код для парсинга
        response = self.session.get(url)
        # ... обработка данных
        
        return articles

# Использование
collector = CustomDataCollector()
data = collector.collect_custom_source('https://example.com')
```

## 📚 API документация

### Эндпоинты для пациентов

#### Анализ симптомов

```http
POST /api/ai/diagnosis
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN

{
  "symptoms_description": "У меня болит голова уже 3 дня, температура 38.2°C, слабость и тошнота",
  "patient_age": 28,
  "patient_gender": "female",
  "additional_info": "Симптомы усилились после стресса на работе"
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "analysis_id": "ai_diag_123456",
    "detected_symptoms": [
      {
        "name": "головная боль",
        "confidence": 0.95,
        "severity": "moderate"
      },
      {
        "name": "лихорадка",
        "confidence": 0.87,
        "severity": "high"
      },
      {
        "name": "тошнота",
        "confidence": 0.73,
        "severity": "low"
      }
    ],
    "possible_diseases": [
      {
        "name": "мигрень",
        "confidence": 0.78,
        "urgency": "medium",
        "description": "Сильная головная боль, часто сопровождается тошнотой"
      },
      {
        "name": "грипп",
        "confidence": 0.65,
        "urgency": "high",
        "description": "Вирусная инфекция с лихорадкой и общими симптомами"
      }
    ],
    "recommendations": [
      "Обратитесь к терапевту для точной диагностики",
      "Пейте больше жидкости",
      "Отдыхайте и избегайте стресса",
      "Принимайте жаропонижающие при температуре выше 38.5°C"
    ],
    "urgency_level": "medium",
    "confidence_score": 0.82,
    "next_steps": [
      "Наблюдайте за симптомами в течение 24 часов",
      "Обратитесь к врачу если симптомы ухудшатся"
    ]
  }
}
```

#### Информация о заболевании

```http
GET /api/ai/disease/{disease_name}
Authorization: Bearer YOUR_TOKEN
```

**Пример:**
```http
GET /api/ai/disease/грипп
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "name": "грипп",
    "description": "Острая вирусная инфекция дыхательных путей",
    "symptoms": [
      "высокая температура",
      "головная боль",
      "мышечные боли",
      "кашель",
      "слабость"
    ],
    "causes": [
      "вирусы гриппа типа A, B, C"
    ],
    "treatment": [
      "покой и обильное питье",
      "жаропонижающие препараты",
      "противовирусные средства"
    ],
    "prevention": [
      "вакцинация",
      "избегание контакта с больными",
      "соблюдение гигиены рук"
    ],
    "when_to_see_doctor": [
      "температура выше 39°C",
      "затрудненное дыхание",
      "симптомы длятся более 7 дней"
    ]
  }
}
```

#### История диагностики

```http
GET /api/ai/patient/history
Authorization: Bearer YOUR_TOKEN
```

### Административные эндпоинты

#### Обучение моделей

```http
POST /api/ai/admin/train
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "model_type": "symptom_classifier",
  "epochs": 10,
  "learning_rate": 0.001,
  "batch_size": 16,
  "validation_split": 0.2
}
```

#### Сбор данных

```http
POST /api/ai/admin/collect-data
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "sources": ["mayo_clinic", "webmd", "pubmed"],
  "limit": 1000,
  "languages": ["en", "ru"],
  "force_update": false
}
```

#### Обновление базы знаний

```http
PUT /api/ai/admin/knowledge-base
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "disease_name": "грипп",
  "symptoms": ["лихорадка", "кашель", "головная боль"],
  "treatments": ["покой", "жидкость", "жаропонижающие"],
  "severity": "moderate"
}
```

#### Статистика и мониторинг

```http
GET /api/ai/admin/stats
Authorization: Bearer ADMIN_TOKEN
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "total_diagnoses": 1245,
    "avg_response_time": 2.3,
    "accuracy_metrics": {
      "symptom_detection": 0.87,
      "disease_prediction": 0.73
    },
    "model_status": {
      "symptom_classifier": "active",
      "disease_classifier": "active",
      "medical_transformer": "training"
    },
    "data_statistics": {
      "total_articles": 5420,
      "last_update": "2024-01-15T10:30:00Z",
      "sources_status": {
        "mayo_clinic": "active",
        "webmd": "active",
        "pubmed": "active"
      }
    }
  }
}
```

## 🖥️ Использование

### Для пациентов

#### 1. Доступ к AI диагностике

```
1. Войдите в систему как пациент
2. Перейдите в раздел "🧠 AI Диагностика"
3. Заполните форму с симптомами
4. Получите результат анализа
```

#### 2. Описание симптомов

**Рекомендации для лучших результатов:**

- Опишите симптомы подробно и точно
- Укажите продолжительность симптомов
- Добавьте информацию о возрасте и поле
- Упомяните сопутствующие факторы

**Хорошие примеры:**

```
"У меня сильная головная боль с левой стороны уже 2 дня. 
Боль усиливается при ярком свете. Также есть тошнота и 
чувствительность к звукам."

"Кашель с мокротой зеленого цвета, температура 38.5°C, 
болит горло при глотании. Симптомы появились 3 дня назад."
```

#### 3. Интерпретация результатов

- **Detected Symptoms** - Обнаруженные симптомы с уровнем уверенности
- **Possible Diseases** - Возможные заболевания с вероятностью
- **Recommendations** - Рекомендации по дальнейшим действиям
- **Urgency Level** - Уровень срочности (low, medium, high, urgent)

### Для врачей

#### 1. Просмотр AI анализов пациентов

```python
# Получение истории AI диагностики пациента
patient_history = api.get(f'/api/ai/patient/{patient_id}/history')
```

#### 2. Использование AI как инструмента

```python
# Врач может использовать AI для второго мнения
second_opinion = api.post('/api/ai/doctor/analyze', {
    'symptoms': patient_symptoms,
    'medical_history': patient_history,
    'doctor_notes': 'Дополнительная информация от врача'
})
```

### Для администраторов

#### 1. Мониторинг системы

```bash
# Проверка статуса моделей
curl -X GET "http://localhost:8000/api/ai/admin/stats" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

#### 2. Управление данными

```bash
# Обновление базы знаний
curl -X PUT "http://localhost:8000/api/ai/admin/knowledge-base" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @knowledge_update.json
```

#### 3. Переобучение моделей

```bash
# Запуск переобучения
curl -X POST "http://localhost:8000/api/ai/admin/train" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model_type": "all",
    "epochs": 10,
    "force_retrain": true
  }'
```

## 📈 Мониторинг

### Основные метрики

#### Производительность

```python
from backend.ai_service.utils import PerformanceMonitor

monitor = PerformanceMonitor()

# Получение метрик
metrics = monitor.get_metrics()
print(f"Среднее время ответа: {metrics['avg_response_time']:.2f}s")
print(f"Использование памяти: {metrics['memory_usage']:.1f}%")
print(f"Загрузка CPU: {metrics['cpu_usage']:.1f}%")
```

#### Точность моделей

```python
from backend.ai_service.utils import ModelEvaluator

evaluator = ModelEvaluator()

# Оценка точности
accuracy = evaluator.evaluate_all_models()
print(f"Точность классификации симптомов: {accuracy['symptom_classifier']:.2f}")
print(f"Точность предсказания заболеваний: {accuracy['disease_classifier']:.2f}")
```

### Логирование

#### Настройка логов

```python
import logging

# Настройка логирования для AI сервиса
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ai_service.log'),
        logging.StreamHandler()
    ]
)
```

#### Просмотр логов

```bash
# Просмотр логов AI сервиса
tail -f backend/logs/ai_service.log

# Фильтрация по уровню
grep "ERROR" backend/logs/ai_service.log

# Просмотр последних диагностик
grep "diagnosis_request" backend/logs/ai_service.log | tail -10
```

### Алерты и уведомления

```python
from backend.ai_service.utils import AlertSystem

alert_system = AlertSystem()

# Настройка алертов
alert_system.set_threshold('response_time', 5.0)  # 5 секунд
alert_system.set_threshold('error_rate', 0.1)     # 10% ошибок
alert_system.set_threshold('accuracy', 0.7)       # 70% точность

# Проверка алертов
alerts = alert_system.check_alerts()
for alert in alerts:
    print(f"ALERT: {alert['message']}")
```

## 🛠️ Устранение неисправностей

### Распространенные проблемы

#### 1. Модели не загружаются

```bash
# Проверка существования файлов моделей
ls -la backend/ai_service/models/

# Переустановка моделей
python -c "
from backend.ai_service.model_trainer import ModelTrainer
trainer = ModelTrainer()
trainer.download_pretrained_models()
"
```

#### 2. Низкая точность предсказаний

```bash
# Переобучение моделей с большим количеством данных
python -c "
from backend.ai_service.model_trainer import ModelTrainer
trainer = ModelTrainer()
trainer.train_all_models(epochs=20, force_retrain=True)
"
```

#### 3. Медленный ответ AI

```bash
# Проверка использования ресурсов
top -p $(pgrep -f "python.*main.py")

# Очистка кэша
python -c "
from backend.ai_service.utils import CacheManager
cache = CacheManager()
cache.clear_all()
"
```

#### 4. Ошибки сбора данных

```python
# Тест подключения к источникам данных
from backend.ai_service.data_collector import DataCollector

collector = DataCollector()
status = collector.test_all_sources()

for source, is_available in status.items():
    print(f"{source}: {'✓' if is_available else '✗'}")
```

### Диагностика проблем

#### Проверка статуса системы

```python
from backend.ai_service.utils import SystemDiagnostics

diagnostics = SystemDiagnostics()

# Полная диагностика
report = diagnostics.run_full_check()
print(report)
```

#### Восстановление после сбоя

```bash
# Скрипт восстановления
python -c "
from backend.ai_service.utils import RecoveryManager
recovery = RecoveryManager()
recovery.recover_from_backup()
recovery.rebuild_indices()
recovery.validate_models()
"
```

### Профилирование производительности

```python
import cProfile
import pstats
from backend.ai_service import AIService

# Профилирование AI сервиса
def profile_ai_service():
    ai = AIService()
    result = ai.analyze_symptoms('головная боль и температура')
    return result

# Запуск профилирования
profiler = cProfile.Profile()
profiler.enable()
result = profile_ai_service()
profiler.disable()

# Анализ результатов
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(10)
```

## 🔧 Расширение функциональности

### Добавление новых моделей

#### 1. Создание новой модели

```python
# backend/ai_service/models/new_model.py
class NewMedicalModel:
    def __init__(self):
        self.model = None
        self.tokenizer = None
    
    def load_model(self, model_path):
        # Загрузка модели
        pass
    
    def predict(self, input_data):
        # Предсказание
        pass
```

#### 2. Интеграция в систему

```python
# backend/ai_service/inference.py
from .models.new_model import NewMedicalModel

class MedicalInference:
    def __init__(self):
        # ... существующий код
        self.new_model = NewMedicalModel()
    
    def analyze_with_new_model(self, data):
        return self.new_model.predict(data)
```

### Добавление новых источников данных

#### 1. Расширение DataCollector

```python
# backend/ai_service/data_collector.py
class DataCollector:
    def collect_new_source_data(self, url, limit=100):
        """Сбор данных из нового источника"""
        articles = []
        
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            # Парсинг данных
            
        except Exception as e:
            self.logger.error(f"Ошибка сбора данных: {e}")
        
        return articles
```

#### 2. Настройка конфигурации

```python
# backend/ai_service/config.py
DATA_SOURCES = {
    'new_source': {
        'url': 'https://example.com',
        'enabled': True,
        'rate_limit': 10,  # запросов в минуту
        'headers': {'User-Agent': 'Medical-AI-Bot'}
    }
}
```

## 📊 Отчеты и аналитика

### Создание отчетов

```python
from backend.ai_service.analytics import ReportGenerator

generator = ReportGenerator()

# Ежедневный отчет
daily_report = generator.generate_daily_report()
print(daily_report)

# Отчет по точности
accuracy_report = generator.generate_accuracy_report()
print(accuracy_report)

# Отчет по использованию
usage_report = generator.generate_usage_report()
print(usage_report)
```

### Визуализация данных

```python
import matplotlib.pyplot as plt
from backend.ai_service.analytics import DataVisualizer

visualizer = DataVisualizer()

# График точности по времени
visualizer.plot_accuracy_over_time()

# Распределение диагнозов
visualizer.plot_diagnosis_distribution()

# Время ответа системы
visualizer.plot_response_times()
```

## 🚀 Развертывание в продакшене

### Docker контейнер

```dockerfile
# Dockerfile для AI сервиса
FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
COPY ai_service/requirements.txt ./ai_service/
RUN pip install -r requirements.txt
RUN pip install -r ai_service/requirements.txt

COPY . .

CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Kubernetes deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ai-service
  template:
    metadata:
      labels:
        app: ai-service
    spec:
      containers:
      - name: ai-service
        image: vrachiap/ai-service:latest
        ports:
        - containerPort: 8000
        env:
        - name: AI_MODEL_PATH
          value: "/app/models"
        resources:
          requests:
            memory: "2Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "1000m"
```

## 🔒 Безопасность

### Валидация входных данных

```python
from backend.ai_service.security import InputValidator

validator = InputValidator()

# Валидация симптомов
is_valid = validator.validate_symptoms(symptoms_text)
if not is_valid:
    raise ValueError("Недопустимые данные симптомов")

# Санитизация данных
clean_input = validator.sanitize_input(user_input)
```

### Ограничение доступа

```python
from backend.ai_service.security import RateLimiter

limiter = RateLimiter()

# Ограничение запросов на пользователя
@limiter.limit("10 per minute")
def analyze_symptoms(user_id, symptoms):
    # Анализ симптомов
    pass
```

## 📞 Поддержка

### Контакты

- **Email**: ai-support@vrachiap.com
- **Telegram**: @vrachiap_ai_support
- **GitHub Issues**: [Создать issue](https://github.com/your-username/vrachiAP/issues)

### Документация

- **API Reference**: `http://localhost:8000/docs`
- **Swagger UI**: `http://localhost:8000/redoc`
- **AI Metrics**: `http://localhost:8000/api/ai/admin/stats`

---

**⚠️ Важное предупреждение**: 
Система AI диагностики предназначена только для информационных целей и не заменяет профессиональную медицинскую консультацию. Всегда консультируйтесь с квалифицированным врачом для получения медицинской помощи.

**🔬 Для исследователей**: 
Если вы хотите использовать эту систему в исследовательских целях, пожалуйста, свяжитесь с нами для получения доступа к данным и моделям. 