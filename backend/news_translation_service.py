# backend/news_translation_service.py

import requests
import json
import asyncio
import logging
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from models import News, NewsTranslation

# Настройка логирования
logger = logging.getLogger(__name__)

# Словарь статических переводов для медицинских терминов
STATIC_TRANSLATIONS = {
    # Медицинские специальности
    'Кардиология': {'uz': 'Kardiologiya', 'en': 'Cardiology'},
    'Cardiology': {'uz': 'Kardiologiya', 'ru': 'Кардиология'},
    'Эндокринология': {'uz': 'Endokrinologiya', 'en': 'Endocrinology'},
    'Эндокринология и диабет': {'uz': 'Endokrinologiya va diabet', 'en': 'Endocrinology and Diabetes'},
    'Неврология': {'uz': 'Nevrologiya', 'en': 'Neurology'},
    'Офтальмология': {'uz': 'Oftalmologiya', 'en': 'Ophthalmology'},
    'Гинекология': {'uz': 'Ginekologiya', 'en': 'Gynecology'},
    'Дерматология': {'uz': 'Dermatologiya', 'en': 'Dermatology'},
    'Педиатрия': {'uz': 'Pediatriya', 'en': 'Pediatrics'},
    'Урология': {'uz': 'Urologiya', 'en': 'Urology'},
    'Психиатрия': {'uz': 'Psixiatriya', 'en': 'Psychiatry'},
    'Онкология': {'uz': 'Onkologiya', 'en': 'Oncology'},
    'Ортопедия': {'uz': 'Ortopediya', 'en': 'Orthopedics'},
    'Оториноларингология': {'uz': 'Otorinolaringologiya', 'en': 'Otolaryngology'},
    'Гастроэнтерология': {'uz': 'Gastroenterologiya', 'en': 'Gastroenterology'},
    'Пульмонология': {'uz': 'Pulmonologiya', 'en': 'Pulmonology'},
    'Проктология': {'uz': 'Proktologiya', 'en': 'Proctology'},
    'Хирургия': {'uz': 'Jarrohlik', 'en': 'Surgery'},
    'Терапия': {'uz': 'Terapiya', 'en': 'Therapy'},
    'Технологии': {'uz': 'Texnologiyalar', 'en': 'Technologies'},
    'Общие вопросы': {'uz': 'Umumiy savollar', 'en': 'General Questions'},
    
    # Типичные фразы из новостей
    'Какой нибудь заголовок': {'uz': 'Qandaydir sarlavha', 'en': 'Some kind of headline'},
    'какой нибудь заголовок': {'uz': 'qandaydir sarlavha', 'en': 'some kind of headline'},
    'Краткое описание': {'uz': 'Qisqacha tavsif', 'en': 'Short description'},
    'какой то текст новостей': {'uz': 'qandaydir yangilik matni', 'en': 'some kind of news text'},
    
    # Хэштеги
    'хирургия': {'uz': 'jarrohlik', 'en': 'surgery'},
    'диабет': {'uz': 'diabet', 'en': 'diabetes'},
    'кардиология': {'uz': 'kardiologiya', 'en': 'cardiology'},
    'неврология': {'uz': 'nevrologiya', 'en': 'neurology'},
    'онкология': {'uz': 'onkologiya', 'en': 'oncology'}
}

def get_static_translation(text: str, target_lang: str) -> Optional[str]:
    """Получить статический перевод из словаря"""
    # Точное совпадение
    if text in STATIC_TRANSLATIONS and target_lang in STATIC_TRANSLATIONS[text]:
        return STATIC_TRANSLATIONS[text][target_lang]
    
    # Поиск без учета регистра
    text_lower = text.lower()
    for key, translations in STATIC_TRANSLATIONS.items():
        if key.lower() == text_lower and target_lang in translations:
            return translations[target_lang]
    
    return None

async def translate_with_libretranslate(text: str, from_lang: str, to_lang: str) -> str:
    """Перевод через LibreTranslate API"""
    try:
        url = 'https://libretranslate.com/translate'
        data = {
            'q': text,
            'source': from_lang,
            'target': to_lang,
            'format': 'text'
        }
        
        # Используем синхронный requests в async функции
        response = requests.post(url, json=data, timeout=10)
        response.raise_for_status()
        
        result = response.json()
        return result.get('translatedText', text)
        
    except Exception as e:
        logger.warning(f"LibreTranslate failed: {e}")
        raise

