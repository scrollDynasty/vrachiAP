#!/usr/bin/env python3
"""
API роутер для AI диагностики с интеграцией в базу данных
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import json
import os
import sys

# Добавляем путь к AI модулям
sys.path.append(os.path.join(os.path.dirname(__file__), 'ai_system'))

# Импорты AI системы
from ai_system.inference import (
    diagnose_symptoms,
    get_model_status,
    get_available_symptoms,
    get_available_diseases,
    search_symptoms,
    medical_ai
)
from ai_system.train_model import MedicalModelTrainer
from ai_system.data_downloader import MedicalDataDownloader

# Импорты разговорной AI системы
from ai_system.conversational_ai import (
    start_doctor_consultation,
    chat_with_doctor,
    get_chat_history,
    end_doctor_consultation,
    get_doctor_status as get_conversational_doctor_status
)

# Импорты базы данных
from models import (
    AIDiagnosis, AIFeedback, User, get_db,
    AIConversation, AIConversationMessage, AIConversationFeedback, AIConversationTraining
)
from auth import get_current_user, require_role

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["AI Diagnosis"])

# Pydantic модели
class DiagnosisRequest(BaseModel):
    symptoms: List[str] = Field(..., description="Список симптомов пациента")
    symptoms_description: Optional[str] = Field(None, description="Описание симптомов")
    patient_age: Optional[int] = Field(None, description="Возраст пациента")
    patient_gender: Optional[str] = Field(None, description="Пол пациента")
    additional_info: Optional[str] = Field(None, description="Дополнительная информация")
    top_k: int = Field(3, description="Количество топ диагнозов", ge=1, le=10)

class DiagnosisResponse(BaseModel):
    success: bool
    diagnosis_id: Optional[int] = None
    predictions: List[Dict[str, Any]]
    input_symptoms: List[str]
    recognized_symptoms: List[str]
    processing_time: float
    model_status: str
    confidence: Optional[float] = None
    urgency: Optional[str] = None
    recommendations: Optional[List[str]] = None
    disclaimer: str

class ModelStatusResponse(BaseModel):
    model_loaded: bool
    symptoms_count: int
    diseases_count: int
    model_info: Dict[str, Any]

class SymptomSearchRequest(BaseModel):
    query: str = Field(..., description="Поисковый запрос")
    limit: int = Field(5, description="Максимальное количество результатов", ge=1, le=20)

class FeedbackRequest(BaseModel):
    diagnosis_id: int
    was_correct: bool
    actual_disease: Optional[str] = None
    additional_notes: Optional[str] = None
    symptoms_accuracy: Optional[int] = Field(None, ge=1, le=5)

class TrainingRequest(BaseModel):
    epochs: int = Field(100, description="Количество эпох обучения", ge=10, le=1000)
    download_new_data: bool = Field(True, description="Скачать новые данные")
    use_transfer_learning: bool = Field(True, description="Использовать transfer learning")
    synthetic_data_count: int = Field(200, description="Количество синтетических данных", ge=50, le=1000)

class DiagnosisHistoryResponse(BaseModel):
    id: int
    created_at: datetime
    symptoms_description: str
    extracted_symptoms: List[str]
    possible_diseases: List[Dict[str, Any]]
    confidence: float
    urgency_level: str
    recommendations: List[str]

# Основные эндпоинты
@router.post("/diagnose", response_model=DiagnosisResponse)
async def diagnose(
    request: DiagnosisRequest, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Диагностика симптомов с сохранением в БД"""
    try:
        # Проверяем наличие симптомов
        if not request.symptoms and not request.symptoms_description:
            raise HTTPException(
                status_code=400, 
                detail="Необходимо указать симптомы или их описание"
            )

        # Подготавливаем симптомы для анализа
        symptoms_for_analysis = request.symptoms.copy() if request.symptoms else []
        
        # Если есть описание симптомов, добавляем его как единый симптом
        if request.symptoms_description:
            symptoms_for_analysis.append(request.symptoms_description)

        # Выполняем диагностику
        start_time = datetime.now()
        result = diagnose_symptoms(symptoms_for_analysis, request.top_k)
        processing_time = (datetime.now() - start_time).total_seconds()

        # Если модель недоступна, используем fallback
        if 'error' in result:
            logger.warning(f"AI модель недоступна: {result['error']}")
            # Используем простую fallback диагностику
            result = {
                "predictions": [{"disease": "Требуется консультация врача", "probability": 50.0}],
                "recognized_symptoms": symptoms_for_analysis,
                "confidence": 0.4,
                "urgency": "medium",
                "model_status": "fallback",
                "recommendations": ["Обратитесь к врачу для точного диагноза"]
            }

        # Сохраняем результат в БД
        diagnosis_record = AIDiagnosis(
            patient_id=current_user.id,
            symptoms_description=request.symptoms_description or '; '.join(request.symptoms),
            extracted_symptoms=result.get('recognized_symptoms', symptoms_for_analysis),
            possible_diseases=result.get('predictions', []),
            confidence=result.get('confidence', 0.5),
            urgency_level=result.get('urgency', 'medium'),
            recommendations=result.get('recommendations', []),
            processing_time=processing_time,
            additional_info=request.additional_info,
            patient_age=request.patient_age,
            patient_gender=request.patient_gender
        )
        
        db.add(diagnosis_record)
        db.commit()
        db.refresh(diagnosis_record)

        # Формируем ответ
        response = DiagnosisResponse(
            success=True,
            diagnosis_id=diagnosis_record.id,
            predictions=result.get('predictions', []),
            input_symptoms=symptoms_for_analysis,
            recognized_symptoms=result.get('recognized_symptoms', []),
            processing_time=processing_time,
            model_status=result.get('model_status', 'active'),
            confidence=result.get('confidence'),
            urgency=result.get('urgency'),
            recommendations=result.get('recommendations'),
            disclaimer="Это предварительный анализ симптомов на основе AI. Обязательно проконсультируйтесь с врачом для точного диагноза и лечения."
        )

        logger.info(f"Диагностика завершена для пользователя {current_user.id}, ID диагноза: {diagnosis_record.id}")
        return response

    except Exception as e:
        logger.error(f"Ошибка при диагностике: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при выполнении диагностики: {str(e)}")

