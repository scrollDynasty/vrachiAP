# AI Система для Медицинской Диагностики

## Описание

Система нейросетевой диагностики заболеваний на основе симптомов пациента. 

Архитектура:
- **data_downloader.py** - скачивание медицинских данных из интернета
- **neural_network.py** - архитектура нейросети (PyTorch)
- **train_model.py** - обучение модели по эпохам
- **inference.py** - использование обученной модели для диагностики

## Установка

### 1. Установка зависимостей

```bash
cd backend/ai_system
pip install -r requirements.txt
```

### 2. Скачивание и обучение модели

```bash
# Полный цикл: скачивание данных + обучение (50 эпох)
python train_model.py --epochs 50 --download

# Только обучение на существующих данных
python train_model.py --epochs 100

# Быстрое обучение для тестирования
python train_model.py --epochs 10 --download
```

### 3. Тестирование модели

```bash
# Тестирование с конкретными симптомами
python train_model.py --test головная_боль температура кашель

# Интерактивное тестирование
python inference.py
```

## Использование

### В коде Python

```python
from ai_system.inference import diagnose_symptoms

# Диагностика
result = diagnose_symptoms(['головная боль', 'температура', 'кашель'])

print(result)
# {
#   'predictions': [
#     {'disease': 'ОРВИ', 'probability': 85.2, 'confidence': 78.5},
#     {'disease': 'Грипп', 'probability': 72.1, 'confidence': 65.3}
#   ],
#   'input_symptoms': ['головная боль', 'температура', 'кашель'],
#   'recognized_symptoms': ['головная боль', 'температура', 'кашель'],
#   'processing_time': 0.01,
#   'model_status': 'active'
# }
```

### Через API

```bash
# Проверка статуса AI системы
curl http://localhost:8000/api/ai/health

# Диагностика
curl -X POST http://localhost:8000/api/ai/diagnose \
  -H "Content-Type: application/json" \
  -d '{"symptoms": ["головная боль", "температура", "кашель"]}'

# Получение списка симптомов
curl http://localhost:8000/api/ai/symptoms

# Поиск симптомов
curl -X POST http://localhost:8000/api/ai/search-symptoms \
  -H "Content-Type: application/json" \
  -d '{"query": "боль"}'
```

## Структура данных

### Входные данные для обучения
```json
{
  "name": "Грипп",
  "symptoms": ["высокая температура", "головная боль", "боль в мышцах", "кашель"],
  "description": "Острое инфекционное заболевание",
  "source": "Mayo Clinic"
}
```

### Обученная модель
- Файлы сохраняются в `trained_models/`
- `best_medical_model.pth` - веса нейросети
- `data_processor.json` - словари симптомов и заболеваний
- `training_history.json` - история обучения

## Архитектура нейросети

- **Входной слой**: размер = количество уникальных симптомов
- **Скрытые слои**: [256, 128, 64] нейронов с ReLU и Dropout
- **Выходной слой**: количество заболеваний (softmax)
- **Дополнительно**: слой уверенности (confidence layer)

## Источники данных

1. **Mayo Clinic** - медицинские статьи
2. **MedlinePlus** - справочная информация
3. **Русскоязычные данные** - заболевания на русском языке
4. **Синтетические данные** - сгенерированные образцы

## Возможности

- ✅ Диагностика по симптомам
- ✅ Множественные предсказания с вероятностями
- ✅ Оценка уверенности модели
- ✅ Поиск похожих симптомов
- ✅ Аугментация данных (добавление шума)
- ✅ Fallback режим без AI
- ✅ API интеграция
- ✅ Интерактивный режим

## Команды

### Управление данными
```bash
# Только скачивание данных
python data_downloader.py

# Просмотр скачанных данных
python -c "import json; print(json.load(open('medical_data/medical_data.json'))[:3])"
```

### Обучение
```bash
# Полное обучение
python train_model.py --epochs 100 --download

# Быстрое обучение
python train_model.py --epochs 20

# Обучение с новыми данными
python train_model.py --epochs 50 --download
```

### Тестирование
```bash
# Тестирование модели
python train_model.py --test простуда кашель насморк

# Интерактивный режим
python inference.py

# Проверка статуса модели
python -c "from inference import get_model_status; print(get_model_status())"
```

## Настройка для localhost

В файле `healzy_backend.env` уже настроено:
```
DATABASE_URL="mysql+pymysql://vrachi_user:1435511926Ss..@localhost:3306/online_doctors_db"
APP_ENV="development"
BACKEND_URL="http://localhost:8000"
FRONTEND_URL="http://localhost:5173"
```

## Пример использования

```python
#!/usr/bin/env python3

from ai_system.inference import diagnose_symptoms, get_model_status

# Проверяем статус модели
status = get_model_status()
print(f"Модель загружена: {status.get('model_loaded', False)}")

# Диагностируем симптомы
symptoms = ['головная боль', 'температура', 'кашель', 'насморк']
result = diagnose_symptoms(symptoms, top_k=3)

if 'error' in result:
    print(f"Ошибка: {result['error']}")
else:
    print("Результаты диагностики:")
    for pred in result['predictions']:
        print(f"  - {pred['disease']}: {pred['probability']:.1f}%")
```

## Решение проблем

### Модель не загружается
1. Убедитесь, что модель обучена: `python train_model.py --epochs 20`
2. Проверьте файлы в `trained_models/`

### Низкая точность
1. Увеличьте количество эпох: `--epochs 100`
2. Скачайте новые данные: `--download`
3. Проверьте качество входных данных

### Ошибки зависимостей
```bash
pip install torch torchvision numpy scikit-learn pandas requests beautifulsoup4
```

### Проблемы с API
1. Проверьте: `curl http://localhost:8000/api/ai/health`
2. Убедитесь, что AI роутер подключен в main.py
3. Перезапустите сервер

## Интеграция с фронтендом

```javascript
// Диагностика симптомов
const diagnoseSymptoms = async (symptoms) => {
  const response = await fetch('/api/ai/diagnose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symptoms })
  });
  
  return await response.json();
};

// Использование
const result = await diagnoseSymptoms(['головная боль', 'температура']);
console.log(result.predictions);
```

## Мониторинг

- Логи обучения сохраняются в `training_history.json`
- Статус модели доступен через `/api/ai/status`
- Проверка работоспособности: `/api/ai/health`

## Производительность

- Время обучения: ~2-10 минут (зависит от количества эпох)
- Время предсказания: ~0.01 секунды
- Память: ~50MB для загруженной модели
- Точность: 70-90% (зависит от качества данных) 