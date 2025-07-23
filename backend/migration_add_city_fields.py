#!/usr/bin/env python3
"""
Миграция для добавления полей города в таблицы пациентов и pending_users
"""

import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def run_migration():
    """Выполняет миграцию базы данных"""
    
    # Настройки подключения к базе данных
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 3306)),
        'user': os.getenv('DB_USER', 'vrachi_user'),
        'password': os.getenv('DB_PASSWORD', '1435511926Ss..'),
        'database': os.getenv('DB_NAME', 'online_doctors_db'),
        'charset': 'utf8mb4',
        'collation': 'utf8mb4_unicode_ci'
    }
    
    connection = None
    cursor = None
    
    try:
        print("🏥 Подключение к базе данных...")
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()
        
        print("✅ Подключение установлено")
        
        # Начинаем транзакцию
        connection.start_transaction()
        
        # Проверяем, существуют ли уже поля
        print("\n🔍 Проверка существующих полей...")
        
        # Проверяем поле city в patient_profiles
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'patient_profiles' 
            AND COLUMN_NAME = 'city'
        """, (db_config['database'],))
        
        city_exists = cursor.fetchone() is not None
        
        # Проверяем поле country в patient_profiles
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'patient_profiles' 
            AND COLUMN_NAME = 'country'
        """, (db_config['database'],))
        
        country_exists = cursor.fetchone() is not None
        
        # Проверяем поле city в pending_users
        cursor.execute("""
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = %s 
            AND TABLE_NAME = 'pending_users' 
            AND COLUMN_NAME = 'city'
        """, (db_config['database'],))
        
        pending_city_exists = cursor.fetchone() is not None
        
        # Добавляем поля в patient_profiles если их нет
        if not city_exists:
            print("📝 Добавление поля 'city' в таблицу patient_profiles...")
            cursor.execute("""
                ALTER TABLE patient_profiles 
                ADD COLUMN city VARCHAR(255) NULL 
                COMMENT 'Город/область/республика пациента'
                AFTER contact_address
            """)
            print("✅ Поле 'city' добавлено в patient_profiles")
        else:
            print("ℹ️  Поле 'city' уже существует в patient_profiles")
        
        if not country_exists:
            print("📝 Добавление поля 'country' в таблицу patient_profiles...")
            cursor.execute("""
                ALTER TABLE patient_profiles 
                ADD COLUMN country VARCHAR(255) NULL DEFAULT 'Узбекистан'
                COMMENT 'Страна пациента'
                AFTER district
            """)
            print("✅ Поле 'country' добавлено в patient_profiles")
        else:
            print("ℹ️  Поле 'country' уже существует в patient_profiles")
        
        # Добавляем поле в pending_users если его нет
        if not pending_city_exists:
            print("📝 Добавление поля 'city' в таблицу pending_users...")
            cursor.execute("""
                ALTER TABLE pending_users 
                ADD COLUMN city VARCHAR(255) NULL 
                COMMENT 'Город/область/республика пользователя'
                AFTER contact_phone
            """)
            print("✅ Поле 'city' добавлено в pending_users")
        else:
            print("ℹ️  Поле 'city' уже существует в pending_users")
        
        # Создаем индексы для быстрого поиска по городу
        print("\n🔗 Создание индексов...")
        
        # Индекс для поиска пациентов по городу
        try:
            cursor.execute("""
                CREATE INDEX idx_patient_profiles_city 
                ON patient_profiles(city)
            """)
            print("✅ Индекс для city в patient_profiles создан")
        except mysql.connector.Error as e:
            if e.errno == 1061:  # Duplicate key name
                print("ℹ️  Индекс для city в patient_profiles уже существует")
            else:
                raise
        
        # Индекс для поиска пациентов по стране
        try:
            cursor.execute("""
                CREATE INDEX idx_patient_profiles_country 
                ON patient_profiles(country)
            """)
            print("✅ Индекс для country в patient_profiles создан")
        except mysql.connector.Error as e:
            if e.errno == 1061:  # Duplicate key name
                print("ℹ️  Индекс для country в patient_profiles уже существует")
            else:
                raise
        
        # Обновляем существующие записи - устанавливаем страну по умолчанию
        print("\n🔄 Обновление существующих записей...")
        
        # Устанавливаем страну "Узбекистан" для всех записей где она NULL
        cursor.execute("""
            UPDATE patient_profiles 
            SET country = 'Узбекистан' 
            WHERE country IS NULL
        """)
        
        updated_rows = cursor.rowcount
        if updated_rows > 0:
            print(f"✅ Обновлено {updated_rows} записей в patient_profiles (установлена страна 'Узбекистан')")
        else:
            print("ℹ️  Записи для обновления не найдены")
        
        # Фиксируем изменения
        connection.commit()
        print("\n🎉 Миграция успешно завершена!")
        
    except Error as e:
        print(f"\n❌ Ошибка при выполнении миграции: {e}")
        if connection:
            connection.rollback()
            print("🔄 Изменения отменены")
        return False
        
    except Exception as e:
        print(f"\n❌ Неожиданная ошибка: {e}")
        if connection:
            connection.rollback()
            print("🔄 Изменения отменены")
        return False
        
    finally:
        # Закрываем соединение
        if cursor:
            cursor.close()
        if connection:
            connection.close()
            print("🔌 Соединение с базой данных закрыто")
    
    return True

