#!/usr/bin/env python3
"""
Conversational AI Doctor System
Система разговорного AI врача для реальных консультаций
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import AutoTokenizer, AutoModel
import numpy as np
import pandas as pd
import json
import logging
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
import os
import pickle
from dataclasses import dataclass
import random
import re

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class ConversationContext:
    """Контекст разговора"""
    patient_info: Dict[str, Any]
    conversation_history: List[Dict[str, str]]
    current_symptoms: List[str]
    suspected_conditions: List[str]
    urgency_level: str
    conversation_stage: str  # greeting, history_taking, assessment, recommendation
    session_id: str
    created_at: datetime

class MedicalConversationalAI(nn.Module):
    """
    Разговорная AI модель для медицинских консультаций
    Работает как реальный врач, а не просто диагностирует симптомы
    """
    
    def __init__(self, vocab_size: int = 10000, embedding_dim: int = 256, 
                 hidden_dim: int = 512, num_layers: int = 3):
        super().__init__()
        
        self.vocab_size = vocab_size
        self.embedding_dim = embedding_dim
        self.hidden_dim = hidden_dim
        self.num_layers = num_layers
        
        # Embedding layers
        self.word_embedding = nn.Embedding(vocab_size, embedding_dim)
        self.position_embedding = nn.Embedding(1000, embedding_dim)
        
        # LSTM для понимания контекста
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, num_layers, 
                           batch_first=True, dropout=0.2, bidirectional=True)
        
        # Attention mechanism
        self.attention = nn.MultiheadAttention(hidden_dim * 2, 8, dropout=0.1)
        
        # Классификация намерений
        self.intent_classifier = nn.Linear(hidden_dim * 2, 20)  # 20 основных намерений
        
        # Генерация ответов
        self.response_generator = nn.Linear(hidden_dim * 2, vocab_size)
        
        # Оценка срочности
        self.urgency_classifier = nn.Linear(hidden_dim * 2, 4)  # low, medium, high, critical
        
        # Классификация стадии разговора
        self.stage_classifier = nn.Linear(hidden_dim * 2, 5)
        
        # Dropout
        self.dropout = nn.Dropout(0.3)
        
        # Нормализация
        self.layer_norm = nn.LayerNorm(hidden_dim * 2)
        
    def forward(self, input_ids: torch.Tensor, attention_mask: torch.Tensor = None):
        batch_size, seq_len = input_ids.shape
        
        # Embeddings
        word_embeds = self.word_embedding(input_ids)
        pos_ids = torch.arange(seq_len, device=input_ids.device).unsqueeze(0).expand(batch_size, -1)
        pos_embeds = self.position_embedding(pos_ids)
        
        embeddings = word_embeds + pos_embeds
        embeddings = self.dropout(embeddings)
        
        # LSTM
        lstm_out, (hidden, cell) = self.lstm(embeddings)
        
        # Attention
        attended_output, _ = self.attention(lstm_out, lstm_out, lstm_out)
        attended_output = self.layer_norm(attended_output + lstm_out)
        
        # Pooling - берем последнее состояние
        pooled_output = attended_output[:, -1, :]
        
        # Предсказания
        intent_logits = self.intent_classifier(pooled_output)
        response_logits = self.response_generator(pooled_output)
        urgency_logits = self.urgency_classifier(pooled_output)
        stage_logits = self.stage_classifier(pooled_output)
        
        return {
            'intent_logits': intent_logits,
            'response_logits': response_logits,
            'urgency_logits': urgency_logits,
            'stage_logits': stage_logits,
            'hidden_states': attended_output
        }

class ConversationalDoctorAI:
    """
    Главный класс разговорного AI врача
    Имитирует реальную консультацию с врачом
    """
    
    def __init__(self, model_path: str = "ai_system/models/conversational_doctor.pth"):
        self.model_path = model_path
        self.model = None
        self.tokenizer = None
        self.vocabulary = {}
        self.reverse_vocabulary = {}
        self.contexts = {}  # session_id -> ConversationContext
        
        # Медицинские знания
        self.medical_knowledge = self._load_medical_knowledge()
        self.conversation_templates = self._load_conversation_templates()
        
        # Инициализация модели
        self._initialize_model()
        
    def _load_medical_knowledge(self) -> Dict:
        """Загружаем медицинские знания для разговора"""
        return {
            'symptoms': {
                'головная_боль': {
                    'questions': [
                        'Как долго у вас болит голова?',
                        'Опишите характер боли - пульсирующая, давящая, острая?',
                        'Есть ли сопутствующие симптомы - тошнота, рвота, светобоязнь?',
                        'Что провоцирует боль?',
                        'Помогают ли обезболивающие?'
                    ],
                    'related_conditions': ['мигрень', 'головная боль напряжения', 'кластерная головная боль'],
                    'red_flags': ['внезапная сильная боль', 'лихорадка', 'ригидность затылочных мышц']
                },
                'температура': {
                    'questions': [
                        'Какая у вас температура?',
                        'Когда началась лихорадка?',
                        'Есть ли озноб?',
                        'Принимали ли жаропонижающие?',
                        'Какие еще симптомы вас беспокоят?'
                    ],
                    'related_conditions': ['ОРВИ', 'грипп', 'пневмония', 'инфекция'],
                    'red_flags': ['температура выше 39°C', 'затрудненное дыхание', 'сыпь']
                },
                'кашель': {
                    'questions': [
                        'Кашель сухой или с мокротой?',
                        'Когда кашель усиливается?',
                        'Есть ли кровь в мокроте?',
                        'Сопровождается ли одышкой?',
                        'Курите ли вы?'
                    ],
                    'related_conditions': ['бронхит', 'пневмония', 'астма', 'ХОБЛ'],
                    'red_flags': ['кровохарканье', 'высокая температура', 'одышка в покое']
                }
            },
            'general_questions': [
                'Расскажите подробнее о ваших симптомах',
                'Когда это началось?',
                'Что могло спровоцировать?',
                'Принимаете ли вы какие-либо лекарства?',
                'Есть ли хронические заболевания?',
                'Были ли похожие симптомы раньше?'
            ]
        }
    
    def _load_conversation_templates(self) -> Dict:
        """Шаблоны для разных стадий разговора"""
        return {
            'greeting': [
                'Здравствуйте! Я ваш AI помощник-врач. Расскажите, что вас беспокоит?',
                'Добро пожаловать на консультацию! Что привело вас ко мне?',
                'Здравствуйте! Опишите, пожалуйста, ваши симптомы или жалобы.'
            ],
            'history_taking': [
                'Понятно. Давайте разберем это подробнее.',
                'Спасибо за информацию. Уточните, пожалуйста:',
                'Это важные симптомы. Расскажите еще:'
            ],
            'assessment': [
                'Основываясь на ваших симптомах, рассмотрим следующие возможности:',
                'Анализируя вашу ситуацию, могу предположить:',
                'Ваши симптомы могут указывать на:'
            ],
            'recommendation': [
                'Рекомендую следующие действия:',
                'Советую вам:',
                'Мои рекомендации:'
            ],
            'emergency': [
                'ВНИМАНИЕ! Ваши симптомы требуют немедленного обращения к врачу!',
                'Это может быть серьезно. Немедленно обратитесь в скорую помощь!',
                'Срочно вызовите скорую или обратитесь в приемное отделение больницы!'
            ]
        }
    
    def _initialize_model(self):
        """Инициализация модели"""
        try:
            if os.path.exists(self.model_path):
                self._load_model()
                logger.info("Conversational AI модель загружена")
            else:
                self._create_new_model()
                logger.info("Создана новая conversational AI модель")
        except Exception as e:
            logger.error(f"Ошибка инициализации модели: {e}")
            self._create_fallback_model()
    
    def _create_new_model(self):
        """Создание новой модели"""
        # Создаем простой словарь для начала
        self.vocabulary = self._build_vocabulary()
        self.reverse_vocabulary = {v: k for k, v in self.vocabulary.items()}
        
        # Создаем модель
        self.model = MedicalConversationalAI(
            vocab_size=len(self.vocabulary),
            embedding_dim=256,
            hidden_dim=512,
            num_layers=3
        )
        
        logger.info("Новая conversational AI модель создана")
    
    def _build_vocabulary(self) -> Dict[str, int]:
        """Строим словарь из медицинских терминов"""
        vocab = {'<PAD>': 0, '<UNK>': 1, '<START>': 2, '<END>': 3}
        
        # Добавляем медицинские термины
        medical_terms = [
            'головная', 'боль', 'температура', 'кашель', 'тошнота', 'рвота',
            'слабость', 'усталость', 'одышка', 'сердцебиение', 'давление',
            'диарея', 'запор', 'сыпь', 'зуд', 'отек', 'судороги',
            'дней', 'недель', 'месяцев', 'утром', 'вечером', 'ночью',
            'лекарство', 'таблетка', 'врач', 'больница', 'анализ',
            'да', 'нет', 'может', 'быть', 'очень', 'сильно', 'слабо'
        ]
        
        # Добавляем общие слова
        common_words = [
            'и', 'в', 'на', 'с', 'по', 'для', 'от', 'у', 'к', 'за',
            'что', 'как', 'когда', 'где', 'почему', 'который', 'какой',
            'я', 'вы', 'мне', 'вам', 'меня', 'вас', 'мой', 'ваш',
            'это', 'то', 'так', 'тут', 'там', 'здесь', 'сейчас',
            'помогите', 'спасибо', 'пожалуйста', 'извините', 'понятно'
        ]
        
        all_words = medical_terms + common_words
        
        for i, word in enumerate(all_words, 4):
            vocab[word] = i
            
        return vocab
    
    def _create_fallback_model(self):
        """Создание fallback модели при ошибках"""
        self.model = None
        self.vocabulary = self._build_vocabulary()
        self.reverse_vocabulary = {v: k for k, v in self.vocabulary.items()}
        logger.warning("Использую fallback режим без нейросети")
    
    def start_conversation(self, patient_info: Dict[str, Any] = None) -> str:
        """Начинаем новую консультацию"""
        session_id = f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{random.randint(1000, 9999)}"
        
        context = ConversationContext(
            patient_info=patient_info or {},
            conversation_history=[],
            current_symptoms=[],
            suspected_conditions=[],
            urgency_level='low',
            conversation_stage='greeting',
            session_id=session_id,
            created_at=datetime.now()
        )
        
        self.contexts[session_id] = context
        
        # Приветствие
        greeting = random.choice(self.conversation_templates['greeting'])
        
        context.conversation_history.append({
            'speaker': 'doctor',
            'message': greeting,
            'timestamp': datetime.now().isoformat()
        })
        
        return {
            'session_id': session_id,
            'message': greeting,
            'stage': 'greeting'
        }
    
    def process_message(self, session_id: str, patient_message: str) -> Dict[str, Any]:
        """Обрабатываем сообщение от пациента"""
        if session_id not in self.contexts:
            return {
                'error': 'Сессия не найдена. Начните новую консультацию.',
                'session_id': session_id
            }
        
        context = self.contexts[session_id]
        
        # Добавляем сообщение пациента в историю
        context.conversation_history.append({
            'speaker': 'patient',
            'message': patient_message,
            'timestamp': datetime.now().isoformat()
        })
        
        # Анализируем сообщение
        analysis = self._analyze_patient_message(patient_message, context)
        
        # Обновляем контекст
        context.current_symptoms.extend(analysis['symptoms'])
        context.suspected_conditions.extend(analysis['conditions'])
        context.urgency_level = analysis['urgency']
        
        # Определяем стадию разговора
        context.conversation_stage = self._determine_conversation_stage(context)
        
        # Генерируем ответ
        response = self._generate_response(context, analysis)
        
        # Добавляем ответ в историю
        context.conversation_history.append({
            'speaker': 'doctor',
            'message': response['message'],
            'timestamp': datetime.now().isoformat()
        })
        
        return {
            'session_id': session_id,
            'message': response['message'],
            'stage': context.conversation_stage,
            'urgency': context.urgency_level,
            'symptoms': list(set(context.current_symptoms)),
            'conditions': list(set(context.suspected_conditions)),
            'recommendations': response.get('recommendations', [])
        }
    
    def _analyze_patient_message(self, message: str, context: ConversationContext) -> Dict[str, Any]:
        """Анализируем сообщение пациента"""
        message_lower = message.lower()
        
        # Извлекаем симптомы
        symptoms = []
        conditions = []
        urgency = 'low'
        
        # Простой анализ симптомов
        symptom_keywords = {
            'головная боль': ['голова', 'головная', 'мигрень'],
            'температура': ['температура', 'лихорадка', 'жар', 'горячий'],
            'кашель': ['кашель', 'кашляю', 'откашливание'],
            'тошнота': ['тошнота', 'тошнит', 'рвота'],
            'боль в груди': ['грудь', 'сердце', 'боль в груди'],
            'одышка': ['дышать', 'воздух', 'одышка', 'задыхаюсь'],
            'диарея': ['диарея', 'понос', 'жидкий стул'],
            'сыпь': ['сыпь', 'пятна', 'покраснение'],
            'боль в животе': ['живот', 'болит живот', 'боль в животе', 'животе', 'желудок', 'пупок', 'низ живота', 'верх живота', 'правой части живота', 'левой части живота', 'нижней части живота', 'правой нижней части']
        }
        
        for symptom, keywords in symptom_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                symptoms.append(symptom)
        
        # Определяем срочность
        emergency_keywords = [
            'сильная боль', 'не могу дышать', 'кровь', 'потеря сознания',
            'высокая температура', 'судороги', 'острая боль'
        ]
        
        high_urgency_keywords = [
            'сильно', 'очень', 'невыносимо', 'ужасно', 'плохо'
        ]
        
        if any(keyword in message_lower for keyword in emergency_keywords):
            urgency = 'critical'
        elif any(keyword in message_lower for keyword in high_urgency_keywords):
            urgency = 'high'
        elif symptoms:
            urgency = 'medium'
        
        return {
            'symptoms': symptoms,
            'conditions': conditions,
            'urgency': urgency,
            'keywords': message_lower.split()
        }
    
    def _determine_conversation_stage(self, context: ConversationContext) -> str:
        """Определяем стадию разговора"""
        # Считаем количество вопросов врача
        doctor_messages = [msg for msg in context.conversation_history if msg.get('speaker') == 'doctor']
        
        if len(context.conversation_history) <= 2:
            return 'greeting'
        elif len(context.current_symptoms) == 0 and len(doctor_messages) < 4:
            return 'history_taking'
        elif len(context.current_symptoms) > 0 or len(doctor_messages) >= 4:
            # Переходим к оценке если есть симптомы или задали много вопросов
            if len(context.suspected_conditions) == 0:
                return 'assessment'
            else:
                return 'recommendation'
        else:
            return 'history_taking'
    
    def _generate_response(self, context: ConversationContext, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Генерируем ответ врача"""
        stage = context.conversation_stage
        urgency = context.urgency_level
        
        # Критическая ситуация
        if urgency == 'critical':
            return {
                'message': random.choice(self.conversation_templates['emergency']),
                'recommendations': [
                    'Немедленно вызовите скорую помощь (103)',
                    'Обратитесь в приемное отделение больницы',
                    'Не занимайтесь самолечением'
                ]
            }
        
        # Обычный разговор
        if stage == 'greeting':
            return self._generate_greeting_response(analysis)
        elif stage == 'history_taking':
            return self._generate_history_questions(context, analysis)
        elif stage == 'assessment':
            return self._generate_assessment(context, analysis)
        elif stage == 'recommendation':
            return self._generate_recommendations(context, analysis)
        else:
            return {
                'message': 'Расскажите подробнее о том, что вас беспокоит.',
                'recommendations': []
            }
    
    def _generate_greeting_response(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Генерируем ответ на приветствие"""
        if analysis['symptoms']:
            return {
                'message': f"Понятно, вас беспокоит {', '.join(analysis['symptoms'])}. Давайте разберем это подробнее. Когда началось это состояние?",
                'recommendations': []
            }
        else:
            return {
                'message': "Расскажите подробнее о ваших симптомах. Что именно вас беспокоит?",
                'recommendations': []
            }
    
    def _generate_history_questions(self, context: ConversationContext, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Генерируем вопросы для сбора анамнеза"""
        if context.current_symptoms:
            main_symptom = context.current_symptoms[0]
            
            # Получаем специфические вопросы для симптома
            if main_symptom in self.medical_knowledge['symptoms']:
                questions = self.medical_knowledge['symptoms'][main_symptom]['questions']
                question = random.choice(questions)
            else:
                question = random.choice(self.medical_knowledge['general_questions'])
            
            return {
                'message': question,
                'recommendations': []
            }
        else:
            return {
                'message': "Опишите, пожалуйста, ваши симптомы более подробно.",
                'recommendations': []
            }
    
    def _generate_assessment(self, context: ConversationContext, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Генерируем оценку состояния"""
        symptoms = context.current_symptoms
        
        if not symptoms:
            return {
                'message': "Мне нужно больше информации о ваших симптомах для точной оценки.",
                'recommendations': []
            }
        
        # Простая логика для связи симптомов и состояний
        possible_conditions = []
        
        if 'головная боль' in symptoms:
            possible_conditions.extend(['мигрень', 'головная боль напряжения'])
        if 'температура' in symptoms:
            possible_conditions.extend(['ОРВИ', 'грипп'])
        if 'кашель' in symptoms:
            possible_conditions.extend(['бронхит', 'простуда'])
        
        if possible_conditions:
            conditions_text = ', '.join(possible_conditions[:3])
            message = f"Основываясь на ваших симптомах ({', '.join(symptoms)}), возможные причины могут включать: {conditions_text}. Для точного диагноза рекомендую обратиться к врачу."
        else:
            message = "Ваши симптомы требуют более детального обследования у специалиста."
        
        return {
            'message': message,
            'recommendations': []
        }
    
    def _generate_recommendations(self, context: ConversationContext, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Генерируем рекомендации"""
        symptoms = context.current_symptoms
        urgency = context.urgency_level
        
        recommendations = []
        
        # Общие рекомендации
        if urgency == 'high':
            recommendations.extend([
                'Обратитесь к врачу в течение 24 часов',
                'Не занимайтесь самолечением',
                'Следите за симптомами'
            ])
        elif urgency == 'medium':
            recommendations.extend([
                'Запишитесь на прием к врачу',
                'Ведите дневник симптомов',
                'Обеспечьте себе покой'
            ])
        else:
            recommendations.extend([
                'Наблюдайте за симптомами',
                'При ухудшении обратитесь к врачу',
                'Поддерживайте здоровый образ жизни'
            ])
        
        # Специфические рекомендации по симптомам
        if 'головная боль' in symptoms:
            recommendations.extend([
                'Обеспечьте тишину и покой',
                'Приложите холодный компресс',
                'Избегайте яркого света'
            ])
        
        if 'температура' in symptoms:
            recommendations.extend([
                'Пейте много жидкости',
                'Обеспечьте постельный режим',
                'Проветривайте помещение'
            ])
        
        if 'кашель' in symptoms:
            recommendations.extend([
                'Увлажняйте воздух',
                'Пейте теплые напитки',
                'Избегайте курения'
            ])
        
        message = f"Мои рекомендации:\n" + '\n'.join(f"• {rec}" for rec in recommendations[:5])
        
        return {
            'message': message,
            'recommendations': recommendations
        }
    
    def get_conversation_history(self, session_id: str) -> List[Dict[str, Any]]:
        """Получаем историю разговора"""
        if session_id not in self.contexts:
            return []
        
        return self.contexts[session_id].conversation_history
    
    def end_conversation(self, session_id: str) -> Dict[str, Any]:
        """Завершаем консультацию"""
        if session_id not in self.contexts:
            return {'error': 'Сессия не найдена'}
        
        context = self.contexts[session_id]
        
        # Сохраняем историю для обучения
        conversation_summary = {
            'session_id': session_id,
            'duration': (datetime.now() - context.created_at).total_seconds(),
            'symptoms': context.current_symptoms,
            'conditions': context.suspected_conditions,
            'urgency': context.urgency_level,
            'conversation_length': len(context.conversation_history),
            'ended_at': datetime.now().isoformat()
        }
        
        # Удаляем из памяти
        del self.contexts[session_id]
        
        return {
            'message': 'Спасибо за консультацию! Берегите себя и не забывайте о рекомендациях.',
            'summary': conversation_summary
        }

# Глобальный экземпляр
conversational_doctor = ConversationalDoctorAI()

# Основные функции для использования
def start_doctor_consultation(patient_info: Dict[str, Any] = None) -> Dict[str, Any]:
    """Начинаем консультацию с AI врачом"""
    return conversational_doctor.start_conversation(patient_info)

def chat_with_doctor(session_id: str, message: str) -> Dict[str, Any]:
    """Общаемся с AI врачом"""
    return conversational_doctor.process_message(session_id, message)

def get_chat_history(session_id: str) -> List[Dict[str, Any]]:
    """Получаем историю чата"""
    return conversational_doctor.get_conversation_history(session_id)

def end_doctor_consultation(session_id: str) -> Dict[str, Any]:
    """Завершаем консультацию"""
    return conversational_doctor.end_conversation(session_id)

def get_doctor_status() -> Dict[str, Any]:
    """Получаем статус AI врача"""
    return {
        'model_loaded': conversational_doctor.model is not None,
        'active_sessions': len(conversational_doctor.contexts),
        'medical_knowledge_loaded': bool(conversational_doctor.medical_knowledge),
        'templates_loaded': bool(conversational_doctor.conversation_templates)
    }

if __name__ == "__main__":
    # Тестируем систему
    print("=== Тест разговорной AI системы ===")
    
    # Начинаем консультацию
    session = start_doctor_consultation({'name': 'Тест', 'age': 30})
    print(f"Врач: {session['message']}")
    
    # Симулируем разговор
    responses = [
        "У меня болит голова уже третий день",
        "Боль пульсирующая, особенно по утрам",
        "Да, есть тошнота и не переношу яркий свет",
        "Обезболивающие помогают слабо"
    ]
    
    for response in responses:
        print(f"Пациент: {response}")
        reply = chat_with_doctor(session['session_id'], response)
        print(f"Врач: {reply['message']}")
        print(f"Стадия: {reply['stage']}, Срочность: {reply['urgency']}")
        print("---")
    
    # Завершаем консультацию
    end_result = end_doctor_consultation(session['session_id'])
    print(f"Завершение: {end_result['message']}") 