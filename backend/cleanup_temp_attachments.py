#!/usr/bin/env python3
"""
Скрипт для очистки временных вложений с message_id=0
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Загружаем переменные из .env файла
load_dotenv()

# Добавляем путь к проекту
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import MessageAttachment

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Ошибка: DATABASE_URL не найден в .env файле!")
    sys.exit(1)

def cleanup_temp_attachments():
    """Удаляет временные вложения с message_id=0"""
    
    print(f"🔌 Подключение к БД: {DATABASE_URL}")
    
    # Создаем соединение с базой данных
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Находим все временные вложения
        temp_attachments = db.query(MessageAttachment).filter(
            MessageAttachment.message_id == 0
        ).all()
        
        print(f"Найдено временных вложений: {len(temp_attachments)}")
        
        if temp_attachments:
            print("\nСписок временных вложений:")
            for att in temp_attachments:
                print(f"ID: {att.id}, Файл: {att.filename}, Путь: {att.file_path}")
            
            # Спрашиваем подтверждение
            confirm = input(f"\nУдалить {len(temp_attachments)} временных вложений? (y/N): ")
            
            if confirm.lower() == 'y':
                # Удаляем физические файлы
                files_deleted = 0
                for att in temp_attachments:
                    try:
                        # Формируем полный путь к файлу
                        file_path = att.file_path.replace('/uploads/consultation_files/', 'uploads/consultation_files/')
                        if os.path.exists(file_path):
                            os.remove(file_path)
                            files_deleted += 1
                            print(f"Удален файл: {file_path}")
                    except Exception as e:
                        print(f"Ошибка при удалении файла {att.file_path}: {e}")
                
                # Удаляем записи из базы данных
                deleted_count = db.query(MessageAttachment).filter(
                    MessageAttachment.message_id == 0
                ).delete()
                
                db.commit()
                
                print(f"\nРезультат:")
                print(f"- Удалено записей из БД: {deleted_count}")
                print(f"- Удалено физических файлов: {files_deleted}")
                print("Очистка завершена!")
            else:
                print("Очистка отменена.")
        else:
            print("Временных вложений не найдено.")
            
    except Exception as e:
        print(f"Ошибка при очистке: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_temp_attachments() 