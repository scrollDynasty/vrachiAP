#!/usr/bin/env python3
"""
Сервис непрерывного обучения AI системы диагностики
Автоматически собирает данные из интернета и переобучает модели
"""

import asyncio
import schedule
import time
import logging
import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
import threading
from concurrent.futures import ThreadPoolExecutor

# Импорты для AI системы
from ai_service.data_collector import RealDataCollector
from ai_service.model_trainer import ModelTrainer
from ai_service.inference import MedicalAI
from models import get_db, AITrainingData, AIModel, AIModelTraining

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('continuous_learning.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class ContinuousLearningService:
    """
    Сервис для непрерывного обучения AI системы
    """
    
    def __init__(self, config_path: str = "learning_config.json"):
        self.config_path = config_path
        self.config = self._load_config()
        self.is_running = False
        self.data_collector = RealDataCollector()
        self.model_trainer = ModelTrainer()
        self.executor = ThreadPoolExecutor(max_workers=2)
        
        # Статистика
        self.stats = {
            'total_data_collected': 0,
            'total_training_sessions': 0,
            'last_data_collection': None,
            'last_training': None,
            'model_accuracy_history': []
        }
        
        logger.info("🤖 Сервис непрерывного обучения AI инициализирован")
    
    def _load_config(self) -> Dict:
        """Загрузка конфигурации"""
        default_config = {
            'data_collection': {
                'interval_hours': 2,
                'batch_size': 100,
                'max_daily_requests': 1000,
                'enabled': True
            },
            'model_training': {
                'interval_hours': 6,
                'min_new_data_for_training': 50,
                'accuracy_threshold': 0.8,
                'enabled': True
            },
            'monitoring': {
                'alert_on_accuracy_drop': True,
                'accuracy_drop_threshold': 0.1,
                'log_stats_interval_hours': 1
            },
            'data_sources': {
                'medical_sites': True,
                'scientific_papers': True,
                'health_forums': False,  # Отключено для качества
                'wikipedia': True
            }
        }
        
        try:
            if os.path.exists(self.config_path):
                with open(self.config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    # Объединяем с default для новых параметров
                    return {**default_config, **config}
            else:
                self._save_config(default_config)
                return default_config
        except Exception as e:
            logger.error(f"Ошибка при загрузке конфигурации: {e}")
            return default_config
    
    def _save_config(self, config: Dict):
        """Сохранение конфигурации"""
        try:
            with open(self.config_path, 'w', encoding='utf-8') as f:
                json.dump(config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Ошибка при сохранении конфигурации: {e}")
    
    async def collect_data_batch(self) -> Dict:
        """Сбор одной партии данных"""
        try:
            logger.info("🌐 Начинаю сбор медицинских данных...")
            
            batch_size = self.config['data_collection']['batch_size']
            result = await self.data_collector.collect_all_sources(limit=batch_size)
            
            if result.get('success'):
                collected_count = result.get('total_collected', 0)
                self.stats['total_data_collected'] += collected_count
                self.stats['last_data_collection'] = datetime.now()
                
                logger.info(f"✅ Собрано {collected_count} новых медицинских записей")
                return {'success': True, 'collected': collected_count}
            else:
                logger.warning("⚠️ Не удалось собрать данные")
                return {'success': False, 'error': result.get('error', 'Unknown error')}
                
        except Exception as e:
            logger.error(f"❌ Ошибка при сборе данных: {e}")
            return {'success': False, 'error': str(e)}
    
    async def train_models(self) -> Dict:
        """Переобучение моделей"""
        try:
            logger.info("🧠 Начинаю переобучение AI моделей...")
            
            # Проверяем количество новых данных
            with next(get_db()) as db:
                total_data = db.query(AITrainingData).count()
                
            min_data = self.config['model_training']['min_new_data_for_training']
            
            if total_data < min_data:
                logger.info(f"⏳ Недостаточно данных для обучения (есть {total_data}, нужно {min_data})")
                return {'success': False, 'reason': 'insufficient_data'}
            
            # Загружаем данные и обучаем
            self.model_trainer.load_training_data("database")
            result = await self.model_trainer.train_all_models()
            
            if result.get('success'):
                self.stats['total_training_sessions'] += 1
                self.stats['last_training'] = datetime.now()
                
                # Сохраняем статистику точности
                symptom_accuracy = result['models']['symptom_classifier'].get('accuracy', 0)
                disease_accuracy = result['models']['disease_classifier'].get('accuracy', 0)
                
                self.stats['model_accuracy_history'].append({
                    'timestamp': datetime.now().isoformat(),
                    'symptom_accuracy': symptom_accuracy,
                    'disease_accuracy': disease_accuracy
                })
                
                logger.info(f"✅ Модели переобучены успешно!")
                logger.info(f"   📊 Точность симптомов: {symptom_accuracy:.2%}")
                logger.info(f"   📊 Точность заболеваний: {disease_accuracy:.2%}")
                
                return {'success': True, 'accuracies': {
                    'symptom': symptom_accuracy,
                    'disease': disease_accuracy
                }}
            else:
                logger.error("❌ Ошибка при обучении моделей")
                return {'success': False, 'error': result.get('error', 'Training failed')}
                
        except Exception as e:
            logger.error(f"❌ Ошибка при обучении моделей: {e}")
            return {'success': False, 'error': str(e)}
    
    def setup_schedules(self):
        """Настройка расписания задач"""
        if self.config['data_collection']['enabled']:
            schedule.every(self.config['data_collection']['interval_hours']).hours.do(
                self._run_async_job, self.collect_data_batch
            )
            logger.info(f"📅 Планировщик сбора данных: каждые {self.config['data_collection']['interval_hours']} часов")
        
        if self.config['model_training']['enabled']:
            schedule.every(self.config['model_training']['interval_hours']).hours.do(
                self._run_async_job, self.train_models
            )
            logger.info(f"📅 Планировщик обучения: каждые {self.config['model_training']['interval_hours']} часов")
        
        # Логирование статистики
        schedule.every(self.config['monitoring']['log_stats_interval_hours']).hours.do(
            self.log_stats
        )
        
        # Ежедневная очистка старых данных
        schedule.every().day.at("03:00").do(self.cleanup_old_data)
    
    def _run_async_job(self, job_func):
        """Запуск асинхронной задачи в синхронном планировщике"""
        try:
            asyncio.run(job_func())
        except Exception as e:
            logger.error(f"Ошибка при выполнении задачи: {e}")
    
    def log_stats(self):
        """Логирование статистики"""
        logger.info("📊 Статистика непрерывного обучения:")
        logger.info(f"   📈 Всего собрано данных: {self.stats['total_data_collected']}")
        logger.info(f"   🔄 Сессий обучения: {self.stats['total_training_sessions']}")
        logger.info(f"   ⏰ Последний сбор данных: {self.stats['last_data_collection']}")
        logger.info(f"   🧠 Последнее обучение: {self.stats['last_training']}")
        
        # Последняя точность модели
        if self.stats['model_accuracy_history']:
            last_accuracy = self.stats['model_accuracy_history'][-1]
            logger.info(f"   📊 Текущая точность: {last_accuracy['symptom_accuracy']:.2%} (симптомы), {last_accuracy['disease_accuracy']:.2%} (заболевания)")
    
    def cleanup_old_data(self):
        """Очистка старых данных"""
        try:
            logger.info("🧹 Очистка старых данных...")
            
            # Удаляем данные старше 30 дней
            cutoff_date = datetime.now() - timedelta(days=30)
            
            with next(get_db()) as db:
                old_data = db.query(AITrainingData).filter(
                    AITrainingData.created_at < cutoff_date,
                    AITrainingData.is_processed == True
                ).count()
                
                if old_data > 0:
                    db.query(AITrainingData).filter(
                        AITrainingData.created_at < cutoff_date,
                        AITrainingData.is_processed == True
                    ).delete()
                    db.commit()
                    logger.info(f"🗑️ Удалено {old_data} старых записей")
                else:
                    logger.info("✅ Нет старых данных для удаления")
                    
        except Exception as e:
            logger.error(f"❌ Ошибка при очистке данных: {e}")
    
    def start(self):
        """Запуск сервиса"""
        logger.info("🚀 Запуск сервиса непрерывного обучения AI...")
        
        self.is_running = True
        self.setup_schedules()
        
        # Первоначальный сбор данных
        logger.info("📊 Запуск первоначального сбора данных...")
        asyncio.run(self.collect_data_batch())
        
        # Основной цикл планировщика
        logger.info("⏰ Сервис запущен. Ожидание расписания...")
        
        while self.is_running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Проверка каждую минуту
            except KeyboardInterrupt:
                logger.info("⏹️ Получен сигнал остановки")
                break
            except Exception as e:
                logger.error(f"❌ Ошибка в главном цикле: {e}")
                time.sleep(60)
        
        logger.info("🛑 Сервис непрерывного обучения остановлен")
    
    def stop(self):
        """Остановка сервиса"""
        self.is_running = False
        logger.info("🛑 Остановка сервиса непрерывного обучения...")
    
    def get_status(self) -> Dict:
        """Получение статуса сервиса"""
        return {
            'is_running': self.is_running,
            'config': self.config,
            'stats': self.stats,
            'scheduled_jobs': len(schedule.jobs)
        }


def main():
    """Запуск сервиса как отдельного процесса"""
    service = ContinuousLearningService()
    
    try:
        service.start()
    except KeyboardInterrupt:
        service.stop()
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
        service.stop()


if __name__ == "__main__":
    main() 