import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api';

// Store for managing chat state including unread messages
const useChatStore = create(
  persist(
    (set, get) => ({
      // Store unread message counts by consultation ID
      // Format: { consultationId: count }
      unreadMessages: {},
      
      // Total count of unread messages across all consultations
      totalUnread: 0,
      
      // Add an unread message for a consultation
      addUnreadMessage: (consultationId) => 
        set((state) => {
          const currentCount = state.unreadMessages[consultationId] || 0;
          const newUnreadMessages = {
            ...state.unreadMessages,
            [consultationId]: currentCount + 1
          };
          
          return {
            unreadMessages: newUnreadMessages,
            totalUnread: Object.values(newUnreadMessages).reduce((sum, count) => sum + count, 0)
          };
        }),
      
      // Mark messages for a consultation as read
      markAsRead: (consultationId) => 
        set((state) => {
          const newUnreadMessages = { ...state.unreadMessages };
          delete newUnreadMessages[consultationId];
          
          return {
            unreadMessages: newUnreadMessages,
            totalUnread: Object.values(newUnreadMessages).reduce((sum, count) => sum + count, 0)
          };
        }),
        
      // Set specific count for a consultation
      setUnreadCount: (consultationId, count) =>
        set((state) => {
          const newUnreadMessages = {
            ...state.unreadMessages,
            [consultationId]: count
          };
          
          return {
            unreadMessages: newUnreadMessages,
            totalUnread: Object.values(newUnreadMessages).reduce((sum, count) => sum + count, 0)
          };
        }),
      
      // Reset all unread counts
      resetUnread: () => set({ unreadMessages: {}, totalUnread: 0 }),
      
      // Fetch unread message counts from the server
      fetchUnreadCounts: async () => {
        try {
          
          // Сначала пробуем использовать API-эндпоинт для непрочитанных сообщений
          try {
            const unreadResponse = await api.get('/api/consultations/unread');
            
            if (unreadResponse.status === 200 && unreadResponse.data) {
              // Получаем данные из нового формата ответа API
              const unreadData = unreadResponse.data.unread_counts;
              
              // Проверка наличия данных
              if (!unreadData) {
                throw new Error('Неверный формат данных: unread_counts отсутствует');
              }
              
              // Проверяем формат данных
              if (typeof unreadData === 'object') {
                // Преобразуем все значения в числа для надежности
                const normalizedData = Object.entries(unreadData).reduce((acc, [key, value]) => {
                  acc[key] = Number(value);
                  return acc;
                }, {});
                
                const totalCount = Object.values(normalizedData).reduce((sum, count) => sum + count, 0);
                
                set({ 
                  unreadMessages: normalizedData,
                  totalUnread: totalCount 
                });
                
                return normalizedData;
              } else {
                throw new Error('Неверный формат данных: unread_counts не является объектом');
              }
            } else {
              throw new Error('Неверный ответ от сервера');
            }
          } catch (apiError) {
            // Используем резервный метод
            throw apiError;
          }
          
          // Если API не сработал, получаем данные через загрузку консультаций и их сообщений
          
          // Получаем все консультации пользователя
          const consultationsResponse = await api.get('/api/consultations');
          const consultations = consultationsResponse.data || [];
          
          if (!Array.isArray(consultations)) {
            return get().unreadMessages;
          }
          
          // Создаем локальный объект непрочитанных сообщений
          const unreadData = {};
          let totalUnread = 0;
          
          // Для всех консультаций проверяем непрочитанные сообщения
          const promises = consultations
            .filter(consultation => consultation.status === 'active' || consultation.status === 'pending')
            .map(async (consultation) => {
              try {
                // Получаем сообщения консультации
                const messagesResponse = await api.get(`/api/consultations/${consultation.id}/messages`);
                const messages = messagesResponse.data || [];
                
                if (!Array.isArray(messages)) {
                  return;
                }
                
                // Проверяем, есть ли непрочитанные сообщения
                const unreadCount = messages.filter(msg => !msg.is_read).length;
                
                if (unreadCount > 0) {
                  unreadData[consultation.id] = unreadCount;
                  totalUnread += unreadCount;
                }
              } catch (msgError) {
                // Пропускаем ошибки загрузки сообщений
              }
            });
          
          // Ждем завершения всех запросов
          await Promise.all(promises);
          
          // Обновляем состояние только если получены новые данные
          // или если есть изменения по сравнению с текущими данными
          const currentUnread = get().unreadMessages;
          const hasChanges = 
            Object.keys(unreadData).length !== Object.keys(currentUnread).length ||
            Object.keys(unreadData).some(id => unreadData[id] !== currentUnread[id]);
            
          if (Object.keys(unreadData).length > 0 || hasChanges) {
            set({ 
              unreadMessages: unreadData,
              totalUnread: totalUnread 
            });
          }
          
          return unreadData;
        } catch (error) {
          return get().unreadMessages;
        }
      }
    }),
    {
      name: 'chat-storage'
    }
  )
);

export default useChatStore; 