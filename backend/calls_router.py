# backend/calls_router.py
from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session
from typing import List
import json
import asyncio
from datetime import datetime
from jose import JWTError, jwt

from models import get_db, Call, User, Consultation
from auth import get_current_user, SECRET_KEY, ALGORITHM
from schemas import CallCreate, CallResponse, CallUpdate, CallListResponse
from call_service import CallService

router = APIRouter(prefix="/api/calls", tags=["calls"])

# Хранилище WebSocket соединений для звонков
call_websocket_connections = {}
# Хранилище WebSocket соединений для входящих звонков
incoming_call_connections = {}

@router.post("/initiate", response_model=CallResponse)
async def initiate_call(
    call_data: CallCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Инициация нового звонка"""
    print(f"Инициация звонка: consultation_id={call_data.consultation_id}, caller_id={current_user.id}, call_type={call_data.call_type}")
    
    call_service = CallService(db)
    
    # Определяем получателя (противоположная сторона консультации)
    consultation = db.query(Consultation).filter(Consultation.id == call_data.consultation_id).first()
    if not consultation:
        raise HTTPException(status_code=404, detail="Консультация не найдена")
    
    # Определяем получателя звонка
    if current_user.id == consultation.patient_id:
        receiver_id = consultation.doctor_id
    elif current_user.id == consultation.doctor_id:
        receiver_id = consultation.patient_id
    else:
        raise HTTPException(status_code=403, detail="Пользователь не является участником консультации")
    
    print(f"Получатель звонка: {receiver_id}")
    
    # Создаем звонок
    call = call_service.create_call(
        consultation_id=call_data.consultation_id,
        caller_id=current_user.id,
        receiver_id=receiver_id,
        call_type=call_data.call_type
    )
    
    print(f"Звонок создан с ID: {call.id}")
    
    # Отправляем уведомление получателю через WebSocket
    await notify_call_receiver(receiver_id, call)
    
    return call

@router.post("/{call_id}/accept", response_model=CallResponse)
async def accept_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Принятие звонка"""
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        raise HTTPException(status_code=404, detail="Звонок не найден")
    
    if call.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="Вы не можете принять этот звонок")
    
    if call.status not in ["initiated", "pending"]:
        raise HTTPException(status_code=400, detail="Звонок уже не в состоянии ожидания")
    
    # Обновляем статус звонка
    call.status = "active"
    call.accepted_at = datetime.utcnow()
    db.commit()
    
    # Уведомляем инициатора о принятии звонка
    await notify_call_caller(call.caller_id, call, "accepted")
    
    # Уведомляем через WebSocket для входящих звонков
    if call.caller_id in incoming_call_connections:
        try:
            await incoming_call_connections[call.caller_id].send_text(json.dumps({
                "type": "call_accepted",
                "call_id": call.id,
                "call": {
                    "id": call.id,
                    "caller_id": call.caller_id,
                    "receiver_id": call.receiver_id,
                    "call_type": call.call_type,
                    "status": call.status,
                    "created_at": call.created_at.isoformat(),
                    "accepted_at": call.accepted_at.isoformat() if call.accepted_at else None
                }
            }))
            print(f"Уведомление о принятии звонка отправлено инициатору {call.caller_id}")
        except Exception as e:
            print(f"Ошибка при отправке уведомления о принятии звонка: {e}")
    
    return CallResponse(
        id=call.id,
        caller_id=call.caller_id,
        receiver_id=call.receiver_id,
        consultation_id=call.consultation_id,
        call_type=call.call_type,
        status=call.status,
        created_at=call.created_at,
        accepted_at=call.accepted_at,
        ended_at=call.ended_at
    )

