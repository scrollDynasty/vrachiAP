"""
Data Collector Module - Реальный сбор медицинских данных из открытых источников
"""

import asyncio
import aiohttp
import requests
from bs4 import BeautifulSoup
import pandas as pd
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime
import os
from pathlib import Path
import re
from urllib.parse import urljoin, urlparse
import time
import random
from sqlalchemy.orm import Session

# Импорты для работы с базой данных
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import AITrainingData, get_db

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class RealDataCollector:
    """
    Реальный класс для сбора медицинских данных из различных источников
    Интегрирован с базой данных для сохранения собранных данных
    """
    
    def __init__(self):
        self.session = requests.Session()
        # Добавляем реальный User-Agent для обхода блокировок
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        self.data_dir = Path("medical_data")
        self.data_dir.mkdir(exist_ok=True)
        
        # Альтернативные источники медицинских данных
        self.sources = {
            'pubmed': {
                'base_url': 'https://pubmed.ncbi.nlm.nih.gov',
                'search_url': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi',
                'fetch_url': 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi',
                'api_key': None  # Можно добавить для увеличения лимитов
            },
            'who': {
                'base_url': 'https://www.who.int',
                'search_path': '/news-room/fact-sheets/detail/'
            },
            'medlineplus': {
                'base_url': 'https://medlineplus.gov',
                'api_url': 'https://connect.medlineplus.gov/service'
            },
            'wikipedia_medical': {
                'api_url': 'https://ru.wikipedia.org/w/api.php',
                'categories': ['Заболевания', 'Симптомы', 'Лекарственные_средства']
            }
        }
        
        # Реальные медицинские источники данных
        self.medical_sources = {
            "mayo_clinic": "https://www.mayoclinic.org/diseases-conditions",
            "medline_plus": "https://medlineplus.gov/encyclopedia.html", 
            "webmd": "https://www.webmd.com/diseases-and-conditions",
            "healthline": "https://www.healthline.com/health-a-z",
            "who": "https://www.who.int/health-topics"
        }
        
        # Русскоязычные источники
        self.russian_sources = {
            "rlsnet": "https://www.rlsnet.ru/",
            "health_mail": "https://health.mail.ru/disease/",
            "medportal": "https://medportal.ru/enc/",
            "doctorpiter": "https://doctorpiter.ru/articles/"
        }
        
        # Узбекские медицинские источники (реальные)
        self.uzbek_sources = {
            "minzdrav_uz": "https://minzdrav.uz/uz/lists/view/id/124",
            "medical_uz": "https://medical.uz/",
            "tashmed": "https://tashmed.uz/news"
        }
        
        self.collected_data = []
        
    async def __aenter__(self):
        """Async context manager entry"""
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        pass
    
    async def collect_all_sources(self, limit: int = 1000) -> Dict:
        """Сбор данных из всех доступных источников"""
        logger.info(f"Запуск сбора данных из всех источников (лимит: {limit})")
        
        all_data = []
        queries = [
            "symptoms diagnosis treatment",
            "common diseases symptoms",
            "medical conditions treatment",
            "симптомы заболевания лечение",
            "диагностика болезней"
        ]
        
        # Сбор из разных источников параллельно
        tasks = []
        for query in queries:
            tasks.append(self.collect_from_pubmed(query, limit // len(queries)))
        
        tasks.append(self.collect_from_wikipedia_medical(limit // 2))
        
        # Выполняем все задачи параллельно
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        for result in results:
            if isinstance(result, list):
                all_data.extend(result)
            elif isinstance(result, Exception):
                logger.error(f"Ошибка при сборе: {result}")
        
        # Сохраняем собранные данные
        if all_data:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = self.data_dir / f"collected_data_{timestamp}.json"
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(all_data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Сохранено {len(all_data)} записей в {filename}")
            
            # Сохраняем в БД
            await self._save_to_database(all_data)
        
        return {
            'total_collected': len(all_data),
            'sources': list(set(item['source'] for item in all_data)),
            'timestamp': datetime.now().isoformat()
        }
    
    async def collect_from_pubmed(self, query: str, limit: int = 100) -> List[Dict]:
        """Сбор научных статей из PubMed через официальный API"""
        try:
            logger.info(f"Сбор данных из PubMed по запросу: {query}")
            
            # Поиск статей
            search_params = {
                'db': 'pubmed',
                'term': query,
                'retmax': limit,
                'retmode': 'json',
                'sort': 'relevance'
            }
            
            search_response = self.session.get(
                self.sources['pubmed']['search_url'],
                params=search_params,
                timeout=30
            )
            search_data = search_response.json()
            
            if 'esearchresult' not in search_data:
                return []
            
            id_list = search_data['esearchresult'].get('idlist', [])
            if not id_list:
                return []
            
            # Получение полных текстов
            fetch_params = {
                'db': 'pubmed',
                'id': ','.join(id_list[:limit]),
                'retmode': 'xml',
                'rettype': 'abstract'
            }
            
            fetch_response = self.session.get(
                self.sources['pubmed']['fetch_url'],
                params=fetch_params,
                timeout=30
            )
            
            # Парсинг XML
            from xml.etree import ElementTree
            root = ElementTree.fromstring(fetch_response.content)
            
            articles = []
            for article in root.findall('.//PubmedArticle'):
                try:
                    title_elem = article.find('.//ArticleTitle')
                    abstract_elem = article.find('.//AbstractText')
                    
                    if title_elem is not None and abstract_elem is not None:
                        articles.append({
                            'title': title_elem.text,
                            'content': abstract_elem.text,
                            'source': 'pubmed',
                            'type': 'scientific',
                            'quality_score': 0.9  # Высокое качество научных данных
                        })
                except:
                    continue
            
            logger.info(f"Собрано {len(articles)} статей из PubMed")
            return articles
            
        except Exception as e:
            logger.error(f"Ошибка при сборе из PubMed: {e}")
            return []

    async def collect_from_wikipedia_medical(self, limit: int = 100) -> List[Dict]:
        """Сбор медицинских статей из Википедии через API"""
        try:
            logger.info("Сбор медицинских данных из Википедии...")
            articles = []
            
            for category in self.sources['wikipedia_medical']['categories']:
                params = {
                    'action': 'query',
                    'format': 'json',
                    'list': 'categorymembers',
                    'cmtitle': f'Категория:{category}',
                    'cmlimit': min(50, limit),
                    'cmtype': 'page'
                }
                
                response = self.session.get(
                    self.sources['wikipedia_medical']['api_url'],
                    params=params,
                    timeout=20
                )
                data = response.json()
                
                pages = data.get('query', {}).get('categorymembers', [])
                
                for page in pages[:limit]:
                    # Получаем содержимое страницы
                    content_params = {
                        'action': 'query',
                        'format': 'json',
                        'prop': 'extracts',
                        'pageids': page['pageid'],
                        'exintro': True,
                        'explaintext': True
                    }
                    
                    content_response = self.session.get(
                        self.sources['wikipedia_medical']['api_url'],
                        params=content_params,
                        timeout=20
                    )
                    content_data = content_response.json()
                    
                    page_content = content_data.get('query', {}).get('pages', {})
                    for page_id, page_info in page_content.items():
                        if 'extract' in page_info:
                            articles.append({
                                'title': page_info['title'],
                                'content': page_info['extract'],
                                'source': 'wikipedia',
                                'type': 'encyclopedic',
                                'quality_score': 0.7
                            })
                    
                    if len(articles) >= limit:
                        break
            
            logger.info(f"Собрано {len(articles)} статей из Википедии")
            return articles
            
        except Exception as e:
            logger.error(f"Ошибка при сборе из Википедии: {e}")
            return []

    async def _save_to_database(self, data: List[Dict]):
        """Сохранение собранных данных в БД"""
        try:
            from models import get_db, AITrainingData
            from ai_service.utils import extract_medical_entities
            
            with next(get_db()) as db:
                for item in data:
                    # Извлекаем медицинские сущности из текста
                    entities = extract_medical_entities(item['content'])
                    
                    # Проверяем дубликаты
                    existing = db.query(AITrainingData).filter(
                        AITrainingData.title == item['title']
                    ).first()
                    
                    if not existing:
                        training_data = AITrainingData(
                            source_name=item['source'],
                            source_url=item.get('url', 'api'),
                            title=item['title'],
                            content=item['content'],
                            symptoms=entities.get('symptoms', []),
                            diseases=entities.get('diseases', []),
                            treatments=entities.get('treatments', []),
                            language=entities.get('language', 'en'),
                            category=item.get('type', 'general'),
                            quality_score=item.get('quality_score', 0.5),
                            is_processed=False,  # Требует обработки
                            is_validated=False   # Требует валидации
                        )
                        db.add(training_data)
                
                db.commit()
                logger.info(f"Данные сохранены в БД")
                
        except Exception as e:
            logger.error(f"Ошибка при сохранении в БД: {e}")


# Дополнительные методы-заглушки для других источников
    async def _scrape_webmd(self, base_url: str, limit: int) -> List[Dict]:
        # Реализация для WebMD
        return []
    
    async def _scrape_healthline(self, base_url: str, limit: int) -> List[Dict]:
        # Реализация для Healthline
        return []
        
    async def _scrape_medline_plus(self, base_url: str, limit: int) -> List[Dict]:
        # Реализация для MedlinePlus
        return []
        
    async def _scrape_who(self, base_url: str, limit: int) -> List[Dict]:
        # Реализация для WHO
        return []
        
    async def _scrape_medportal(self, base_url: str, limit: int) -> List[Dict]:
        # Реализация для Medportal
        return []
        
    async def _scrape_doctorpiter(self, base_url: str, limit: int) -> List[Dict]:
        # Реализация для DoctorPiter
        return []
        
    async def _scrape_medical_uz(self, base_url: str, limit: int) -> List[Dict]:
        # Реализация для Medical.uz
        return []
        
    async def _scrape_tashmed(self, base_url: str, limit: int) -> List[Dict]:
        # Реализация для Tashmed
        return []


# Алиас для обратной совместимости
DataCollector = RealDataCollector


# Пример использования
async def main():
    """Пример использования DataCollector"""
    async with DataCollector() as collector:
        await collector.collect_all_sources(limit=1000)


if __name__ == "__main__":
    asyncio.run(main()) 