async def translate_with_mymemory(text: str, from_lang: str, to_lang: str) -> str:
    """Перевод через MyMemory API"""
    try:
        lang_pair = f"{from_lang}|{to_lang}"
        url = f"https://api.mymemory.translated.net/get"
        params = {
            'q': text,
            'langpair': lang_pair
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        result = response.json()
        if result.get('responseStatus') == 200:
            return result['responseData']['translatedText']
        else:
            raise Exception('MyMemory translation failed')
            
    except Exception as e:
        logger.warning(f"MyMemory failed: {e}")
        raise

async def translate_text(text: str, from_lang: str = 'ru', to_lang: str = 'en') -> str:
    """Основная функция перевода с fallback механизмами"""
    if not text or from_lang == to_lang:
        return text
    
    # Сначала проверяем статический словарь
    static_translation = get_static_translation(text, to_lang)
    if static_translation:
        return static_translation
    
    # Попытка автоматического перевода
    try:
        # Специальная обработка для узбекского
        if to_lang == 'uz':
            try:
                # Пробуем прямой перевод ru->uz
                return await translate_with_libretranslate(text, 'ru', 'uz')
            except:
                # Если не работает, пробуем двухэтапный перевод
                try:
                    english_text = await translate_with_libretranslate(text, 'ru', 'en')
                    try:
                        return await translate_with_libretranslate(english_text, 'en', 'uz')
                    except:
                        # В крайнем случае возвращаем английский
                        return english_text
                except:
                    # Пробуем MyMemory
                    try:
                        return await translate_with_mymemory(text, 'ru', 'uz')
                    except:
                        return text
        
        # Для других языков стандартный подход
        try:
            return await translate_with_libretranslate(text, from_lang, to_lang)
        except:
            return await translate_with_mymemory(text, from_lang, to_lang)
            
    except Exception as e:
        logger.error(f"All translation attempts failed for '{text}': {e}")
        return text

async def translate_tags(tags: List[str], target_lang: str) -> List[str]:
    """Перевод списка тегов"""
    if not tags:
        return tags
    
    translated_tags = []
    for tag in tags:
        try:
            # Убираем # если есть
            clean_tag = tag.strip('#').strip()
            translated_tag = await translate_text(clean_tag, 'ru', target_lang)
            
            # Возвращаем с # если был
            if tag.startswith('#'):
                translated_tags.append(f"#{translated_tag}")
            else:
                translated_tags.append(translated_tag)
        except Exception as e:
            logger.warning(f"Failed to translate tag '{tag}': {e}")
            translated_tags.append(tag)  # Оставляем оригинал
    
    return translated_tags

async def create_news_translations(db: Session, news: News):
    """Создать переводы новости на все поддерживаемые языки"""
    target_languages = ['en', 'uz']  # ru уже есть в оригинале
    
    for lang in target_languages:
        try:
            # Проверяем, нет ли уже перевода
            existing_translation = db.query(NewsTranslation).filter(
                NewsTranslation.news_id == news.id,
                NewsTranslation.language_code == lang
            ).first()
            
            if existing_translation:
                continue  # Пропускаем если перевод уже есть
            
            # Переводим все поля параллельно
            title, summary, content, category = await asyncio.gather(
                translate_text(news.title, 'ru', lang),
                translate_text(news.summary, 'ru', lang),
                translate_text(news.content, 'ru', lang),
                translate_text(news.category, 'ru', lang)
            )
            
            # Переводим теги если есть
            translated_tags = None
            if news.tags:
                translated_tags = await translate_tags(news.tags, lang)
            
            # Создаем запись перевода
            translation = NewsTranslation(
                news_id=news.id,
                language_code=lang,
                title=title,
                summary=summary,
                content=content,
                category=category,
                tags=translated_tags
            )
            
            db.add(translation)
            logger.info(f"Created {lang} translation for news {news.id}")
            
        except Exception as e:
            logger.error(f"Failed to create {lang} translation for news {news.id}: {e}")
            # Продолжаем с другими языками даже если один не удался
    
    try:
        db.commit()
        logger.info(f"Successfully created translations for news {news.id}")
    except Exception as e:
        logger.error(f"Failed to commit translations for news {news.id}: {e}")
        db.rollback()

async def update_news_translations(db: Session, news: News):
    """Обновить существующие переводы новости"""
    target_languages = ['en', 'uz']
    
    for lang in target_languages:
        try:
            # Находим существующий перевод
            translation = db.query(NewsTranslation).filter(
                NewsTranslation.news_id == news.id,
                NewsTranslation.language_code == lang
            ).first()
            
            if not translation:
                # Если перевода нет, создаем новый
                await create_news_translations(db, news)
                continue
            
            # Обновляем существующий перевод
            title, summary, content, category = await asyncio.gather(
                translate_text(news.title, 'ru', lang),
                translate_text(news.summary, 'ru', lang),
                translate_text(news.content, 'ru', lang),
                translate_text(news.category, 'ru', lang)
            )
            
            # Обновляем теги
            translated_tags = None
            if news.tags:
                translated_tags = await translate_tags(news.tags, lang)
            
            # Обновляем поля
            translation.title = title
            translation.summary = summary
            translation.content = content
            translation.category = category
            translation.tags = translated_tags
            
            logger.info(f"Updated {lang} translation for news {news.id}")
            
        except Exception as e:
            logger.error(f"Failed to update {lang} translation for news {news.id}: {e}")
    
    try:
        db.commit()
        logger.info(f"Successfully updated translations for news {news.id}")
    except Exception as e:
        logger.error(f"Failed to commit translation updates for news {news.id}: {e}")
        db.rollback()

def get_news_with_translation(db: Session, news_id: int, language: str = 'ru') -> Optional[Dict]:
    """Получить новость с переводом для указанного языка"""
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        return None
    
    if language == 'ru':
        # Возвращаем оригинал
        return {
            'id': news.id,
            'title': news.title,
            'summary': news.summary,
            'content': news.content,
            'category': news.category,
            'tags': news.tags,
            'image_path': news.image_path,
            'is_published': news.is_published,
            'is_featured': news.is_featured,
            'read_time': news.read_time,
            'created_at': news.created_at,
            'updated_at': news.updated_at,
            'published_at': news.published_at,
            'author_id': news.author_id
        }
    
    # Ищем перевод
    translation = db.query(NewsTranslation).filter(
        NewsTranslation.news_id == news_id,
        NewsTranslation.language_code == language
    ).first()
    
    if translation:
        return {
            'id': news.id,
            'title': translation.title,
            'summary': translation.summary,
            'content': translation.content,
            'category': translation.category,
            'tags': translation.tags,
            'image_path': news.image_path,
            'is_published': news.is_published,
            'is_featured': news.is_featured,
            'read_time': news.read_time,
            'created_at': news.created_at,
            'updated_at': news.updated_at,
            'published_at': news.published_at,
            'author_id': news.author_id
        }
    
    # Если перевода нет, возвращаем оригинал
    return {
        'id': news.id,
        'title': news.title,
        'summary': news.summary,
        'content': news.content,
        'category': news.category,
        'tags': news.tags,
        'image_path': news.image_path,
        'is_published': news.is_published,
        'is_featured': news.is_featured,
        'read_time': news.read_time,
        'created_at': news.created_at,
        'updated_at': news.updated_at,
        'published_at': news.published_at,
        'author_id': news.author_id
    }

def get_news_list_with_translations(db: Session, language: str = 'ru', **filters) -> List[Dict]:
    """Получить список новостей с переводами"""
    query = db.query(News)
    
    # Применяем фильтры
    if filters.get('featured_only'):
        query = query.filter(News.is_featured == True)
    if filters.get('category'):
        query = query.filter(News.category == filters['category'])
    if filters.get('published_only', True):
        query = query.filter(News.is_published == True)
    
    # Получаем новости
    news_list = query.order_by(News.published_at.desc()).limit(filters.get('limit', 10)).all()
    
    # Формируем результат с переводами
    result = []
    for news in news_list:
        news_data = get_news_with_translation(db, news.id, language)
        if news_data:
            result.append(news_data)
    
    return result 