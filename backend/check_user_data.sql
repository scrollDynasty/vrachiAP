-- Скрипт для проверки данных пользователя в базе данных
-- Замените USER_ID на нужный ID пользователя

-- 1. Основная информация о пользователе
SELECT 
    id,
    email,
    role,
    is_active,
    auth_provider,
    avatar_path,
    created_at,
    updated_at
FROM users 
WHERE id = USER_ID;

-- 2. Профиль пациента (если есть)
SELECT 
    id,
    user_id,
    full_name,
    contact_phone,
    contact_address,
    city,
    district,
    country,
    medical_info
FROM patient_profiles 
WHERE user_id = USER_ID;

-- 3. Профиль врача (если есть)
SELECT 
    id,
    user_id,
    full_name,
    specialization,
    experience,
    education,
    cost_per_consultation,
    city,
    district,
    languages,
    practice_areas,
    is_verified,
    is_active,
    work_experience,
    country
FROM doctor_profiles 
WHERE user_id = USER_ID;

-- 4. Заявки врача (если есть)
SELECT 
    id,
    user_id,
    full_name,
    specialization,
    experience,
    education,
    license_number,
    city,
    district,
    languages,
    additional_info,
    status,
    admin_comment,
    created_at,
    processed_at,
    photo_path,
    diploma_path,
    license_path
FROM doctor_applications 
WHERE user_id = USER_ID
ORDER BY created_at DESC;

-- 5. Все данные в одном запросе (JOIN)
SELECT 
    u.id as user_id,
    u.email,
    u.role,
    u.is_active,
    u.auth_provider,
    u.created_at as user_created_at,
    
    -- Данные пациента
    pp.full_name as patient_name,
    pp.contact_phone as patient_phone,
    pp.city as patient_city,
    pp.district as patient_district,
    pp.country as patient_country,
    pp.contact_address as patient_address,
    
    -- Данные врача
    dp.full_name as doctor_name,
    dp.specialization,
    dp.experience,
    dp.cost_per_consultation,
    dp.city as doctor_city,
    dp.district as doctor_district,
    dp.languages as doctor_languages,
    dp.is_verified as doctor_verified,
    dp.is_active as doctor_active
    
FROM users u
LEFT JOIN patient_profiles pp ON u.id = pp.user_id
LEFT JOIN doctor_profiles dp ON u.id = dp.user_id
WHERE u.id = USER_ID;

-- Примеры использования:

-- Проверить пользователя с ID = 1
-- SELECT * FROM users WHERE id = 1;
-- SELECT * FROM patient_profiles WHERE user_id = 1;

-- Проверить всех пациентов с телефонами
-- SELECT u.email, pp.full_name, pp.contact_phone, pp.city, pp.district 
-- FROM users u 
-- JOIN patient_profiles pp ON u.id = pp.user_id 
-- WHERE u.role = 'patient' AND pp.contact_phone IS NOT NULL;

-- Проверить всех врачей с их городами и языками
-- SELECT u.email, dp.full_name, dp.city, dp.district, dp.languages, dp.specialization
-- FROM users u 
-- JOIN doctor_profiles dp ON u.id = dp.user_id 
-- WHERE u.role = 'doctor';

-- Найти пользователей по email
-- SELECT * FROM users WHERE email LIKE '%example%';

-- Найти врачей по городу
-- SELECT u.email, dp.full_name, dp.city, dp.specialization
-- FROM users u 
-- JOIN doctor_profiles dp ON u.id = dp.user_id 
-- WHERE dp.city = 'Ташкент'; 