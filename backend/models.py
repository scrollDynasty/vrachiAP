# backend/models.py

import os
from sqlalchemy import create_engine, Column, Integer, String, Boolean, ForeignKey, Text, DateTime, Float, JSON, UniqueConstraint, CheckConstraint, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime # Импортируем datetime для работы с датой и временем

from dotenv import load_dotenv # Импортируем load_dotenv
load_dotenv() # Загружаем переменные из .env файла

# URL для подключения к базе данных.
# Порядок приоритета: переменная окружения DATABASE_URL, затем значение из .env, затем запасной вариант.
# Убедись, что в .env или в переменной окружения указана правильная строка подключения к базе данных.

# ВАЖНО: Для настройки MySQL используйте один из следующих способов:
# 1. Запустите скрипт backend/init_mysql_db.py, который автоматически настроит базу данных
# 2. Вручную выполните команды SQL для создания базы данных и пользователя
# 3. Укажите свои настройки подключения в .env файле

# Принудительно используем локальное подключение для разработки
DATABASE_URL = "mysql+pymysql://vrachi_user:1435511926Ss..@localhost:3306/online_doctors_db"

# connect_args={"check_same_thread": False} нужен только для SQLite, для MySQL он не нужен
engine = create_engine(
    DATABASE_URL, 
    pool_size=20, 
    max_overflow=0,
    pool_pre_ping=True,
    pool_recycle=3600,  # Переподключаться каждый час, чтобы избежать разрыва соединений
    echo=False  # Установите True для отладки SQL запросов
)

# Создаем базовый класс моделей
Base = declarative_base()

# Создаем класс SessionLocal для создания сессий, которые мы будем использовать для работы с БД.
# autocommit=False означает, что мы должны явно вызывать commit()
# autoflush=False означает, что мы должны явно вызывать flush() при необходимости
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Зависимость для получения объекта сессии БД
def get_db():
    db = SessionLocal()
    try:
        yield db # Возвращаем объект сессии (через yield для использования как зависимость FastAPI)
    finally:
        db.close() # После завершения запроса закрываем сессию

class User(Base):
    __tablename__ = "users" # Имя таблицы в базе данных

    id = Column(Integer, primary_key=True, index=True) # Первичный ключ, автоинкремент
    email = Column(String(255), unique=True, index=True, nullable=False) # Email, уникальный, индексированный, обязательный
    hashed_password = Column(String(255), nullable=False) # Хэш пароля
    
    # Роль пользователя: patient (пациент), doctor (врач), admin (администратор)
    role = Column(String(50), nullable=False, default="patient")
    
    # Активен ли пользователь (например, после подтверждения email)
    is_active = Column(Boolean, default=True)
    
    # Время создания аккаунта
    created_at = Column(DateTime, default=datetime.utcnow)
    # Время последнего обновления
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # OAuth провайдер (google, facebook, null для обычной регистрации)
    auth_provider = Column(String(50), nullable=True)
    # Идентификатор пользователя в системе провайдера
    auth_provider_id = Column(String(255), nullable=True)
    
    # Поле для аватарки пользователя
    avatar_path = Column(String(255), nullable=True)  # Путь к файлу аватарки
    
    # Отношения с другими таблицами
    patient_profile = relationship("PatientProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    doctor_profile = relationship("DoctorProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    # Отношение к заявкам на роль врача
    doctor_applications = relationship("DoctorApplication", back_populates="user", cascade="all, delete-orphan")
    
    # Отношение к просмотренным уведомлениям
    viewed_notifications = relationship("ViewedNotification", back_populates="user", cascade="all, delete-orphan")
    
    # Отношение к настройкам уведомлений
    notification_settings = relationship("UserNotificationSettings", backref="user_ref", uselist=False, cascade="all, delete-orphan")


# Модель профиля Пациента
class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False) # Связь с таблицей users с CASCADE удалением

    # Поля профиля пациента (базовая информация по ТЗ)
    full_name = Column(String(255)) # ФИО пациента
    contact_phone = Column(String(50)) # Телефон пациента (опционально)
    contact_address = Column(String(255)) # Адрес пациента (опционально)
    
    # Новые поля для местоположения
    city = Column(String(255), nullable=True) # Город/область/республика пациента
    district = Column(String(255)) # Район пациента (опционально)
    country = Column(String(255), nullable=True, default="Узбекистан") # Страна
    
    medical_info = Column(Text) # Медицинская информация пациента (опционально)
    # TODO: Добавить поля для истории консультаций и платежей (связи с другими моделями)


    # Отношение к пользователю (обратная связь)
    user = relationship("User", back_populates="patient_profile")


