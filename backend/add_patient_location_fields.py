#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Миграция для добавления полей местоположения в таблицу patient_profiles
Добавляет колонки: city, district, country
"""

import pymysql
import sys
from dotenv import load_dotenv
import os

# Загружаем переменные окружения
load_dotenv()

def get_db_connection():
    """Получить соединение с базой данных"""
    try:
        # Попробуем извлечь параметры из DATABASE_URL
        database_url = os.getenv("DATABASE_URL")
        if database_url and "mysql+pymysql://" in database_url:
            # Парсим DATABASE_URL вида mysql+pymysql://user:password@host:port/database
            url_parts = database_url.replace("mysql+pymysql://", "").split("@")
            if len(url_parts) == 2:
                auth_part = url_parts[0]
                host_db_part = url_parts[1]
                
                if ":" in auth_part:
                    user, password = auth_part.split(":", 1)
                else:
                    user = auth_part
                    password = ""
                
                if "/" in host_db_part:
                    host_port, database = host_db_part.split("/", 1)
                    if ":" in host_port:
                        host, port = host_port.split(":", 1)
                        port = int(port)
                    else:
                        host = host_port
                        port = 3306
                else:
                    host = host_db_part
                    port = 3306
                    database = "healzy_db"
            else:
                raise ValueError("Неверный формат DATABASE_URL")
        else:
            # Используем отдельные переменные окружения или значения по умолчанию
            host = os.getenv("DB_HOST", "localhost")
            port = int(os.getenv("DB_PORT", "3306"))
            user = os.getenv("DB_USER", "healzy_user")
            password = os.getenv("DB_PASSWORD", "healzy_password_123")
            database = os.getenv("DB_NAME", "healzy_db")

        print(f"Подключение к базе данных: {host}:{port}, database: {database}, user: {user}")
        
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=database,
            charset='utf8mb4'
        )
        return connection
    except Exception as e:
        print(f"Ошибка подключения к базе данных: {e}")
        sys.exit(1)

def check_column_exists(cursor, table_name, column_name):
    """Проверить существует ли колонка в таблице"""
    cursor.execute(f"""
        SELECT COUNT(*) 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = '{table_name}' 
        AND COLUMN_NAME = '{column_name}'
    """)
    return cursor.fetchone()[0] > 0

def add_patient_location_fields():
    """Добавить поля местоположения в таблицу patient_profiles"""
    connection = get_db_connection()
    
    try:
        with connection.cursor() as cursor:
            print("Проверяем существующие колонки в таблице patient_profiles...")
            
            # Проверяем существование таблицы
            cursor.execute("SHOW TABLES LIKE 'patient_profiles'")
            if cursor.fetchone() is None:
                print("Таблица patient_profiles не найдена!")
                return False
            
            # Проверяем и добавляем колонку city
            if not check_column_exists(cursor, 'patient_profiles', 'city'):
                print("Добавляем колонку 'city'...")
                cursor.execute("""
                    ALTER TABLE patient_profiles 
                    ADD COLUMN city VARCHAR(255) DEFAULT NULL 
                    COMMENT 'Город/область/республика пациента'
                """)
                print("✓ Колонка 'city' добавлена")
            else:
                print("✓ Колонка 'city' уже существует")
            
            # Проверяем и добавляем колонку country
            if not check_column_exists(cursor, 'patient_profiles', 'country'):
                print("Добавляем колонку 'country'...")
                cursor.execute("""
                    ALTER TABLE patient_profiles 
                    ADD COLUMN country VARCHAR(255) DEFAULT 'Узбекистан' 
                    COMMENT 'Страна пациента'
                """)
                print("✓ Колонка 'country' добавлена")
            else:
                print("✓ Колонка 'country' уже существует")
            
            # Проверяем существование колонки district (должна уже быть)
            if not check_column_exists(cursor, 'patient_profiles', 'district'):
                print("Добавляем колонку 'district'...")
                cursor.execute("""
                    ALTER TABLE patient_profiles 
                    ADD COLUMN district VARCHAR(255) DEFAULT NULL 
                    COMMENT 'Район пациента'
                """)
                print("✓ Колонка 'district' добавлена")
            else:
                print("✓ Колонка 'district' уже существует")
            
            # Подтверждаем изменения
            connection.commit()
            print("\n✅ Миграция успешно выполнена!")
            
            # Показываем текущую структуру таблицы
            print("\nТекущая структура таблицы patient_profiles:")
            cursor.execute("DESCRIBE patient_profiles")
            for row in cursor.fetchall():
                print(f"  {row[0]:20} | {row[1]:30} | {row[2]:5} | {row[3]:5}")
            
            return True
            
    except Exception as e:
        print(f"Ошибка при выполнении миграции: {e}")
        connection.rollback()
        return False
    finally:
        connection.close()

if __name__ == "__main__":
    print("=== Миграция для добавления полей местоположения в patient_profiles ===\n")
    
    success = add_patient_location_fields()
    
    if success:
        print("\n🎉 Миграция завершена успешно!")
        print("Теперь можно перезапустить backend: pm2 restart healzy-backend")
    else:
        print("\n❌ Миграция не удалась!")
        sys.exit(1) 