@router.get("/status", response_model=ModelStatusResponse)
async def get_ai_status():
    """Получение статуса AI модели"""
    try:
        status = get_model_status()
        
        if 'error' in status:
            return ModelStatusResponse(
                model_loaded=False,
                symptoms_count=0,
                diseases_count=0,
                model_info={"error": status['error'], "status": "not_loaded"}
            )
        
        return ModelStatusResponse(
            model_loaded=status.get('model_loaded', False),
            symptoms_count=status.get('symptoms_count', 0),
            diseases_count=status.get('diseases_count', 0),
            model_info=status
        )
    
    except Exception as e:
        logger.error(f"Ошибка при получении статуса: {e}")
        return ModelStatusResponse(
            model_loaded=False,
            symptoms_count=0,
            diseases_count=0,
            model_info={"error": str(e), "status": "error"}
        )

@router.get("/symptoms")
async def get_symptoms():
    """Получение списка доступных симптомов"""
    try:
        symptoms = get_available_symptoms()
        return {"symptoms": symptoms, "count": len(symptoms)}
    
    except Exception as e:
        logger.error(f"Ошибка при получении симптомов: {e}")
        # Возвращаем базовый список симптомов
        basic_symptoms = [
            "головная боль", "температура", "кашель", "насморк", "боль в горле",
            "тошнота", "рвота", "диарея", "боль в животе", "усталость",
            "головокружение", "одышка", "боль в груди", "боль в спине"
        ]
        return {"symptoms": basic_symptoms, "count": len(basic_symptoms), "source": "fallback"}

@router.get("/diseases")
async def get_diseases():
    """Получение списка заболеваний"""
    try:
        diseases = get_available_diseases()
        return {"diseases": diseases, "count": len(diseases)}
    
    except Exception as e:
        logger.error(f"Ошибка при получении заболеваний: {e}")
        return {"diseases": [], "count": 0, "error": str(e)}

