# backend/migration_add_calls_table.py
import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# URL для подключения к базе данных
DATABASE_URL = "mysql+pymysql://vrachi_user:1435511926Ss..@localhost:3306/online_doctors_db"

def create_calls_table():
    """Создание таблицы calls для хранения информации о звонках"""
    
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        # Проверяем, существует ли таблица
        result = connection.execute(text("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_schema = 'online_doctors_db' 
            AND table_name = 'calls'
        """))
        
        if result.scalar() > 0:
            print("Таблица 'calls' уже существует")
            return
        
        # Создаем таблицу calls
        connection.execute(text("""
            CREATE TABLE calls (
                id INT AUTO_INCREMENT PRIMARY KEY,
                consultation_id INT NOT NULL,
                caller_id INT NOT NULL,
                receiver_id INT NOT NULL,
                call_type VARCHAR(20) NOT NULL,
                status VARCHAR(20) DEFAULT 'initiated',
                started_at DATETIME NULL,
                ended_at DATETIME NULL,
                duration INT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (consultation_id) REFERENCES consultations(id) ON DELETE CASCADE,
                FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_consultation_status (consultation_id, status),
                INDEX idx_caller_receiver (caller_id, receiver_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """))
        
        connection.commit()
        print("Таблица 'calls' успешно создана")

if __name__ == "__main__":
    try:
        create_calls_table()
        print("Миграция завершена успешно")
    except Exception as e:
        print(f"Ошибка при выполнении миграции: {e}")
        sys.exit(1) 