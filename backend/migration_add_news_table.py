#!/usr/bin/env python3
"""
Миграция для создания таблицы новостей (news)
"""

from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv
import sys

# Загружаем переменные окружения
load_dotenv()

def get_database_url():
    """Получаем URL базы данных"""
    
    # Используем вашу строку подключения к базе данных
    return "mysql+pymysql://vrachi_user:1435511926Ss..@localhost:3306/online_doctors_db"

def create_news_table():
    """Создает таблицу новостей"""
    
    database_url = get_database_url()
    print(f"Подключение к базе данных...")
    
    try:
        engine = create_engine(database_url)
        
        with engine.connect() as connection:
            # Проверяем, существует ли таблица
            result = connection.execute(text("""
                SELECT COUNT(*) as count 
                FROM information_schema.tables 
                WHERE table_schema = DATABASE() AND table_name = 'news'
            """))
            
            table_exists = result.fetchone()[0] > 0
            
            if table_exists:
                print("Таблица 'news' уже существует. Пропускаем создание.")
                return True
            
            # Создаем таблицу новостей
            create_table_query = text("""
                CREATE TABLE news (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    summary TEXT NOT NULL,
                    content LONGTEXT NOT NULL,
                    category VARCHAR(100) NOT NULL,
                    read_time VARCHAR(20),
                    tags JSON,
                    image_path VARCHAR(500),
                    is_published BOOLEAN DEFAULT FALSE,
                    is_featured BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    published_at TIMESTAMP NULL,
                    author_id INT,
                    
                    INDEX idx_category (category),
                    INDEX idx_published (is_published),
                    INDEX idx_featured (is_featured),
                    INDEX idx_created_at (created_at),
                    INDEX idx_published_at (published_at),
                    
                    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
            """)
            
            connection.execute(create_table_query)
            connection.commit()
            
            print("✅ Таблица 'news' успешно создана!")
            
            # Добавляем тестовые данные
            insert_sample_data(connection)
            
            return True
            
    except Exception as e:
        print(f"❌ Ошибка при создании таблицы новостей: {e}")
        return False

def insert_sample_data(connection):
    """Добавляет тестовые новости"""
    
    try:
        # Получаем ID первого админа для автора
        result = connection.execute(text("""
            SELECT id FROM users WHERE role = 'admin' LIMIT 1
        """))
        
        admin_user = result.fetchone()
        author_id = admin_user[0] if admin_user else None
        
        sample_news = [
            {
                'title': 'Новые методы лечения сердечно-сосудистых заболеваний',
                'summary': 'Исследователи разработали инновационную терапию, которая показывает отличные результаты в лечении аритмии и других сердечных заболеваний.',
                'content': '''Кардиологи из ведущих медицинских центров мира представили революционные методы лечения сердечно-сосудистых заболеваний. 

Новая терапия основана на использовании стволовых клеток и показывает выдающиеся результаты при лечении:

• Аритмии различной степени тяжести
• Ишемической болезни сердца  
• Сердечной недостаточности
• Кардиомиопатии

Клинические испытания проводились в течение 3 лет с участием более 2000 пациентов. Эффективность нового метода составила 87%, что значительно превышает показатели традиционного лечения.

Пациенты отмечают улучшение качества жизни уже через 2-3 недели после начала терапии. Побочные эффекты минимальны и носят временный характер.

Метод планируется внедрить в клиническую практику уже в следующем году.''',
                'category': 'Кардиология',
                'read_time': '3 мин',
                'tags': '["кардиология", "лечение", "инновации", "стволовые клетки"]',
                'is_published': True,
                'is_featured': True
            },
            {
                'title': 'Профилактика диабета: важные открытия',
                'summary': 'Новое исследование показало эффективность ранней диагностики и профилактических мер в предотвращении развития диабета 2 типа.',
                'content': '''Международная группа эндокринологов опубликовала результаты масштабного исследования по профилактике диабета 2 типа.

Ключевые выводы исследования:

**Факторы риска:**
• Избыточный вес (ИМТ > 25)
• Малоподвижный образ жизни
• Генетическая предрасположенность
• Возраст старше 40 лет

**Эффективные меры профилактики:**
• Регулярные физические нагрузки (не менее 150 минут в неделю)
• Сбалансированное питание с ограничением быстрых углеводов
• Контроль массы тела
• Ежегодная проверка уровня глюкозы в крови

Соблюдение этих рекомендаций снижает риск развития диабета на 58%. Особенно важна ранняя диагностика предиабета, когда изменения еще обратимы.''',
                'category': 'Эндокринология',
                'read_time': '5 мин',
                'tags': '["диабет", "профилактика", "эндокринология", "здоровый образ жизни"]',
                'is_published': True,
                'is_featured': True
            },
            {
                'title': 'Революция в лечении онкологических заболеваний',
                'summary': 'Персонализированная медицина открывает новые возможности в борьбе с раком. Иммунотерапия показывает впечатляющие результаты.',
                'content': '''Онкология переживает настоящую революцию благодаря развитию персонализированной медицины и иммунотерапии.

**Прорывы в лечении:**

1. **CAR-T клеточная терапия**
   - Перепрограммирование иммунных клеток пациента
   - Эффективность при лейкемии достигает 90%
   - Минимальные побочные эффекты

2. **Ингибиторы контрольных точек**
   - Активация собственного иммунитета против опухоли
   - Успех при меланоме, раке легких, почек
   - Долгосрочная ремиссия у 30-40% пациентов

3. **Таргетная терапия**
   - Воздействие на конкретные мутации
   - Индивидуальный подбор лечения
   - Высокая точность и эффективность

**Будущие направления:**
• Вакцины против рака
• Нанотехнологии в доставке лекарств
• Искусственный интеллект в диагностике

Современная онкология движется от стандартизированного к персонализированному подходу, что значительно улучшает прогноз для пациентов.''',
                'category': 'Онкология',
                'read_time': '7 мин',
                'tags': '["онкология", "иммунотерапия", "персонализированная медицина", "CAR-T"]',
                'is_published': True,
                'is_featured': True
            }
        ]
        
        for news_item in sample_news:
            insert_query = text("""
                INSERT INTO news (
                    title, summary, content, category, read_time, tags, 
                    is_published, is_featured, author_id, published_at
                ) VALUES (
                    :title, :summary, :content, :category, :read_time, :tags,
                    :is_published, :is_featured, :author_id, 
                    CASE WHEN :is_published = 1 THEN NOW() ELSE NULL END
                )
            """)
            
            connection.execute(insert_query, {
                **news_item,
                'author_id': author_id
            })
        
        connection.commit()
        print("✅ Добавлены тестовые новости!")
        
    except Exception as e:
        print(f"⚠️ Ошибка при добавлении тестовых данных: {e}")

def main():
    """Основная функция миграции"""
    print("Начинаем миграцию для создания таблицы новостей...")
    
    if create_news_table():
        print("✅ Миграция успешно завершена!")
    else:
        print("❌ Миграция завершилась с ошибками!")
        sys.exit(1)

if __name__ == "__main__":
    main() 