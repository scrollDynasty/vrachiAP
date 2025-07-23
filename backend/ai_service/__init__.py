"""
AI Service Module for Medical Diagnosis
Модуль искусственного интеллекта для медицинской диагностики
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_config import is_ai_enabled, get_ai_disabled_response

# Условный импорт AI компонентов только если AI включен
if is_ai_enabled():
    try:
        # Сначала пытаемся импортировать тяжелые AI библиотеки
        import torch
        import transformers
        import sentence_transformers
        import sklearn
        
        # Если тяжелые библиотеки доступны, пытаемся импортировать реальные AI компоненты
        try:
            from .inference import MedicalAI
            from .data_collector import RealDataCollector as DataCollector
            from .model_trainer import ModelTrainer
            print("AI components loaded successfully")
        except Exception as db_e:
            # Если не удается импортировать из-за БД или других проблем, используем заглушки
            print(f"Warning: AI libraries available but components failed to load (using stubs): {db_e}")
            from .stubs import MedicalAIStub as MedicalAI
            from .stubs import DataCollectorStub as DataCollector
            from .stubs import ModelTrainerStub as ModelTrainer
            
    except ImportError as e:
        print(f"Info: Heavy AI libraries not available (using stubs): {e}")
        # Создаем заглушки если AI включен, но тяжелые библиотеки недоступны
        from .stubs import MedicalAIStub as MedicalAI
        from .stubs import DataCollectorStub as DataCollector
        from .stubs import ModelTrainerStub as ModelTrainer
else:
    # Используем заглушки когда AI отключен
    print("AI disabled - using stubs")
    from .stubs import MedicalAIStub as MedicalAI
    from .stubs import DataCollectorStub as DataCollector
    from .stubs import ModelTrainerStub as ModelTrainer

__version__ = "1.0.0"
__all__ = ["MedicalAI", "DataCollector", "ModelTrainer"] 