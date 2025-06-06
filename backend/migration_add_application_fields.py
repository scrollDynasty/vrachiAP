#!/usr/bin/env python3
"""
Миграция для добавления полей city, district и languages в таблицу doctor_applications
"""

import os
import sys
from sqlalchemy import create_engine, text, MetaData, inspect
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Получаем URL базы данных
DATABASE_URL = os.getenv(
    "DATABASE_URL", "mysql+pymysql://vrachi_user:1435511926Ss..@localhost:3306/online_doctors_db"
)

def run_migration():
    """Запускаем миграцию"""
    print("🔄 Начинаем миграцию для добавления полей в doctor_applications...")
    
    try:
        # Создаем подключение к базе данных
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            # Проверяем существование таблицы
            inspector = inspect(engine)
            if 'doctor_applications' not in inspector.get_table_names():
                print("❌ Таблица doctor_applications не найдена")
                return False
            
            # Получаем существующие колонки
            existing_columns = [col['name'] for col in inspector.get_columns('doctor_applications')]
            print(f"📋 Существующие колонки: {existing_columns}")
            
            # Добавляем поле city если его нет
            if 'city' not in existing_columns:
                print("➕ Добавляем поле city...")
                connection.execute(text("""
                    ALTER TABLE doctor_applications 
                    ADD COLUMN city VARCHAR(255) NULL 
                    COMMENT 'Город/регион работы врача'
                """))
                print("✅ Поле city добавлено")
            else:
                print("ℹ️ Поле city уже существует")
            
            # Добавляем поле district если его нет
            if 'district' not in existing_columns:
                print("➕ Добавляем поле district...")
                connection.execute(text("""
                    ALTER TABLE doctor_applications 
                    ADD COLUMN district VARCHAR(255) NULL 
                    COMMENT 'Район работы врача'
                """))
                print("✅ Поле district добавлено")
            else:
                print("ℹ️ Поле district уже существует")
            
            # Добавляем поле languages если его нет
            if 'languages' not in existing_columns:
                print("➕ Добавляем поле languages...")
                connection.execute(text("""
                    ALTER TABLE doctor_applications 
                    ADD COLUMN languages JSON NULL 
                    COMMENT 'Языки консультаций (JSON массив)'
                """))
                print("✅ Поле languages добавлено")
            else:
                print("ℹ️ Поле languages уже существует")
            
            # Коммитим изменения
            connection.commit()
            
            print("🎉 Миграция успешно завершена!")
            return True
            
    except Exception as e:
        print(f"❌ Ошибка при выполнении миграции: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1) 