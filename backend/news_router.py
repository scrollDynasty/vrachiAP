# backend/news_router.py

import os
import uuid
import shutil
import asyncio
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form, Query, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from models import News, User, get_db
from auth import get_current_user, require_role
from news_translation_service import (
    create_news_translations, 
    update_news_translations,
    get_news_with_translation,
    get_news_list_with_translations
)

router = APIRouter(prefix="/api/news", tags=["news"])

# Директория для изображений новостей
NEWS_IMAGES_DIR = os.path.join(os.getcwd(), "uploads", "news_images")
if not os.path.exists(NEWS_IMAGES_DIR):
    os.makedirs(NEWS_IMAGES_DIR)

# Pydantic модели
class NewsCreate(BaseModel):
    title: str = Field(..., max_length=255)
    summary: str
    content: str
    category: str = Field(..., max_length=100)
    read_time: Optional[str] = Field(None, max_length=20)
    tags: Optional[List[str]] = None
    is_published: bool = False
    is_featured: bool = False

class NewsUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    summary: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = Field(None, max_length=100)
    read_time: Optional[str] = Field(None, max_length=20)
    tags: Optional[List[str]] = None
    is_published: Optional[bool] = None
    is_featured: Optional[bool] = None

class NewsResponse(BaseModel):
    id: int
    title: str
    summary: str
    content: str
    category: str
    image_path: Optional[str] = None
    is_published: bool
    is_featured: bool
    read_time: Optional[str] = None
    tags: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime
    published_at: Optional[datetime] = None
    author_id: Optional[int] = None

    class Config:
        from_attributes = True

class NewsListResponse(BaseModel):
    items: List[NewsResponse]
    total: int
    page: int
    pages: int

# Вспомогательные функции
def save_news_image(image: UploadFile) -> str:
    """Сохраняет изображение новости и возвращает путь к файлу"""
    if not image:
        return None
    
    # Проверяем тип файла
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/jpg"]
    if image.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Недопустимый формат изображения. Разрешены: JPEG, PNG, WebP"
        )
    
    # Генерируем уникальное имя файла
    file_extension = os.path.splitext(image.filename)[1]
    filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(NEWS_IMAGES_DIR, filename)
    
    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
    
    # Возвращаем относительный путь для базы данных
    return f"/uploads/news_images/{filename}"

def delete_news_image(image_path: str):
    """Удаляет изображение новости"""
    if image_path and image_path.startswith("/uploads/news_images/"):
        file_path = os.path.join(os.getcwd(), image_path.lstrip("/"))
        if os.path.exists(file_path):
            os.remove(file_path)

# Публичные эндпоинты (для главной страницы)
@router.get("/published", response_model=List[NewsResponse])
async def get_published_news(
    featured_only: bool = Query(False, description="Только рекомендуемые новости"),
    category: Optional[str] = Query(None, description="Фильтр по категории"),
    limit: int = Query(10, description="Максимальное количество новостей"),
    language: str = Query('ru', description="Язык перевода: ru, en, uz"),
    db: Session = Depends(get_db)
):
    """Получить опубликованные новости для главной страницы с переводами"""
    
    # Используем новый сервис переводов
    filters = {
        'featured_only': featured_only,
        'category': category,
        'limit': limit,
        'published_only': True
    }
    
    news_list = get_news_list_with_translations(db, language, **filters)
    return news_list

@router.get("/published/{news_id}", response_model=NewsResponse)
async def get_published_news_by_id(
    news_id: int,
    language: str = Query('ru', description="Язык перевода: ru, en, uz"),
    db: Session = Depends(get_db)
):
    """Получить конкретную опубликованную новость по ID с переводом"""
    
    # Сначала проверяем что новость опубликована
    news = db.query(News).filter(
        News.id == news_id,
        News.is_published == True
    ).first()
    
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    # Получаем новость с переводом
    news_data = get_news_with_translation(db, news_id, language)
    if not news_data:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    return news_data

@router.get("/categories", response_model=List[str])
async def get_news_categories(db: Session = Depends(get_db)):
    """Получить список всех категорий новостей"""
    categories = db.query(News.category).filter(News.is_published == True).distinct().all()
    return [category[0] for category in categories if category[0]]