# Модель профиля Врача
class DoctorProfile(Base):
    __tablename__ = "doctor_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False) # Связь с таблицей users с CASCADE удалением

    # Поля профиля врача (по ТЗ)
    full_name = Column(String(255)) # ФИО врача
    specialization = Column(String(255), nullable=False) # Специализация (обязательно)
    experience = Column(String(255)) # Опыт работы (например, "5 лет")
    education = Column(Text) # Образование (может быть длинным описанием)
    cost_per_consultation = Column(Integer, nullable=False) # Стоимость консультации в минимальных единицах (например, копейках), Integer лучше для денег
    
    # Новые поля для опыта работы
    work_experience = Column(JSON, nullable=True) # JSON массив с опытом работы [{"organization": "Больница №1", "position": "Терапевт", "years": "2020-2023"}]
    
    # Местоположение врача
    city = Column(String(255), nullable=True) # Город, где работает врач
    country = Column(String(255), nullable=True, default="Узбекистан") # Страна
    
    # Языки, на которых говорит врач
    languages = Column(JSON, nullable=True) # JSON массив языков ["русский", "узбекский", "английский"]
    
    # Старые поля (оставляем для совместимости, но будем использовать новые)
    practice_areas = Column(String(511)) # Районы практики (deprecated, используем work_experience)
    district = Column(String(255)) # Основной район практики (deprecated, используем city)
    
    is_verified = Column(Boolean, default=False) # Статус верификации Администратором (переименовано в is_verified из "Проверенный врач")
    is_active = Column(Boolean, default=True) # Статус активности врача (доступен ли для консультаций)

    # TODO: Добавить связи с моделями Отзывов, Консультаций, Расписания

    # Отношение к пользователю (обратная связь)
    user = relationship("User", back_populates="doctor_profile")


# Модель заявки на получение роли врача
class DoctorApplication(Base):
    __tablename__ = "doctor_applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False) # Связь с таблицей users
    
    # Основная информация заявки
    full_name = Column(String(255), nullable=False) # ФИО врача
    specialization = Column(String(255), nullable=False) # Специализация
    experience = Column(String(255), nullable=False) # Опыт работы
    education = Column(Text, nullable=False) # Образование (вуз, год окончания)
    license_number = Column(String(255), nullable=False) # Номер лицензии/сертификата
    
    # Местоположение и языки
    city = Column(String(255), nullable=True) # Город/регион работы врача
    district = Column(String(255), nullable=True) # Район работы врача
    languages = Column(JSON, nullable=True) # Языки консультаций
    
    # Документы и фото
    photo_path = Column(String(512), nullable=True) # Путь к фото врача
    diploma_path = Column(String(512), nullable=True) # Путь к скану диплома
    license_path = Column(String(512), nullable=True) # Путь к скану лицензии
    
    # Дополнительная информация
    additional_info = Column(Text, nullable=True) # Дополнительная информация
    
    # Статус заявки
    status = Column(String(50), default="pending") # Статус: pending, approved, rejected
    admin_comment = Column(Text, nullable=True) # Комментарий администратора (особенно при отклонении)
    
    # Даты создания и обработки заявки
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True) # Дата обработки заявки
    
    # Отношение к пользователю (обратная связь)
    user = relationship("User", back_populates="doctor_applications")


# Модель для хранения настроек уведомлений пользователя
class UserNotificationSettings(Base):
    __tablename__ = "user_notification_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    email_notifications = Column(Boolean, default=True) # Уведомления по email
    push_notifications = Column(Boolean, default=True) # Push-уведомления в браузере
    appointment_reminders = Column(Boolean, default=True) # Напоминания о консультациях
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Отношение к пользователю
    # Это отношение удаляем, так как оно определено в модели User с cascade
    # user = relationship("User", backref="notification_settings_rel")


