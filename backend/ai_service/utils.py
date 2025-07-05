"""
Utilities for AI Service - Утилиты для AI сервиса
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


class PerformanceMonitor:
    """Класс для мониторинга производительности AI сервиса"""
    
    def __init__(self):
        self.metrics = {
            'requests_count': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'average_response_time': 0,
            'total_response_time': 0,
            'start_time': datetime.now()
        }
        
        self.response_times = []
    
    def record_request(self, response_time: float, success: bool = True):
        """Запись метрики запроса"""
        self.metrics['requests_count'] += 1
        self.metrics['total_response_time'] += response_time
        self.response_times.append(response_time)
        
        if success:
            self.metrics['successful_requests'] += 1
        else:
            self.metrics['failed_requests'] += 1
        
        # Обновляем среднее время ответа
        self.metrics['average_response_time'] = (
            self.metrics['total_response_time'] / self.metrics['requests_count']
        )
        
        # Ограничиваем размер списка времен ответа
        if len(self.response_times) > 1000:
            self.response_times = self.response_times[-1000:]
    
    def get_metrics(self) -> Dict:
        """Получение метрик производительности"""
        uptime = datetime.now() - self.metrics['start_time']
        
        metrics = self.metrics.copy()
        metrics.update({
            'uptime_seconds': uptime.total_seconds(),
            'requests_per_second': self.metrics['requests_count'] / uptime.total_seconds() if uptime.total_seconds() > 0 else 0,
            'success_rate': (self.metrics['successful_requests'] / self.metrics['requests_count']) * 100 if self.metrics['requests_count'] > 0 else 0,
            'percentile_95': np.percentile(self.response_times, 95) if self.response_times else 0,
            'percentile_99': np.percentile(self.response_times, 99) if self.response_times else 0,
            'min_response_time': min(self.response_times) if self.response_times else 0,
            'max_response_time': max(self.response_times) if self.response_times else 0
        })
        
        return metrics
    
    def reset_metrics(self):
        """Сброс метрик"""
        self.metrics = {
            'requests_count': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'average_response_time': 0,
            'total_response_time': 0,
            'start_time': datetime.now()
        }
        self.response_times = []


class ConfigManager:
    """Класс для управления конфигурацией AI сервиса"""
    
    def __init__(self, config_file: str = "ai_config.json"):
        self.config_file = Path(config_file)
        self.config = self._load_default_config()
        self.load_config()
    
    def _load_default_config(self) -> Dict:
        """Загрузка конфигурации по умолчанию"""
        return {
            'model_settings': {
                'max_text_length': 1000,
                'confidence_threshold': 0.3,
                'max_symptoms': 10,
                'max_diseases': 5
            },
            'data_collection': {
                'max_pages_per_source': 100,
                'request_delay': 2,
                'max_retries': 3,
                'timeout': 30
            },
            'training': {
                'batch_size': 32,
                'learning_rate': 0.001,
                'epochs': 10,
                'validation_split': 0.2
            },
            'performance': {
                'cache_size': 1000,
                'max_concurrent_requests': 10,
                'request_timeout': 60
            }
        }
    
    def load_config(self):
        """Загрузка конфигурации из файла"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    saved_config = json.load(f)
                    # Обновляем конфигурацию, сохраняя значения по умолчанию
                    self._update_config(self.config, saved_config)
                logger.info(f"Конфигурация загружена из {self.config_file}")
            else:
                self.save_config()
                logger.info("Создана конфигурация по умолчанию")
        except Exception as e:
            logger.error(f"Ошибка загрузки конфигурации: {e}")
    
    def save_config(self):
        """Сохранение конфигурации в файл"""
        try:
            with open(self.config_file, 'w', encoding='utf-8') as f:
                json.dump(self.config, f, ensure_ascii=False, indent=2)
            logger.info(f"Конфигурация сохранена в {self.config_file}")
        except Exception as e:
            logger.error(f"Ошибка сохранения конфигурации: {e}")
    
    def _update_config(self, base_config: Dict, update_config: Dict):
        """Рекурсивное обновление конфигурации"""
        for key, value in update_config.items():
            if key in base_config and isinstance(base_config[key], dict) and isinstance(value, dict):
                self._update_config(base_config[key], value)
            else:
                base_config[key] = value
    
    def get(self, key: str, default=None):
        """Получение значения из конфигурации"""
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def set(self, key: str, value):
        """Установка значения в конфигурацию"""
        keys = key.split('.')
        config = self.config
        
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            config = config[k]
        
        config[keys[-1]] = value
        self.save_config()


# Глобальные экземпляры утилит
text_processor = TextProcessor()
file_manager = FileManager()
performance_monitor = PerformanceMonitor()
config_manager = ConfigManager()


# Декораторы для мониторинга
def monitor_performance(func):
    """Декоратор для мониторинга производительности"""
    import time
    import asyncio
    
    if asyncio.iscoroutinefunction(func):
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            try:
                result = await func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise e
            finally:
                end_time = time.time()
                response_time = end_time - start_time
                performance_monitor.record_request(response_time, success)
        
        return async_wrapper
    else:
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            success = True
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                success = False
                raise e
            finally:
                end_time = time.time()
                response_time = end_time - start_time
                performance_monitor.record_request(response_time, success)
        
        return sync_wrapper


def log_errors(func):
    """Декоратор для логирования ошибок"""
    import functools
    
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
    return str(uuid.uuid4())


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