# Админские эндпоинты
@router.get("", response_model=NewsListResponse)
async def get_all_news(
    page: int = Query(1, description="Номер страницы", ge=1),
    size: int = Query(10, description="Размер страницы", ge=1, le=100),
    category: Optional[str] = Query(None, description="Фильтр по категории"),
    published_only: bool = Query(False, description="Только опубликованные"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Получить все новости (только для админов)"""
    query = db.query(News)
    
    if published_only:
        query = query.filter(News.is_published == True)
    
    if category:
        query = query.filter(News.category == category)
    
    total = query.count()
    
    news = query.order_by(News.created_at.desc()).offset((page - 1) * size).limit(size).all()
    
    return NewsListResponse(
        items=news,
        total=total,
        page=page,
        pages=(total + size - 1) // size
    )

@router.post("", response_model=NewsResponse, status_code=status.HTTP_201_CREATED)
async def create_news(
    background_tasks: BackgroundTasks,
    title: str = Form(...),
    summary: str = Form(...),
    content: str = Form(...),
    category: str = Form(...),
    read_time: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # JSON строка
    is_published: bool = Form(False),
    is_featured: bool = Form(False),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Создать новость (только для админов) с автоматическим переводом"""
    
    # Обработка тегов
    parsed_tags = None
    if tags:
        try:
            import json
            parsed_tags = json.loads(tags)
        except:
            parsed_tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
    
    # Сохранение изображения
    image_path = None
    if image:
        image_path = save_news_image(image)
    
    # Создание новости
    news = News(
        title=title,
        summary=summary,
        content=content,
        category=category,
        read_time=read_time,
        tags=parsed_tags,
        is_published=is_published,
        is_featured=is_featured,
        image_path=image_path,
        author_id=current_user.id,
        published_at=datetime.utcnow() if is_published else None
    )
    
    db.add(news)
    db.commit()
    db.refresh(news)
    
    # Добавляем фоновую задачу для создания переводов
    background_tasks.add_task(
        lambda: asyncio.run(create_news_translations(db, news))
    )
    
    return news

@router.get("/{news_id}", response_model=NewsResponse)
async def get_news_by_id(
    news_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Получить новость по ID (только для админов)"""
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    return news

@router.put("/{news_id}", response_model=NewsResponse)
async def update_news(
    news_id: int,
    background_tasks: BackgroundTasks,
    title: Optional[str] = Form(None),
    summary: Optional[str] = Form(None),
    content: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    read_time: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # JSON строка
    is_published: Optional[bool] = Form(None),
    is_featured: Optional[bool] = Form(None),
    image: Optional[UploadFile] = File(None),
    remove_image: bool = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Обновить новость (только для админов) с автоматическим обновлением переводов"""
    
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    # Обновляем поля
    if title is not None:
        news.title = title
    if summary is not None:
        news.summary = summary
    if content is not None:
        news.content = content
    if category is not None:
        news.category = category
    if read_time is not None:
        news.read_time = read_time
    
    # Обработка тегов
    if tags is not None:
        try:
            import json
            news.tags = json.loads(tags)
        except:
            news.tags = [tag.strip() for tag in tags.split(",") if tag.strip()]
    
    # Обработка статуса публикации
    if is_published is not None:
        news.is_published = is_published
        if is_published and not news.published_at:
            news.published_at = datetime.utcnow()
        elif not is_published:
            news.published_at = None
    
    if is_featured is not None:
        news.is_featured = is_featured
    
    # Обработка изображения
    if remove_image:
        if news.image_path:
            delete_news_image(news.image_path)
            news.image_path = None
    elif image:
        # Удаляем старое изображение
        if news.image_path:
            delete_news_image(news.image_path)
        # Сохраняем новое
        news.image_path = save_news_image(image)
    
    news.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(news)
    
    # Добавляем фоновую задачу для обновления переводов
    # только если изменились текстовые поля
    text_fields_updated = any([
        title is not None,
        summary is not None, 
        content is not None,
        category is not None,
        tags is not None
    ])
    
    if text_fields_updated:
        background_tasks.add_task(
            lambda: asyncio.run(update_news_translations(db, news))
        )
    
    return news

@router.delete("/{news_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_news(
    news_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Удалить новость (только для админов)"""
    
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    # Удаляем изображение
    if news.image_path:
        delete_news_image(news.image_path)
    
    db.delete(news)
    db.commit()

@router.post("/{news_id}/toggle-publish", response_model=NewsResponse)
async def toggle_news_publication(
    news_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Переключить статус публикации новости"""
    
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    news.is_published = not news.is_published
    if news.is_published:
        news.published_at = datetime.utcnow()
    else:
        news.published_at = None
    
    news.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(news)
    
    return news

@router.post("/{news_id}/toggle-featured", response_model=NewsResponse)
async def toggle_news_featured(
    news_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin"))
):
    """Переключить статус рекомендуемой новости"""
    
    news = db.query(News).filter(News.id == news_id).first()
    if not news:
        raise HTTPException(status_code=404, detail="Новость не найдена")
    
    news.is_featured = not news.is_featured
    news.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(news)
    
    return news 