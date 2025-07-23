import React, { useState, useRef, useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import api from '../api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const AIDiagnosisPage = () => {
  const user = useAuthStore(state => state.user);
  
  // Состояние для разговорной AI
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [conversationStatus, setConversationStatus] = useState(null); // greeting, history_taking, assessment, recommendation
  const [conversationData, setConversationData] = useState({
    symptoms: [],
    conditions: [],
    urgency: 'low',
    recommendations: []
  });
  
  // История разговоров
  const [conversationHistory, setConversationHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  // Статус AI системы
  const [aiStatus, setAiStatus] = useState(null);
  
  // Ошибки
  const [error, setError] = useState(null);
  
  // Refs
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  useEffect(() => {
    if (user && user.role === 'patient') {
      fetchAiStatus();
      fetchConversationHistory();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAiStatus = async () => {
    try {
      const response = await api.get('/api/ai/conversation/status');
      setAiStatus(response.data);
    } catch (error) {
      // Пропускаем ошибку получения статуса AI
    }
  };

  const fetchConversationHistory = async () => {
    try {
      const response = await api.get('/api/ai/conversations');
      if (response.data && response.data.success) {
        setConversationHistory(response.data.conversations || []);
      }
    } catch (error) {
      // Пропускаем ошибку загрузки истории разговоров
    }
  };

  const startNewConversation = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const patientInfo = {
        patient_age: user.patient_profile?.age,
        patient_gender: user.patient_profile?.gender,
        additional_info: user.patient_profile?.medical_info
      };

      const response = await api.post('/api/ai/conversation/start', patientInfo);
      
      if (response.data && response.data.success) {
        setSessionId(response.data.session_id);
        setConversationStatus(response.data.stage);
        
        // Добавляем первое сообщение от AI врача
        setMessages([{
          id: 1,
          sender: 'ai_doctor',
          message: response.data.message,
          timestamp: new Date().toISOString(),
          stage: response.data.stage
        }]);
        
        toast.success('Начата консультация с AI врачом');
        
        // Фокусируемся на поле ввода
        setTimeout(() => {
          messageInputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      
      let errorMessage = 'Не удалось начать консультацию с AI врачом';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || !sessionId || isLoading) return;
    
    const messageText = currentMessage.trim();
    setCurrentMessage('');
    setIsLoading(true);
    setError(null);
    
    // Добавляем сообщение пациента
    const patientMessage = {
      id: messages.length + 1,
      sender: 'patient',
      message: messageText,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, patientMessage]);
    
    try {
      const response = await api.post('/api/ai/conversation/chat', {
        session_id: sessionId,
        message: messageText
      });
      
      if (response.data && response.data.success) {
        // Добавляем ответ AI врача
        const aiMessage = {
          id: messages.length + 2,
          sender: 'ai_doctor',
          message: response.data.message,
          timestamp: new Date().toISOString(),
          stage: response.data.stage,
          urgency: response.data.urgency
        };
        
        setMessages(prev => [...prev, aiMessage]);
        setConversationStatus(response.data.stage);
        setConversationData({
          symptoms: response.data.symptoms || [],
          conditions: response.data.conditions || [],
          urgency: response.data.urgency || 'low',
          recommendations: response.data.recommendations || []
        });
        
        // Если критическая ситуация, показываем предупреждение
        if (response.data.urgency === 'critical') {
          toast.error('ВНИМАНИЕ: Требуется немедленная медицинская помощь!', {
            duration: 10000,
            style: {
              background: '#ef4444',
              color: 'white',
              fontWeight: 'bold'
            }
          });
        }
      }
    } catch (error) {
      
      let errorMessage = 'Ошибка обработки сообщения';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Удаляем сообщение пациента при ошибке
      setMessages(prev => prev.filter(msg => msg.id !== patientMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const endConversation = async () => {
    if (!sessionId) return;
    
    try {
      const response = await api.post(`/api/ai/conversation/${sessionId}/end`);
      
      if (response.data && response.data.success) {
        // Добавляем финальное сообщение
        const finalMessage = {
          id: messages.length + 1,
          sender: 'ai_doctor',
          message: response.data.message,
          timestamp: new Date().toISOString(),
          isFinal: true
        };
        
        setMessages(prev => [...prev, finalMessage]);
        setSessionId(null);
        setConversationStatus(null);
        
        toast.success('Консультация завершена');
        
        // Обновляем историю
        fetchConversationHistory();
      }
    } catch (error) {
      toast.error('Ошибка при завершении консультации');
    }
  };

  const loadConversationHistory = async (historySessionId) => {
    try {
      const response = await api.get(`/api/ai/conversation/${historySessionId}/history`);
      
      if (response.data) {
        const history = response.data.messages.map((msg, index) => ({
          id: index + 1,
          sender: msg.speaker === 'ai_doctor' ? 'ai_doctor' : 'patient',
          message: msg.message,
          timestamp: msg.timestamp,
          context: msg.context
        }));
        
        setMessages(history);
        setSessionId(null); // Это история, нельзя продолжить
        setConversationStatus('completed');
        setShowHistory(false);
        
        if (response.data.conversation_info) {
          setConversationData({
            symptoms: response.data.conversation_info.symptoms || [],
            conditions: response.data.conversation_info.conditions || [],
            urgency: response.data.conversation_info.urgency || 'low',
            recommendations: []
          });
        }
      }
    } catch (error) {
      toast.error('Ошибка загрузки истории разговора');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getUrgencyText = (urgency) => {
    switch (urgency) {
      case 'critical': return 'КРИТИЧНО';
      case 'high': return 'Высокая';
      case 'medium': return 'Средняя';
      default: return 'Низкая';
    }
  };

  const getStageText = (stage) => {
    switch (stage) {
      case 'greeting': return 'Приветствие';
      case 'history_taking': return 'Сбор анамнеза';
      case 'assessment': return 'Оценка состояния';
      case 'recommendation': return 'Рекомендации';
      case 'completed': return 'Завершено';
      default: return 'Консультация';
    }
  };

  // Проверяем доступ пациента
  if (!user || user.role !== 'patient') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Доступ ограничен</h2>
          <p className="text-gray-600 mb-6">
            AI консультант доступен только для пациентов. 
            Пожалуйста, войдите как пациент для использования этой функции.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <motion.h1 
            className="text-4xl font-bold text-gray-800 mb-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            🤖 AI Врач-Консультант
          </motion.h1>
          <motion.p 
            className="text-gray-600 text-lg max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Интеллектуальный помощник для медицинских консультаций. 
            Опишите свои симптомы и получите предварительную оценку состояния.
          </motion.p>
          
          {/* Статус AI системы */}
          {aiStatus && (
            <motion.div 
              className="mt-4 inline-flex items-center px-4 py-2 rounded-full text-sm"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <div className={`flex items-center ${aiStatus.success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${aiStatus.success ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {aiStatus.success ? 'AI врач онлайн' : 'AI врач недоступен'}
                {aiStatus.status && (
                  <span className="ml-2 text-xs">
                    (Активных сессий: {aiStatus.status.active_sessions || 0})
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Основная область чата */}
            <div className="lg:col-span-3">
              <motion.div 
                className="bg-white rounded-xl shadow-lg overflow-hidden"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                {/* Заголовок чата */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center mr-3">
                        🩺
                      </div>
                      <div>
                        <h3 className="font-semibold">AI Врач</h3>
                        <p className="text-sm opacity-90">
                          {conversationStatus ? getStageText(conversationStatus) : 'Готов к консультации'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Кнопка истории */}
                      <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="px-3 py-1 bg-white bg-opacity-20 rounded-lg text-sm hover:bg-opacity-30 transition-all"
                      >
                        📚 История
                      </button>
                      
                      {/* Кнопка завершения разговора */}
                      {sessionId && (
                        <button
                          onClick={endConversation}
                          className="px-3 py-1 bg-red-500 bg-opacity-80 rounded-lg text-sm hover:bg-opacity-100 transition-all"
                        >
                          ✖️ Завершить
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Область сообщений */}
                <div className="h-96 overflow-y-auto p-4 bg-gray-50">
                  {messages.length === 0 && !sessionId ? (
                    <div className="text-center text-gray-500 mt-20">
                      <div className="text-6xl mb-4">💬</div>
                      <h3 className="text-xl font-semibold mb-2">Начните консультацию</h3>
                      <p className="mb-6">Нажмите кнопку ниже, чтобы начать разговор с AI врачом</p>
                      <button
                        onClick={startNewConversation}
                        disabled={isConnecting}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50"
                      >
                        {isConnecting ? '⏳ Подключение...' : '🚀 Начать консультацию'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence>
                        {messages.map((message) => (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className={`flex ${message.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender === 'patient' 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-white text-gray-800 shadow-md border'
                            }`}>
                              {message.sender === 'ai_doctor' && (
                                <div className="flex items-center mb-1">
                                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs mr-2">
                                    🩺
                                  </div>
                                  <span className="text-xs text-gray-500 font-medium">AI Врач</span>
                                  {message.stage && (
                                    <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                      {getStageText(message.stage)}
                                    </span>
                                  )}
                                </div>
                              )}
                              
                              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                              
                              {message.urgency && message.urgency !== 'low' && (
                                <div className={`mt-2 text-xs px-2 py-1 rounded ${getUrgencyColor(message.urgency)}`}>
                                  ⚠️ Срочность: {getUrgencyText(message.urgency)}
                                </div>
                              )}
                              
                              <div className={`text-xs mt-1 ${
                                message.sender === 'patient' ? 'text-blue-200' : 'text-gray-400'
                              }`}>
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      
                      {isLoading && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-start"
                        >
                          <div className="bg-white text-gray-800 shadow-md border max-w-xs px-4 py-2 rounded-lg">
                            <div className="flex items-center">
                              <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs mr-2">
                                🩺
                              </div>
                              <span className="text-xs text-gray-500 font-medium mr-2">AI Врач печатает</span>
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Поле ввода сообщения */}
                {sessionId && (
                  <div className="border-t bg-white p-4">
                    <div className="flex space-x-2">
                      <input
                        ref={messageInputRef}
                        type="text"
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Опишите свои симптомы или задайте вопрос..."
                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={isLoading}
                      />
                      <button
                        onClick={sendMessage}
                        disabled={!currentMessage.trim() || isLoading}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? '⏳' : '📤'}
                      </button>
                    </div>
                    
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-2"
                      >
                        ⚠️ {error}
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Кнопка начала новой консультации для завершенных разговоров */}
                {!sessionId && messages.length > 0 && (
                  <div className="border-t bg-white p-4 text-center">
                    <button
                      onClick={startNewConversation}
                      disabled={isConnecting}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-50"
                    >
                      {isConnecting ? '⏳ Подключение...' : '💬 Новая консультация'}
                    </button>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Боковая панель */}
            <div className="lg:col-span-1 space-y-6">
              {/* Информация о текущей консультации */}
              {sessionId && (
                <motion.div 
                  className="bg-white rounded-xl shadow-lg p-6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                >
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                    📊 Текущая консультация
                  </h3>
                  
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Стадия:</span>
                      <div className="text-sm font-medium text-blue-600">
                        {getStageText(conversationStatus)}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm text-gray-600">Уровень срочности:</span>
                      <div className={`text-sm font-medium px-2 py-1 rounded ${getUrgencyColor(conversationData.urgency)}`}>
                        {getUrgencyText(conversationData.urgency)}
                      </div>
                    </div>
                    
                    {conversationData.symptoms.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">Выявленные симптомы:</span>
                        <div className="mt-1 space-y-1">
                          {conversationData.symptoms.slice(0, 3).map((symptom, index) => (
                            <div key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                              {symptom}
                            </div>
                          ))}
                          {conversationData.symptoms.length > 3 && (
                            <div className="text-xs text-gray-500">
                              +{conversationData.symptoms.length - 3} еще
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {conversationData.conditions.length > 0 && (
                      <div>
                        <span className="text-sm text-gray-600">Возможные состояния:</span>
                        <div className="mt-1 space-y-1">
                          {conversationData.conditions.slice(0, 2).map((condition, index) => (
                            <div key={index} className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                              {condition}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* История разговоров */}
              {showHistory && (
                <motion.div 
                  className="bg-white rounded-xl shadow-lg p-6"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                    📚 История консультаций
                  </h3>
                  
                  {conversationHistory.length === 0 ? (
                    <p className="text-gray-500 text-sm">
                      У вас пока нет истории консультаций
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {conversationHistory.slice(0, 5).map((conversation) => (
                        <div 
                          key={conversation.session_id}
                          className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-all"
                          onClick={() => loadConversationHistory(conversation.session_id)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-500">
                              {new Date(conversation.created_at).toLocaleDateString()}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              conversation.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {conversation.status === 'completed' ? 'Завершено' : 'Активно'}
                            </span>
                          </div>
                          
                          <div className={`text-xs px-2 py-1 rounded mb-2 ${getUrgencyColor(conversation.urgency)}`}>
                            {getUrgencyText(conversation.urgency)}
                          </div>
                          
                          {conversation.last_message && (
                            <p className="text-xs text-gray-600 truncate">
                              {conversation.last_message.message}
                            </p>
                          )}
                          
                          {conversation.symptoms.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {conversation.symptoms.slice(0, 2).map((symptom, index) => (
                                <span key={index} className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded">
                                  {symptom}
                                </span>
                              ))}
                              {conversation.symptoms.length > 2 && (
                                <span className="text-xs text-gray-400">+{conversation.symptoms.length - 2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {conversationHistory.length > 5 && (
                        <div className="text-center">
                          <button className="text-blue-600 text-xs hover:underline">
                            Показать еще ({conversationHistory.length - 5})
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Важная информация */}
              <motion.div 
                className="bg-amber-50 border border-amber-200 rounded-xl p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
              >
                <h3 className="font-semibold text-amber-800 mb-3 flex items-center">
                  ⚠️ Важно помнить
                </h3>
                <div className="text-sm text-amber-700 space-y-2">
                  <p>• AI консультант не заменяет визит к врачу</p>
                  <p>• В критических случаях немедленно обращайтесь к врачу</p>
                  <p>• Предоставляйте точную информацию о симптомах</p>
                  <p>• Сохраняйте результаты консультации</p>
                </div>
              </motion.div>

              {/* Быстрые действия */}
              <motion.div 
                className="bg-white rounded-xl shadow-lg p-6"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
              >
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center">
                  🚀 Быстрые действия
                </h3>
                
                <div className="space-y-2">
                  <button
                    onClick={() => window.location.href = '/doctors'}
                    className="w-full text-left px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all text-sm"
                  >
                    👨‍⚕️ Найти врача
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/consultations'}
                    className="w-full text-left px-3 py-2 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-all text-sm"
                  >
                    💬 Мои консультации
                  </button>
                  
                  <button
                    onClick={() => window.location.href = '/profile'}
                    className="w-full text-left px-3 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-all text-sm"
                  >
                    👤 Мой профиль
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIDiagnosisPage; 