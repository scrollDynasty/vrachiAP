// Переводы для регионов и районов Узбекистана
import { getDistrictsByRegion, uzbekistanRegions } from '../constants/uzbekistanRegions';
export const regionTranslations = {
  ru: {
    "Ташкент": "Ташкент",
    "Ташкентская область": "Ташкентская область", 
    "Андижанская область": "Андижанская область",
    "Бухарская область": "Бухарская область",
    "Джизакская область": "Джизакская область",
    "Кашкадарьинская область": "Кашкадарьинская область",
    "Навоийская область": "Навоийская область",
    "Наманганская область": "Наманганская область",
    "Самаркандская область": "Самаркандская область",
    "Сурхандарьинская область": "Сурхандарьинская область",
    "Сырдарьинская область": "Сырдарьинская область",
    "Ферганская область": "Ферганская область",
    "Хорезмская область": "Хорезмская область",
    "Республика Каракалпакстан": "Республика Каракалпакстан"
  },
  uz: {
    "Ташкент": "Toshkent",
    "Ташкентская область": "Toshkent viloyati",
    "Андижанская область": "Andijon viloyati", 
    "Бухарская область": "Buxoro viloyati",
    "Джизакская область": "Jizzax viloyati",
    "Кашкадарьинская область": "Qashqadaryo viloyati",
    "Навоийская область": "Navoiy viloyati",
    "Наманганская область": "Namangan viloyati",
    "Самаркандская область": "Samarqand viloyati",
    "Сурхандарьинская область": "Surxondaryo viloyati",
    "Сырдарьинская область": "Sirdaryo viloyati",
    "Ферганская область": "Farg'ona viloyati",
    "Хорезмская область": "Xorazm viloyati",
    "Республика Каракалпакстан": "Qoraqalpog'iston Respublikasi"
  },
  en: {
    "Ташкент": "Tashkent",
    "Ташкентская область": "Tashkent Region",
    "Андижанская область": "Andijan Region",
    "Бухарская область": "Bukhara Region", 
    "Джизакская область": "Jizzakh Region",
    "Кашкадарьинская область": "Kashkadarya Region",
    "Навоийская область": "Navoiy Region",
    "Наманганская область": "Namangan Region",
    "Самаркандская область": "Samarkand Region",
    "Сурхандарьинская область": "Surkhandarya Region",
    "Сырдарьинская область": "Sirdarya Region",
    "Ферганская область": "Fergana Region",
    "Хорезмская область": "Khorezm Region",
    "Республика Каракалпакстан": "Republic of Karakalpakstan"
  }
};

// Функция для получения переведенного названия региона
export const translateRegion = (regionName, language) => {
  return regionTranslations[language]?.[regionName] || regionName;
};

