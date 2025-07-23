# Исправление Google OAuth

## 🔧 Изменения в коде:

### ✅ **Исправлено:**
1. **Backend callback URL**: изменен с `/auth/google/callback` на `/api/auth/google/callback`
2. **Redirect URI**: обновлен в `auth.py` на `https://soglom.com/api/auth/google/callback`
3. **JavaScript redirect**: теперь перенаправляет на `/dashboard` или `/profile/setup`

## 🌐 **Необходимо обновить в Google Console:**

Зайдите в [Google Cloud Console](https://console.cloud.google.com/):

1. **Проект**: Ваш проект с Client ID `735617581412-e8ceb269bj7qqrv9sl066q63g5dr5sne`
2. **APIs & Services > Credentials**
3. **OAuth 2.0 Client IDs > Ваш Client ID**
4. **Authorized redirect URIs**: добавьте/обновите на:
   ```
   https://soglom.com/api/auth/google/callback
   ```

## 🚀 **Деплой изменений:**

```bash
# 1. Скопировать обновленные файлы на продакшен
sudo cp /home/whoami/vrachiAPP/backend/main.py /var/www/healzy.app/backend/
sudo cp /home/whoami/vrachiAPP/backend/auth.py /var/www/healzy.app/backend/

# 2. Перезапустить backend
cd /var/www/healzy.app/backend
pm2 restart healzy-backend

# 3. Проверить статус
pm2 logs healzy-backend --lines 10
```

## 📋 **Что должно работать после исправления:**

1. ✅ **Google OAuth кнопка** → перенаправляет на Google
2. ✅ **Google авторизация** → возвращает на `/api/auth/google/callback`
3. ✅ **Backend обработка** → создает токен и HTML с JavaScript
4. ✅ **JavaScript** → сохраняет токен в localStorage и перенаправляет на frontend route
5. ✅ **Frontend** → пользователь видит главную страницу или setup профиля

## 🔍 **Логи для проверки:**

После обновления проверьте логи:
```bash
pm2 logs healzy-backend --lines 20 | grep -E "(Google|oauth|callback)"
```

Должны увидеть:
- `Google Auth: Login successful for email@gmail.com`
- `HTTP 200 OK` вместо `422 Unprocessable Entity` 