#!/bin/bash

# disable_ai.sh - Скрипт для полного отключения AI компонентов
# Предотвращает перезагрузки сервера из-за активных AI сервисов

set -e

echo "🔧 Скрипт отключения AI компонентов системы Healzy"
echo "=================================================="
echo ""

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка прав root (для systemctl команд)
if [[ $EUID -eq 0 ]]; then
    SUDO=""
    log_info "Запуск от имени root"
else
    SUDO="sudo"
    log_info "Запуск от обычного пользователя (будет использован sudo для systemctl)"
fi

echo "1. Остановка AI сервисов..."
echo "------------------------"

# Остановка ai-learning.service
if systemctl is-active --quiet ai-learning.service 2>/dev/null; then
    log_info "Остановка ai-learning.service..."
    $SUDO systemctl stop ai-learning.service
    log_success "ai-learning.service остановлен"
else
    log_warning "ai-learning.service уже остановлен или не найден"
fi

# Остановка ai-continuous-learning.service
if systemctl is-active --quiet ai-continuous-learning.service 2>/dev/null; then
    log_info "Остановка ai-continuous-learning.service..."
    $SUDO systemctl stop ai-continuous-learning.service
    log_success "ai-continuous-learning.service остановлен"
else
    log_warning "ai-continuous-learning.service уже остановлен или не найден"
fi

echo ""
echo "2. Отключение автозапуска AI сервисов..."
echo "--------------------------------------"

# Отключение автозапуска ai-learning.service
if systemctl is-enabled --quiet ai-learning.service 2>/dev/null; then
    log_info "Отключение автозапуска ai-learning.service..."
    $SUDO systemctl disable ai-learning.service
    log_success "Автозапуск ai-learning.service отключен"
else
    log_warning "ai-learning.service уже отключен или не найден"
fi

# Отключение автозапуска ai-continuous-learning.service
if systemctl is-enabled --quiet ai-continuous-learning.service 2>/dev/null; then
    log_info "Отключение автозапуска ai-continuous-learning.service..."
    $SUDO systemctl disable ai-continuous-learning.service
    log_success "Автозапуск ai-continuous-learning.service отключен"
else
    log_warning "ai-continuous-learning.service уже отключен или не найден"
fi

echo ""
echo "3. Завершение активных AI процессов..."
echo "-----------------------------------"

# Завершение процессов ai_continuous_learning.py
if pgrep -f "ai_continuous_learning.py" > /dev/null; then
    log_info "Завершение процессов ai_continuous_learning.py..."
    pkill -f "ai_continuous_learning.py" || true
    sleep 2
    # Принудительное завершение если процессы всё ещё работают
    if pgrep -f "ai_continuous_learning.py" > /dev/null; then
        log_warning "Принудительное завершение процессов ai_continuous_learning.py..."
        pkill -9 -f "ai_continuous_learning.py" || true
    fi
    log_success "Процессы ai_continuous_learning.py завершены"
else
    log_info "Процессы ai_continuous_learning.py не найдены"
fi

# Завершение процессов continuous_learning_service.py
if pgrep -f "continuous_learning_service.py" > /dev/null; then
    log_info "Завершение процессов continuous_learning_service.py..."
    pkill -f "continuous_learning_service.py" || true
    sleep 2
    # Принудительное завершение если процессы всё ещё работают
    if pgrep -f "continuous_learning_service.py" > /dev/null; then
        log_warning "Принудительное завершение процессов continuous_learning_service.py..."
        pkill -9 -f "continuous_learning_service.py" || true
    fi
    log_success "Процессы continuous_learning_service.py завершены"
else
    log_info "Процессы continuous_learning_service.py не найдены"
fi

echo ""
echo "4. Установка переменных окружения..."
echo "----------------------------------"

# Создание/обновление .env файла в backend директории
BACKEND_ENV="$(pwd)/.env"
if [ -f "$BACKEND_ENV" ]; then
    if grep -q "ENABLE_AI=" "$BACKEND_ENV"; then
        log_info "Обновление ENABLE_AI в $BACKEND_ENV..."
        sed -i 's/^ENABLE_AI=.*/ENABLE_AI=false/' "$BACKEND_ENV"
    else
        log_info "Добавление ENABLE_AI в $BACKEND_ENV..."
        echo "ENABLE_AI=false" >> "$BACKEND_ENV"
    fi
    log_success "ENABLE_AI=false установлено в $BACKEND_ENV"
