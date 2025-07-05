"""
AI Router - API роутер для AI диагностики
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
from models import User, get_db
from ai_service import MedicalAI, DataCollector, ModelTrainer
from ai_service.utils import monitor_performance, format_response, generate_request_id
from pydantic import BaseModel, Field

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Создаем роутер
router = APIRouter(prefix="/api/ai", tags=["AI Диагностика"])

# Глобальные экземпляры AI сервисов
medical_ai = MedicalAI()
data_collector = DataCollector()
model_trainer = ModelTrainer()


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
    data_source: str = Field("synthetic", description="Источник данных для обучения")
    model_type: str = Field("sklearn", description="Тип модели для обучения")
    retrain_all: bool = Field(False, description="Переобучить все модели")


class DataCollectionRequest(BaseModel):
    """Запрос на сбор данных"""
    max_pages: int = Field(50, description="Максимальное количество страниц для сбора", ge=1, le=500)
    sources: Optional[List[str]] = Field(None, description="Источники для сбора данных")


class KnowledgeBaseUpdate(BaseModel):
    """Обновление базы знаний"""
    diseases: Optional[Dict] = Field(None, description="Новые данные о заболеваниях")
    symptoms: Optional[Dict] = Field(None, description="Новые данные о симптомах")
    treatments: Optional[Dict] = Field(None, description="Новые данные о лечении")


@router.post("/diagnosis", response_model=DiagnosisResponse, summary="Диагностика симптомов")
@monitor_performance
async def diagnose_symptoms(
    request: DiagnosisRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Анализ симптомов пациента и предоставление рекомендаций
    
    - **symptoms_description**: Описание симптомов пациента
    - **patient_age**: Возраст пациента (опционально)
    - **patient_gender**: Пол пациента (опционально)
    - **additional_info**: Дополнительная информация (опционально)
    """
    try:
        start_time = datetime.now()
        request_id = generate_request_id()
        
        logger.info(f"Новый запрос на диагностику от пользователя {current_user.id}, request_id: {request_id}")
        
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
        
        # Выполняем анализ
        analysis_result = await medical_ai.analyze_symptoms(full_text)
        
        # Рассчитываем время обработки
        processing_time = (datetime.now() - start_time).total_seconds()
        
        # Формируем ответ
        response = DiagnosisResponse(
            request_id=request_id,
            extracted_symptoms=analysis_result.get("extracted_symptoms", []),
            possible_diseases=analysis_result.get("possible_diseases", []),
            recommendations=analysis_result.get("recommendations", []),
            urgency=analysis_result.get("urgency", "unknown"),
            confidence=analysis_result.get("confidence", 0.0),
            disclaimer=analysis_result.get("disclaimer", "Это предварительный анализ. Обязательно проконсультируйтесь с врачом."),
            processing_time=processing_time,
            timestamp=datetime.now().isoformat()
        )
        
        logger.info(f"Диагностика завершена, request_id: {request_id}, время: {processing_time:.2f}с")
        
        return response
        
    except Exception as e:
        logger.error(f"Ошибка при диагностике: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при анализе симптомов: {str(e)}"
        )


