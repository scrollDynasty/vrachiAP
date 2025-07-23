"""
AI Router - API роутер для реальной AI диагностики с интеграцией БД
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
import logging
from datetime import datetime
import asyncio
import json

# Импорты из основного проекта
from auth import get_current_user, require_role
from ai_config import is_ai_enabled, get_ai_disabled_response, get_ai_stub_diagnosis

# Условный импорт моделей БД только если AI включен
if is_ai_enabled():
    try:
        from models import (
            User, get_db, AIDiagnosis, AITrainingData, AIModel, 
            AIModelTraining, AIFeedback
        )
        from ai_service.utils import monitor_performance, format_response, generate_request_id
    except ImportError:
        # Если не удается импортировать модели, создаем заглушки
        def get_db():
            raise HTTPException(status_code=503, detail="Database unavailable when AI is disabled")
        def monitor_performance(func):
            return func
        def format_response(data, message=""):
            return data
        def generate_request_id():
            return "stub_request_id"
else:
    # Создаем заглушки для функций когда AI отключен
    def get_db():
        raise HTTPException(status_code=503, detail="Database unavailable when AI is disabled")
    def monitor_performance(func):
        return func
    def format_response(data, message=""):
        return data
    def generate_request_id():
        return "stub_request_id"

# Импорт AI сервисов (будут заглушками если AI отключен)
from ai_service import MedicalAI, DataCollector, ModelTrainer
from pydantic import BaseModel, Field

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Создаем роутер
router = APIRouter(prefix="/api/ai", tags=["AI Диагностика"])

# Глобальные экземпляры AI сервисов (будут заглушками если AI отключен)
medical_ai = MedicalAI()
data_collector = DataCollector()
model_trainer = ModelTrainer()

# Проверка статуса AI
def check_ai_enabled():
    """Проверяет включен ли AI и возвращает соответствующий ответ"""
    if not is_ai_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=get_ai_disabled_response("AI сервис")
        )


# Pydantic модели для API
class DiagnosisRequest(BaseModel):
    """Запрос на диагностику"""
    symptoms_description: str = Field(..., description="Описание симптомов пациента", min_length=5, max_length=2000)
    patient_age: Optional[int] = Field(None, description="Возраст пациента", ge=0, le=120)
    patient_gender: Optional[str] = Field(None, description="Пол пациента", pattern="^(male|female|other)$")
    additional_info: Optional[str] = Field(None, description="Дополнительная информация", max_length=1000)


class DiagnosisResponse(BaseModel):
    """Ответ с диагностикой"""
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
    """Запрос на обучение модели"""
    data_source: str = Field("collected", description="Источник данных для обучения")
    model_type: str = Field("all", description="Тип модели для обучения")
    retrain_all: bool = Field(False, description="Переобучить все модели")
    epochs: Optional[int] = Field(10, description="Количество эпох обучения")
    learning_rate: Optional[float] = Field(0.001, description="Скорость обучения")


class DataCollectionRequest(BaseModel):
    """Запрос на сбор данных"""
    max_articles: int = Field(50, description="Максимальное количество статей для сбора", ge=1, le=500)
    sources: Optional[List[str]] = Field(None, description="Источники для сбора данных")
    languages: Optional[List[str]] = Field(['en', 'ru'], description="Языки для сбора")


class AIFeedbackCreate(BaseModel):
    diagnosis_id: int
    was_correct: bool
    actual_disease: Optional[str] = None
    additional_notes: Optional[str] = None


@router.post("/diagnosis", response_model=DiagnosisResponse, summary="Реальная AI диагностика симптомов")
@monitor_performance
async def diagnose_symptoms(
    request: DiagnosisRequest,
    db: Session = Depends(get_db) if is_ai_enabled() else None,
    current_user: User = Depends(get_current_user) if is_ai_enabled() else None
):
    """
    Реальный анализ симптомов пациента с использованием AI и сохранением в БД
    
    - **symptoms_description**: Описание симптомов пациента
    - **patient_age**: Возраст пациента (опционально)
    - **patient_gender**: Пол пациента (опционально)
    - **additional_info**: Дополнительная информация (опционально)
    """
    # Проверяем статус AI
    if not is_ai_enabled():
        # Возвращаем заглушку диагностики
        start_time = datetime.now()
        processing_time = (datetime.now() - start_time).total_seconds()
        
        stub_response = get_ai_stub_diagnosis()
        stub_response["processing_time"] = processing_time
        stub_response["timestamp"] = datetime.now().isoformat()
        
        return DiagnosisResponse(**stub_response)
    
    try:
        start_time = datetime.now()
        request_id = generate_request_id()
        
        logger.info(f"Новый запрос на AI диагностику от пользователя {current_user.id}, request_id: {request_id}")
        
        # Проверяем роль пользователя
        if current_user.role != 'patient':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="AI диагностика доступна только для пациентов"
            )
        
        # Формируем полный текст для анализа
        full_text = request.symptoms_description
        if request.additional_info:
            full_text += f" {request.additional_info}"
        
        # Добавляем контекст возраста и пола
        if request.patient_age:
            full_text += f" Возраст: {request.patient_age} лет"
        if request.patient_gender:
            gender_text = {"male": "мужчина", "female": "женщина", "other": "другой пол"}
            full_text += f" Пол: {gender_text.get(request.patient_gender, request.patient_gender)}"
        
        # Выполняем реальный AI анализ
        analysis_result = await medical_ai.analyze_symptoms(full_text, patient_id=current_user.id)
        
        # Рассчитываем время обработки
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Формируем ответ
        response = DiagnosisResponse(
            request_id=request_id,
            extracted_symptoms=analysis_result.get("extracted_symptoms", []),
            possible_diseases=analysis_result.get("possible_diseases", []),
            recommendations=analysis_result.get("recommendations", []),
            urgency=analysis_result.get("urgency", "medium"),
            confidence=analysis_result.get("confidence", 0.0),
            disclaimer=analysis_result.get("disclaimer", "Это предварительный анализ AI. Обязательно проконсультируйтесь с врачом."),
            processing_time=processing_time,
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"AI диагностика завершена, request_id: {request_id}, время: {processing_time:.2f}с")
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при AI диагностике: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при анализе симптомов: {str(e)}"
        )


@router.get("/patient/history", summary="История AI диагностики пациента")
@monitor_performance
async def get_patient_diagnosis_history(
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение истории AI диагностики текущего пациента
    """
    try:
        if current_user.role != 'patient':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Доступ только для пациентов"
            )
        
        # Получаем историю диагностики
        diagnoses = db.query(AIDiagnosis).filter(
            AIDiagnosis.patient_id == current_user.id
        ).order_by(AIDiagnosis.created_at.desc()).offset(offset).limit(limit).all()
        
        # Подсчитываем общее количество
        total = db.query(AIDiagnosis).filter(
            AIDiagnosis.patient_id == current_user.id
        ).count()
        
        # Форматируем данные
        diagnosis_history = []
        for diagnosis in diagnoses:
            diagnosis_history.append({
                "id": diagnosis.id,
                "symptoms_description": diagnosis.symptoms_description,
                "extracted_symptoms": diagnosis.extracted_symptoms or [],
                "possible_diseases": diagnosis.possible_diseases or [],
                "recommendations": diagnosis.recommendations or [],
                "urgency_level": diagnosis.urgency_level,
                "confidence_score": diagnosis.confidence_score,
                "processing_time": diagnosis.processing_time,
                "model_version": diagnosis.model_version,
                "created_at": diagnosis.created_at.isoformat(),
                "feedback_rating": diagnosis.feedback_rating
            })
        
        return format_response({
            "diagnosis_history": diagnosis_history,
            "total": total,
            "offset": offset,
            "limit": limit
        }, message="История AI диагностики получена")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при получении истории диагностики: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении истории: {str(e)}"
        )


