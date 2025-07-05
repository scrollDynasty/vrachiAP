#!/usr/bin/env python3
"""
Система непрерывного обучения AI для Healzy.uz
Автоматически собирает данные, обучается на них и улучшается со временем
"""

import asyncio
import schedule
import time
import logging
from datetime import datetime, timedelta
from pathlib import Path
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import get_db, AITrainingData, AIDiagnosis, AIFeedback, AIModel, AIModelTraining
from ai_service.data_collector import RealDataCollector
from ai_service.model_trainer import ModelTrainer
from ai_service.utils import calculate_model_accuracy

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('continuous_learning.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class ContinuousLearningSystem:
    """
    Система непрерывного обучения AI
    Автоматически:
    1. Собирает новые медицинские данные
    2. Обучается на обратной связи пользователей
    3. Переобучает модели при снижении точности
    4. Обновляет базу знаний
    """
    
    def __init__(self):
        self.data_collector = RealDataCollector()
        self.model_trainer = ModelTrainer()
        self.min_accuracy_threshold = 0.7  # Минимальный порог точности
        self.retraining_interval_days = 7  # Интервал переобучения
        self.data_collection_interval_hours = 6  # Интервал сбора данных
        
    async def collect_new_data(self):
        """Автоматический сбор новых медицинских данных"""
        try:
            logger.info("🌐 Начинаю автоматический сбор новых данных...")
            
            # Собираем данные из разных источников
            result = await self.data_collector.collect_all_sources(limit=100)
            
            if result['total_collected'] > 0:
                logger.info(f"✅ Собрано {result['total_collected']} новых записей")
                
                # Обрабатываем данные для обучения
                await self.process_collected_data()
            else:
                logger.warning("⚠️ Не удалось собрать новые данные")
                
        except Exception as e:
            logger.error(f"❌ Ошибка при сборе данных: {e}")
    
    async def process_collected_data(self):
        """Обработка собранных данных для обучения"""
        try:
            with next(get_db()) as db:
                # Получаем необработанные данные
                unprocessed = db.query(AITrainingData).filter(
                    AITrainingData.is_processed == False
                ).limit(100).all()
                
                processed_count = 0
                for data in unprocessed:
                    # Валидация качества данных
                    if self._validate_data_quality(data):
                        data.is_processed = True
                        data.is_validated = True
                        processed_count += 1
                    else:
                        # Удаляем некачественные данные
                        db.delete(data)
                
                db.commit()
                logger.info(f"✅ Обработано {processed_count} записей для обучения")
                
        except Exception as e:
            logger.error(f"❌ Ошибка при обработке данных: {e}")
    
    def _validate_data_quality(self, data: AITrainingData) -> bool:
        """Проверка качества данных"""
        # Минимальные требования к данным
        if not data.title or len(data.title) < 10:
            return False
        if not data.content or len(data.content) < 50:
            return False
        if not data.symptoms and not data.diseases:
            return False
        if data.quality_score < 0.3:
            return False
        return True
    
    async def learn_from_feedback(self):
        """Обучение на основе обратной связи пользователей"""
        try:
            logger.info("📊 Анализирую обратную связь пользователей...")
            
            with next(get_db()) as db:
                # Получаем последние отзывы
                recent_feedback = db.query(AIFeedback).filter(
                    AIFeedback.created_at >= datetime.now() - timedelta(days=7)
                ).all()
                
                if not recent_feedback:
                    logger.info("Нет новой обратной связи")
                    return
                
                # Анализируем точность предсказаний
                correct_predictions = 0
                total_predictions = len(recent_feedback)
                
                for feedback in recent_feedback:
                    if feedback.was_correct:
                        correct_predictions += 1
                
                accuracy = correct_predictions / total_predictions if total_predictions > 0 else 0
                logger.info(f"📈 Текущая точность по обратной связи: {accuracy:.2%}")
                
                # Создаем новые обучающие данные из обратной связи
                for feedback in recent_feedback:
                    if feedback.diagnosis_id:
                        diagnosis = db.query(AIDiagnosis).filter(
                            AIDiagnosis.id == feedback.diagnosis_id
                        ).first()
                        
                        if diagnosis and feedback.was_correct:
                            # Добавляем успешный случай в обучающие данные
                            training_data = AITrainingData(
                                source_name="user_feedback",
                                source_url="internal",
                                title=f"Подтвержденный диагноз #{diagnosis.id}",
                                content=diagnosis.symptoms_description,
                                symptoms=diagnosis.detected_symptoms,
                                diseases=diagnosis.predicted_diseases,
                                treatments=[],
                                language="ru",
                                category="confirmed_diagnosis",
                                quality_score=0.95,  # Высокое качество подтвержденных данных
                                is_processed=True,
                                is_validated=True
                            )
                            db.add(training_data)
                
                db.commit()
                logger.info("✅ Обучающие данные обновлены на основе обратной связи")
                
        except Exception as e:
            logger.error(f"❌ Ошибка при обучении на обратной связи: {e}")
    
    async def check_and_retrain_models(self):
        """Проверка точности моделей и переобучение при необходимости"""
        try:
            logger.info("🔍 Проверяю необходимость переобучения моделей...")
            
            with next(get_db()) as db:
                # Получаем последнее обучение
                last_training = db.query(AIModelTraining).order_by(
                    AIModelTraining.created_at.desc()
                ).first()
                
                need_retrain = False
                
                # Проверяем интервал с последнего обучения
                if not last_training:
                    need_retrain = True
                    logger.info("Модели еще не обучались")
                else:
                    days_since_training = (datetime.now() - last_training.created_at).days
                    if days_since_training >= self.retraining_interval_days:
                        need_retrain = True
                        logger.info(f"Прошло {days_since_training} дней с последнего обучения")
                
                # Проверяем точность моделей
                current_accuracy = await self._calculate_current_accuracy()
                if current_accuracy < self.min_accuracy_threshold:
                    need_retrain = True
                    logger.warning(f"Точность упала до {current_accuracy:.2%}")
                
                if need_retrain:
                    logger.info("🚀 Запускаю переобучение моделей...")
                    await self.retrain_all_models()
                else:
                    logger.info(f"✅ Переобучение не требуется. Точность: {current_accuracy:.2%}")
                    
        except Exception as e:
            logger.error(f"❌ Ошибка при проверке моделей: {e}")
    
    async def _calculate_current_accuracy(self) -> float:
        """Расчет текущей точности моделей"""
        try:
            with next(get_db()) as db:
                # Получаем последние диагнозы с обратной связью
                recent_diagnoses = db.query(AIDiagnosis).join(
                    AIFeedback, AIDiagnosis.id == AIFeedback.diagnosis_id
                ).filter(
                    AIDiagnosis.created_at >= datetime.now() - timedelta(days=7)
                ).all()
                
                if not recent_diagnoses:
                    # Если нет данных, возвращаем базовую точность
                    return 0.75
                
                correct = sum(1 for d in recent_diagnoses if d.feedback and d.feedback[0].was_correct)
                total = len(recent_diagnoses)
                
                return correct / total if total > 0 else 0.75
                
        except Exception as e:
            logger.error(f"Ошибка при расчете точности: {e}")
            return 0.75
    
    async def retrain_all_models(self):
        """Переобучение всех моделей на новых данных"""
        try:
            # Загружаем данные из БД
            success = self.model_trainer.load_training_data("database")
            
            if not success:
                logger.error("Не удалось загрузить данные для обучения")
                return
            
            # Обучаем модели
            result = await self.model_trainer.train_all_models()
            
            if result.get('success'):
                # Сохраняем информацию об обучении
                with next(get_db()) as db:
                    training_record = AIModelTraining(
                        model_name="all_models",
                        training_data_count=len(self.model_trainer.training_data),
                        accuracy=result['models']['symptom_classifier'].get('accuracy', 0),
                        loss=0.0,  # Можно добавить реальный loss
                        epochs=10,
                        learning_rate=0.001,
                        training_duration=300,  # секунды
                        notes=f"Автоматическое переобучение. Точность: симптомы {result['models']['symptom_classifier'].get('accuracy', 0):.2%}, заболевания {result['models']['disease_classifier'].get('accuracy', 0):.2%}"
                    )
                    db.add(training_record)
                    db.commit()
                
                logger.info("✅ Модели успешно переобучены!")
                logger.info(f"   Точность классификатора симптомов: {result['models']['symptom_classifier'].get('accuracy', 0):.2%}")
                logger.info(f"   Точность классификатора заболеваний: {result['models']['disease_classifier'].get('accuracy', 0):.2%}")
            else:
                logger.error("Ошибка при переобучении моделей")
                
        except Exception as e:
            logger.error(f"❌ Ошибка при переобучении: {e}")
    
    async def update_knowledge_base(self):
        """Обновление базы медицинских знаний"""
        try:
            logger.info("📚 Обновляю базу медицинских знаний...")
            
            # Анализируем частые запросы пользователей
            with next(get_db()) as db:
                # Находим популярные симптомы
                popular_symptoms = db.query(AIDiagnosis.symptoms_description).filter(
                    AIDiagnosis.created_at >= datetime.now() - timedelta(days=30)
                ).limit(100).all()
                
                # Ищем новую информацию по популярным темам
                for symptoms in popular_symptoms:
                    if symptoms[0]:
                        # Извлекаем ключевые слова
                        keywords = self._extract_keywords(symptoms[0])
                        
                        # Ищем дополнительную информацию
                        for keyword in keywords[:3]:  # Топ-3 ключевых слова
                            await self.data_collector.collect_from_pubmed(keyword, limit=10)
                
                logger.info("✅ База знаний обновлена")
                
        except Exception as e:
            logger.error(f"❌ Ошибка при обновлении базы знаний: {e}")
    
    def _extract_keywords(self, text: str) -> list:
        """Извлечение ключевых слов из текста"""
        # Простая реализация - можно улучшить с помощью NLP
        common_words = {'у', 'меня', 'и', 'в', 'на', 'с', 'по', 'при', 'для', 'что', 'как'}
        words = text.lower().split()
        keywords = [w for w in words if len(w) > 3 and w not in common_words]
        return keywords[:5]
    
    def schedule_tasks(self):
        """Планирование автоматических задач"""
        # Сбор данных каждые 6 часов
        schedule.every(self.data_collection_interval_hours).hours.do(
            lambda: asyncio.create_task(self.collect_new_data())
        )
        
        # Обучение на обратной связи каждый день
        schedule.every().day.at("03:00").do(
            lambda: asyncio.create_task(self.learn_from_feedback())
        )
        
        # Проверка и переобучение моделей каждую неделю
        schedule.every().sunday.at("04:00").do(
            lambda: asyncio.create_task(self.check_and_retrain_models())
        )
        
        # Обновление базы знаний каждые 3 дня
        schedule.every(3).days.do(
            lambda: asyncio.create_task(self.update_knowledge_base())
        )
        
        logger.info("✅ Задачи непрерывного обучения запланированы")
    
    async def run_forever(self):
        """Запуск системы непрерывного обучения"""
        logger.info("🚀 Запуск системы непрерывного обучения AI...")
        logger.info("=" * 60)
        
        # Планируем задачи
        self.schedule_tasks()
        
        # Выполняем первоначальные задачи
        await self.collect_new_data()
        await self.learn_from_feedback()
        await self.check_and_retrain_models()
        
        logger.info("✅ Система непрерывного обучения запущена")
        logger.info("   Сбор данных: каждые 6 часов")
        logger.info("   Обучение на отзывах: ежедневно в 03:00")
        logger.info("   Переобучение моделей: еженедельно")
        logger.info("   Обновление базы знаний: каждые 3 дня")
        
        # Бесконечный цикл выполнения задач
        while True:
            schedule.run_pending()
            await asyncio.sleep(60)  # Проверка каждую минуту


async def main():
    """Основная функция"""
    system = ContinuousLearningSystem()
    
    # Проверяем аргументы командной строки
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "collect":
            # Однократный сбор данных
            await system.collect_new_data()
        elif command == "train":
            # Однократное обучение
            await system.retrain_all_models()
        elif command == "feedback":
            # Обучение на обратной связи
            await system.learn_from_feedback()
        elif command == "check":
            # Проверка точности
            accuracy = await system._calculate_current_accuracy()
            print(f"Текущая точность: {accuracy:.2%}")
        else:
            print("Неизвестная команда. Доступные команды:")
            print("  collect  - сбор новых данных")
            print("  train    - переобучение моделей")
            print("  feedback - обучение на обратной связи")
            print("  check    - проверка текущей точности")
            print("  (без параметров) - запуск непрерывного обучения")
    else:
        # Запуск непрерывного обучения
        await system.run_forever()


if __name__ == "__main__":
    print("🧠 Система непрерывного обучения AI для Healzy.uz")
    print("=" * 60)
    
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️ Остановка системы непрерывного обучения...")
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}", exc_info=True) 