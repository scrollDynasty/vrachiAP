# backend/call_service.py
from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from models import Call, Consultation, User
from fastapi import HTTPException, status

class CallService:
    def __init__(self, db: Session):
        self.db = db
    
    def create_call(self, consultation_id: int, caller_id: int, receiver_id: int, call_type: str) -> Call:
        """Создание нового звонка"""
        # Проверяем, что консультация существует и активна
        consultation = self.db.query(Consultation).filter(Consultation.id == consultation_id).first()
        if not consultation:
            raise HTTPException(status_code=404, detail="Консультация не найдена")
        
        if consultation.status != "active":
            raise HTTPException(status_code=400, detail="Звонки доступны только для активных консультаций")
        
        # Проверяем, что пользователи являются участниками консультации
        if caller_id not in [consultation.patient_id, consultation.doctor_id]:
            raise HTTPException(status_code=403, detail="Пользователь не является участником консультации")
        
        if receiver_id not in [consultation.patient_id, consultation.doctor_id]:
            raise HTTPException(status_code=403, detail="Получатель не является участником консультации")
        
        # Проверяем, что нет активных звонков для этой консультации
        active_call = self.db.query(Call).filter(
            Call.consultation_id == consultation_id,
            Call.status == "active"  # Только активные звонки блокируют создание новых
        ).first()
        
        if active_call:
            raise HTTPException(status_code=400, detail="Уже есть активный звонок для этой консультации")
        
        # Создаем новый звонок
        call = Call(
            consultation_id=consultation_id,
            caller_id=caller_id,
            receiver_id=receiver_id,
            call_type=call_type,
            status="initiated"
        )
        
        self.db.add(call)
        self.db.commit()
        self.db.refresh(call)
        
        return call
    
    def get_call(self, call_id: int) -> Optional[Call]:
        """Получение звонка по ID"""
        return self.db.query(Call).filter(Call.id == call_id).first()
    
    def get_active_call_for_consultation(self, consultation_id: int) -> Optional[Call]:
        """Получение активного звонка для консультации"""
        return self.db.query(Call).filter(
            Call.consultation_id == consultation_id,
            Call.status.in_(["initiated", "active"])  # Включаем initiated и active звонки
        ).first()
    
    def update_call_status(self, call_id: int, new_status: str, user_id: int) -> Call:
        """Обновление статуса звонка"""
        call = self.get_call(call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Звонок не найден")
        
        # Проверяем права на изменение статуса
        if user_id not in [call.caller_id, call.receiver_id]:
            raise HTTPException(status_code=403, detail="Нет прав на изменение статуса звонка")
        
        # Обновляем статус и время
        call.status = new_status
        
        if new_status == "active" and not call.started_at:
            call.started_at = datetime.utcnow()
        elif new_status in ["ended", "rejected"] and not call.ended_at:
            call.ended_at = datetime.utcnow()
            if call.started_at:
                call.duration = int((call.ended_at - call.started_at).total_seconds())
        
        self.db.commit()
        self.db.refresh(call)
        
        return call
    
    def get_calls_for_consultation(self, consultation_id: int) -> List[Call]:
        """Получение всех звонков для консультации"""
        return self.db.query(Call).filter(Call.consultation_id == consultation_id).order_by(Call.created_at.desc()).all()
    
    def get_user_calls(self, user_id: int, limit: int = 50) -> List[Call]:
        """Получение звонков пользователя"""
        return self.db.query(Call).filter(
            (Call.caller_id == user_id) | (Call.receiver_id == user_id)
        ).order_by(Call.created_at.desc()).limit(limit).all()
    
    def end_all_active_calls_for_consultation(self, consultation_id: int) -> None:
        """Завершение всех активных звонков для консультации"""
        active_calls = self.db.query(Call).filter(
            Call.consultation_id == consultation_id,
            Call.status == "active"  # Только активные звонки
        ).all()
        
        for call in active_calls:
            call.status = "ended"
            call.ended_at = datetime.utcnow()
            if call.started_at:
                call.duration = int((call.ended_at - call.started_at).total_seconds())
        
        self.db.commit() 