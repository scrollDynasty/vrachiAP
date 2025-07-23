#!/usr/bin/env python3
"""
Архитектура нейросети для медицинской диагностики с поддержкой Transfer Learning
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
import json
import os
from typing import Dict, List, Tuple, Optional
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
import logging
from datetime import datetime
import shutil

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MedicalDiagnosisNetwork(nn.Module):
    """Нейросеть для медицинской диагностики с поддержкой Transfer Learning"""
    
    def __init__(self, input_size: int, hidden_sizes: List[int], output_size: int, dropout_rate: float = 0.3):
        super(MedicalDiagnosisNetwork, self).__init__()
        
        self.input_size = input_size
        self.output_size = output_size
        self.hidden_sizes = hidden_sizes
        self.dropout_rate = dropout_rate
        
        layers = []
        
        # Входной слой
        layers.append(nn.Linear(input_size, hidden_sizes[0]))
        layers.append(nn.BatchNorm1d(hidden_sizes[0]))
        layers.append(nn.ReLU())
        layers.append(nn.Dropout(dropout_rate))
        
        # Скрытые слои с BatchNorm
        for i in range(len(hidden_sizes) - 1):
            layers.append(nn.Linear(hidden_sizes[i], hidden_sizes[i + 1]))
            layers.append(nn.BatchNorm1d(hidden_sizes[i + 1]))
            layers.append(nn.ReLU())
            layers.append(nn.Dropout(dropout_rate))
        
        # Выходной слой (без BatchNorm)
        layers.append(nn.Linear(hidden_sizes[-1], output_size))
        
        self.network = nn.Sequential(*layers)
        
        # Слой для вычисления уверенности
        self.confidence_layer = nn.Sequential(
            nn.Linear(hidden_sizes[-1], 64),
            nn.ReLU(),
            nn.Dropout(dropout_rate),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
    
    def forward(self, x):
        """Прямое распространение"""
        # Проходим через основную сеть
        hidden = x
        for layer in self.network[:-1]:
            hidden = layer(hidden)
        
        # Получаем последний скрытый слой для уверенности
        last_hidden = hidden
        
        # Выходной слой
        output = self.network[-1](hidden)
        
        # Вычисляем уверенность
        confidence = self.confidence_layer(last_hidden)
        
        return output, confidence
    
    def freeze_layers(self, freeze_ratio: float = 0.5):
        """Замораживает часть слоев для transfer learning"""
        layers_to_freeze = int(len(self.network) * freeze_ratio)
        
        for i, layer in enumerate(self.network):
            if i < layers_to_freeze:
                for param in layer.parameters():
                    param.requires_grad = False
                logger.info(f"Заморожен слой {i}: {layer}")
            else:
                for param in layer.parameters():
                    param.requires_grad = True
        
        logger.info(f"Заморожено {layers_to_freeze} из {len(self.network)} слоев")
    
    def unfreeze_all_layers(self):
        """Размораживает все слои"""
        for layer in self.network:
            for param in layer.parameters():
                param.requires_grad = True
        logger.info("Все слои разморожены")

class MedicalDataProcessor:
    """Класс для обработки медицинских данных"""
    
    def __init__(self):
        self.symptom_vocab = {}
        self.disease_vocab = {}
        self.vocab_size = 0
        self.scaler = StandardScaler()
        
    def load_data(self, data_file: str) -> Tuple[List[Dict], List[str], List[str]]:
        """Загрузка данных из файла"""
        if not os.path.exists(data_file):
            raise FileNotFoundError(f"Файл данных не найден: {data_file}")
        
        with open(data_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Извлекаем симптомы и заболевания
        all_symptoms = set()
        all_diseases = set()
        
        for item in data:
            if 'symptoms' in item and item['symptoms']:
                all_symptoms.update(item['symptoms'])
            if 'name' in item:
                all_diseases.add(item['name'])
        
        return data, list(all_symptoms), list(all_diseases)
    
    def create_vocabulary(self, symptoms: List[str], diseases: List[str]):
        """Создание словарей для симптомов и заболеваний"""
        # Создаем словарь симптомов
        self.symptom_vocab = {symptom: i for i, symptom in enumerate(symptoms)}
        
        # Создаем словарь заболеваний
        self.disease_vocab = {disease: i for i, disease in enumerate(diseases)}
        
        self.vocab_size = len(symptoms)
        
        logger.info(f"Создан словарь: {len(symptoms)} симптомов, {len(diseases)} заболеваний")
    
    def extend_vocabulary(self, new_symptoms: List[str], new_diseases: List[str]):
        """Расширение словарей новыми симптомами и заболеваниями"""
        # Добавляем новые симптомы
        for symptom in new_symptoms:
            if symptom not in self.symptom_vocab:
                self.symptom_vocab[symptom] = len(self.symptom_vocab)
        
        # Добавляем новые заболевания
        for disease in new_diseases:
            if disease not in self.disease_vocab:
                self.disease_vocab[disease] = len(self.disease_vocab)
        
        # Обновляем размер словаря
        self.vocab_size = len(self.symptom_vocab)
        
        logger.info(f"Словарь расширен: {len(self.symptom_vocab)} симптомов, {len(self.disease_vocab)} заболеваний")
    
    def encode_symptoms(self, symptoms: List[str]) -> np.ndarray:
        """Кодирование симптомов в вектор"""
        vector = np.zeros(self.vocab_size)
        
        for symptom in symptoms:
            # Ищем точное совпадение
            if symptom in self.symptom_vocab:
                vector[self.symptom_vocab[symptom]] = 1.0
            else:
                # Ищем частичное совпадение
                for vocab_symptom, idx in self.symptom_vocab.items():
                    if symptom.lower() in vocab_symptom.lower() or vocab_symptom.lower() in symptom.lower():
                        vector[idx] = 0.5  # Частичное совпадение
                        break
        
        return vector
    
    def encode_disease(self, disease: str) -> int:
        """Кодирование заболевания"""
        if disease in self.disease_vocab:
            return self.disease_vocab[disease]
        return -1
    
    def decode_disease(self, disease_idx: int) -> str:
        """Декодирование заболевания"""
        for disease, idx in self.disease_vocab.items():
            if idx == disease_idx:
                return disease
        return "Неизвестное заболевание"
    
    def prepare_training_data(self, data: List[Dict]) -> Tuple[np.ndarray, np.ndarray]:
        """Подготовка данных для обучения"""
        logger.info("Подготовка данных для обучения...")
        
        X = []
        y = []
        
        for item in data:
            if 'symptoms' in item and item['symptoms'] and 'name' in item:
                # Кодируем симптомы
                symptom_vector = self.encode_symptoms(item['symptoms'])
                
                # Кодируем заболевание
                disease_idx = self.encode_disease(item['name'])
                
                if disease_idx != -1:
                    X.append(symptom_vector)
                    y.append(disease_idx)
        
        X = np.array(X)
        y = np.array(y)
        
        # Нормализуем данные
        X = self.scaler.fit_transform(X)
        
        logger.info(f"Подготовлено {len(X)} образцов для обучения")
        return X, y
    
    def add_noise(self, X: np.ndarray, noise_level: float = 0.1) -> np.ndarray:
        """Добавление шума к данным для аугментации"""
        noise = np.random.normal(0, noise_level, X.shape)
        return X + noise
    
    def augment_data(self, X: np.ndarray, y: np.ndarray, augmentation_factor: int = 1) -> Tuple[np.ndarray, np.ndarray]:
        """Аугментация данных"""
        logger.info(f"Аугментация данных с коэффициентом {augmentation_factor}")
        
        X_augmented = [X]
        y_augmented = [y]
        
        for _ in range(augmentation_factor - 1):
            X_noisy = self.add_noise(X, noise_level=0.1)
            X_augmented.append(X_noisy)
            y_augmented.append(y)
        
        X_final = np.concatenate(X_augmented, axis=0)
        y_final = np.concatenate(y_augmented, axis=0)
        
        logger.info(f"Данные аугментированы: {len(X)} -> {len(X_final)} образцов")
        return X_final, y_final

class MedicalAITrainer:
    """Тренировщик нейросети с поддержкой Transfer Learning"""
    
    def __init__(self, model, device: Optional[str] = None):
        self.model = model
        self.device = device or ('cuda' if torch.cuda.is_available() else 'cpu')
        self.model.to(self.device)
        
        # Оптимизатор и функция потерь (увеличенный learning rate)
        self.optimizer = torch.optim.Adam(model.parameters(), lr=0.01, weight_decay=1e-5)
        self.criterion = nn.CrossEntropyLoss()
        self.confidence_criterion = nn.MSELoss()
        
        # Адаптивный scheduler для уменьшения learning rate
        self.scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', factor=0.5, patience=5
        )
        
        # Для отслеживания прогресса
        self.train_losses = []
        self.val_losses = []
        self.train_accuracies = []
        self.val_accuracies = []
        
        # Для transfer learning
        self.previous_best_accuracy = 0.0
        self.learning_rate_schedule = []
        
        logger.info(f"Тренировщик инициализирован на устройстве: {self.device}")
    
    def setup_transfer_learning(self, freeze_ratio: float = 0.5, fine_tuning_lr: float = 0.0001):
        """Настройка transfer learning"""
        logger.info("Настройка Transfer Learning...")
        
        # Замораживаем часть слоев
        self.model.freeze_layers(freeze_ratio)
        
        # Уменьшаем learning rate для fine-tuning
        for param_group in self.optimizer.param_groups:
            param_group['lr'] = fine_tuning_lr
        
        logger.info(f"Transfer Learning настроен: freeze_ratio={freeze_ratio}, lr={fine_tuning_lr}")
    
    def train_epoch(self, train_loader, epoch: int) -> Tuple[float, float]:
        """Обучение одной эпохи"""
        self.model.train()
        total_loss = 0
        correct = 0
        total = 0
        
        for batch_idx, (data, target) in enumerate(train_loader):
            data, target = data.to(self.device), target.to(self.device)
            
            # Обнуляем градиенты
            self.optimizer.zero_grad()
            
            # Прямое распространение
            output, confidence = self.model(data)
            
            # Вычисляем потери
            classification_loss = self.criterion(output, target)
            
            # Целевая уверенность (высокая для правильных предсказаний)
            predicted = torch.argmax(output, dim=1)
            target_confidence = (predicted == target).float().unsqueeze(1)
            confidence_loss = self.confidence_criterion(confidence, target_confidence)
            
            # Общая потеря
            total_loss_batch = classification_loss + 0.3 * confidence_loss
            
            # Обратное распространение
            total_loss_batch.backward()
            self.optimizer.step()
            
            # Статистика
            total_loss += total_loss_batch.item()
            correct += (predicted == target).sum().item()
            total += target.size(0)
            
            if batch_idx % 10 == 0:
                logger.info(f'Эпоха {epoch}, Батч {batch_idx}, Потеря: {total_loss_batch.item():.4f}, Точность: {100. * correct / total:.2f}%')
        
        avg_loss = total_loss / len(train_loader)
        accuracy = 100. * correct / total
        
        return avg_loss, accuracy
    
    def validate_epoch(self, val_loader, epoch: int) -> Tuple[float, float]:
        """Валидация одной эпохи"""
        self.model.eval()
        total_loss = 0
        correct = 0
        total = 0
        
        with torch.no_grad():
            for data, target in val_loader:
                data, target = data.to(self.device), target.to(self.device)
                
                output, confidence = self.model(data)
                
                # Вычисляем потери
                classification_loss = self.criterion(output, target)
                predicted = torch.argmax(output, dim=1)
                target_confidence = (predicted == target).float().unsqueeze(1)
                confidence_loss = self.confidence_criterion(confidence, target_confidence)
                
                total_loss_batch = classification_loss + 0.3 * confidence_loss
                total_loss += total_loss_batch.item()
                
                correct += (predicted == target).sum().item()
                total += target.size(0)
        
        avg_loss = total_loss / len(val_loader)
        accuracy = 100. * correct / total
        
        return avg_loss, accuracy
    
    def train(self, train_loader, val_loader, num_epochs: int = 100, save_path: Optional[str] = None, 
              patience: int = 50, is_transfer_learning: bool = False) -> float:
        """Основной цикл обучения"""
        logger.info(f"Начинаю обучение на {num_epochs} эпох...")
        
        best_val_accuracy = self.previous_best_accuracy if is_transfer_learning else 0.0
        patience_counter = 0
        
        for epoch in range(num_epochs):
            # Обучение
            train_loss, train_accuracy = self.train_epoch(train_loader, epoch + 1)
            self.train_losses.append(train_loss)
            self.train_accuracies.append(train_accuracy)
            
            # Валидация
            val_loss, val_accuracy = self.validate_epoch(val_loader, epoch + 1)
            self.val_losses.append(val_loss)
            self.val_accuracies.append(val_accuracy)
            
            logger.info(f'Эпоха {epoch + 1}/{num_epochs}:')
            logger.info(f'  Обучение - Потеря: {train_loss:.4f}, Точность: {train_accuracy:.2f}%')
            logger.info(f'  Валидация - Потеря: {val_loss:.4f}, Точность: {val_accuracy:.2f}%')
            
            # Обновляем learning rate на основе валидационной потери
            self.scheduler.step(val_loss)
            
            # Сохраняем checkpoint каждые 10 эпох для безопасности
            if save_path is not None and (epoch + 1) % 10 == 0:
                checkpoint_path = save_path.replace('.pth', f'_checkpoint_epoch_{epoch + 1}.pth')
                self.save_model(checkpoint_path, epoch + 1, val_accuracy)
                logger.info(f'💾 Checkpoint сохранен: epoch {epoch + 1}')
            
            # Сохраняем лучшую модель
            if val_accuracy > best_val_accuracy:
                best_val_accuracy = val_accuracy
                patience_counter = 0
                
                if save_path is not None:
                    self.save_model(save_path, epoch + 1, val_accuracy)
                    logger.info(f'✅ Новая лучшая модель сохранена: {val_accuracy:.2f}%')
            else:
                patience_counter += 1
            
            # Early stopping
            if patience_counter >= patience:
                logger.info(f'Early stopping на эпохе {epoch + 1}')
                break
        
        logger.info(f'Обучение завершено. Лучшая точность: {best_val_accuracy:.2f}%')
        return best_val_accuracy
    
    def save_model(self, save_path: str, epoch: int, accuracy: float):
        """Сохранение модели"""
        torch.save({
            'epoch': epoch,
            'model_state_dict': self.model.state_dict(),
            'optimizer_state_dict': self.optimizer.state_dict(),
            'accuracy': accuracy,
            'input_size': self.model.input_size,
            'hidden_sizes': self.model.hidden_sizes,
            'output_size': self.model.output_size,
            'dropout_rate': self.model.dropout_rate,
            'train_losses': self.train_losses,
            'val_losses': self.val_losses,
            'train_accuracies': self.train_accuracies,
            'val_accuracies': self.val_accuracies,
            'timestamp': datetime.now().isoformat()
        }, save_path)
    
    def load_for_transfer_learning(self, model_path: str) -> bool:
        """Загрузка модели для transfer learning"""
        try:
            if not os.path.exists(model_path):
                logger.warning(f"Модель не найдена: {model_path}")
                return False
            
            checkpoint = torch.load(model_path, map_location=self.device)
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
            
            # Загружаем предыдущую историю
            self.train_losses = checkpoint.get('train_losses', [])
            self.val_losses = checkpoint.get('val_losses', [])
            self.train_accuracies = checkpoint.get('train_accuracies', [])
            self.val_accuracies = checkpoint.get('val_accuracies', [])
            
            self.previous_best_accuracy = checkpoint.get('accuracy', 0.0)
            
            logger.info(f"✅ Модель загружена для transfer learning")
            logger.info(f"   - Предыдущая лучшая точность: {self.previous_best_accuracy:.2f}%")
            logger.info(f"   - Эпоха: {checkpoint.get('epoch', 'неизвестно')}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Ошибка при загрузке модели: {e}")
            return False
    
    def create_model_backup(self, model_path: str, backup_dir: str = "model_backups"):
        """Создание резервной копии модели"""
        if not os.path.exists(model_path):
            return
        
        os.makedirs(backup_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_path = os.path.join(backup_dir, f"model_backup_{timestamp}.pth")
        
        shutil.copy2(model_path, backup_path)
        logger.info(f"Создана резервная копия модели: {backup_path}")

class MegaMedicalDiagnosisNetwork(nn.Module):
    """МАКСИМАЛЬНО МОЩНАЯ нейросеть с глубокой архитектурой и attention"""
    
    def __init__(self, input_size: int, hidden_sizes: List[int], output_size: int, 
                 dropout_rate: float = 0.3, embedding_dim: int = 512, num_attention_heads: int = 16):
        super().__init__()
        
        self.input_size = input_size
        self.output_size = output_size
        self.hidden_sizes = hidden_sizes
        self.dropout_rate = dropout_rate
        self.embedding_dim = embedding_dim
        
        # Input projection к embedding space
        self.input_projection = nn.Linear(input_size, embedding_dim)
        
        # Multi-head attention для понимания связей между симптомами
        self.attention = nn.MultiheadAttention(
            embed_dim=embedding_dim, 
            num_heads=num_attention_heads, 
            dropout=dropout_rate,
            batch_first=True
        )
        
        # ОГРОМНАЯ глубокая сеть
        layers = []
        
        # От embedding к первому hidden слою
        layers.extend([
            nn.Linear(embedding_dim, hidden_sizes[0]),
            nn.LayerNorm(hidden_sizes[0]),
            nn.GELU(),  # GELU активация для лучшей производительности
            nn.Dropout(dropout_rate)
        ])
        
        # Огромные скрытые слои с BatchNorm
        for i in range(len(hidden_sizes) - 1):
            layers.extend([
                nn.Linear(hidden_sizes[i], hidden_sizes[i + 1]),
                nn.LayerNorm(hidden_sizes[i + 1]),
                nn.GELU(),
                nn.Dropout(dropout_rate)
            ])
        
        # Выходной слой
        layers.append(nn.Linear(hidden_sizes[-1], output_size))
        
        self.network = nn.Sequential(*layers)
        
        # Мощная confidence сеть
        self.confidence_layer = nn.Sequential(
            nn.Linear(hidden_sizes[-1], 512),
            nn.LayerNorm(512),
            nn.GELU(),
            nn.Dropout(dropout_rate),
            nn.Linear(512, 256),
            nn.LayerNorm(256),
            nn.GELU(),
            nn.Dropout(dropout_rate),
            nn.Linear(256, 128),
            nn.LayerNorm(128),
            nn.GELU(),
            nn.Linear(128, 1),
            nn.Sigmoid()
        )
        
        # Xavier инициализация весов
        self.apply(self._init_weights)
        
    def _init_weights(self, module):
        if isinstance(module, nn.Linear):
            nn.init.xavier_uniform_(module.weight)
            if module.bias is not None:
                nn.init.constant_(module.bias, 0)
        elif isinstance(module, nn.LayerNorm):
            nn.init.constant_(module.bias, 0)
            nn.init.constant_(module.weight, 1.0)
    
    def forward(self, x):
        batch_size = x.size(0)
        
        # Project к embedding пространству
        x = self.input_projection(x)  # [batch, embedding_dim]
        
        # Добавляем sequence dimension для attention
        x = x.unsqueeze(1)  # [batch, 1, embedding_dim]
        
        # Self-attention для понимания связей
        attended, attention_weights = self.attention(x, x, x)
        x = attended.squeeze(1)  # [batch, embedding_dim]
        
        # Проходим через мега-глубокую сеть
        hidden = x
        for layer in self.network[:-1]:
            hidden = layer(hidden)
        
        # Финальный выходной слой
        output = self.network[-1](hidden)
        
        # Confidence estimation
        confidence = self.confidence_layer(hidden)
        
        return output, confidence
    
    def freeze_layers(self, freeze_ratio: float = 0.5):
        """Замораживает часть слоев для transfer learning"""
        layers_to_freeze = int(len(self.network) * freeze_ratio)
        
        for i, layer in enumerate(self.network):
            if i < layers_to_freeze:
                for param in layer.parameters():
                    param.requires_grad = False
            else:
                for param in layer.parameters():
                    param.requires_grad = True
        
        logger.info(f"Заморожено {layers_to_freeze} из {len(self.network)} слоев")
    
    def unfreeze_all_layers(self):
        """Размораживает все слои"""
        for layer in self.network:
            for param in layer.parameters():
                param.requires_grad = True
        logger.info("Все слои разморожены") 