#!/bin/bash

# Скрипт для развертывания проекта MedCare на продакшен сервер
# Автор: Claude
# Дата: 2024-06-24

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Проверка наличия root прав
if [ "$EUID" -ne 0 ]; then
    error "Пожалуйста, запустите скрипт с правами root (sudo ./deploy.sh)"
fi

# Глобальные переменные
DEPLOY_DIR="/home/whoami/production/vrachiAP"
DOMAIN="healzy.uz"
IP_ADDRESS="172.174.231.5"
MYSQL_ROOT_PASSWORD=""
MYSQL_USER="vrachi_user"
MYSQL_PASSWORD=""
MYSQL_DB="online_doctors_db"
SECRET_KEY=$(openssl rand -hex 32)
EMAIL=""

# Функция для запроса переменных окружения
get_env_variables() {
    log "Настройка переменных окружения..."
    
    read -p "Введите пароль root для MySQL: " MYSQL_ROOT_PASSWORD
    read -p "Введите пароль для пользователя MySQL $MYSQL_USER: " MYSQL_PASSWORD
    read -p "Введите email для Let's Encrypt и уведомлений: " EMAIL
    
    # Проверка введенных данных
    if [ -z "$MYSQL_ROOT_PASSWORD" ] || [ -z "$MYSQL_PASSWORD" ] || [ -z "$EMAIL" ]; then
        error "Все поля обязательны для заполнения!"
    fi
}

# Функция для обновления системы
update_system() {
    log "Обновление системы..."
    apt update && apt upgrade -y || error "Не удалось обновить систему"
}

# Функция для установки необходимых пакетов
install_packages() {
    log "Установка необходимых пакетов..."
    apt install -y python3 python3-pip python3-venv nodejs npm git nginx mysql-server certbot python3-certbot-nginx || error "Не удалось установить пакеты"
}

# Функция для настройки MySQL
setup_mysql() {
    log "Настройка MySQL..."
    
    # Проверяем, запущен ли MySQL
    systemctl is-active --quiet mysql || systemctl start mysql
    
    # Настраиваем безопасность MySQL (без интерактивных запросов)
    mysql -u root <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';
DELETE FROM mysql.user WHERE User='';
DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
CREATE DATABASE IF NOT EXISTS $MYSQL_DB CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$MYSQL_USER'@'%' IDENTIFIED BY '$MYSQL_PASSWORD';
GRANT ALL PRIVILEGES ON $MYSQL_DB.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
EOF
    
    if [ $? -ne 0 ]; then
        error "Не удалось настроить MySQL"
    fi
    
    log "MySQL успешно настроен"
}

# Функция для клонирования репозитория
clone_repository() {
    log "Клонирование репозитория..."
    
    # Создаем директорию, если она не существует
    mkdir -p /home/whoami/production
    
    # Проверяем, существует ли уже директория репозитория
    if [ -d "$DEPLOY_DIR" ]; then
        warn "Директория $DEPLOY_DIR уже существует. Обновляем репозиторий..."
        cd "$DEPLOY_DIR"
        git pull || error "Не удалось обновить репозиторий"
    else
        cd /home/whoami/production
        git clone https://github.com/scrollDynasty/vrachiAP.git || error "Не удалось клонировать репозиторий"
        cd vrachiAP
    fi
    
    log "Репозиторий успешно клонирован/обновлен"
}

# Функция для настройки бэкенда
setup_backend() {
    log "Настройка бэкенда..."
    
    cd "$DEPLOY_DIR/backend"
    
    # Создаем виртуальное окружение
    python3 -m venv venv || error "Не удалось создать виртуальное окружение"
    source venv/bin/activate || error "Не удалось активировать виртуальное окружение"
    
    # Устанавливаем зависимости
    pip install -r requirements.txt || error "Не удалось установить зависимости бэкенда"
    
    # Создаем файл .env
    cat > "$DEPLOY_DIR/.env" <<EOF
SECRET_KEY=$SECRET_KEY
DATABASE_URL=mysql+pymysql://$MYSQL_USER:$MYSQL_PASSWORD@localhost/$MYSQL_DB
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://$DOMAIN/auth/google/callback
VERIFICATION_BASE_URL=https://$DOMAIN/verify-email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=$EMAIL
EMAIL_PASSWORD=
EMAIL_FROM=$EMAIL
APP_ENV=production
EOF
    
    log "Файл .env для бэкенда создан. Пожалуйста, заполните отсутствующие значения вручную."
    
    # Создаем сервис systemd
    cat > /etc/systemd/system/vrachi-backend.service <<EOF
[Unit]
Description=VrachiAP Backend Service
After=network.target

[Service]
User=whoami
WorkingDirectory=$DEPLOY_DIR/backend
Environment="PATH=$DEPLOY_DIR/backend/venv/bin"
ExecStart=$DEPLOY_DIR/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
EOF
    
    # Активируем сервис
    systemctl daemon-reload
    systemctl enable vrachi-backend
    
    log "Бэкенд успешно настроен"
}