@router.post("/search-symptoms")
async def search_symptoms_endpoint(request: SymptomSearchRequest):
    """Поиск похожих симптомов"""
    try:
        symptoms = search_symptoms(request.query, request.limit)
        return {"symptoms": symptoms, "query": request.query}
    
    except Exception as e:
        logger.error(f"Ошибка при поиске симптомов: {e}")
        return {"symptoms": [], "query": request.query, "error": str(e)}

@router.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отправка обратной связи по диагностике"""
    try:
        # Проверяем существование диагноза
        diagnosis = db.query(AIDiagnosis).filter(
            AIDiagnosis.id == request.diagnosis_id,
            AIDiagnosis.patient_id == current_user.id
        ).first()
        
        if not diagnosis:
            raise HTTPException(status_code=404, detail="Диагноз не найден")

        # Создаем запись обратной связи
        feedback = AIFeedback(
            diagnosis_id=request.diagnosis_id,
            was_correct=request.was_correct,
            actual_disease=request.actual_disease,
            additional_notes=request.additional_notes,
            symptoms_accuracy=request.symptoms_accuracy
        )
        
        db.add(feedback)
        db.commit()

        # В фоновом режиме можем запускать дообучение модели
        # background_tasks.add_task(trigger_model_retraining)

        logger.info(f"Получена обратная связь для диагноза {request.diagnosis_id}")
        return {"success": True, "message": "Спасибо за обратную связь!"}

    except Exception as e:
        logger.error(f"Ошибка при сохранении обратной связи: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при сохранении обратной связи")

@router.get("/history")
async def get_diagnosis_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0
):
    """Получение истории диагностики пациента"""
    try:
        # Только пациенты могут смотреть свою историю
        if current_user.role != "patient":
            raise HTTPException(status_code=403, detail="Доступно только для пациентов")

        diagnoses = db.query(AIDiagnosis).filter(
            AIDiagnosis.patient_id == current_user.id
        ).order_by(
            AIDiagnosis.created_at.desc()
        ).offset(offset).limit(limit).all()

        history = []
        for diagnosis in diagnoses:
            history.append(DiagnosisHistoryResponse(
                id=diagnosis.id,
                created_at=diagnosis.created_at,
                symptoms_description=diagnosis.symptoms_description,
                extracted_symptoms=diagnosis.extracted_symptoms or [],
                possible_diseases=diagnosis.possible_diseases or [],
                confidence=diagnosis.confidence,
                urgency_level=diagnosis.urgency_level,
                recommendations=diagnosis.recommendations or []
            ))

        return {
            "success": True,
            "data": {
                "diagnosis_history": history,
                "total_count": len(history),
                "has_more": len(history) == limit
            }
        }

    except Exception as e:
        logger.error(f"Ошибка при получении истории: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при получении истории диагностики")

# Админские эндпоинты
@router.post("/admin/retrain")
async def retrain_model(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role("admin"))
):
    """Переобучение модели (только для админов)"""
    try:
        # Запускаем обучение в фоновом режиме
        background_tasks.add_task(
            perform_model_training,
            request.epochs,
            request.download_new_data,
            request.use_transfer_learning,
            request.synthetic_data_count
        )
        
        return {
            "success": True,
            "message": f"Переобучение модели запущено с параметрами: {request.epochs} эпох"
        }

    except Exception as e:
        logger.error(f"Ошибка при запуске переобучения: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при запуске переобучения")

@router.get("/admin/feedback")
async def get_all_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
    limit: int = 50,
    offset: int = 0
):
    """Получение всей обратной связи (только для админов)"""
    try:
        feedbacks = db.query(AIFeedback).join(AIDiagnosis).order_by(
            AIFeedback.created_at.desc()
        ).offset(offset).limit(limit).all()

        return {
            "feedbacks": [
                {
                    "id": fb.id,
                    "diagnosis_id": fb.diagnosis_id,
                    "was_correct": fb.was_correct,
                    "actual_disease": fb.actual_disease,
                    "additional_notes": fb.additional_notes,
                    "symptoms_accuracy": fb.symptoms_accuracy,
                    "created_at": fb.created_at
                }
                for fb in feedbacks
            ],
            "total_count": len(feedbacks)
        }

    except Exception as e:
        logger.error(f"Ошибка при получении обратной связи: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при получении обратной связи")

@router.get("/admin/stats")
async def get_ai_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Получение статистики AI системы"""
    try:
        # Общая статистика диагностики
        total_diagnoses = db.query(AIDiagnosis).count()
        total_feedback = db.query(AIFeedback).count()
        
        # Статистика по точности
        correct_feedback = db.query(AIFeedback).filter(
            AIFeedback.was_correct == True
        ).count()
        
        accuracy = (correct_feedback / total_feedback * 100) if total_feedback > 0 else 0

        # Статистика модели
        model_status = get_model_status()

        return {
            "success": True,
            "statistics": {
                "total_diagnoses": total_diagnoses,
                "total_feedback": total_feedback,
                "accuracy_percentage": round(accuracy, 2),
                "model_info": model_status,
                "last_updated": datetime.now().isoformat()
            }
        }

    except Exception as e:
        logger.error(f"Ошибка при получении статистики: {e}")
        raise HTTPException(status_code=500, detail="Ошибка при получении статистики")