# Модель для хранения информации о просмотренных уведомлениях
class ViewedNotification(Base):
    __tablename__ = "viewed_notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    application_id = Column(Integer, ForeignKey("doctor_applications.id", ondelete="CASCADE"), nullable=False)
    viewed_at = Column(DateTime, default=datetime.utcnow)

    # Отношения
    user = relationship("User", back_populates="viewed_notifications")
    application = relationship("DoctorApplication")


# Модель для консультаций между пациентом и врачом
class Consultation(Base):
    __tablename__ = "consultations"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Статус консультации
    status = Column(String(50), default="pending") # pending, active, completed, cancelled
    
    # Даты создания и завершения
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True) # Когда начата
    completed_at = Column(DateTime, nullable=True) # Когда завершена
    
    # Лимит и счетчик сообщений
    message_limit = Column(Integer, default=30) # 30 сообщений по умолчанию
    message_count = Column(Integer, default=0) # Текущее количество сообщений
    
    # Сопроводительное письмо от пациента
    patient_note = Column(Text, nullable=True) # Сопроводительное письмо от пациента
    
    # Отношения
    patient = relationship("User", foreign_keys=[patient_id])
    doctor = relationship("User", foreign_keys=[doctor_id])
    messages = relationship("Message", back_populates="consultation", cascade="all, delete-orphan")
    review = relationship("Review", back_populates="consultation", uselist=False)


# Модель для сообщений в чате
class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Текст сообщения
    content = Column(Text, nullable=False)
    
    # Роль отправителя (patient, doctor)
    sender_role = Column(String(50), nullable=False, default="patient")
    
    # ID и роль получателя
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_role = Column(String(50), nullable=False, default="doctor")
    
    # Дата отправки
    sent_at = Column(DateTime, default=datetime.utcnow)
    is_read = Column(Boolean, default=False) # Прочитано ли сообщение
    
    # Отношения
    consultation = relationship("Consultation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")


# Модель для файлов, прикрепленных к сообщениям
class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False)
    
    # Информация о файле
    filename = Column(String(255), nullable=False)  # Оригинальное имя файла
    file_path = Column(String(512), nullable=False)  # Путь к файлу на сервере
    file_size = Column(Integer, nullable=False)  # Размер файла в байтах
    content_type = Column(String(100), nullable=False)  # MIME тип файла
    
    # Дата загрузки
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Отношение к сообщению
    message = relationship("Message", back_populates="attachments")


# Модель для отзывов о консультации
class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Оценка (от 1 до 5)
    rating = Column(Integer, nullable=False)
    
    # Текст отзыва
    comment = Column(Text, nullable=True)
    
    # Дата создания
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Отношение к консультации
    consultation = relationship("Consultation", back_populates="review")


# Модель для уведомлений пользователей
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Заголовок и содержание уведомления
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Тип уведомления: system, consultation, review, etc.
    type = Column(String(50), default="system")
    
    # Прочитано ли уведомление
    is_viewed = Column(Boolean, default=False)
    
    # Ссылка на связанный объект (опционально)
    related_id = Column(Integer, nullable=True)
    
    # Дата создания
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Отношение к пользователю
    user = relationship("User")


