#!/bin/bash

# Установка зависимостей AI системы
echo "📦 Устанавливаю зависимости AI системы..."

# Устанавливаем основные AI зависимости
echo "🔧 Устанавливаю основные пакеты..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
pip install transformers scikit-learn pandas numpy
pip install sentence-transformers huggingface-hub
pip install beautifulsoup4 requests aiohttp lxml
pip install tqdm asyncio-throttle

echo "✅ Зависимости установлены!"
echo "🚀 Теперь можно запустить:"
echo "   python3 add_medical_data.py"
echo "   python3 init_ai_system.py" 