@router.post("/feedback")
async def submit_feedback(
    feedback: AIFeedbackCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Сохранение обратной связи для улучшения AI
    Позволяет системе обучаться на реальных случаях
    """
    try:
        # Проверяем, существует ли диагноз
        diagnosis = db.query(AIDiagnosis).filter(
            AIDiagnosis.id == feedback.diagnosis_id,
            AIDiagnosis.user_id == current_user.id
        ).first()
        
        if not diagnosis:
            raise HTTPException(status_code=404, detail="Диагноз не найден")
        
        # Проверяем, не оставлял ли пользователь уже отзыв
        existing_feedback = db.query(AIFeedback).filter(
            AIFeedback.diagnosis_id == feedback.diagnosis_id,
            AIFeedback.user_id == current_user.id
        ).first()
        
        if existing_feedback:
            # Обновляем существующий отзыв
            existing_feedback.was_correct = feedback.was_correct
            existing_feedback.actual_disease = feedback.actual_disease
            existing_feedback.additional_notes = feedback.additional_notes
            existing_feedback.updated_at = datetime.now()
        else:
            # Создаем новый отзыв
            ai_feedback = AIFeedback(
                user_id=current_user.id,
                diagnosis_id=feedback.diagnosis_id,
                was_correct=feedback.was_correct,
                actual_disease=feedback.actual_disease,
                additional_notes=feedback.additional_notes
            )
            db.add(ai_feedback)
        
        db.commit()
        
        # Логируем для системы обучения
        logger.info(f"Получена обратная связь: диагноз #{feedback.diagnosis_id}, "
                   f"корректность: {feedback.was_correct}")
        
        return {
            "success": True,
            "message": "Спасибо за обратную связь! Это поможет улучшить систему.",
            "feedback_status": "updated" if existing_feedback else "created"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при сохранении обратной связи: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при сохранении отзыва")


@router.get("/feedback/stats")
async def get_feedback_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Получение статистики по обратной связи пользователя
    """
    try:
        user_feedbacks = db.query(AIFeedback).filter(
            AIFeedback.user_id == current_user.id
        ).all()
        
        total_feedback = len(user_feedbacks)
        correct_diagnoses = sum(1 for f in user_feedbacks if f.was_correct)
        
        # Статистика по заболеваниям
        disease_stats = {}
        for feedback in user_feedbacks:
            if feedback.actual_disease:
                disease = feedback.actual_disease.lower()
                if disease not in disease_stats:
                    disease_stats[disease] = 0
                disease_stats[disease] += 1
        
        return {
            "total_feedback": total_feedback,
            "correct_diagnoses": correct_diagnoses,
            "accuracy": correct_diagnoses / total_feedback if total_feedback > 0 else 0,
            "common_diseases": sorted(
                disease_stats.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:5]  # Топ-5 заболеваний
        }
        
    except Exception as e:
        logger.error(f"Ошибка при получении статистики: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при получении статистики")


@router.post("/admin/collect-data", summary="Запуск сбора медицинских данных")
@monitor_performance
async def collect_medical_data(
    request: DataCollectionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db) if is_ai_enabled() else None,
    current_user: User = Depends(require_role("admin")) if is_ai_enabled() else None
):
    """
    Запуск реального сбора медицинских данных из источников (только для администраторов)
    """
    # Проверяем статус AI
    if not is_ai_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=get_ai_disabled_response("Сбор медицинских данных")
        )
    
    try:
        logger.info(f"Администратор {current_user.id} запустил сбор медицинских данных")
        
        # Запускаем сбор данных в фоновом режиме
        background_tasks.add_task(
            collect_data_background,
            request.max_articles,
            request.sources,
            request.languages
        )
        
        return format_response({
            "message": f"Запущен сбор медицинских данных (лимит: {request.max_articles})",
            "status": "started",
            "expected_duration": "5-15 минут"
        })
        
    except Exception as e:
        logger.error(f"Ошибка при запуске сбора данных: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при запуске сбора данных: {str(e)}"
        )


