"""
AI Service Module for Medical Diagnosis
Модуль искусственного интеллекта для медицинской диагностики

ВАЖНО: Отключено через переменную окружения ENABLE_AI=false из-за высокой нагрузки на сервер
"""

import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Проверяем, включены ли AI функции
ENABLE_AI = os.getenv("ENABLE_AI", "false").lower() == "true"

if ENABLE_AI:
    try:
        from .inference import MedicalAI
        from .data_collector import DataCollector, RealDataCollector
        from .model_trainer import ModelTrainer
    except ImportError as e:
        print(f"⚠️ Ошибка импорта AI компонентов: {e}")
        print("🔄 Загружаем заглушки AI сервисов...")
        from .stubs import MedicalAI, DataCollector, RealDataCollector, ModelTrainer
else:
    # Загружаем заглушки если AI отключен
    from .stubs import MedicalAI, DataCollector, RealDataCollector, ModelTrainer

__version__ = "1.0.0"
__all__ = ["MedicalAI", "DataCollector", "RealDataCollector", "ModelTrainer"] 