# Функция для применения миграций базы данных
run_migrations() {
    log "Применение миграций базы данных..."
    
    cd "$DEPLOY_DIR/backend"
    source venv/bin/activate
    
    # Проверяем наличие alembic
    if ! command -v alembic &> /dev/null; then
        pip install alembic
    fi
    
    # Применяем миграции
    alembic upgrade head || error "Не удалось применить миграции"
    
    log "Миграции базы данных успешно применены"
}

# Функция для настройки фронтенда
setup_frontend() {
    log "Настройка фронтенда..."
    
    cd "$DEPLOY_DIR/frontend"
    
    # Устанавливаем зависимости
    npm install || error "Не удалось установить зависимости фронтенда"
    
    # Создаем файл .env
    cat > "$DEPLOY_DIR/frontend/.env" <<EOF
VITE_API_URL=https://$DOMAIN/api
VITE_GOOGLE_CLIENT_ID=
EOF
    
    log "Файл .env для фронтенда создан. Пожалуйста, заполните VITE_GOOGLE_CLIENT_ID вручную."
    
    # Собираем фронтенд
    npm run build || error "Не удалось собрать фронтенд"
    
    log "Фронтенд успешно настроен и собран"
}

# Функция для настройки Nginx
setup_nginx() {
    log "Настройка Nginx..."
    
    # Создаем конфигурационный файл
    cat > /etc/nginx/sites-available/vrachiap <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        root $DEPLOY_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
    
    # Активируем конфигурацию
    ln -sf /etc/nginx/sites-available/vrachiap /etc/nginx/sites-enabled/
    nginx -t || error "Конфигурация Nginx содержит ошибки"
    systemctl restart nginx || error "Не удалось перезапустить Nginx"
    
    log "Nginx успешно настроен"
}

# Функция для настройки SSL
setup_ssl() {
    log "Настройка SSL с Let's Encrypt..."
    
    # Запускаем certbot для получения SSL-сертификата
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL || error "Не удалось получить SSL-сертификат"
    
    log "SSL успешно настроен"
}

# Функция для настройки резервного копирования
setup_backup() {
    log "Настройка резервного копирования..."
    
    # Создаем директорию для резервных копий
    mkdir -p /home/whoami/backups
    
    # Создаем скрипт для резервного копирования
    cat > /home/whoami/backup_db.sh <<EOF
#!/bin/bash
TIMESTAMP=\$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/home/whoami/backups"
mkdir -p \$BACKUP_DIR

# Создание резервной копии
mysqldump -u $MYSQL_USER -p"$MYSQL_PASSWORD" $MYSQL_DB > \$BACKUP_DIR/${MYSQL_DB}_\$TIMESTAMP.sql

# Удаление старых копий (оставляем последние 10)
ls -tp \$BACKUP_DIR/${MYSQL_DB}_*.sql | grep -v '/\$' | tail -n +11 | xargs -I {} rm -- {}
EOF
    
    # Делаем скрипт исполняемым
    chmod +x /home/whoami/backup_db.sh
    
    # Добавляем задание в crontab
    (crontab -l 2>/dev/null || echo "") | grep -v "backup_db.sh" | { cat; echo "0 3 * * * /home/whoami/backup_db.sh > /home/whoami/backup.log 2>&1"; } | crontab -
    
    log "Резервное копирование успешно настроено"
}

# Функция для запуска сервисов
start_services() {
    log "Запуск сервисов..."
    
    systemctl start vrachi-backend || warn "Не удалось запустить бэкенд-сервис"
    systemctl status vrachi-backend
    
    log "Сервисы запущены"
}

# Основная функция
main() {
    log "Начало процесса развертывания MedCare на продакшен сервер..."
    
    get_env_variables
    update_system
    install_packages
    setup_mysql
    clone_repository
    setup_backend
    run_migrations
    setup_frontend
    setup_nginx
    setup_ssl
    setup_backup
    start_services
    
    log "Развертывание MedCare успешно завершено!"
    log "Пожалуйста, настройте Google OAuth и заполните отсутствующие значения в файлах .env"
    log "Ваш сайт доступен по адресу: https://$DOMAIN"
}

# Запуск основной функции
main 