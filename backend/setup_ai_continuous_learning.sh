#!/bin/bash

# Скрипт установки системы непрерывного обучения AI для Healzy.uz
# Запускать с правами root: sudo bash setup_ai_continuous_learning.sh

set -e

echo "🧠 Установка системы непрерывного обучения AI для Healzy.uz"
echo "=========================================================="

# Проверка прав
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт с правами root: sudo $0"
    exit 1
fi

# Переменные (можно изменить при необходимости)
BACKEND_DIR="${1:-/var/www/healzy.app/backend}"
VENV_DIR="${2:-/var/www/healzy.app/venv}"
LOG_DIR="/var/log/healzy"
USER="www-data"

# Проверка существования директорий
echo "🔍 Проверка окружения..."
if [ ! -d "$BACKEND_DIR" ]; then
    echo "❌ Директория backend не найдена: $BACKEND_DIR"
    exit 1
fi

if [ ! -d "$VENV_DIR" ]; then
    echo "❌ Виртуальное окружение не найдено: $VENV_DIR"
    exit 1
fi

if [ ! -f "$VENV_DIR/bin/python" ]; then
    echo "❌ Python не найден в виртуальном окружении: $VENV_DIR/bin/python"
    exit 1
fi

echo "✅ Окружение настроено корректно"

# Создание директорий
echo "📁 Создание директорий..."
mkdir -p $LOG_DIR
mkdir -p $BACKEND_DIR/ai_service/models
mkdir -p $BACKEND_DIR/ai_service/data
mkdir -p $BACKEND_DIR/medical_data
chown -R $USER:$USER $BACKEND_DIR/ai_service
chown -R $USER:$USER $LOG_DIR

# Установка зависимостей
echo "📦 Установка Python зависимостей..."
cd $BACKEND_DIR
sudo -u $USER $VENV_DIR/bin/pip install schedule

# Проверка файлов
echo "🔍 Проверка необходимых файлов..."
required_files=(
    "ai_continuous_learning.py"
    "add_medical_data.py"
    "init_ai_system.py"
    "ai_service/__init__.py"
    "ai_service/data_collector.py"
    "ai_service/model_trainer.py"
    "ai_service/inference.py"
    "ai_service/utils.py"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$BACKEND_DIR/$file" ]; then
        echo "❌ Не найден файл: $file"
        exit 1
    fi
done

echo "✅ Все файлы на месте"

# Проверка подключения к MySQL
echo "🔍 Проверка подключения к MySQL..."
if ! mysql -u root -p healzy_db -e "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Не удается подключиться к MySQL. Проверьте настройки БД."
    echo "💡 Убедитесь, что MySQL запущен и база данных healzy_db существует."
    exit 1
fi
echo "✅ Подключение к MySQL установлено"

# Добавление начальных данных
echo "📊 Добавление медицинских данных..."
if ! sudo -u $USER $VENV_DIR/bin/python $BACKEND_DIR/add_medical_data.py; then
    echo "⚠️ Ошибка добавления данных, но продолжаем..."
fi

# Первоначальное обучение
echo "🧠 Первоначальное обучение моделей..."
if ! sudo -u $USER $VENV_DIR/bin/python $BACKEND_DIR/init_ai_system.py; then
    echo "⚠️ Ошибка инициализации, но продолжаем..."
fi

# Установка systemd сервиса
echo "⚙️ Настройка systemd сервиса..."
cp $BACKEND_DIR/ai-learning.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable ai-learning

# Создание cron задачи для резервного копирования
echo "💾 Настройка резервного копирования моделей..."
cat > /etc/cron.d/ai-backup << EOF
# Резервное копирование AI моделей каждый день в 2:00
0 2 * * * $USER cd $BACKEND_DIR && tar -czf /backup/ai_models_\$(date +\%Y\%m\%d).tar.gz ai_service/models/
EOF

# Настройка logrotate
echo "📝 Настройка ротации логов..."
cat > /etc/logrotate.d/ai-learning << EOF
$LOG_DIR/ai-learning*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $USER $USER
    postrotate
        systemctl reload ai-learning > /dev/null 2>&1 || true
    endscript
}
EOF

# Запуск сервиса
echo "🚀 Запуск системы непрерывного обучения..."
systemctl start ai-learning

# Проверка статуса
sleep 5
if systemctl is-active --quiet ai-learning; then
    echo "✅ Система успешно запущена!"
else
    echo "❌ Ошибка запуска системы"
    systemctl status ai-learning
    exit 1
fi

# Вывод информации
echo ""
echo "🎉 Установка завершена!"
echo "========================"
echo ""
echo "📊 Команды управления:"
echo "  - Статус: sudo systemctl status ai-learning"
echo "  - Логи: sudo journalctl -u ai-learning -f"
echo "  - Перезапуск: sudo systemctl restart ai-learning"
echo "  - Остановка: sudo systemctl stop ai-learning"
echo ""
echo "🔍 Мониторинг:"
echo "  - Логи AI: tail -f $LOG_DIR/ai-learning.log"
echo "  - Ошибки: tail -f $LOG_DIR/ai-learning-error.log"
echo "  - Процесс: ps aux | grep ai_continuous_learning"
echo ""
echo "📈 Проверка работы:"
echo "  - Точность: cd $BACKEND_DIR && $VENV_DIR/bin/python ai_continuous_learning.py check"
echo "  - БД: mysql -u root -p healzy_db -e 'SELECT COUNT(*) FROM ai_training_data;'"
echo ""
echo "🌐 Веб-интерфейс:"
echo "  - AI диагностика доступна по адресу: https://healzy.uz/ai-diagnosis"
echo "  - Пациенты могут оставлять отзывы после каждого диагноза"
echo ""
echo "⚡ Система работает автоматически и учится каждый день!" 