# Модель для ожидающих подтверждения пользователей (до активации)
class PendingUser(Base):
    __tablename__ = "pending_users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="patient")
    
    # Данные профиля
    full_name = Column(String(255), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    city = Column(String(255), nullable=True) # Город/область/республика
    district = Column(String(255), nullable=True)
    contact_address = Column(String(255), nullable=True)
    medical_info = Column(Text, nullable=True)
    
    # Токен для подтверждения
    verification_token = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    # Время жизни токена - 24 часа
    expires_at = Column(DateTime, nullable=False)


# Добавляем новую модель в конце файла перед созданием таблиц
class WebSocketToken(Base):
    """
    Модель для хранения токенов WebSocket соединений.
    Каждый токен связан с пользователем и имеет ограниченный срок действия.
    """
    __tablename__ = "ws_tokens"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token = Column(String(64), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    
    # Индекс для быстрого поиска по токену и проверки срока действия
    __table_args__ = (
        Index('idx_ws_token_expiry', 'token', 'expires_at'),
    )


# Модель для хранения информации о звонках (видео/аудио)
class Call(Base):
    """
    Модель для хранения информации о звонках (видео/аудио)
    """
    __tablename__ = "calls"
    
    id = Column(Integer, primary_key=True, index=True)
    consultation_id = Column(Integer, ForeignKey("consultations.id", ondelete="CASCADE"), nullable=False)
    caller_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    call_type = Column(String(20), nullable=False)  # 'video' или 'audio'
    status = Column(String(20), default="initiated")  # initiated, ringing, active, ended, rejected
    started_at = Column(DateTime, nullable=True)
    accepted_at = Column(DateTime, nullable=True)  # когда звонок был принят
    ended_at = Column(DateTime, nullable=True)
    duration = Column(Integer, nullable=True)  # длительность в секундах
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Отношения
    consultation = relationship("Consultation")
    caller = relationship("User", foreign_keys=[caller_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    
    # Индексы для быстрого поиска
    __table_args__ = (
        Index('idx_call_status', 'status'),
        Index('idx_call_consultation', 'consultation_id'),
        Index('idx_call_created', 'created_at'),
    )


# Модель для хранения новостей здоровья и медицины
class News(Base):
    """
    Модель для хранения новостей здоровья и медицины
    """
    __tablename__ = "news"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)  # Заголовок новости
    summary = Column(Text, nullable=False)  # Краткое описание для главной страницы
    content = Column(Text, nullable=False)  # Полный текст новости
    category = Column(String(100), nullable=False)  # Категория (Кардиология, Эндокринология и т.д.)
    image_path = Column(String(512), nullable=True)  # Путь к изображению новости
    
    # Статус новости
    is_published = Column(Boolean, default=False)  # Опубликована ли новость
    is_featured = Column(Boolean, default=False)  # Рекомендуемая новость (для главной страницы)
    
    # Дополнительные поля
    read_time = Column(String(20), nullable=True)  # Время чтения (например, "5 мин")
    tags = Column(JSON, nullable=True)  # JSON массив тегов
    
    # Даты
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)  # Дата публикации
    
    # Автор (администратор)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    author = relationship("User")
    
    # Отношение к переводам
    translations = relationship("NewsTranslation", back_populates="news", cascade="all, delete-orphan")
    
    # Индексы для быстрого поиска
    __table_args__ = (
        Index('idx_news_published', 'is_published'),
        Index('idx_news_featured', 'is_featured'),
        Index('idx_news_category', 'category'),
        Index('idx_news_created', 'created_at'),
    )


# Модель для хранения переводов новостей
class NewsTranslation(Base):
    """
    Модель для хранения переводов новостей на разные языки
    """
    __tablename__ = "news_translations"
    
    id = Column(Integer, primary_key=True, index=True)
    news_id = Column(Integer, ForeignKey("news.id", ondelete="CASCADE"), nullable=False)
    language_code = Column(String(5), nullable=False)  # 'ru', 'uz', 'en'
    
    # Переведенные поля
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(100), nullable=False)
    tags = Column(JSON, nullable=True)  # Переведенные теги
    
    # Даты создания и обновления перевода
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Отношение к новости
    news = relationship("News", back_populates="translations")
    
    # Индексы
    __table_args__ = (
        Index('idx_news_translation_news_lang', 'news_id', 'language_code'),
        # Уникальная комбинация новости и языка
        UniqueConstraint('news_id', 'language_code', name='uq_news_translation'),
    )


# Модели для AI диагностики

class AIDiagnosis(Base):
    """
    Модель для хранения результатов AI диагностики
    """
    __tablename__ = "ai_diagnoses"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Входные данные
    symptoms_description = Column(Text, nullable=False)  # Описание симптомов
    patient_age = Column(Integer, nullable=True)  # Возраст пациента
    patient_gender = Column(String(10), nullable=True)  # Пол пациента
    additional_info = Column(Text, nullable=True)  # Дополнительная информация
    
    # Результаты анализа
    extracted_symptoms = Column(JSON, nullable=True)  # Обнаруженные симптомы
    possible_diseases = Column(JSON, nullable=True)  # Возможные заболевания
    recommendations = Column(JSON, nullable=True)  # Рекомендации
    urgency_level = Column(String(20), nullable=True)  # Уровень срочности
    confidence_score = Column(Float, nullable=True)  # Уровень уверенности
    
    # Метаданные
    processing_time = Column(Float, nullable=True)  # Время обработки в секундах
    model_version = Column(String(50), nullable=True)  # Версия модели
    request_id = Column(String(100), nullable=True)  # Уникальный ID запроса
    
    # Обратная связь
    feedback_rating = Column(Integer, nullable=True)  # Оценка пациента (1-5)
    feedback_comment = Column(Text, nullable=True)  # Комментарий пациента
    
    # Даты
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Отношения
    patient = relationship("User", foreign_keys=[patient_id])
    
    # Индексы
    __table_args__ = (
        Index('idx_ai_diagnosis_patient', 'patient_id'),
        Index('idx_ai_diagnosis_created', 'created_at'),
        Index('idx_ai_diagnosis_urgency', 'urgency_level'),
        Index('idx_ai_diagnosis_request', 'request_id'),
    )


class AITrainingData(Base):
    """
    Модель для хранения данных для обучения AI моделей
    """
    __tablename__ = "ai_training_data"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Источник данных
    source_name = Column(String(100), nullable=False)  # mayo_clinic, webmd, pubmed и т.д.
    source_url = Column(String(512), nullable=True)  # URL источника
    
    # Данные
    title = Column(String(255), nullable=False)  # Заголовок статьи
    content = Column(Text, nullable=False)  # Содержание статьи
    symptoms = Column(JSON, nullable=True)  # Массив симптомов
    diseases = Column(JSON, nullable=True)  # Массив заболеваний
    treatments = Column(JSON, nullable=True)  # Массив методов лечения
    
    # Метаданные
    language = Column(String(10), nullable=False, default='en')  # Язык статьи
    category = Column(String(100), nullable=True)  # Категория (кардиология, неврология и т.д.)
    quality_score = Column(Float, nullable=True)  # Оценка качества данных
    
    # Обработка
    is_processed = Column(Boolean, default=False)  # Обработано ли для обучения
    is_validated = Column(Boolean, default=False)  # Валидировано ли вручную
    
    # Даты
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Индексы
    __table_args__ = (
        Index('idx_training_data_source', 'source_name'),
        Index('idx_training_data_language', 'language'),
        Index('idx_training_data_processed', 'is_processed'),
        Index('idx_training_data_created', 'created_at'),
    )


class AIModel(Base):
    """
    Модель для хранения информации о AI моделях
    """
    __tablename__ = "ai_models"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Информация о модели
    name = Column(String(100), nullable=False)  # Название модели
    model_type = Column(String(50), nullable=False)  # Тип модели (symptom_classifier, disease_classifier)
    version = Column(String(20), nullable=False)  # Версия модели
    description = Column(Text, nullable=True)  # Описание модели
    
    # Пути к файлам
    model_path = Column(String(512), nullable=False)  # Путь к файлу модели
    config_path = Column(String(512), nullable=True)  # Путь к конфигурации
    
    # Метрики производительности
    accuracy = Column(Float, nullable=True)  # Точность
    precision = Column(Float, nullable=True)  # Точность
    recall = Column(Float, nullable=True)  # Полнота
    f1_score = Column(Float, nullable=True)  # F1 мера
    
    # Данные об обучении
    training_data_size = Column(Integer, nullable=True)  # Размер обучающей выборки
    validation_data_size = Column(Integer, nullable=True)  # Размер валидационной выборки
    training_time = Column(Float, nullable=True)  # Время обучения в секундах
    epochs = Column(Integer, nullable=True)  # Количество эпох обучения
    
    # Статус
    is_active = Column(Boolean, default=False)  # Активна ли модель
    is_production = Column(Boolean, default=False)  # Используется ли в продакшене
    
    # Даты
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Индексы
    __table_args__ = (
        Index('idx_ai_model_name_version', 'name', 'version'),
        Index('idx_ai_model_type', 'model_type'),
        Index('idx_ai_model_active', 'is_active'),
        Index('idx_ai_model_production', 'is_production'),
        # Уникальная комбинация имени и версии
        UniqueConstraint('name', 'version', name='uq_ai_model_name_version'),
    )


class AIModelTraining(Base):
    """
    Модель для хранения истории обучения AI моделей
    """
    __tablename__ = "ai_model_training"
    
    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey("ai_models.id", ondelete="CASCADE"), nullable=False)
    
    # Параметры обучения
    training_parameters = Column(JSON, nullable=True)  # Параметры обучения
    training_data_ids = Column(JSON, nullable=True)  # ID данных для обучения
    
    # Результаты
    training_log = Column(Text, nullable=True)  # Лог обучения
    final_metrics = Column(JSON, nullable=True)  # Итоговые метрики
    
    # Статус
    status = Column(String(20), default='pending')  # pending, training, completed, failed
    error_message = Column(Text, nullable=True)  # Сообщение об ошибке
    
    # Время
    started_at = Column(DateTime, nullable=True)  # Время начала обучения
    completed_at = Column(DateTime, nullable=True)  # Время завершения обучения
    duration = Column(Float, nullable=True)  # Продолжительность в секундах
    
    # Метаданные
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)  # Кто запустил обучение
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Отношения
    model = relationship("AIModel")
    creator = relationship("User", foreign_keys=[created_by])
    
    # Индексы
    __table_args__ = (
        Index('idx_training_model', 'model_id'),
        Index('idx_training_status', 'status'),
        Index('idx_training_created', 'created_at'),
    )


