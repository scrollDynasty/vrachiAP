"""
Stub implementations for AI services when AI is disabled
These provide the same interface but return "AI disabled" messages
"""

import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

AI_DISABLED_MESSAGE = "AI функции временно отключены из-за высокой нагрузки на сервер"

class MedicalAI:
    """Stub for MedicalAI when AI is disabled"""
    
    def __init__(self):
        self.is_loaded = False
        logger.info("🛑 MedicalAI заглушка активирована (AI отключен)")
    
    async def analyze_symptoms(self, symptoms_text: str, patient_id: int = None) -> Dict[str, Any]:
        """Stub for symptom analysis"""
        return {
            "extracted_symptoms": [],
            "possible_diseases": [],
            "recommendations": [
                {
                    "text": "Обратитесь к врачу для получения профессиональной консультации",
                    "priority": "high",
                    "type": "consultation"
                }
            ],
            "urgency": "medium",
            "confidence": 0.0,
            "disclaimer": AI_DISABLED_MESSAGE,
            "error": "AI_DISABLED"
        }
    
    def load_models(self) -> bool:
        """Stub for model loading"""
        return False
    
    def is_ready(self) -> bool:
        """Stub for readiness check"""
        return False


class DataCollector:
    """Stub for DataCollector when AI is disabled"""
    
    def __init__(self):
        logger.info("🛑 DataCollector заглушка активирована (AI отключен)")
    
    async def collect_data(self, source: str, limit: int = 100) -> Dict[str, Any]:
        """Stub for data collection"""
        return {
            "success": False,
            "collected": 0,
            "error": "AI_DISABLED",
            "message": AI_DISABLED_MESSAGE
        }
    
    def get_sources(self) -> List[str]:
        """Stub for getting available sources"""
        return []


class RealDataCollector:
    """Stub for RealDataCollector when AI is disabled"""
    
    def __init__(self):
        logger.info("🛑 RealDataCollector заглушка активирована (AI отключен)")
    
    async def collect_all_sources(self, limit: int = 100) -> Dict[str, Any]:
        """Stub for collecting from all sources"""
        return {
            "success": False,
            "total_collected": 0,
            "sources_processed": 0,
            "error": "AI_DISABLED",
            "message": AI_DISABLED_MESSAGE
        }
    
    async def collect_medical_articles(self, limit: int = 50) -> Dict[str, Any]:
        """Stub for collecting medical articles"""
        return {
            "success": False,
            "collected": 0,
            "error": "AI_DISABLED",
            "message": AI_DISABLED_MESSAGE
        }
    
    async def collect_symptom_data(self, limit: int = 50) -> Dict[str, Any]:
        """Stub for collecting symptom data"""
        return {
            "success": False,
            "collected": 0,
            "error": "AI_DISABLED",
            "message": AI_DISABLED_MESSAGE
        }


class ModelTrainer:
    """Stub for ModelTrainer when AI is disabled"""
    
    def __init__(self):
        logger.info("🛑 ModelTrainer заглушка активирована (AI отключен)")
    
    def load_training_data(self, source: str = "database") -> bool:
        """Stub for loading training data"""
        return False
    
    async def train_all_models(self) -> Dict[str, Any]:
        """Stub for training all models"""
        return {
            "success": False,
            "models": {},
            "error": "AI_DISABLED",
            "message": AI_DISABLED_MESSAGE
        }
    
    async def train_symptom_classifier(self) -> Dict[str, Any]:
        """Stub for training symptom classifier"""
        return {
            "success": False,
            "accuracy": 0.0,
            "error": "AI_DISABLED",
            "message": AI_DISABLED_MESSAGE
        }
    
    async def train_disease_classifier(self) -> Dict[str, Any]:
        """Stub for training disease classifier"""
        return {
            "success": False,
            "accuracy": 0.0,
            "error": "AI_DISABLED",
            "message": AI_DISABLED_MESSAGE
        }
    
    def save_model(self, model: Any, model_type: str) -> bool:
        """Stub for saving model"""
        return False
    
    def load_model(self, model_type: str) -> Optional[Any]:
        """Stub for loading model"""
        return None


# Additional utility functions that might be needed
def monitor_performance(func):
    """Stub decorator for performance monitoring"""
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper


def format_response(data: Dict, message: str = "") -> Dict[str, Any]:
    """Stub for formatting API responses"""
    return {
        "success": False,
        "message": AI_DISABLED_MESSAGE,
        "data": data
    }


def generate_request_id() -> str:
    """Stub for generating request IDs"""
    return f"disabled_{int(datetime.now().timestamp())}"


def calculate_model_accuracy(*args, **kwargs) -> float:
    """Stub for calculating model accuracy"""
    return 0.0