@router.post("/{call_id}/reject", response_model=CallResponse)
async def reject_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отклонение звонка"""
    call_service = CallService(db)
    call = call_service.update_call_status(call_id, "rejected", current_user.id)
    
    # Уведомляем звонящего об отклонении звонка
    await notify_call_caller(call.caller_id, call, "rejected")
    
    return call

@router.post("/{call_id}/end", response_model=CallResponse)
async def end_call(
    call_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Завершение звонка"""
    call_service = CallService(db)
    call = call_service.update_call_status(call_id, "ended", current_user.id)
    
    # Уведомляем другую сторону о завершении звонка через WebSocket для входящих звонков
    other_user_id = call.receiver_id if current_user.id == call.caller_id else call.caller_id
    
    # Отправляем уведомление через WebSocket для входящих звонков
    if other_user_id in incoming_call_connections:
        try:
            await incoming_call_connections[other_user_id].send_text(json.dumps({
                "type": "call_ended",
                "call": {
                    "id": call.id,
                    "caller_id": call.caller_id,
                    "receiver_id": call.receiver_id,
                    "call_type": call.call_type,
                    "status": call.status
                }
            }))
            print(f"Уведомление о завершении звонка отправлено пользователю {other_user_id} через WebSocket для входящих звонков")
        except Exception as e:
            print(f"Ошибка при отправке уведомления о завершении звонка через WebSocket: {e}")
    
    # Также уведомляем звонящего о завершении
    if call.caller_id in incoming_call_connections:
        try:
            await incoming_call_connections[call.caller_id].send_text(json.dumps({
                "type": "call_ended",
                "call": {
                    "id": call.id,
                    "caller_id": call.caller_id,
                    "receiver_id": call.receiver_id,
                    "call_type": call.call_type,
                    "status": call.status
                }
            }))
            print(f"Уведомление о завершении звонка отправлено звонящему {call.caller_id} через WebSocket для входящих звонков")
        except Exception as e:
            print(f"Ошибка при отправке уведомления о завершении звонка звонящему через WebSocket: {e}")
    
    return call

