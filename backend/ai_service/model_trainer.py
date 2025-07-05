"""
Model Training Module - Модуль для обучения медицинских AI моделей
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from transformers import (
    AutoTokenizer, AutoModelForSequenceClassification,
    TrainingArguments, Trainer, BertTokenizer, BertModel
)
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import SVC
import pandas as pd
import numpy as np
import json
import pickle
import logging
from typing import Dict, List, Tuple, Optional
from pathlib import Path
import asyncio
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm
import warnings
warnings.filterwarnings('ignore')

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class MedicalDataset(Dataset):
    """Класс для работы с медицинскими данными"""
    
    def __init__(self, texts: List[str], labels: List[str], tokenizer, max_length: int = 512):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length
        
        # Создаем словарь для преобразования меток в числа
        self.label_to_id = {label: idx for idx, label in enumerate(set(labels))}
        self.id_to_label = {idx: label for label, idx in self.label_to_id.items()}
    
    def __len__(self):
        return len(self.texts)
    
    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]
        
        # Токенизация
        encoding = self.tokenizer(
            text,
            truncation=True,
            padding='max_length',
            max_length=self.max_length,
            return_tensors='pt'
        )
        
        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'labels': torch.tensor(self.label_to_id[label], dtype=torch.long)
        }


class ModelTrainer:
    """
    Класс для обучения моделей медицинской диагностики
    """
    
    def __init__(self, model_dir: str = "ai_models", data_dir: str = "medical_data"):
        self.model_dir = Path(model_dir)
        self.data_dir = Path(data_dir)
        self.model_dir.mkdir(exist_ok=True)
        
        # Модели
        self.symptom_model = None
        self.disease_model = None
        self.treatment_model = None
        
        # Токенизаторы
        self.tokenizer = None
        
        # Данные
        self.training_data = []
        self.validation_data = []
        
        # Метрики
        self.training_metrics = {}
        
        logger.info(f"ModelTrainer инициализирован. Модели: {self.model_dir}, Данные: {self.data_dir}")
    
    def load_training_data(self, data_source: str = "collected") -> bool:
        """
        Загрузка данных для обучения
        """
        try:
            logger.info("Загружаю данные для обучения...")
            
            if data_source == "collected":
                # Загружаем собранные данные
                data_files = list(self.data_dir.glob("raw/*.json"))
                
                if not data_files:
                    logger.warning("Не найдены файлы с собранными данными")
                    return False
                
                all_data = []
                for file_path in data_files:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        all_data.extend(data)
                
                # Обрабатываем данные
                self.training_data = self._process_collected_data(all_data)
                
            elif data_source == "synthetic":
                # Создаем синтетические данные для обучения
                self.training_data = self._generate_synthetic_data()
            
            logger.info(f"Загружено {len(self.training_data)} записей для обучения")
            return True
            
        except Exception as e:
            logger.error(f"Ошибка при загрузке данных: {e}")
            return False
    
    def _process_collected_data(self, raw_data: List[Dict]) -> List[Dict]:
        """
        Обработка собранных данных
        """
        processed_data = []
        
        for source_data in raw_data:
            items = source_data.get('items', [])
            
            for item in items:
                try:
                    # Извлекаем нужные поля
                    text = item.get('content', '')
                    title = item.get('title', '')
                    symptoms = item.get('symptoms', [])
                    
                    if not text or not title:
                        continue
                    
                    # Создаем записи для обучения классификатора симптомов
                    for symptom in symptoms:
                        if symptom and len(symptom) > 3:
                            processed_data.append({
                                'text': f"{title} {symptom}",
                                'label': self._normalize_symptom(symptom),
                                'type': 'symptom',
                                'source': item.get('source', '')
                            })
                    
                    # Создаем записи для обучения классификатора заболеваний
                    disease = self._extract_disease_from_title(title)
                    if disease:
                        processed_data.append({
                            'text': f"{title} {text[:500]}",  # Ограничиваем длину
                            'label': disease,
                            'type': 'disease',
                            'source': item.get('source', '')
                        })
                
                except Exception as e:
                    logger.warning(f"Ошибка при обработке записи: {e}")
                    continue
        
        return processed_data
    
    def _normalize_symptom(self, symptom: str) -> str:
        """
        Нормализация названия симптома
        """
        # Простая нормализация
        symptom = symptom.lower().strip()
        
        # Словарь для нормализации
        normalizations = {
            'головная боль': 'головная_боль',
            'боль в голове': 'головная_боль',
            'мигрень': 'головная_боль',
            'температура': 'лихорадка',
            'жар': 'лихорадка',
            'лихорадка': 'лихорадка',
            'кашель': 'кашель',
            'насморк': 'насморк',
            'заложенность носа': 'насморк',
            'боль в горле': 'боль_в_горле',
            'тошнота': 'тошнота',
            'рвота': 'рвота',
            'диарея': 'диарея',
            'понос': 'диарея',
            'слабость': 'слабость',
            'усталость': 'слабость',
            'головокружение': 'головокружение'
        }
        
        for key, value in normalizations.items():
            if key in symptom:
                return value
        
        return symptom.replace(' ', '_')
    
    def _extract_disease_from_title(self, title: str) -> Optional[str]:
        """
        Извлечение названия заболевания из заголовка
        """
        title = title.lower()
        
        # Известные заболевания
        diseases = {
            'орви': 'ОРВИ',
            'грипп': 'ОРВИ',
            'простуда': 'ОРВИ',
            'гастрит': 'гастрит',
            'язва': 'язва',
            'гипертония': 'гипертония',
            'давление': 'гипертония',
            'диабет': 'диабет',
            'сахарный диабет': 'диабет',
            'астма': 'астма',
            'бронхит': 'бронхит',
            'пневмония': 'пневмония',
            'ангина': 'ангина',
            'аллергия': 'аллергия',
            'депрессия': 'депрессия',
            'мигрень': 'мигрень'
        }
        
        for disease_key, disease_name in diseases.items():
            if disease_key in title:
                return disease_name
        
        return None
    
    def _generate_synthetic_data(self) -> List[Dict]:
        """
        Генерация синтетических данных для обучения
        """
        synthetic_data = []
        
        # Симптомы с вариациями
        symptom_variations = {
            'головная_боль': [
                'у меня болит голова',
                'сильная головная боль',
                'голова раскалывается',
                'мигрень замучила',
                'голова как в тисках'
            ],
            'лихорадка': [
                'высокая температура',
                'жар и озноб',
                'температура 38.5',
                'лихорадка третий день',
                'горячий весь день'
            ],
            'кашель': [
                'сухой кашель',
                'кашляю постоянно',
                'кашель с мокротой',
                'приступы кашля',
                'кашель не проходит'
            ],
            'насморк': [
                'заложен нос',
                'сопли текут',
                'насморк замучил',
                'нос не дышит',
                'постоянно сморкаюсь'
            ],
            'боль_в_горле': [
                'горло болит',
                'больно глотать',
                'першение в горле',
                'горло красное',
                'горло саднит'
            ],
            'тошнота': [
                'тошнит с утра',
                'подташнивает',
                'чувство тошноты',
                'мутит постоянно',
                'тошнота после еды'
            ],
            'боль_в_животе': [
                'живот болит',
                'боль в желудке',
                'резь в животе',
                'живот крутит',
                'боли в эпигастрии'
            ],
            'слабость': [
                'очень слабый',
                'сил совсем нет',
                'усталость сильная',
                'вялость весь день',
                'разбитость'
            ]
        }
        
        # Генерируем записи для симптомов
        for symptom, variations in symptom_variations.items():
            for variation in variations:
                synthetic_data.append({
                    'text': variation,
                    'label': symptom,
                    'type': 'symptom',
                    'source': 'synthetic'
                })
        
        # Заболевания с описаниями
        disease_descriptions = {
            'ОРВИ': [
                'простуда с насморком и кашлем',
                'вирусная инфекция с температурой',
                'грипп с ломотой в теле',
                'ОРВИ с заложенностью носа',
                'респираторная инфекция'
            ],
            'гастрит': [
                'боли в желудке после еды',
                'воспаление слизистой желудка',
                'тяжесть в эпигастрии',
                'изжога и отрыжка',
                'гастрит с тошнотой'
            ],
            'гипертония': [
                'повышенное давление',
                'артериальная гипертензия',
                'давление 160 на 90',
                'головные боли от давления',
                'гипертония с головокружением'
            ],
            'диабет': [
                'сахарный диабет 2 типа',
                'повышенный сахар в крови',
                'диабет с жаждой',
                'частое мочеиспускание',
                'диабет с похуданием'
            ]
        }
        
        # Генерируем записи для заболеваний
        for disease, descriptions in disease_descriptions.items():
            for description in descriptions:
                synthetic_data.append({
                    'text': description,
                    'label': disease,
                    'type': 'disease',
                    'source': 'synthetic'
                })
        
        logger.info(f"Сгенерировано {len(synthetic_data)} синтетических записей")
        return synthetic_data
    
    async def train_symptom_classifier(self, model_type: str = "sklearn") -> Dict:
        """
        Обучение классификатора симптомов
        """
        try:
            logger.info("Начинаю обучение классификатора симптомов...")
            
            # Фильтруем данные для симптомов
            symptom_data = [item for item in self.training_data if item['type'] == 'symptom']
            
            if not symptom_data:
                logger.error("Нет данных для обучения классификатора симптомов")
                return {"error": "Нет данных для обучения"}
            
            # Подготавливаем данные
            texts = [item['text'] for item in symptom_data]
            labels = [item['label'] for item in symptom_data]
            
            # Разделяем на обучение и валидацию
            X_train, X_val, y_train, y_val = train_test_split(
                texts, labels, test_size=0.2, random_state=42, stratify=labels
            )
            
            if model_type == "sklearn":
                # Используем sklearn модели
                results = await self._train_sklearn_model(
                    X_train, X_val, y_train, y_val, model_name="symptom_classifier"
                )
            elif model_type == "transformer":
                # Используем transformer модели
                results = await self._train_transformer_model(
                    X_train, X_val, y_train, y_val, model_name="symptom_classifier"
                )
            else:
                return {"error": f"Неизвестный тип модели: {model_type}"}
            
            # Сохраняем результаты
            self.training_metrics['symptom_classifier'] = results
            
            logger.info(f"Обучение классификатора симптомов завершено. Точность: {results.get('accuracy', 0):.4f}")
            
            return results
            
        except Exception as e:
            logger.error(f"Ошибка при обучении классификатора симптомов: {e}")
            return {"error": str(e)}
    
    async def train_disease_classifier(self, model_type: str = "sklearn") -> Dict:
        """
        Обучение классификатора заболеваний
        """
        try:
            logger.info("Начинаю обучение классификатора заболеваний...")
            
            # Фильтруем данные для заболеваний
            disease_data = [item for item in self.training_data if item['type'] == 'disease']
            
            if not disease_data:
                logger.error("Нет данных для обучения классификатора заболеваний")
                return {"error": "Нет данных для обучения"}
            
            # Подготавливаем данные
            texts = [item['text'] for item in disease_data]
            labels = [item['label'] for item in disease_data]
            
            # Разделяем на обучение и валидацию
            X_train, X_val, y_train, y_val = train_test_split(
                texts, labels, test_size=0.2, random_state=42, stratify=labels
            )
            
            if model_type == "sklearn":
                results = await self._train_sklearn_model(
                    X_train, X_val, y_train, y_val, model_name="disease_classifier"
                )
            elif model_type == "transformer":
                results = await self._train_transformer_model(
                    X_train, X_val, y_train, y_val, model_name="disease_classifier"
                )
            else:
                return {"error": f"Неизвестный тип модели: {model_type}"}
            
            # Сохраняем результаты
            self.training_metrics['disease_classifier'] = results
            
            logger.info(f"Обучение классификатора заболеваний завершено. Точность: {results.get('accuracy', 0):.4f}")
            
            return results
            
        except Exception as e:
            logger.error(f"Ошибка при обучении классификатора заболеваний: {e}")
            return {"error": str(e)}
    
    async def _train_sklearn_model(self, X_train: List[str], X_val: List[str], 
                                  y_train: List[str], y_val: List[str], 
                                  model_name: str) -> Dict:
        """
        Обучение модели sklearn
        """
        try:
            # Векторизация текста
            vectorizer = TfidfVectorizer(
                max_features=5000,
                ngram_range=(1, 2),
                stop_words=None,  # Для медицинских текстов не убираем стоп-слова
                min_df=2,
                max_df=0.8
            )
            
            X_train_vec = vectorizer.fit_transform(X_train)
            X_val_vec = vectorizer.transform(X_val)
            
            # Обучаем несколько моделей
            models = {
                'naive_bayes': MultinomialNB(),
                'random_forest': RandomForestClassifier(n_estimators=100, random_state=42),
                'svm': SVC(probability=True, random_state=42)
            }
            
            best_model = None
            best_accuracy = 0
            best_model_name = ""
            
            results = {}
            
            for model_type, model in models.items():
                logger.info(f"Обучаю модель {model_type}...")
                
                # Обучение
                model.fit(X_train_vec, y_train)
                
                # Предсказание
                y_pred = model.predict(X_val_vec)
                
                # Метрики
                accuracy = accuracy_score(y_val, y_pred)
                report = classification_report(y_val, y_pred, output_dict=True)
                
                results[model_type] = {
                    'accuracy': accuracy,
                    'classification_report': report
                }
                
                # Выбираем лучшую модель
                if accuracy > best_accuracy:
                    best_accuracy = accuracy
                    best_model = model
                    best_model_name = model_type
            
            # Сохраняем лучшую модель
            model_path = self.model_dir / f"{model_name}.pkl"
            vectorizer_path = self.model_dir / f"{model_name}_vectorizer.pkl"
            
            with open(model_path, 'wb') as f:
                pickle.dump(best_model, f)
            
            with open(vectorizer_path, 'wb') as f:
                pickle.dump(vectorizer, f)
            
            logger.info(f"Лучшая модель {best_model_name} сохранена с точностью {best_accuracy:.4f}")
            
            return {
                'best_model': best_model_name,
                'accuracy': best_accuracy,
                'all_results': results,
                'model_path': str(model_path),
                'vectorizer_path': str(vectorizer_path)
            }
            
        except Exception as e:
            logger.error(f"Ошибка при обучении sklearn модели: {e}")
            return {"error": str(e)}
    
    async def _train_transformer_model(self, X_train: List[str], X_val: List[str], 
                                      y_train: List[str], y_val: List[str], 
                                      model_name: str) -> Dict:
        """
        Обучение transformer модели
        """
        try:
            # Инициализация токенизатора
            model_checkpoint = "microsoft/BiomedNLP-PubMedBERT-base-uncased-abstract-fulltext"
            
            try:
                tokenizer = AutoTokenizer.from_pretrained(model_checkpoint)
            except:
                logger.warning("Не удалось загрузить BiomedNLP токенизатор, использую базовый BERT")
                tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
                model_checkpoint = 'bert-base-uncased'
            
            # Создаем датасеты
            train_dataset = MedicalDataset(X_train, y_train, tokenizer)
            val_dataset = MedicalDataset(X_val, y_val, tokenizer)
            
            # Инициализация модели
            num_labels = len(set(y_train))
            model = AutoModelForSequenceClassification.from_pretrained(
                model_checkpoint,
                num_labels=num_labels,
                ignore_mismatched_sizes=True
            )
            
            # Настройки обучения
            training_args = TrainingArguments(
                output_dir=str(self.model_dir / f"{model_name}_checkpoints"),
                num_train_epochs=3,
                per_device_train_batch_size=8,
                per_device_eval_batch_size=8,
                warmup_steps=500,
                weight_decay=0.01,
                logging_dir=str(self.model_dir / f"{model_name}_logs"),
                evaluation_strategy="epoch",
                save_strategy="epoch",
                load_best_model_at_end=True,
                metric_for_best_model="accuracy",
                greater_is_better=True,
            )
            
            # Функция для вычисления метрик
            def compute_metrics(eval_pred):
                predictions, labels = eval_pred
                predictions = np.argmax(predictions, axis=1)
                return {"accuracy": accuracy_score(labels, predictions)}
            
            # Создаем trainer
            trainer = Trainer(
                model=model,
                args=training_args,
                train_dataset=train_dataset,
                eval_dataset=val_dataset,
                compute_metrics=compute_metrics,
            )
            
            # Обучение
            logger.info("Начинаю обучение transformer модели...")
            trainer.train()
            
            # Оценка
            eval_results = trainer.evaluate()
            
            # Сохранение модели
            model_path = self.model_dir / f"{model_name}_transformer"
            trainer.save_model(str(model_path))
            tokenizer.save_pretrained(str(model_path))
            
            logger.info(f"Transformer модель сохранена с точностью {eval_results['eval_accuracy']:.4f}")
            
            return {
                'model_type': 'transformer',
                'accuracy': eval_results['eval_accuracy'],
                'eval_results': eval_results,
                'model_path': str(model_path)
            }
            
        except Exception as e:
            logger.error(f"Ошибка при обучении transformer модели: {e}")
            return {"error": str(e)}
    
    async def train_all_models(self) -> Dict:
        """
        Обучение всех моделей
        """
        try:
            logger.info("Начинаю обучение всех моделей...")
            
            # Загружаем данные
            if not self.training_data:
                success = self.load_training_data("synthetic")  # Используем синтетические данные
                if not success:
                    return {"error": "Не удалось загрузить данные для обучения"}
            
            results = {}
            
            # Обучаем классификатор симптомов
            logger.info("Обучение классификатора симптомов...")
            symptom_results = await self.train_symptom_classifier("sklearn")
            results['symptom_classifier'] = symptom_results
            
            # Обучаем классификатор заболеваний  
            logger.info("Обучение классификатора заболеваний...")
            disease_results = await self.train_disease_classifier("sklearn")
            results['disease_classifier'] = disease_results
            
            # Сохраняем общие результаты
            results_path = self.model_dir / "training_results.json"
            with open(results_path, 'w', encoding='utf-8') as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
            
            logger.info("Обучение всех моделей завершено")
            
            return {
                'status': 'success',
                'results': results,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Ошибка при обучении всех моделей: {e}")
            return {"error": str(e)}
    
    def evaluate_model(self, model_path: str, test_data: List[Dict]) -> Dict:
        """
        Оценка обученной модели
        """
        try:
            # Загружаем модель
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
            
            # Загружаем векторизатор
            vectorizer_path = model_path.replace('.pkl', '_vectorizer.pkl')
            with open(vectorizer_path, 'rb') as f:
                vectorizer = pickle.load(f)
            
            # Подготавливаем тестовые данные
            test_texts = [item['text'] for item in test_data]
            test_labels = [item['label'] for item in test_data]
            
            # Векторизация
            X_test = vectorizer.transform(test_texts)
            
            # Предсказание
            y_pred = model.predict(X_test)
            y_pred_proba = model.predict_proba(X_test)
            
            # Метрики
            accuracy = accuracy_score(test_labels, y_pred)
            report = classification_report(test_labels, y_pred, output_dict=True)
            
            return {
                'accuracy': accuracy,
                'classification_report': report,
                'predictions': y_pred.tolist(),
                'probabilities': y_pred_proba.tolist()
            }
            
        except Exception as e:
            logger.error(f"Ошибка при оценке модели: {e}")
            return {"error": str(e)}
    
    def get_training_stats(self) -> Dict:
        """
        Получение статистики обучения
        """
        try:
            stats = {
                'total_training_samples': len(self.training_data),
                'symptom_samples': len([item for item in self.training_data if item['type'] == 'symptom']),
                'disease_samples': len([item for item in self.training_data if item['type'] == 'disease']),
                'training_metrics': self.training_metrics,
                'model_files': []
            }
            
            # Найдем файлы моделей
            for model_file in self.model_dir.glob("*.pkl"):
                stats['model_files'].append(str(model_file))
            
            return stats
            
        except Exception as e:
            logger.error(f"Ошибка при получении статистики: {e}")
            return {"error": str(e)}
    
    async def continuous_learning(self, new_data: List[Dict]) -> Dict:
        """
        Непрерывное обучение с новыми данными
        """
        try:
            logger.info(f"Начинаю непрерывное обучение с {len(new_data)} новыми образцами...")
            
            # Добавляем новые данные к существующим
            self.training_data.extend(new_data)
            
            # Переобучаем модели
            results = await self.train_all_models()
            
            logger.info("Непрерывное обучение завершено")
            
            return {
                'status': 'success',
                'new_samples': len(new_data),
                'total_samples': len(self.training_data),
                'retraining_results': results
            }
            
        except Exception as e:
            logger.error(f"Ошибка при непрерывном обучении: {e}")
            return {"error": str(e)}


# Пример использования
async def main():
    """Пример использования ModelTrainer"""
    trainer = ModelTrainer()
    
    # Загружаем данные
    success = trainer.load_training_data("synthetic")
    if success:
        # Обучаем все модели
        results = await trainer.train_all_models()
        
        print("Результаты обучения:")
        print(json.dumps(results, ensure_ascii=False, indent=2))
        
        # Получаем статистику
        stats = trainer.get_training_stats()
        print("\nСтатистика обучения:")
        print(json.dumps(stats, ensure_ascii=False, indent=2))
    else:
        print("Не удалось загрузить данные для обучения")


if __name__ == "__main__":
    asyncio.run(main()) 