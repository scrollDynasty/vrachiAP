"""
AI Service Utils - Утилиты для AI сервиса
"""

import re
import json
import logging
import asyncio
import aiohttp
from typing import Dict, List, Optional, Any
from pathlib import Path
from datetime import datetime
import hashlib
import uuid
from dataclasses import dataclass
import numpy as np
from collections import Counter
import unicodedata
import time
import functools
import os

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class ProcessingResult:
    """Результат обработки"""
    success: bool
    data: Any
    error: Optional[str] = None
    metadata: Optional[Dict] = None


class TextProcessor:
    """Класс для обработки медицинских текстов"""
    
    def __init__(self):
        # Медицинские стоп-слова
        self.medical_stop_words = {
            'ru': ['и', 'в', 'на', 'с', 'по', 'для', 'от', 'при', 'или', 'но', 'а', 'также', 'может', 'быть', 'что', 'это', 'как'],
            'en': ['and', 'in', 'on', 'with', 'for', 'from', 'at', 'or', 'but', 'also', 'may', 'be', 'that', 'this', 'how'],
            'uz': ['va', 'bilan', 'uchun', 'dan', 'da', 'yoki', 'ammo', 'ham', 'bo\'lishi', 'mumkin']
        }
        
        # Медицинские сокращения
        self.medical_abbreviations = {
            'орви': 'острая респираторная вирусная инфекция',
            'орз': 'острое респираторное заболевание',
            'жкт': 'желудочно-кишечный тракт',
            'цнс': 'центральная нервная система',
            'сердечно-сосудистый': 'сердечно сосудистая система',
            'ad': 'артериальное давление',
            'hr': 'частота сердечных сокращений',
            'bp': 'blood pressure',
            'temp': 'температура'
        }
        
        # Паттерны для извлечения симптомов
        self.symptom_patterns = {
            'ru': [
                r'болит?\s+(\w+)',
                r'боль\s+в\s+(\w+)',
                r'(\w+)\s+болит',
                r'температура\s+(\d+\.?\d*)',
                r'кашель\s+(\w+)',
                r'(\w+)\s+кашель',
                r'тошнота?\s+(\w+)?',
                r'рвота?\s+(\w+)?',
                r'слабость\s+(\w+)?',
                r'головокружение\s+(\w+)?'
            ],
            'en': [
                r'(\w+)\s+pain',
                r'pain\s+in\s+(\w+)',
                r'(\w+)\s+hurts?',
                r'temperature\s+(\d+\.?\d*)',
                r'cough\s+(\w+)',
                r'(\w+)\s+cough',
                r'nausea\s+(\w+)?',
                r'vomiting\s+(\w+)?',
                r'weakness\s+(\w+)?',
                r'dizziness\s+(\w+)?'
            ]
        }
    
    def clean_text(self, text: str) -> str:
        """Очистка текста"""
        if not text:
            return ""
        
        # Удаляем HTML теги
        text = re.sub(r'<[^>]+>', '', text)
        
        # Удаляем лишние пробелы
        text = re.sub(r'\s+', ' ', text)
        
        # Удаляем специальные символы
        text = re.sub(r'[^\w\s\.,!?;:\-]', '', text)
        
        # Нормализуем unicode
        text = unicodedata.normalize('NFKD', text)
        
        return text.strip()
    
    def normalize_text(self, text: str, language: str = 'ru') -> str:
        """Нормализация текста"""
        text = self.clean_text(text)
        
        # Приводим к нижнему регистру
        text = text.lower()
        
        # Заменяем медицинские сокращения
        for abbr, full_form in self.medical_abbreviations.items():
            text = text.replace(abbr, full_form)
        
        # Удаляем стоп-слова
        if language in self.medical_stop_words:
            words = text.split()
            filtered_words = [word for word in words if word not in self.medical_stop_words[language]]
            text = ' '.join(filtered_words)
        
        return text
    
    def extract_symptoms_by_patterns(self, text: str, language: str = 'ru') -> List[str]:
        """Извлечение симптомов по паттернам"""
        symptoms = []
        
        if language not in self.symptom_patterns:
            return symptoms
        
        for pattern in self.symptom_patterns[language]:
            matches = re.findall(pattern, text.lower())
            for match in matches:
                if isinstance(match, tuple):
                    symptoms.extend([m for m in match if m])
                else:
                    symptoms.append(match)
        
        return list(set(symptoms))  # Убираем дубликаты
    
    def extract_medical_entities(self, text: str) -> Dict[str, List[str]]:
        """Извлечение медицинских сущностей"""
        entities = {
            'symptoms': [],
            'diseases': [],
            'medications': [],
            'body_parts': [],
            'procedures': []
        }
        
        # Словари для поиска сущностей
        medical_entities = {
            'symptoms': [
                'боль', 'температура', 'кашель', 'насморк', 'тошнота', 'рвота',
                'слабость', 'головокружение', 'одышка', 'сыпь', 'зуд', 'отек'
            ],
            'diseases': [
                'грипп', 'орви', 'ангина', 'бронхит', 'пневмония', 'гастрит',
                'язва', 'гипертония', 'диабет', 'астма', 'аллергия', 'мигрень'
            ],
            'medications': [
                'парацетамол', 'ибупрофен', 'аспирин', 'антибиотик', 'витамин',
                'таблетка', 'капли', 'сироп', 'мазь', 'инъекция'
            ],
            'body_parts': [
                'голова', 'горло', 'грудь', 'живот', 'спина', 'рука', 'нога',
                'сердце', 'легкие', 'желудок', 'печень', 'почки'
            ],
            'procedures': [
                'анализ', 'обследование', 'рентген', 'узи', 'томография',
                'кардиограмма', 'биопсия', 'операция', 'лечение'
            ]
        }
        
        text_lower = text.lower()
        
        for entity_type, keywords in medical_entities.items():
            for keyword in keywords:
                if keyword in text_lower:
                    entities[entity_type].append(keyword)
        
        return entities


