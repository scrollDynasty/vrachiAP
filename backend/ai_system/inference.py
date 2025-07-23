#!/usr/bin/env python3
"""
Модуль для использования обученной нейросети в медицинской диагностике
"""

import os
import sys
import json
import torch
import numpy as np
from typing import List, Dict, Any
import logging

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from neural_network import MedicalDiagnosisNetwork, MedicalDataProcessor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MedicalDiagnosisInference:
    """Класс для медицинской диагностики с использованием обученной нейросети"""
    
    def __init__(self, models_dir: str = "trained_models"):
        self.models_dir = models_dir
        self.model = None
        self.data_processor = MedicalDataProcessor()
        self.is_loaded = False
        
        # Пути к файлам
        self.model_path = os.path.join(models_dir, 'best_medical_model.pth')
        self.processor_path = os.path.join(models_dir, 'data_processor.json')
        
        # Загружаем модель при инициализации
        self.load_model()
    
    def load_model(self) -> bool:
        """Загрузка обученной модели"""
        try:
            if not os.path.exists(self.model_path) or not os.path.exists(self.processor_path):
                logger.warning(f"Файлы модели не найдены в {self.models_dir}")
                return False
            
            logger.info("Загрузка обученной модели...")
            
            # Загружаем процессор данных
            with open(self.processor_path, 'r', encoding='utf-8') as f:
                processor_data = json.load(f)
            
            self.data_processor.symptom_vocab = processor_data['symptom_vocab']
            self.data_processor.disease_vocab = processor_data['disease_vocab']
            self.data_processor.vocab_size = processor_data['vocab_size']
            
            # Восстанавливаем скейлер
            self.data_processor.scaler.mean_ = np.array(processor_data['scaler_mean'])
            self.data_processor.scaler.scale_ = np.array(processor_data['scaler_scale'])
            
            # Загружаем модель
            checkpoint = torch.load(self.model_path, map_location='cpu')
            self.model = MedicalDiagnosisNetwork(
                input_size=checkpoint['input_size'],
                hidden_sizes=checkpoint['hidden_sizes'],
                output_size=checkpoint['output_size']
            )
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.model.eval()
            
            self.is_loaded = True
            logger.info("✅ Модель успешно загружена")
            logger.info(f"   - Симптомов в словаре: {len(self.data_processor.symptom_vocab)}")
            logger.info(f"   - Заболеваний в словаре: {len(self.data_processor.disease_vocab)}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка при загрузке модели: {e}")
            return False
    
    def predict(self, symptoms: List[str], top_k: int = 3) -> Dict[str, Any]:
        """Предсказание заболевания по симптомам"""
        if not self.is_loaded:
            return {
                'error': 'Модель не загружена. Сначала обучите модель.',
                'predictions': []
            }
        
        try:
            # Очищаем и нормализуем симптомы
            cleaned_symptoms = self._clean_symptoms(symptoms)
            
            if not cleaned_symptoms:
                return {
                    'error': 'Не удалось обработать симптомы',
                    'predictions': []
                }
            
            # Кодируем симптомы
            symptom_vector = self.data_processor.encode_symptoms(cleaned_symptoms)
            
            # Проверяем, есть ли совпадения с известными симптомами
            recognized_symptoms = []
            for symptom in cleaned_symptoms:
                if symptom in self.data_processor.symptom_vocab:
                    recognized_symptoms.append(symptom)
                else:
                    # Ищем частичные совпадения
                    for vocab_symptom in self.data_processor.symptom_vocab.keys():
                        if symptom.lower() in vocab_symptom.lower() or vocab_symptom.lower() in symptom.lower():
                            recognized_symptoms.append(vocab_symptom)
                            break
            
            # Нормализуем вектор
            symptom_vector = self.data_processor.scaler.transform([symptom_vector])
            
            # Предсказание
            with torch.no_grad():
                input_tensor = torch.FloatTensor(symptom_vector)
                output, confidence = self.model(input_tensor)
                
                # Получаем топ-k предсказаний
                probabilities = torch.softmax(output, dim=1)
                top_probs, top_indices = torch.topk(probabilities, k=min(top_k, output.size(1)))
                
                predictions = []
                for i in range(top_probs.size(1)):
                    disease_idx = top_indices[0][i].item()
                    probability = top_probs[0][i].item()
                    confidence_score = confidence[0][0].item()
                    
                    disease_name = self.data_processor.decode_disease(disease_idx)
                    
                    predictions.append({
                        'disease': disease_name,
                        'probability': round(probability * 100, 2),
                        'confidence': round(confidence_score * 100, 2)
                    })
                
                return {
                    'predictions': predictions,
                    'input_symptoms': symptoms,
                    'recognized_symptoms': recognized_symptoms,
                    'processing_time': 0.01,  # Примерное время обработки
                    'model_status': 'active'
                }
        
        except Exception as e:
            logger.error(f"❌ Ошибка при предсказании: {e}")
            return {
                'error': f'Ошибка при диагностике: {str(e)}',
                'predictions': []
            }
    
    def _clean_symptoms(self, symptoms: List[str]) -> List[str]:
        """Очистка и нормализация симптомов"""
        cleaned = []
        
        for symptom in symptoms:
            if isinstance(symptom, str):
                # Убираем лишние пробелы, приводим к нижнему регистру
                cleaned_symptom = symptom.strip().lower()
                
                # Убираем знаки препинания
                import re
                cleaned_symptom = re.sub(r'[^\w\s]', '', cleaned_symptom)
                
                if cleaned_symptom and len(cleaned_symptom) > 2:
                    cleaned.append(cleaned_symptom)
        
        return cleaned
    
    def get_model_info(self) -> Dict[str, Any]:
        """Получение информации о модели"""
        if not self.is_loaded:
            return {'error': 'Модель не загружена'}
        
        try:
            history_path = os.path.join(self.models_dir, 'training_history.json')
            
            info = {
                'model_loaded': self.is_loaded,
                'symptoms_count': len(self.data_processor.symptom_vocab),
                'diseases_count': len(self.data_processor.disease_vocab),
                'model_path': self.model_path,
                'processor_path': self.processor_path
            }
            
            # Добавляем историю обучения, если есть
            if os.path.exists(history_path):
                with open(history_path, 'r', encoding='utf-8') as f:
                    history = json.load(f)
                    
                    info['architecture'] = history.get('model_architecture', {})
                    
                    # Лучшие результаты
                    if 'val_accuracies' in history and history['val_accuracies']:
                        info['best_accuracy'] = max(history['val_accuracies'])
                    
                    if 'train_accuracies' in history and history['train_accuracies']:
                        info['final_train_accuracy'] = history['train_accuracies'][-1]
            
            return info
            
        except Exception as e:
            return {'error': f'Ошибка при получении информации: {str(e)}'}
    
    def get_symptoms_list(self) -> List[str]:
        """Получение списка всех известных симптомов"""
        if not self.is_loaded:
            return []
        
        return sorted(list(self.data_processor.symptom_vocab.keys()))
    
    def get_diseases_list(self) -> List[str]:
        """Получение списка всех известных заболеваний"""
        if not self.is_loaded:
            return []
        
        return sorted(list(self.data_processor.disease_vocab.keys()))
    
    def find_similar_symptoms(self, symptom: str, limit: int = 5) -> List[str]:
        """Поиск похожих симптомов"""
        if not self.is_loaded:
            return []
        
        symptom = symptom.lower().strip()
        similar = []
        
        for vocab_symptom in self.data_processor.symptom_vocab.keys():
            if symptom in vocab_symptom.lower() or vocab_symptom.lower() in symptom:
                similar.append(vocab_symptom)
        
        return similar[:limit]

