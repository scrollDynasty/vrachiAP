#!/bin/bash

# Скрипт установки системы непрерывного обучения AI для Healzy.uz

set -e

echo "🤖 Установка системы непрерывного обучения AI для Healzy.uz"
echo "=============================================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Функция для вывода сообщений
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка прав пользователя
if [[ $EUID -ne 0 ]]; then
   log_error "Этот скрипт должен запускаться с правами root"
   exit 1
fi

# Определение пути к проекту
PROJECT_ROOT="/var/www/healzy.app"
BACKEND_DIR="${PROJECT_ROOT}/backend"
VENV_DIR="${BACKEND_DIR}/venv"

# Проверка существования проекта
if [ ! -d "$BACKEND_DIR" ]; then
    log_error "Директория проекта не найдена: $BACKEND_DIR"
    exit 1
fi

cd "$BACKEND_DIR"

log_info "Установка дополнительных зависимостей для непрерывного обучения..."

# Активация виртуального окружения
if [ -d "$VENV_DIR" ]; then
    source "$VENV_DIR/bin/activate"
    log_info "Виртуальное окружение активировано"
else
    log_error "Виртуальное окружение не найдено: $VENV_DIR"
    exit 1
fi

# Установка дополнительных пакетов
log_info "Установка библиотеки schedule для планирования задач..."
pip install schedule

log_info "Установка дополнительных библиотек для сбора данных..."
pip install beautifulsoup4 requests aiohttp

log_info "Обновление существующих пакетов..."
pip install --upgrade scikit-learn numpy pandas

# Создание конфигурационного файла
log_info "Создание конфигурационного файла..."
cat > learning_config.json << EOF
{
  "data_collection": {
    "interval_hours": 2,
    "batch_size": 100,
    "max_daily_requests": 1000,
    "enabled": true
  },
  "model_training": {
    "interval_hours": 6,
    "min_new_data_for_training": 50,
    "accuracy_threshold": 0.8,
    "enabled": true
  },
  "monitoring": {
    "alert_on_accuracy_drop": true,
    "accuracy_drop_threshold": 0.1,
    "log_stats_interval_hours": 1
  },
  "data_sources": {
    "medical_sites": true,
    "scientific_papers": true,
    "health_forums": false,
    "wikipedia": true
  }
}
EOF

# Создание директорий для логов
log_info "Создание директорий для логов..."
mkdir -p /var/log/healzy-ai
chown scroll:scroll /var/log/healzy-ai

# Установка systemd сервиса
log_info "Установка systemd сервиса..."
cp ai-continuous-learning.service /etc/systemd/system/
systemctl daemon-reload

# Настройка прав доступа
log_info "Настройка прав доступа..."
chown -R scroll:scroll "$PROJECT_ROOT"
chmod +x continuous_learning_service.py

# Создание скрипта мониторинга
log_info "Создание скрипта мониторинга..."
cat > monitor_ai_learning.sh << 'EOF'
#!/bin/bash
# Скрипт мониторинга системы непрерывного обучения

echo "📊 Статус системы непрерывного обучения AI"
echo "========================================="

# Проверка статуса сервиса
echo "🔍 Статус сервиса:"
systemctl status ai-continuous-learning --no-pager -l

echo ""
echo "📈 Последние логи:"
journalctl -u ai-continuous-learning --no-pager -l --since "1 hour ago"

echo ""
echo "💾 Использование ресурсов:"
ps aux | grep continuous_learning_service.py | grep -v grep

echo ""
echo "📁 Размер файлов логов:"
ls -lh /var/log/healzy-ai/ 2>/dev/null || echo "Директория логов не найдена"

echo ""
echo "🗄️ Статистика базы данных:"
mysql -u root -p -e "SELECT COUNT(*) as 'Training Data Records' FROM ai_training_data; SELECT COUNT(*) as 'AI Models' FROM ai_models;" healzy_db 2>/dev/null || echo "Не удалось подключиться к базе данных"
EOF

chmod +x monitor_ai_learning.sh
chown scroll:scroll monitor_ai_learning.sh

# Создание скрипта управления
log_info "Создание скрипта управления..."
cat > manage_ai_learning.sh << 'EOF'
#!/bin/bash
# Скрипт управления системой непрерывного обучения

case "$1" in
    start)
        echo "🚀 Запуск системы непрерывного обучения..."
        systemctl start ai-continuous-learning
        systemctl enable ai-continuous-learning
        echo "✅ Сервис запущен и добавлен в автозагрузку"
        ;;
    stop)
        echo "🛑 Остановка системы непрерывного обучения..."
        systemctl stop ai-continuous-learning
        echo "✅ Сервис остановлен"
        ;;
    restart)
        echo "🔄 Перезапуск системы непрерывного обучения..."
        systemctl restart ai-continuous-learning
        echo "✅ Сервис перезапущен"
        ;;
    status)
        systemctl status ai-continuous-learning
        ;;
    logs)
        journalctl -u ai-continuous-learning -f
        ;;
    test)
        echo "🧪 Тестирование системы обучения..."
        su - scroll -c "cd /var/www/healzy.app/backend && source venv/bin/activate && python3 continuous_learning_service.py" &
        PID=$!
        sleep 10
        kill $PID 2>/dev/null
        echo "✅ Тест завершен"
        ;;
    *)
        echo "Использование: $0 {start|stop|restart|status|logs|test}"
        echo ""
        echo "Команды:"
        echo "  start   - Запустить сервис"
        echo "  stop    - Остановить сервис"
        echo "  restart - Перезапустить сервис"
        echo "  status  - Показать статус"
        echo "  logs    - Показать логи в реальном времени"
        echo "  test    - Протестировать работу"
        exit 1
        ;;
esac
EOF

chmod +x manage_ai_learning.sh
chown scroll:scroll manage_ai_learning.sh

# Настройка logrotate
log_info "Настройка ротации логов..."
cat > /etc/logrotate.d/healzy-ai << EOF
/var/log/healzy-ai/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 scroll scroll
    postrotate
        systemctl reload ai-continuous-learning 2>/dev/null || true
    endscript
}
EOF

# Создание задачи cron для мониторинга
log_info "Настройка мониторинга через cron..."
(crontab -l 2>/dev/null; echo "0 */6 * * * /var/www/healzy.app/backend/monitor_ai_learning.sh >> /var/log/healzy-ai/monitor.log 2>&1") | crontab -

echo ""
echo "🎉 Установка системы непрерывного обучения завершена!"
echo "============================================="
echo ""
echo "📋 Следующие шаги:"
echo "1. Запустите сервис: ./manage_ai_learning.sh start"
echo "2. Проверьте статус: ./manage_ai_learning.sh status"
echo "3. Мониторинг: ./monitor_ai_learning.sh"
echo "4. Логи: ./manage_ai_learning.sh logs"
echo ""
echo "🔧 Файлы конфигурации:"
echo "- Конфигурация: learning_config.json"
echo "- Логи: /var/log/healzy-ai/"
echo "- Сервис: /etc/systemd/system/ai-continuous-learning.service"
echo ""
echo "⚙️ Расписание:"
echo "- Сбор данных: каждые 2 часа"
echo "- Обучение моделей: каждые 6 часов"
echo "- Мониторинг: каждые 6 часов"
echo ""
echo "🚀 Система будет работать в фоне 24/7 и автоматически:"
echo "   • Собирать медицинские данные из интернета"
echo "   • Переобучать AI модели"
echo "   • Улучшать точность диагностики"
echo ""
log_info "Установка завершена успешно!" 