class AIFeedback(Base):
    """
    Модель для хранения обратной связи пользователей по AI диагностике
    """
    __tablename__ = "ai_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    diagnosis_id = Column(Integer, ForeignKey("ai_diagnoses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Обратная связь
    rating = Column(Integer, nullable=False)  # Оценка 1-5
    comment = Column(Text, nullable=True)  # Комментарий
    
    # Детальная оценка
    symptoms_accuracy = Column(Integer, nullable=True)  # Точность определения симптомов
    disease_accuracy = Column(Integer, nullable=True)  # Точность определения заболеваний
    recommendations_usefulness = Column(Integer, nullable=True)  # Полезность рекомендаций
    
    # Дополнительная информация
    actual_diagnosis = Column(String(255), nullable=True)  # Реальный диагноз врача
    doctor_feedback = Column(Text, nullable=True)  # Комментарий врача
    
    # Даты
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Отношения
    diagnosis = relationship("AIDiagnosis")
    user = relationship("User", foreign_keys=[user_id])
    
    # Индексы
    __table_args__ = (
        Index('idx_ai_feedback_diagnosis', 'diagnosis_id'),
        Index('idx_ai_feedback_user', 'user_id'),
        Index('idx_ai_feedback_rating', 'rating'),
        Index('idx_ai_feedback_created', 'created_at'),
    )


