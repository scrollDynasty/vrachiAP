# План развертывания MedCare на продакшен

## Данные для развертывания
- IP-адрес сервера: 20.119.99.213
- DNS-имя: soglom.duckdns.org

## 1. Подготовка сервера

### Обновление системы
```bash
apt update
apt upgrade -y
```

### Установка необходимых пакетов
```bash
apt install -y python3 python3-pip python3-venv nodejs npm git nginx mysql-server certbot python3-certbot-nginx
```

### Настройка MySQL
```bash
mysql_secure_installation
```

## 2. Клонирование репозитория
```bash
mkdir -p /home/whoami/production
cd /home/whoami/production
git clone https://github.com/scrollDynasty/vrachiAP.git
cd vrachiAP
```

## 3. Настройка бэкенда

### Создание виртуального окружения
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Настройка базы данных
```bash
python init_mysql_db.py
# Выбрать вариант 1 и ввести данные администратора MySQL
```

### Создание файла .env в корне проекта
```
SECRET_KEY=сгенерировать_случайный_ключ
DATABASE_URL=mysql+pymysql://vrachi_user:пароль@localhost/online_doctors_db
GOOGLE_CLIENT_ID=ваш_идентификатор
GOOGLE_CLIENT_SECRET=ваш_секрет
GOOGLE_REDIRECT_URI=https://soglom.duckdns.org/auth/google/callback
VERIFICATION_BASE_URL=https://soglom.duckdns.org/verify-email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USERNAME=ваш_email@gmail.com
EMAIL_PASSWORD=ваш_пароль_приложения
EMAIL_FROM=ваш_email@gmail.com
APP_ENV=production
```

### Применение миграций
```bash
cd backend
alembic upgrade head
```

### Настройка systemd для бэкенда
Создать файл `/etc/systemd/system/vrachi-backend.service`:

```
[Unit]
Description=VrachiAP Backend Service
After=network.target

[Service]
User=whoami
WorkingDirectory=/home/whoami/production/vrachiAP/backend
Environment="PATH=/home/whoami/production/vrachiAP/backend/venv/bin"
ExecStart=/home/whoami/production/vrachiAP/backend/venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
```

Активировать сервис:
```bash
systemctl daemon-reload
systemctl enable vrachi-backend
systemctl start vrachi-backend
```

## 4. Настройка фронтенда

### Установка зависимостей
```bash
cd /home/whoami/production/vrachiAP/frontend
npm install
```

### Создание файла .env в директории frontend
```
VITE_API_URL=https://soglom.duckdns.org/api
VITE_GOOGLE_CLIENT_ID=ваш_идентификатор
```

### Сборка фронтенда
```bash
npm run build
```

## 5. Настройка Nginx

### Создание конфигурации Nginx
Создать файл `/etc/nginx/sites-available/vrachiap`:

```
server {
    listen 80;
    server_name soglom.duckdns.org;

    location / {
        root /home/whoami/production/vrachiAP/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Активировать конфигурацию:
```bash
ln -s /etc/nginx/sites-available/vrachiap /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Настройка SSL с Let's Encrypt
```bash
certbot --nginx -d soglom.duckdns.org
```

## 6. Настройка Google OAuth

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или используйте существующий
3. Настройте экран согласия OAuth
4. Создайте учетные данные OAuth
5. Добавьте в разрешенные JavaScript источники: `https://soglom.duckdns.org`
6. Добавьте в разрешенные URI перенаправления: `https://soglom.duckdns.org/auth/google/callback`
7. Обновите значения GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET в файлах .env

## 7. Проверка работоспособности

1. Проверьте доступность сайта: `https://soglom.duckdns.org`
2. Проверьте работу API: `https://soglom.duckdns.org/api/docs`
3. Проверьте процесс авторизации
4. Проверьте работу WebSocket для чата

## 8. Настройка мониторинга и резервного копирования

### Настройка резервного копирования базы данных
Создайте скрипт `/home/whoami/backup_db.sh`:

```bash
#!/bin/bash
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/home/whoami/backups"
mkdir -p $BACKUP_DIR

# Создание резервной копии
mysqldump -u vrachi_user -p"пароль" online_doctors_db > $BACKUP_DIR/online_doctors_db_$TIMESTAMP.sql

# Удаление старых копий (оставляем последние 10)
ls -tp $BACKUP_DIR/online_doctors_db_*.sql | grep -v '/$' | tail -n +11 | xargs -I {} rm -- {}
```

Сделайте скрипт исполняемым:
```bash
chmod +x /home/whoami/backup_db.sh
```

Добавьте его в crontab:
```bash
crontab -e
```

Добавьте строку:
```
0 3 * * * /home/whoami/backup_db.sh > /home/whoami/backup.log 2>&1
```

## 9. Дополнительные рекомендации

1. Настройте файрвол (например, ufw) для защиты сервера
2. Настройте автоматическое обновление сертификатов Let's Encrypt
3. Настройте логирование и ротацию логов
4. Рассмотрите возможность использования CDN для раздачи статических файлов
5. Настройте CORS в backend/main.py для разрешения запросов только с вашего домена 