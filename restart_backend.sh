#!/bin/bash

echo "🔄 Перезапуск backend сервиса..."

# Проверим статус сервиса
echo "📊 Текущий статус PM2:"
pm2 status

# Перезапуск backend
echo "🛑 Остановка healzy-backend..."
pm2 stop healzy-backend

echo "🚀 Запуск healzy-backend..."
pm2 start healzy-backend

# Проверим статус после перезапуска
echo "✅ Статус после перезапуска:"
pm2 status

echo "📝 Последние логи:"
pm2 logs healzy-backend --lines 10 