# Модели для разговорной AI системы

class AIConversation(Base):
    """
    Модель для хранения сессий разговора с AI врачом
    """
    __tablename__ = "ai_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), unique=True, nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Информация о пациенте на момент разговора
    patient_info = Column(JSON, nullable=True)  # Возраст, пол, базовая информация
    
    # Контекст разговора
    current_symptoms = Column(JSON, nullable=True)  # Текущие симптомы
    suspected_conditions = Column(JSON, nullable=True)  # Подозреваемые состояния
    urgency_level = Column(String(20), default='low')  # low, medium, high, critical
    conversation_stage = Column(String(50), default='greeting')  # greeting, history_taking, assessment, recommendation
    
    # Статус разговора
    status = Column(String(20), default='active')  # active, completed, abandoned
    
    # Даты
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    
    # Итоговые данные
    final_recommendations = Column(JSON, nullable=True)  # Финальные рекомендации
    conversation_summary = Column(Text, nullable=True)  # Краткое изложение разговора
    
    # Отношения
    patient = relationship("User", foreign_keys=[patient_id])
    messages = relationship("AIConversationMessage", back_populates="conversation", cascade="all, delete-orphan")
    
    # Индексы
    __table_args__ = (
        Index('idx_ai_conv_session', 'session_id'),
        Index('idx_ai_conv_patient', 'patient_id'),
        Index('idx_ai_conv_status', 'status'),
        Index('idx_ai_conv_created', 'created_at'),
        Index('idx_ai_conv_urgency', 'urgency_level'),
    )


