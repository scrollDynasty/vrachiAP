#!/usr/bin/env python3
"""
Скрипт для проверки подключения к MySQL базе данных для vrachiAPP.
Проверяет:
1. Наличие корректного подключения к MySQL
2. Состояние таблиц в базе данных
3. Отображает информацию о пользователях (без паролей)
"""

import os
import sys
import pymysql
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError

# Загружаем переменные окружения из .env файла, если он существует
load_dotenv()

# Получаем строку подключения из переменной окружения
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Ошибка: Переменная DATABASE_URL не найдена.")
    print("Создайте файл .env с содержимым DATABASE_URL=mysql+pymysql://vrachi_user:password@localhost:3306/online_doctors_db")
    sys.exit(1)

try:
    # Создаем движок SQLAlchemy для подключения к базе данных
    engine = create_engine(DATABASE_URL)
    
    # Пробуем подключиться к базе данных
    with engine.connect() as connection:
        print("✅ Подключение к базе данных успешно установлено!")
        
        # Проверяем наличие таблиц
        result = connection.execute(text("SHOW TABLES"))
        tables = [row[0] for row in result]
        
        if not tables:
            print("⚠️ База данных пуста. Нет ни одной таблицы.")
            print("Выполните миграции командой: alembic upgrade head")
            sys.exit(0)
        
        print(f"\n🗃️ Найдено {len(tables)} таблиц:")
        for table in tables:
            print(f"  - {table}")
        
        # Проверяем наличие пользователей
        if 'users' in tables:
            # Проверяем структуру таблицы users
            result = connection.execute(text("DESCRIBE users"))
            columns = [row[0] for row in result]
            expected_columns = ['id', 'email', 'hashed_password', 'role', 'is_active']
            
            missing_columns = [col for col in expected_columns if col not in columns]
            if missing_columns:
                print(f"\n⚠️ В таблице users отсутствуют ожидаемые колонки: {', '.join(missing_columns)}")
            else:
                # Подсчитываем пользователей по ролям
                result = connection.execute(text("SELECT role, COUNT(*) FROM users GROUP BY role"))
                roles_count = {row[0]: row[1] for row in result}
                
                print("\n👥 Статистика пользователей:")
                total_users = sum(roles_count.values())
                print(f"  - Всего пользователей: {total_users}")
                
                for role, count in roles_count.items():
                    print(f"  - {role}: {count}")
                
                # Выводим первых 5 пользователей (без паролей)
                if total_users > 0:
                    result = connection.execute(text("SELECT id, email, role, is_active FROM users LIMIT 5"))
                    users = [row for row in result]
                    
                    print("\n📋 Первые 5 пользователей:")
                    for user in users:
                        status = "✅ активен" if user[3] else "❌ не активен"
                        print(f"  - ID: {user[0]}, Email: {user[1]}, Роль: {user[2]}, Статус: {status}")
        
        # Проверяем наличие WebSocket токенов
        if 'ws_tokens' in tables:
            # Подсчитываем активные токены
            result = connection.execute(text("SELECT COUNT(*) FROM ws_tokens WHERE expires_at > NOW()"))
            active_tokens_count = result.fetchone()[0]
            
            print(f"\n🔑 Активных WebSocket токенов: {active_tokens_count}")
        
        # Проверяем наличие сообщений чата
        if 'messages' in tables:
            # Подсчитываем общее количество сообщений
            result = connection.execute(text("SELECT COUNT(*) FROM messages"))
            messages_count = result.fetchone()[0]
            
            print(f"\n💬 Всего сообщений в чатах: {messages_count}")
            
            if messages_count > 0:
                # Подсчитываем непрочитанные сообщения
                result = connection.execute(text("SELECT COUNT(*) FROM messages WHERE is_read = 0"))
                unread_messages_count = result.fetchone()[0]
                
                print(f"  - Непрочитанных сообщений: {unread_messages_count}")
        
        print("\n✨ Проверка базы данных успешно завершена!")

except SQLAlchemyError as e:
    print(f"❌ Ошибка SQLAlchemy при подключении к базе данных: {e}")
    
    # Проверяем, является ли это ошибкой подключения
    if "Can't connect to MySQL server" in str(e):
        print("\nВозможные причины:")
        print("1. Сервер MySQL не запущен")
        print("2. Неверно указан хост или порт в строке подключения")
        print("\nРекомендации:")
        print("- Проверьте, запущен ли сервер MySQL")
        print("- Убедитесь, что строка подключения в .env файле корректна")
    
    # Проверяем, является ли это ошибкой аутентификации
    elif "Access denied" in str(e):
        print("\nВозможные причины:")
        print("1. Неверный пароль пользователя")
        print("2. Пользователь не существует")
        print("3. У пользователя недостаточно прав")
        print("\nРекомендации:")
        print("- Проверьте имя пользователя и пароль в строке подключения")
        print("- Создайте пользователя, выполнив скрипт init_mysql_db.py")
    
    # Проверяем, является ли это ошибкой отсутствия базы данных
    elif "Unknown database" in str(e):
        print("\nВозможные причины:")
        print("1. База данных не существует")
        print("\nРекомендации:")
        print("- Создайте базу данных, выполнив скрипт init_mysql_db.py")
        print("- Проверьте название базы данных в строке подключения")
    
    sys.exit(1)
except Exception as e:
    print(f"❌ Непредвиденная ошибка: {e}")
    sys.exit(1) 