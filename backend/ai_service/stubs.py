"""
AI Service Stubs - Заглушки для AI компонентов когда система отключена
"""

import asyncio
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import sys
import os

# Добавляем путь к корневой папке backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_config import get_ai_disabled_response, get_ai_stub_diagnosis

logger = logging.getLogger(__name__)


class MedicalAIStub:
    """
    Заглушка для MedicalAI класса
    Возвращает стандартные ответы об отключении AI
    """
    
    def __init__(self, model_dir: str = "ai_models"):
        self.model_dir = model_dir
        logger.info("MedicalAI заменен на заглушку - AI компоненты отключены")
    
    async def analyze_symptoms(self, text: str, patient_id: Optional[int] = None) -> Dict[str, Any]:
        """Заглушка для анализа симптомов"""
        logger.info(f"AI анализ симптомов заблокирован (AI отключен): пациент {patient_id}")
        
        result = get_ai_stub_diagnosis()
        result["timestamp"] = datetime.now().isoformat()
        return result
    
    def load_models(self):
        """Заглушка для загрузки моделей"""
        logger.info("Загрузка AI моделей пропущена - AI отключен")
        return True
    
    def predict_disease(self, symptoms: str) -> Dict[str, Any]:
        """Заглушка для предсказания заболевания"""
        return get_ai_disabled_response("Предсказание заболевания")
    
    def extract_symptoms(self, text: str) -> List[str]:
        """Заглушка для извлечения симптомов"""
        return []
    
    def get_recommendations(self, disease: str) -> List[Dict[str, Any]]:
        """Заглушка для получения рекомендаций"""
        return [
            {
                "type": "consultation",
                "priority": "high", 
                "description": "AI рекомендации недоступны. Обратитесь к врачу."
            }
        ]


class DataCollectorStub:
    """
    Заглушка для DataCollector класса
    """
    
    def __init__(self):
        logger.info("DataCollector заменен на заглушку - AI компоненты отключены")
    
    async def collect_all_sources(self, limit: int = 50) -> Dict[str, Any]:
        """Заглушка для сбора данных"""
        logger.info(f"Сбор медицинских данных заблокирован (AI отключен): лимит {limit}")
        return get_ai_disabled_response("Сбор медицинских данных")
    
    async def collect_from_source(self, source: str, limit: int = 10) -> Dict[str, Any]:
        """Заглушка для сбора из источника"""
        return get_ai_disabled_response(f"Сбор данных из {source}")
    
    def save_to_database(self, data: List[Dict]) -> bool:
        """Заглушка для сохранения в БД"""
        logger.info("Сохранение собранных данных пропущено - AI отключен")
        return False
    
    def process_medical_text(self, text: str) -> Dict[str, Any]:
        """Заглушка для обработки медицинского текста"""
        return get_ai_disabled_response("Обработка медицинского текста")


class ModelTrainerStub:
    """
    Заглушка для ModelTrainer класса
    """
    
    def __init__(self):
        logger.info("ModelTrainer заменен на заглушку - AI компоненты отключены")
    
    def load_training_data(self, source: str = "collected") -> Dict[str, Any]:
        """Заглушка для загрузки данных обучения"""
        logger.info(f"Загрузка данных обучения заблокирована (AI отключен): источник {source}")
        return get_ai_disabled_response("Загрузка данных обучения")
    
    async def train_all_models(self) -> Dict[str, Any]:
        """Заглушка для обучения всех моделей"""
        logger.info("Обучение всех моделей заблокировано - AI отключен")
        return get_ai_disabled_response("Обучение AI моделей")
    
    async def train_symptom_classifier(self) -> Dict[str, Any]:
        """Заглушка для обучения классификатора симптомов"""
        logger.info("Обучение классификатора симптомов заблокировано - AI отключен")
        return get_ai_disabled_response("Обучение классификатора симптомов")
    
    async def train_disease_classifier(self) -> Dict[str, Any]:
        """Заглушка для обучения классификатора заболеваний"""  
        logger.info("Обучение классификатора заболеваний заблокировано - AI отключен")
        return get_ai_disabled_response("Обучение классификатора заболеваний")
    
    def evaluate_model(self, model_type: str) -> Dict[str, Any]:
        """Заглушка для оценки модели"""
        return get_ai_disabled_response(f"Оценка модели {model_type}")
    
    def save_model(self, model, model_name: str) -> bool:
        """Заглушка для сохранения модели"""
        logger.info(f"Сохранение модели {model_name} пропущено - AI отключен")
        return False
    
    def load_model(self, model_name: str) -> Optional[Any]:
        """Заглушка для загрузки модели"""
        logger.info(f"Загрузка модели {model_name} пропущена - AI отключен")  
        return None


# Экспорт заглушек
__all__ = ["MedicalAIStub", "DataCollectorStub", "ModelTrainerStub"]