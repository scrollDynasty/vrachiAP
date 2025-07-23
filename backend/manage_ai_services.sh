#!/bin/bash
"""
Script to enable/disable AI services based on ENABLE_AI environment variable
This script should be run with sudo privileges
"""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check ENABLE_AI environment variable
ENABLE_AI=${ENABLE_AI:-false}

echo "🔍 Проверка статуса AI функций..."
echo "   ENABLE_AI = $ENABLE_AI"

if [ "$ENABLE_AI" = "true" ]; then
    echo "✅ Включение AI сервисов..."
    
    # Enable and start AI services
    if systemctl list-unit-files | grep -q "ai-continuous-learning.service"; then
        sudo systemctl enable ai-continuous-learning.service
        sudo systemctl start ai-continuous-learning.service
        echo "   ✅ ai-continuous-learning.service включен"
    else
        echo "   ⚠️ ai-continuous-learning.service не найден"
    fi
    
    if systemctl list-unit-files | grep -q "ai-learning.service"; then
        sudo systemctl enable ai-learning.service  
        sudo systemctl start ai-learning.service
        echo "   ✅ ai-learning.service включен"
    else
        echo "   ⚠️ ai-learning.service не найден"
    fi
    
    echo "🚀 AI сервисы включены и запущены"
    
else
    echo "🛑 Отключение AI сервисов..."
    
    # Stop and disable AI services
    if systemctl list-unit-files | grep -q "ai-continuous-learning.service"; then
        sudo systemctl stop ai-continuous-learning.service
        sudo systemctl disable ai-continuous-learning.service
        echo "   🛑 ai-continuous-learning.service остановлен и отключен"
    else
        echo "   ℹ️ ai-continuous-learning.service не найден"
    fi
    
    if systemctl list-unit-files | grep -q "ai-learning.service"; then
        sudo systemctl stop ai-learning.service
        sudo systemctl disable ai-learning.service
        echo "   🛑 ai-learning.service остановлен и отключен"
    else
        echo "   ℹ️ ai-learning.service не найден"
    fi
    
    echo "🔒 AI сервисы остановлены и отключены"
fi

# Show current status
echo ""
echo "📊 Текущий статус сервисов:"
for service in ai-continuous-learning.service ai-learning.service; do
    if systemctl list-unit-files | grep -q "$service"; then
        status=$(systemctl is-active $service)
        enabled=$(systemctl is-enabled $service)
        echo "   $service: $status ($enabled)"
    else
        echo "   $service: не установлен"
    fi
done