else
    log_warning "$BACKEND_ENV не найден, создается новый..."
    echo "ENABLE_AI=false" > "$BACKEND_ENV"
    log_success "Создан $BACKEND_ENV с ENABLE_AI=false"
fi

# Также обновляем главный .env файл если он существует
MAIN_ENV="$(dirname $(pwd))/.env"
if [ -f "$MAIN_ENV" ]; then
    if grep -q "ENABLE_AI=" "$MAIN_ENV"; then
        log_info "Обновление ENABLE_AI в $MAIN_ENV..."
        sed -i 's/^ENABLE_AI=.*/ENABLE_AI=false/' "$MAIN_ENV"
    else
        log_info "Добавление ENABLE_AI в $MAIN_ENV..."
        echo "ENABLE_AI=false" >> "$MAIN_ENV"
    fi
    log_success "ENABLE_AI=false установлено в $MAIN_ENV"
fi

# Экспорт переменной для текущей сессии
export ENABLE_AI=false
log_success "ENABLE_AI=false экспортировано для текущей сессии"

echo ""
echo "5. Проверка статуса..."
echo "--------------------"

# Проверка статуса сервисов
echo "Статус AI сервисов:"
echo "• ai-learning.service: $(systemctl is-active ai-learning.service 2>/dev/null || echo 'не найден')"
echo "• ai-continuous-learning.service: $(systemctl is-active ai-continuous-learning.service 2>/dev/null || echo 'не найден')"

# Проверка активных AI процессов
AI_PROCESSES=$(pgrep -f "ai_continuous_learning.py|continuous_learning_service.py" | wc -l)
if [ "$AI_PROCESSES" -eq 0 ]; then
    log_success "Активные AI процессы не найдены"
else
    log_warning "Найдено $AI_PROCESSES активных AI процессов"
fi

# Проверка переменной окружения
if [ "$ENABLE_AI" = "false" ]; then
    log_success "ENABLE_AI корректно установлено в 'false'"
else
    log_error "ENABLE_AI не установлено или имеет неверное значение: '$ENABLE_AI'"
fi

echo ""
echo "6. Тестирование AI системы..."
echo "---------------------------"

# Переход в backend директорию для тестирования
cd "$(dirname "$0")"

# Тест работы AI в отключенном режиме
if python3 -c "
import os
os.environ['ENABLE_AI'] = 'false'
from ai_config import is_ai_enabled, get_ai_disabled_response
print('AI включен:', is_ai_enabled())
response = get_ai_disabled_response('Тест')
print('Ответ заглушки:', response['success'])
" 2>/dev/null; then
    log_success "AI система корректно работает в режиме заглушек"
else
    log_error "Ошибка при тестировании AI системы"
fi

echo ""
echo "=============================================="
echo "✅ ОТКЛЮЧЕНИЕ AI КОМПОНЕНТОВ ЗАВЕРШЕНО"
echo "=============================================="
echo ""
echo "Выполненные действия:"
echo "• Остановлены все AI сервисы"
echo "• Отключен автозапуск AI сервисов"
echo "• Завершены активные AI процессы"
echo "• Установлено ENABLE_AI=false"
echo "• AI система переключена на режим заглушек"
echo ""
echo "Сервер теперь должен работать стабильно без перезагрузок."
echo ""
echo "Для включения AI обратно:"
echo "1. Установите: export ENABLE_AI=true"
echo "2. Обновите .env файл: ENABLE_AI=true"
echo "3. Включите сервисы: sudo systemctl enable ai-learning.service"
echo "4. Запустите сервисы: sudo systemctl start ai-learning.service"
echo ""
echo "Для мониторинга используйте:"
echo "• systemctl status ai-learning.service"
echo "• systemctl status ai-continuous-learning.service"
echo "• journalctl -u ai-learning.service -f"