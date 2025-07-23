#!/usr/bin/env python3
"""
Скрипт для обучения нейросети по эпохам
"""

import os
import sys
import json
import torch
import numpy as np
from torch.utils.data import DataLoader, TensorDataset
from sklearn.model_selection import train_test_split
import logging
import time
from typing import Optional

# Добавляем путь к модулям
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from neural_network import MedicalDiagnosisNetwork, MedicalDataProcessor, MedicalAITrainer, MegaMedicalDiagnosisNetwork
from data_downloader import MassiveMedicalDataGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MedicalModelTrainer:
    """Главный класс для обучения медицинской нейросети"""
    
    def __init__(self, data_dir: str = "medical_data", models_dir: str = "trained_models"):
        self.data_dir = data_dir
        self.models_dir = models_dir
        
        # Создаем директории
        os.makedirs(data_dir, exist_ok=True)
        os.makedirs(models_dir, exist_ok=True)
        
        # Инициализируем компоненты
        self.data_processor = MedicalDataProcessor()
        self.downloader = MassiveMedicalDataGenerator(data_dir)
        
        # Параметры сети (МАКСИМАЛЬНО МОЩНАЯ АРХИТЕКТУРА)
        self.hidden_sizes = [4096, 2048, 1024, 512, 256, 128, 64]  # ОГРОМНАЯ глубокая сеть
        self.dropout_rate = 0.3  # Умеренный dropout для больших моделей
        self.batch_size = 32  # Меньше батч для стабильности больших моделей
        self.learning_rate = 0.005  # Консервативный LR для стабильности
        self.embedding_dim = 512  # Большие embeddings
        self.num_attention_heads = 16  # Много attention heads
        
        logger.info("Инициализирован тренировщик медицинской нейросети")
    
    def download_data(self) -> bool:
        """Скачивание данных"""
        logger.info("🔄 Шаг 1: Генерация медицинских данных...")
        
        try:
            # Генерируем данные
            dataset = self.downloader.generate_massive_dataset(100000)  # 100k записей
            dataset = self.downloader.add_noise_and_variations(dataset)
            
            # Сохраняем
            result = self.downloader.save_massive_dataset(dataset, "training_data")
            
            if result and result['total_records'] > 0:
                logger.info(f"✅ Сгенерировано {result['total_records']} записей")
                return True
            else:
                logger.error("❌ Не удалось сгенерировать данные")
                return False
        except Exception as e:
            logger.error(f"❌ Ошибка при генерации данных: {e}")
            return False
    
    def generate_incremental_data(self, records_count: int = 50000) -> bool:
        """Генерация инкрементальных данных (уникальных)"""
        logger.info(f"🔄 Генерация {records_count:,} инкрементальных данных...")
        
        try:
            # Находим последний созданный файл данных
            existing_file = None
            data_files = []
            
            for filename in os.listdir(self.data_dir):
                if filename.startswith('medical_') and filename.endswith('.json') and not 'stats' in filename:
                    filepath = os.path.join(self.data_dir, filename)
                    size = os.path.getsize(filepath)
                    data_files.append((filepath, size, filename))
            
            if data_files:
                # Берем самый большой файл как основу
                data_files.sort(key=lambda x: x[1], reverse=True)
                existing_file = data_files[0][0]
                logger.info(f"📂 Используется существующий файл: {data_files[0][2]}")
            
            # Генерируем инкрементальные данные
            new_data_file = self.downloader.generate_incremental_dataset(
                records_count=records_count,
                existing_data_file=existing_file or ""
            )
            
            if new_data_file and os.path.exists(new_data_file):
                logger.info(f"✅ Инкрементальные данные созданы: {new_data_file}")
                return True
            else:
                logger.error("❌ Не удалось создать инкрементальные данные")
                return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка при генерации инкрементальных данных: {e}")
            return False
    
    def prepare_data(self) -> Optional[tuple]:
        """Подготовка данных для обучения"""
        logger.info("🔄 Шаг 2: Подготовка данных...")
        
        try:
            # Ищем самый большой файл данных
            data_files = []
            for filename in os.listdir(self.data_dir):
                if filename.startswith('medical_') and filename.endswith('.json') and not 'stats' in filename:
                    filepath = os.path.join(self.data_dir, filename)
                    size = os.path.getsize(filepath)
                    data_files.append((filepath, size, filename))
            
            if not data_files:
                logger.error(f"❌ Файлы данных не найдены в: {self.data_dir}")
                return None
            
            # Сортируем по размеру файла (самый большой первый)
            data_files.sort(key=lambda x: x[1], reverse=True)
            data_file = data_files[0][0]
            logger.info(f"📂 Используется файл данных: {data_files[0][2]} ({data_files[0][1]//1024//1024} МБ)")
            
            data, symptoms, diseases = self.data_processor.load_data(data_file)
            
            # Создаем словарь
            self.data_processor.create_vocabulary(symptoms, diseases)
            
            # Ограничиваем размер данных для экономии памяти
            if len(data) > 1000000:  # Если больше 1 миллиона записей
                logger.info(f"🎯 Ограничиваем данные для экономии памяти: {len(data):,} -> 1,000,000 записей")
                data = data[:1000000]
            
            # Подготавливаем данные для обучения
            X, y = self.data_processor.prepare_training_data(data)
            
            if len(X) == 0:
                logger.error("❌ Не удалось подготовить данные для обучения")
                return None
            
            # Аугментируем данные (отключено для экономии памяти)
            logger.info("💾 Аугментация отключена для экономии памяти")
            X_augmented, y_augmented = X, y  # Без аугментации
            
            # Разделяем на обучающую и валидационную выборки
            # Для больших данных уменьшаем размер валидационной выборки
            test_size = min(0.2, 0.1 * len(X_augmented) / len(set(y_augmented)))
            test_size = max(test_size, 0.05)  # Минимум 5%
            
            X_train, X_val, y_train, y_val = train_test_split(
                X_augmented, y_augmented, test_size=test_size, random_state=42, 
                stratify=y_augmented if len(set(y_augmented)) <= len(y_augmented) * 0.5 else None
            )
            
            logger.info(f"✅ Данные подготовлены:")
            logger.info(f"   - Обучающая выборка: {len(X_train)} образцов")
            logger.info(f"   - Валидационная выборка: {len(X_val)} образцов")
            logger.info(f"   - Количество симптомов: {len(symptoms)}")
            logger.info(f"   - Количество заболеваний: {len(diseases)}")
            
            return X_train, X_val, y_train, y_val, len(symptoms), len(diseases)
            
        except Exception as e:
            logger.error(f"❌ Ошибка при подготовке данных: {e}")
            return None
    
    def create_model(self, input_size: int, output_size: int) -> MegaMedicalDiagnosisNetwork:
        """Создание МЕГА МОЩНОЙ модели нейросети"""
        logger.info("🔄 Шаг 3: Создание МАКСИМАЛЬНО МОЩНОЙ архитектуры нейросети...")
        
        model = MegaMedicalDiagnosisNetwork(
            input_size=input_size,
            output_size=output_size,
            hidden_sizes=self.hidden_sizes,
            dropout_rate=self.dropout_rate,
            embedding_dim=self.embedding_dim,
            num_attention_heads=self.num_attention_heads
        )
        
        logger.info(f"✅ МЕГА-МОДЕЛЬ создана:")
        logger.info(f"   - Входной размер: {input_size}")
        logger.info(f"   - Выходной размер: {output_size}")
        logger.info(f"   - Transformer слоев: 6")
        logger.info(f"   - Attention heads: {self.num_attention_heads}")
        logger.info(f"   - Embedding: {self.embedding_dim}")
        
        return model
    
    def train_model(self, model, X_train, X_val, y_train, y_val, num_epochs: int = 100, patience: int = 50) -> float:
        """Обучение модели"""
        logger.info(f"🔄 Шаг 4: Обучение нейросети на {num_epochs} эпох...")
        
        try:
            # Создаем DataLoader'ы
            train_dataset = TensorDataset(
                torch.FloatTensor(X_train),
                torch.LongTensor(y_train)
            )
            val_dataset = TensorDataset(
                torch.FloatTensor(X_val),
                torch.LongTensor(y_val)
            )
            
            train_loader = DataLoader(
                train_dataset, 
                batch_size=self.batch_size, 
                shuffle=True,
                drop_last=True
            )
            val_loader = DataLoader(
                val_dataset, 
                batch_size=self.batch_size, 
                shuffle=False
            )
            
            # Создаем тренировщик
            trainer = MedicalAITrainer(model)
            
            # Путь для сохранения лучшей модели
            save_path = os.path.join(self.models_dir, 'best_medical_model.pth')
            
            # Обучение
            start_time = time.time()
            best_accuracy = trainer.train(
                train_loader=train_loader,
                val_loader=val_loader,
                num_epochs=num_epochs,
                save_path=save_path,
                patience=patience
            )
            end_time = time.time()
            
            training_time = end_time - start_time
            logger.info(f"✅ Обучение завершено за {training_time:.2f} секунд")
            logger.info(f"   - Лучшая точность: {best_accuracy:.2f}%")
            
            # Сохраняем дополнительные файлы
            self.save_training_info(trainer, save_path)
            
            return best_accuracy
            
        except Exception as e:
            logger.error(f"❌ Ошибка при обучении: {e}")
            return 0.0
    
    def save_training_info(self, trainer: MedicalAITrainer, model_path: str):
        """Сохранение информации об обучении"""
        try:
            # Сохраняем процессор данных
            processor_path = os.path.join(self.models_dir, 'data_processor.json')
            # Безопасно сохраняем данные скейлера
            try:
                scaler_mean = self.data_processor.scaler.mean_.tolist() if hasattr(self.data_processor.scaler.mean_, 'tolist') else []
                scaler_scale = self.data_processor.scaler.scale_.tolist() if hasattr(self.data_processor.scaler.scale_, 'tolist') else []
            except:
                scaler_mean = []
                scaler_scale = []
            
            processor_data = {
                'symptom_vocab': self.data_processor.symptom_vocab,
                'disease_vocab': self.data_processor.disease_vocab,
                'vocab_size': self.data_processor.vocab_size,
                'scaler_mean': scaler_mean,
                'scaler_scale': scaler_scale
            }
            
            with open(processor_path, 'w', encoding='utf-8') as f:
                json.dump(processor_data, f, ensure_ascii=False, indent=2)
            
            # Сохраняем историю обучения
            history_path = os.path.join(self.models_dir, 'training_history.json')
            history_data = {
                'train_losses': trainer.train_losses,
                'val_losses': trainer.val_losses,
                'train_accuracies': trainer.train_accuracies,
                'val_accuracies': trainer.val_accuracies,
                'model_architecture': {
                    'input_size': trainer.model.input_size,
                    'hidden_sizes': trainer.model.hidden_sizes,
                    'output_size': trainer.model.output_size,
                    'dropout_rate': trainer.model.dropout_rate
                }
            }
            
            with open(history_path, 'w', encoding='utf-8') as f:
                json.dump(history_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"✅ Информация об обучении сохранена:")
            logger.info(f"   - Модель: {model_path}")
            logger.info(f"   - Процессор данных: {processor_path}")
            logger.info(f"   - История обучения: {history_path}")
            
        except Exception as e:
            logger.error(f"❌ Ошибка при сохранении информации: {e}")
    
    def full_training_pipeline(self, num_epochs: int = 100, download_new_data: bool = True, patience: int = 1000) -> bool:
        """Полный пайплайн обучения"""
        logger.info("🚀 Начинаю полный пайплайн обучения медицинской нейросети")
        logger.info("=" * 60)
        
        # Проверяем, нужно ли скачивать новые данные
        data_file = os.path.join(self.data_dir, 'medical_data.json')
        if download_new_data or not os.path.exists(data_file):
            if not self.download_data():
                return False
        else:
            logger.info("📂 Используются существующие данные")
        
        # Подготавливаем данные
        data_result = self.prepare_data()
        if data_result is None:
            return False
        
        X_train, X_val, y_train, y_val, input_size, output_size = data_result
        
        # Создаем модель
        model = self.create_model(input_size, output_size)
        
        # Обучаем модель
        best_accuracy = self.train_model(model, X_train, X_val, y_train, y_val, num_epochs, patience)
        
        if best_accuracy > 0:
            logger.info("=" * 60)
            logger.info("🎉 ОБУЧЕНИЕ ЗАВЕРШЕНО УСПЕШНО!")
            logger.info(f"   - Финальная точность: {best_accuracy:.2f}%")
            logger.info(f"   - Модель сохранена в: {self.models_dir}")
            logger.info("=" * 60)
            return True
        else:
            logger.error("❌ Обучение не удалось")
            return False
    
    def setup_transfer_learning(self, model_path: str, freeze_ratio: float = 0.5) -> bool:
        """Настройка transfer learning для существующей модели"""
        try:
            logger.info(f"Настройка transfer learning из модели: {model_path}")
            
            if not os.path.exists(model_path):
                logger.warning(f"Модель не найдена: {model_path}")
                return False
            
            # Загружаем данные для создания модели
            data_file = os.path.join(self.data_dir, 'medical_data.json')
            if not os.path.exists(data_file):
                logger.warning("Файл данных не найден, пропускаем transfer learning")
                return False
            
            # Подготавливаем данные
            data_result = self.prepare_data()
            if data_result is None:
                return False
            
            X_train, X_val, y_train, y_val, input_size, output_size = data_result
            
            # Создаем модель с теми же параметрами
            model = self.create_model(input_size, output_size)
            
            # Создаем тренировщик и загружаем существующую модель
            trainer = MedicalAITrainer(model)
            
            if trainer.load_for_transfer_learning(model_path):
                # Настраиваем transfer learning
                trainer.setup_transfer_learning(freeze_ratio)
                
                # Сохраняем настроенный тренировщик для дальнейшего использования
                self.trainer = trainer
                self.model = model
                
                logger.info("✅ Transfer learning настроен успешно")
                return True
            else:
                logger.error("❌ Не удалось загрузить модель для transfer learning")
                return False
                
        except Exception as e:
            logger.error(f"❌ Ошибка при настройке transfer learning: {e}")
            return False
    
    def test_model(self, test_symptoms: list) -> dict:
        """Тестирование обученной модели"""
        try:
            # Загружаем модель
            model_path = os.path.join(self.models_dir, 'best_medical_model.pth')
            processor_path = os.path.join(self.models_dir, 'data_processor.json')
            
            if not os.path.exists(model_path) or not os.path.exists(processor_path):
                return {"error": "Модель не найдена. Сначала обучите модель."}
            
            # Загружаем процессор данных
            with open(processor_path, 'r', encoding='utf-8') as f:
                processor_data = json.load(f)
            
            self.data_processor.symptom_vocab = processor_data['symptom_vocab']
            self.data_processor.disease_vocab = processor_data['disease_vocab']
            self.data_processor.vocab_size = processor_data['vocab_size']
            
            # Восстанавливаем скейлер
            self.data_processor.scaler.mean_ = np.array(processor_data['scaler_mean'])
            self.data_processor.scaler.scale_ = np.array(processor_data['scaler_scale'])
            
            # Загружаем модель
            checkpoint = torch.load(model_path, map_location='cpu')
            model = MedicalDiagnosisNetwork(
                input_size=checkpoint['input_size'],
                hidden_sizes=checkpoint['hidden_sizes'],
                output_size=checkpoint['output_size']
            )
            model.load_state_dict(checkpoint['model_state_dict'])
            model.eval()
            
            # Кодируем симптомы
            symptom_vector = self.data_processor.encode_symptoms(test_symptoms)
            symptom_vector = self.data_processor.scaler.transform([symptom_vector])
            
            # Предсказание
            with torch.no_grad():
                input_tensor = torch.FloatTensor(symptom_vector)
                output, confidence = model(input_tensor)
                
                # Получаем топ-3 предсказания
                probabilities = torch.softmax(output, dim=1)
                top_probs, top_indices = torch.topk(probabilities, k=min(3, output.size(1)))
                
                results = []
                for i in range(top_probs.size(1)):
                    disease_idx = top_indices[0][i].item()
                    probability = top_probs[0][i].item()
                    disease_name = self.data_processor.decode_disease(int(disease_idx))
                    
                    results.append({
                        'disease': disease_name,
                        'probability': probability * 100,
                        'confidence': confidence[0][0].item() * 100
                    })
                
                return {
                    'predictions': results,
                    'input_symptoms': test_symptoms
                }
        
        except Exception as e:
            return {"error": f"Ошибка при тестировании: {str(e)}"}

