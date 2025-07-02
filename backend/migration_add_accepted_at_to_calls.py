#!/usr/bin/env python3
"""
Миграция для добавления поля accepted_at в таблицу calls
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# URL для подключения к базе данных
DATABASE_URL = "mysql+pymysql://vrachi_user:1435511926Ss..@localhost:3306/online_doctors_db"

def run_migration():
    """Выполняет миграцию для добавления поля accepted_at"""
    
    engine = create_engine(DATABASE_URL, echo=True)
    
    try:
        with engine.connect() as connection:
            # Проверяем, существует ли уже поле accepted_at
            check_column_sql = """
            SELECT COUNT(*) as count
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'online_doctors_db' 
            AND TABLE_NAME = 'calls' 
            AND COLUMN_NAME = 'accepted_at'
            """
            
            result = connection.execute(text(check_column_sql))
            row = result.fetchone()
            
            if row[0] > 0:
                print("✅ Поле 'accepted_at' уже существует в таблице 'calls'")
                return True
            
            # Добавляем поле accepted_at
            print("➕ Добавляем поле 'accepted_at' в таблицу 'calls'...")
            
            add_column_sql = """
            ALTER TABLE calls 
            ADD COLUMN accepted_at DATETIME NULL 
            AFTER started_at
            """
            
            connection.execute(text(add_column_sql))
            connection.commit()
            
            print("✅ Поле 'accepted_at' успешно добавлено в таблицу 'calls'")
            
            # Проверяем, что поле добавлено
            result = connection.execute(text(check_column_sql))
            row = result.fetchone()
            
            if row[0] > 0:
                print("✅ Миграция выполнена успешно!")
                return True
            else:
                print("❌ Ошибка: поле не было добавлено")
                return False
                
    except Exception as e:
        print(f"❌ Ошибка при выполнении миграции: {e}")
        return False

if __name__ == "__main__":
    print("🔄 Запуск миграции для добавления поля accepted_at в таблицу calls...")
    success = run_migration()
    
    if success:
        print("🎉 Миграция завершена успешно!")
        sys.exit(0)
    else:
        print("💥 Миграция не выполнена!")
        sys.exit(1)