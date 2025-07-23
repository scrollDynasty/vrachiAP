
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Получаем URL базы данных
DATABASE_URL = os.getenv(
    "DATABASE_URL", "mysql+pymysql://vrachi_user:1435511926Ss..@localhost:3306/online_doctors_db"
)

def run_migration():
    """Выполняет миграцию базы данных для AI системы"""
    try:
        print("🤖 Подключение к базе данных для миграции AI системы...")
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            print("📋 Проверяем существующие AI таблицы...")
            
            # Проверяем, какие таблицы уже существуют
            result = connection.execute(text("""
                SELECT TABLE_NAME 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME IN (
                    'ai_diagnoses', 'ai_training_data', 'ai_models', 
                    'ai_model_training', 'ai_feedback', 'ai_conversations',
                    'ai_conversation_messages', 'ai_conversation_feedback',
                    'ai_conversation_training'
                )
            """))
            existing_tables = [row[0] for row in result.fetchall()]
            
            # 1. Создаем таблицу ai_diagnoses
            if 'ai_diagnoses' not in existing_tables:
                print("📊 Создаем таблицу ai_diagnoses...")
                connection.execute(text("""
                    CREATE TABLE ai_diagnoses (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        patient_id INT NOT NULL,
                        symptoms_description TEXT NOT NULL,
                        patient_age INT NULL,
                        patient_gender VARCHAR(10) NULL,
                        additional_info TEXT NULL,
                        extracted_symptoms JSON NULL,
                        possible_diseases JSON NULL,
                        recommendations JSON NULL,
                        urgency_level VARCHAR(20) NULL,
                        confidence_score FLOAT NULL,
                        processing_time FLOAT NULL,
                        model_version VARCHAR(50) NULL,
                        request_id VARCHAR(100) NULL,
                        feedback_rating INT NULL,
                        feedback_comment TEXT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
                        INDEX idx_ai_diagnosis_patient (patient_id),
                        INDEX idx_ai_diagnosis_created (created_at),
                        INDEX idx_ai_diagnosis_urgency (urgency_level),
                        INDEX idx_ai_diagnosis_request (request_id)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                connection.commit()
                print("✅ Таблица ai_diagnoses создана")
            else:
                print("⚠️ Таблица ai_diagnoses уже существует")
            
            # 2. Создаем таблицу ai_training_data
            if 'ai_training_data' not in existing_tables:
                print("📚 Создаем таблицу ai_training_data...")
                connection.execute(text("""
                    CREATE TABLE ai_training_data (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        source_name VARCHAR(100) NOT NULL,
                        source_url VARCHAR(512) NULL,
                        title VARCHAR(255) NOT NULL,
                        content TEXT NOT NULL,
                        symptoms JSON NULL,
                        diseases JSON NULL,
                        treatments JSON NULL,
                        language VARCHAR(10) NOT NULL DEFAULT 'en',
                        category VARCHAR(100) NULL,
                        quality_score FLOAT NULL,
                        is_processed BOOLEAN DEFAULT FALSE,
                        is_validated BOOLEAN DEFAULT FALSE,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_training_data_source (source_name),
                        INDEX idx_training_data_language (language),
                        INDEX idx_training_data_processed (is_processed),
                        INDEX idx_training_data_created (created_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                connection.commit()
                print("✅ Таблица ai_training_data создана")
            else:
                print("⚠️ Таблица ai_training_data уже существует")
            
            # 3. Создаем таблицу ai_models
            if 'ai_models' not in existing_tables:
                print("🧠 Создаем таблицу ai_models...")
                connection.execute(text("""
                    CREATE TABLE ai_models (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        name VARCHAR(100) NOT NULL,
                        model_type VARCHAR(50) NOT NULL,
                        version VARCHAR(20) NOT NULL,
                        description TEXT NULL,
                        model_path VARCHAR(512) NOT NULL,
                        config_path VARCHAR(512) NULL,
                        accuracy FLOAT NULL,
                        `precision` FLOAT NULL,
                        recall FLOAT NULL,
                        f1_score FLOAT NULL,
                        training_data_size INT NULL,
                        validation_data_size INT NULL,
                        training_time FLOAT NULL,
                        epochs INT NULL,
                        is_active BOOLEAN DEFAULT FALSE,
                        is_production BOOLEAN DEFAULT FALSE,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        INDEX idx_ai_model_name_version (name, version),
                        INDEX idx_ai_model_type (model_type),
                        INDEX idx_ai_model_active (is_active),
                        INDEX idx_ai_model_production (is_production),
                        UNIQUE KEY uq_ai_model_name_version (name, version)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                connection.commit()
                print("✅ Таблица ai_models создана")
            else:
                print("⚠️ Таблица ai_models уже существует")
            
            # 4. Создаем таблицу ai_model_training
            if 'ai_model_training' not in existing_tables:
                print("🏋️ Создаем таблицу ai_model_training...")
                connection.execute(text("""
                    CREATE TABLE ai_model_training (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        model_id INT NOT NULL,
                        training_parameters JSON NULL,
                        training_data_ids JSON NULL,
                        training_log TEXT NULL,
                        final_metrics JSON NULL,
                        status VARCHAR(20) DEFAULT 'pending',
                        error_message TEXT NULL,
                        started_at DATETIME NULL,
                        completed_at DATETIME NULL,
                        duration FLOAT NULL,
                        created_by INT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE CASCADE,
                        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
                        INDEX idx_training_model (model_id),
                        INDEX idx_training_status (status),
                        INDEX idx_training_created (created_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                connection.commit()
                print("✅ Таблица ai_model_training создана")
            else:
                print("⚠️ Таблица ai_model_training уже существует")
            
            # 5. Создаем таблицу ai_feedback
            if 'ai_feedback' not in existing_tables:
                print("💭 Создаем таблицу ai_feedback...")
                connection.execute(text("""
                    CREATE TABLE ai_feedback (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        diagnosis_id INT NOT NULL,
                        user_id INT NOT NULL,
                        rating INT NOT NULL,
                        comment TEXT NULL,
                        symptoms_accuracy INT NULL,
                        disease_accuracy INT NULL,
                        recommendations_usefulness INT NULL,
                        actual_diagnosis VARCHAR(255) NULL,
                        doctor_feedback TEXT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (diagnosis_id) REFERENCES ai_diagnoses(id) ON DELETE CASCADE,
                        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                        INDEX idx_feedback_diagnosis (diagnosis_id),
                        INDEX idx_feedback_user (user_id),
                        INDEX idx_feedback_rating (rating),
                        INDEX idx_feedback_created (created_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                connection.commit()
                print("✅ Таблица ai_feedback создана")
            else:
                print("⚠️ Таблица ai_feedback уже существует")
            
            # 6. Создаем таблицу ai_conversations
            if 'ai_conversations' not in existing_tables:
                print("💬 Создаем таблицу ai_conversations...")
                connection.execute(text("""
                    CREATE TABLE ai_conversations (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        session_id VARCHAR(100) UNIQUE NOT NULL,
                        patient_id INT NOT NULL,
                        patient_info JSON NULL,
                        current_symptoms JSON NULL,
                        suspected_conditions JSON NULL,
                        urgency_level VARCHAR(20) DEFAULT 'low',
                        conversation_stage VARCHAR(50) DEFAULT 'greeting',
                        status VARCHAR(20) DEFAULT 'active',
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                        ended_at DATETIME NULL,
                        final_recommendations JSON NULL,
                        conversation_summary TEXT NULL,
                        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
                        INDEX idx_ai_conversation_session (session_id),
                        INDEX idx_ai_conversation_patient (patient_id),
                        INDEX idx_ai_conversation_status (status),
                        INDEX idx_ai_conversation_created (created_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                connection.commit()
                print("✅ Таблица ai_conversations создана")
            else:
                print("⚠️ Таблица ai_conversations уже существует")
            
            # 7. Создаем таблицу ai_conversation_messages
            if 'ai_conversation_messages' not in existing_tables:
                print("📨 Создаем таблицу ai_conversation_messages...")
                connection.execute(text("""
                    CREATE TABLE ai_conversation_messages (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        conversation_id INT NOT NULL,
                        sender_role VARCHAR(20) NOT NULL,
                        message TEXT NOT NULL,
                        message_context JSON NULL,
                        processing_time FLOAT NULL,
                        confidence_score FLOAT NULL,
                        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
                        INDEX idx_ai_message_conversation (conversation_id),
                        INDEX idx_ai_message_sender (sender_role),
                        INDEX idx_ai_message_sent (sent_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                connection.commit()
                print("✅ Таблица ai_conversation_messages создана")
            else:
                print("⚠️ Таблица ai_conversation_messages уже существует")
            
            # 8. Создаем таблицу ai_conversation_feedback
            if 'ai_conversation_feedback' not in existing_tables:
                print("⭐ Создаем таблицу ai_conversation_feedback...")
                connection.execute(text("""
                    CREATE TABLE ai_conversation_feedback (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        conversation_id INT NOT NULL,
                        patient_id INT NOT NULL,
                        overall_rating INT NOT NULL,
                        conversation_quality INT NULL,
                        medical_accuracy INT NULL,
                        helpfulness INT NULL,
                        ai_empathy INT NULL,
                        comment TEXT NULL,
                        improvement_suggestions TEXT NULL,
                        was_helpful BOOLEAN NULL,
                        would_recommend BOOLEAN NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
                        FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
                        INDEX idx_conversation_feedback_conversation (conversation_id),
                        INDEX idx_conversation_feedback_patient (patient_id),
                        INDEX idx_conversation_feedback_rating (overall_rating),
                        INDEX idx_conversation_feedback_created (created_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                connection.commit()
                print("✅ Таблица ai_conversation_feedback создана")
            else:
                print("⚠️ Таблица ai_conversation_feedback уже существует")
            
            # 9. Создаем таблицу ai_conversation_training
            if 'ai_conversation_training' not in existing_tables:
                print("🎓 Создаем таблицу ai_conversation_training...")
                connection.execute(text("""
                    CREATE TABLE ai_conversation_training (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        conversation_id INT NOT NULL,
                        training_data JSON NOT NULL,
                        correct_responses JSON NULL,
                        incorrect_responses JSON NULL,
                        is_processed BOOLEAN DEFAULT FALSE,
                        is_validated BOOLEAN DEFAULT FALSE,
                        quality_score FLOAT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE,
                        INDEX idx_conversation_training_conversation (conversation_id),
                        INDEX idx_conversation_training_processed (is_processed),
                        INDEX idx_conversation_training_validated (is_validated),
                        INDEX idx_conversation_training_created (created_at)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                """))
                connection.commit()
                print("✅ Таблица ai_conversation_training создана")
            else:
                print("⚠️ Таблица ai_conversation_training уже существует")
            
            print("\n🎉 Миграция AI системы успешно завершена!")
            print("\n📊 Созданные таблицы:")
            print("1. ai_diagnoses - результаты AI диагностики")
            print("2. ai_training_data - данные для обучения модели")
            print("3. ai_models - информация о AI моделях")
            print("4. ai_model_training - история обучения моделей")
            print("5. ai_feedback - обратная связь по диагностике")
            print("6. ai_conversations - сессии разговора с AI врачом")
            print("7. ai_conversation_messages - сообщения в разговоре")
            print("8. ai_conversation_feedback - обратная связь по разговорам")
            print("9. ai_conversation_training - данные для обучения")
            print("\n🔧 Все необходимые индексы и внешние ключи созданы")
            print("💾 База данных готова для работы с AI системой!")
            
    except Exception as e:
        print(f"❌ Ошибка при выполнении миграции: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("=" * 60)
    print("🤖 МИГРАЦИЯ AI СИСТЕМЫ МЕДИЦИНСКОЙ ДИАГНОСТИКИ")
    print("=" * 60)
    print("Создание таблиц для работы с нейросетью\n")
    
    success = run_migration()
    
    if success:
        print("\n✅ Миграция AI системы завершена успешно!")
        print("🚀 Теперь можете запустить AI систему:")
        print("   python ai_system/setup_and_train.py")
        print("   python start_ai.py")
    else:
        print("\n❌ Миграция завершилась с ошибками!")
        print("📋 Проверьте подключение к базе данных и права пользователя")
        sys.exit(1) 