class DataValidator:
    """Класс для валидации медицинских данных"""
    
    @staticmethod
    def validate_symptom_data(data: Dict) -> ProcessingResult:
        """Валидация данных симптомов"""
        required_fields = ['text', 'label']
        
        try:
            # Проверяем наличие обязательных полей
            for field in required_fields:
                if field not in data:
                    return ProcessingResult(
                        success=False,
                        data=None,
                        error=f"Отсутствует обязательное поле: {field}"
                    )
            
            # Проверяем типы данных
            if not isinstance(data['text'], str) or not data['text'].strip():
                return ProcessingResult(
                    success=False,
                    data=None,
                    error="Поле 'text' должно быть непустой строкой"
                )
            
            if not isinstance(data['label'], str) or not data['label'].strip():
                return ProcessingResult(
                    success=False,
                    data=None,
                    error="Поле 'label' должно быть непустой строкой"
                )
            
            # Проверяем длину текста
            if len(data['text']) < 3:
                return ProcessingResult(
                    success=False,
                    data=None,
                    error="Текст слишком короткий (минимум 3 символа)"
                )
            
            if len(data['text']) > 1000:
                return ProcessingResult(
                    success=False,
                    data=None,
                    error="Текст слишком длинный (максимум 1000 символов)"
                )
            
            return ProcessingResult(success=True, data=data)
            
        except Exception as e:
            return ProcessingResult(
                success=False,
                data=None,
                error=f"Ошибка валидации: {str(e)}"
            )
    
    @staticmethod
    def validate_disease_data(data: Dict) -> ProcessingResult:
        """Валидация данных заболеваний"""
        required_fields = ['name', 'symptoms']
        
        try:
            # Проверяем наличие обязательных полей
            for field in required_fields:
                if field not in data:
                    return ProcessingResult(
                        success=False,
                        data=None,
                        error=f"Отсутствует обязательное поле: {field}"
                    )
            
            # Проверяем название заболевания
            if not isinstance(data['name'], str) or not data['name'].strip():
                return ProcessingResult(
                    success=False,
                    data=None,
                    error="Поле 'name' должно быть непустой строкой"
                )
            
            # Проверяем симптомы
            if not isinstance(data['symptoms'], list):
                return ProcessingResult(
                    success=False,
                    data=None,
                    error="Поле 'symptoms' должно быть списком"
                )
            
            if len(data['symptoms']) == 0:
                return ProcessingResult(
                    success=False,
                    data=None,
                    error="Список симптомов не может быть пустым"
                )
            
            # Проверяем каждый симптом
            for symptom in data['symptoms']:
                if not isinstance(symptom, str) or not symptom.strip():
                    return ProcessingResult(
                        success=False,
                        data=None,
                        error="Все симптомы должны быть непустыми строками"
                    )
            
            return ProcessingResult(success=True, data=data)
            
        except Exception as e:
            return ProcessingResult(
                success=False,
                data=None,
                error=f"Ошибка валидации: {str(e)}"
            )


