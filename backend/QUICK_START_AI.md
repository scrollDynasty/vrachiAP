# 🚀 БЫСТРЫЙ ЗАПУСК AI СИСТЕМЫ ДИАГНОСТИКИ v2.0

> **Обновленная версия с поддержкой Transfer Learning и интеграцией с базой данных**

## 📋 Что нового в версии 2.0

- ✅ **Transfer Learning** - модель становится лучше при повторном обучении
- ✅ **Интеграция с БД** - сохранение истории диагностики и обратной связи
- ✅ **Улучшенный сбор данных** - более качественные медицинские данные
- ✅ **Обновленный интерфейс** - современный и удобный frontend
- ✅ **Непрерывное обучение** - система улучшается на основе отзывов

## 🏃‍♂️ Быстрый старт (5 минут)

### 1. Автоматическая установка
```bash
cd backend
python ai_system/setup_and_train.py --epochs=50
```

### 2. Запуск системы
```bash
# Запуск AI системы в интерактивном режиме
python start_ai.py

# Или запуск полного веб-приложения
python main.py
```

### 3. Тестирование через браузер
- Откройте: http://localhost:5173
- Войдите как пациент
- Перейдите в "AI Диагностика"

## 🔧 Установка по шагам

### 1. Проверка требований
```bash
python --version  # Требуется Python 3.8+
```

### 2. Установка зависимостей
```bash
cd backend/ai_system
pip install -r requirements.txt
```

### 3. Загрузка данных
```bash
python data_downloader.py
```

### 4. Обучение модели
```bash
# Первичное обучение
python train_model.py --epochs 100

# Transfer Learning (дообучение)
python train_model.py --epochs 50 --transfer-learning
```

### 5. Тестирование
```bash
python inference.py
```

## 📊 Параметры обучения

### Базовые настройки
```bash
python train_model.py \
  --epochs 100 \
  --batch-size 32 \
  --learning-rate 0.001
```

### Transfer Learning
```bash
python train_model.py \
  --epochs 50 \
  --transfer-learning \
  --freeze-ratio 0.5
```

### Полный пайплайн с новыми данными
```bash
python setup_and_train.py \
  --epochs=200 \
  --transfer-learning
```

## 🌐 API Эндпоинты

### Диагностика
```bash
# POST /api/ai/diagnose
curl -X POST http://localhost:8000/api/ai/diagnose \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "symptoms": ["головная боль", "температура"],
    "symptoms_description": "Болит голова уже третий день",
    "patient_age": 25,
    "patient_gender": "male"
  }'
```

### Статус модели
```bash
# GET /api/ai/status
curl http://localhost:8000/api/ai/status
```

### Обратная связь
```bash
# POST /api/ai/feedback
curl -X POST http://localhost:8000/api/ai/feedback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "diagnosis_id": 123,
    "was_correct": true
  }'
```

## 🔄 Переобучение модели

### Через API (только админы)
```bash
curl -X POST http://localhost:8000/api/ai/admin/retrain \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "epochs": 100,
    "use_transfer_learning": true,
    "download_new_data": true
  }'
```

### Через командную строку
```bash
# Переобучение с новыми данными
python train_model.py --retrain --epochs 100

# Transfer Learning
python train_model.py --transfer-learning --epochs 50
```

## 📁 Структура файлов

```
backend/ai_system/
├── 📄 data_downloader.py      # Загрузка медицинских данных
├── 🧠 neural_network.py       # Архитектура нейросети + Transfer Learning
├── 🎯 train_model.py         # Обучение модели
├── 🔮 inference.py           # Использование модели
├── ⚙️ setup_and_train.py     # Автоматическая установка
├── 📋 requirements.txt       # Зависимости
├── 📚 README.md             # Документация
└── 📂 trained_models/        # Обученные модели
    ├── best_medical_model.pth
    ├── data_processor.pkl
    └── training_history.json
```

## 🧪 Тестирование

### Интерактивное тестирование
```bash
python start_ai.py
```

### Тестирование через Python
```python
from ai_system.inference import diagnose_symptoms

# Тестируем диагностику
symptoms = ["головная боль", "температура", "кашель"]
result = diagnose_symptoms(symptoms, top_k=3)

print("Возможные диагнозы:")
for pred in result['predictions']:
    print(f"- {pred['disease']}: {pred['probability']:.1f}%")
```

### Веб-интерфейс
1. Запустите backend: `python main.py`
2. Запустите frontend: `npm run dev`
3. Откройте: http://localhost:5173
4. Войдите как пациент
5. Используйте страницу "AI Диагностика"

## 🎯 Примеры использования

### Простая диагностика
```python
from ai_system.inference import MedicalDiagnosisInference

ai = MedicalDiagnosisInference()

# Анализ симптомов
result = ai.diagnose([
    "головная боль",
    "высокая температура", 
    "боль в горле"
])

print(f"Диагноз: {result['predictions'][0]['disease']}")
print(f"Вероятность: {result['predictions'][0]['probability']:.1f}%")
```

### Получение статистики
```python
from ai_system.inference import get_model_status

status = get_model_status()
print(f"Симптомов в базе: {status['symptoms_count']}")
print(f"Заболеваний: {status['diseases_count']}")
print(f"Модель загружена: {status['model_loaded']}")
```

## 🔧 Устранение неполадок

### Модель не загружается
```bash
# Проверьте наличие файлов модели
ls ai_system/trained_models/

# Переобучите модель
python train_model.py --epochs 50
```

### Ошибки зависимостей
```bash
# Обновите pip
python -m pip install --upgrade pip

# Переустановите зависимости
pip install -r requirements.txt --force-reinstall
```

### Мало данных
```bash
# Загрузите больше данных
python data_downloader.py

# Увеличьте количество синтетических данных
python setup_and_train.py --synthetic-count=1000
```

## 📈 Мониторинг качества

### Проверка точности
```python
from ai_system.neural_network import MedicalAITrainer

trainer = MedicalAITrainer()
accuracy = trainer.evaluate_model()
print(f"Точность модели: {accuracy:.2f}%")
```

### Просмотр истории обучения
```python
import json

with open('ai_system/trained_models/training_history.json') as f:
    history = json.load(f)

print(f"Лучшая точность: {max(history['accuracy']):.2f}%")
print(f"Финальная потеря: {history['loss'][-1]:.4f}")
```

## 🚀 Production настройки

### Автоматическое переобучение
```bash
# Настройте cron job для ежедневного переобучения
0 2 * * * cd /path/to/project && python ai_system/train_model.py --transfer-learning --epochs 20
```

### Оптимизация производительности
```python
# Включите GPU (если доступно)
import torch
device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
print(f"Используется устройство: {device}")
```

### Логирование
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    filename='ai_system.log',
    format='%(asctime)s [%(levelname)s] %(message)s'
)
```

## 🎉 Готово!

Ваша AI система диагностики готова к использованию!

**Полезные ссылки:**
- 🌐 Веб-интерфейс: http://localhost:5173
- 📡 API документация: http://localhost:8000/docs
- 📊 Статус системы: http://localhost:8000/api/ai/status
- 📝 Логи: `backend/ai_system.log`

**Поддержка:**
- Проверьте логи при проблемах
- Обновляйте данные регулярно
- Используйте transfer learning для улучшения
- Собирайте обратную связь от пользователей

---

🎯 **Система готова помогать в медицинской диагностике!** 