@router.get("/disease/{disease_name}", summary="Информация о заболевании")
@monitor_performance
async def get_disease_info(
    disease_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Получение подробной информации о заболевании
    
    - **disease_name**: Название заболевания
    """
    try:
        logger.info(f"Запрос информации о заболевании: {disease_name}")
        
        disease_info = await medical_ai.get_disease_info(disease_name)
        
        if "error" in disease_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=disease_info["error"]
            )
        
        return format_response(disease_info, message=f"Информация о заболевании: {disease_name}")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при получении информации о заболевании: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении информации: {str(e)}"
        )


@router.post("/admin/train", summary="Обучение AI моделей")
@monitor_performance
async def train_ai_models(
    request: TrainingRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """
    Обучение AI моделей (доступно только администраторам)
    
    - **data_source**: Источник данных (synthetic, collected)
    - **model_type**: Тип модели (sklearn, transformer)
    - **retrain_all**: Переобучить все модели
    """
    try:
        logger.info(f"Администратор {current_user.id} запустил обучение моделей")
        
        # Запускаем обучение в фоновом режиме
        if request.retrain_all:
            background_tasks.add_task(
                train_all_models_background,
                request.data_source,
                request.model_type
            )
            message = "Запущено обучение всех моделей в фоновом режиме"
        else:
            background_tasks.add_task(
                train_specific_model_background,
                request.data_source,
                request.model_type
            )
            message = "Запущено обучение модели в фоновом режиме"
        
        return format_response(
            {"status": "training_started", "data_source": request.data_source, "model_type": request.model_type},
            message=message
        )
        
    except Exception as e:
        logger.error(f"Ошибка при запуске обучения: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при запуске обучения: {str(e)}"
        )


@router.post("/admin/collect-data", summary="Сбор медицинских данных")
@monitor_performance
async def collect_medical_data(
    request: DataCollectionRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """
    Сбор медицинских данных из интернета (доступно только администраторам)
    
    - **max_pages**: Максимальное количество страниц для сбора
    - **sources**: Список источников (опционально)
    """
    try:
        logger.info(f"Администратор {current_user.id} запустил сбор данных")
        
        # Запускаем сбор данных в фоновом режиме
        background_tasks.add_task(
            collect_data_background,
            request.max_pages,
            request.sources
        )
        
        return format_response(
            {"status": "data_collection_started", "max_pages": request.max_pages},
            message="Запущен сбор медицинских данных в фоновом режиме"
        )
        
    except Exception as e:
        logger.error(f"Ошибка при запуске сбора данных: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при запуске сбора данных: {str(e)}"
        )


@router.put("/admin/knowledge-base", summary="Обновление базы знаний")
@monitor_performance
async def update_knowledge_base(
    request: KnowledgeBaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """
    Обновление базы знаний AI (доступно только администраторам)
    
    - **diseases**: Новые данные о заболеваниях
    - **symptoms**: Новые данные о симптомах
    - **treatments**: Новые данные о лечении
    """
    try:
        logger.info(f"Администратор {current_user.id} обновляет базу знаний")
        
        # Подготавливаем данные для обновления
        update_data = {}
        if request.diseases:
            update_data['diseases'] = request.diseases
        if request.symptoms:
            update_data['symptoms'] = request.symptoms
        if request.treatments:
            update_data['treatments'] = request.treatments
        
        if not update_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не предоставлены данные для обновления"
            )
        
        # Обновляем базу знаний
        result = await medical_ai.update_knowledge_base(update_data)
        
        if result.get('status') == 'error':
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=result.get('message', 'Ошибка при обновлении базы знаний')
            )
        
        return format_response(result, message="База знаний успешно обновлена")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Ошибка при обновлении базы знаний: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при обновлении базы знаний: {str(e)}"
        )


@router.get("/admin/stats", summary="Статистика AI сервиса")
@monitor_performance
async def get_ai_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """
    Получение статистики AI сервиса (доступно только администраторам)
    """
    try:
        # Получаем статистику обучения
        training_stats = model_trainer.get_training_stats()
        
        # Получаем статистику производительности
        from ai_service.utils import performance_monitor
        performance_stats = performance_monitor.get_metrics()
        
        stats = {
            "training_statistics": training_stats,
            "performance_metrics": performance_stats,
            "service_status": "active",
            "timestamp": datetime.now().isoformat()
        }
        
        return format_response(stats, message="Статистика AI сервиса")
        
    except Exception as e:
        logger.error(f"Ошибка при получении статистики: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении статистики: {str(e)}"
        )


@router.get("/patient/history", summary="История диагностики пациента")
@monitor_performance
async def get_patient_diagnosis_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("patient"))
):
    """
    Получение истории диагностики для пациента
    """
    try:
        # Здесь можно добавить логику для сохранения и получения истории диагностики
        # Пока возвращаем заглушку
        history = {
            "patient_id": current_user.id,
            "diagnosis_history": [],
            "total_diagnoses": 0,
            "last_diagnosis": None
        }
        
        return format_response(history, message="История диагностики пациента")
        
    except Exception as e:
        logger.error(f"Ошибка при получении истории диагностики: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении истории: {str(e)}"
        )


# Фоновые задачи
async def train_all_models_background(data_source: str, model_type: str):
    """Фоновая задача для обучения всех моделей"""
    try:
        logger.info(f"Запуск обучения всех моделей: {data_source}, {model_type}")
        
        # Загружаем данные
        success = model_trainer.load_training_data(data_source)
        if not success:
            logger.error("Не удалось загрузить данные для обучения")
            return
        
        # Обучаем все модели
        results = await model_trainer.train_all_models()
        
        logger.info(f"Обучение завершено: {results}")
        
    except Exception as e:
        logger.error(f"Ошибка в фоновом обучении: {str(e)}")


async def train_specific_model_background(data_source: str, model_type: str):
    """Фоновая задача для обучения конкретной модели"""
    try:
        logger.info(f"Запуск обучения модели: {data_source}, {model_type}")
        
        # Загружаем данные
        success = model_trainer.load_training_data(data_source)
        if not success:
            logger.error("Не удалось загрузить данные для обучения")
            return
        
        # Обучаем модель симптомов
        results = await model_trainer.train_symptom_classifier(model_type)
        
        logger.info(f"Обучение модели завершено: {results}")
        
    except Exception as e:
        logger.error(f"Ошибка в фоновом обучении модели: {str(e)}")


async def collect_data_background(max_pages: int, sources: Optional[List[str]] = None):
    """Фоновая задача для сбора данных"""
    try:
        logger.info(f"Запуск сбора данных: {max_pages} страниц")
        
        async with data_collector:
            await data_collector.collect_medical_data(max_pages)
        
        logger.info("Сбор данных завершен")
        
    except Exception as e:
        logger.error(f"Ошибка в фоновом сборе данных: {str(e)}")


# Инициализация AI сервиса при старте
@router.on_event("startup")
async def startup_ai_service():
    """Инициализация AI сервиса при старте приложения"""
    try:
        logger.info("Инициализация AI сервиса...")
        
        # Здесь можно добавить инициализацию моделей
        # Например, загрузку предобученных моделей
        
        logger.info("AI сервис инициализирован")
        
    except Exception as e:
        logger.error(f"Ошибка при инициализации AI сервиса: {str(e)}")


@router.on_event("shutdown")
async def shutdown_ai_service():
    """Завершение работы AI сервиса"""
    try:
        logger.info("Завершение работы AI сервиса...")
        
        # Здесь можно добавить очистку ресурсов
        
        logger.info("AI сервис завершен")
        
    except Exception as e:
        logger.error(f"Ошибка при завершении AI сервиса: {str(e)}") 