# Глобальный экземпляр для использования в API
medical_ai = MedicalDiagnosisInference()

def diagnose_symptoms(symptoms: List[str], top_k: int = 3) -> Dict[str, Any]:
    """Функция для диагностики симптомов (для использования в API)"""
    return medical_ai.predict(symptoms, top_k)

def get_model_status() -> Dict[str, Any]:
    """Получение статуса модели"""
    return medical_ai.get_model_info()

def get_available_symptoms() -> List[str]:
    """Получение списка доступных симптомов"""
    return medical_ai.get_symptoms_list()

def get_available_diseases() -> List[str]:
    """Получение списка доступных заболеваний"""
    return medical_ai.get_diseases_list()

def search_symptoms(query: str, limit: int = 5) -> List[str]:
    """Поиск симптомов по запросу"""
    return medical_ai.find_similar_symptoms(query, limit)

def main():
    """Основная функция для тестирования"""
    print("🧠 Медицинская AI диагностика")
    print("=" * 40)
    
    # Проверяем статус модели
    status = get_model_status()
    if 'error' in status:
        print(f"❌ {status['error']}")
        print("💡 Сначала обучите модель командой:")
        print("   python train_model.py --epochs 50")
        return
    
    print(f"✅ Модель загружена:")
    print(f"   - Симптомов: {status['symptoms_count']}")
    print(f"   - Заболеваний: {status['diseases_count']}")
    if 'best_accuracy' in status:
        print(f"   - Лучшая точность: {status['best_accuracy']:.2f}%")
    
    # Интерактивный режим
    print("\n🩺 Введите симптомы (через запятую) или 'exit' для выхода:")
    
    while True:
        try:
            user_input = input("\n> ").strip()
            
            if user_input.lower() in ['exit', 'quit', 'выход']:
                print("👋 До свидания!")
                break
            
            if not user_input:
                continue
            
            # Разделяем симптомы
            symptoms = [s.strip() for s in user_input.split(',')]
            
            # Диагностируем
            result = diagnose_symptoms(symptoms)
            
            if 'error' in result:
                print(f"❌ {result['error']}")
            else:
                print(f"\n📊 Результаты диагностики:")
                print(f"   Введенные симптомы: {', '.join(symptoms)}")
                if result['recognized_symptoms']:
                    print(f"   Распознанные симптомы: {', '.join(result['recognized_symptoms'])}")
                
                print(f"\n🎯 Возможные заболевания:")
                for i, pred in enumerate(result['predictions'], 1):
                    print(f"   {i}. {pred['disease']}: {pred['probability']:.1f}% (уверенность: {pred['confidence']:.1f}%)")
        
        except KeyboardInterrupt:
            print("\n👋 До свидания!")
            break
        except Exception as e:
            print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    main() 