#!/usr/bin/env python3
"""
Скрипт для инициализации базы данных MySQL для проекта vrachiAPP.
Создает базу данных, пользователя MySQL и предоставляет необходимые права доступа.
"""

import os
import sys
import pymysql
import getpass
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла, если он существует
load_dotenv()

# Используем значения по умолчанию, если не указаны в .env
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_NAME = os.getenv("DB_NAME", "online_doctors_db")
DB_USER = os.getenv("DB_USER", "vrachi_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")  # Пароль запросим у пользователя

# Если пароль не задан через переменную окружения, запрашиваем его интерактивно
if not DB_PASSWORD:
    DB_PASSWORD = getpass.getpass(f"Введите пароль для пользователя MySQL {DB_USER}: ")

# Опции подключения к MySQL
print("Доступные способы подключения к MySQL:")
print("1. Подключиться как администратор MySQL (требуются права администратора)")
print("2. Подключиться через существующего пользователя (если база данных уже создана)")
print("3. Только сгенерировать строку подключения (без создания базы данных)")

choice = input("Выберите вариант (1-3): ")

try:
    if choice == "1":
        # Подключение с правами администратора
        ROOT_USERNAME = input("Введите имя пользователя MySQL с правами администратора (обычно 'root'): ")
        ROOT_PASSWORD = getpass.getpass("Введите пароль администратора MySQL: ")
        
        try:
            # Подключаемся к MySQL серверу
            conn = pymysql.connect(
                host=DB_HOST,
                port=DB_PORT,
                user=ROOT_USERNAME,
                password=ROOT_PASSWORD
            )
            
            with conn.cursor() as cursor:
                print(f"Подключение к MySQL серверу успешно установлено.")
                
                # Создаем базу данных, если она не существует
                cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
                print(f"База данных '{DB_NAME}' успешно создана или уже существует.")
                
                # Проверяем, существует ли пользователь
                cursor.execute(f"SELECT COUNT(*) FROM mysql.user WHERE user = '{DB_USER}' AND host = '%';")
                user_exists = cursor.fetchone()[0] > 0
                
                if not user_exists:
                    # Создаем пользователя для приложения
                    cursor.execute(f"CREATE USER '{DB_USER}'@'%' IDENTIFIED BY '{DB_PASSWORD}';")
                    print(f"Пользователь '{DB_USER}' успешно создан.")
                else:
                    print(f"Пользователь '{DB_USER}' уже существует.")
                    # Обновляем пароль пользователя
                    cursor.execute(f"ALTER USER '{DB_USER}'@'%' IDENTIFIED BY '{DB_PASSWORD}';")
                    print(f"Пароль для пользователя '{DB_USER}' обновлен.")
                
                # Предоставляем все права на базу данных пользователю
                cursor.execute(f"GRANT ALL PRIVILEGES ON {DB_NAME}.* TO '{DB_USER}'@'%';")
                cursor.execute("FLUSH PRIVILEGES;")
                print(f"Права доступа для пользователя '{DB_USER}' к базе данных '{DB_NAME}' предоставлены.")
            
            # Закрываем соединение с MySQL
            conn.close()
            
        except pymysql.MySQLError as e:
            print(f"Ошибка при работе с MySQL: {e}")
            
            # Дополнительная диагностика
            print("\nДиагностика ошибки:")
            if "Access denied" in str(e):
                print("- Проблема с доступом. Возможные причины:")
                print("  1. Неправильное имя пользователя или пароль")
                print("  2. Пользователь не имеет прав подключения с этого хоста")
                print("  3. MySQL настроен на использование auth_socket вместо пароля для root")
                print("\nРекомендации:")
                print("- Попробуйте вариант 2 - подключение через существующего пользователя")
                print("- Или используйте команду mysql в терминале:")
                print("  mysql -u root -p")
                print("  CREATE DATABASE IF NOT EXISTS online_doctors_db;")
                print(f"  CREATE USER '{DB_USER}'@'%' IDENTIFIED BY 'your_password';")
                print(f"  GRANT ALL PRIVILEGES ON {DB_NAME}.* TO '{DB_USER}'@'%';")
                print("  FLUSH PRIVILEGES;")
            
    elif choice == "2":
        # Подключение через существующего пользователя
        EXISTING_USER = input("Введите имя существующего пользователя MySQL: ")
        EXISTING_PASSWORD = getpass.getpass(f"Введите пароль для пользователя {EXISTING_USER}: ")
        
        try:
            # Подключаемся к MySQL серверу
            conn = pymysql.connect(
                host=DB_HOST,
                port=DB_PORT,
                user=EXISTING_USER,
                password=EXISTING_PASSWORD
            )
            
            with conn.cursor() as cursor:
                print(f"Подключение к MySQL серверу успешно установлено.")
                
                # Проверяем, можем ли мы создать базу данных
                try:
                    cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
                    print(f"База данных '{DB_NAME}' успешно создана или уже существует.")
                    
                    # Проверяем, имеет ли пользователь права на создание других пользователей
                    try:
                        # Проверяем, существует ли пользователь vrachi_user
                        cursor.execute(f"SELECT COUNT(*) FROM mysql.user WHERE user = '{DB_USER}' AND host = '%';")
                        user_exists = cursor.fetchone()[0] > 0
                        
                        if not user_exists and EXISTING_USER != DB_USER:
                            # Создаем пользователя для приложения, если он не существует и не совпадает с текущим
                            cursor.execute(f"CREATE USER '{DB_USER}'@'%' IDENTIFIED BY '{DB_PASSWORD}';")
                            print(f"Пользователь '{DB_USER}' успешно создан.")
                        elif EXISTING_USER != DB_USER:
                            print(f"Пользователь '{DB_USER}' уже существует.")
                            # Обновляем пароль пользователя
                            cursor.execute(f"ALTER USER '{DB_USER}'@'%' IDENTIFIED BY '{DB_PASSWORD}';")
                            print(f"Пароль для пользователя '{DB_USER}' обновлен.")
                        else:
                            print(f"Вы подключены как '{DB_USER}', пароль не требует обновления.")
                        
                        # Предоставляем права, если текущий пользователь != vrachi_user
                        if EXISTING_USER != DB_USER:
                            cursor.execute(f"GRANT ALL PRIVILEGES ON {DB_NAME}.* TO '{DB_USER}'@'%';")
                            cursor.execute("FLUSH PRIVILEGES;")
                            print(f"Права доступа для пользователя '{DB_USER}' к базе данных '{DB_NAME}' предоставлены.")
                    except pymysql.MySQLError as e:
                        print(f"Нет прав на управление пользователями: {e}")
                        print("Используем текущего пользователя для подключения к базе данных.")
                        DB_USER = EXISTING_USER
                        DB_PASSWORD = EXISTING_PASSWORD
                except pymysql.MySQLError as e:
                    print(f"Нет прав на создание базы данных: {e}")
                    # Проверяем, существует ли база данных
                    try:
                        cursor.execute(f"USE {DB_NAME};")
                        print(f"База данных '{DB_NAME}' уже существует и доступна.")
                    except pymysql.MySQLError:
                        print(f"База данных '{DB_NAME}' не существует или недоступна.")
                        sys.exit(1)
            
            # Закрываем соединение с MySQL
            conn.close()
            
        except pymysql.MySQLError as e:
            print(f"Ошибка при работе с MySQL: {e}")
            sys.exit(1)
    
    elif choice == "3":
        print("Генерация строки подключения без изменения базы данных...")
    else:
        print("Неверный выбор. Выход.")
        sys.exit(1)
    
    # Формируем строку подключения для .env файла
    connection_string = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    # Проверяем наличие .env файла
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
    env_exists = os.path.exists(env_path)
    
    if env_exists:
        # Читаем содержимое .env файла
        with open(env_path, 'r') as f:
            env_content = f.read()
        
        # Проверяем наличие DATABASE_URL в .env файле
        if 'DATABASE_URL=' in env_content:
            print(f"\n.env файл уже содержит DATABASE_URL. Если вы хотите обновить его, отредактируйте файл вручную.")
            print(f"Новая строка подключения: DATABASE_URL={connection_string}")
        else:
            # Добавляем строку подключения в .env файл
            with open(env_path, 'a') as f:
                f.write(f"\n# Строка подключения к базе данных MySQL\nDATABASE_URL={connection_string}\n")
            print(f"\nСтрока подключения добавлена в файл .env")
    else:
        # Создаем новый .env файл
        with open(env_path, 'w') as f:
            f.write(f"# Строка подключения к базе данных MySQL\nDATABASE_URL={connection_string}\n")
        print(f"\nСоздан новый файл .env со строкой подключения к базе данных")
    
    print("\nИнициализация базы данных успешно завершена!")
    print("\nТеперь вы можете запустить миграцию базы данных с помощью команды:")
    print("cd backend && alembic upgrade head")
    
    # Показываем строку подключения в консоли
    print(f"\nСтрока подключения к базе данных (сохраните ее):")
    print(f"DATABASE_URL={connection_string}")
    
except Exception as e:
    print(f"Непредвиденная ошибка: {e}")
    sys.exit(1) 