@router.post("/admin/retrain-on-conversations")
async def retrain_on_conversations(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role("admin")),
    db: Session = Depends(get_db)
):
    """Переобучение AI на основе сохраненных диалогов пользователей"""
    try:
        # Получаем все завершенные диалоги с отзывами
        conversations = db.query(AIConversation).filter(
            AIConversation.status == 'completed'
        ).all()
        
        if not conversations:
            return {
                "success": False,
                "message": "Нет данных диалогов для обучения"
            }
        
        # Запускаем обучение в фоновом режиме
        background_tasks.add_task(
            perform_conversation_training, 
            conversations, 
            db
        )
        
        logger.info(f"Запущено переобучение AI на {len(conversations)} диалогах администратором {current_user.id}")
        
        return {
            "success": True,
            "message": f"Запущено переобучение AI на {len(conversations)} диалогах",
            "estimated_time": f"{len(conversations) * 2} минут"
        }
        
    except Exception as e:
        logger.error(f"Ошибка при запуске переобучения на диалогах: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при запуске переобучения: {str(e)}")

async def perform_conversation_training(conversations: list, db: Session):
    """Выполняет обучение AI на диалогах пользователей"""
    try:
        logger.info(f"Начинаем обучение AI на {len(conversations)} диалогах...")
        
        # Создаем тренировочные записи из диалогов
        training_data = []
        
        for conv in conversations:
            # Получаем сообщения диалога
            messages = db.query(AIConversationMessage).filter(
                AIConversationMessage.conversation_id == conv.id
            ).order_by(AIConversationMessage.sent_at).all()
            
            # Извлекаем паттерны симптом-диагноз
            patient_messages = [msg.message for msg in messages if msg.sender_role == 'patient']
            
            if patient_messages and conv.current_symptoms:
                # Создаем запись для обучения
                training_record = AIConversationTraining(
                    conversation_id=conv.id,
                    patient_input=' '.join(patient_messages),
                    extracted_symptoms=conv.current_symptoms,
                    diagnosed_conditions=conv.suspected_conditions or [],
                    conversation_stage=conv.conversation_stage,
                    urgency_level=conv.urgency_level,
                    was_successful=bool(conv.suspected_conditions),
                    training_metadata={
                        'message_count': len(messages),
                        'duration': (conv.ended_at - conv.created_at).total_seconds() if conv.ended_at else 0
                    }
                )
                
                db.add(training_record)
                training_data.append({
                    'input': ' '.join(patient_messages),
                    'symptoms': conv.current_symptoms,
                    'conditions': conv.suspected_conditions or [],
                    'stage': conv.conversation_stage,
                    'urgency': conv.urgency_level
                })
        
        db.commit()
        
        # Сохраняем данные для обучения в файл
        import json
        training_file = f"ai_system/medical_data/conversation_training_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(training_file, 'w', encoding='utf-8') as f:
            json.dump(training_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Создан файл обучения: {training_file} с {len(training_data)} записями")
        logger.info("Обучение AI на диалогах завершено")
        
    except Exception as e:
        logger.error(f"Ошибка при обучении на диалогах: {e}")

# === НОВЫЕ ЭНДПОИНТЫ ДЛЯ РАЗГОВОРНОЙ AI ===

# Pydantic модели для разговорной AI
class StartConversationRequest(BaseModel):
    patient_age: Optional[int] = Field(None, description="Возраст пациента")
    patient_gender: Optional[str] = Field(None, description="Пол пациента")
    additional_info: Optional[str] = Field(None, description="Дополнительная информация")

class ConversationStartResponse(BaseModel):
    success: bool
    session_id: str
    message: str
    stage: str

class ChatMessageRequest(BaseModel):
    session_id: str = Field(..., description="ID сессии разговора")
    message: str = Field(..., description="Сообщение пациента")

class ChatMessageResponse(BaseModel):
    success: bool
    session_id: str
    message: str
    stage: str
    urgency: str
    symptoms: List[str]
    conditions: List[str]
    recommendations: List[str]

class ConversationHistoryResponse(BaseModel):
    session_id: str
    messages: List[Dict[str, Any]]
    conversation_info: Dict[str, Any]

class ConversationFeedbackRequest(BaseModel):
    session_id: str
    overall_rating: int = Field(..., ge=1, le=5, description="Общая оценка разговора")
    conversation_quality: Optional[int] = Field(None, ge=1, le=5)
    medical_accuracy: Optional[int] = Field(None, ge=1, le=5)
    helpfulness: Optional[int] = Field(None, ge=1, le=5)
    ai_empathy: Optional[int] = Field(None, ge=1, le=5)
    comment: Optional[str] = None
    improvement_suggestions: Optional[str] = None
    was_helpful: Optional[bool] = None
    would_recommend: Optional[bool] = None

@router.post("/conversation/start", response_model=ConversationStartResponse)
async def start_ai_conversation(
    request: StartConversationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Начать разговор с AI врачом"""
    try:
        # Формируем информацию о пациенте
        patient_info = {
            "user_id": current_user.id,
            "age": request.patient_age,
            "gender": request.patient_gender,
            "additional_info": request.additional_info
        }
        
        # Получаем профиль пациента если есть
        if hasattr(current_user, 'patient_profile') and current_user.patient_profile:
            profile = current_user.patient_profile
            patient_info.update({
                "name": profile.full_name,
                "phone": profile.contact_phone,
                "city": profile.city,
                "medical_info": profile.medical_info
            })
        
        # Начинаем разговор
        result = start_doctor_consultation(patient_info)
        session_id = result['session_id']
        
        # Сохраняем в БД
        conversation = AIConversation(
            session_id=session_id,
            patient_id=current_user.id,
            patient_info=patient_info,
            conversation_stage='greeting',
            status='active'
        )
        db.add(conversation)
        db.commit()
        
        # Сохраняем первое сообщение
        message = AIConversationMessage(
            conversation_id=conversation.id,
            sender_role='ai_doctor',
            message=result['message'],
            message_context={'stage': result['stage']}
        )
        db.add(message)
        db.commit()
        
        logger.info(f"Начат разговор с AI врачом для пользователя {current_user.id}, сессия: {session_id}")
        
        return ConversationStartResponse(
            success=True,
            session_id=session_id,
            message=result['message'],
            stage=result['stage']
        )
        
    except Exception as e:
        logger.error(f"Ошибка при начале разговора с AI: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при начале разговора: {str(e)}")

@router.post("/conversation/chat", response_model=ChatMessageResponse)
async def chat_with_ai_doctor(
    request: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отправить сообщение AI врачу"""
    try:
        # Проверяем существование сессии в БД
        conversation = db.query(AIConversation).filter(
            AIConversation.session_id == request.session_id,
            AIConversation.patient_id == current_user.id,
            AIConversation.status == 'active'
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Сессия разговора не найдена или завершена")
        
        # Сохраняем сообщение пациента
        patient_message = AIConversationMessage(
            conversation_id=conversation.id,
            sender_role='patient',
            message=request.message
        )
        db.add(patient_message)
        
        # Получаем ответ от AI
        start_time = datetime.now()
        ai_response = chat_with_doctor(request.session_id, request.message)
        processing_time = (datetime.now() - start_time).total_seconds()
        
        if 'error' in ai_response:
            raise HTTPException(status_code=500, detail=ai_response['error'])
        
        # Сохраняем ответ AI
        ai_message = AIConversationMessage(
            conversation_id=conversation.id,
            sender_role='ai_doctor',
            message=ai_response['message'],
            message_context={
                'stage': ai_response['stage'],
                'urgency': ai_response['urgency'],
                'symptoms': ai_response['symptoms'],
                'conditions': ai_response['conditions']
            },
            processing_time=processing_time
        )
        db.add(ai_message)
        
        # Обновляем контекст разговора
        conversation.current_symptoms = ai_response['symptoms']
        conversation.suspected_conditions = ai_response['conditions']
        conversation.urgency_level = ai_response['urgency']
        conversation.conversation_stage = ai_response['stage']
        conversation.updated_at = datetime.now()
        
        db.commit()
        
        logger.info(f"Сообщение обработано для сессии {request.session_id}, стадия: {ai_response['stage']}")
        
        return ChatMessageResponse(
            success=True,
            session_id=request.session_id,
            message=ai_response['message'],
            stage=ai_response['stage'],
            urgency=ai_response['urgency'],
            symptoms=ai_response['symptoms'],
            conditions=ai_response['conditions'],
            recommendations=ai_response.get('recommendations', [])
        )
        
    except Exception as e:
        logger.error(f"Ошибка при обработке сообщения: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при обработке сообщения: {str(e)}")

@router.get("/conversation/{session_id}/history", response_model=ConversationHistoryResponse)
async def get_conversation_history(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получить историю разговора"""
    try:
        # Проверяем доступ к сессии
        conversation = db.query(AIConversation).filter(
            AIConversation.session_id == session_id,
            AIConversation.patient_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Разговор не найден")
        
        # Получаем сообщения
        messages = db.query(AIConversationMessage).filter(
            AIConversationMessage.conversation_id == conversation.id
        ).order_by(AIConversationMessage.sent_at).all()
        
        # Формируем историю
        history = []
        for msg in messages:
            history.append({
                "speaker": msg.sender_role,
                "message": msg.message,
                "timestamp": msg.sent_at.isoformat(),
                "context": msg.message_context,
                "processing_time": msg.processing_time
            })
        
        conversation_info = {
            "session_id": session_id,
            "status": conversation.status,
            "stage": conversation.conversation_stage,
            "urgency": conversation.urgency_level,
            "symptoms": conversation.current_symptoms,
            "conditions": conversation.suspected_conditions,
            "created_at": conversation.created_at.isoformat(),
            "updated_at": conversation.updated_at.isoformat()
        }
        
        return ConversationHistoryResponse(
            session_id=session_id,
            messages=history,
            conversation_info=conversation_info
        )
        
    except Exception as e:
        logger.error(f"Ошибка при получении истории разговора: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении истории: {str(e)}")

@router.post("/conversation/{session_id}/end")
async def end_ai_conversation(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Завершить разговор с AI врачом"""
    try:
        # Находим разговор
        conversation = db.query(AIConversation).filter(
            AIConversation.session_id == session_id,
            AIConversation.patient_id == current_user.id,
            AIConversation.status == 'active'
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Активный разговор не найден")
        
        # Завершаем разговор в AI системе
        end_result = end_doctor_consultation(session_id)
        
        # Обновляем статус в БД
        conversation.status = 'completed'
        conversation.ended_at = datetime.now()
        conversation.final_recommendations = end_result.get('summary', {}).get('recommendations', [])
        conversation.conversation_summary = f"Разговор завершен. Длительность: {end_result.get('summary', {}).get('duration', 0)} сек."
        
        db.commit()
        
        logger.info(f"Разговор {session_id} завершен для пользователя {current_user.id}")
        
        return {
            "success": True,
            "message": end_result['message'],
            "summary": end_result.get('summary', {})
        }
        
    except Exception as e:
        logger.error(f"Ошибка при завершении разговора: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при завершении разговора: {str(e)}")

@router.post("/conversation/{session_id}/feedback")
async def submit_conversation_feedback(
    session_id: str,
    feedback: ConversationFeedbackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Оставить отзыв о разговоре с AI врачом"""
    try:
        # Находим разговор
        conversation = db.query(AIConversation).filter(
            AIConversation.session_id == session_id,
            AIConversation.patient_id == current_user.id
        ).first()
        
        if not conversation:
            raise HTTPException(status_code=404, detail="Разговор не найден")
        
        # Создаем отзыв
        feedback_record = AIConversationFeedback(
            conversation_id=conversation.id,
            patient_id=current_user.id,
            overall_rating=feedback.overall_rating,
            conversation_quality=feedback.conversation_quality,
            medical_accuracy=feedback.medical_accuracy,
            helpfulness=feedback.helpfulness,
            ai_empathy=feedback.ai_empathy,
            comment=feedback.comment,
            improvement_suggestions=feedback.improvement_suggestions,
            was_helpful=feedback.was_helpful,
            would_recommend=feedback.would_recommend
        )
        
        db.add(feedback_record)
        db.commit()
        
        logger.info(f"Получен отзыв для разговора {session_id}, оценка: {feedback.overall_rating}")
        
        return {
            "success": True,
            "message": "Спасибо за ваш отзыв! Он поможет нам улучшить AI врача."
        }
        
    except Exception as e:
        logger.error(f"Ошибка при сохранении отзыва: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при сохранении отзыва: {str(e)}")

@router.get("/conversation/status")
async def get_conversational_ai_status():
    """Получить статус разговорной AI системы"""
    try:
        status = get_conversational_doctor_status()
        
        return {
            "success": True,
            "status": status
        }
        
    except Exception as e:
        logger.error(f"Ошибка при получении статуса разговорной AI: {e}")
        return {
            "success": False,
            "status": {
                "model_loaded": False,
                "active_sessions": 0,
                "error": str(e)
            }
        }

@router.get("/conversations")
async def get_my_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    limit: int = 20,
    offset: int = 0
):
    """Получить список моих разговоров с AI врачом"""
    try:
        conversations = db.query(AIConversation).filter(
            AIConversation.patient_id == current_user.id
        ).order_by(AIConversation.created_at.desc()).offset(offset).limit(limit).all()
        
        result = []
        for conv in conversations:
            # Получаем последнее сообщение
            last_message = db.query(AIConversationMessage).filter(
                AIConversationMessage.conversation_id == conv.id
            ).order_by(AIConversationMessage.sent_at.desc()).first()
            
            result.append({
                "session_id": conv.session_id,
                "status": conv.status,
                "stage": conv.conversation_stage,
                "urgency": conv.urgency_level,
                "symptoms": conv.current_symptoms or [],
                "conditions": conv.suspected_conditions or [],
                "created_at": conv.created_at.isoformat(),
                "updated_at": conv.updated_at.isoformat(),
                "ended_at": conv.ended_at.isoformat() if conv.ended_at else None,
                "last_message": {
                    "sender": last_message.sender_role,
                    "message": last_message.message[:100] + "..." if len(last_message.message) > 100 else last_message.message,
                    "sent_at": last_message.sent_at.isoformat()
                } if last_message else None
            })
        
        return {
            "success": True,
            "conversations": result,
            "total_count": len(result)
        }
        
    except Exception as e:
        logger.error(f"Ошибка при получении списка разговоров: {e}")
        raise HTTPException(status_code=500, detail=f"Ошибка при получении разговоров: {str(e)}")

# Совместимость со старыми эндпоинтами
@router.post("/diagnosis")
async def diagnose_legacy(
    request: DiagnosisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Legacy эндпоинт для совместимости"""
    return await diagnose(request, db, current_user)

@router.get("/patient/history")
async def get_patient_history_legacy(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Legacy эндпоинт для истории пациента"""
    return await get_diagnosis_history(db, current_user) 