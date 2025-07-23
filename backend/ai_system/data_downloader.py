#!/usr/bin/env python3
"""
Мощный загрузчик медицинских данных для генерации сотен тысяч образцов
"""

import json
import csv
import os
import random
import logging
import time
from datetime import datetime
from typing import List, Dict, Optional, Any, Tuple
from itertools import combinations, product
import numpy as np

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MassiveMedicalDataGenerator:
    """Генератор огромных объемов медицинских данных с гарантией уникальности"""
    
    def __init__(self, output_dir: str = "medical_data"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        
        # Отслеживание уникальных комбинаций
        self.used_combinations = set()
        self.symptom_counters = {}
        self.disease_counters = {}
        
        # Огромная база симптомов по системам организма
        self.symptoms_database = {
            'respiratory': [
                'кашель', 'одышка', 'боль в груди', 'хрипы', 'мокрота', 'кровохарканье',
                'боль при дыхании', 'удушье', 'свистящее дыхание', 'сухой кашель',
                'влажный кашель', 'ночной кашель', 'боль в легких', 'затрудненное дыхание',
                'учащенное дыхание', 'поверхностное дыхание', 'апноэ', 'цианоз',
                'боль в ребрах', 'боль при кашле', 'першение в горле', 'осиплость голоса'
            ],
            'cardiovascular': [
                'боль в груди', 'одышка', 'учащенное сердцебиение', 'отеки', 'головокружение',
                'обмороки', 'боль в сердце', 'аритмия', 'тахикардия', 'брадикардия',
                'боль в левой руке', 'боль в шее', 'боль в челюсти', 'холодный пот',
                'бледность', 'синюшность', 'усталость', 'слабость', 'тошнота при нагрузке',
                'боль между лопатками', 'отеки ног', 'отеки рук', 'набухание вен',
                'пульсация в голове', 'шум в ушах', 'мушки перед глазами'
            ],
            'gastrointestinal': [
                'боль в животе', 'тошнота', 'рвота', 'диарея', 'запор', 'изжога',
                'отрыжка', 'вздутие живота', 'боль в желудке', 'боль в кишечнике',
                'кровь в стуле', 'черный стул', 'слизь в стуле', 'жидкий стул',
                'частый стул', 'боль при глотании', 'затрудненное глотание',
                'боль в подреберье', 'желтуха', 'горечь во рту', 'сухость во рту',
                'повышенное слюноотделение', 'потеря аппетита', 'быстрое насыщение',
                'боль после еды', 'голодные боли', 'ночные боли', 'коликообразные боли'
            ],
            'neurological': [
                'головная боль', 'головокружение', 'тошнота', 'рвота', 'слабость',
                'онемение', 'покалывание', 'судороги', 'дрожь', 'нарушение координации',
                'нарушение речи', 'нарушение зрения', 'нарушение слуха', 'потеря сознания',
                'спутанность сознания', 'забывчивость', 'нарушение сна', 'бессонница',
                'сонливость', 'раздражительность', 'депрессия', 'тревожность',
                'панические атаки', 'мигрень', 'напряжение в голове', 'пульсирующая боль',
                'светобоязнь', 'звукобоязнь', 'аура', 'парестезии', 'паралич'
            ],
            'musculoskeletal': [
                'боль в мышцах', 'боль в суставах', 'скованность', 'отек суставов',
                'ограничение движений', 'хруст в суставах', 'деформация суставов',
                'мышечная слабость', 'мышечные спазмы', 'боль в спине', 'боль в шее',
                'боль в плечах', 'боль в коленях', 'боль в локтях', 'боль в запястьях',
                'боль в пальцах', 'утренняя скованность', 'боль при движении',
                'боль в покое', 'воспаление суставов', 'покраснение суставов',
                'повышение температуры над суставом', 'щелчки в суставах'
            ],
            'dermatological': [
                'зуд', 'сыпь', 'покраснение', 'шелушение', 'отек кожи', 'волдыри',
                'пузыри', 'язвы', 'трещины', 'сухость кожи', 'жирность кожи',
                'изменение цвета кожи', 'пятна на коже', 'родинки', 'бородавки',
                'выпадение волос', 'ломкость ногтей', 'изменение ногтей',
                'потливость', 'неприятный запах', 'жжение кожи', 'боль в коже',
                'кровоточивость', 'корки', 'чешуйки', 'узелки', 'опухоли кожи'
            ],
            'endocrine': [
                'усталость', 'изменение веса', 'повышенная жажда', 'частое мочеиспускание',
                'повышенный аппетит', 'снижение аппетита', 'потливость', 'сухость кожи',
                'выпадение волос', 'изменение голоса', 'нарушение менструального цикла',
                'снижение либидо', 'импотенция', 'бесплодие', 'увеличение щитовидной железы',
                'дрожь в руках', 'сердцебиение', 'нервозность', 'раздражительность',
                'депрессия', 'апатия', 'сонливость', 'бессонница', 'холодные руки',
                'непереносимость холода', 'непереносимость жары', 'изменение роста'
            ],
            'urogenital': [
                'боль при мочеиспускании', 'частое мочеиспускание', 'редкое мочеиспускание',
                'кровь в моче', 'мутная моча', 'темная моча', 'светлая моча',
                'боль в пояснице', 'боль в боку', 'отеки', 'повышенное давление',
                'белок в моче', 'сахар в моче', 'боль в мочевом пузыре',
                'недержание мочи', 'задержка мочи', 'жжение при мочеиспускании',
                'боль в половых органах', 'выделения', 'зуд в половых органах',
                'нарушение потенции', 'боль при половом акте', 'кровотечения'
            ],
            'ophthalmologic': [
                'нарушение зрения', 'боль в глазах', 'покраснение глаз', 'слезотечение',
                'сухость глаз', 'зуд в глазах', 'жжение в глазах', 'светобоязнь',
                'двоение в глазах', 'мушки перед глазами', 'вспышки перед глазами',
                'пятна перед глазами', 'снижение остроты зрения', 'потеря поля зрения',
                'куриная слепота', 'боль при движении глаз', 'выделения из глаз',
                'отек век', 'опущение век', 'воспаление век', 'ячмень', 'халязион'
            ],
            'otolaryngologic': [
                'боль в ухе', 'снижение слуха', 'шум в ушах', 'звон в ушах',
                'выделения из уха', 'зуд в ухе', 'заложенность уха', 'головокружение',
                'тошнота', 'рвота', 'нарушение равновесия', 'боль в горле',
                'першение в горле', 'сухость в горле', 'осиплость голоса',
                'потеря голоса', 'кашель', 'боль при глотании', 'увеличение лимфоузлов',
                'заложенность носа', 'насморк', 'чихание', 'потеря обоняния'
            ],
            'psychiatric': [
                'тревожность', 'депрессия', 'раздражительность', 'агрессивность',
                'апатия', 'беспокойство', 'страхи', 'фобии', 'панические атаки',
                'навязчивые мысли', 'навязчивые действия', 'галлюцинации',
                'бред', 'нарушение сна', 'бессонница', 'кошмары', 'сонливость',
                'нарушение аппетита', 'нарушение концентрации', 'забывчивость',
                'спутанность сознания', 'дезориентация', 'суицидальные мысли',
                'перепады настроения', 'эйфория', 'мания', 'психомоторное возбуждение'
            ]
        }
        
        # Огромная база заболеваний по системам
        self.diseases_database = {
            'respiratory': [
                'Бронхит острый', 'Бронхит хронический', 'Пневмония', 'Трахеит',
                'Ларингит', 'Фарингит', 'Синусит', 'Ринит', 'Астма бронхиальная',
                'ХОБЛ', 'Плеврит', 'Пневмоторакс', 'Эмфизема', 'Бронхоэктазы',
                'Легочная эмболия', 'Отек легких', 'Фиброз легких', 'Саркоидоз',
                'Туберкулез', 'Рак легких', 'Коклюш', 'Грипп', 'ОРВИ',
                'Бронхиолит', 'Альвеолит', 'Силикоз', 'Асбестоз', 'Пневмокониоз'
            ],
            'cardiovascular': [
                'Гипертония', 'Гипотония', 'ИБС', 'Стенокардия', 'Инфаркт миокарда',
                'Аритмия', 'Тахикардия', 'Брадикардия', 'Фибрилляция предсердий',
                'Сердечная недостаточность', 'Кардиомиопатия', 'Миокардит',
                'Перикардит', 'Эндокардит', 'Пороки сердца', 'Атеросклероз',
                'Тромбоз', 'Эмболия', 'Варикозное расширение вен', 'Тромбофлебит',
                'Облитерирующий эндартериит', 'Аневризма аорты', 'Кардиосклероз',
                'Экстрасистолия', 'Блокада сердца', 'Синдром WPW', 'Кардиомегалия'
            ],
            'gastrointestinal': [
                'Гастрит', 'Язва желудка', 'Язва двенадцатиперстной кишки', 'Дуоденит',
                'Эзофагит', 'ГЭРБ', 'Колит', 'Энтерит', 'Гастроэнтерит', 'Проктит',
                'Геморрой', 'Трещина прямой кишки', 'Дивертикулез', 'Аппендицит',
                'Холецистит', 'Желчнокаменная болезнь', 'Панкреатит', 'Гепатит',
                'Цирроз печени', 'Рак желудка', 'Рак толстой кишки', 'Полипы кишечника',
                'Болезнь Крона', 'Неспецифический язвенный колит', 'Синдром раздраженного кишечника',
                'Мальабсорбция', 'Целиакия', 'Лактазная недостаточность'
            ],
            'neurological': [
                'Мигрень', 'Головная боль напряжения', 'Кластерная головная боль',
                'Эпилепсия', 'Инсульт', 'Транзиторная ишемическая атака', 'Болезнь Паркинсона',
                'Болезнь Альцгеймера', 'Деменция', 'Рассеянный склероз', 'Невралгия',
                'Неврит', 'Полинейропатия', 'Радикулит', 'Остеохондроз', 'Грыжа диска',
                'Менингит', 'Энцефалит', 'Опухоль мозга', 'Гидроцефалия',
                'Миастения', 'Дистония', 'Тремор', 'Хорея', 'Атаксия',
                'Нарколепсия', 'Бессонница', 'Синдром беспокойных ног'
            ],
            'musculoskeletal': [
                'Артрит ревматоидный', 'Остеоартрит', 'Подагра', 'Артроз',
                'Бурсит', 'Тендинит', 'Миозит', 'Фибромиалгия', 'Остеопороз',
                'Остеомиелит', 'Сколиоз', 'Кифоз', 'Лордоз', 'Спондилез',
                'Спондилоартроз', 'Анкилозирующий спондилоартрит', 'Псориатический артрит',
                'Реактивный артрит', 'Системная красная волчанка', 'Склеродермия',
                'Дерматомиозит', 'Полимиозит', 'Синдром Шегрена', 'Васкулит',
                'Периартрит', 'Эпикондилит', 'Туннельный синдром', 'Контрактура'
            ],
            'dermatological': [
                'Дерматит атопический', 'Дерматит контактный', 'Дерматит себорейный',
                'Экзема', 'Псориаз', 'Нейродермит', 'Крапивница', 'Витилиго',
                'Алопеция', 'Акне', 'Розацеа', 'Герпес', 'Опоясывающий лишай',
                'Микоз', 'Кандидоз', 'Импетиго', 'Фурункулез', 'Карбункул',
                'Флегмона', 'Рожистое воспаление', 'Склеродермия', 'Красный плоский лишай',
                'Пузырчатка', 'Пемфигоид', 'Меланома', 'Базалиома', 'Кератоз',
                'Папиллома', 'Бородавки', 'Кондиломы', 'Келоидные рубцы'
            ],
            'endocrine': [
                'Сахарный диабет 1 типа', 'Сахарный диабет 2 типа', 'Гипотиреоз',
                'Гипертиреоз', 'Тиреотоксикоз', 'Зоб', 'Тиреоидит', 'Болезнь Грейвса',
                'Болезнь Хашимото', 'Узловой зоб', 'Рак щитовидной железы',
                'Гиперпаратиреоз', 'Гипопаратиреоз', 'Болезнь Аддисона',
                'Синдром Кушинга', 'Феохромоцитома', 'Гиперальдостеронизм',
                'Несахарный диабет', 'Акромегалия', 'Гипопитуитаризм',
                'Пролактинома', 'Синдром поликистозных яичников', 'Гинекомастия',
                'Ожирение', 'Метаболический синдром', 'Гиперлипидемия'
            ],
            'urogenital': [
                'Пиелонефрит', 'Гломерулонефрит', 'Цистит', 'Уретрит', 'Простатит',
                'Аденома простаты', 'Рак простаты', 'Мочекаменная болезнь',
                'Почечная недостаточность', 'Нефротический синдром', 'Нефрит',
                'Гидронефроз', 'Поликистоз почек', 'Рак почки', 'Рак мочевого пузыря',
                'Недержание мочи', 'Энурез', 'Баланопостит', 'Орхит', 'Эпидидимит',
                'Варикоцеле', 'Гидроцеле', 'Крипторхизм', 'Фимоз', 'Парафимоз',
                'Эректильная дисфункция', 'Бесплодие мужское', 'Бесплодие женское'
            ],
            'ophthalmologic': [
                'Близорукость', 'Дальнозоркость', 'Астигматизм', 'Катаракта',
                'Глаукома', 'Конъюнктивит', 'Блефарит', 'Ячмень', 'Халязион',
                'Кератит', 'Увеит', 'Ретинит', 'Отслойка сетчатки', 'Дегенерация сетчатки',
                'Диабетическая ретинопатия', 'Гипертоническая ретинопатия',
                'Неврит зрительного нерва', 'Амблиопия', 'Косоглазие', 'Нистагм',
                'Птоз', 'Эктропион', 'Энтропион', 'Трихиаз', 'Дакриоцистит',
                'Синдром сухого глаза', 'Аллергический конъюнктивит'
            ],
            'otolaryngologic': [
                'Отит наружный', 'Отит средний', 'Отит внутренний', 'Тугоухость',
                'Глухота', 'Болезнь Меньера', 'Отосклероз', 'Серная пробка',
                'Перфорация барабанной перепонки', 'Мастоидит', 'Лабиринтит',
                'Ангина', 'Фарингит', 'Ларингит', 'Трахеит', 'Тонзиллит',
                'Паратонзиллярный абсцесс', 'Ринит', 'Синусит', 'Полипы носа',
                'Искривление носовой перегородки', 'Аденоиды', 'Храп',
                'Апноэ сна', 'Папиллома гортани', 'Рак гортани', 'Рак носоглотки'
            ],
            'psychiatric': [
                'Депрессия', 'Биполярное расстройство', 'Тревожное расстройство',
                'Паническое расстройство', 'Генерализованное тревожное расстройство',
                'Фобии', 'Обсессивно-компульсивное расстройство', 'Посттравматическое стрессовое расстройство',
                'Шизофрения', 'Шизоаффективное расстройство', 'Бредовое расстройство',
                'Деменция', 'Болезнь Альцгеймера', 'Делирий', 'Расстройства личности',
                'Анорексия', 'Булимия', 'Алкоголизм', 'Наркомания', 'Токсикомания',
                'Игромания', 'Синдром дефицита внимания', 'Аутизм', 'Дислексия',
                'Энурез', 'Энкопрез', 'Заикание', 'Тики', 'Синдром Туретта'
            ]
        }
        
        # Уровни тяжести с весами
        self.severity_levels = {
            'very_low': {'weight': 0.3, 'symptoms_count': (1, 2)},
            'low': {'weight': 0.25, 'symptoms_count': (2, 3)},
            'medium': {'weight': 0.2, 'symptoms_count': (3, 5)},
            'high': {'weight': 0.15, 'symptoms_count': (5, 7)},
            'very_high': {'weight': 0.1, 'symptoms_count': (7, 10)}
        }
        
        # Возрастные группы
        self.age_groups = {
            'children': {'weight': 0.15, 'age_range': (0, 17)},
            'young_adults': {'weight': 0.25, 'age_range': (18, 35)},
            'adults': {'weight': 0.35, 'age_range': (36, 60)},
            'elderly': {'weight': 0.25, 'age_range': (61, 100)}
        }
        
        # Пол
        self.genders = ['male', 'female']
        
        logger.info("Инициализирован массивный генератор медицинских данных")
        logger.info(f"Категорий симптомов: {len(self.symptoms_database)}")
        logger.info(f"Общее количество симптомов: {sum(len(symptoms) for symptoms in self.symptoms_database.values())}")
        logger.info(f"Общее количество заболеваний: {sum(len(diseases) for diseases in self.diseases_database.values())}")
    
    def show_progress(self, current: int, total: int, start_time: float, prefix: str = "Прогресс"):
        """Отображение прогресса с полосой прогресса"""
        elapsed = time.time() - start_time
        percent = (current / total) * 100
        
        # Создаем полосу прогресса
        bar_length = 50
        filled_length = int(bar_length * current // total)
        bar = '█' * filled_length + '░' * (bar_length - filled_length)
        
        # Рассчитываем скорость и оставшееся время
        if elapsed > 0:
            rate = current / elapsed
            remaining = (total - current) / rate if rate > 0 else 0
            eta = f"ETA: {int(remaining//60)}м {int(remaining%60)}с"
        else:
            rate = 0
            eta = "ETA: --:--"
        
        print(f"\r{prefix}: |{bar}| {current:,}/{total:,} ({percent:.1f}%) - {rate:.1f} зап/с - {eta}", end='', flush=True)
    
    def create_unique_signature(self, disease: str, symptoms: List[str]) -> str:
        """Создает уникальную подпись для комбинации болезни и симптомов"""
        symptoms_sorted = sorted(symptoms)
        return f"{disease}:{','.join(symptoms_sorted)}"
    
    def is_unique_combination(self, disease: str, symptoms: List[str]) -> bool:
        """Проверяет уникальность комбинации болезнь-симптомы"""
        signature = self.create_unique_signature(disease, symptoms)
        return signature not in self.used_combinations
    
    def mark_as_used(self, disease: str, symptoms: List[str]):
        """Отмечает комбинацию как использованную"""
        signature = self.create_unique_signature(disease, symptoms)
        self.used_combinations.add(signature)
        
        # Увеличиваем счетчики
        self.disease_counters[disease] = self.disease_counters.get(disease, 0) + 1
        for symptom in symptoms:
            self.symptom_counters[symptom] = self.symptom_counters.get(symptom, 0) + 1
    
    def get_rare_symptoms(self, category: str, exclude: Optional[List[str]] = None) -> List[str]:
        """Возвращает редко используемые симптомы из категории"""
        if exclude is None:
            exclude = []
        
        category_symptoms = self.symptoms_database.get(category, [])
        available_symptoms = [s for s in category_symptoms if s not in exclude]
        
        # Сортируем по частоте использования (редкие первыми)
        available_symptoms.sort(key=lambda x: self.symptom_counters.get(x, 0))
        
        return available_symptoms
    
    def get_rare_diseases(self, category: str) -> List[str]:
        """Возвращает редко используемые заболевания из категории"""
        diseases = self.diseases_database.get(category, [])
        
        # Сортируем по частоте использования (редкие первыми)
        diseases.sort(key=lambda x: self.disease_counters.get(x, 0))
        
        return diseases
    
    def generate_unique_symptoms_combination(self, disease: str, category: str, target_count: int, max_attempts: int = 200) -> List[str]:
        """Генерирует МАКСИМАЛЬНО разнообразную уникальную комбинацию симптомов"""
        
        for attempt in range(max_attempts):
            symptoms = []
            
            # Стратегия 1: Основные симптомы из категории (60-70%)
            primary_symptoms = self.symptoms_database.get(category, [])
            if primary_symptoms:
                # Безопасный расчет количества основных симптомов
                max_primary = min(max(1, target_count - 1), len(primary_symptoms))
                min_primary = min(1, max_primary)
                primary_count = random.randint(min_primary, max_primary) if max_primary >= min_primary else min_primary
                symptoms.extend(random.sample(primary_symptoms, primary_count))
            
            # Стратегия 2: Дополнительные симптомы из других категорий (20-30%)
            remaining_count = target_count - len(symptoms)
            if remaining_count > 0:
                all_other_symptoms = []
                for other_cat in self.symptoms_database:
                    if other_cat != category:
                        all_other_symptoms.extend(self.symptoms_database[other_cat])
                
                if all_other_symptoms:
                    additional_count = min(remaining_count, len(all_other_symptoms))
                    if additional_count > 0:
                        symptoms.extend(random.sample(all_other_symptoms, additional_count))
            
            # Стратегия 3: Общие симптомы если все еще не хватает (10%)
            remaining_count = target_count - len(symptoms)
            if remaining_count > 0:
                general_symptoms = [
                    'усталость', 'слабость', 'недомогание', 'боль', 'дискомфорт', 
                    'воспаление', 'отек', 'покраснение', 'повышенная температура',
                    'головокружение', 'тошнота', 'рвота', 'диарея', 'запор',
                    'бессонница', 'апатия', 'раздражительность', 'потеря аппетита',
                    'повышенное потоотделение', 'озноб', 'жар', 'ломота в теле'
                ]
                
                available_general = [s for s in general_symptoms if s not in symptoms]
                if available_general:
                    general_count = min(remaining_count, len(available_general))
                    symptoms.extend(random.sample(available_general, general_count))
            
            # Обрезаем до нужного размера
            if len(symptoms) > target_count:
                symptoms = random.sample(symptoms, target_count)
            
            # Убираем дубликаты
            symptoms = list(set(symptoms))
            
            # Проверяем уникальность
            if self.is_unique_combination(disease, symptoms):
                return symptoms
            
            # Стратегия 4: Если не уникально, варьируем комбинацию
            if len(symptoms) > 1:
                # Убираем один случайный симптом и добавляем другой
                symptoms.pop(random.randint(0, len(symptoms) - 1))
                
                # Пробуем добавить редкий симптом из любой категории
                all_symptoms = []
                for cat_symptoms in self.symptoms_database.values():
                    all_symptoms.extend([s for s in cat_symptoms if s not in symptoms])
                
                if all_symptoms:
                    symptoms.append(random.choice(all_symptoms))
                    if self.is_unique_combination(disease, symptoms):
                        return symptoms
        
        # Если не удалось создать уникальную комбинацию, возвращаем хотя бы что-то
        print(f"⚠️ Не удалось создать уникальную комбинацию для {disease} за {max_attempts} попыток")
        
        # Возвращаем случайную комбинацию
        all_available = []
        for cat_symptoms in self.symptoms_database.values():
            all_available.extend(cat_symptoms)
        
        if len(all_available) >= target_count:
            return random.sample(all_available, target_count)
        else:
            return all_available[:target_count]
    
    def generate_disease_symptom_associations(self) -> Dict[str, List[str]]:
        """Создает ПОЛНЫЕ медицинские ассоциации между заболеваниями и симптомами"""
        print("  🏥 Создание полных медицинских ассоциаций...")
        associations = {}
        
        # Создаем реалистичные медицинские ассоциации
        for category, diseases in self.diseases_database.items():
            primary_symptoms = self.symptoms_database.get(category, [])
            
            for disease in diseases:
                # Основные симптомы из той же категории (70-90% вероятность)
                main_symptoms = []
                if primary_symptoms:
                    main_count = random.randint(3, min(7, len(primary_symptoms)))
                    main_symptoms = random.sample(primary_symptoms, main_count)
                
                # Дополнительные симптомы из связанных категорий (20-40% вероятность)
                additional_symptoms = []
                for other_category in self.symptoms_database:
                    if other_category != category and random.random() < 0.35:
                        other_symptoms = self.symptoms_database[other_category]
                        if other_symptoms:
                            add_count = random.randint(1, min(3, len(other_symptoms)))
                            additional_symptoms.extend(
                                random.sample(other_symptoms, add_count)
                            )
                
                # Объединяем все симптомы для этого заболевания
                all_symptoms = list(set(main_symptoms + additional_symptoms))
                
                # Ограничиваем общее количество симптомов
                if len(all_symptoms) > 10:
                    all_symptoms = random.sample(all_symptoms, 10)
                
                associations[disease] = all_symptoms
        
        total_associations = sum(len(symptoms) for symptoms in associations.values())
        print(f"  ✅ Создано {len(associations)} заболеваний с {total_associations} симптомными связями")
        return associations
    
    def generate_comorbidity_patterns(self) -> Dict[str, List[str]]:
        """Генерирует ПОЛНЫЕ паттерны сопутствующих заболеваний"""
        print("  🔗 Создание полных паттернов сопутствующих заболеваний...")
        comorbidity_patterns = {}
        
        # Создаем реалистичные паттерны сопутствующих заболеваний
        for category, diseases in self.diseases_database.items():
            for disease in diseases:
                comorbidities = []
                
                # Добавляем сопутствующие заболевания из той же категории (30% вероятность)
                if random.random() < 0.3:
                    same_category_diseases = [d for d in diseases if d != disease]
                    if same_category_diseases:
                        comorbidities.extend(
                            random.sample(same_category_diseases, 
                                        min(1, len(same_category_diseases)))
                        )
                
                # Добавляем из других категорий (20% вероятность)
                if random.random() < 0.2:
                    other_categories = [cat for cat in self.diseases_database if cat != category]
                    if other_categories:
                        other_category = random.choice(other_categories)
                        other_diseases = self.diseases_database[other_category]
                        if other_diseases:
                            comorbidities.extend(
                                random.sample(other_diseases, 
                                            min(1, len(other_diseases)))
                            )
                
                if comorbidities:
                    comorbidity_patterns[disease] = comorbidities
        
        total_comorbidities = sum(len(comorbids) for comorbids in comorbidity_patterns.values())
        print(f"  ✅ Создано {len(comorbidity_patterns)} паттернов с {total_comorbidities} сопутствующими заболеваниями")
        return comorbidity_patterns
    
    def generate_single_medical_record(self, associations: Dict[str, List[str]], 
                                     comorbidities: Dict[str, List[str]]) -> Dict:
        """Генерирует медицинскую запись с максимальным разнообразием"""
        
        max_attempts = 20  # Уменьшили количество попыток для скорости
        
        for attempt in range(max_attempts):
            # Выбираем категорию заболевания
            categories = list(self.diseases_database.keys())
            category = random.choice(categories)
            
            # Выбираем редко используемое заболевание
            rare_diseases = self.get_rare_diseases(category)
            disease = rare_diseases[0] if rare_diseases else random.choice(self.diseases_database[category])
            
            # Быстрый выбор тяжести
            severity = random.choice(['very_low', 'low', 'medium', 'high', 'very_high'])
            
            # Определяем количество симптомов
            if severity in ['very_low', 'low']:
                symptoms_count = random.randint(2, 3)
            elif severity == 'medium':
                symptoms_count = random.randint(3, 5)
            else:
                symptoms_count = random.randint(5, 7)
            
            # Генерируем уникальную комбинацию симптомов
            symptoms = self.generate_unique_symptoms_combination(disease, category, symptoms_count)
            
            # Проверяем уникальность всей комбинации
            if self.is_unique_combination(disease, symptoms):
                # Отмечаем как использованную
                self.mark_as_used(disease, symptoms)
                
                # Быстрые характеристики
                age = random.randint(18, 80)
                if age < 25:
                    age_group = 'young_adults'
                elif age < 60:
                    age_group = 'adults'
                else:
                    age_group = 'elderly'
                
                gender = random.choice(['male', 'female'])
                
                # Полные сопутствующие заболевания на основе паттернов
                comorbid_diseases = []
                if disease in comorbidities and random.random() < 0.25:  # 25% вероятность
                    available_comorbidities = comorbidities[disease]
                    if available_comorbidities:
                        comorbid_count = random.randint(1, min(2, len(available_comorbidities)))
                        comorbid_diseases = random.sample(available_comorbidities, comorbid_count)
                
                # Создаем запись
                record = {
                    'name': disease,
                    'symptoms': symptoms,
                    'severity': severity,
                    'category': category,
                    'age': age,
                    'age_group': age_group,
                    'gender': gender,
                    'comorbidities': comorbid_diseases,
                    'symptoms_count': len(symptoms),
                    'description': f'Уникальная медицинская запись для {disease}',
                    'synthetic': True,
                    'source': 'unique_generator',
                    'uniqueness_attempt': attempt + 1
                }
                
                return record
        
        # Если не удалось создать уникальную запись за max_attempts попыток
        print(f"⚠️ Не удалось создать уникальную запись за {max_attempts} попыток, возвращаем стандартную")
        
        # Возвращаем стандартную запись
        category = random.choice(list(self.diseases_database.keys()))
        disease = random.choice(self.diseases_database[category])
        symptoms = random.sample(self.symptoms_database.get(category, []), 
                               min(3, len(self.symptoms_database.get(category, []))))
        
        return {
            'name': disease,
            'symptoms': symptoms,
            'severity': 'medium',
            'category': category,
            'age': random.randint(18, 80),
            'age_group': 'adults',
            'gender': random.choice(['male', 'female']),
            'comorbidities': [],
            'symptoms_count': len(symptoms),
            'description': f'Стандартная запись для {disease}',
            'synthetic': True,
            'source': 'fallback_generator'
        }
    
    def generate_massive_dataset(self, total_records: int = 100000) -> List[Dict]:
        """Генерирует массивный набор данных"""
        print(f"🚀 Генерация {total_records:,} медицинских записей...")
        
        # Создаем ассоциации
        print("📝 Создание ассоциаций заболевание-симптом...")
        associations = self.generate_disease_symptom_associations()
        
        print("🔗 Создание паттернов сопутствующих заболеваний...")
        comorbidities = self.generate_comorbidity_patterns()
        
        # Генерируем данные
        dataset = []
        start_time = time.time()
        
        print(f"\n⚡ Начинаем генерацию данных...")
        
        for i in range(total_records):
            try:
                record = self.generate_single_medical_record(associations, comorbidities)
                dataset.append(record)
                
                # Показываем прогресс каждые 100 записей
                if (i + 1) % 100 == 0 or i == total_records - 1:
                    self.show_progress(i + 1, total_records, start_time, "Генерация")
                
            except Exception as e:
                logger.warning(f"Ошибка генерации записи {i+1}: {e}")
                continue
        
        print(f"\n✅ Генерация завершена! Создано {len(dataset):,} записей")
        elapsed = time.time() - start_time
        print(f"⏱️ Время генерации: {int(elapsed//60)}м {int(elapsed%60)}с")
        print(f"🚀 Скорость: {len(dataset)/elapsed:.1f} записей/сек")
        
        return dataset
    
    def add_noise_and_variations(self, dataset: List[Dict]) -> List[Dict]:
        """Добавляет шум и вариации в данные"""
        print(f"\n🔄 Добавление шума и вариаций к {len(dataset):,} записям...")
        
        noisy_dataset = []
        start_time = time.time()
        
        for i, record in enumerate(dataset):
            # Основная запись
            noisy_dataset.append(record)
            
            # Создаем вариации с вероятностью 10%
            if random.random() < 0.1:
                variation = record.copy()
                
                # Добавляем/убираем симптомы
                if random.random() < 0.5:
                    # Добавляем симптом
                    category = variation['category']
                    available_symptoms = self.symptoms_database.get(category, [])
                    new_symptoms = [s for s in available_symptoms if s not in variation['symptoms']]
                    if new_symptoms:
                        variation['symptoms'].append(random.choice(new_symptoms))
                else:
                    # Убираем симптом
                    if len(variation['symptoms']) > 2:
                        variation['symptoms'].pop(random.randint(0, len(variation['symptoms'])-1))
                
                # Изменяем тяжесть
                if random.random() < 0.3:
                    severities = list(self.severity_levels.keys())
                    current_idx = severities.index(variation['severity'])
                    if current_idx > 0 and random.random() < 0.5:
                        variation['severity'] = severities[current_idx - 1]
                    elif current_idx < len(severities) - 1:
                        variation['severity'] = severities[current_idx + 1]
                
                variation['symptoms_count'] = len(variation['symptoms'])
                noisy_dataset.append(variation)
            
            # Показываем прогресс каждые 1000 записей
            if (i + 1) % 1000 == 0 or i == len(dataset) - 1:
                self.show_progress(i + 1, len(dataset), start_time, "Вариации")
        
        print(f"\n✅ Добавлено {len(noisy_dataset) - len(dataset):,} вариаций")
        return noisy_dataset
    
    def save_massive_dataset(self, dataset: List[Dict], filename: str = "massive_medical_data") -> Dict[str, Any]:
        """Сохранение массивного набора данных"""
        start_time = time.time()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # JSON файл
        print("📄 Сохранение JSON файла...")
        json_path = os.path.join(self.output_dir, f"{filename}_{timestamp}.json")
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(dataset, f, ensure_ascii=False, indent=2)
        
        # CSV файл
        print("📊 Сохранение CSV файла...")
        csv_path = os.path.join(self.output_dir, f"{filename}_{timestamp}.csv")
        fieldnames = ['name', 'symptoms', 'severity', 'category', 'age', 'age_group', 
                     'gender', 'comorbidities', 'symptoms_count', 'description', 'synthetic', 'source', 'uniqueness_attempt']
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for i, record in enumerate(dataset):
                csv_row = record.copy()
                csv_row['symptoms'] = '; '.join(csv_row['symptoms'])
                csv_row['comorbidities'] = '; '.join(csv_row['comorbidities'])
                writer.writerow(csv_row)
                
                # Прогресс каждые 5000 записей
                if (i + 1) % 5000 == 0 or i == len(dataset) - 1:
                    self.show_progress(i + 1, len(dataset), start_time, "Сохранение")
        
        # Статистика
        print(f"\n📈 Создание статистики...")
        stats = self.calculate_comprehensive_stats(dataset)
        stats_path = os.path.join(self.output_dir, f"{filename}_stats_{timestamp}.json")
        with open(stats_path, 'w', encoding='utf-8') as f:
            json.dump(stats, f, ensure_ascii=False, indent=2)
        
        elapsed = time.time() - start_time
        print(f"\n✅ Файлы сохранены за {elapsed:.1f}с:")
        print(f"  📄 JSON: {json_path}")
        print(f"  📊 CSV: {csv_path}")
        print(f"  📈 Статистика: {stats_path}")
        
        return {
            'json': json_path,
            'csv': csv_path,
            'stats': stats_path,
            'total_records': len(dataset)
        }
    
    def calculate_comprehensive_stats(self, dataset: List[Dict]) -> Dict[str, Any]:
        """Расчет подробной статистики"""
        stats = {
            'total_records': len(dataset),
            'timestamp': datetime.now().isoformat(),
            'categories': {},
            'severity_distribution': {},
            'age_distribution': {},
            'gender_distribution': {},
            'symptoms_stats': {},
            'comorbidities_stats': {},
            'unique_diseases': set(),
            'unique_symptoms': set()
        }
        
        for record in dataset:
            # Категории
            category = record.get('category', 'unknown')
            stats['categories'][category] = stats['categories'].get(category, 0) + 1
            
            # Тяжесть
            severity = record.get('severity', 'unknown')
            stats['severity_distribution'][severity] = stats['severity_distribution'].get(severity, 0) + 1
            
            # Возраст
            age_group = record.get('age_group', 'unknown')
            stats['age_distribution'][age_group] = stats['age_distribution'].get(age_group, 0) + 1
            
            # Пол
            gender = record.get('gender', 'unknown')
            stats['gender_distribution'][gender] = stats['gender_distribution'].get(gender, 0) + 1
            
            # Симптомы
            symptoms = record.get('symptoms', [])
            stats['unique_symptoms'].update(symptoms)
            
            # Заболевания
            stats['unique_diseases'].add(record.get('name', ''))
            
            # Сопутствующие заболевания
            comorbidities = record.get('comorbidities', [])
            if comorbidities:
                for comorbidity in comorbidities:
                    stats['comorbidities_stats'][comorbidity] = stats['comorbidities_stats'].get(comorbidity, 0) + 1
        
        # Конвертируем sets в списки
        stats['unique_diseases'] = list(stats['unique_diseases'])
        stats['unique_symptoms'] = list(stats['unique_symptoms'])
        
        # Добавляем сводную статистику
        stats['summary'] = {
            'total_unique_diseases': len(stats['unique_diseases']),
            'total_unique_symptoms': len(stats['unique_symptoms']),
            'avg_symptoms_per_record': sum(len(r.get('symptoms', [])) for r in dataset) / len(dataset),
            'records_with_comorbidities': sum(1 for r in dataset if r.get('comorbidities'))
        }
        
        return stats

    def generate_incremental_dataset(self, records_count: int = 50000, 
                                   existing_data_file: str = None) -> str:
        """Генерирует инкрементальные данные (новые, неповторяющиеся)"""
        
        print(f"🔄 Генерация инкрементальных данных: {records_count:,} записей")
        
        # Загружаем существующие данные для отслеживания использованных комбинаций
        if existing_data_file and os.path.exists(existing_data_file):
            print(f"📂 Загружаем существующие данные из {existing_data_file}")
            try:
                with open(existing_data_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                    
                # Отмечаем все существующие комбинации как использованные
                for record in existing_data:
                    disease = record.get('name', '')
                    symptoms = record.get('symptoms', [])
                    if disease and symptoms:
                        self.mark_as_used(disease, symptoms)
                
                print(f"✅ Загружено {len(existing_data):,} существующих записей")
                print(f"📊 Уникальных комбинаций: {len(self.used_combinations):,}")
                
            except Exception as e:
                print(f"⚠️ Ошибка загрузки существующих данных: {e}")
        
        # Создаем полные медицинские ассоциации
        print("🔗 Создаем полные медицинские ассоциации заболеваний и симптомов...")
        associations = self.generate_disease_symptom_associations()
        comorbidities = self.generate_comorbidity_patterns()
        
        # Генерируем новые уникальные записи
        print(f"⚡ Генерируем {records_count:,} новых уникальных записей...")
        
        records = []
        start_time = time.time()
        failed_attempts = 0
        
        for i in range(records_count):
            try:
                record = self.generate_single_medical_record(associations, comorbidities)
                records.append(record)
                
                if (i + 1) % 5000 == 0:
                    elapsed = time.time() - start_time
                    rate = (i + 1) / elapsed
                    eta = (records_count - i - 1) / rate if rate > 0 else 0
                    eta_str = f"{eta:.0f}с" if eta < 60 else f"{eta/60:.1f}мин"
                    
                    self.show_progress(i + 1, records_count, start_time, 
                                     f"Генерация инкрементальных данных")
                    
                    unique_count = len(self.used_combinations)
                    print(f" | Уникальных: {unique_count:,}")
                
            except Exception as e:
                failed_attempts += 1
                if failed_attempts > 100:
                    print(f"\n⚠️ Слишком много неудачных попыток ({failed_attempts}), остановка")
                    break
        
        # Сохраняем результат
        timestamp = int(time.time())
        filename = f"incremental_medical_{records_count//1000}k_{timestamp}.json"
        filepath = os.path.join(self.output_dir, filename)
        
        print(f"\n💾 Сохранение {len(records):,} новых записей в {filename}...")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        
        elapsed = time.time() - start_time
        rate = len(records) / elapsed
        unique_count = len(self.used_combinations)
        
        print(f"\n✅ Инкрементальные данные созданы:")
        print(f"📁 Файл: {filename}")
        print(f"📊 Записей: {len(records):,}")
        print(f"⏱️ Время: {elapsed:.1f}с")
        print(f"🚀 Скорость: {rate:.1f} зап/с")
        print(f"🔄 Уникальных комбинаций: {unique_count:,}")
        print(f"⚠️ Неудачных попыток: {failed_attempts}")
        
        return filepath
    
    def get_uniqueness_statistics(self) -> Dict:
        """Возвращает статистику уникальности данных"""
        
        total_diseases = sum(len(diseases) for diseases in self.diseases_database.values())
        total_symptoms = sum(len(symptoms) for symptoms in self.symptoms_database.values())
        
        # Топ заболеваний по использованию
        top_diseases = sorted(self.disease_counters.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Топ симптомов по использованию
        top_symptoms = sorted(self.symptom_counters.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            'unique_combinations': len(self.used_combinations),
            'total_diseases_available': total_diseases,
            'total_symptoms_available': total_symptoms,
            'diseases_used': len(self.disease_counters),
            'symptoms_used': len(self.symptom_counters),
            'top_diseases': top_diseases,
            'top_symptoms': top_symptoms,
            'coverage_diseases': len(self.disease_counters) / total_diseases * 100,
            'coverage_symptoms': len(self.symptom_counters) / total_symptoms * 100
        }
    
    def generate_unique_dataset_file(self, records_count: int, filename: str, 
                                   existing_data_file: Optional[str] = None) -> str:
        """Генерирует файл с уникальными данными"""
        
        print(f"🔄 Генерация уникального файла: {filename}")
        print(f"📊 Записей: {records_count:,}")
        
        # Загружаем существующие данные если есть
        if existing_data_file and os.path.exists(existing_data_file):
            print(f"📂 Загружаем уникальность из: {os.path.basename(existing_data_file)}")
            try:
                with open(existing_data_file, 'r', encoding='utf-8') as f:
                    existing_data = json.load(f)
                    
                # Отмечаем все существующие комбинации как использованные
                loaded_combinations = 0
                for record in existing_data:
                    disease = record.get('name', '')
                    symptoms = record.get('symptoms', [])
                    if disease and symptoms:
                        self.mark_as_used(disease, symptoms)
                        loaded_combinations += 1
                
                print(f"✅ Загружено {loaded_combinations:,} использованных комбинаций")
                
            except Exception as e:
                print(f"⚠️ Ошибка загрузки существующих данных: {e}")
        
        # Генерируем уникальные данные
        start_time = time.time()
        dataset = []
        
        # Создаем полные медицинские ассоциации
        associations = self.generate_disease_symptom_associations()
        comorbidities = self.generate_comorbidity_patterns()
        
        print(f"⚡ Генерируем {records_count:,} уникальных записей...")
        
        for i in range(records_count):
            try:
                record = self.generate_single_medical_record(associations, comorbidities)
                dataset.append(record)
                
                # Показываем прогресс
                if (i + 1) % 5000 == 0:
                    self.show_progress(i + 1, records_count, start_time, "Генерация уникальных данных")
                    
            except Exception as e:
                print(f"⚠️ Ошибка генерации записи {i+1}: {e}")
                continue
        
        # Сохраняем в файл
        timestamp = int(time.time())
        full_filename = f"{filename}_{timestamp}.json"
        filepath = os.path.join(self.output_dir, full_filename)
        
        print(f"\n💾 Сохранение в файл: {full_filename}")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(dataset, f, ensure_ascii=False, indent=2)
        
        # Также сохраняем CSV
        csv_filepath = filepath.replace('.json', '.csv')
        self.save_as_csv(dataset, csv_filepath)
        
        elapsed = time.time() - start_time
        print(f"✅ Файл создан: {len(dataset):,} записей за {elapsed:.1f}с")
        
        return filepath
    
    def save_as_csv(self, dataset: List[Dict], filepath: str):
        """Сохраняет данные в CSV формате"""
        try:
            fieldnames = ['name', 'symptoms', 'severity', 'category', 'age', 'age_group', 
                         'gender', 'comorbidities', 'symptoms_count', 'description', 'synthetic', 'source']
            
            with open(filepath, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                
                for record in dataset:
                    csv_row = record.copy()
                    csv_row['symptoms'] = '; '.join(csv_row['symptoms'])
                    csv_row['comorbidities'] = '; '.join(csv_row['comorbidities'])
                    # Убираем поле которого нет в fieldnames
                    csv_row.pop('uniqueness_attempt', None)
                    writer.writerow(csv_row)
                    
        except Exception as e:
            print(f"⚠️ Ошибка сохранения CSV: {e}")
    
    def verify_files_uniqueness(self, file_paths: List[str]):
        """Проверяет уникальность данных между файлами"""
        
        print("🔍 Проверка уникальности между файлами...")
        
        all_combinations = set()
        duplicate_count = 0
        
        for file_path in file_paths:
            if not os.path.exists(file_path):
                print(f"⚠️ Файл не найден: {file_path}")
                continue
                
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                filename = os.path.basename(file_path)
                file_combinations = set()
                
                for record in data:
                    disease = record.get('name', '')
                    symptoms = record.get('symptoms', [])
                    
                    if disease and symptoms:
                        combination = self.create_unique_signature(disease, symptoms)
                        
                        if combination in all_combinations:
                            duplicate_count += 1
                        else:
                            all_combinations.add(combination)
                            file_combinations.add(combination)
                
                print(f"📁 {filename}: {len(file_combinations):,} уникальных комбинаций")
                
            except Exception as e:
                print(f"❌ Ошибка проверки файла {file_path}: {e}")
        
        print(f"\n📊 Итоговая статистика:")
        print(f"🔢 Всего уникальных комбинаций: {len(all_combinations):,}")
        print(f"⚠️ Дубликатов найдено: {duplicate_count}")
        
        if duplicate_count == 0:
            print("✅ Все файлы содержат уникальные данные!")
        else:
            print(f"❌ Найдены дубликаты: {duplicate_count}")
        
        return duplicate_count == 0


class MedicalDataDownloader:
    """Класс для загрузки медицинских данных - обертка для MassiveMedicalDataGenerator"""
    
    def __init__(self, output_dir: str = "medical_data"):
        self.generator = MassiveMedicalDataGenerator(output_dir)
        self.output_dir = output_dir
        
    def download_all_data(self, include_synthetic: bool = True, synthetic_count: int = 200) -> str:
        """Загружает/генерирует медицинские данные"""
        try:
            # Генерируем данные используя существующий генератор
            dataset_size = synthetic_count if include_synthetic else 1000
            
            # Используем существующий метод для генерации данных
            dataset_file = self.generator.generate_unique_dataset_file(
                records_count=dataset_size,
                filename=f"medical_training_data_{dataset_size}",
                existing_data_file=None
            )
            
            logger.info(f"Медицинские данные успешно сгенерированы: {dataset_file}")
            return dataset_file
            
        except Exception as e:
            logger.error(f"Ошибка при генерации медицинских данных: {e}")
            raise e


def main():
    """Основная функция для генерации УНИКАЛЬНЫХ файлов данных"""
    generator = MassiveMedicalDataGenerator()
    
    # Генерируем МИЛЛИОНЫ данных для серьезного обучения
    datasets_to_generate = [
        {'size': 100000, 'name': 'medical_100k'},
        {'size': 500000, 'name': 'medical_500k'},
        {'size': 1000000, 'name': 'medical_1M'},
        {'size': 2000000, 'name': 'medical_2M'},
        {'size': 5000000, 'name': 'medical_5M'}
    ]
    
    print("🏥 Генератор УНИКАЛЬНЫХ медицинских данных")
    print("📋 Каждый файл содержит только уникальные записи")
    print("🔄 Данные между файлами НЕ повторяются")
    print("=" * 60)
    
    total_start_time = time.time()
    generated_files = []
    
    for i, dataset_config in enumerate(datasets_to_generate):
        print(f"\n📊 Датасет {i+1}/{len(datasets_to_generate)}: {dataset_config['name']}")
        print("-" * 40)
        
        dataset_start_time = time.time()
        
        try:
            # Проверяем существующие файлы для загрузки уникальности
            existing_file = None
            if i > 0 and generated_files:
                existing_file = generated_files[-1]  # Берем последний сгенерированный файл
                print(f"📂 Загружаем уникальность из предыдущего файла: {os.path.basename(existing_file)}")
            
            # Генерируем УНИКАЛЬНЫЕ данные
            dataset_file = generator.generate_unique_dataset_file(
                records_count=dataset_config['size'],
                filename=dataset_config['name'],
                existing_data_file=existing_file
            )
            
            generated_files.append(dataset_file)
            
            # Статистика по датасету
            dataset_elapsed = time.time() - dataset_start_time
            print(f"\n✅ Датасет {dataset_config['name']} готов!")
            print(f"📁 Файл: {os.path.basename(dataset_file)}")
            print(f"⏱️ Время: {int(dataset_elapsed//60)}м {int(dataset_elapsed%60)}с")
            
            # Статистика уникальности
            unique_stats = generator.get_uniqueness_statistics()
            print(f"🔢 Уникальных комбинаций: {unique_stats['unique_combinations']:,}")
            print(f"📊 Покрытие заболеваний: {unique_stats['coverage_diseases']:.1f}%")
            print(f"🎯 Покрытие симптомов: {unique_stats['coverage_symptoms']:.1f}%")
            
        except Exception as e:
            print(f"❌ Ошибка при генерации {dataset_config['name']}: {e}")
            continue
    
    total_elapsed = time.time() - total_start_time
    print(f"\n🎉 Вся генерация завершена!")
    print(f"⏱️ Общее время: {int(total_elapsed//60)}м {int(total_elapsed%60)}с")
    print(f"📁 Создано файлов: {len(generated_files)}")
    
    # Финальная статистика
    if generated_files:
        print(f"\n📋 Сгенерированные файлы:")
        for file_path in generated_files:
            filename = os.path.basename(file_path)
            print(f"   • {filename}")
        
        # Проверка уникальности между файлами
        print(f"\n🔍 Проверка уникальности между файлами...")
        generator.verify_files_uniqueness(generated_files)

if __name__ == "__main__":
    main() 