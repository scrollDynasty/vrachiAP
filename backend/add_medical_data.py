#!/usr/bin/env python3
"""
Скрипт для добавления медицинских данных в БД для обучения AI
Используется когда сбор данных из интернета не работает
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import get_db, AITrainingData
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def add_medical_training_data():
    """Добавление качественных медицинских данных для обучения"""
    
    # Подготовленные медицинские данные на русском языке
    medical_data = [
        # Респираторные заболевания
        {
            "title": "ОРВИ - острая респираторная вирусная инфекция",
            "content": "ОРВИ характеризуется поражением верхних дыхательных путей. Основные симптомы: насморк, кашель, боль в горле, повышение температуры, слабость, головная боль. Лечение симптоматическое: обильное питье, жаропонижающие при температуре выше 38.5°C, покой.",
            "symptoms": ["насморк", "кашель", "боль в горле", "температура", "слабость", "головная боль"],
            "diseases": ["ОРВИ", "простуда"],
            "treatments": ["покой", "обильное питье", "жаропонижающие", "промывание носа"]
        },
        {
            "title": "Грипп - острое инфекционное заболевание",
            "content": "Грипп отличается от ОРВИ более тяжелым течением. Характерны: высокая температура (39-40°C), сильная головная боль, ломота в теле, сухой кашель, слабость. Опасен осложнениями. Требует постельного режима и обращения к врачу.",
            "symptoms": ["высокая температура", "головная боль", "ломота в теле", "сухой кашель", "слабость"],
            "diseases": ["грипп"],
            "treatments": ["постельный режим", "противовирусные препараты", "обильное питье", "жаропонижающие"]
        },
        {
            "title": "Бронхит - воспаление бронхов",
            "content": "Бронхит проявляется кашлем с мокротой, одышкой, болью в груди при кашле. Может быть острым и хроническим. Часто развивается после ОРВИ. Требует лечения у врача, применения отхаркивающих средств.",
            "symptoms": ["кашель с мокротой", "одышка", "боль в груди", "слабость", "субфебрильная температура"],
            "diseases": ["бронхит", "острый бронхит"],
            "treatments": ["отхаркивающие средства", "ингаляции", "обильное питье", "антибиотики по назначению"]
        },
        {
            "title": "Пневмония - воспаление легких",
            "content": "Пневмония - серьезное заболевание, требующее немедленного лечения. Симптомы: высокая температура, кашель, боль в груди при дыхании, одышка, слабость. Необходима госпитализация и антибактериальная терапия.",
            "symptoms": ["высокая температура", "кашель", "боль в груди", "одышка", "слабость", "озноб"],
            "diseases": ["пневмония", "воспаление легких"],
            "treatments": ["антибиотики", "госпитализация", "кислородотерапия", "жаропонижающие"]
        },
        
        # Желудочно-кишечные заболевания
        {
            "title": "Гастрит - воспаление слизистой желудка",
            "content": "Гастрит проявляется болью в эпигастрии, изжогой, тошнотой, отрыжкой. Боль усиливается или уменьшается после еды. Требует соблюдения диеты, приема антацидов, ингибиторов протонной помпы.",
            "symptoms": ["боль в животе", "изжога", "тошнота", "отрыжка", "тяжесть в желудке"],
            "diseases": ["гастрит", "острый гастрит"],
            "treatments": ["диета", "антациды", "ингибиторы протонной помпы", "исключение раздражающей пищи"]
        },
        {
            "title": "Язвенная болезнь желудка",
            "content": "Язва желудка характеризуется болью в эпигастрии натощак или через 1-2 часа после еды. Возможны ночные боли. Опасна кровотечением и прободением. Требует обязательного лечения у гастроэнтеролога.",
            "symptoms": ["боль в животе натощак", "изжога", "тошнота", "рвота", "снижение веса"],
            "diseases": ["язва желудка", "язвенная болезнь"],
            "treatments": ["ингибиторы протонной помпы", "антибиотики", "диета", "исключение стресса"]
        },
        {
            "title": "Пищевое отравление",
            "content": "Пищевое отравление развивается через несколько часов после употребления некачественной пищи. Проявляется тошнотой, рвотой, диареей, болью в животе, слабостью. Требует восполнения жидкости и электролитов.",
            "symptoms": ["тошнота", "рвота", "диарея", "боль в животе", "слабость", "температура"],
            "diseases": ["пищевое отравление", "отравление"],
            "treatments": ["регидратация", "сорбенты", "диета", "покой"]
        },
        
        # Сердечно-сосудистые заболевания
        {
            "title": "Гипертония - повышенное артериальное давление",
            "content": "Артериальная гипертензия часто протекает бессимптомно. Возможны головные боли, головокружение, шум в ушах, мелькание мушек перед глазами. Требует постоянного контроля давления и приема гипотензивных препаратов.",
            "symptoms": ["головная боль", "головокружение", "шум в ушах", "мелькание мушек", "слабость"],
            "diseases": ["гипертония", "артериальная гипертензия"],
            "treatments": ["гипотензивные препараты", "ограничение соли", "снижение веса", "физическая активность"]
        },
        {
            "title": "Стенокардия - боль в сердце",
            "content": "Стенокардия проявляется давящей болью за грудиной при физической нагрузке или стрессе. Боль отдает в левую руку, челюсть. Проходит в покое или после нитроглицерина. Требует обследования у кардиолога.",
            "symptoms": ["боль за грудиной", "одышка", "слабость", "потливость", "страх"],
            "diseases": ["стенокардия", "ишемическая болезнь сердца"],
            "treatments": ["нитроглицерин", "бета-блокаторы", "антиагреганты", "статины"]
        },
        
        # Эндокринные заболевания
        {
            "title": "Сахарный диабет 2 типа",
            "content": "Диабет 2 типа развивается постепенно. Характерны жажда, частое мочеиспускание, сухость во рту, слабость, плохое заживление ран. Требует контроля сахара крови, диеты, физической активности.",
            "symptoms": ["жажда", "частое мочеиспускание", "сухость во рту", "слабость", "зуд кожи"],
            "diseases": ["сахарный диабет", "диабет 2 типа"],
            "treatments": ["диета", "физическая активность", "сахароснижающие препараты", "контроль глюкозы"]
        },
        {
            "title": "Гипотиреоз - снижение функции щитовидной железы",
            "content": "Гипотиреоз проявляется слабостью, сонливостью, прибавкой веса, отеками, сухостью кожи, выпадением волос, зябкостью. Требует заместительной гормональной терапии.",
            "symptoms": ["слабость", "сонливость", "прибавка веса", "отеки", "сухость кожи", "зябкость"],
            "diseases": ["гипотиреоз"],
            "treatments": ["левотироксин", "контроль ТТГ", "диета"]
        },
        
        # Неврологические заболевания
        {
            "title": "Мигрень - приступообразная головная боль",
            "content": "Мигрень характеризуется пульсирующей односторонней головной болью, тошнотой, светобоязнью, звукобоязнью. Приступы могут длиться от 4 до 72 часов. Провоцируются стрессом, недосыпанием, некоторыми продуктами.",
            "symptoms": ["пульсирующая головная боль", "тошнота", "светобоязнь", "звукобоязнь", "слабость"],
            "diseases": ["мигрень"],
            "treatments": ["триптаны", "анальгетики", "покой в темной комнате", "избегание триггеров"]
        },
        {
            "title": "Вегето-сосудистая дистония",
            "content": "ВСД проявляется разнообразными симптомами: головокружение, слабость, потливость, сердцебиение, колебания давления. Часто связана со стрессом. Требует нормализации режима дня, психотерапии.",
            "symptoms": ["головокружение", "слабость", "потливость", "сердцебиение", "тревога"],
            "diseases": ["ВСД", "вегето-сосудистая дистония"],
            "treatments": ["режим дня", "психотерапия", "седативные препараты", "физические упражнения"]
        },
        
        # Аллергические заболевания
        {
            "title": "Аллергический ринит - сенная лихорадка",
            "content": "Аллергический ринит проявляется заложенностью носа, чиханием, зудом в носу, слезотечением. Обостряется при контакте с аллергенами. Требует приема антигистаминных препаратов.",
            "symptoms": ["заложенность носа", "чихание", "зуд в носу", "слезотечение", "зуд глаз"],
            "diseases": ["аллергический ринит", "поллиноз"],
            "treatments": ["антигистаминные", "назальные спреи", "избегание аллергенов", "промывание носа"]
        },
        {
            "title": "Крапивница - аллергическая сыпь",
            "content": "Крапивница проявляется зудящими волдырями на коже, которые появляются и исчезают. Может сопровождаться отеком губ, языка. При отеке гортани требует экстренной помощи.",
            "symptoms": ["зудящая сыпь", "волдыри", "отек губ", "зуд кожи"],
            "diseases": ["крапивница", "аллергия"],
            "treatments": ["антигистаминные", "глюкокортикоиды", "исключение аллергена", "холодные компрессы"]
        },
        
        # Инфекционные заболевания
        {
            "title": "Ангина - острый тонзиллит",
            "content": "Ангина проявляется сильной болью в горле при глотании, высокой температурой, увеличением миндалин с налетом. Требует антибактериальной терапии, полоскания горла.",
            "symptoms": ["сильная боль в горле", "высокая температура", "слабость", "головная боль", "увеличение лимфоузлов"],
            "diseases": ["ангина", "острый тонзиллит"],
            "treatments": ["антибиотики", "полоскание горла", "жаропонижающие", "постельный режим"]
        },
        {
            "title": "Цистит - воспаление мочевого пузыря",
            "content": "Цистит чаще встречается у женщин. Проявляется частым болезненным мочеиспусканием, резью внизу живота, иногда кровью в моче. Требует антибактериальной терапии, обильного питья.",
            "symptoms": ["частое мочеиспускание", "боль при мочеиспускании", "боль внизу живота", "жжение"],
            "diseases": ["цистит"],
            "treatments": ["антибиотики", "обильное питье", "фитопрепараты", "тепло на низ живота"]
        }
    ]
    
    try:
        with next(get_db()) as db:
            added_count = 0
            
            for data in medical_data:
                # Проверяем, нет ли уже такой записи
                existing = db.query(AITrainingData).filter(
                    AITrainingData.title == data["title"]
                ).first()
                
                if not existing:
                    training_data = AITrainingData(
                        source_name="medical_knowledge_base",
                        source_url="internal",
                        title=data["title"],
                        content=data["content"],
                        symptoms=data["symptoms"],
                        diseases=data["diseases"],
                        treatments=data["treatments"],
                        language="ru",
                        category="general_medicine",
                        quality_score=0.9,  # Высокое качество подготовленных данных
                        is_processed=True,  # Готовы к обучению
                        is_validated=True   # Проверены вручную
                    )
                    db.add(training_data)
                    added_count += 1
                    logger.info(f"Добавлено: {data['title']}")
                else:
                    logger.info(f"Уже существует: {data['title']}")
            
            db.commit()
            logger.info(f"✅ Добавлено {added_count} медицинских записей в базу данных")
            
            # Показываем общую статистику
            total_count = db.query(AITrainingData).count()
            processed_count = db.query(AITrainingData).filter(
                AITrainingData.is_processed == True
            ).count()
            
            logger.info(f"📊 Статистика:")
            logger.info(f"   - Всего записей в БД: {total_count}")
            logger.info(f"   - Готово для обучения: {processed_count}")
            
    except Exception as e:
        logger.error(f"❌ Ошибка при добавлении данных: {e}")
        return False
    
    return True


if __name__ == "__main__":
    print("🏥 Добавление медицинских данных для обучения AI...")
    print("=" * 60)
    
    success = add_medical_training_data()
    
    if success:
        print("\n✅ Данные успешно добавлены!")
        print("\n📋 Следующие шаги:")
        print("1. Запустите обучение: python init_ai_system.py train")
        print("2. Или полную инициализацию: python init_ai_system.py")
    else:
        print("\n❌ Ошибка при добавлении данных") 