def rollback_migration():
    """Откатывает миграцию (удаляет добавленные поля)"""
    
    # Настройки подключения к базе данных
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': int(os.getenv('DB_PORT', 3306)),
        'user': os.getenv('DB_USER', 'vrachi_user'),
        'password': os.getenv('DB_PASSWORD', '1435511926Ss..'),
        'database': os.getenv('DB_NAME', 'online_doctors_db'),
        'charset': 'utf8mb4',
        'collation': 'utf8mb4_unicode_ci'
    }
    
    connection = None
    cursor = None
    
    try:
        print("🏥 Подключение к базе данных для отката...")
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()
        
        print("✅ Подключение установлено")
        
        # Начинаем транзакцию
        connection.start_transaction()
        
        # Удаляем индексы
        print("🗑️  Удаление индексов...")
        
        try:
            cursor.execute("DROP INDEX idx_patient_profiles_city ON patient_profiles")
            print("✅ Индекс idx_patient_profiles_city удален")
        except mysql.connector.Error:
            print("ℹ️  Индекс idx_patient_profiles_city не существует")
        
        try:
            cursor.execute("DROP INDEX idx_patient_profiles_country ON patient_profiles")
            print("✅ Индекс idx_patient_profiles_country удален")
        except mysql.connector.Error:
            print("ℹ️  Индекс idx_patient_profiles_country не существует")
        
        # Удаляем поля
        print("🗑️  Удаление полей...")
        
        try:
            cursor.execute("ALTER TABLE patient_profiles DROP COLUMN city")
            print("✅ Поле 'city' удалено из patient_profiles")
        except mysql.connector.Error:
            print("ℹ️  Поле 'city' не существует в patient_profiles")
        
        try:
            cursor.execute("ALTER TABLE patient_profiles DROP COLUMN country")
            print("✅ Поле 'country' удалено из patient_profiles")
        except mysql.connector.Error:
            print("ℹ️  Поле 'country' не существует в patient_profiles")
        
        try:
            cursor.execute("ALTER TABLE pending_users DROP COLUMN city")
            print("✅ Поле 'city' удалено из pending_users")
        except mysql.connector.Error:
            print("ℹ️  Поле 'city' не существует в pending_users")
        
        # Фиксируем изменения
        connection.commit()
        print("\n🎉 Откат миграции успешно завершен!")
        
    except Error as e:
        print(f"\n❌ Ошибка при откате миграции: {e}")
        if connection:
            connection.rollback()
            print("🔄 Изменения отменены")
        return False
        
    finally:
        # Закрываем соединение
        if cursor:
            cursor.close()
        if connection:
            connection.close()
            print("🔌 Соединение с базой данных закрыто")
    
    return True

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--rollback":
        print("🔄 Запуск отката миграции...")
        success = rollback_migration()
    else:
        print("🚀 Запуск миграции для добавления полей города...")
        success = run_migration()
    
    if success:
        print("\n✨ Операция завершена успешно!")
        sys.exit(0)
    else:
        print("\n💥 Операция завершена с ошибкой!")
        sys.exit(1) 