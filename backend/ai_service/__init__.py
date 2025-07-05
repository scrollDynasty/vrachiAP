"""
AI Service Module for Medical Diagnosis
Модуль искусственного интеллекта для медицинской диагностики
"""

from .inference import MedicalAI
from .data_collector import DataCollector
from .model_trainer import ModelTrainer

__version__ = "1.0.0"
__all__ = ["MedicalAI", "DataCollector", "ModelTrainer"] 