def main():
    """Основная функция"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Обучение медицинской нейросети')
    parser.add_argument('--epochs', type=int, default=100, help='Количество эпох обучения')
    parser.add_argument('--download', action='store_true', help='Скачать новые данные')
    parser.add_argument('--incremental', action='store_true', help='Инкрементальное обучение на новых данных')
    parser.add_argument('--test', nargs='*', help='Протестировать модель с симптомами')
    
    args = parser.parse_args()
    
    trainer = MedicalModelTrainer()
    
    if args.test is not None:
        # Тестирование
        if len(args.test) == 0:
            # Тестовые симптомы по умолчанию
            test_symptoms = ['головная боль', 'температура', 'кашель', 'насморк']
        else:
            test_symptoms = args.test
        
        print(f"\n🧪 Тестирование модели с симптомами: {test_symptoms}")
        result = trainer.test_model(test_symptoms)
        
        if 'error' in result:
            print(f"❌ {result['error']}")
        else:
            print(f"\n📊 Результаты диагностики:")
            for pred in result['predictions']:
                print(f"   - {pred['disease']}: {pred['probability']:.1f}% (уверенность: {pred['confidence']:.1f}%)")
    else:
        # Обучение
        if args.incremental:
            print("🔄 Инкрементальное обучение на новых данных")
            
            # Генерируем инкрементальные данные
            if trainer.generate_incremental_data(records_count=50000):
                # Обучаем с меньшим количеством эпох
                success = trainer.full_training_pipeline(
                    num_epochs=min(args.epochs, 50),
                    download_new_data=False
                )
            else:
                print("❌ Не удалось создать инкрементальные данные")
                success = False
        else:
            # Обычное обучение
            success = trainer.full_training_pipeline(
                num_epochs=args.epochs,
                download_new_data=args.download
            )
        
        if success:
            print("\n🎯 Можете протестировать модель командой:")
            print("python train_model.py --test головная_боль температура кашель")
        else:
            print("❌ Обучение не удалось")

if __name__ == "__main__":
    main() 