class FileManager:
    """Класс для управления файлами AI сервиса"""
    
    def __init__(self, base_dir: str = "ai_data"):
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(exist_ok=True)
        
        # Создаем поддиректории
        self.dirs = {
            'models': self.base_dir / 'models',
            'data': self.base_dir / 'data',
            'logs': self.base_dir / 'logs',
            'cache': self.base_dir / 'cache',
            'exports': self.base_dir / 'exports'
        }
        
        for dir_path in self.dirs.values():
            dir_path.mkdir(exist_ok=True)
    
    def save_json(self, data: Dict, filename: str, subdir: str = 'data') -> ProcessingResult:
        """Сохранение данных в JSON файл"""
        try:
            if subdir not in self.dirs:
                return ProcessingResult(
                    success=False,
                    data=None,
                    error=f"Неизвестная директория: {subdir}"
                )
            
            file_path = self.dirs[subdir] / filename
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            return ProcessingResult(
                success=True,
                data=str(file_path),
                metadata={'file_size': file_path.stat().st_size}
            )
            
        except Exception as e:
            return ProcessingResult(
                success=False,
                data=None,
                error=f"Ошибка сохранения файла: {str(e)}"
            )
    
    def load_json(self, filename: str, subdir: str = 'data') -> ProcessingResult:
        """Загрузка данных из JSON файла"""
        try:
            if subdir not in self.dirs:
                return ProcessingResult(
                    success=False,
                    data=None,
                    error=f"Неизвестная директория: {subdir}"
                )
            
            file_path = self.dirs[subdir] / filename
            
            if not file_path.exists():
                return ProcessingResult(
                    success=False,
                    data=None,
                    error=f"Файл не найден: {filename}"
                )
            
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            return ProcessingResult(
                success=True,
                data=data,
                metadata={'file_size': file_path.stat().st_size}
            )
            
        except Exception as e:
            return ProcessingResult(
                success=False,
                data=None,
                error=f"Ошибка загрузки файла: {str(e)}"
            )
    
    def get_file_hash(self, file_path: Path) -> str:
        """Получение хэша файла"""
        try:
            with open(file_path, 'rb') as f:
                file_hash = hashlib.md5(f.read()).hexdigest()
            return file_hash
        except Exception as e:
            logger.error(f"Ошибка при получении хэша файла: {e}")
            return ""
    
    def cleanup_old_files(self, days: int = 30, subdir: str = 'logs') -> ProcessingResult:
        """Очистка старых файлов"""
        try:
            if subdir not in self.dirs:
                return ProcessingResult(
                    success=False,
                    data=None,
                    error=f"Неизвестная директория: {subdir}"
                )
            
            current_time = datetime.now().timestamp()
            cutoff_time = current_time - (days * 24 * 60 * 60)
            
            deleted_files = []
            directory = self.dirs[subdir]
            
            for file_path in directory.iterdir():
                if file_path.is_file():
                    file_time = file_path.stat().st_mtime
                    if file_time < cutoff_time:
                        file_path.unlink()
                        deleted_files.append(str(file_path))
            
            return ProcessingResult(
                success=True,
                data=deleted_files,
                metadata={'deleted_count': len(deleted_files)}
            )
            
        except Exception as e:
            return ProcessingResult(
                success=False,
                data=None,
                error=f"Ошибка очистки файлов: {str(e)}"
            )


