# backend/schemas.py

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Union # Добавляем List и Union
from datetime import datetime


# --- Pydantic модели для базовых пользователей и аутентификации ---

# Модель для данных, приходящих при регистрации
class UserCreate(BaseModel):
    email: EmailStr # FastAPI/Pydantic автоматически проверит, что это валидный email
    password: str = Field(..., min_length=8) # Пароль, обязателен, мин. длина 8 символов
    # Role validation: must be 'patient', 'doctor', or 'admin'
    role: str = Field("patient", pattern="^(patient|doctor|admin)$")
    # Дополнительные поля для создания профиля
    full_name: Optional[str] = None
    contact_phone: Optional[str] = None
    city: Optional[str] = None  # Город/область/республика
    district: Optional[str] = None
    contact_address: Optional[str] = None
    medical_info: Optional[str] = None


# Модель для данных, возвращаемых после регистрации и при получении информации о пользователе (включая is_active)
class UserResponse(BaseModel):
    """Схема ответа с информацией о пользователе"""
    id: int
    email: str
    role: str
    is_active: bool
    avatar_path: Optional[str] = None
    auth_provider: Optional[str] = "email"  # Изменено на Optional для обратной совместимости
    created_at: Optional[datetime] = None  # Дата регистрации
    # Дополнительные поля из профилей (для админ панели)
    full_name: Optional[str] = None
    contact_phone: Optional[str] = None
    city: Optional[str] = None
    district: Optional[str] = None
    contact_address: Optional[str] = None
    
    class Config:
        from_attributes = True


# Базовая информация о пользователе для вложения в другие ответы
class UserBasicInfo(BaseModel):
    id: int
    email: str
    role: str
    avatar_path: Optional[str] = None
    
    class Config:
        from_attributes = True


# Модель для возврата токена при авторизации
class Token(BaseModel):
    access_token: str
    token_type: str


# --- Pydantic модели для профилей Пациента и Врача ---

# Модель для данных, приходящих при создании или обновлении профиля Пациента
class PatientProfileCreateUpdate(BaseModel):
    # Optional указывает, что поле не обязательно для заполнения.
    # Field(None, ...) указывает значение по умолчанию None, если поле отсутствует в запросе.
    # max_length добавляет валидацию длины строки.
    full_name: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=50)
    contact_address: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=255)  # Город/область/республика
    district: Optional[str] = Field(None, max_length=255)  # Убираю дефолтное значение
    country: Optional[str] = Field(default="Узбекистан", max_length=255)  # Страна
    medical_info: Optional[str] = None


# Модель для данных, возвращаемых при запросе профиля Пациента
class PatientProfileResponse(BaseModel):
    id: int
    user_id: int # ID связанного пользователя
    full_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_address: Optional[str] = None
    city: Optional[str] = None  # Город/область/республика
    district: Optional[str] = None
    country: Optional[str] = None  # Страна
    medical_info: Optional[str] = None
    user: Optional[UserBasicInfo] = None  # Добавляем информацию о пользователе с аватаром

    # Настройка для работы с SQLAlchemy ORM
    class Config:
        from_attributes = True


# Модель для данных, приходящих при создании или обновлении профиля Врача
class DoctorProfileCreateUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=255)
    specialization: str = Field(..., max_length=255) # Специализация обязательна. '...' указывает, что поле обязательное.
    experience: Optional[str] = Field(None, max_length=255)
    education: Optional[str] = Field(None, max_length=1000) # Текст образования может быть длиннее
    
    # Новые поля для опыта работы
    work_experience: Optional[List[dict]] = None  # Массив с опытом работы
    
    # Местоположение врача
    city: Optional[str] = Field(None, max_length=255)
    country: Optional[str] = Field(default="Узбекистан", max_length=255)
    
    # Языки, на которых говорит врач
    languages: Optional[List[str]] = None
    
    # Стоимость консультации, обязательна, должна быть больше 0
    cost_per_consultation: int = Field(..., gt=0) # gt=0 - greater than 0
    
    # Старые поля (оставляем для совместимости)
    practice_areas: Optional[str] = Field(None, max_length=511)
    district: Optional[str] = Field(None, max_length=255)  # Убираю дефолтное значение
    is_active: Optional[bool] = None  # Поле для активации/деактивации профиля (только врач может менять)
    # Поле is_verified не включаем в модель для создания/обновления, т.к. его устанавливает Администратор


# Модель для данных, возвращаемых при запросе профиля Врача
class DoctorProfileResponse(BaseModel):
    id: int
    user_id: int # ID связанного пользователя
    full_name: Optional[str] = None
    specialization: str
    experience: Optional[str] = None
    education: Optional[str] = None
    
    # Новые поля для опыта работы
    work_experience: Optional[List[dict]] = None
    
    # Местоположение врача
    city: Optional[str] = None
    country: Optional[str] = None
    
    # Языки, на которых говорит врач
    languages: Optional[List[str]] = None
    
    cost_per_consultation: int
    
    # Старые поля (оставляем для совместимости)
    practice_areas: Optional[str] = None
    district: Optional[str] = None  # Убираю дефолтное значение
    
    is_verified: bool # Статус верификации (переименовано из "Проверенный врач" в "Верифицированный врач")
    is_active: bool # Статус активности врача (доступен ли для консультаций)
    user: Optional[UserBasicInfo] = None  # Добавляем информацию о пользователе с аватаром

    # Настройка для работы с SQLAlchemy ORM
    class Config:
        from_attributes = True


# --- Pydantic модели для заявок на роль врача ---

# Модель для создания заявки на роль врача
class DoctorApplicationCreate(BaseModel):
    full_name: str = Field(..., max_length=255)
    specialization: str = Field(..., max_length=255)
    experience: str = Field(..., max_length=255)
    education: str = Field(..., max_length=1000)
    license_number: str = Field(..., max_length=255)
    city: Optional[str] = Field(None, max_length=255)  # Город/регион
    district: Optional[str] = Field(None, max_length=255)  # Район
    languages: Optional[List[str]] = None  # Языки консультаций
    additional_info: Optional[str] = Field(None, max_length=2000)
    # Пути к файлам будут добавлены отдельно после успешной загрузки


# Модель для ответа с данными заявки
class DoctorApplicationResponse(BaseModel):
    id: int
    user_id: int
    full_name: str
    specialization: str
    experience: str
    education: str
    license_number: str
    city: Optional[str] = None  # Город/регион
    district: Optional[str] = None  # Район
    languages: Optional[List[str]] = None  # Языки консультаций
    photo_path: Optional[str] = None
    diploma_path: Optional[str] = None
    license_path: Optional[str] = None
    additional_info: Optional[str] = None
    status: str
    admin_comment: Optional[str] = None
    created_at: datetime
    processed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Модель для администратора при обработке заявки
class DoctorApplicationProcessRequest(BaseModel):
    status: str = Field(..., pattern="^(approved|rejected)$")
    admin_comment: Optional[str] = Field(None, max_length=1000)


# Модель для списка заявок с пагинацией
class DoctorApplicationListResponse(BaseModel):
    items: List[DoctorApplicationResponse]
    total: int
    page: int
    size: int
    pages: int


# --- Pydantic модели для поиска и фильтрации врачей ---

# Модель для параметров фильтрации врачей
class DoctorFilter(BaseModel):
    specialization: Optional[str] = None  # Специализация для фильтрации
    city: Optional[str] = None            # Город для фильтрации (вместо района)
    country: Optional[str] = None         # Страна для фильтрации
    language: Optional[str] = None        # Язык для фильтрации
    min_price: Optional[int] = None       # Минимальная стоимость консультации
    max_price: Optional[int] = None       # Максимальная стоимость консультации
    # Старые поля для совместимости
    practice_area: Optional[str] = None   # Район практики для фильтрации (deprecated)

# Модель для краткой информации о враче (для списка)
class DoctorBrief(BaseModel):
    id: int                      # ID профиля врача
    user_id: int                 # ID пользователя
    full_name: Optional[str]     # ФИО врача
    specialization: str          # Специализация
    cost_per_consultation: int   # Стоимость консультации
    
    # Новые поля
    city: Optional[str] = None           # Город врача
    country: Optional[str] = None        # Страна врача
    languages: Optional[List[str]] = None # Языки врача
    
    # Старые поля для совместимости
    district: Optional[str] = None       # Район практики врача (deprecated)
    experience: Optional[str] = None     # Опыт работы врача
    
    is_verified: bool            # Статус верификации (Верифицированный врач)

    class Config:
        from_attributes = True

# Модель для подробной информации о враче (для детальной страницы)
class DoctorDetail(DoctorProfileResponse):
    # Наследуем все поля из DoctorProfileResponse и при необходимости
    # можем добавить дополнительные поля, такие как рейтинг, кол-во отзывов и т.д.
    rating: Optional[float] = None  # Средний рейтинг врача (заглушка)
    reviews_count: Optional[int] = None  # Количество отзывов (заглушка)

    class Config:
        from_attributes = True

# Модель для списка врачей с пагинацией (для ответа API)
class DoctorListResponse(BaseModel):
    items: List[DoctorBrief]       # Список врачей
    total: int                     # Общее количество врачей (для пагинации)
    page: int                      # Текущая страница
    size: int                      # Размер страницы (количество элементов на странице)
    pages: int                     # Общее количество страниц

# Схемы для звонков
class CallCreate(BaseModel):
    consultation_id: int
    receiver_id: int
    call_type: str = Field(..., description="Тип звонка: 'video' или 'audio'")

class CallResponse(BaseModel):
    id: int
    consultation_id: int
    caller_id: int
    receiver_id: int
    call_type: str
    status: str
    started_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class CallUpdate(BaseModel):
    status: str = Field(..., description="Новый статус звонка")

class CallListResponse(BaseModel):
    calls: List[CallResponse]
    total: int

# TODO: Добавить Pydantic модели для других сущностей:
# class ConsultationCreate(BaseModel): ...
# class ConsultationResponse(BaseModel): ...
# class MessageCreate(BaseModel): ...
# class MessageResponse(BaseModel): ...
# class ReviewCreate(BaseModel): ...
# class ReviewResponse(BaseModel): ...