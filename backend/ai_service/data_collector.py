"""
Data Collector Module - Сбор медицинских данных из открытых источников
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

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataCollector:
    """
    Класс для сбора медицинских данных из различных источников
    """
    
    def __init__(self, data_dir: str = "medical_data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        
        # Медицинские источники данных
        self.medical_sources = {
            "mayo_clinic": "https://www.mayoclinic.org/diseases-conditions",
            "medline_plus": "https://medlineplus.gov/encyclopedia.html",
            "webmd": "https://www.webmd.com/diseases-and-conditions",
            "healthline": "https://www.healthline.com/health",
            "pubmed": "https://pubmed.ncbi.nlm.nih.gov/",
            "who": "https://www.who.int/health-topics"
        }
        
        # Русскоязычные источники
        self.russian_sources = {
            "rlsnet": "https://www.rlsnet.ru/",
            "zdravotvet": "https://zdravotvet.ru/",
            "medportal": "https://medportal.ru/",
            "doctor_liza": "https://doctorpiter.ru/"
        }
        
        # Узбекские медицинские источники
        self.uzbek_sources = {
            "minzdrav_uz": "https://minzdrav.uz/",
            "medical_uz": "https://medical.uz/",
            "tashmed": "https://tashmed.uz/"
        }
        
        self.session = None
        self.collected_data = []
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def setup_directories(self):
        """Создание необходимых директорий для данных"""
        dirs = [
            self.data_dir / "raw",
            self.data_dir / "processed",
            self.data_dir / "symptoms",
            self.data_dir / "diseases",
            self.data_dir / "treatments",
            self.data_dir / "medical_texts"
        ]
        
        for dir_path in dirs:
            dir_path.mkdir(exist_ok=True)
    
    async def collect_medical_data(self, max_pages: int = 100) -> None:
        """
        Основной метод сбора медицинских данных
        """
        logger.info("Начинаю сбор медицинских данных...")
        self.setup_directories()
        
        # Собираем данные из разных источников параллельно
        tasks = []
        
        # Англоязычные источники
        for source_name, base_url in self.medical_sources.items():
            tasks.append(self._collect_from_source(source_name, base_url, max_pages // len(self.medical_sources)))
        
        # Русскоязычные источники
        for source_name, base_url in self.russian_sources.items():
            tasks.append(self._collect_from_source(source_name, base_url, max_pages // len(self.russian_sources)))
        
        # Узбекские источники
        for source_name, base_url in self.uzbek_sources.items():
            tasks.append(self._collect_from_source(source_name, base_url, max_pages // len(self.uzbek_sources)))
        
        # Выполняем все задачи параллельно
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Обрабатываем результаты
        successful_collections = [r for r in results if not isinstance(r, Exception)]
        logger.info(f"Успешно собрано данных из {len(successful_collections)} источников")
        
        # Сохраняем собранные данные
        await self._save_collected_data()
    
    async def _collect_from_source(self, source_name: str, base_url: str, max_pages: int) -> Dict:
        """
        Сбор данных из конкретного источника
        """
        logger.info(f"Собираю данные из источника: {source_name}")
        collected_items = []
        
        try:
            # Получаем список статей/страниц
            async with self.session.get(base_url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Извлекаем ссылки на статьи
                    article_links = self._extract_article_links(soup, base_url)
                    
                    # Ограничиваем количество страниц
                    article_links = article_links[:max_pages]
                    
                    # Собираем данные с каждой страницы
                    for link in article_links:
                        try:
                            article_data = await self._scrape_article(link, source_name)
                            if article_data:
                                collected_items.append(article_data)
                                
                            # Добавляем случайную задержку для избежания блокировки
                            await asyncio.sleep(random.uniform(1, 3))
                            
                        except Exception as e:
                            logger.warning(f"Ошибка при сборе статьи {link}: {e}")
                            continue
                    
        except Exception as e:
            logger.error(f"Ошибка при сборе данных из {source_name}: {e}")
        
        logger.info(f"Собрано {len(collected_items)} статей из {source_name}")
        return {
            "source": source_name,
            "items": collected_items,
            "collected_at": datetime.now().isoformat()
        }
    
    def _extract_article_links(self, soup: BeautifulSoup, base_url: str) -> List[str]:
        """
        Извлечение ссылок на медицинские статьи
        """
        links = []
        
        # Общие селекторы для медицинских сайтов
        selectors = [
            'a[href*="disease"]',
            'a[href*="condition"]',
            'a[href*="symptom"]',
            'a[href*="treatment"]',
            'a[href*="medicine"]',
            'a[href*="болезн"]',
            'a[href*="симптом"]',
            'a[href*="лечение"]',
            '.article-link',
            '.disease-link',
            '.condition-link'
        ]
        
        for selector in selectors:
            elements = soup.select(selector)
            for element in elements:
                href = element.get('href')
                if href:
                    full_url = urljoin(base_url, href)
                    if self._is_valid_medical_url(full_url):
                        links.append(full_url)
        
        return list(set(links))  # Убираем дубликаты
    
    def _is_valid_medical_url(self, url: str) -> bool:
        """
        Проверка, является ли URL медицинской статьей
        """
        medical_keywords = [
            'disease', 'condition', 'symptom', 'treatment', 'medicine', 'health',
            'болезн', 'симптом', 'лечение', 'медицин', 'здоровье',
            'kasallik', 'belgi', 'davolash', 'tibbiyot'  # узбекские термины
        ]
        
        url_lower = url.lower()
        return any(keyword in url_lower for keyword in medical_keywords)
    
    async def _scrape_article(self, url: str, source_name: str) -> Optional[Dict]:
        """
        Сбор данных с одной медицинской статьи
        """
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    html = await response.text()
                    soup = BeautifulSoup(html, 'html.parser')
                    
                    # Извлекаем заголовок
                    title = self._extract_title(soup)
                    
                    # Извлекаем контент
                    content = self._extract_content(soup)
                    
                    # Извлекаем симптомы
                    symptoms = self._extract_symptoms(soup, content)
                    
                    # Извлекаем информацию о лечении
                    treatment = self._extract_treatment(soup, content)
                    
                    # Извлекаем причины
                    causes = self._extract_causes(soup, content)
                    
                    if title and content:
                        return {
                            "url": url,
                            "source": source_name,
                            "title": title,
                            "content": content,
                            "symptoms": symptoms,
                            "treatment": treatment,
                            "causes": causes,
                            "scraped_at": datetime.now().isoformat(),
                            "language": self._detect_language(title + " " + content)
                        }
                        
        except Exception as e:
            logger.warning(f"Ошибка при скрапинге {url}: {e}")
        
        return None
    
    def _extract_title(self, soup: BeautifulSoup) -> str:
        """Извлечение заголовка статьи"""
        title_selectors = ['h1', 'title', '.page-title', '.article-title']
        
        for selector in title_selectors:
            element = soup.select_one(selector)
            if element:
                return element.get_text(strip=True)
        
        return ""
    
    def _extract_content(self, soup: BeautifulSoup) -> str:
        """Извлечение основного контента статьи"""
        # Удаляем ненужные элементы
        for element in soup(['script', 'style', 'nav', 'footer', 'header', 'sidebar']):
            element.decompose()
        
        # Ищем основной контент
        content_selectors = [
            '.article-content',
            '.content',
            '.main-content',
            '.post-content',
            'article',
            '.text',
            'main'
        ]
        
        for selector in content_selectors:
            element = soup.select_one(selector)
            if element:
                return element.get_text(strip=True, separator=' ')
        
        # Если специфические селекторы не найдены, берем весь body
        body = soup.find('body')
        if body:
            return body.get_text(strip=True, separator=' ')
        
        return ""
    
    def _extract_symptoms(self, soup: BeautifulSoup, content: str) -> List[str]:
        """Извлечение симптомов из контента"""
        symptoms = []
        
        # Ключевые слова для поиска симптомов
        symptom_keywords = [
            'symptom', 'sign', 'симптом', 'признак', 'проявление',
            'belgi', 'alamat'  # узбекские
        ]
        
        # Поиск разделов с симптомами
        symptom_sections = soup.find_all(['h2', 'h3', 'h4'], string=re.compile('|'.join(symptom_keywords), re.IGNORECASE))
        
        for section in symptom_sections:
            # Находим следующий элемент после заголовка
            next_element = section.find_next_sibling()
            if next_element:
                if next_element.name in ['ul', 'ol']:
                    # Если это список, извлекаем элементы списка
                    items = next_element.find_all('li')
                    for item in items:
                        symptom = item.get_text(strip=True)
                        if symptom:
                            symptoms.append(symptom)
                else:
                    # Если это параграф, парсим симптомы из текста
                    text = next_element.get_text(strip=True)
                    parsed_symptoms = self._parse_symptoms_from_text(text)
                    symptoms.extend(parsed_symptoms)
        
        return symptoms
    
    def _extract_treatment(self, soup: BeautifulSoup, content: str) -> List[str]:
        """Извлечение информации о лечении"""
        treatment = []
        
        treatment_keywords = [
            'treatment', 'therapy', 'лечение', 'терапия', 'препарат',
            'davolash', 'mudovolash'  # узбекские
        ]
        
        # Поиск разделов с лечением
        treatment_sections = soup.find_all(['h2', 'h3', 'h4'], string=re.compile('|'.join(treatment_keywords), re.IGNORECASE))
        
        for section in treatment_sections:
            next_element = section.find_next_sibling()
            if next_element:
                if next_element.name in ['ul', 'ol']:
                    items = next_element.find_all('li')
                    for item in items:
                        treatment_info = item.get_text(strip=True)
                        if treatment_info:
                            treatment.append(treatment_info)
                else:
                    text = next_element.get_text(strip=True)
                    treatment.append(text)
        
        return treatment
    
    def _extract_causes(self, soup: BeautifulSoup, content: str) -> List[str]:
        """Извлечение причин заболевания"""
        causes = []
        
        cause_keywords = [
            'cause', 'reason', 'причина', 'этиология',
            'sabab', 'sabablar'  # узбекские
        ]
        
        # Поиск разделов с причинами
        cause_sections = soup.find_all(['h2', 'h3', 'h4'], string=re.compile('|'.join(cause_keywords), re.IGNORECASE))
        
        for section in cause_sections:
            next_element = section.find_next_sibling()
            if next_element:
                if next_element.name in ['ul', 'ol']:
                    items = next_element.find_all('li')
                    for item in items:
                        cause = item.get_text(strip=True)
                        if cause:
                            causes.append(cause)
                else:
                    text = next_element.get_text(strip=True)
                    causes.append(text)
        
        return causes
    
    def _parse_symptoms_from_text(self, text: str) -> List[str]:
        """Парсинг симптомов из текста"""
        symptoms = []
        
        # Простой парсинг по запятым и точкам
        parts = re.split(r'[,;.]', text)
        for part in parts:
            part = part.strip()
            if len(part) > 3 and len(part) < 100:  # Фильтруем по длине
                symptoms.append(part)
        
        return symptoms
    
    def _detect_language(self, text: str) -> str:
        """Определение языка текста"""
        # Простое определение языка по ключевым словам
        russian_chars = len(re.findall(r'[а-яё]', text.lower()))
        uzbek_chars = len(re.findall(r'[ўқғҳ]', text.lower()))
        english_chars = len(re.findall(r'[a-z]', text.lower()))
        
        total_chars = russian_chars + uzbek_chars + english_chars
        
        if total_chars == 0:
            return "unknown"
        
        if russian_chars / total_chars > 0.3:
            return "ru"
        elif uzbek_chars / total_chars > 0.1:
            return "uz"
        elif english_chars / total_chars > 0.5:
            return "en"
        else:
            return "mixed"
    
    async def _save_collected_data(self):
        """Сохранение собранных данных"""
        if not self.collected_data:
            logger.warning("Нет данных для сохранения")
            return
        
        # Сохраняем в JSON
        json_file = self.data_dir / "raw" / f"medical_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(self.collected_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Данные сохранены в {json_file}")
        
        # Сохраняем в CSV для анализа
        csv_file = self.data_dir / "raw" / f"medical_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        # Преобразуем в DataFrame
        records = []
        for source_data in self.collected_data:
            for item in source_data.get('items', []):
                record = {
                    'source': item.get('source', ''),
                    'title': item.get('title', ''),
                    'content': item.get('content', ''),
                    'symptoms': '; '.join(item.get('symptoms', [])),
                    'treatment': '; '.join(item.get('treatment', [])),
                    'causes': '; '.join(item.get('causes', [])),
                    'language': item.get('language', ''),
                    'url': item.get('url', ''),
                    'scraped_at': item.get('scraped_at', '')
                }
                records.append(record)
        
        if records:
            df = pd.DataFrame(records)
            df.to_csv(csv_file, index=False, encoding='utf-8')
            logger.info(f"Данные сохранены в CSV: {csv_file}")
        
        logger.info(f"Всего собрано {len(records)} медицинских записей")
    
    async def collect_pubmed_data(self, query: str, max_results: int = 100) -> List[Dict]:
        """
        Сбор данных из PubMed
        """
        logger.info(f"Собираю данные из PubMed для запроса: {query}")
        
        base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
        
        # Поиск статей
        search_url = f"{base_url}esearch.fcgi"
        search_params = {
            'db': 'pubmed',
            'term': query,
            'retmax': max_results,
            'retmode': 'json'
        }
        
        try:
            async with self.session.get(search_url, params=search_params) as response:
                if response.status == 200:
                    search_data = await response.json()
                    pmids = search_data.get('esearchresult', {}).get('idlist', [])
                    
                    if not pmids:
                        logger.warning(f"Не найдено статей для запроса: {query}")
                        return []
                    
                    # Получаем детальную информацию о статьях
                    fetch_url = f"{base_url}efetch.fcgi"
                    fetch_params = {
                        'db': 'pubmed',
                        'id': ','.join(pmids),
                        'retmode': 'xml'
                    }
                    
                    async with self.session.get(fetch_url, params=fetch_params) as fetch_response:
                        if fetch_response.status == 200:
                            xml_data = await fetch_response.text()
                            return self._parse_pubmed_xml(xml_data)
                            
        except Exception as e:
            logger.error(f"Ошибка при сборе данных из PubMed: {e}")
        
        return []
    
    def _parse_pubmed_xml(self, xml_data: str) -> List[Dict]:
        """Парсинг XML данных из PubMed"""
        # Здесь будет парсинг XML данных PubMed
        # Для простоты возвращаем пустой список
        return []


# Пример использования
async def main():
    """Пример использования DataCollector"""
    async with DataCollector() as collector:
        await collector.collect_medical_data(max_pages=50)
        
        # Собираем данные из PubMed
        pubmed_data = await collector.collect_pubmed_data("diabetes symptoms treatment", max_results=20)
        logger.info(f"Собрано {len(pubmed_data)} статей из PubMed")


if __name__ == "__main__":
    asyncio.run(main()) 