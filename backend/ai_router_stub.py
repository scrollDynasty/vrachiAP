"""
AI Router Stub - Used when AI is disabled
Provides the same API interface but returns "AI temporarily disabled" messages
"""

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import os

# Create router with the same prefix as the real AI router
router = APIRouter(prefix="/api/ai", tags=["AI Диагностика (Отключено)"])

# Only import auth and models if they don't trigger database connections
try:
    from auth import get_current_user, require_role
    AUTH_AVAILABLE = True
except:
    AUTH_AVAILABLE = False
    
try:
    from models import User, get_db
    from sqlalchemy.orm import Session
    MODELS_AVAILABLE = True
except:
    MODELS_AVAILABLE = False

# Define the same Pydantic models as the real router for API compatibility
class DiagnosisRequest(BaseModel):
    symptoms_description: str
    patient_age: Optional[int] = None
    patient_gender: Optional[str] = None
    additional_info: Optional[str] = None

class DiagnosisResponse(BaseModel):
    request_id: str
    extracted_symptoms: List[Dict]
    possible_diseases: List[Dict]
    recommendations: List[Dict]
    urgency: str
    confidence: float
    disclaimer: str
    processing_time: float
    timestamp: str

class TrainingRequest(BaseModel):
    data_source: str = "collected"
    model_type: str = "all"
    retrain_all: bool = False
    epochs: Optional[int] = 10
    learning_rate: Optional[float] = 0.001

class DataCollectionRequest(BaseModel):
    max_articles: int = 50
    sources: Optional[List[str]] = None
    languages: Optional[List[str]] = ['en', 'ru']

class AIFeedbackCreate(BaseModel):
    diagnosis_id: int
    was_correct: bool
    actual_disease: Optional[str] = None
    additional_notes: Optional[str] = None

# Standard error response for disabled AI
AI_DISABLED_MESSAGE = "AI функции временно отключены из-за высокой нагрузки на сервер. Пожалуйста, обратитесь к врачу напрямую."

def create_ai_disabled_error():
    """Create a standard HTTPException for disabled AI"""
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "error": "AI_TEMPORARILY_DISABLED",
            "message": AI_DISABLED_MESSAGE,
            "recommendation": "Обратитесь к врачу для получения медицинской консультации"
        }
    )

# Create dependency stubs if auth/models not available
def get_current_user_stub():
    """Stub for get_current_user when auth is not available"""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Authentication service unavailable (AI disabled)"
    )

def require_role_stub(role: str):
    """Stub for require_role when auth is not available"""
    def dependency():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable (AI disabled)"
        )
    return dependency

def get_db_stub():
    """Stub for get_db when models are not available"""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Database service unavailable (AI disabled)"
    )

# Use real dependencies if available, otherwise use stubs
if AUTH_AVAILABLE and MODELS_AVAILABLE:
    current_user_dep = Depends(get_current_user)
    admin_user_dep = Depends(require_role("admin"))
    db_dep = Depends(get_db)
else:
    current_user_dep = Depends(get_current_user_stub)
    admin_user_dep = Depends(require_role_stub("admin"))
    db_dep = Depends(get_db_stub)

@router.post("/diagnosis", summary="AI диагностика (отключено)")
async def diagnose_symptoms_stub(request: DiagnosisRequest):
    """
    Заглушка для AI диагностики - возвращает сообщение о том, что AI отключен
    """
    raise create_ai_disabled_error()

@router.get("/patient/history", summary="История AI диагностики (отключено)")
async def get_patient_diagnosis_history_stub(
    limit: int = 20,
    offset: int = 0
):
    """
    Заглушка для истории AI диагностики
    """
    # For history, we can return empty results instead of an error
    # since users might want to see if they had previous diagnoses
    return {
        "success": False,
        "message": AI_DISABLED_MESSAGE,
        "data": {
            "diagnosis_history": [],
            "total": 0,
            "offset": offset,
            "limit": limit
        }
    }

@router.post("/feedback")
async def submit_feedback_stub(feedback: AIFeedbackCreate):
    """
    Заглушка для обратной связи AI
    """
    raise create_ai_disabled_error()

@router.get("/feedback/stats")
async def get_feedback_stats_stub():
    """
    Заглушка для статистики обратной связи
    """
    return {
        "success": False,
        "message": AI_DISABLED_MESSAGE,
        "data": {
            "total_feedback": 0,
            "correct_diagnoses": 0,
            "accuracy": 0,
            "common_diseases": []
        }
    }

@router.post("/admin/collect-data", summary="Сбор данных (отключено)")
async def collect_medical_data_stub(request: DataCollectionRequest):
    """
    Заглушка для сбора медицинских данных
    """
    raise create_ai_disabled_error()

@router.post("/admin/train", summary="Обучение AI (отключено)")
async def train_ai_models_stub(request: TrainingRequest):
    """
    Заглушка для обучения AI моделей
    """
    raise create_ai_disabled_error()

@router.get("/admin/stats", summary="Статистика AI (отключено)")
async def get_ai_stats_stub():
    """
    Заглушка для статистики AI системы
    """
    return {
        "success": False,
        "message": AI_DISABLED_MESSAGE,
        "data": {
            "diagnoses": {"total": 0, "today": 0},
            "models": {"active": 0, "total": 0},
            "training_data": {"total": 0, "processed": 0, "processed_percentage": 0},
            "feedback": {"total": 0, "average_rating": 0},
            "recent_trainings": [],
            "system_status": "disabled"
        }
    }

# Add a new endpoint to check AI status
@router.get("/status", summary="Статус AI системы")
async def get_ai_status():
    """
    Возвращает текущий статус AI системы
    """
    return {
        "ai_enabled": False,
        "status": "disabled",
        "message": AI_DISABLED_MESSAGE,
        "reason": "Временно отключено из-за высокой нагрузки на сервер"
    }