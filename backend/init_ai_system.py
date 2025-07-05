#!/usr/bin/env python3
"""
Скрипт инициализации AI системы для медицинской диагностики
Создает таблицы БД, собирает данные, обучает модели
"""

import asyncio
import sys
import os
from pathlib import Path
import logging
from datetime import datetime

# Добавляем путь к проекту
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import Base, engine, get_db
from ai_service.data_collector import RealDataCollector
from ai_service.model_trainer import ModelTrainer
from ai_service.inference import MedicalAI

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('ai_system_init.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


async def create_ai_tables():
    """Создание таблиц для AI системы"""
    try:
        logger.info("Создание таблиц базы данных для AI системы...")
        
        # Создаем все таблицы
        Base.metadata.create_all(bind=engine)
        
        logger.info("✅ Таблицы базы данных созданы успешно")
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка при создании таблиц: {e}")
        return False


async def collect_training_data(limit: int = 100):
    """Сбор обучающих данных из медицинских источников"""
    try:
        logger.info(f"Начало сбора обучающих данных (лимит: {limit})...")
        
        collector = RealDataCollector()
        result = await collector.collect_all_sources(limit=limit)
        
        if result.get('success'):
            logger.info(f"✅ Сбор данных завершен успешно:")
            logger.info(f"   - Собрано записей: {result.get('total_collected', 0)}")
            logger.info(f"   - Обработано источников: {result.get('sources_processed', 0)}")
            return True
        else:
            logger.error("❌ Ошибка при сборе данных")
            return False
            
    except Exception as e:
        logger.error(f"❌ Ошибка при сборе обучающих данных: {e}")
        return False


async def train_models():
    """Обучение AI моделей на данных из БД"""
    try:
        logger.info("Начало обучения AI моделей...")
        
        from ai_service.model_trainer import ModelTrainer
        trainer = ModelTrainer()
        
        # Сначала пробуем загрузить данные из БД
        logger.info("Загружаю данные для обучения из БД...")
        data_loaded = trainer.load_training_data("database")
        
        if not data_loaded:
            logger.warning("⚠️ Не удалось загрузить данные из БД, генерирую синтетические...")
            data_loaded = trainer.load_training_data("synthetic")
            
            if not data_loaded:
                logger.error("❌ Не удалось подготовить данные для обучения")
                return False
        
        # Обучаем модели
        result = await trainer.train_all_models()
        
        if result.get('success'):
            logger.info("✅ Модели успешно обучены!")
            logger.info(f"   - Классификатор симптомов: {result['models']['symptom_classifier'].get('accuracy', 0):.2%}")
            logger.info(f"   - Классификатор заболеваний: {result['models']['disease_classifier'].get('accuracy', 0):.2%}")
            return True
        else:
            logger.error("❌ Ошибка при обучении моделей")
            return False
        
    except Exception as e:
        logger.error(f"❌ Ошибка при обучении моделей: {e}")
        return False


async def test_ai_system():
    """Тестирование AI системы"""
    try:
        logger.info("Тестирование AI системы...")
        
        # Создаем экземпляр AI
        ai = MedicalAI()
        
        # Тестовые симптомы
        test_symptoms = [
            "У меня болит голова и температура 38 градусов",
            "Кашель и насморк уже третий день",
            "Боль в животе и тошнота после еды"
        ]
        
        for i, symptoms in enumerate(test_symptoms, 1):
            logger.info(f"Тест {i}: {symptoms}")
            
            result = await ai.analyze_symptoms(symptoms)
            
            if 'error' not in result:
                logger.info(f"   ✅ Найдено симптомов: {len(result.get('extracted_symptoms', []))}")
                logger.info(f"   ✅ Возможных заболеваний: {len(result.get('possible_diseases', []))}")
                logger.info(f"   ✅ Рекомендаций: {len(result.get('recommendations', []))}")
                logger.info(f"   ✅ Уверенность: {result.get('confidence', 0):.2f}")
            else:
                logger.warning(f"   ⚠️ Ошибка: {result.get('error')}")
        
        logger.info("✅ Тестирование AI системы завершено")
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка при тестировании AI системы: {e}")
        return False


async def init_healzy_ai_system():
    """Полная инициализация AI системы для Healzy.uz"""
    logger.info("🚀 Начало инициализации AI системы для Healzy.uz")
    logger.info("=" * 60)
    
    start_time = datetime.now()
    
    # Шаг 1: Создание таблиц БД
    logger.info("📦 Шаг 1: Создание таблиц базы данных...")
    if not await create_ai_tables():
        logger.error("❌ Не удалось создать таблицы БД. Остановка инициализации.")
        return False
    
    # Шаг 2: Сбор обучающих данных
    logger.info("🌐 Шаг 2: Сбор обучающих данных из медицинских источников...")
    
    # Проверяем, есть ли уже данные в БД
    from models import get_db, AITrainingData
    with next(get_db()) as db:
        existing_data_count = db.query(AITrainingData).count()
        
    if existing_data_count > 0:
        logger.info(f"✅ В БД уже есть {existing_data_count} записей для обучения")
        logger.info("   Пропускаем сбор данных. Используйте 'python init_ai_system.py collect' для дополнительного сбора")
    else:
        data_collected = await collect_training_data(limit=50)
        
        if not data_collected:
            logger.warning("⚠️ Не удалось собрать данные из интернета")
            logger.info("   Попробуйте запустить: python add_medical_data.py")
            logger.info("   Для добавления подготовленных медицинских данных")
    
    # Шаг 3: Обучение моделей
    logger.info("🧠 Шаг 3: Обучение AI моделей...")
    models_trained = await train_models()
    
    if not models_trained:
        logger.error("❌ Не удалось обучить модели. Остановка инициализации.")
        return
    
    # Шаг 4: Тестирование системы
    logger.info("🧪 Шаг 4: Тестирование AI системы...")
    if not await test_ai_system():
        logger.warning("⚠️ Тестирование завершено с ошибками, но система может работать...")
    
    # Завершение
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    logger.info("=" * 60)
    logger.info("🎉 Инициализация AI системы для Healzy.uz завершена!")
    logger.info(f"⏱️ Время выполнения: {duration:.1f} секунд")
    logger.info("=" * 60)
    
    logger.info("📋 Следующие шаги:")
    logger.info("1. Запустите backend сервер: python start.py")
    logger.info("2. Откройте frontend: https://healzy.uz")
    logger.info("3. Войдите как пациент и перейдите в 'AI Диагностика'")
    logger.info("4. Протестируйте систему с реальными симптомами")
    
    return True


def run_data_collection_only():
    """Запуск только сбора данных"""
    async def collect():
        collector = RealDataCollector()
        result = await collector.collect_all_sources(limit=200)
        print(f"Результат: {result}")
    
    asyncio.run(collect())


def run_training_only():
    """Запуск только обучения моделей"""
    async def train():
        trainer = ModelTrainer()
        trainer.load_training_data("database")
        result = await trainer.train_all_models()
        print(f"Результат обучения: {result}")
    
    asyncio.run(train())


if __name__ == "__main__":
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "collect":
            print("🌐 Запуск только сбора данных...")
            run_data_collection_only()
        elif command == "train":
            print("🧠 Запуск только обучения моделей...")
            run_training_only()
        elif command == "test":
            print("🧪 Запуск только тестирования...")
            asyncio.run(test_ai_system())
        else:
            print("❌ Неизвестная команда. Доступные команды:")
            print("  python init_ai_system.py collect  - только сбор данных")
            print("  python init_ai_system.py train    - только обучение")
            print("  python init_ai_system.py test     - только тестирование")
            print("  python init_ai_system.py          - полная инициализация")
    else:
        # Полная инициализация
        asyncio.run(init_healzy_ai_system()) 