// Словарь переводов всех районов Узбекистана
const districtTranslations = {
  // Ташкент (районы города)
  "Алмазарский район": {
    uz: "Olmazor tumani",
    en: "Olmazor District"
  },
  "Бектемирский район": {
    uz: "Bektemir tumani", 
    en: "Bektemir District"
  },
  "Мирабадский район": {
    uz: "Mirabad tumani",
    en: "Mirabad District"
  },
  "Мирзо-Улугбекский район": {
    uz: "Mirzo Ulug'bek tumani",
    en: "Mirzo Ulugbek District"
  },
  "Сергелийский район": {
    uz: "Sergeli tumani",
    en: "Sergeli District"
  },
  "Учтепинский район": {
    uz: "Uchtepa tumani",
    en: "Uchtepa District"
  },
  "Чиланзарский район": {
    uz: "Chilonzor tumani",
    en: "Chilanzar District"
  },
  "Шайхантаурский район": {
    uz: "Shayxontohur tumani",
    en: "Shaykhantaur District"
  },
  "Юнусабадский район": {
    uz: "Yunusabad tumani",
    en: "Yunusabad District"
  },
  "Яккасарайский район": {
    uz: "Yakkasaroy tumani",
    en: "Yakkasaray District"
  },
  "Яшнабадский район": {
    uz: "Yashnabad tumani",
    en: "Yashnabad District"
  },

  // Ташкентская область
  "Ангренский район": {
    uz: "Angren tumani",
    en: "Angren District"
  },
  "Бекабадский район": {
    uz: "Bekobod tumani",
    en: "Bekabad District"
  },
  "Бостанлыкский район": {
    uz: "Bo'stonliq tumani",
    en: "Bostanlyk District"
  },
  "Букинский район": {
    uz: "Bo'ka tumani",
    en: "Buka District"
  },
  "Зангиатинский район": {
    uz: "Zangiota tumani",
    en: "Zangiata District"
  },
  "Кибрайский район": {
    uz: "Qibray tumani",
    en: "Kibray District"
  },
  "Куйичирчикский район": {
    uz: "Quyi Chirchiq tumani",
    en: "Lower Chirchik District"
  },
  "Оханганский район": {
    uz: "Ohangaron tumani",
    en: "Akhangaran District"
  },
  "Паркентский район": {
    uz: "Parkent tumani",
    en: "Parkent District"
  },
  "Пскентский район": {
    uz: "Piskent tumani",
    en: "Pskent District"
  },
  "Уртачирчикский район": {
    uz: "O'rta Chirchiq tumani",
    en: "Middle Chirchik District"
  },
  "Чиназский район": {
    uz: "Chinoz tumani",
    en: "Chinaz District"
  },
  "Юкорычирчикский район": {
    uz: "Yuqori Chirchiq tumani",
    en: "Upper Chirchik District"
  },
  "Ташкентский район": {
    uz: "Toshkent tumani",
    en: "Tashkent District"
  },

  // Андижанская область
  "Андижанский район": {
    uz: "Andijon tumani",
    en: "Andijan District"
  },
  "Асакинский район": {
    uz: "Asaka tumani",
    en: "Asaka District"
  },
  "Балыкчинский район": {
    uz: "Baliqchi tumani", 
    en: "Balykchy District"
  },
  "Булакбашинский район": {
    uz: "Buloqboshi tumani",
    en: "Bulakbashi District"
  },
  "Бузский район": {
    uz: "Bo'z tumani",
    en: "Boz District"
  },
  "Джалакудукский район": {
    uz: "Jalaquduq tumani",
    en: "Jalaquduq District"
  },
  "Избасканский район": {
    uz: "Izboskan tumani",
    en: "Izboskan District"
  },
  "Кургантепинский район": {
    uz: "Qo'rg'ontepa tumani",
    en: "Kurgantepa District"
  },
  "Мархаматский район": {
    uz: "Marhamat tumani",
    en: "Markhamat District"
  },
  "Пахтаабадский район": {
    uz: "Paxtaobod tumani",
    en: "Pakhtaabad District"
  },
  "Улугнарский район": {
    uz: "Ulug'nor tumani",
    en: "Ulugnar District"
  },
  "Ходжаабадский район": {
    uz: "Xo'jaobod tumani",
    en: "Khodjaabad District"
  },
  "Шаханханский район": {
    uz: "Shahrixon tumani",
    en: "Shahrikhan District"
  },

  // Бухарская область
  "Алатский район": {
    uz: "Olot tumani",
    en: "Alat District"
  },
  "Бухарский район": {
    uz: "Buxoro tumani",
    en: "Bukhara District"
  },
  "Вабкентский район": {
    uz: "Vobkent tumani",
    en: "Vabkent District"
  },
  "Гиждуванский район": {
    uz: "G'ijduvon tumani",
    en: "Gijduvan District"
  },
  "Жондорский район": {
    uz: "Jondor tumani",
    en: "Jondor District"
  },
  "Каганский район": {
    uz: "Kogon tumani",
    en: "Kagan District"
  },
  "Каракульский район": {
    uz: "Qorako'l tumani",
    en: "Karakul District"
  },
  "Пешкунский район": {
    uz: "Peshku tumani",
    en: "Peshku District"
  },
  "Ромитанский район": {
    uz: "Romitan tumani",
    en: "Romitan District"
  },
  "Шафирканский район": {
    uz: "Shofirkon tumani",
    en: "Shafirkan District"
  },

  // Джизакская область
  "Арнасайский район": {
    uz: "Arnasoy tumani",
    en: "Arnasay District"
  },
  "Бахмальский район": {
    uz: "Baxmal tumani",
    en: "Bakhmal District"
  },
  "Галляаральский район": {
    uz: "G'allaorol tumani",
    en: "Gallaaral District"
  },
  "Джизакский район": {
    uz: "Jizzax tumani",
    en: "Jizzakh District"
  },
  "Дустликский район": {
    uz: "Do'stlik tumani",
    en: "Dustlik District"
  },
  "Зааминский район": {
    uz: "Zomin tumani",
    en: "Zaamin District"
  },
  "Зафарабадский район": {
    uz: "Zafarobod tumani",
    en: "Zafarabad District"
  },
  "Мирзачульский район": {
    uz: "Mirzacho'l tumani",
    en: "Mirzachul District"
  },
  "Пахтакорский район": {
    uz: "Paxtakor tumani",
    en: "Pakhtakor District"
  },
  "Фаришский район": {
    uz: "Forish tumani",
    en: "Farish District"
  },
  "Янгиабадский район": {
    uz: "Yangiobod tumani",
    en: "Yangiabad District"
  },

  // Кашкадарьинская область
  "Гузарский район": {
    uz: "G'uzor tumani",
    en: "Guzar District"
  },
  "Дехканабадский район": {
    uz: "Dehqonobod tumani",
    en: "Dehkanabad District"
  },
  "Камашинский район": {
    uz: "Kamashi tumani",
    en: "Kamashi District"
  },
  "Каршинский район": {
    uz: "Qarshi tumani",
    en: "Karshi District"
  },
  "Касанский район": {
    uz: "Koson tumani",
    en: "Kasan District"
  },
  "Китабский район": {
    uz: "Kitob tumani",
    en: "Kitab District"
  },
  "Миришкорский район": {
    uz: "Mirishkor tumani",
    en: "Mirishkor District"
  },
  "Нишанский район": {
    uz: "Nishon tumani",
    en: "Nishan District"
  },
  "Чиракчинский район": {
    uz: "Chiroqchi tumani",
    en: "Chirakchi District"
  },
  "Шахрисабзский район": {
    uz: "Shahrisabz tumani",
    en: "Shakhrisabz District"
  },
  "Яккабагский район": {
    uz: "Yakkabog' tumani",
    en: "Yakkabag District"
  },

  // Навоийская область
  "Канимехский район": {
    uz: "Kanimex tumani",
    en: "Kanimekh District"
  },
  "Кармановский район": {
    uz: "Karmana tumani",
    en: "Karmana District"
  },
  "Навбахорский район": {
    uz: "Navbahor tumani",
    en: "Navbahor District"
  },
  "Навоийский район": {
    uz: "Navoiy tumani",
    en: "Navoiy District"
  },
  "Нуратинский район": {
    uz: "Nurota tumani",
    en: "Nurata District"
  },
  "Томдикурганский район": {
    uz: "Tomdi Qo'rg'on tumani",
    en: "Tomdi Qurgan District"
  },
  "Учкудукский район": {
    uz: "Uchquduq tumani",
    en: "Uchkuduk District"
  },
  "Хатырчинский район": {
    uz: "Xatirchi tumani",
    en: "Khatyrchi District"
  },

  // Наманганская область
  "Касансайский район": {
    uz: "Kosonsoy tumani",
    en: "Kasansay District"
  },
  "Мингбулакский район": {
    uz: "Mingbuloq tumani",
    en: "Mingbulak District"
  },
  "Наманганский район": {
    uz: "Namangan tumani",
    en: "Namangan District"
  },
  "Нарынский район": {
    uz: "Norin tumani",
    en: "Naryn District"
  },
  "Папский район": {
    uz: "Pop tumani",
    en: "Pop District"
  },
  "Туракурганский район": {
    uz: "To'raqo'rg'on tumani",
    en: "Turakurgan District"
  },
  "Уйчинский район": {
    uz: "Uychi tumani",
    en: "Uychi District"
  },
  "Учкурганский район": {
    uz: "Uchqo'rg'on tumani",
    en: "Uchkurgan District"
  },
  "Чартакский район": {
    uz: "Chortoq tumani",
    en: "Chartak District"
  },
  "Чустский район": {
    uz: "Chust tumani",
    en: "Chust District"
  },
  "Янгикурганский район": {
    uz: "Yangi Qo'rg'on tumani",
    en: "Yangikurgan District"
  },

  // Самаркандская область
  "Булунгурский район": {
    uz: "Bulung'ur tumani",
    en: "Bulungur District"
  },
  "Гуштский район": {
    uz: "G'uzor tumani",
    en: "Gusht District"
  },
  "Джамбайский район": {
    uz: "Jomboy tumani",
    en: "Jambay District"
  },
  "Джумаский район": {
    uz: "Juma tumani",
    en: "Juma District"
  },
  "Зияудинский район": {
    uz: "Ziyoviddin tumani",
    en: "Ziyaudin District"
  },
  "Иштыханский район": {
    uz: "Ishtixon tumani",
    en: "Ishtykhan District"
  },
  "Каттакурганский район": {
    uz: "Qattaqo'rg'on tumani",
    en: "Kattakurgan District"
  },
  "Кошрабадский район": {
    uz: "Qo'shrabot tumani",
    en: "Koshrabot District"
  },
  "Нарпайский район": {
    uz: "Narpay tumani",
    en: "Narpay District"
  },
  "Нурабадский район": {
    uz: "Nurobod tumani",
    en: "Nurabad District"
  },
  "Пайарыкский район": {
    uz: "Payariq tumani",
    en: "Payaryk District"
  },
  "Пастдаргомский район": {
    uz: "Pastdarg'om tumani",
    en: "Pastdargom District"
  },
  "Самаркандский район": {
    uz: "Samarqand tumani",
    en: "Samarkand District"
  },
  "Тайлакский район": {
    uz: "Toyloq tumani",
    en: "Taylak District"
  },
  "Урганчский район": {
    uz: "Urgut tumani",
    en: "Urgut District"
  },

  // Сурхандарьинская область
  "Алтынсайский район": {
    uz: "Oltinsoy tumani",
    en: "Altynsay District"
  },
  "Ангорский район": {
    uz: "Angor tumani",
    en: "Angor District"
  },
  "Бандыханский район": {
    uz: "Bandixon tumani",
    en: "Bandykhan District"
  },
  "Джаркурганский район": {
    uz: "Jarqo'rg'on tumani",
    en: "Jarkurgan District"
  },
  "Денауский район": {
    uz: "Denov tumani",
    en: "Denau District"
  },
  "Кизирикский район": {
    uz: "Qiziriq tumani",
    en: "Kizirik District"
  },
  "Кумкурганский район": {
    uz: "Qumqo'rg'on tumani",
    en: "Kumkurgan District"
  },
  "Музрабадский район": {
    uz: "Muzrabot tumani",
    en: "Muzrabad District"
  },
  "Олтинсайский район": {
    uz: "Oltinsoy tumani",
    en: "Oltinsay District"
  },
  "Сариасийский район": {
    uz: "Sariosiyo tumani",
    en: "Sariasiya District"
  },
  "Термезский район": {
    uz: "Termiz tumani",
    en: "Termez District"
  },
  "Узунский район": {
    uz: "Uzun tumani",
    en: "Uzun District"
  },
  "Шерабадский район": {
    uz: "Sherobod tumani",
    en: "Sherabad District"
  },
  "Шурчинский район": {
    uz: "Sho'rchi tumani",
    en: "Shurchi District"
  },

  // Сырдарьинская область
  "Акалтынский район": {
    uz: "Oqoltin tumani",
    en: "Akaltyn District"
  },
  "Баяутский район": {
    uz: "Boyovut tumani",
    en: "Bayaut District"
  },
  "Гулистанский район": {
    uz: "Guliston tumani",
    en: "Gulistan District"
  },
  "Мехнатабадский район": {
    uz: "Mehnatobod tumani",
    en: "Mekhnatabad District"
  },
  "Мирзаабадский район": {
    uz: "Mirzaobod tumani",
    en: "Mirzaabad District"
  },
  "Сайхунабадский район": {
    uz: "Sayxunobod tumani",
    en: "Saykhunabad District"
  },
  "Сардобинский район": {
    uz: "Sardoba tumani",
    en: "Sardoba District"
  },
  "Хавастский район": {
    uz: "Xovos tumani",
    en: "Khavast District"
  },

  // Ферганская область
  "Алтыарыкский район": {
    uz: "Oltiariq tumani",
    en: "Altyaryk District"
  },
  "Багдадский район": {
    uz: "Bog'dod tumani",
    en: "Bagdad District"
  },
  "Бешарыкский район": {
    uz: "Beshariq tumani",
    en: "Besharyk District"
  },
  "Бувайдинский район": {
    uz: "Buvayda tumani",
    en: "Buvayda District"
  },
  "Дангаринский район": {
    uz: "Dangara tumani",
    en: "Dangara District"
  },
  "Кува район": {
    uz: "Quva tumani",
    en: "Kuva District"
  },
  "Кукандский район": {
    uz: "Qo'qon tumani",
    en: "Kokand District"
  },
  "Маргиланский район": {
    uz: "Marg'ilon tumani",
    en: "Margilan District"
  },
  "Риштанский район": {
    uz: "Rishton tumani",
    en: "Rishtan District"
  },
  "Сохский район": {
    uz: "So'x tumani",
    en: "Sokh District"
  },
  "Ташлакский район": {
    uz: "Toshloq tumani",
    en: "Tashlak District"
  },
  "Узбекистанский район": {
    uz: "O'zbekiston tumani",
    en: "Uzbekistan District"
  },
  "Учкуприкский район": {
    uz: "Uchko'prik tumani",
    en: "Uchkuprik District"
  },
  "Фаргонский район": {
    uz: "Farg'ona tumani",
    en: "Fergana District"
  },
  "Фуркатский район": {
    uz: "Furqat tumani",
    en: "Furkat District"
  },

  // Хорезмская область
  "Багатский район": {
    uz: "Bog'ot tumani",
    en: "Bagat District"
  },
  "Гурленский район": {
    uz: "Gurlan tumani",
    en: "Gurlen District"
  },
  "Кошкупырский район": {
    uz: "Qo'shko'pir tumani",
    en: "Koshkupyr District"
  },
  "Питнакский район": {
    uz: "Pitnak tumani",
    en: "Pitnak District"
  },
  "Соватский район": {
    uz: "Sovot tumani",
    en: "Sovat District"
  },
  "Урганчский район": {
    uz: "Urganch tumani",
    en: "Urgench District"
  },
  "Хазараспский район": {
    uz: "Xazorasp tumani",
    en: "Khazarasp District"
  },
  "Хивинский район": {
    uz: "Xiva tumani",
    en: "Khiva District"
  },
  "Шаватский район": {
    uz: "Shovot tumani",
    en: "Shavat District"
  },
  "Янгиарыкский район": {
    uz: "Yangiariq tumani",
    en: "Yangiaryk District"
  },
  "Янгибазарский район": {
    uz: "Yangibozor tumani",
    en: "Yangibazar District"
  },

  // Республика Каракалпакстан
  "Амударьинский район": {
    uz: "Amudaryo tumani",
    en: "Amudarya District"
  },
  "Беруний район": {
    uz: "Beruniy tumani",
    en: "Beruniy District"
  },
  "Карауазакский район": {
    uz: "Qorao'zak tumani",
    en: "Karauzak District"
  },
  "Кегейлийский район": {
    uz: "Kegeyli tumani",
    en: "Kegeyli District"
  },
  "Кунградский район": {
    uz: "Qo'ng'irot tumani",
    en: "Kungrad District"
  },
  "Муйнакский район": {
    uz: "Mo'ynoq tumani",
    en: "Muynak District"
  },
  "Нукусский район": {
    uz: "Nukus tumani",
    en: "Nukus District"
  },
  "Тахиаташский район": {
    uz: "Taxiatosh tumani",
    en: "Takhtash District"
  },
  "Тахтакупырский район": {
    uz: "Taxtako'pir tumani",
    en: "Takhtakupyr District"
  },
  "Турткульский район": {
    uz: "To'rtko'l tumani",
    en: "Turtkul District"
  },
  "Ходжейлийский район": {
    uz: "Xo'jayli tumani",
    en: "Khodjeyli District"
  },
  "Чимбайский район": {
    uz: "Chimboy tumani",
    en: "Chimbay District"
  },
  "Шуманайский район": {
    uz: "Shumanay tumani",
    en: "Shumanay District"
  },
  "Элликкалинский район": {
    uz: "Ellikqal'a tumani",
    en: "Ellikkala District"
  }
};

