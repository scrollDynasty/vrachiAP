#!/usr/bin/env python3
"""
Скрипт запуска системы непрерывного обучения AI для Healzy.uz
Запускает автоматический сбор данных и переобучение моделей 24/7

ВАЖНО: Отключено через переменную окружения ENABLE_AI=false из-за высокой нагрузки на сервер
"""

import os
import sys
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Проверяем, включены ли AI функции ДО импорта других модулей
ENABLE_AI = os.getenv("ENABLE_AI", "false").lower() == "true"

if not ENABLE_AI:
    print("🛑 AI функции отключены (ENABLE_AI=false)")
    print("💡 Для включения установите ENABLE_AI=true в .env файле")
    print("🔄 Скрипт непрерывного обучения остановлен")
    sys.exit(0)

# Импорты только если AI включен
import asyncio
import signal
import argparse
import logging
from datetime import datetime
from pathlib import Path

# Добавляем путь к проекту
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from continuous_learning_service import ContinuousLearningService
    from ai_service.data_collector import RealDataCollector
    from ai_service.model_trainer import ModelTrainer
except ImportError as e:
    print(f"❌ Ошибка импорта AI компонентов: {e}")
    print("💡 Убедитесь, что все AI зависимости установлены")
    print("🔄 Скрипт непрерывного обучения остановлен")
    sys.exit(1)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class AILearningManager:
    """
    Менеджер системы непрерывного обучения AI
    """
    
    def __init__(self):
        self.service = None
        self.is_running = False
        
    async def start_continuous_learning(self):
        """Запуск системы непрерывного обучения"""
        try:
            logger.info("🚀 Запуск системы непрерывного обучения AI для Healzy.uz")
            logger.info("=" * 70)
            
            # Создаем сервис
            self.service = ContinuousLearningService()
            
            # Запускаем первоначальный сбор данных
            logger.info("📊 Первоначальный сбор медицинских данных...")
            result = await self.service.collect_data_batch()
            
            if result.get('success'):
                logger.info(f"✅ Собрано {result.get('collected', 0)} записей")
            else:
                logger.warning("⚠️ Не удалось собрать данные, продолжаем с существующими")
            
            # Проверяем готовность к обучению
            logger.info("🧠 Проверка готовности к обучению...")
            training_result = await self.service.train_models()
            
            if training_result.get('success'):
                logger.info("✅ Модели успешно переобучены!")
                accuracies = training_result.get('accuracies', {})
                logger.info(f"   📊 Точность симптомов: {accuracies.get('symptom', 0):.2%}")
                logger.info(f"   📊 Точность заболеваний: {accuracies.get('disease', 0):.2%}")
            else:
                logger.info("ℹ️ Обучение отложено до накопления достаточных данных")
            
            # Запускаем непрерывный режим
            logger.info("⏰ Запуск планировщика непрерывного обучения...")
            logger.info("📋 Расписание работы:")
            logger.info("   🌐 Сбор данных: каждые 2 часа")
            logger.info("   🧠 Обучение моделей: каждые 6 часов")
            logger.info("   📊 Статистика: каждый час")
            logger.info("   🧹 Очистка данных: ежедневно в 03:00")
            
            # Настройка обработчиков сигналов
            signal.signal(signal.SIGINT, self._signal_handler)
            signal.signal(signal.SIGTERM, self._signal_handler)
            
            # Запуск основного цикла
            self.is_running = True
            self.service.start()
            
        except Exception as e:
            logger.error(f"❌ Критическая ошибка при запуске: {e}")
            return False
    
    def _signal_handler(self, signum, frame):
        """Обработчик сигналов для корректного завершения"""
        logger.info(f"📨 Получен сигнал {signum}, завершение работы...")
        self.stop()
    
    def stop(self):
        """Остановка системы обучения"""
        if self.service:
            self.service.stop()
        self.is_running = False
        logger.info("🛑 Система непрерывного обучения остановлена")
    
    async def manual_training(self):
        """Ручной запуск обучения"""
        try:
            logger.info("🧠 Ручной запуск обучения моделей...")
            
            trainer = ModelTrainer()
            
            # Загружаем данные из БД
            data_loaded = trainer.load_training_data("database")
            
            if not data_loaded:
                logger.warning("⚠️ Нет данных в БД, генерируем синтетические...")
                data_loaded = trainer.load_training_data("synthetic")
                
                if not data_loaded:
                    logger.error("❌ Не удалось подготовить данные для обучения")
                    return False
            
            # Обучаем модели
            result = await trainer.train_all_models()
            
            if result.get('success'):
                logger.info("✅ Модели успешно обучены!")
                logger.info(f"   📊 Точность симптомов: {result['models']['symptom_classifier'].get('accuracy', 0):.2%}")
                logger.info(f"   📊 Точность заболеваний: {result['models']['disease_classifier'].get('accuracy', 0):.2%}")
                return True
            else:
                logger.error("❌ Ошибка при обучении моделей")
                return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка при ручном обучении: {e}")
            return False
    
    async def manual_data_collection(self, limit: int = 100):
        """Ручной сбор данных"""
        try:
            logger.info(f"🌐 Ручной сбор медицинских данных (лимит: {limit})...")
            
            collector = RealDataCollector()
            result = await collector.collect_all_sources(limit=limit)
            
            if result.get('success'):
                logger.info(f"✅ Собрано {result.get('total_collected', 0)} записей")
                logger.info(f"   📊 Обработано источников: {result.get('sources_processed', 0)}")
                return True
            else:
                logger.error(f"❌ Ошибка при сборе данных: {result.get('error', 'Unknown error')}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка при ручном сборе: {e}")
            return False
    
    def status(self):
        """Показать статус системы"""
        print("📊 Статус системы непрерывного обучения AI")
        print("=" * 50)
        
        if self.service:
            status = self.service.get_status()
            
            print(f"🔄 Статус: {'Работает' if status['is_running'] else 'Остановлен'}")
            print(f"📅 Запланированных задач: {status['scheduled_jobs']}")
            
            stats = status['stats']
            print(f"📈 Всего собрано данных: {stats['total_data_collected']}")
            print(f"🔄 Сессий обучения: {stats['total_training_sessions']}")
            print(f"⏰ Последний сбор: {stats['last_data_collection']}")
            print(f"🧠 Последнее обучение: {stats['last_training']}")
            
            if stats['model_accuracy_history']:
                last_accuracy = stats['model_accuracy_history'][-1]
                print(f"📊 Текущая точность:")
                print(f"   Симптомы: {last_accuracy['symptom_accuracy']:.2%}")
                print(f"   Заболевания: {last_accuracy['disease_accuracy']:.2%}")
            
            config = status['config']
            print(f"\n⚙️ Конфигурация:")
            print(f"   Сбор данных: каждые {config['data_collection']['interval_hours']} часов")
            print(f"   Обучение: каждые {config['model_training']['interval_hours']} часов")
            print(f"   Размер батча: {config['data_collection']['batch_size']}")
        else:
            print("❌ Сервис не инициализирован")


