# backend/migration_add_news_translations.py

import pymysql
import os
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Настройки подключения к базе данных
DB_CONFIG = {
    'host': 'localhost',
    'port': 3306,
    'user': 'vrachi_user',
    'password': '1435511926Ss..',
    'database': 'online_doctors_db',
    'charset': 'utf8mb4'
}

def run_migration():
    """Выполнить миграцию для добавления таблицы переводов новостей"""
    
    connection = None
    try:
        # Подключаемся к базе данных
        connection = pymysql.connect(**DB_CONFIG)
        
        with connection.cursor() as cursor:
            print("🔄 Начинаем миграцию для добавления таблицы news_translations...")
            
            # SQL для создания таблицы переводов новостей
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS news_translations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                news_id INT NOT NULL,
                language_code VARCHAR(5) NOT NULL,
                title VARCHAR(255) NOT NULL,
                summary TEXT NOT NULL,
                content TEXT NOT NULL,
                category VARCHAR(100) NOT NULL,
                tags JSON NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                
                FOREIGN KEY (news_id) REFERENCES news(id) ON DELETE CASCADE,
                UNIQUE KEY uq_news_translation (news_id, language_code),
                INDEX idx_news_translation_news_lang (news_id, language_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            """
            
            cursor.execute(create_table_sql)
            print("✅ Таблица news_translations создана успешно")
            
            # Проверяем, создалась ли таблица
            cursor.execute("SHOW TABLES LIKE 'news_translations'")
            result = cursor.fetchone()
            
            if result:
                print("✅ Таблица news_translations найдена в базе данных")
                
                # Показываем структуру таблицы
                cursor.execute("DESCRIBE news_translations")
                columns = cursor.fetchall()
                print("📋 Структура таблицы news_translations:")
                for column in columns:
                    print(f"   - {column[0]}: {column[1]} {column[2] if column[2] else ''}")
            else:
                print("❌ Ошибка: таблица news_translations не была создана")
                return False
            
        # Сохраняем изменения
        connection.commit()
        print("✅ Миграция завершена успешно!")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка при выполнении миграции: {e}")
        if connection:
            connection.rollback()
        return False
        
    finally:
        if connection:
            connection.close()

if __name__ == "__main__":
    print("🚀 Запуск миграции для добавления таблицы переводов новостей")
    print("=" * 60)
    
    success = run_migration()
    
    print("=" * 60)
    if success:
        print("🎉 Миграция выполнена успешно!")
        print("📝 Теперь новости будут автоматически переводиться на узбекский и английский языки")
    else:
        print("💥 Миграция завершилась с ошибками")
    print("=" * 60) 