@router.post("/admin/train", summary="Запуск обучения AI моделей")
@monitor_performance
async def train_ai_models(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db) if is_ai_enabled() else None,
    current_user: User = Depends(require_role("admin")) if is_ai_enabled() else None
):
    """
    Запуск обучения AI моделей (только для администраторов)
    """
    # Проверяем статус AI
    if not is_ai_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=get_ai_disabled_response("Обучение AI моделей")
        )
    
    try:
        logger.info(f"Администратор {current_user.id} запустил обучение AI моделей")
        
        # Запускаем обучение в фоновом режиме
        background_tasks.add_task(
            train_models_background,
            request.data_source,
            request.model_type,
            request.epochs,
            request.learning_rate,
            current_user.id
        )
        
        return format_response({
            "message": f"Запущено обучение AI моделей ({request.model_type})",
            "status": "started",
            "parameters": {
                "data_source": request.data_source,
                "model_type": request.model_type,
                "epochs": request.epochs,
                "learning_rate": request.learning_rate
            },
            "expected_duration": "10-30 минут"
        })
        
    except Exception as e:
        logger.error(f"Ошибка при запуске обучения моделей: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при запуске обучения: {str(e)}"
        )


@router.get("/admin/stats", summary="Статистика AI системы")
@monitor_performance
async def get_ai_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """
    Получение статистики AI системы (только для администраторов)
    """
    try:
        # Статистика диагностики
        total_diagnoses = db.query(AIDiagnosis).count()
        today_diagnoses = db.query(AIDiagnosis).filter(
            AIDiagnosis.created_at >= datetime.now().date()
        ).count()
        
        # Статистика моделей
        active_models = db.query(AIModel).filter(AIModel.is_active == True).count()
        total_models = db.query(AIModel).count()
        
        # Статистика обучающих данных
        total_training_data = db.query(AITrainingData).count()
        processed_data = db.query(AITrainingData).filter(
            AITrainingData.is_processed == True
        ).count()
        
        # Статистика обратной связи
        total_feedback = db.query(AIFeedback).count()
        avg_rating = db.query(AIFeedback.rating).scalar() or 0
        
        # Последние обучения
        recent_trainings = db.query(AIModelTraining).order_by(
            AIModelTraining.created_at.desc()
        ).limit(5).all()
        
        training_history = []
        for training in recent_trainings:
            training_history.append({
                "id": training.id,
                "model_type": training.model.model_type if training.model else "unknown",
                "status": training.status,
                "started_at": training.started_at.isoformat() if training.started_at else None,
                "duration": training.duration,
                "created_at": training.created_at.isoformat()
            })
        
        return format_response({
            "diagnoses": {
                "total": total_diagnoses,
                "today": today_diagnoses
            },
            "models": {
                "active": active_models,
                "total": total_models
            },
            "training_data": {
                "total": total_training_data,
                "processed": processed_data,
                "processed_percentage": round((processed_data / max(1, total_training_data)) * 100, 1)
            },
            "feedback": {
                "total": total_feedback,
                "average_rating": round(avg_rating, 1)
            },
            "recent_trainings": training_history,
            "system_status": "operational"
        }, message="Статистика AI системы")
        
    except Exception as e:
        logger.error(f"Ошибка при получении статистики: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении статистики: {str(e)}"
        )