async def main():
    """Главная функция"""
    parser = argparse.ArgumentParser(description='Система непрерывного обучения AI для Healzy.uz')
    parser.add_argument('command', choices=['start', 'train', 'collect', 'status'], 
                       help='Команда для выполнения')
    parser.add_argument('--limit', type=int, default=100, 
                       help='Лимит для сбора данных (default: 100)')
    
    args = parser.parse_args()
    
    manager = AILearningManager()
    
    try:
        if args.command == 'start':
            print("🚀 Запуск системы непрерывного обучения...")
            print("   Для остановки нажмите Ctrl+C")
            await manager.start_continuous_learning()
            
        elif args.command == 'train':
            print("🧠 Ручной запуск обучения моделей...")
            success = await manager.manual_training()
            sys.exit(0 if success else 1)
            
        elif args.command == 'collect':
            print(f"🌐 Ручной сбор данных (лимит: {args.limit})...")
            success = await manager.manual_data_collection(args.limit)
            sys.exit(0 if success else 1)
            
        elif args.command == 'status':
            manager.service = ContinuousLearningService()
            manager.status()
            
    except KeyboardInterrupt:
        print("\n⏹️ Получен сигнал остановки")
        manager.stop()
    except Exception as e:
        logger.error(f"❌ Критическая ошибка: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main()) 