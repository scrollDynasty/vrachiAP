// frontend/src/utils/autoTranslate.js

// Кеш для переводов чтобы не делать повторные запросы
const translationCache = new Map();

// Словарь статических переводов для медицинских терминов и основных фраз
const staticTranslations = {
  // Медицинские специальности
  'Кардиология': { 'uz': 'Kardiologiya', 'en': 'Cardiology' },
  'Cardiology': { 'uz': 'Kardiologiya', 'ru': 'Кардиология' },
  'Эндокринология': { 'uz': 'Endokrinologiya', 'en': 'Endocrinology' },
  'Эндокринология и диабет': { 'uz': 'Endokrinologiya va diabet', 'en': 'Endocrinology and Diabetes' },
  'Неврология': { 'uz': 'Nevrologiya', 'en': 'Neurology' },
  'Офтальмология': { 'uz': 'Oftalmologiya', 'en': 'Ophthalmology' },
  'Гинекология': { 'uz': 'Ginekologiya', 'en': 'Gynecology' },
  'Дерматология': { 'uz': 'Dermatologiya', 'en': 'Dermatology' },
  'Педиатрия': { 'uz': 'Pediatriya', 'en': 'Pediatrics' },
  'Урология': { 'uz': 'Urologiya', 'en': 'Urology' },
  'Психиатрия': { 'uz': 'Psixiatriya', 'en': 'Psychiatry' },
  'Онкология': { 'uz': 'Onkologiya', 'en': 'Oncology' },
  'Ортопедия': { 'uz': 'Ortopediya', 'en': 'Orthopedics' },
  'Оториноларингология': { 'uz': 'Otorinolaringologiya', 'en': 'Otolaryngology' },
  'Гастроэнтерология': { 'uz': 'Gastroenterologiya', 'en': 'Gastroenterology' },
  'Пульмонология': { 'uz': 'Pulmonologiya', 'en': 'Pulmonology' },
  'Проктология': { 'uz': 'Proktologiya', 'en': 'Proctology' },
  'Хирургия': { 'uz': 'Jarrohlik', 'en': 'Surgery' },
  'Терапия': { 'uz': 'Terapiya', 'en': 'Therapy' },
  
  // Общие медицинские термины
  'врач': { 'uz': 'shifokor', 'en': 'doctor' },
  'больница': { 'uz': 'kasalxona', 'en': 'hospital' },
  'клиника': { 'uz': 'klinika', 'en': 'clinic' },
  'пациент': { 'uz': 'bemor', 'en': 'patient' },
  'лечение': { 'uz': 'davolash', 'en': 'treatment' },
  'диагноз': { 'uz': 'tashxis', 'en': 'diagnosis' },
  'консультация': { 'uz': 'konsultatsiya', 'en': 'consultation' },
  'здоровье': { 'uz': 'sogʻliq', 'en': 'health' },
  'медицина': { 'uz': 'tibbiyot', 'en': 'medicine' },
  
  // Заголовки и часто используемые фразы
  'Заголовок': { 'uz': 'Sarlavha', 'en': 'Headline' },
  'Краткое описание': { 'uz': 'Qisqacha tavsif', 'en': 'Short description' },
  'Описание': { 'uz': 'Tavsif', 'en': 'Description' },
  'Новости': { 'uz': 'Yangiliklar', 'en': 'News' },
  'Статья': { 'uz': 'Maqola', 'en': 'Article' },
  'Исследование': { 'uz': 'Tadqiqot', 'en': 'Research' },
  'Лечение рака': { 'uz': 'Saraton kasalligini davolash', 'en': 'Cancer treatment' },
  'Инновации в медицине': { 'uz': 'Tibbiyotdagi innovatsiyalar', 'en': 'Medical innovations' },
  
  // Типичные фразы из новостей
  'Some kind of headline': { 'uz': 'Qandaydir sarlavha', 'ru': 'Какой-то заголовок' },
  'Short description': { 'uz': 'Qisqacha tavsif', 'ru': 'Краткое описание' },
  'some kind of news text': { 'uz': 'qandaydir yangilik matni', 'ru': 'какой-то текст новости' },
  
  // Теги и хэштеги
  'теги': { 'uz': 'teglar', 'en': 'tags' },
  'Теги': { 'uz': 'Teglar', 'en': 'Tags' },
  'Teglar': { 'ru': 'Теги', 'en': 'Tags' },
  'хирургия': { 'uz': 'jarrohlik', 'en': 'surgery' },
  'hirurgi': { 'ru': 'хирургия', 'en': 'surgery' },
  'диабет': { 'uz': 'diabet', 'en': 'diabetes' },
  'кардиология': { 'uz': 'kardiologiya', 'en': 'cardiology' },
  'неврология': { 'uz': 'nevrologiya', 'en': 'neurology' },
  'онкология': { 'uz': 'onkologiya', 'en': 'oncology' }
};

