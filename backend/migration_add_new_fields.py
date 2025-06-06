#!/usr/bin/env python3
"""
Скрипт миграции для добавления новых полей в таблицу doctor_profiles
- work_experience (JSON)
- city (VARCHAR)
- country (VARCHAR)
- languages (JSON)

Запуск: python migration_add_new_fields.py
"""

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
    """Выполняет миграцию базы данных"""
    try:
        print("Подключение к базе данных...")
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            print("Начинаем миграцию...")
            
            # Проверяем, существуют ли уже новые поля
            result = connection.execute(text("""
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'doctor_profiles' 
                AND COLUMN_NAME IN ('work_experience', 'city', 'country', 'languages')
            """))
            existing_columns = [row[0] for row in result.fetchall()]
            
            # Добавляем новые поля если их нет
            if 'work_experience' not in existing_columns:
                print("Добавляем поле work_experience...")
                connection.execute(text("""
                    ALTER TABLE doctor_profiles 
                    ADD COLUMN work_experience JSON DEFAULT NULL 
                    COMMENT 'Опыт работы врача в формате JSON'
                """))
                connection.commit()
                print("✓ Поле work_experience добавлено")
            else:
                print("Поле work_experience уже существует")
            
            if 'city' not in existing_columns:
                print("Добавляем поле city...")
                connection.execute(text("""
                    ALTER TABLE doctor_profiles 
                    ADD COLUMN city VARCHAR(255) DEFAULT NULL 
                    COMMENT 'Город, где работает врач'
                """))
                connection.commit()
                print("✓ Поле city добавлено")
            else:
                print("Поле city уже существует")
            
            if 'country' not in existing_columns:
                print("Добавляем поле country...")
                connection.execute(text("""
                    ALTER TABLE doctor_profiles 
                    ADD COLUMN country VARCHAR(255) DEFAULT 'Узбекистан' 
                    COMMENT 'Страна, где работает врач'
                """))
                connection.commit()
                print("✓ Поле country добавлено")
            else:
                print("Поле country уже существует")
            
            if 'languages' not in existing_columns:
                print("Добавляем поле languages...")
                connection.execute(text("""
                    ALTER TABLE doctor_profiles 
                    ADD COLUMN languages JSON DEFAULT NULL 
                    COMMENT 'Языки, на которых говорит врач, в формате JSON'
                """))
                connection.commit()
                print("✓ Поле languages добавлено")
            else:
                print("Поле languages уже существует")
            
            # Создаем индексы для лучшей производительности поиска
            print("Создаем индексы...")
            try:
                connection.execute(text("""
                    CREATE INDEX idx_doctor_city ON doctor_profiles (city)
                """))
                connection.commit()
                print("✓ Индекс для city создан")
            except OperationalError as e:
                if "Duplicate key name" in str(e):
                    print("Индекс для city уже существует")
                else:
                    print(f"Ошибка создания индекса для city: {e}")
            
            try:
                connection.execute(text("""
                    CREATE INDEX idx_doctor_country ON doctor_profiles (country)
                """))
                connection.commit()
                print("✓ Индекс для country создан")
            except OperationalError as e:
                if "Duplicate key name" in str(e):
                    print("Индекс для country уже существует")
                else:
                    print(f"Ошибка создания индекса для country: {e}")
            
            print("\n🎉 Миграция успешно завершена!")
            print("\nДобавленные поля:")
            print("- work_experience: JSON массив с опытом работы")
            print("- city: Город врача (VARCHAR 255)")
            print("- country: Страна врача (VARCHAR 255, по умолчанию 'Узбекистан')")
            print("- languages: JSON массив языков врача")
            print("\nИндексы созданы для полей city и country для оптимизации поиска.")
            
    except Exception as e:
        print(f"❌ Ошибка при выполнении миграции: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("=== Миграция базы данных Soglom ===")
    print("Добавление новых полей в таблицу doctor_profiles\n")
    
    success = run_migration()
    
    if success:
        print("\n✅ Миграция завершена успешно!")
        print("Теперь вы можете перезапустить backend приложение.")
    else:
        print("\n❌ Миграция завершилась с ошибками!")
        sys.exit(1) 