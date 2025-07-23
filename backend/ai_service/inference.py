"""
Medical AI Inference Module - Модуль инференса медицинской AI
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_config import is_ai_enabled, get_ai_disabled_response, get_ai_stub_diagnosis

# Условный импорт тяжелых AI библиотек только если AI включен
if is_ai_enabled():
    try:
        import torch
        import torch.nn as nn
        from transformers import (
            AutoTokenizer, AutoModel, AutoModelForSequenceClassification,
            pipeline, BertTokenizer, BertModel
        )
        from sentence_transformers import SentenceTransformer
        import numpy as np
        HEAVY_IMPORTS_AVAILABLE = True
    except ImportError as e:
        print(f"Warning: Heavy AI libraries not installed, using stubs: {e}")
        HEAVY_IMPORTS_AVAILABLE = False
else:
    # Если AI отключен, не импортируем тяжелые библиотеки
    HEAVY_IMPORTS_AVAILABLE = False

from typing import Dict, List, Optional, Tuple
import logging
import json
from pathlib import Path
import re
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import pickle
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

# Импорты для работы с базой данных - условные
if is_ai_enabled():
    try:
        from models import (
            AIDiagnosis, AITrainingData, AIModel, AIModelTraining, AIFeedback,
            User, PatientProfile, get_db
        )
    except ImportError:
        # Если не удается импортировать модели БД, работаем без них
        pass

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MedicalAI:
    """
    Класс для медицинской диагностики с использованием нейросетей
    Интегрирован с базой данных для хранения результатов и обучения
    """
    
    def __init__(self, model_dir: str = "ai_models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        # Проверяем статус AI
        if not is_ai_enabled():
            logger.info("AI отключен - инициализация MedicalAI пропущена")
            self.ai_enabled = False
            return
        
        self.ai_enabled = True
        
        # Инициализация моделей только если AI включен и тяжелые библиотеки доступны
        if HEAVY_IMPORTS_AVAILABLE:
            self.tokenizer = None
            self.model = None
            self.symptom_classifier = None
            self.disease_classifier = None
            self.symptom_vectorizer = None
            self.disease_vectorizer = None
            self.sentence_transformer = None
            
            # Версия модели
            self.model_version = "1.0.0"
            
            # База знаний (кэш из БД)
            self.disease_database = {}
            self.symptom_database = {}
            self.treatment_database = {}
            
            # Загружаем модели
            try:
                self.load_models()
            except Exception as e:
                logger.error(f"Ошибка при загрузке AI моделей: {e}")
                self.ai_enabled = False
        else:
            logger.warning("Тяжелые AI библиотеки недоступны, используем заглушки")
            self.ai_enabled = False
        self.symptom_classifier = None
        self.disease_classifier = None
        self.symptom_vectorizer = None
        self.disease_vectorizer = None
        self.sentence_transformer = None
        
        # Версия модели
        self.model_version = "1.0.0"
        
        # База знаний (кэш из БД)
        self.disease_database = {}
        self.symptom_database = {}
        self.treatment_database = {}
        self._last_db_update = None
        
        # Загружаем предобученные модели
        self._load_models()
        
        # Пул потоков для параллельной обработки
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    def _load_models(self):
        """Загрузка предобученных моделей"""
        try:
            logger.info("Загружаю предобученные модели...")
            
            # Сначала пытаемся загрузить из файлов
            self._load_from_files()
            
            # Если файлы не найдены, создаем базовые модели
            if not self.symptom_classifier or not self.disease_classifier:
                logger.info("Обученные модели не найдены, создаю базовые...")
                self._create_hardcoded_classifiers()
                
            # Инициализируем базу знаний
            self._initialize_knowledge_base()
                
            # Загружаем трансформер для понимания медицинского текста
            self._load_transformer_model()
            
        except Exception as e:
            logger.error(f"Ошибка при загрузке моделей: {e}")
            # Создаем базовые модели как fallback
            self._create_hardcoded_classifiers()
            self._initialize_knowledge_base()
    
    def _load_from_files(self):
        """Загрузка обученных моделей из файлов"""
        try:
            # Загружаем классификатор симптомов
            symptom_model_path = self.model_dir / "symptom_classifier.pkl"
            symptom_vectorizer_path = self.model_dir / "symptom_classifier_vectorizer.pkl"
            
            if symptom_model_path.exists() and symptom_vectorizer_path.exists():
                with open(symptom_model_path, 'rb') as f:
                    self.symptom_classifier = pickle.load(f)
                with open(symptom_vectorizer_path, 'rb') as f:
                    self.symptom_vectorizer = pickle.load(f)
                logger.info("Загружен классификатор симптомов")
            
            # Загружаем классификатор заболеваний
            disease_model_path = self.model_dir / "disease_classifier.pkl"
            disease_vectorizer_path = self.model_dir / "disease_classifier_vectorizer.pkl"
            
            if disease_model_path.exists() and disease_vectorizer_path.exists():
                with open(disease_model_path, 'rb') as f:
                    self.disease_classifier = pickle.load(f)
                with open(disease_vectorizer_path, 'rb') as f:
                    self.disease_vectorizer = pickle.load(f)
                logger.info("Загружен классификатор заболеваний")
                
        except Exception as e:
            logger.warning(f"Ошибка при загрузке файлов моделей: {e}")
    
    def _initialize_knowledge_base(self):
        """Инициализация базы знаний"""
        self.disease_database = {
            "ОРВИ": {
                "description": "Острая респираторная вирусная инфекция",
                "symptoms": ["насморк", "кашель", "боль в горле", "температура", "слабость"],
                "causes": ["вирусы"],
                "risk_factors": ["слабый иммунитет", "переохлаждение"]
            },
            "мигрень": {
                "description": "Первичная головная боль",
                "symptoms": ["головная боль", "тошнота", "светобоязнь"],
                "causes": ["стресс", "недосып", "гормональные изменения"],
                "risk_factors": ["генетика", "женский пол"]
            },
            "гастрит": {
                "description": "Воспаление слизистой желудка",
                "symptoms": ["боль в животе", "изжога", "тошнота", "вздутие"],
                "causes": ["хеликобактер пилори", "стресс", "неправильное питание"],
                "risk_factors": ["курение", "алкоголь", "острая пища"]
            },
            "стенокардия": {
                "description": "Боль в груди из-за недостатка кислорода в сердце",
                "symptoms": ["боль в груди", "одышка", "тахикардия"],
                "causes": ["атеросклероз", "спазм артерий"],
                "risk_factors": ["пожилой возраст", "курение", "диабет"]
            },
            "инфекция": {
                "description": "Общие инфекционные заболевания",
                "symptoms": ["температура", "слабость", "потеря аппетита"],
                "causes": ["бактерии", "вирусы", "грибки"],
                "risk_factors": ["слабый иммунитет", "контакт с больными"]
            }
        }
        
        self.treatment_database = {
            "ОРВИ": {
                "primary": ["покой", "обильное питье", "жаропонижающие при температуре выше 38.5°C"],
                "when_to_see_doctor": ["температура выше 39°C более 3 дней", "затрудненное дыхание"]
            },
            "мигрень": {
                "primary": ["обезболивающие", "отдых в темной комнате", "избегание триггеров"],
                "when_to_see_doctor": ["головная боль с неврологическими симптомами", "внезапная сильная боль"]
            },
            "гастрит": {
                "primary": ["диета", "антациды", "избегание раздражающей пищи"],
                "when_to_see_doctor": ["кровь в рвоте", "сильная боль", "потеря веса"]
            },
            "стенокардия": {
                "primary": ["покой", "нитроглицерин", "избегание физических нагрузок"],
                "when_to_see_doctor": ["боль не проходит после отдыха", "усиление симптомов"]
            },
            "инфекция": {
                "primary": ["покой", "обильное питье", "жаропонижающие"],
                "when_to_see_doctor": ["высокая температура более 3 дней", "ухудшение состояния"]
            }
        }
    
    def _load_transformer_model(self):
        """Загрузка трансформера для понимания медицинского текста"""
        try:
            # ВРЕМЕННО ОТКЛЮЧЕНО: Загрузка тяжелых моделей (BiomedNLP-PubMedBERT + SentenceTransformer)
            # Причина: Модели слишком тяжелые и вызывают падение приложения
            # Используем только базовую обработку текста
            
            logger.info("Тяжелые AI модели временно отключены для стабильности")
            logger.info("Использую только базовые классификаторы")
            
            # Инициализируем пустые значения для совместимости
            self.tokenizer = None
            self.model = None
            self.sentence_transformer = None
            
            # TODO: Добавить ленивую загрузку моделей при первом использовании
            # TODO: Оптимизировать использование памяти
            
        except Exception as e:
            logger.error(f"Ошибка при загрузке трансформера: {e}")
    
    def _create_and_save_basic_models(self):
        """Создание и сохранение базовых классификаторов в БД"""
        try:
            from sklearn.feature_extraction.text import TfidfVectorizer
            from sklearn.naive_bayes import MultinomialNB
            from sklearn.pipeline import Pipeline
            
            # Получаем обучающие данные из БД
            with next(get_db()) as db:
                training_data = db.query(AITrainingData).filter(
                    AITrainingData.is_processed == True,
                    AITrainingData.language == 'ru'
                ).all()
                
                if not training_data:
                    # Если нет данных в БД, создаем базовые
                    logger.info("Создаю базовые обучающие данные...")
                    self._create_basic_training_data(db)
                    training_data = db.query(AITrainingData).filter(
                        AITrainingData.is_processed == True
                    ).all()
            
            # Создаем классификаторы
            self._train_basic_classifiers(training_data)
            
        except Exception as e:
            logger.error(f"Ошибка при создании базовых моделей: {e}")
            # Создаем хардкод модели как последний fallback
            self._create_hardcoded_classifiers()
    
    def _create_basic_training_data(self, db: Session):
        """Создание базовых обучающих данных"""
        basic_data = [
            {
                "title": "Головная боль и мигрень",
                "content": "Головная боль может быть симптомом различных заболеваний, включая мигрень, напряжение, инфекции",
                "symptoms": ["головная боль", "мигрень", "боль в голове"],
                "diseases": ["мигрень", "головная боль напряжения", "синусит"],
                "treatments": ["обезболивающие", "отдых", "избегание триггеров"],
                "source": "basic_medical_knowledge"
            },
            {
                "title": "Простуда и ОРВИ",
                "content": "Острые респираторные вирусные инфекции сопровождаются насморком, кашлем, температурой",
                "symptoms": ["насморк", "кашель", "температура", "слабость"],
                "diseases": ["ОРВИ", "простуда", "грипп"],
                "treatments": ["покой", "обильное питье", "жаропонижающие"],
                "source": "basic_medical_knowledge"
            },
            {
                "title": "Желудочно-кишечные расстройства",
                "content": "Боли в животе, тошнота, рвота могут указывать на проблемы с ЖКТ",
                "symptoms": ["боль в животе", "тошнота", "рвота", "диарея"],
                "diseases": ["гастрит", "отравление", "язва желудка"],
                "treatments": ["диета", "лекарства", "покой"],
                "source": "basic_medical_knowledge"
            }
        ]
        
        for data in basic_data:
            training_record = AITrainingData(
                source_name=data["source"],
                title=data["title"],
                content=data["content"],
                symptoms=data["symptoms"],
                diseases=data["diseases"],
                treatments=data["treatments"],
                language='ru',
                is_processed=True,
                is_validated=True,
                quality_score=0.8
            )
            db.add(training_record)
        
        db.commit()
        logger.info("Базовые обучающие данные созданы")
    
    def _train_basic_classifiers(self, training_data: List[AITrainingData]):
        """Обучение базовых классификаторов на данных из БД"""
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.naive_bayes import MultinomialNB
        from sklearn.pipeline import Pipeline
        
        try:
            # Подготовка данных для классификатора симптомов
            symptom_texts = []
            symptom_labels = []
            
            for data in training_data:
                if data.symptoms:
                    for symptom in data.symptoms:
                        symptom_texts.append(f"{data.title} {data.content}")
                        symptom_labels.append(self._normalize_symptom(symptom))
            
            # Обучение классификатора симптомов
            if symptom_texts:
                self.symptom_classifier = Pipeline([
                    ('tfidf', TfidfVectorizer(ngram_range=(1, 2))),
                    ('classifier', MultinomialNB())
                ])
                self.symptom_classifier.fit(symptom_texts, symptom_labels)
                
                # Сохраняем модель в БД
                self._save_model_to_db(self.symptom_classifier, "symptom_classifier", "1.0.0")
            
            # Подготовка данных для классификатора заболеваний
            disease_texts = []
            disease_labels = []
            
            for data in training_data:
                if data.diseases:
                    for disease in data.diseases:
                        disease_texts.append(f"{data.title} {data.content}")
                        disease_labels.append(disease.lower())
            
            # Обучение классификатора заболеваний
            if disease_texts:
                self.disease_classifier = Pipeline([
                    ('tfidf', TfidfVectorizer(ngram_range=(1, 2))),
                    ('classifier', MultinomialNB())
                ])
                self.disease_classifier.fit(disease_texts, disease_labels)
                
                # Сохраняем модель в БД
                self._save_model_to_db(self.disease_classifier, "disease_classifier", "1.0.0")
            
            logger.info("Базовые классификаторы обучены и сохранены")
            
        except Exception as e:
            logger.error(f"Ошибка при обучении классификаторов: {e}")
            self._create_hardcoded_classifiers()
    
    def _save_model_to_db(self, model, model_type: str, version: str):
        """Сохранение модели в базу данных"""
        try:
            # Сохраняем модель в файл
            model_path = self.model_dir / f"{model_type}_v{version}.pkl"
            with open(model_path, 'wb') as f:
                pickle.dump(model, f)
            
            # Сохраняем запись в БД
            with next(get_db()) as db:
                # Деактивируем старые модели того же типа
                db.query(AIModel).filter(
                    AIModel.model_type == model_type,
                    AIModel.is_active == True
                ).update({AIModel.is_active: False})
                
                # Создаем новую запись
                model_record = AIModel(
                    name=model_type,
                    model_type=model_type,
                    version=version,
                    description=f"Базовая модель {model_type}",
                    model_path=str(model_path),
                    is_active=True,
                    is_production=True,
                    accuracy=0.75,  # Примерная точность
                    training_data_size=100,  # Примерный размер
                    epochs=10
                )
                db.add(model_record)
                db.commit()
                
                logger.info(f"Модель {model_type} v{version} сохранена в БД")
                
        except Exception as e:
            logger.error(f"Ошибка при сохранении модели в БД: {e}")
    
    def _create_hardcoded_classifiers(self):
        """Создание хардкод классификаторов как последний fallback"""
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.naive_bayes import MultinomialNB
        from sklearn.pipeline import Pipeline
        
        # Базовые данные для обучения
        basic_symptoms = [
            ("головная боль", "головная_боль"),
            ("температура", "лихорадка"),
            ("кашель", "кашель"),
            ("насморк", "насморк"),
            ("боль в горле", "боль_в_горле"),
            ("тошнота", "тошнота"),
            ("рвота", "рвота"),
            ("диарея", "диарея"),
            ("слабость", "слабость"),
            ("головокружение", "головокружение")
        ]
        
        basic_diseases = [
            ("простуда грипп ОРВИ", "ОРВИ"),
            ("ангина горло инфекция", "ангина"),
            ("гастрит желудок боль", "гастрит"),
            ("гипертония давление", "гипертония"),
            ("диабет сахар", "диабет"),
            ("астма дыхание", "астма"),
            ("аллергия реакция", "аллергия"),
            ("мигрень головная боль", "мигрень")
        ]
        
        try:
            # Создаем классификатор симптомов
            symptom_texts, symptom_labels = zip(*basic_symptoms)
            self.symptom_classifier = Pipeline([
                ('tfidf', TfidfVectorizer(ngram_range=(1, 2))),
                ('classifier', MultinomialNB())
            ])
            self.symptom_classifier.fit(symptom_texts, symptom_labels)
            
            # Создаем классификатор заболеваний
            disease_texts, disease_labels = zip(*basic_diseases)
            self.disease_classifier = Pipeline([
                ('tfidf', TfidfVectorizer(ngram_range=(1, 2))),
                ('classifier', MultinomialNB())
            ])
            self.disease_classifier.fit(disease_texts, disease_labels)
            
            logger.info("Хардкод классификаторы созданы")
            
        except Exception as e:
            logger.error(f"Ошибка при создании хардкод классификаторов: {e}")
    
    def _normalize_symptom(self, symptom: str) -> str:
        """Нормализация названия симптома"""
        symptom = symptom.lower().strip()
        
        # Словарь для нормализации
        normalizations = {
            'головная боль': 'головная_боль',
            'боль в голове': 'головная_боль',
            'мигрень': 'головная_боль',
            'температура': 'лихорадка',
            'жар': 'лихорадка',
            'кашель': 'кашель',
            'насморк': 'насморк',
            'боль в горле': 'боль_в_горле',
            'тошнота': 'тошнота',
            'рвота': 'рвота',
            'диарея': 'диарея',
            'слабость': 'слабость'
        }
        
        return normalizations.get(symptom, symptom.replace(' ', '_'))
    
    def _symptoms_match(self, symptom1: str, symptom2: str) -> bool:
        """Проверка совпадения симптомов с учетом синонимов"""
        # Словарь синонимов
        synonyms = {
            'головная боль': ['голова', 'мигрень', 'головная боль', 'боль в голове'],
            'температура': ['температура', 'жар', 'лихорадка', '38'],
            'кашель': ['кашель', 'кашляю'],
            'насморк': ['насморк', 'сопли', 'нос заложен'],
            'боль в горле': ['горло', 'боль в горле', 'горло болит'],
            'тошнота': ['тошнота', 'тошнит', 'мутит'],
            'боль в животе': ['живот', 'боль в животе', 'живот болит'],
            'слабость': ['слабость', 'усталость', 'вялость']
        }
        
        # Проверяем каждую группу синонимов
        for main_symptom, symptom_list in synonyms.items():
            if symptom1 in symptom_list and symptom2 in symptom_list:
                return True
            if main_symptom in symptom1 and any(s in symptom2 for s in symptom_list):
                return True
            if main_symptom in symptom2 and any(s in symptom1 for s in symptom_list):
                return True
        
        return False

    async def analyze_symptoms(self, user_input: str, patient_id: Optional[int] = None) -> Dict:
        """
        Основной метод анализа симптомов с сохранением в БД
        """
        # Проверяем, включен ли AI
        if not is_ai_enabled() or not self.ai_enabled:
            logger.info(f"AI анализ симптомов заблокирован - AI отключен (пациент: {patient_id})")
            result = get_ai_stub_diagnosis()
            result["timestamp"] = datetime.now().isoformat()
            return result
        
        start_time = datetime.now()
        
        try:
            # Очищаем и подготавливаем входные данные
            cleaned_input = self._clean_input(user_input)
            
            # Извлекаем симптомы
            extracted_symptoms = await self._extract_symptoms(cleaned_input)
            
            # Предсказываем заболевания
            possible_diseases = await self._predict_diseases(extracted_symptoms, cleaned_input)
            
            # Генерируем рекомендации
            recommendations = await self._generate_recommendations(extracted_symptoms, possible_diseases)
            
            # Оцениваем срочность
            urgency = self._assess_urgency(extracted_symptoms)
            
            # Рассчитываем уверенность
            confidence = self._calculate_confidence(extracted_symptoms, possible_diseases)
            
            # Время обработки
            processing_time = (datetime.now() - start_time).total_seconds()
            
            # Формируем результат
            result = {
                "extracted_symptoms": extracted_symptoms,
                "possible_diseases": possible_diseases,
                "recommendations": recommendations,
                "urgency": urgency,
                "confidence": confidence,
                "processing_time": processing_time,
                "disclaimer": "Это предварительный анализ. Обязательно проконсультируйтесь с врачом для точной диагностики."
            }
            
            # Сохраняем результат в БД
            if patient_id:
                await self._save_diagnosis_to_db(user_input, result, patient_id, processing_time)
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка при анализе симптомов: {e}")
            return {
                "error": str(e),
                "extracted_symptoms": [],
                "possible_diseases": [],
                "recommendations": [{"text": "Произошла ошибка при анализе. Обратитесь к врачу.", "type": "urgent"}],
                "urgency": "high",
                "confidence": 0.0,
                "processing_time": (datetime.now() - start_time).total_seconds(),
                "disclaimer": "Система временно недоступна. Обратитесь к врачу."
            }
    
    async def _save_diagnosis_to_db(self, user_input: str, result: Dict, patient_id: int, processing_time: float):
        """Сохранение результата диагностики в базу данных"""
        try:
            with next(get_db()) as db:
                diagnosis = AIDiagnosis(
                    patient_id=patient_id,
                    symptoms_description=user_input,
                    extracted_symptoms=result.get("extracted_symptoms", []),
                    possible_diseases=result.get("possible_diseases", []),
                    recommendations=result.get("recommendations", []),
                    urgency_level=result.get("urgency", "medium"),
                    confidence_score=result.get("confidence", 0.0),
                    processing_time=processing_time,
                    model_version=self.model_version,
                    request_id=result.get("request_id", f"diag_{int(datetime.now().timestamp())}")
                )
                db.add(diagnosis)
                db.commit()
                
                logger.info(f"Диагностика сохранена для пациента {patient_id}")
                
        except Exception as e:
            logger.error(f"Ошибка при сохранении диагностики в БД: {e}")
    
    def _clean_input(self, text: str) -> str:
        """Очистка и нормализация входного текста"""
        # Удаляем лишние пробелы
        text = re.sub(r'\s+', ' ', text.strip())
        
        # Приводим к нижнему регистру
        text = text.lower()
        
        # Убираем знаки препинания (кроме запятых и точек)
        text = re.sub(r'[^\w\s,.]', '', text)
        
        return text
    
    async def _extract_symptoms(self, text: str) -> List[Dict]:
        """Извлечение симптомов из текста"""
        symptoms = []
        
        try:
            # Используем классификатор симптомов (если доступен)
            if self.symptom_classifier and self.symptom_vectorizer:
                # Разбиваем текст на предложения
                sentences = [s.strip() for s in text.split('.') if s.strip()]
                
                for sentence in sentences:
                    try:
                        # Векторизуем предложение
                        sentence_vectorized = self.symptom_vectorizer.transform([sentence])
                        
                        # Предсказываем симптом
                        prediction = self.symptom_classifier.predict(sentence_vectorized)
                        proba = self.symptom_classifier.predict_proba(sentence_vectorized)
                        
                        max_proba = max(proba[0])
                        
                        if max_proba > 0.3:  # Порог уверенности
                            symptom = {
                                "name": prediction[0],
                                "text": sentence,
                                "confidence": float(max_proba),
                                "severity": self._estimate_severity(sentence)
                            }
                            symptoms.append(symptom)
                            
                    except Exception as e:
                        logger.warning(f"Ошибка при классификации предложения '{sentence}': {e}")
            
            # Используем поиск по ключевым словам (основной метод)
            keyword_symptoms = self._extract_symptoms_by_keywords(text)
            symptoms.extend(keyword_symptoms)
            
            # Убираем дубликаты и синонимы
            unique_symptoms = []
            seen_names = set()
            synonym_groups = {
                'температура': ['лихорадка', 'жар', 'температура'],
                'головная_боль': ['головная_боль', 'мигрень', 'головокружение'],
                'боль_в_животе': ['боль_в_животе', 'тошнота', 'рвота'],
                'простуда': ['насморк', 'кашель', 'боль_в_горле']
            }
            
            # Группируем симптомы по синонимам
            symptom_groups = {}
            for symptom in symptoms:
                grouped = False
                for main_name, synonyms in synonym_groups.items():
                    if symptom['name'] in synonyms:
                        if main_name not in symptom_groups:
                            symptom_groups[main_name] = []
                        symptom_groups[main_name].append(symptom)
                        grouped = True
                        break
                
                if not grouped:
                    # Если симптом не в группе, добавляем как есть
                    if symptom['name'] not in seen_names:
                        unique_symptoms.append(symptom)
                        seen_names.add(symptom['name'])
            
            # Для каждой группы синонимов берем самый уверенный
            for main_name, group_symptoms in symptom_groups.items():
                if main_name not in seen_names:
                    best_symptom = max(group_symptoms, key=lambda x: x['confidence'])
                    best_symptom['name'] = main_name  # Нормализуем название
                    unique_symptoms.append(best_symptom)
                    seen_names.add(main_name)
            
            return unique_symptoms
            
        except Exception as e:
            logger.error(f"Ошибка при извлечении симптомов: {e}")
            # Возвращаем базовые симптомы как fallback
            return self._extract_symptoms_by_keywords(text)
    
    def _extract_symptoms_by_keywords(self, text: str) -> List[Dict]:
        """Извлечение симптомов по ключевым словам"""
        symptoms = []
        text_lower = text.lower()
        
        # Словарь ключевых слов для поиска симптомов
        symptom_keywords = {
            "головная_боль": ["голова болит", "головная боль", "болит голова", "мигрень", "голова"],
            "температура": ["температура", "жар", "лихорадка", "горячий", "38"],
            "кашель": ["кашель", "кашляю", "откашливание"],
            "насморк": ["насморк", "нос заложен", "сопли"],
            "боль_в_горле": ["горло болит", "боль в горле", "горло"],
            "тошнота": ["тошнота", "тошнит", "мутит"],
            "рвота": ["рвота", "рвёт", "блевота"],
            "диарея": ["диарея", "понос", "жидкий стул"],
            "слабость": ["слабость", "усталость", "вялость"],
            "головокружение": ["головокружение", "кружится голова"],
            "боль_в_животе": ["живот болит", "боль в животе", "живот"],
            "боль_в_груди": ["грудь болит", "боль в груди", "грудь"],
            "одышка": ["одышка", "трудно дышать", "нехватка воздуха"],
            "сыпь": ["сыпь", "высыпания", "пятна на коже"],
            "зуд": ["зуд", "чешется", "зудит"]
        }
        
        for symptom_name, keywords in symptom_keywords.items():
            confidence = 0.0
            found_keyword = ""
            
            for keyword in keywords:
                if keyword in text_lower:
                    # Вычисляем уверенность на основе длины совпадения
                    confidence = max(confidence, len(keyword) / len(text_lower) * 2.0)
                    found_keyword = keyword
                    
            if confidence > 0.05:  # Минимальный порог
                symptom = {
                    "name": symptom_name,
                    "text": f"Обнаружен симптом: {found_keyword}",
                    "confidence": min(confidence, 0.9),  # Максимум 0.9 для keyword extraction
                    "severity": self._estimate_severity(text)
                }
                symptoms.append(symptom)
        
        return symptoms
    
    def _estimate_severity(self, text: str) -> str:
        """Оценка тяжести симптома"""
        severity_words = {
            "высокая": ["сильно", "очень", "невыносимо", "острая", "мучительно"],
            "средняя": ["умеренно", "довольно", "заметно", "ощутимо"],
            "низкая": ["слабо", "немного", "чуть", "легко", "иногда"]
        }
        
        text_lower = text.lower()
        
        for severity, words in severity_words.items():
            if any(word in text_lower for word in words):
                return severity
        
        return "средняя"  # По умолчанию
    
    async def _predict_diseases(self, symptoms: List[Dict], full_text: str) -> List[Dict]:
        """Предсказание возможных заболеваний"""
        diseases = []
        
        try:
            # Получаем названия симптомов
            symptom_names = [s['name'] for s in symptoms]
            
            # Поиск по базе знаний
            for disease_name, disease_info in self.disease_database.items():
                disease_symptoms = disease_info.get('symptoms', [])
                
                # Подсчитываем совпадения симптомов
                matches = 0
                matched_symptoms = []
                
                for symptom in symptom_names:
                    for disease_symptom in disease_symptoms:
                        # Сравниваем нормализованные симптомы
                        symptom_norm = symptom.replace('_', ' ').lower()
                        disease_symptom_norm = disease_symptom.replace('_', ' ').lower()
                        
                        # Проверяем различные варианты совпадения
                        if (symptom_norm in disease_symptom_norm or 
                            disease_symptom_norm in symptom_norm or
                            self._symptoms_match(symptom_norm, disease_symptom_norm)):
                            matches += 1
                            matched_symptoms.append(disease_symptom)
                            break
                
                if matches > 0:
                    confidence = matches / len(disease_symptoms)
                    
                    disease = {
                        "name": disease_name,
                        "description": disease_info.get('description', ''),
                        "confidence": confidence,
                        "matched_symptoms": matches,
                        "total_symptoms": len(disease_symptoms),
                        "causes": disease_info.get('causes', []),
                        "risk_factors": disease_info.get('risk_factors', []),
                        "complications": disease_info.get('complications', [])
                    }
                    diseases.append(disease)
            
            # Используем классификатор заболеваний
            if self.disease_classifier and self.disease_vectorizer:
                try:
                    # Векторизуем текст
                    text_vectorized = self.disease_vectorizer.transform([full_text])
                    
                    # Предсказываем заболевание
                    prediction = self.disease_classifier.predict(text_vectorized)
                    proba = self.disease_classifier.predict_proba(text_vectorized)
                    
                    max_proba = max(proba[0])
                    
                    if max_proba > 0.3:
                        predicted_disease = {
                            "name": prediction[0],
                            "description": f"Заболевание, предсказанное классификатором: {prediction[0]}",
                            "confidence": float(max_proba),
                            "matched_symptoms": len(symptoms),
                            "total_symptoms": len(symptoms),
                            "source": "classifier"
                        }
                        diseases.append(predicted_disease)
                        
                except Exception as e:
                    logger.warning(f"Ошибка при использовании классификатора заболеваний: {e}")
            
            # ДЕДУПЛИКАЦИЯ: Объединяем заболевания с одинаковыми именами
            disease_map = {}
            for disease in diseases:
                disease_name = disease['name'].lower()
                
                # Если заболевание уже есть, выбираем лучший вариант
                if disease_name in disease_map:
                    existing = disease_map[disease_name]
                    # Выбираем заболевание с большей уверенностью
                    if disease['confidence'] > existing['confidence']:
                        # Обновляем описание, если есть более подробное
                        if len(disease.get('description', '')) > len(existing.get('description', '')):
                            existing['description'] = disease['description']
                        existing['confidence'] = disease['confidence']
                        existing['matched_symptoms'] = max(disease['matched_symptoms'], existing['matched_symptoms'])
                        existing['total_symptoms'] = max(disease['total_symptoms'], existing['total_symptoms'])
                        
                        # Объединяем дополнительные данные
                        for key in ['causes', 'risk_factors', 'complications']:
                            if key in disease:
                                existing[key] = disease[key]
                else:
                    disease_map[disease_name] = disease
            
            # Преобразуем обратно в список
            unique_diseases = list(disease_map.values())
            
            # Сортируем по уверенности
            unique_diseases.sort(key=lambda x: x['confidence'], reverse=True)
            
            return unique_diseases[:5]  # Возвращаем топ-5
            
        except Exception as e:
            logger.error(f"Ошибка при предсказании заболеваний: {e}")
            return []
    
    async def _generate_recommendations(self, symptoms: List[Dict], diseases: List[Dict]) -> List[Dict]:
        """Генерация рекомендаций"""
        recommendations = []
        
        try:
            # Общие рекомендации
            general_recommendations = [
                {
                    "type": "general",
                    "text": "Обратитесь к врачу для точной диагностики",
                    "priority": "high"
                },
                {
                    "type": "general",
                    "text": "Ведите дневник симптомов для отслеживания изменений",
                    "priority": "medium"
                }
            ]
            
            recommendations.extend(general_recommendations)
            
            # Рекомендации на основе заболеваний (с дедупликацией)
            seen_recommendations = set()
            
            for disease in diseases:
                disease_name = disease['name']
                if disease_name in self.treatment_database:
                    treatment_info = self.treatment_database[disease_name]
                    
                    # Первичные рекомендации
                    for treatment in treatment_info.get('primary', []):
                        # Проверяем, не добавили ли мы уже эту рекомендацию
                        if treatment not in seen_recommendations:
                            recommendation = {
                                "type": "treatment",
                                "text": treatment,
                                "priority": "high",
                                "related_disease": disease_name
                            }
                            recommendations.append(recommendation)
                            seen_recommendations.add(treatment)
                    
                    # Когда обращаться к врачу
                    for warning in treatment_info.get('when_to_see_doctor', []):
                        warning_text = f"Немедленно обратитесь к врачу при: {warning}"
                        # Проверяем, не добавили ли мы уже это предупреждение
                        if warning_text not in seen_recommendations:
                            recommendation = {
                                "type": "warning",
                                "text": warning_text,
                                "priority": "urgent",
                                "related_disease": disease_name
                            }
                            recommendations.append(recommendation)
                            seen_recommendations.add(warning_text)
            
            # Рекомендации на основе симптомов
            high_severity_symptoms = [s for s in symptoms if s.get('severity') == 'высокая']
            if high_severity_symptoms:
                recommendations.append({
                    "type": "urgent",
                    "text": "При сильных симптомах рекомендуется срочная медицинская помощь",
                    "priority": "urgent"
                })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Ошибка при генерации рекомендаций: {e}")
            return []
    
    def _assess_urgency(self, symptoms: List[Dict]) -> str:
        """Оценка срочности состояния"""
        urgent_symptoms = [
            "боль_в_груди", "одышка", "сильная_головная_боль",
            "высокая_температура", "кровотечение", "потеря_сознания"
        ]
        
        high_severity_count = sum(1 for s in symptoms if s.get('severity') == 'высокая')
        urgent_symptom_count = sum(1 for s in symptoms if s['name'] in urgent_symptoms)
        
        if urgent_symptom_count > 0 or high_severity_count > 2:
            return "urgent"
        elif high_severity_count > 0:
            return "high"
        elif len(symptoms) > 3:
            return "medium"
        else:
            return "low"
    
    def _calculate_confidence(self, symptoms: List[Dict], diseases: List[Dict]) -> float:
        """Расчет общей уверенности в анализе"""
        if not symptoms or not diseases:
            return 0.0
        
        # Улучшенный алгоритм расчета уверенности
        avg_symptom_confidence = sum(s.get('confidence', 0) for s in symptoms) / len(symptoms)
        avg_disease_confidence = sum(d.get('confidence', 0) for d in diseases) / len(diseases)
        
        # Базовая уверенность на основе симптомов и заболеваний
        base_confidence = (avg_symptom_confidence + avg_disease_confidence) / 2
        
        # Бонус за количество симптомов (больше симптомов = больше уверенности)
        symptom_count_bonus = min(len(symptoms) * 0.1, 0.3)  # Максимум +30%
        
        # Бонус за высокую уверенность в заболеваниях
        high_confidence_diseases = [d for d in diseases if d.get('confidence', 0) > 0.5]
        disease_confidence_bonus = len(high_confidence_diseases) * 0.1  # +10% за каждое уверенное заболевание
        
        # Бонус за совпадение симптомов с заболеваниями
        symptom_match_bonus = 0
        for disease in diseases:
            if disease.get('matched_symptoms', 0) > 0:
                match_ratio = disease['matched_symptoms'] / max(disease.get('total_symptoms', 1), 1)
                symptom_match_bonus += match_ratio * 0.2  # До +20% за полное совпадение
        
        # Итоговая уверенность
        overall_confidence = base_confidence + symptom_count_bonus + disease_confidence_bonus + symptom_match_bonus
        
        # Ограничиваем максимум 95%
        overall_confidence = min(overall_confidence, 0.95)
        
        return round(overall_confidence, 2)
    
    async def get_disease_info(self, disease_name: str) -> Dict:
        """Получение подробной информации о заболевании"""
        try:
            if disease_name in self.disease_database:
                disease_info = self.disease_database[disease_name].copy()
                
                # Добавляем информацию о лечении
                if disease_name in self.treatment_database:
                    disease_info['treatment'] = self.treatment_database[disease_name]
                
                return disease_info
            else:
                return {"error": f"Информация о заболевании '{disease_name}' не найдена"}
                
        except Exception as e:
            logger.error(f"Ошибка при получении информации о заболевании: {e}")
            return {"error": "Произошла ошибка при получении информации"}
    
    async def update_knowledge_base(self, new_data: Dict):
        """Обновление базы знаний новыми данными"""
        try:
            # Обновляем базу заболеваний
            if 'diseases' in new_data:
                self.disease_database.update(new_data['diseases'])
            
            # Обновляем базу симптомов
            if 'symptoms' in new_data:
                self.symptom_database.update(new_data['symptoms'])
            
            # Обновляем базу лечения
            if 'treatments' in new_data:
                self.treatment_database.update(new_data['treatments'])
            
            # Сохраняем обновленную базу
            self._save_knowledge_base()
            
            logger.info("База знаний обновлена")
            return {"status": "success", "message": "База знаний обновлена"}
            
        except Exception as e:
            logger.error(f"Ошибка при обновлении базы знаний: {e}")
            return {"status": "error", "message": str(e)}
    
    def __del__(self):
        """Деструктор для закрытия пула потоков"""
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=True)


# Пример использования
async def main():
    """Пример использования MedicalAI"""
    medical_ai = MedicalAI()
    
    # Тестовый анализ симптомов
    test_input = "У меня сильно болит голова, температура 38.5, кашель и насморк уже третий день"
    
    result = await medical_ai.analyze_symptoms(test_input)
    
    print("Результат анализа:")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main()) 