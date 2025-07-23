#!/usr/bin/env python3
"""
Автоматическая установка и обучение медицинской AI системы
Обновленная версия с поддержкой transfer learning
"""

import os
import sys
import subprocess
import logging
import time
from datetime import datetime
import json
import platform

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('ai_setup.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def print_header(title):
    """Красивое отображение заголовка"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)

def print_step(step_num, total_steps, description):
    """Красивое отображение шага"""
    print(f"\n[{step_num}/{total_steps}] {description}")
    print("-" * 50)

def run_command(command, description="", check=True):
    """Выполнение команды с красивым выводом"""
    if description:
        logger.info(f"🔧 {description}")
    
    logger.info(f"Выполняю: {command}")
    
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=300  # 5 минут таймаут
        )
        
        if result.returncode == 0:
            logger.info("✅ Команда выполнена успешно")
            if result.stdout:
                logger.debug(f"Вывод: {result.stdout}")
            return True
        else:
            logger.error(f"❌ Команда завершилась с ошибкой (код: {result.returncode})")
            if result.stderr:
                logger.error(f"Ошибка: {result.stderr}")
            if result.stdout:
                logger.error(f"Вывод: {result.stdout}")
            if check:
                raise subprocess.CalledProcessError(result.returncode, command)
            return False
    
    except subprocess.TimeoutExpired:
        logger.error(f"❌ Команда превысила таймаут: {command}")
        if check:
            raise
        return False
    except Exception as e:
        logger.error(f"❌ Ошибка при выполнении команды: {e}")
        if check:
            raise
        return False

def check_python_version():
    """Проверка версии Python"""
    logger.info("🔍 Проверка версии Python...")
    
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        logger.error("❌ Требуется Python 3.8 или выше")
        logger.error(f"Текущая версия: {version.major}.{version.minor}.{version.micro}")
        return False
    
    logger.info(f"✅ Python версия: {version.major}.{version.minor}.{version.micro}")
    return True

def check_system_requirements():
    """Проверка системных требований"""
    logger.info("🔍 Проверка системных требований...")
    
    # Проверка операционной системы
    os_name = platform.system()
    logger.info(f"Операционная система: {os_name}")
    
    # Проверка памяти (примерно)
    if os_name == "Linux":
        try:
            with open('/proc/meminfo', 'r') as f:
                meminfo = f.read()
            mem_total = None
            for line in meminfo.split('\n'):
                if 'MemTotal:' in line:
                    mem_total = int(line.split()[1]) * 1024  # Конвертируем в байты
                    break
            
            if mem_total and mem_total < 2 * 1024 * 1024 * 1024:  # 2GB
                logger.warning("⚠️ Мало оперативной памяти для обучения больших моделей")
            elif mem_total:
                logger.info(f"✅ Оперативная память: {mem_total // (1024*1024*1024)} GB")
        except:
            logger.warning("⚠️ Не удалось проверить количество памяти")
    
    return True

def install_dependencies():
    """Установка зависимостей"""
    logger.info("📦 Установка зависимостей...")
    
    # Определяем файл с зависимостями
    req_file = os.path.join("ai_system", "requirements.txt")
    
    if not os.path.exists(req_file):
        logger.error(f"❌ Файл зависимостей не найден: {req_file}")
        return False
    
    # Обновляем pip
    run_command(
        f"{sys.executable} -m pip install --upgrade pip",
        "Обновление pip",
        check=False
    )
    
    # Устанавливаем зависимости
    success = run_command(
        f"{sys.executable} -m pip install -r {req_file}",
        "Установка зависимостей из requirements.txt",
        check=False
    )
    
    if not success:
        logger.warning("⚠️ Некоторые зависимости могут не установиться")
        logger.info("Попробуем установить основные зависимости отдельно...")
        
        # Основные зависимости для машинного обучения
        essential_packages = [
            "torch>=1.9.0",
            "scikit-learn>=1.0.0",
            "pandas>=1.3.0",
            "numpy>=1.21.0",
            "requests>=2.25.0",
            "beautifulsoup4>=4.10.0"
        ]
        
        for package in essential_packages:
            run_command(
                f"{sys.executable} -m pip install {package}",
                f"Установка {package}",
                check=False
            )
    
    return True

def setup_directories():
    """Создание необходимых директорий"""
    logger.info("📁 Создание директорий...")
    
    directories = [
        "ai_system/medical_data",
        "ai_system/trained_models",
        "ai_system/logs",
        "ai_system/cache"
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        logger.info(f"✅ Создана директория: {directory}")
    
    return True

def download_data():
    """Загрузка медицинских данных"""
    logger.info("📥 Загрузка медицинских данных...")
    
    try:
        # Импортируем загрузчик данных
        sys.path.append('ai_system')
        from data_downloader import MedicalDataDownloader
        
        # Создаем загрузчик
        downloader = MedicalDataDownloader("ai_system/medical_data")
        
        # Загружаем данные
        data_path = downloader.download_all_data(
            include_synthetic=True,
            synthetic_count=500  # Больше синтетических данных для лучшего обучения
        )
        
        logger.info(f"✅ Данные загружены: {data_path}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка при загрузке данных: {e}")
        return False

def train_model(epochs=100, use_transfer_learning=False):
    """Обучение модели"""
    logger.info("🧠 Обучение модели...")
    
    try:
        # Импортируем тренировщик
        sys.path.append('ai_system')
        from train_model import MedicalModelTrainer
        
        # Создаем тренировщик
        trainer = MedicalModelTrainer()
        
        # Если есть существующая модель, используем transfer learning
        if use_transfer_learning:
            model_path = os.path.join("ai_system", "trained_models", "best_medical_model.pth")
            if os.path.exists(model_path):
                logger.info("🔄 Настраиваю transfer learning...")
                trainer.setup_transfer_learning(model_path)
            else:
                logger.info("📝 Существующая модель не найдена, обучение с нуля")
        
        # Запускаем обучение
        success = trainer.full_training_pipeline(
            num_epochs=epochs,
            download_new_data=False  # Данные уже загружены
        )
        
        if success:
            logger.info("✅ Обучение модели завершено успешно")
            return True
        else:
            logger.error("❌ Обучение модели завершилось с ошибкой")
            return False
            
    except Exception as e:
        logger.error(f"❌ Ошибка при обучении модели: {e}")
        return False

def test_model():
    """Тестирование модели"""
    logger.info("🧪 Тестирование модели...")
    
    try:
        # Импортируем inference
        sys.path.append('ai_system')
        from inference import diagnose_symptoms, get_model_status
        
        # Проверяем статус модели
        status = get_model_status()
        if 'error' in status:
            logger.error(f"❌ Модель недоступна: {status['error']}")
            return False
        
        logger.info("✅ Модель успешно загружена")
        logger.info(f"   - Симптомов: {status.get('symptoms_count', 0)}")
        logger.info(f"   - Заболеваний: {status.get('diseases_count', 0)}")
        
        # Тестируем диагностику
        test_symptoms = ["головная боль", "температура", "кашель"]
        logger.info(f"🔍 Тестирую симптомы: {test_symptoms}")
        
        result = diagnose_symptoms(test_symptoms, top_k=2)
        
        if 'error' in result:
            logger.error(f"❌ Ошибка диагностики: {result['error']}")
            return False
        
        logger.info("✅ Тестирование прошло успешно")
        logger.info(f"   - Найдено предсказаний: {len(result.get('predictions', []))}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Ошибка при тестировании: {e}")
        return False

def create_startup_script():
    """Создание скрипта для запуска"""
    logger.info("📜 Создание скрипта запуска...")
    
    script_content = """#!/usr/bin/env python3
\"\"\"
Скрипт для быстрого запуска AI системы
\"\"\"
import sys
import os

# Добавляем путь к AI системе
sys.path.append(os.path.join(os.path.dirname(__file__), 'ai_system'))

from inference import MedicalDiagnosisInference

def main():
    print("🚀 Запуск AI системы медицинской диагностики")
    print("=" * 50)
    
    # Создаем экземпляр inference
    ai = MedicalDiagnosisInference()
    
    # Интерактивный режим
    ai.interactive_mode()

if __name__ == "__main__":
    main()
"""
    
    with open("start_ai.py", "w", encoding="utf-8") as f:
        f.write(script_content)
    
    # Делаем скрипт исполняемым (на Unix системах)
    if os.name != 'nt':
        os.chmod("start_ai.py", 0o755)
    
    logger.info("✅ Скрипт запуска создан: start_ai.py")
    return True

def generate_summary():
    """Генерация итогового отчета"""
    logger.info("📋 Генерация итогового отчета...")
    
    summary = {
        "installation_date": datetime.now().isoformat(),
        "python_version": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        "platform": platform.system(),
        "status": "completed",
        "files_created": [
            "ai_system/medical_data/medical_data.json",
            "ai_system/trained_models/best_medical_model.pth",
            "ai_system/trained_models/data_processor.pkl",
            "start_ai.py"
        ],
        "next_steps": [
            "Запустите 'python start_ai.py' для тестирования",
            "Интегрируйте с веб-приложением через API",
            "Настройте регулярное переобучение модели"
        ]
    }
    
    with open("ai_installation_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    logger.info("✅ Отчет сохранен: ai_installation_summary.json")
    return True

def main():
    """Основная функция установки"""
    start_time = time.time()
    
    print_header("🤖 УСТАНОВКА AI СИСТЕМЫ МЕДИЦИНСКОЙ ДИАГНОСТИКИ")
    print("Версия: 2.0 с поддержкой Transfer Learning")
    print("Автор: AI Assistant")
    print()
    
    # Проверяем аргументы командной строки
    use_transfer_learning = "--transfer-learning" in sys.argv
    epochs = 100
    
    for arg in sys.argv:
        if arg.startswith("--epochs="):
            epochs = int(arg.split("=")[1])
    
    logger.info(f"Параметры: epochs={epochs}, transfer_learning={use_transfer_learning}")
    
    steps = [
        ("Проверка Python версии", check_python_version),
        ("Проверка системных требований", check_system_requirements),
        ("Установка зависимостей", install_dependencies),
        ("Создание директорий", setup_directories),
        ("Загрузка данных", download_data),
        ("Обучение модели", lambda: train_model(epochs, use_transfer_learning)),
        ("Тестирование модели", test_model),
        ("Создание скрипта запуска", create_startup_script),
        ("Генерация отчета", generate_summary)
    ]
    
    total_steps = len(steps)
    completed_steps = 0
    
    try:
        for i, (description, func) in enumerate(steps, 1):
            print_step(i, total_steps, description)
            
            if func():
                completed_steps += 1
                logger.info(f"✅ Шаг {i}/{total_steps} завершен")
            else:
                logger.error(f"❌ Шаг {i}/{total_steps} завершился с ошибкой")
                # Продолжаем выполнение даже при ошибках
        
        # Итоговый отчет
        elapsed_time = time.time() - start_time
        
        print_header("📊 ИТОГОВЫЙ ОТЧЕТ")
        print(f"Время выполнения: {elapsed_time:.2f} секунд")
        print(f"Выполнено шагов: {completed_steps}/{total_steps}")
        print(f"Успешность: {completed_steps/total_steps*100:.1f}%")
        
        if completed_steps == total_steps:
            print("\n🎉 УСТАНОВКА ЗАВЕРШЕНА УСПЕШНО!")
            print("\n📝 Что дальше:")
            print("1. Запустите: python start_ai.py")
            print("2. Тестируйте систему через веб-интерфейс")
            print("3. Настройте регулярное переобучение")
            print("\n📚 Документация:")
            print("- README.md - общая информация")
            print("- ai_system/README.md - техническая документация")
            print("- ai_installation_summary.json - детальный отчет")
        else:
            print("\n⚠️ УСТАНОВКА ЗАВЕРШЕНА С ОШИБКАМИ")
            print("Проверьте логи для получения подробной информации")
            print("Лог файл: ai_setup.log")
        
    except KeyboardInterrupt:
        print("\n\n❌ Установка прервана пользователем")
        logger.error("Установка прервана пользователем")
    except Exception as e:
        print(f"\n\n❌ Критическая ошибка: {e}")
        logger.error(f"Критическая ошибка: {e}")
    
    print_header("🔚 УСТАНОВКА ЗАВЕРШЕНА")

if __name__ == "__main__":
    main() 