// Функция для перевода районов с полными переводами
export const translateDistrict = (districtName, language) => {
  if (language === 'ru') {
    return districtName; // Для русского оставляем как есть
  }
  
  // Проверяем есть ли полный перевод
  if (districtTranslations[districtName] && districtTranslations[districtName][language]) {
    return districtTranslations[districtName][language];
  }
  
  // Если нет полного перевода, используем базовую замену окончания
  if (language === 'en') {
    return districtName.replace(/\s+район$/, ' District');
  } else if (language === 'uz') {
    return districtName.replace(/\s+район$/, ' tumani');
  }
  
  return districtName;
};

// Создаем полный список всех районов из всех регионов с их индексами
const getAllDistricts = () => {
  const allDistricts = [];
  const regions = Object.keys(uzbekistanRegions);
  
  regions.forEach(regionName => {
    const regionData = uzbekistanRegions[regionName];
    if (regionData && regionData.districts) {
      allDistricts.push(...regionData.districts);
    }
  });
  
  return allDistricts;
};

// Универсальная функция для преобразования номера района в переведенное название
export const getDistrictNameById = (districtId, cityName, language = 'ru') => {
  if (!districtId) {
    return language === 'ru' ? 'Не указано' : (language === 'uz' ? 'Ko\'rsatilmagan' : 'Not specified');
  }
  
  const districtIndex = parseInt(districtId) - 1;
  
  // Если у нас есть город, сначала пробуем найти районы для него
  if (cityName) {
    const districts = getDistrictsByRegion(cityName);
    
    if (districts && districts.length > 0) {
      if (districtIndex >= 0 && districtIndex < districts.length) {
        const districtName = districts[districtIndex];
        return translateDistrict(districtName, language);
      }
      
      // Если не удалось найти по индексу, возможно это уже название района
      if (typeof districtId === 'string' && districts.includes(districtId)) {
        return translateDistrict(districtId, language);
      }
    }
  }
  
  // Если город не указан или районы не найдены, используем полный список всех районов
  const allDistricts = getAllDistricts();
  
  if (districtIndex >= 0 && districtIndex < allDistricts.length) {
    const districtName = allDistricts[districtIndex];
    return translateDistrict(districtName, language);
  }
  
  // Если это уже название района, проверяем во всех регионах
  if (typeof districtId === 'string' && allDistricts.includes(districtId)) {
    return translateDistrict(districtId, language);
  }
  
  // Если ничего не найдено, создаем универсальное название
  if (!isNaN(parseInt(districtId))) {
    const districtNum = parseInt(districtId);
    const genericName = `Район ${districtNum}`;
    return genericName;
  }
  
  // Если не удалось преобразовать, возвращаем как есть
  return districtId.toString();
};

// Функция для получения всех регионов с переводами
export const getTranslatedRegions = (language) => {
  const regions = Object.keys(regionTranslations.ru);
  return regions.map(region => ({
    original: region,
    translated: translateRegion(region, language)
  }));
}; 