@router.get("/consultation/{consultation_id}", response_model=List[CallResponse])
async def get_consultation_calls(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получение всех звонков для консультации"""
    call_service = CallService(db)
    
    # Проверяем права доступа к консультации
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation or current_user.id not in [consultation.patient_id, consultation.doctor_id]:
        raise HTTPException(status_code=403, detail="Нет доступа к консультации")
    
    calls = call_service.get_calls_for_consultation(consultation_id)
    return calls

@router.get("/active/{consultation_id}", response_model=CallResponse)
async def get_active_call(
    consultation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Получение активного звонка для консультации"""
    call_service = CallService(db)
    
    # Проверяем права доступа к консультации
    consultation = db.query(Consultation).filter(Consultation.id == consultation_id).first()
    if not consultation or current_user.id not in [consultation.patient_id, consultation.doctor_id]:
        raise HTTPException(status_code=403, detail="Нет доступа к консультации")
    
    call = call_service.get_active_call_for_consultation(consultation_id)
    if not call:
        raise HTTPException(status_code=404, detail="Активный звонок не найден")
    
    return call

@router.websocket("/ws/{call_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    call_id: int,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    await websocket.accept()
    
    try:
        # Проверяем токен
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_email = payload.get("sub")
            if not user_email:
                await websocket.close(code=4001, reason="Invalid token")
                return
        except JWTError as e:
            print(f"JWT Error: {e}")
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        # Получаем пользователя
        user = db.query(User).filter(User.email == user_email).first()
        if not user:
            await websocket.close(code=4002, reason="User not found")
            return
        
        # Получаем звонок
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            await websocket.close(code=4003, reason="Call not found")
            return
        
        # Проверяем, что пользователь участвует в звонке
        if user.id not in [call.caller_id, call.receiver_id]:
            await websocket.close(code=4004, reason="User not in call")
            return
        
        print(f"WebSocket соединение добавлено для звонка {call_id}, пользователь {user.id}")
        
        # Добавляем соединение в словарь
        if call_id not in call_websocket_connections:
            call_websocket_connections[call_id] = {}
        call_websocket_connections[call_id][user.id] = websocket
        
        # Отправляем подтверждение подключения
        await websocket.send_text(json.dumps({
            "type": "connection-established",
            "call_id": call_id,
            "user_id": user.id
        }))
        
        try:
            while True:
                # Получаем сообщение
                data = await websocket.receive_text()
                
                if not data:
                    print(f"Получено пустое сообщение от пользователя {user.id}")
                    continue
                
                try:
                    message = json.loads(data)
                except json.JSONDecodeError as e:
                    print(f"Ошибка парсинга JSON от пользователя {user.id}: {e}")
                    continue
                
                if not message or not isinstance(message, dict):
                    print(f"Получено некорректное сообщение от пользователя {user.id}: {message}")
                    continue
                
                message_type = message.get("type")
                if not message_type:
                    print(f"Получено сообщение без типа от пользователя {user.id}: {message}")
                    continue
                
                print(f"Получено сообщение от пользователя {user.id} в звонке {call_id}: {message}")
                
                # Обрабатываем сообщение
                if message_type in ["offer", "answer", "ice-candidate"]:
                    # Пересылаем сообщение другому участнику звонка
                    other_user_id = call.receiver_id if user.id == call.caller_id else call.caller_id
                    
                    if call_id in call_websocket_connections and other_user_id in call_websocket_connections[call_id]:
                        other_websocket = call_websocket_connections[call_id][other_user_id]
                        try:
                            # Пересылаем исходное сообщение без изменений
                            await other_websocket.send_text(data)
                            print(f"Сообщение {message_type} переслано пользователю {other_user_id}")
                        except Exception as e:
                            print(f"Ошибка при пересылке сообщения {message_type}: {e}")
                    else:
                        print(f"Другой участник {other_user_id} не подключен к звонку {call_id}")
                        print(f"Доступные соединения для звонка {call_id}: {list(call_websocket_connections.get(call_id, {}).keys())}")
                
                elif message_type == "call-accepted":
                    # Уведомляем другого участника о принятии звонка
                    other_user_id = call.receiver_id if user.id == call.caller_id else call.caller_id
                    
                    if call_id in call_websocket_connections and other_user_id in call_websocket_connections[call_id]:
                        other_websocket = call_websocket_connections[call_id][other_user_id]
                        try:
                            await other_websocket.send_text(json.dumps({
                                "type": "call-accepted",
                                "call_id": call_id
                            }))
                            print(f"Уведомление о принятии звонка отправлено пользователю {other_user_id}")
                        except Exception as e:
                            print(f"Ошибка при отправке уведомления о принятии звонка: {e}")
                
                elif message_type == "call-ended":
                    # Уведомляем другого участника о завершении звонка
                    other_user_id = call.receiver_id if user.id == call.caller_id else call.caller_id
                    
                    if call_id in call_websocket_connections and other_user_id in call_websocket_connections[call_id]:
                        other_websocket = call_websocket_connections[call_id][other_user_id]
                        try:
                            await other_websocket.send_text(json.dumps({
                                "type": "call-ended",
                                "call_id": call_id
                            }))
                            print(f"Уведомление о завершении звонка отправлено пользователю {other_user_id}")
                        except Exception as e:
                            print(f"Ошибка при отправке уведомления о завершении звонка: {e}")
                    
                    # Обновляем статус звонка
                    call.status = "ended"
                    call.ended_at = datetime.utcnow()
                    db.commit()
                    break
                
        except WebSocketDisconnect:
            print(f"WebSocket соединение закрыто для пользователя {user.id} в звонке {call_id}")
        except Exception as e:
            print(f"Ошибка в WebSocket соединении: {e}")
        finally:
            # Удаляем соединение из словаря
            if call_id in call_websocket_connections and user.id in call_websocket_connections[call_id]:
                del call_websocket_connections[call_id][user.id]
                if not call_websocket_connections[call_id]:
                    del call_websocket_connections[call_id]
                print(f"WebSocket соединение удалено для пользователя {user.id} в звонке {call_id}")
    
    except Exception as e:
        print(f"Ошибка при установке WebSocket соединения: {e}")
        await websocket.close(code=4000, reason=str(e))

@router.websocket("/ws/incoming/{user_id}")
async def websocket_incoming_calls_endpoint(
    websocket: WebSocket,
    user_id: int,
    db: Session = Depends(get_db),
    token: str = None
):
    """WebSocket endpoint для уведомлений о входящих звонках"""
    await websocket.accept()
    
    # Проверяем авторизацию
    if not token:
        await websocket.close(code=4001, reason="Token required")
        return
    
    try:
        # Проверяем токен и получаем пользователя
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_email = payload.get("sub")
            user = db.query(User).filter(User.email == user_email).first()
            
            if not user or user.id != user_id:
                await websocket.close(code=4001, reason="Invalid user")
                return
        except JWTError as e:
            print(f"JWT Error: {e}")
            await websocket.close(code=4001, reason="Invalid token")
            return
        
        print(f"WebSocket для входящих звонков подключен для пользователя {user_id}")
        
        # Добавляем соединение в хранилище для входящих звонков
        incoming_call_connections[user_id] = websocket
        
        try:
            # Просто держим соединение открытым
            while True:
                # Ждем любые сообщения от клиента
                try:
                    data = await websocket.receive_text()
                    
                    if not data:
                        continue
                    
                    # Обрабатываем keep-alive сообщения
                    try:
                        message = json.loads(data)
                        if message and isinstance(message, dict) and message.get("type") == "keep-alive":
                            # Отвечаем на keep-alive
                            await websocket.send_text(json.dumps({"type": "keep-alive-ack"}))
                    except json.JSONDecodeError:
                        # Игнорируем некорректные JSON сообщения
                        pass
                except WebSocketDisconnect:
                    break
        except WebSocketDisconnect:
            pass
        finally:
            # Удаляем соединение из хранилища
            if user_id in incoming_call_connections:
                del incoming_call_connections[user_id]
            print(f"WebSocket для входящих звонков закрыт для пользователя {user_id}")
                
    except Exception as e:
        print(f"Ошибка в WebSocket для входящих звонков: {e}")
        await websocket.close(code=4000, reason=str(e))

async def handle_call_message(call_id: int, user_id: int, message: dict, db: Session):
    """Обработка сообщений WebRTC сигнализации"""
    message_type = message.get("type")
    
    # Получаем информацию о звонке
    call = db.query(Call).filter(Call.id == call_id).first()
    if not call:
        return
    
    # Определяем другого участника звонка
    other_user_id = call.receiver_id if user_id == call.caller_id else call.caller_id
    
    print(f"Обработка сообщения {message_type} от пользователя {user_id} для звонка {call_id}")
    
    if message_type == "offer":
        # Пересылаем offer получателю
        if call_id in call_websocket_connections and other_user_id in call_websocket_connections[call_id]:
            await call_websocket_connections[call_id][other_user_id].send_text(json.dumps({
                "type": "offer",
                "caller_id": user_id,
                "sdp": message.get("sdp"),
                "call_type": call.call_type
            }))
            print(f"Offer переслан пользователю {other_user_id}")
    
    elif message_type == "answer":
        # Пересылаем answer звонящему
        if call_id in call_websocket_connections and other_user_id in call_websocket_connections[call_id]:
            await call_websocket_connections[call_id][other_user_id].send_text(json.dumps({
                "type": "answer",
                "receiver_id": user_id,
                "sdp": message.get("sdp")
            }))
            print(f"Answer переслан пользователю {other_user_id}")
    
    elif message_type == "ice-candidate":
        # Пересылаем ICE candidate
        if call_id in call_websocket_connections and other_user_id in call_websocket_connections[call_id]:
            await call_websocket_connections[call_id][other_user_id].send_text(json.dumps({
                "type": "ice-candidate",
                "from_id": user_id,
                "candidate": message.get("candidate")
            }))
            print(f"ICE candidate переслан пользователю {other_user_id}")

async def notify_call_receiver(receiver_id: int, call: Call):
    """Уведомление получателя о входящем звонке"""
    print(f"Попытка уведомить пользователя {receiver_id} о звонке {call.id}")
    print(f"Доступные соединения: {list(incoming_call_connections.keys())}")
    
    if receiver_id in incoming_call_connections:
        try:
            message = {
                "type": "incoming_call",
                "call": {
                    "id": call.id,
                    "caller_id": call.caller_id,
                    "call_type": call.call_type,
                    "consultation_id": call.consultation_id
                }
            }
            await incoming_call_connections[receiver_id].send_text(json.dumps(message))
            print(f"Уведомление отправлено пользователю {receiver_id}")
        except Exception as e:
            print(f"Ошибка отправки уведомления пользователю {receiver_id}: {e}")
    else:
        print(f"Пользователь {receiver_id} не подключен к WebSocket")

async def notify_call_caller(caller_id: int, call: Call, action: str):
    """Уведомление звонящего о действии с звонком"""
    try:
        if caller_id in incoming_call_connections:
            await incoming_call_connections[caller_id].send_text(json.dumps({
                "type": f"call_{action}",
                "call_id": call.id
            }))
            print(f"Уведомление {action} отправлено звонящему {caller_id}")
    except Exception as e:
        print(f"Ошибка при отправке уведомления звонящему {caller_id}: {e}")

async def notify_call_participant(user_id: int, call: Call, action: str):
    """Уведомление участника о действии с звонком"""
    if user_id in incoming_call_connections:
        await incoming_call_connections[user_id].send_text(json.dumps({
            "type": f"call_{action}",
            "call_id": call.id
        })) 