# Фоновые задачи
async def collect_data_background(max_articles: int, sources: Optional[List[str]] = None, languages: Optional[List[str]] = None):
    """Фоновый сбор данных"""
    try:
        logger.info(f"Запуск фонового сбора данных: {max_articles} статей")
        
        collector = RealDataCollector()
        result = await collector.collect_all_sources(limit=max_articles)
        
        logger.info(f"Фоновый сбор данных завершен: {result}")
        
    except Exception as e:
        logger.error(f"Ошибка в фоновом сборе данных: {e}")


async def train_models_background(data_source: str, model_type: str, epochs: int, learning_rate: float, user_id: int):
    """Фоновое обучение моделей"""
    try:
        logger.info(f"Запуск фонового обучения моделей: {model_type}")
        
        trainer = ModelTrainer()
        
        # Загружаем данные
        trainer.load_training_data(data_source)
        
        # Запускаем обучение
        if model_type == "all":
            result = await trainer.train_all_models()
        else:
            # Обучение конкретного типа модели
            if model_type == "symptom_classifier":
                result = await trainer.train_symptom_classifier()
            elif model_type == "disease_classifier":
                result = await trainer.train_disease_classifier()
            else:
                raise ValueError(f"Неизвестный тип модели: {model_type}")
        
        logger.info(f"Фоновое обучение моделей завершено: {result}")
        
    except Exception as e:
        logger.error(f"Ошибка в фоновом обучении моделей: {e}")


@router.on_event("startup")
async def startup_ai_service():
    """Инициализация AI сервиса при старте"""
    try:
        logger.info("Инициализация AI сервиса...")
        # Здесь можно добавить дополнительную инициализацию
        logger.info("AI сервис инициализирован успешно")
    except Exception as e:
        logger.error(f"Ошибка при инициализации AI сервиса: {e}")


@router.on_event("shutdown")
async def shutdown_ai_service():
    """Завершение работы AI сервиса"""
    try:
        logger.info("Завершение работы AI сервиса...")
        # Здесь можно добавить cleanup логику
        logger.info("AI сервис завершен")
    except Exception as e:
        logger.error(f"Ошибка при завершении AI сервиса: {e}") 