// Сервис для управления браузерными push-уведомлениями
class NotificationService {
  constructor() {
    this.isSupported = this.checkSupport();
    this.permission = this.getPermission();
  }
  
  // Проверяем поддержку браузерных уведомлений
  checkSupport() {
    if (typeof window === 'undefined') return false;
    return 'Notification' in window;
  }
  
  // Получаем текущее разрешение
  getPermission() {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission;
  }
  
  // Запрашиваем разрешение на уведомления
  async requestPermission() {
    if (!this.isSupported) {
      console.warn('[NotificationService] Браузерные уведомления не поддерживаются');
      return {
        success: false,
        permission: 'unsupported',
        message: 'Браузер не поддерживает уведомления',
        isBlocked: false
      };
    }
    
    // Обновляем текущий статус разрешения
    this.permission = this.getPermission();
    
    if (this.permission === 'granted') {
      console.log('[NotificationService] Разрешение на уведомления уже предоставлено');
      return {
        success: true,
        permission: 'granted',
        message: 'Разрешение уже предоставлено',
        isBlocked: false
      };
    }
    
    try {
      // Запрашиваем разрешение
      console.log('[NotificationService] Запрашиваем разрешение на браузерные уведомления...');
      const permission = await Notification.requestPermission();
      
      this.permission = permission;
      
      if (permission === 'granted') {
        console.log('[NotificationService] ✅ Разрешение на браузерные уведомления получено');
        return {
          success: true,
          permission: 'granted',
          message: 'Разрешение получено',
          isBlocked: false
        };
      } else if (permission === 'denied') {
        console.warn('[NotificationService] ❌ Пользователь отклонил разрешение на уведомления');
        return {
          success: false,
          permission: 'denied',
          message: 'Пользователь отклонил разрешение',
          isBlocked: true
        };
      } else {
        console.warn('[NotificationService] ⏸️ Пользователь отложил решение о разрешении');
        return {
          success: false,
          permission: 'default',
          message: 'Пользователь отложил решение',
          isBlocked: false
        };
      }
    } catch (error) {
      console.error('[NotificationService] Ошибка при запросе разрешения:', error);
      return {
        success: false,
        permission: 'error',
        message: `Ошибка: ${error.message}`,
        isBlocked: false
      };
    }
  }
  
  // Отправляем браузерное уведомление
  async send(title, options = {}) {
    console.log('[NotificationService] Попытка отправить уведомление:', { title, options });
    
    if (!this.isSupported) {
      console.debug('[NotificationService] Браузерные уведомления не поддерживаются');
      return { success: false, reason: 'not_supported' };
    }
    
    // Обновляем текущий статус разрешения
    this.permission = this.getPermission();
    console.log('[NotificationService] Текущий статус разрешения:', this.permission);
    
    // Проверяем и запрашиваем разрешение при необходимости
    if (this.permission !== 'granted') {
      console.log('[NotificationService] Разрешение не предоставлено, запрашиваем...');
      const permissionResult = await this.requestPermission();
      if (!permissionResult.success || permissionResult.permission !== 'granted') {
        console.debug('[NotificationService] Нет разрешения на показ уведомлений:', permissionResult);
        return { success: false, reason: 'permission_denied', details: permissionResult };
      }
    }
    
    try {
      // Создаем уникальный tag для каждого уведомления чтобы не блокировать новые
      const uniqueTag = options.tag || `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Создаем уведомление с настройками по умолчанию
      const notificationOptions = {
        icon: '/favicon.ico', // Иконка приложения
        badge: '/favicon.ico',
        tag: uniqueTag, // Уникальный тег для каждого уведомления
        renotify: true, // Показывать даже если есть похожие уведомления
        requireInteraction: false, // Автоматически скрывать
        silent: false, // Звук браузера
        ...options
      };
      
      console.log('[NotificationService] 📢 Создаем браузерное уведомление:', { title, notificationOptions });
      
      const notification = new Notification(title, notificationOptions);
      
      // Обработчики событий
      notification.onclick = (event) => {
        console.log('[NotificationService] Пользователь кликнул на уведомление');
        
        // Фокусируем окно браузера
        if (window) {
          window.focus();
        }
        
        // Вызываем callback если есть
        if (options.onclick && typeof options.onclick === 'function') {
          options.onclick(event);
        }
        
        // Закрываем уведомление
        notification.close();
      };
      
      notification.onshow = () => {
        console.log('[NotificationService] ✅ Уведомление показано:', title);
      };
      
      notification.onclose = () => {
        console.log('[NotificationService] Уведомление закрыто:', title);
      };
      
      notification.onerror = (error) => {
        console.error('[NotificationService] Ошибка уведомления:', error);
      };
      
      // Автоматически закрываем через определенное время (если не requireInteraction)
      if (!notificationOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, options.duration || 5000);
      }
      
      console.log('[NotificationService] ✅ Браузерное уведомление создано успешно');
      return { success: true, notification };
    } catch (error) {
      console.error('[NotificationService] Ошибка при создании уведомления:', error);
      return { success: false, reason: 'creation_error', error: error.message };
    }
  }
  
  // Проверяем статус разрешений
  getStatus() {
    // Обновляем текущий статус
    this.permission = this.getPermission();
    
    return {
      supported: this.isSupported,
      permission: this.permission,
      enabled: this.permission === 'granted'
    };
  }
  
  // Показываем инструкцию пользователю, как включить уведомления
  showEnableInstructions() {
    const userAgent = navigator.userAgent.toLowerCase();
    let instructions = '';
    
    if (userAgent.includes('chrome')) {
      instructions = 'Для включения уведомлений:\n1. Нажмите на иконку замка слева от адресной строки\n2. Выберите "Разрешить" для уведомлений\n3. Обновите страницу';
    } else if (userAgent.includes('firefox')) {
      instructions = 'Для включения уведомлений:\n1. Нажмите на иконку щита слева от адресной строки\n2. Выберите "Разрешить уведомления"\n3. Обновите страницу';
    } else if (userAgent.includes('safari')) {
      instructions = 'Для включения уведомлений:\n1. В Safari перейдите в Настройки > Веб-сайты > Уведомления\n2. Найдите наш сайт и выберите "Разрешить"';
    } else {
      instructions = 'Для включения уведомлений разрешите их в настройках браузера для этого сайта';
    }
    
    console.info('[NotificationService] Инструкции по включению уведомлений:', instructions);
    return instructions;
  }
}

// Создаем и экспортируем синглтон
const notificationService = new NotificationService();
export default notificationService; 