class AIConversationMessage(Base):
    """
    Модель для хранения сообщений в разговоре с AI врачом
    """
    __tablename__ = "ai_conversation_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False)
    
    # Роль отправителя
    sender_role = Column(String(20), nullable=False)  # 'patient' или 'ai_doctor'
    
    # Содержание сообщения
    message = Column(Text, nullable=False)
    
    # Контекст сообщения
    message_context = Column(JSON, nullable=True)  # Дополнительная информация
    
    # Метаданные
    processing_time = Column(Float, nullable=True)  # Время обработки AI (для сообщений врача)
    confidence_score = Column(Float, nullable=True)  # Уверенность AI в ответе
    
    # Дата отправки
    sent_at = Column(DateTime, default=datetime.utcnow)
    
    # Отношения
    conversation = relationship("AIConversation", back_populates="messages")
    
    # Индексы
    __table_args__ = (
        Index('idx_ai_msg_conversation', 'conversation_id'),
        Index('idx_ai_msg_sender', 'sender_role'),
        Index('idx_ai_msg_sent', 'sent_at'),
    )


class AIConversationFeedback(Base):
    """
    Модель для хранения обратной связи по разговорам с AI врачом
    """
    __tablename__ = "ai_conversation_feedback"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False)
    patient_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Общая оценка разговора
    overall_rating = Column(Integer, nullable=False)  # 1-5 звезд
    
    # Детализированная оценка
    conversation_quality = Column(Integer, nullable=True)  # Качество разговора
    medical_accuracy = Column(Integer, nullable=True)  # Медицинская точность
    helpfulness = Column(Integer, nullable=True)  # Полезность рекомендаций
    ai_empathy = Column(Integer, nullable=True)  # Эмпатия AI
    
    # Текстовые комментарии
    comment = Column(Text, nullable=True)
    improvement_suggestions = Column(Text, nullable=True)
    
    # Результат разговора
    was_helpful = Column(Boolean, nullable=True)
    would_recommend = Column(Boolean, nullable=True)
    
    # Дата создания
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Отношения
    conversation = relationship("AIConversation")
    patient = relationship("User", foreign_keys=[patient_id])
    
    # Индексы
    __table_args__ = (
        Index('idx_ai_conv_feedback_conversation', 'conversation_id'),
        Index('idx_ai_conv_feedback_patient', 'patient_id'),
        Index('idx_ai_conv_feedback_rating', 'overall_rating'),
        Index('idx_ai_conv_feedback_created', 'created_at'),
    )


class AIConversationTraining(Base):
    """
    Модель для хранения данных обучения на основе разговоров
    """
    __tablename__ = "ai_conversation_training"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False)
    
    # Данные для обучения
    training_data = Column(JSON, nullable=False)  # Структурированные данные разговора
    
    # Метки для обучения
    correct_responses = Column(JSON, nullable=True)  # Правильные ответы (если есть)
    incorrect_responses = Column(JSON, nullable=True)  # Неправильные ответы
    
    # Статус обработки
    is_processed = Column(Boolean, default=False)
    is_validated = Column(Boolean, default=False)
    
    # Качество данных
    quality_score = Column(Float, nullable=True)
    
    # Дата создания
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Отношения
    conversation = relationship("AIConversation")
    
    # Индексы
    __table_args__ = (
        Index('idx_ai_conv_training_conversation', 'conversation_id'),
        Index('idx_ai_conv_training_processed', 'is_processed'),
        Index('idx_ai_conv_training_quality', 'quality_score'),
        Index('idx_ai_conv_training_created', 'created_at'),
    )


# Создание всех таблиц
Base.metadata.create_all(bind=engine)

# TODO: Определить модели для других сущностей: