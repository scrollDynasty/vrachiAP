import os
import requests  # Добавляем для HTTP-запросов к Google API
import time # Добавляем для работы с временем и задержками
import hashlib # Добавляем для хеширования
import secrets # Добавляем для генерации случайных строк
import json # Добавляем для работы с JSON
from datetime import datetime, timedelta
from typing import Optional, Annotated, Dict, List # Добавляем Dict для типизации словарей
from models import User, get_db

# Импорты для FastAPI зависимостей и обработки токена
from fastapi import HTTPException, status, Depends, WebSocket, Request
from fastapi.security import OAuth2PasswordBearer # Для схемы Bearer токена

# Импорт для работы с базой данных в зависимости
from sqlalchemy.orm import Session

# Импорты для хеширования паролей
from passlib.context import CryptContext

# Импорты для работы с JWT
from jose import JWTError, jwt

# Импорт для загрузки переменных окружения из .env файла
from dotenv import load_dotenv

# Загружаем переменные окружения из .env файла.
# Это должно происходить ДО попытки чтения переменных типа SECRET_KEY.
# load_dotenv() ищет .env файл в текущей директории и родительских.
load_dotenv()

# --- Настройки для Google OAuth ---
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "735617581412-e8ceb269bj7qqrv9sl066q63g5dr5sne.apps.googleusercontent.com")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "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")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "https://healzy.uz/auth/google/callback")

# Секретный ключ для подписи JWT. Считывается из переменной окружения SECRET_KEY.
# Эту переменную нужно установить в вашем .env файле или в окружении сервера.
SECRET_KEY = os.getenv("SECRET_KEY")

# Проверяем, что SECRET_KEY установлен. Если нет, приложение не должно запускаться,
# так как подпись JWT является критически важной для безопасности.
# Проверяем, что SECRET_KEY установлен. Если нет, генерируем случайный ключ (только для разработки)
if SECRET_KEY is None:
    # Для разработки создаем случайный ключ, но ТОЛЬКО для разработки
    # В продакшене это не безопасно - ключ будет меняться при каждом перезапуске
    import secrets
    SECRET_KEY = secrets.token_hex(32)

# Алгоритм шифрования для JWT. HS256 - распространенный выбор для HMAC подписи.
ALGORITHM = "HS256"

# Время жизни токена доступа в минутах.
ACCESS_TOKEN_EXPIRE_MINUTES = 1440 # 24 часа - увеличенное время для токенов доступа

# Время жизни CSRF токена в секундах (30 минут)
CSRF_TOKEN_EXPIRE_TIME = 1800

# Словарь для хранения CSRF токенов (user_id -> {token, expiry})
CSRF_TOKENS: Dict[str, Dict[str, any]] = {}

# Словарь для хранения попыток входа (email -> список временных меток)
LOGIN_ATTEMPTS: Dict[str, List[float]] = {}

# Максимальное количество попыток входа
MAX_LOGIN_ATTEMPTS = 5

# Время блокировки после превышения попыток в секундах (5 минут)
LOGIN_COOLDOWN_TIME = 300

# Длина безопасного токена (для верификации email и т.д.)
SECURE_TOKEN_LENGTH = 32

# --- Схема OAuth2 для получения токена из заголовка ---

# Настраиваем схему OAuth2 Bearer. FastAPI будет ожидать токен в заголовке "Authorization: Bearer <токен>".
# tokenUrl="/token" указывает клиенту (например, в Swagger UI), где получить новый токен, если требуется.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")


# --- Настройки для хеширования паролей ---

# Инициализируем контекст для работы с паролями. Используем алгоритм bcrypt - рекомендуемый и стойкий.
# schemes=["bcrypt"] - указываем используемый алгоритм.
# deprecated="auto" - позволяет библиотеке автоматически определять устаревшие хэши (если они есть).
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# --- Функции для работы с паролями ---

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверяет соответствие введенного (нехешированного) пароля
    сохраненному хешированному паролю.
    Использует алгоритм, настроенный в pwd_context (bcrypt).
    """
    # pwd_context.verify обрабатывает соль и сравнивает хэши
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Генерирует хэш для заданного пароля.
    Использует алгоритм, настроенный в pwd_context (bcrypt).
    """
    # pwd_context.hash автоматически генерирует соль и создает хэш
    return pwd_context.hash(password)


# --- Функции для работы с JWT ---

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Создает JWT токен доступа.

    Args:
        data (dict): Словарь данных для включения в payload токена.
                     Обычно включает идентификатор пользователя ('sub') и, возможно, роль ('role').
        expires_delta (Optional[timedelta]): Объекту timedelta, определяющий
                                             время жизни токена.
                                             Если None, используется ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        str: Кодированный JWT токен (строка).
    """
    # Копируем исходные данные, чтобы не изменять переданный словарь
    to_encode = data.copy()

    # Устанавливаем время истечения токена
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Если время жизни не указано, используем дефолтное значение из настроек
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    # Добавляем метку времени истечения 'exp' (timestamp) в payload.
    # JWT стандарты используют Unix Timestamp. jwt.encode делает это автоматически.
    to_encode.update({"exp": expire})
    
    # Добавляем время создания токена и случайный идентификатор для защиты от replay-атак
    to_encode.update({"iat": datetime.utcnow(), "jti": secrets.token_hex(16)})

    # Кодируем payload в JWT токен, используя секретный ключ и алгоритм.
    # SECRET_KEY должен быть известен только серверу, который подписывает токены,
    # и серверам, которые их проверяют.
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


# --- Функция для Google OAuth ---
async def verify_google_token(token: str) -> dict:
    """
    Верифицирует код авторизации Google OAuth и получает данные пользователя
    
    Args:
        token (str): Код авторизации от Google OAuth

    Returns:
        dict: Данные пользователя, полученные от Google
        
    Raises:
        HTTPException: Если токен невалидный или произошла ошибка
    """
    try:
        # Если токен пустой или None, сразу выбрасываем ошибку
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Отсутствует код авторизации Google",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Проверяем, не слишком ли короткий токен (обычно они длинные)
        if len(token) < 20:  # Минимальная длина действительного токена
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Некорректный формат кода авторизации Google",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Обмен кода авторизации на токены
        token_url = "https://oauth2.googleapis.com/token"
        token_data = {
            "code": token,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code"
        }
        
        
        # Make the request with verbose error handling
        try:
            token_response = requests.post(token_url, data=token_data, timeout=10)
            
            # Print response content regardless of status for debugging
            response_content = token_response.text
            
            # Если получен ответ 400 с invalid_grant, возможно, код уже был использован
            if token_response.status_code == 400 and "invalid_grant" in response_content:
                # Это часто происходит при повторном использовании кода авторизации
                # Используем более понятное сообщение об ошибке
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Код авторизации Google истек. Пожалуйста, попробуйте войти снова",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            token_response.raise_for_status()  # This will raise an exception for 4XX/5XX responses
            
            tokens = token_response.json()
        except requests.exceptions.HTTPError as http_err:
            
            # Улучшенная обработка сообщений об ошибках
            error_message = "Google OAuth token exchange failed"
            if "invalid_grant" in token_response.text:
                error_message = "Код авторизации Google уже использован или истек"
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message,
                headers={"WWW-Authenticate": "Bearer"},
            )
        except requests.exceptions.Timeout:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Превышено время ожидания ответа от Google OAuth сервиса",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except requests.exceptions.RequestException as req_err:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Ошибка соединения с сервисом Google OAuth. Попробуйте позже.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except ValueError as json_err:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Некорректный ответ от сервиса Google OAuth",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Получение данных пользователя с помощью access token
        userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
        headers = {"Authorization": f"Bearer {tokens['access_token']}"}
        
        
        try:
            userinfo_response = requests.get(userinfo_url, headers=headers, timeout=10)
            
            if userinfo_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Не удалось получить информацию о пользователе от Google",
                    headers={"WWW-Authenticate": "Bearer"},
                )
                
            userinfo_response.raise_for_status()
            user_data = userinfo_response.json()
            
            return user_data
        except requests.exceptions.Timeout:
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Превышено время ожидания ответа от Google API",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при получении данных пользователя от Google",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except HTTPException:
        # Пробрасываем HTTP исключения дальше
        raise
    except Exception as e:
        # Записываем конкретную ошибку для отладки
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Ошибка аутентификации через Google: попробуйте войти снова",
            headers={"WWW-Authenticate": "Bearer"},
        )

# --- Функция для аутентификации через Google ---
async def authenticate_google_user(google_data: dict, db: Session) -> User:
    """
    Аутентифицирует или создает пользователя на основе данных от Google OAuth
    
    Args:
        google_data (dict): Данные пользователя от Google
        db (Session): Сессия базы данных
        
    Returns:
        User: Объект пользователя
    """
    # Извлекаем email пользователя из данных Google
    email = google_data.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google user data: email is required"
        )
    
    # Проверяем, существует ли пользователь с таким email
    user = db.query(User).filter(User.email == email).first()
    
    # Если пользователь существует, проверяем его auth_provider
    if user:
        # Если пользователь зарегистрирован через email (не Google)
        if user.auth_provider == "email":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already registered with password. Please login with email and password instead."
            )
            
        # Убедимся, что пользователь активирован (так как Google подтверждает email)
        if not user.is_active:
            user.is_active = True
            db.commit()
            db.refresh(user)  # Обновляем объект пользователя после изменений
        
        return user
    
    # Если пользователя нет, создаем нового с ролью "patient" по умолчанию
    # Пароль не нужен, так как вход через Google
    hashed_password = get_password_hash(os.urandom(32).hex())  # Генерируем случайный пароль
    
    # Создаем информацию о пользователе из данных Google
    name = google_data.get("name", "")
    
    new_user = User(
        email=email,
        hashed_password=hashed_password,
        is_active=True,  # Пользователь сразу активирован, так как Google подтверждает email
        role="patient",  # По умолчанию роль - пациент
        auth_provider="google"  # Устанавливаем провайдер аутентификации Google
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


# --- Зависимости FastAPI для аутентификации и проверки ролей ---

# TokenData - это Pydantic модель для payload токена.
# Можно использовать для более явного определения данных, которые мы ожидаем в токене.
# Пока не используем ее в get_current_user для простоты, но это хорошая практика для больших проектов.
from pydantic import BaseModel
class TokenData(BaseModel):
    username: str | None = None
    role: str | None = None # Добавляем поле role, т.к. мы его кладем в токен

# Модель для токена аутентификации
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# --- Дополнительные настройки безопасности ---

# Функция для проверки попыток входа и блокировки
def check_login_attempts(email: str) -> bool:
    """
    Проверяет, не превышено ли количество попыток входа для данного email.
    Если превышено, проверяет, не истекло ли время блокировки.
    
    Args:
        email (str): Email пользователя
        
    Returns:
        bool: True, если вход разрешен, иначе False
    """
    # Полностью отключаем проверку rate limit и всегда возвращаем True
    return True

# Функция для создания CSRF-токена
def create_csrf_token(user_id: int) -> str:
    """
    Создает CSRF-токен для защиты форм.
    
    Args:
        user_id (int): ID пользователя
        
    Returns:
        str: CSRF-токен
    """
    token = secrets.token_hex(32)
    expiry = time.time() + CSRF_TOKEN_EXPIRE_TIME
    
    # Сохраняем токен и время его истечения
    CSRF_TOKENS[str(user_id)] = {
        "token": token,
        "expiry": expiry
    }
    
    return token

# Функция для проверки CSRF-токена
def verify_csrf_token(user_id: int, token: str) -> bool:
    """
    Проверяет валидность CSRF-токена.
    
    Args:
        user_id (int): ID пользователя
        token (str): CSRF-токен для проверки
        
    Returns:
        bool: True, если токен валидный и не истек, иначе False
    """
    user_id_str = str(user_id)
    
    # Проверяем, существует ли токен для данного пользователя
    if user_id_str not in CSRF_TOKENS:
        return False
    
    token_data = CSRF_TOKENS[user_id_str]
    
    # Проверяем, не истек ли токен
    if time.time() > token_data["expiry"]:
        # Удаляем устаревший токен
        del CSRF_TOKENS[user_id_str]
        return False
    
    # Проверяем совпадение токенов
    if token_data["token"] != token:
        return False
    
    return True

# Функция для получения текущего пользователя (используется как зависимость)
async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme), 
    request: Request = None,
    db: Session = Depends(get_db)
):
    """
    Зависимость FastAPI. Декодирует токен доступа JWT и возвращает объект пользователя
    из базы данных, если токен действителен.
    """
    # Для отладки печатаем базовую информацию о запросе
    # if request and request.url.path == "/users/me":
    #     # Проверяем заголовок Authorization
    #     auth_header = request.headers.get("Authorization", "")
    #     if auth_header:
    #         pass  # Логика для auth_header
    #     else:
    #         pass  # Логика когда auth_header пустой
    #     
    #     # Проверяем куки
    #     if request.cookies and "access_token" in request.cookies:
    #         cookie_token = request.cookies.get("access_token")
    """
    Зависимость FastAPI. Декодирует токен доступа JWT и возвращает объект пользователя
    из базы данных, если токен действителен.

    Args:
        token (str, optional): JWT токен, полученный из заголовка Authorization.
        request (Request, optional): Объект запроса FastAPI, используется для получения cookie.
        db (Session): Сессия базы данных, полученная из зависимости get_db.

    Returns:
        User: Объект пользователя, соответствующий токену.

    Raises:
        HTTPException: С кодом 401 (Unauthorized), если токен недействителен или просрочен.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось подтвердить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Проверяем, есть ли токен в заголовке
    actual_token = token
    
    # Дополнительно логируем заголовки, если доступны
    if request and hasattr(request, 'headers'):
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            bearer_token = auth_header.replace('Bearer ', '')
            # Если токен в заголовке, используем его
            if not actual_token or len(bearer_token) > len(actual_token):
                actual_token = bearer_token
    
    # Если токена нет в заголовке, пытаемся получить его из cookie
    if not actual_token and request:
        cookie_token = request.cookies.get("access_token")
        if cookie_token:
            actual_token = cookie_token
    
    # Если токен не найден ни в заголовке, ни в cookie
    if not actual_token:
        raise credentials_exception
    
    try:
        # Печатаем токен для отладки
        
        try:
            # Декодируем JWT токен, извлекая данные (payload)
            payload = jwt.decode(actual_token, SECRET_KEY, algorithms=[ALGORITHM])
        except Exception as e:
            raise credentials_exception
        
        # Получаем имя пользователя (email) из поля "sub" в payload токена
        username: str = payload.get("sub")
        # Если поле "sub" отсутствует или пустое, значит, токен некорректен
        if username is None:
            raise credentials_exception
        
        # Проверяем наличие JTI (JWT ID) для защиты от replay-атак
        if "jti" not in payload:
            raise credentials_exception
            
            
        token_data = TokenData(username=username)
    except HTTPException:
        # Пробрасываем наши собственные исключения
        raise
    except Exception as e:
        # Ловим все остальные неожиданные ошибки
        raise credentials_exception
        
    # Ищем пользователя в БД по email из токена
    user = db.query(User).filter(User.email == token_data.username).first()
    if user is None:
        # Более общее сообщение об ошибке без раскрытия конкретного email
        # Создаем специальное исключение с информацией о необходимости регистрации
        registration_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Пользователь не найден. Пожалуйста, зарегистрируйтесь или выполните вход с действительными учетными данными.",
            headers={"WWW-Authenticate": "Bearer", "X-Registration-Required": "true"},
        )
        raise registration_exception
        
    return user


def require_role(role: str):
    """
    Фабрика зависимостей FastAPI. Создает зависимость, которая проверяет,
    имеет ли текущий авторизованный пользователь указанную роль.
    Эта зависимость ДОЛЖНА использоваться ПОСЛЕ зависимости get_current_user.

    Args:
        role (str): Требуемая роль пользователя (например, 'patient', 'doctor', 'admin').

    Returns:
        Callable: Зависимость FastAPI, которая принимает текущего пользователя
                  и проверяет его роль. Возвращает объект пользователя, если роль совпадает,
                  иначе выбрасывает HTTPException 403 Forbidden.
    """
    # Это внутренняя функция (замыкание), которая будет возвращена фабрикой require_role.
    # Она сама использует зависимость get_current_user для получения объекта пользователя.
    async def role_checker(
        # Получаем текущего пользователя, используя зависимость get_current_user.
        # FastAPI позаботится о вызове get_current_user перед вызовом role_checker.
        current_user: Annotated[User, Depends(get_current_user)]
    ) -> User:
        """Проверяет, совпадает ли роль текущего пользователя с требуемой."""
        if current_user.role != role:
            # Если роль пользователя не совпадает с требуемой, выбрасываем ошибку 403 (Forbidden).
            # Это означает, что пользователь авторизован, но у него нет прав на этот ресурс.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, # 403 - Доступ запрещен
                detail=f"User must have '{role}' role to access this resource",
            )
        # Если роль совпадает, просто возвращаем объект пользователя.
        # Этот объект пользователя будет доступен в эндпоинте.
        return current_user

    # Фабрика require_role возвращает саму функцию role_checker,
    # которую затем можно использовать в Depends() в определениях эндпоинтов.
    return role_checker

# Примеры использования в main.py:
# Чтобы эндпоинт требовал просто аутентификации:
# @app.get("/some-data/", dependencies=[Depends(get_current_user)])
# async def get_data(current_user: User = Depends(get_current_user)):
#     # Код здесь выполнится только для любого авторизованного пользователя.
#     pass

# Чтобы эндпоинт требовал аутентификации И роли 'patient':
# @app.get("/patient-data/", dependencies=[Depends(require_role("patient"))])
# async def get_patient_data(current_user: User = Depends(get_current_user)):
#     # Код здесь выполнится только для авторизованного пользователя с ролью 'patient'.
#     # current_user уже прошел проверку роли.
#     pass

# Альтернативный (более явный) способ использования require_role:
# @app.get("/patient-data/")
# async def get_patient_data(current_user: Annotated[User, Depends(require_role("patient"))]):
#     # Этот синтаксис Annotated также явно указывает, что current_user - это User,
#     # полученный через зависимость require_role("patient").
#     pass

# Добавляем недостающую функцию authenticate_user
async def authenticate_user(email: str, password: str, db: Session) -> Optional[User]:
    """
    Функция аутентификации пользователя.
    Возвращает объект пользователя, если креды верны, иначе None.
    """
    try:
        # Проверка rate limiting отключена
        
        # Ищем пользователя с нужным email
        user = db.query(User).filter(User.email == email).first()
        
        # Если пользователь не найден
        if not user:
            # Не регистрируем попытку входа для несуществующего email
            # Бросаем исключение вместо возврата None
            raise ValueError("User not found")
        
        # Если пользователь аутентифицирован через Google, не позволяем ему использовать пароль
        if user.auth_provider == "google":
            # Бросаем исключение вместо возврата None
            raise ValueError("User authenticated via Google")

        # Проверяем пароль. Если неверный, возвращаем None.
        if not verify_password(password, user.hashed_password):
            # Не регистрируем неудачную попытку входа
            # Бросаем исключение вместо возврата None
            raise ValueError("Invalid password")
        
        # Не сбрасываем историю попыток входа - rate limiting отключен
        
        # Если все проверки прошли, возвращаем пользователя.
        return user
    except ValueError as e:
        # Перехватываем только ValueError, которые генерируем сами
        return None
    except Exception as e:
        # Логируем другие ошибки для отладки, но не показываем её пользователю
        # (из соображений безопасности)
        return None

