#!/usr/bin/env python3
"""
Скрипт для быстрой проверки данных пользователя в базе данных
Использование: python check_user.py [user_id]
Пример: python check_user.py 5
"""

import sys
import json
import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

# Получаем URL базы данных
DATABASE_URL = os.getenv(
    "DATABASE_URL", "mysql+pymysql://vrachi_user:1435511926Ss..@localhost:3306/online_doctors_db"
)

def check_user_data(user_id):
    """Проверяет все данные пользователя по ID"""
    try:
        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as connection:
            print(f"🔍 Проверяем данные пользователя с ID: {user_id}")
            print("="*60)
            
            # 1. Основная информация о пользователе
            print("\n1️⃣ ОСНОВНАЯ ИНФОРМАЦИЯ О ПОЛЬЗОВАТЕЛЕ:")
            user_query = text("""
                SELECT 
                    id, email, role, is_active, auth_provider, avatar_path, 
                    created_at, updated_at
                FROM users 
                WHERE id = :user_id
            """)
            user_result = connection.execute(user_query, {"user_id": user_id}).fetchone()
            
            if not user_result:
                print(f"❌ Пользователь с ID {user_id} не найден!")
                return
                
            print(f"📧 Email: {user_result.email}")
            print(f"👤 Роль: {user_result.role}")
            print(f"✅ Активен: {'Да' if user_result.is_active else 'Нет'}")
            print(f"🔐 Провайдер аутентификации: {user_result.auth_provider or 'Email'}")
            print(f"🖼️ Аватар: {user_result.avatar_path or 'Не установлен'}")
            print(f"📅 Дата регистрации: {user_result.created_at}")
            
            # 2. Профиль пациента
            print("\n2️⃣ ПРОФИЛЬ ПАЦИЕНТА:")
            patient_query = text("""
                SELECT 
                    full_name, contact_phone, contact_address, city, 
                    district, country, medical_info
                FROM patient_profiles 
                WHERE user_id = :user_id
            """)
            patient_result = connection.execute(patient_query, {"user_id": user_id}).fetchone()
            
            if patient_result:
                print(f"👨‍⚕️ ФИО: {patient_result.full_name or 'Не указано'}")
                print(f"📞 Телефон: {patient_result.contact_phone or 'Не указан'}")
                print(f"🏙️ Город: {patient_result.city or 'Не указан'}")
                print(f"🏘️ Район: {patient_result.district or 'Не указан'}")
                print(f"🌍 Страна: {patient_result.country or 'Не указана'}")
                print(f"🏠 Адрес: {patient_result.contact_address or 'Не указан'}")
                print(f"🩺 Медицинская информация: {patient_result.medical_info or 'Не указана'}")
            else:
                print("❌ Профиль пациента не найден")
            
            # 3. Профиль врача
            print("\n3️⃣ ПРОФИЛЬ ВРАЧА:")
            doctor_query = text("""
                SELECT 
                    full_name, specialization, experience, education, 
                    cost_per_consultation, city, district, languages, 
                    practice_areas, is_verified, is_active, country
                FROM doctor_profiles 
                WHERE user_id = :user_id
            """)
            doctor_result = connection.execute(doctor_query, {"user_id": user_id}).fetchone()
            
            if doctor_result:
                print(f"👨‍⚕️ ФИО: {doctor_result.full_name or 'Не указано'}")
                print(f"🩺 Специализация: {doctor_result.specialization or 'Не указана'}")
                print(f"📅 Опыт: {doctor_result.experience or 'Не указан'}")
                print(f"🎓 Образование: {doctor_result.education or 'Не указано'}")
                print(f"💰 Стоимость консультации: {doctor_result.cost_per_consultation or 0} сум")
                print(f"🏙️ Город: {doctor_result.city or 'Не указан'}")
                print(f"🏘️ Район: {doctor_result.district or 'Не указан'}")
                print(f"🌍 Страна: {doctor_result.country or 'Не указана'}")
                
                # Языки
                languages = doctor_result.languages
                if languages:
                    if isinstance(languages, str):
                        try:
                            languages = json.loads(languages)
                        except:
                            pass
                    print(f"🗣️ Языки консультаций: {', '.join(languages) if isinstance(languages, list) else languages}")
                else:
                    print("🗣️ Языки консультаций: Не указаны")
                    
                print(f"✅ Верифицирован: {'Да' if doctor_result.is_verified else 'Нет'}")
                print(f"🟢 Активен: {'Да' if doctor_result.is_active else 'Нет'}")
                print(f"📍 Области практики (старое): {doctor_result.practice_areas or 'Не указаны'}")
            else:
                print("❌ Профиль врача не найден")
            
            # 4. Заявки врача
            print("\n4️⃣ ЗАЯВКИ НА РОЛЬ ВРАЧА:")
            applications_query = text("""
                SELECT 
                    id, full_name, specialization, city, district, languages,
                    status, created_at, processed_at
                FROM doctor_applications 
                WHERE user_id = :user_id
                ORDER BY created_at DESC
                LIMIT 5
            """)
            applications_result = connection.execute(applications_query, {"user_id": user_id}).fetchall()
            
            if applications_result:
                for i, app in enumerate(applications_result, 1):
                    print(f"\n📋 Заявка #{app.id} (#{i}):")
                    print(f"   👤 ФИО: {app.full_name}")
                    print(f"   🩺 Специализация: {app.specialization}")
                    print(f"   🏙️ Город: {app.city or 'Не указан'}")
                    print(f"   🏘️ Район: {app.district or 'Не указан'}")
                    
                    # Языки в заявке
                    languages = app.languages
                    if languages:
                        if isinstance(languages, str):
                            try:
                                languages = json.loads(languages)
                            except:
                                pass
                        print(f"   🗣️ Языки: {', '.join(languages) if isinstance(languages, list) else languages}")
                    else:
                        print("   🗣️ Языки: Не указаны")
                        
                    status_emoji = {"pending": "⏳", "approved": "✅", "rejected": "❌"}
                    print(f"   📊 Статус: {status_emoji.get(app.status, '❓')} {app.status}")
                    print(f"   📅 Подана: {app.created_at}")
                    if app.processed_at:
                        print(f"   ⚡ Обработана: {app.processed_at}")
            else:
                print("❌ Заявки на роль врача не найдены")
            
            print("\n" + "="*60)
            print("✅ Проверка завершена!")
            
    except Exception as e:
        print(f"❌ Ошибка при проверке данных: {e}")

def main():
    if len(sys.argv) != 2:
        print("❌ Использование: python check_user.py [user_id]")
        print("📖 Пример: python check_user.py 5")
        sys.exit(1)
    
    try:
        user_id = int(sys.argv[1])
        check_user_data(user_id)
    except ValueError:
        print("❌ ID пользователя должен быть числом!")
        sys.exit(1)

if __name__ == "__main__":
    main() 