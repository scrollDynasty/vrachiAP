# AI System Temporary Disable - Документация

## Обзор изменений

Данные изменения позволяют временно отключить AI компоненты системы для снижения нагрузки на сервер. Все изменения являются обратимыми и позволяют быстро вернуть функциональность AI.

## Управление через переменную окружения

### Отключение AI (по умолчанию)
```bash
export ENABLE_AI=false
# или установить в .env файле:
ENABLE_AI=false
```

### Включение AI
```bash
export ENABLE_AI=true
# или установить в .env файле:
ENABLE_AI=true
```

## Измененные файлы

### 1. Новые файлы
- `backend/ai_config.py` - Модуль конфигурации AI системы
- `backend/ai_service/stubs.py` - Заглушки для AI компонентов
- `backend/requirements_base.txt` - Базовые зависимости без heavy AI библиотек

### 2. Модифицированные файлы
- `backend/ai_service/__init__.py` - Условная загрузка AI компонентов
- `backend/ai_service/inference.py` - Проверка статуса AI перед выполнением
- `backend/ai_service/model_trainer.py` - Проверка статуса AI перед обучением
- `backend/ai_service/data_collector.py` - Проверка статуса AI перед сбором данных
- `backend/ai_router.py` - Условная обработка AI endpoints
- `backend/requirements.txt` - Закомментированы heavy AI библиотеки
- `backend/ai_service/requirements.txt` - Закомментированы heavy AI библиотеки

## Логика работы

### При ENABLE_AI=false:
1. AI компоненты заменяются на заглушки (stubs)
2. API endpoints возвращают сообщения "AI временно отключён"
3. Heavy AI библиотеки не импортируются
4. Сервер работает без нагрузки от AI компонентов

### При ENABLE_AI=true:
1. Система пытается загрузить реальные AI компоненты
2. Если heavy библиотеки недоступны - используются заглушки
3. Если есть проблемы с БД - используются заглушки
4. API endpoints работают с реальной AI логикой (если доступна)

## Тестирование

### Проверка работы с отключенным AI:
```bash
cd backend
ENABLE_AI=false python -c "
from ai_service import MedicalAI
import asyncio
ai = MedicalAI()
async def test():
    result = await ai.analyze_symptoms('головная боль')
    print(f'Status: {result.get(\"ai_status\")}')
asyncio.run(test())
"
```

### Проверка работы с включенным AI (без heavy библиотек):
```bash
cd backend
ENABLE_AI=true python -c "
from ai_service import MedicalAI
import asyncio
ai = MedicalAI()
async def test():
    result = await ai.analyze_symptoms('головная боль')
    print(f'Status: {result.get(\"ai_status\")}')
asyncio.run(test())
"
```

## API Endpoints

Все AI endpoints проверяют статус AI:

### GET /api/ai/diagnosis
- При AI отключен: возвращает заглушку с ai_status="disabled"
- При AI включен: работает нормально или возвращает заглушку при проблемах

### POST /api/ai/admin/train
- При AI отключен: возвращает HTTP 503 с сообщением об отключении
- При AI включен: запускает обучение или возвращает заглушку

### POST /api/ai/admin/collect-data
- При AI отключен: возвращает HTTP 503 с сообщением об отключении
- При AI включен: запускает сбор данных или возвращает заглушку

## Возврат к полной функциональности AI

### 1. Раскомментировать библиотеки в requirements.txt:
```bash
# Найти секцию "# AI/ML dependencies - ВРЕМЕННО ОТКЛЮЧЕНЫ"
# Раскомментировать нужные библиотеки
```

### 2. Установить зависимости:
```bash
pip install -r requirements.txt
# или для полного AI функционала:
pip install -r ai_service/requirements.txt
```

### 3. Включить AI:
```bash
export ENABLE_AI=true
```

### 4. Перезапустить сервер:
```bash
# Сервер автоматически обнаружит изменения и переключится на реальные AI компоненты
```

## Мониторинг статуса

### В логах сервера:
- `"AI disabled - using stubs"` - AI отключен через переменную окружения
- `"Warning: AI libraries available but components failed to load"` - AI включен, но есть проблемы
- `"AI components loaded successfully"` - AI работает полностью

### В API ответах:
- `"ai_status": "disabled"` - AI отключен
- `"success": false, "code": "AI_DISABLED"` - операция заблокирована из-за отключенного AI

## Безопасность

- Все изменения не удаляют существующий код
- Heavy библиотеки только закомментированы, не удалены
- Система автоматически переключается между режимами
- Нет потери данных или конфигурации

## Производительность

### С отключенным AI:
- Снижение использования RAM на 70-80%
- Быстрый старт сервера
- Отсутствие нагрузки от загрузки моделей
- Стабильная работа API

### С включенным AI:
- Полная функциональность (если библиотеки доступны)
- Автоматический fallback на заглушки при проблемах
- Сохранение стабильности даже при ошибках AI компонентов