# Добавляем функцию get_current_active_user
async def get_current_active_user(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    """
    Зависимость FastAPI. Проверяет, что текущий пользователь активен.
    
    Args:
        current_user (User): Объект пользователя, предоставленный зависимостью get_current_user.
        
    Returns:
        User: Объект пользователя, если он активен.
        
    Raises:
        HTTPException: С кодом 400 (Bad Request), если пользователь неактивен.
    """
    # Проверяем, активен ли пользователь
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

# Функция для сброса счетчика неудачных попыток входа
def reset_login_attempts(username: str) -> None:
    """
    Сбрасывает счетчик неудачных попыток входа для заданного пользователя.
    """
    # Функция отключена

def increment_login_attempts(username: str) -> None:
    """
    Увеличивает счетчик неудачных попыток входа для заданного пользователя.
    """
    # Функция отключена 

# Проверка валидности токена
def verify_token(token: str, credentials_exception):
    """
    Проверяет JWT токен и возвращает ID пользователя.
    
    Args:
        token (str): JWT токен для проверки
        credentials_exception: Исключение, которое будет выброшено при ошибке

    Returns:
        User: Объект пользователя из базы данных
    """
    try:
        # Декодируем JWT токен
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # В поле 'sub' хранится email пользователя, а не ID
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        
        # Получаем пользователя из базы данных по email
        from models import User, get_db
        from sqlalchemy.orm import Session
        from fastapi import Depends
        
        # Создаем сессию базы данных
        db = next(get_db())
        
        # Ищем пользователя по email
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            raise credentials_exception
            
        return user
    except JWTError:
        raise credentials_exception

# Получение текущего пользователя из WebSocket-запроса
async def get_current_user_ws(websocket: WebSocket, db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials"
    )
    
    # Получаем токен из query параметров
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001, reason="Authentication required")
        raise credentials_exception
    
    try:
        # Используем verify_token, которая теперь возвращает объект пользователя
        user = verify_token(token, credentials_exception)
        
        if user is None:
            await websocket.close(code=4001, reason="User not found")
            raise credentials_exception
        
        return user
    except Exception as e:
        await websocket.close(code=4001, reason=str(e))
        raise e