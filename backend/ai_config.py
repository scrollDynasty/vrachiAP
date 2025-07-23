"""
AI Configuration Module - Управление конфигурацией AI системы
"""

import os
from typing import Dict, Any

def is_ai_enabled() -> bool:
    """
    Проверяет, включена ли AI система через переменную окружения ENABLE_AI
    
    Returns:
        bool: True если AI включен, False если отключен (по умолчанию)
    """
    enable_ai = os.getenv('ENABLE_AI', 'false').lower()
    return enable_ai in ('true', '1', 'yes', 'on')

def get_ai_disabled_response(operation: str = "AI operation") -> Dict[str, Any]:
    """
    Возвращает стандартный ответ-заглушку когда AI отключен
    
    Args:
        operation: Название операции для сообщения об ошибке
        
    Returns:
        Dict с информацией об отключении AI
    """
    return {
        "success": False,
        "error": "AI временно отключён",
        "message": f"{operation} недоступна - AI компоненты временно отключены для снижения нагрузки на сервер",
        "code": "AI_DISABLED",
        "details": {
            "reason": "Высокая нагрузка на сервер",
            "status": "temporary_disabled",
            "contact": "Обратитесь к администратору для включения AI"
        }
    }

def get_ai_stub_diagnosis() -> Dict[str, Any]:
    """
    Возвращает заглушку для AI диагностики
    
    Returns:
        Dict с заглушкой диагностики
    """
    return {
        "request_id": "stub_request",
        "extracted_symptoms": [],
        "possible_diseases": [
            {
                "name": "Консультация врача",
                "probability": 1.0,
                "description": "AI диагностика временно недоступна. Рекомендуется консультация с врачом."
            }
        ],
        "recommendations": [
            {
                "type": "consultation",
                "priority": "high",
                "description": "Обратитесь к врачу для профессиональной диагностики"
            }
        ],
        "urgency": "medium",
        "confidence": 0.0,
        "disclaimer": "AI диагностика временно отключена. Для получения медицинской помощи обратитесь к врачу.",
        "processing_time": 0.0,
        "timestamp": "",
        "ai_status": "disabled"
    }

# Константы для AI статуса
AI_STATUS_ENABLED = "enabled"
AI_STATUS_DISABLED = "disabled"
AI_STATUS_ERROR = "error"

def get_ai_status() -> str:
    """
    Получает текущий статус AI системы
    
    Returns:
        str: Статус AI системы
    """
    if is_ai_enabled():
        return AI_STATUS_ENABLED
    else:
        return AI_STATUS_DISABLED