class CacheManager:
    """
    Простой кэш-менеджер для AI сервиса
    """
    
    def __init__(self, cache_dir: str = "cache", max_size: int = 1000):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        self.max_size = max_size
        self.cache = {}
        self.access_times = {}
    
    def _get_cache_key(self, data: Any) -> str:
        """Создание ключа кэша"""
        if isinstance(data, dict):
            data_str = json.dumps(data, sort_keys=True)
        else:
            data_str = str(data)
        return hashlib.md5(data_str.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Получение данных из кэша"""
        if key in self.cache:
            self.access_times[key] = time.time()
            return self.cache[key]
        
        # Проверяем файловый кэш
        cache_file = self.cache_dir / f"{key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.cache[key] = data
                    self.access_times[key] = time.time()
                    return data
            except Exception as e:
                logger.warning(f"Ошибка при чтении кэша {key}: {e}")
        
        return None
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> None:
        """Сохранение данных в кэш"""
        # Проверяем размер кэша
        if len(self.cache) >= self.max_size:
            self._evict_oldest()
        
        self.cache[key] = value
        self.access_times[key] = time.time()
        
        # Сохраняем в файл
        cache_file = self.cache_dir / f"{key}.json"
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(value, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"Ошибка при сохранении кэша {key}: {e}")
    
    def _evict_oldest(self) -> None:
        """Удаление самого старого элемента"""
        if not self.access_times:
            return
        
        oldest_key = min(self.access_times, key=self.access_times.get)
        self.cache.pop(oldest_key, None)
        self.access_times.pop(oldest_key, None)
    
    def clear_all(self) -> None:
        """Очистка всего кэша"""
        self.cache.clear()
        self.access_times.clear()
        
        # Очищаем файловый кэш
        for cache_file in self.cache_dir.glob("*.json"):
            try:
                cache_file.unlink()
            except Exception as e:
                logger.warning(f"Ошибка при удалении файла кэша {cache_file}: {e}")


class PerformanceMonitor:
    """
    Мониторинг производительности AI сервиса
    """
    
    def __init__(self):
        self.metrics = {
            'request_count': 0,
            'total_processing_time': 0,
            'error_count': 0,
            'last_request_time': None,
            'avg_processing_time': 0
        }
    
    def record_request(self, processing_time: float, success: bool = True) -> None:
        """Запись метрики запроса"""
        self.metrics['request_count'] += 1
        self.metrics['total_processing_time'] += processing_time
        self.metrics['last_request_time'] = datetime.now()
        
        if not success:
            self.metrics['error_count'] += 1
        
        self.metrics['avg_processing_time'] = (
            self.metrics['total_processing_time'] / self.metrics['request_count']
        )
    
    def get_metrics(self) -> Dict:
        """Получение метрик"""
        return {
            **self.metrics,
            'error_rate': self.metrics['error_count'] / max(1, self.metrics['request_count']),
            'requests_per_hour': self._calculate_requests_per_hour()
        }
    
    def _calculate_requests_per_hour(self) -> float:
        """Расчет запросов в час"""
        # Простой расчет - можно улучшить
        if self.metrics['request_count'] == 0:
            return 0
        return self.metrics['request_count'] * 60  # Примерный расчет


class InputValidator:
    """
    Валидация входных данных
    """
    
    @staticmethod
    def validate_symptoms(symptoms_text: str) -> bool:
        """Валидация описания симптомов"""
        if not symptoms_text or not isinstance(symptoms_text, str):
            return False
        
        # Проверка длины
        if len(symptoms_text.strip()) < 5:
            return False
        
        # Проверка на подозрительные паттерны
        suspicious_patterns = [
            r'<script',
            r'javascript:',
            r'onclick=',
            r'onerror=',
            r'eval\(',
            r'document\.',
            r'window\.',
        ]
        
        for pattern in suspicious_patterns:
            if re.search(pattern, symptoms_text.lower()):
                return False
        
        return True
    
    @staticmethod
    def sanitize_input(user_input: str) -> str:
        """Очистка пользовательского ввода"""
        if not user_input:
            return ""
        
        # Удаляем потенциально опасные символы
        sanitized = re.sub(r'[<>"\']', '', user_input)
        
        # Ограничиваем длину
        sanitized = sanitized[:2000]
        
        return sanitized.strip()


class AlertSystem:
    """
    Система алертов для AI сервиса
    """
    
    def __init__(self):
        self.thresholds = {
            'response_time': 5.0,  # секунды
            'error_rate': 0.1,     # 10%
            'accuracy': 0.7        # 70%
        }
        self.alerts = []
    
    def set_threshold(self, metric: str, value: float) -> None:
        """Установка порога для метрики"""
        self.thresholds[metric] = value
    
    def check_alerts(self) -> List[Dict]:
        """Проверка алертов"""
        # Здесь можно добавить логику проверки различных метрик
        return self.alerts
    
    def add_alert(self, message: str, severity: str = 'warning') -> None:
        """Добавление алерта"""
        alert = {
            'message': message,
            'severity': severity,
            'timestamp': datetime.now().isoformat()
        }
        self.alerts.append(alert)
        logger.warning(f"ALERT [{severity}]: {message}")


# Глобальные экземпляры
cache_manager = CacheManager()
performance_monitor = PerformanceMonitor()
input_validator = InputValidator()
alert_system = AlertSystem()


def get_system_stats() -> Dict:
    """
    Получение статистики системы
    """
    return {
        'performance': performance_monitor.get_metrics(),
        'cache_size': len(cache_manager.cache),
        'alerts': len(alert_system.alerts),
        'uptime': time.time() - _start_time if '_start_time' in globals() else 0
    }


# Время запуска
_start_time = time.time()


# Декораторы для мониторинга
def monitor_performance(func):
    """Декоратор для мониторинга производительности"""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        
        try:
            result = await func(*args, **kwargs)
            processing_time = time.time() - start_time
            
            logger.info(f"Функция {func.__name__} выполнена за {processing_time:.2f}с")
            return result
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Ошибка в {func.__name__} за {processing_time:.2f}с: {e}")
            raise
    
    return wrapper


def log_errors(func):
    """Декоратор для логирования ошибок"""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Ошибка в функции {func.__name__}: {str(e)}")
            raise
    
    return wrapper


# Вспомогательные функции
def generate_request_id() -> str:
    """Генерация уникального ID запроса"""
    return f"ai_diag_{int(time.time())}_{uuid.uuid4().hex[:8]}"


def sanitize_filename(filename: str) -> str:
    """Очистка имени файла"""
    # Удаляем или заменяем недопустимые символы
    sanitized = re.sub(r'[<>:"/\\|?*]', '_', filename)
    # Ограничиваем длину
    if len(sanitized) > 255:
        sanitized = sanitized[:255]
    return sanitized


def format_response(data: Any, success: bool = True, message: str = "", request_id: str = None) -> Dict:
    """Форматирование ответа API"""
    return {
        'success': success,
        'data': data,
        'message': message,
        'request_id': request_id or generate_request_id(),
        'timestamp': datetime.now().isoformat()
    }


def extract_medical_entities(text: str) -> Dict:
    """
    Извлечение медицинских сущностей из текста
    Использует NLP для определения симптомов, заболеваний и лечения
    """
    text_lower = text.lower()
    
    # Определяем язык текста
    language = 'ru' if any(char in 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя' for char in text_lower) else 'en'
    
    # Словари медицинских терминов
    symptom_patterns = {
        'ru': [
            'боль', 'болит', 'болезненный', 'ноет', 'режет', 'колет',
            'температура', 'жар', 'лихорадка', 'озноб',
            'кашель', 'кашляет', 'откашливается',
            'насморк', 'заложенность носа', 'сопли',
            'тошнота', 'тошнит', 'мутит', 'рвота',
            'головокружение', 'кружится голова', 'шатает',
            'слабость', 'усталость', 'вялость', 'разбитость',
            'одышка', 'нехватка воздуха', 'задыхается',
            'зуд', 'чешется', 'зудит',
            'сыпь', 'высыпания', 'покраснение',
            'отек', 'опухоль', 'припухлость',
            'изжога', 'жжение', 'горечь во рту',
            'диарея', 'понос', 'жидкий стул',
            'запор', 'затруднение дефекации',
            'бессонница', 'не может спать', 'нарушение сна',
            'тревога', 'беспокойство', 'паника',
            'сердцебиение', 'тахикардия', 'аритмия',
            'давление', 'гипертония', 'гипотония',
            'судороги', 'спазмы', 'сводит'
        ],
        'en': [
            'pain', 'ache', 'hurt', 'sore',
            'fever', 'temperature', 'chills',
            'cough', 'coughing',
            'runny nose', 'nasal congestion',
            'nausea', 'vomiting', 'sick',
            'dizziness', 'vertigo', 'lightheaded',
            'weakness', 'fatigue', 'tired',
            'shortness of breath', 'dyspnea',
            'itching', 'itch', 'pruritus',
            'rash', 'eruption', 'hives',
            'swelling', 'edema', 'inflammation',
            'heartburn', 'acid reflux',
            'diarrhea', 'loose stools',
            'constipation', 'difficult bowel',
            'insomnia', 'sleep disorder',
            'anxiety', 'panic', 'worry',
            'palpitations', 'rapid heartbeat',
            'hypertension', 'hypotension',
            'cramps', 'spasms'
        ]
    }
    
    disease_patterns = {
        'ru': [
            'грипп', 'ОРВИ', 'простуда', 'ангина', 'бронхит', 'пневмония',
            'гастрит', 'язва', 'панкреатит', 'холецистит',
            'диабет', 'гипертония', 'гипотония', 'аритмия', 'стенокардия',
            'астма', 'аллергия', 'дерматит', 'экзема', 'псориаз',
            'артрит', 'остеохондроз', 'радикулит', 'невралгия',
            'цистит', 'пиелонефрит', 'простатит',
            'мигрень', 'невроз', 'депрессия', 'ВСД',
            'гепатит', 'цирроз', 'желтуха',
            'анемия', 'лейкоз', 'тромбоз',
            'инфаркт', 'инсульт', 'эпилепсия'
        ],
        'en': [
            'flu', 'influenza', 'cold', 'pharyngitis', 'bronchitis', 'pneumonia',
            'gastritis', 'ulcer', 'pancreatitis', 'cholecystitis',
            'diabetes', 'hypertension', 'hypotension', 'arrhythmia', 'angina',
            'asthma', 'allergy', 'dermatitis', 'eczema', 'psoriasis',
            'arthritis', 'osteochondrosis', 'sciatica', 'neuralgia',
            'cystitis', 'pyelonephritis', 'prostatitis',
            'migraine', 'neurosis', 'depression', 'anxiety disorder',
            'hepatitis', 'cirrhosis', 'jaundice',
            'anemia', 'leukemia', 'thrombosis',
            'heart attack', 'stroke', 'epilepsy'
        ]
    }
    
    treatment_patterns = {
        'ru': [
            'антибиотик', 'противовирусный', 'жаропонижающий',
            'обезболивающий', 'анальгетик', 'спазмолитик',
            'антигистаминный', 'противовоспалительный',
            'витамины', 'пробиотики', 'иммуномодулятор',
            'ингаляции', 'физиотерапия', 'массаж',
            'диета', 'покой', 'обильное питье',
            'операция', 'химиотерапия', 'лучевая терапия'
        ],
        'en': [
            'antibiotic', 'antiviral', 'antipyretic',
            'painkiller', 'analgesic', 'antispasmodic',
            'antihistamine', 'anti-inflammatory',
            'vitamins', 'probiotics', 'immunomodulator',
            'inhalation', 'physiotherapy', 'massage',
            'diet', 'rest', 'hydration',
            'surgery', 'chemotherapy', 'radiation'
        ]
    }
    
    # Извлекаем сущности
    extracted_symptoms = []
    extracted_diseases = []
    extracted_treatments = []
    
    # Поиск симптомов
    for symptom in symptom_patterns.get(language, []):
        if symptom in text_lower:
            extracted_symptoms.append(symptom)
    
    # Поиск заболеваний
    for disease in disease_patterns.get(language, []):
        if disease in text_lower:
            extracted_diseases.append(disease)
    
    # Поиск методов лечения
    for treatment in treatment_patterns.get(language, []):
        if treatment in text_lower:
            extracted_treatments.append(treatment)
    
    # Убираем дубликаты и возвращаем результат
    return {
        'symptoms': list(set(extracted_symptoms))[:10],  # Максимум 10 симптомов
        'diseases': list(set(extracted_diseases))[:5],   # Максимум 5 заболеваний
        'treatments': list(set(extracted_treatments))[:10], # Максимум 10 методов лечения
        'language': language
    } 