// Функция для перевода текста через LibreTranslate (бесплатный API)
const translateWithLibreTranslate = async (text, fromLang, toLang) => {
  try {
    const response = await fetch('https://libretranslate.com/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: fromLang,
        target: toLang,
        format: 'text'
      })
    });

    if (!response.ok) {
      throw new Error(`LibreTranslate API error: ${response.status}`);
    }

    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error('LibreTranslate error:', error);
    throw error;
  }
};

// Функция для перевода через MyMemory (бесплатный API)
const translateWithMyMemory = async (text, fromLang, toLang) => {
  try {
    const langPair = `${fromLang}|${toLang}`;
    const encodedText = encodeURIComponent(text);
    
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${langPair}`
    );

    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    } else {
      throw new Error('MyMemory translation failed');
    }
  } catch (error) {
    console.error('MyMemory error:', error);
    throw error;
  }
};

// Функция для поиска в статическом словаре переводов
const getStaticTranslation = (text, toLang) => {
  // Точное совпадение
  if (staticTranslations[text] && staticTranslations[text][toLang]) {
    return staticTranslations[text][toLang];
  }
  
  // Поиск без учета регистра
  const lowerText = text.toLowerCase();
  for (const [key, translations] of Object.entries(staticTranslations)) {
    if (key.toLowerCase() === lowerText && translations[toLang]) {
      return translations[toLang];
    }
  }
  
  return null;
};

// Основная функция перевода с fallback
export const translateText = async (text, fromLang = 'ru', toLang = 'en') => {
  if (!text || fromLang === toLang) return text;
  
  // Сначала проверяем статический словарь
  const staticTranslation = getStaticTranslation(text, toLang);
  if (staticTranslation) {
    return staticTranslation;
  }
  
  // Проверяем кеш для автоматических переводов
  const cacheKey = `${text}_${fromLang}_${toLang}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  // Конвертируем коды языков для API
  const langMap = {
    'ru': 'ru',
    'uz': 'en', // Используем английский как промежуточный для узбекского
    'en': 'en'
  };

  const sourceLang = langMap[fromLang] || fromLang;
  const targetLang = langMap[toLang] || toLang;

  // Специальная обработка для узбекского языка
  if (toLang === 'uz') {
    try {
      // Пробуем найти готовый перевод с русского на узбекский
      let translatedText;
      
      try {
        // Пробуем прямой перевод ru->uz через LibreTranslate
        translatedText = await translateWithLibreTranslate(text, 'ru', 'uz');
      } catch (error) {
        console.warn('Direct ru->uz translation failed, trying two-step approach');
        
        // Если прямой перевод не работает, пробуем двухэтапный: ru->en->uz
        try {
          const englishText = await translateWithLibreTranslate(text, 'ru', 'en');
          try {
            translatedText = await translateWithLibreTranslate(englishText, 'en', 'uz');
          } catch (uzError) {
            console.warn('Second step (en->uz) failed, trying MyMemory');
            // Пробуем через MyMemory
            try {
              translatedText = await translateWithMyMemory(text, 'ru', 'uz');
            } catch (myMemoryError) {
              console.warn('All Uzbek translation attempts failed, using English fallback');
              translatedText = englishText; // Возвращаем английский как fallback
            }
          }
        } catch (firstStepError) {
          console.warn('First step (ru->en) also failed');
          throw firstStepError;
        }
      }

      // Сохраняем в кеш
      translationCache.set(cacheKey, translatedText);
      return translatedText;
      
    } catch (error) {
      console.error('All Uzbek translation methods failed:', error);
      // В крайнем случае возвращаем оригинальный текст
      return text;
    }
  }

  // Для остальных языков используем стандартный подход
  try {
    let translatedText;

    // Пробуем сначала LibreTranslate
    try {
      translatedText = await translateWithLibreTranslate(text, sourceLang, targetLang);
    } catch (error) {
      console.warn('LibreTranslate failed, trying MyMemory:', error);
      // Если LibreTranslate не работает, пробуем MyMemory
      translatedText = await translateWithMyMemory(text, sourceLang, targetLang);
    }

    // Сохраняем в кеш
    translationCache.set(cacheKey, translatedText);
    
    return translatedText;
  } catch (error) {
    console.error('All translation services failed:', error);
    // Если все API не работают, возвращаем оригинальный текст
    return text;
  }
};

// Функция для перевода тегов
const translateTags = async (tagsText, targetLanguage) => {
  if (!tagsText) return tagsText;
  
  // Разбираем теги (могут быть с # или без)
  const tagPattern = /#(\w+)|(\w+)/g;
  let translatedText = tagsText;
  const matches = [...tagsText.matchAll(tagPattern)];
  
  for (const match of matches) {
    const tag = match[1] || match[2]; // Тег без #
    const fullMatch = match[0]; // Полное совпадение (с # или без)
    
    try {
      const translatedTag = await translateText(tag, 'ru', targetLanguage);
      if (translatedTag !== tag) {
        // Сохраняем форматирование (# если был)
        const translatedFullTag = fullMatch.startsWith('#') ? '#' + translatedTag : translatedTag;
        translatedText = translatedText.replace(fullMatch, translatedFullTag);
      }
    } catch (error) {
      console.warn(`Failed to translate tag: ${tag}`, error);
      // Пропускаем этот тег и оставляем как есть
    }
  }
  
  return translatedText;
};

// Функция для перевода объекта новости
export const translateNewsItem = async (newsItem, targetLanguage = 'en') => {
  if (!newsItem || targetLanguage === 'ru') return newsItem;

  try {
    // Переводим основные поля параллельно
    const [translatedTitle, translatedSummary, translatedContent, translatedCategory] = await Promise.all([
      translateText(newsItem.title, 'ru', targetLanguage),
      translateText(newsItem.summary, 'ru', targetLanguage),
      translateText(newsItem.content, 'ru', targetLanguage),
      translateText(newsItem.category, 'ru', targetLanguage)
    ]);

    // Переводим теги если они есть
    let translatedTags = newsItem.tags;
    if (newsItem.tags) {
      translatedTags = await translateTags(newsItem.tags, targetLanguage);
    }

    return {
      ...newsItem,
      title: translatedTitle,
      summary: translatedSummary,
      content: translatedContent,
      category: translatedCategory,
      tags: translatedTags
    };
  } catch (error) {
    console.error('Error translating news item:', error);
    return newsItem; // Возвращаем оригинал если перевод не удался
  }
};

// Функция для перевода массива новостей
export const translateNewsList = async (newsList, targetLanguage = 'en') => {
  if (!newsList || newsList.length === 0 || targetLanguage === 'ru') {
    return newsList;
  }

  try {
    const translatedNews = await Promise.all(
      newsList.map(news => translateNewsItem(news, targetLanguage))
    );
    return translatedNews;
  } catch (error) {
    console.error('Error translating news list:', error);
    return newsList;
  }
};

// Функция для очистки кеша (может пригодиться)
export const clearTranslationCache = () => {
  translationCache.clear();
};

// Экспорт всех функций
export default {
  translateText,
  translateNewsItem,
  translateNewsList,
  clearTranslationCache
}; 