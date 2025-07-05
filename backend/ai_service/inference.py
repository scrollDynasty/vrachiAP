"""
Medical AI Inference Module - Модуль инференса медицинской AI
"""

import torch
import torch.nn as nn
from transformers import (
    AutoTokenizer, AutoModel, AutoModelForSequenceClassification,
    pipeline, BertTokenizer, BertModel
)
from sentence_transformers import SentenceTransformer
import numpy as np
from typing import Dict, List, Optional, Tuple
import logging
import json
import os
from pathlib import Path
import re
from datetime import datetime
import asyncio
from concurrent.futures import ThreadPoolExecutor
import pickle

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MedicalAI:
    """
    Класс для медицинской диагностики с использованием нейросетей
    """
    
    def __init__(self, model_dir: str = "ai_models"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        # Инициализация моделей
        self.tokenizer = None
        self.model = None
        self.symptom_classifier = None
        self.disease_classifier = None
        self.sentence_transformer = None
        
        # База знаний
        self.disease_database = {}
        self.symptom_database = {}
        self.treatment_database = {}
        
        # Загружаем предобученные модели
        self._load_models()
        self._load_knowledge_base()
        
        # Пул потоков для параллельной обработки
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    def _load_models(self):
        """Загрузка предобученных моделей"""
        try:
            logger.info("Загружаю предобученные модели...")
            
            # Загружаем модель для понимания медицинского текста
            model_name = "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
            
            try:
                self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.model = AutoModel.from_pretrained(model_name)
                logger.info(f"Загружена модель: {model_name}")
            except Exception as e:
                logger.warning(f"Не удалось загрузить {model_name}, использую базовую модель: {e}")
                # Fallback на базовую модель BERT
                self.tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
                self.model = BertModel.from_pretrained('bert-base-uncased')
            
            # Загружаем модель для семантического поиска
            try:
                self.sentence_transformer = SentenceTransformer('all-MiniLM-L6-v2')
                logger.info("Загружена модель для семантического поиска")
            except Exception as e:
                logger.warning(f"Не удалось загрузить sentence transformer: {e}")
            
            # Загружаем или создаем классификаторы
            self._load_or_create_classifiers()
            
        except Exception as e:
            logger.error(f"Ошибка при загрузке моделей: {e}")
    
    def _load_or_create_classifiers(self):
        """Загрузка или создание классификаторов симптомов и заболеваний"""
        try:
            # Проверяем наличие сохраненных классификаторов
            symptom_classifier_path = self.model_dir / "symptom_classifier.pkl"
            disease_classifier_path = self.model_dir / "disease_classifier.pkl"
            
            if symptom_classifier_path.exists():
                with open(symptom_classifier_path, 'rb') as f:
                    self.symptom_classifier = pickle.load(f)
                logger.info("Загружен классификатор симптомов")
            
            if disease_classifier_path.exists():
                with open(disease_classifier_path, 'rb') as f:
                    self.disease_classifier = pickle.load(f)
                logger.info("Загружен классификатор заболеваний")
            
            # Если классификаторы не найдены, создаем базовые
            if not self.symptom_classifier or not self.disease_classifier:
                logger.info("Создаю базовые классификаторы...")
                self._create_basic_classifiers()
                
        except Exception as e:
            logger.error(f"Ошибка при загрузке классификаторов: {e}")
            self._create_basic_classifiers()
    
    def _create_basic_classifiers(self):
        """Создание базовых классификаторов"""
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.naive_bayes import MultinomialNB
        from sklearn.pipeline import Pipeline
        
        # Базовые данные для обучения классификаторов
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
            ("головокружение", "головокружение"),
            ("боль в животе", "боль_в_животе"),
            ("боль в груди", "боль_в_груди"),
            ("одышка", "одышка"),
            ("сыпь", "сыпь"),
            ("зуд", "зуд")
        ]
        
        basic_diseases = [
            ("простуда грипп ОРВИ", "ОРВИ"),
            ("ангина горло инфекция", "ангина"),
            ("гастрит желудок боль", "гастрит"),
            ("гипертония давление", "гипертония"),
            ("диабет сахар", "диабет"),
            ("астма дыхание", "астма"),
            ("аллергия реакция", "аллергия"),
            ("мигрень головная боль", "мигрень"),
            ("депрессия настроение", "депрессия"),
            ("бронхит кашель", "бронхит")
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
            
            # Сохраняем классификаторы
            with open(self.model_dir / "symptom_classifier.pkl", 'wb') as f:
                pickle.dump(self.symptom_classifier, f)
            
            with open(self.model_dir / "disease_classifier.pkl", 'wb') as f:
                pickle.dump(self.disease_classifier, f)
            
            logger.info("Базовые классификаторы созданы и сохранены")
            
        except Exception as e:
            logger.error(f"Ошибка при создании базовых классификаторов: {e}")
    
    def _load_knowledge_base(self):
        """Загрузка базы медицинских знаний"""
        try:
            # Загружаем базу знаний из JSON файлов
            knowledge_files = {
                'diseases': self.model_dir / "disease_database.json",
                'symptoms': self.model_dir / "symptom_database.json",
                'treatments': self.model_dir / "treatment_database.json"
            }
            
            for db_name, file_path in knowledge_files.items():
                if file_path.exists():
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        setattr(self, f"{db_name[:-1]}_database", data)
                        logger.info(f"Загружена база знаний: {db_name}")
                else:
                    # Создаем базовую базу знаний
                    self._create_basic_knowledge_base(db_name)
                    
        except Exception as e:
            logger.error(f"Ошибка при загрузке базы знаний: {e}")
            self._create_basic_knowledge_base()
    
    def _create_basic_knowledge_base(self, db_type: str = "all"):
        """Создание базовой базы знаний"""
        if db_type in ["all", "diseases"]:
            self.disease_database = {
                "ОРВИ": {
                    "symptoms": ["насморк", "кашель", "температура", "слабость", "боль в горле"],
                    "description": "Острая респираторная вирусная инфекция",
                    "causes": ["вирусы", "переохлаждение", "ослабленный иммунитет"],
                    "risk_factors": ["сезонность", "скученность", "стресс"],
                    "complications": ["бронхит", "пневмония", "синусит"]
                },
                "гастрит": {
                    "symptoms": ["боль в животе", "тошнота", "изжога", "отрыжка"],
                    "description": "Воспаление слизистой оболочки желудка",
                    "causes": ["Helicobacter pylori", "стресс", "неправильное питание"],
                    "risk_factors": ["курение", "алкоголь", "нестероидные противовоспалительные"],
                    "complications": ["язва", "кровотечение", "перфорация"]
                },
                "гипертония": {
                    "symptoms": ["головная боль", "головокружение", "шум в ушах"],
                    "description": "Повышенное артериальное давление",
                    "causes": ["наследственность", "ожирение", "стресс"],
                    "risk_factors": ["возраст", "пол", "курение", "диета"],
                    "complications": ["инсульт", "инфаркт", "почечная недостаточность"]
                }
            }
        
        if db_type in ["all", "symptoms"]:
            self.symptom_database = {
                "головная_боль": {
                    "possible_diseases": ["мигрень", "гипертония", "ОРВИ", "стресс"],
                    "severity_indicators": ["интенсивность", "локализация", "продолжительность"],
                    "warning_signs": ["внезапная сильная боль", "нарушение зрения", "температура"]
                },
                "боль_в_животе": {
                    "possible_diseases": ["гастрит", "язва", "аппендицит", "панкреатит"],
                    "severity_indicators": ["интенсивность", "локализация", "характер"],
                    "warning_signs": ["острая боль", "кровь в стуле", "рвота"]
                },
                "кашель": {
                    "possible_diseases": ["ОРВИ", "бронхит", "астма", "пневмония"],
                    "severity_indicators": ["характер", "продолжительность", "мокрота"],
                    "warning_signs": ["кровь в мокроте", "одышка", "высокая температура"]
                }
            }
        
        if db_type in ["all", "treatments"]:
            self.treatment_database = {
                "ОРВИ": {
                    "primary": ["отдых", "обильное питье", "симптоматическая терапия"],
                    "medications": ["парацетамол", "ибупрофен", "промывание носа"],
                    "prevention": ["вакцинация", "гигиена рук", "избегание скопления людей"],
                    "when_to_see_doctor": ["температура выше 38.5", "одышка", "боль в груди"]
                },
                "гастрит": {
                    "primary": ["диета", "отказ от алкоголя", "режим питания"],
                    "medications": ["ингибиторы протонной помпы", "антациды", "прокинетики"],
                    "prevention": ["правильное питание", "отказ от курения", "управление стрессом"],
                    "when_to_see_doctor": ["сильная боль", "кровь в стуле", "рвота"]
                },
                "гипертония": {
                    "primary": ["изменение образа жизни", "диета", "физические упражнения"],
                    "medications": ["АПФ-ингибиторы", "диуретики", "бета-блокаторы"],
                    "prevention": ["контроль веса", "ограничение соли", "отказ от курения"],
                    "when_to_see_doctor": ["давление выше 180/110", "боль в груди", "одышка"]
                }
            }
        
        # Сохраняем базу знаний
        self._save_knowledge_base()
    
    def _save_knowledge_base(self):
        """Сохранение базы знаний"""
        try:
            with open(self.model_dir / "disease_database.json", 'w', encoding='utf-8') as f:
                json.dump(self.disease_database, f, ensure_ascii=False, indent=2)
            
            with open(self.model_dir / "symptom_database.json", 'w', encoding='utf-8') as f:
                json.dump(self.symptom_database, f, ensure_ascii=False, indent=2)
            
            with open(self.model_dir / "treatment_database.json", 'w', encoding='utf-8') as f:
                json.dump(self.treatment_database, f, ensure_ascii=False, indent=2)
            
            logger.info("База знаний сохранена")
            
        except Exception as e:
            logger.error(f"Ошибка при сохранении базы знаний: {e}")
    
    async def analyze_symptoms(self, user_input: str) -> Dict:
        """
        Анализ симптомов пользователя и предоставление рекомендаций
        """
        try:
            logger.info(f"Анализирую симптомы: {user_input}")
            
            # Очищаем и нормализуем входной текст
            cleaned_input = self._clean_input(user_input)
            
            # Извлекаем симптомы
            symptoms = await self._extract_symptoms(cleaned_input)
            
            # Определяем возможные заболевания
            possible_diseases = await self._predict_diseases(symptoms, cleaned_input)
            
            # Генерируем рекомендации
            recommendations = await self._generate_recommendations(symptoms, possible_diseases)
            
            # Определяем срочность
            urgency = self._assess_urgency(symptoms)
            
            # Формируем ответ
            response = {
                "extracted_symptoms": symptoms,
                "possible_diseases": possible_diseases,
                "recommendations": recommendations,
                "urgency": urgency,
                "disclaimer": "Это предварительный анализ. Обязательно проконсультируйтесь с врачом для точной диагностики.",
                "confidence": self._calculate_confidence(symptoms, possible_diseases),
                "timestamp": datetime.now().isoformat()
            }
            
            logger.info(f"Анализ завершен. Найдено симптомов: {len(symptoms)}, возможных заболеваний: {len(possible_diseases)}")
            
            return response
            
        except Exception as e:
            logger.error(f"Ошибка при анализе симптомов: {e}")
            return {
                "error": "Произошла ошибка при анализе. Попробуйте переформулировать запрос.",
                "extracted_symptoms": [],
                "possible_diseases": [],
                "recommendations": [],
                "urgency": "unknown",
                "confidence": 0.0,
                "timestamp": datetime.now().isoformat()
            }
    
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
            # Используем классификатор симптомов
            if self.symptom_classifier:
                # Разбиваем текст на предложения
                sentences = [s.strip() for s in text.split('.') if s.strip()]
                
                for sentence in sentences:
                    try:
                        # Предсказываем симптом
                        prediction = self.symptom_classifier.predict([sentence])
                        proba = self.symptom_classifier.predict_proba([sentence])
                        
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
            
            # Дополнительно ищем ключевые слова
            keyword_symptoms = self._extract_symptoms_by_keywords(text)
            symptoms.extend(keyword_symptoms)
            
            # Убираем дубликаты
            unique_symptoms = []
            seen_names = set()
            for symptom in symptoms:
                if symptom['name'] not in seen_names:
                    unique_symptoms.append(symptom)
                    seen_names.add(symptom['name'])
            
            return unique_symptoms
            
        except Exception as e:
            logger.error(f"Ошибка при извлечении симптомов: {e}")
            return []
    
    def _extract_symptoms_by_keywords(self, text: str) -> List[Dict]:
        """Извлечение симптомов по ключевым словам"""
        symptoms = []
        
        # Словарь ключевых слов для поиска симптомов
        symptom_keywords = {
            "головная_боль": ["голова болит", "головная боль", "голова", "мигрень"],
            "температура": ["температура", "жар", "лихорадка", "горячий"],
            "кашель": ["кашель", "кашляю", "откашливание"],
            "насморк": ["насморк", "нос заложен", "сопли"],
            "боль_в_горле": ["горло болит", "боль в горле", "горло"],
            "тошнота": ["тошнота", "тошнит", "мутит"],
            "рвота": ["рвота", "рвёт", "блевота"],
            "диарея": ["диарея", "понос", "жидкий стул"],
            "слабость": ["слабость", "усталость", "вялость"],
            "головокружение": ["головокружение", "кружится голова", "головокружение"],
            "боль_в_животе": ["живот болит", "боль в животе", "живот"],
            "боль_в_груди": ["грудь болит", "боль в груди", "грудь"],
            "одышка": ["одышка", "трудно дышать", "нехватка воздуха"],
            "сыпь": ["сыпь", "высыпания", "пятна на коже"],
            "зуд": ["зуд", "чешется", "зудит"]
        }
        
        for symptom_name, keywords in symptom_keywords.items():
            for keyword in keywords:
                if keyword in text:
                    symptom = {
                        "name": symptom_name,
                        "text": f"Обнаружен симптом: {keyword}",
                        "confidence": 0.7,
                        "severity": self._estimate_severity(text)
                    }
                    symptoms.append(symptom)
                    break  # Нашли один симптом, переходим к следующему
        
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
                for symptom in symptom_names:
                    for disease_symptom in disease_symptoms:
                        if symptom in disease_symptom or disease_symptom in symptom:
                            matches += 1
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
            if self.disease_classifier:
                try:
                    prediction = self.disease_classifier.predict([full_text])
                    proba = self.disease_classifier.predict_proba([full_text])
                    
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
            
            # Сортируем по уверенности
            diseases.sort(key=lambda x: x['confidence'], reverse=True)
            
            return diseases[:5]  # Возвращаем топ-5
            
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
            
            # Рекомендации на основе заболеваний
            for disease in diseases:
                disease_name = disease['name']
                if disease_name in self.treatment_database:
                    treatment_info = self.treatment_database[disease_name]
                    
                    # Первичные рекомендации
                    for treatment in treatment_info.get('primary', []):
                        recommendation = {
                            "type": "treatment",
                            "text": treatment,
                            "priority": "high",
                            "related_disease": disease_name
                        }
                        recommendations.append(recommendation)
                    
                    # Когда обращаться к врачу
                    for warning in treatment_info.get('when_to_see_doctor', []):
                        recommendation = {
                            "type": "warning",
                            "text": f"Немедленно обратитесь к врачу при: {warning}",
                            "priority": "urgent",
                            "related_disease": disease_name
                        }
                        recommendations.append(recommendation)
            
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
        
        avg_symptom_confidence = sum(s.get('confidence', 0) for s in symptoms) / len(symptoms)
        avg_disease_confidence = sum(d.get('confidence', 0) for d in diseases) / len(diseases)
        
        # Учитываем количество симптомов
        symptom_factor = min(len(symptoms) / 5, 1.0)  # Максимум при 5+ симптомах
        
        overall_confidence = (avg_symptom_confidence + avg_disease_confidence) / 2 * symptom_factor
        
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