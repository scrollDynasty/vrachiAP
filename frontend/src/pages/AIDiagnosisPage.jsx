import React, { useState, useRef, useEffect } from 'react';
import useAuthStore from '../stores/authStore';
import api from '../api';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const AIDiagnosisPage = () => {
  const user = useAuthStore(state => state.user);
  const [formData, setFormData] = useState({
    symptoms_description: '',
    patient_age: '',
    patient_gender: '',
    additional_info: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [diagnosisHistory, setDiagnosisHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const formRef = useRef(null);

  useEffect(() => {
    if (user && user.role === 'patient') {
      fetchDiagnosisHistory();
    }
  }, [user]);

  const fetchDiagnosisHistory = async () => {
    try {
      const response = await api.get('/api/ai/patient/history');
      if (response.data.success) {
        setDiagnosisHistory(response.data.data.diagnosis_history || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки истории диагностики:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.symptoms_description.trim()) {
      toast.error('Пожалуйста, опишите ваши симптомы');
      return;
    }

    if (formData.symptoms_description.length < 10) {
      toast.error('Описание симптомов должно содержать минимум 10 символов');
      return;
    }

    setIsLoading(true);
    
    try {
      const requestData = {
        symptoms_description: formData.symptoms_description,
        additional_info: formData.additional_info
      };

      if (formData.patient_age && !isNaN(formData.patient_age)) {
        requestData.patient_age = parseInt(formData.patient_age);
      }

      if (formData.patient_gender) {
        requestData.patient_gender = formData.patient_gender;
      }

      const response = await api.post('/api/ai/diagnosis', requestData);
      
      if (response.data) {
        setDiagnosisResult(response.data);
        toast.success('Анализ симптомов завершен');
        
        // Обновляем историю
        await fetchDiagnosisHistory();
        
        // Прокручиваем к результатам
        setTimeout(() => {
          const resultsElement = document.getElementById('diagnosis-results');
          if (resultsElement) {
            resultsElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      }
    } catch (error) {
      console.error('Ошибка при анализе симптомов:', error);
      toast.error(
        error.response?.data?.detail || 
        'Произошла ошибка при анализе симптомов. Попробуйте еще раз.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'urgent': return 'text-red-600 bg-red-50 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getUrgencyText = (urgency) => {
    switch (urgency) {
      case 'urgent': return 'Срочно';
      case 'high': return 'Высокая';
      case 'medium': return 'Средняя';
      case 'low': return 'Низкая';
      default: return 'Неизвестно';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (user?.role !== 'patient') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Доступ ограничен</h2>
          <p className="text-gray-600">
            AI диагностика доступна только для пациентов.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Диагностика симптомов
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Опишите ваши симптомы, и наша система искусственного интеллекта поможет 
            предварительно определить возможные причины и даст рекомендации.
          </p>
        </div>

        {/* Предупреждение */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Важное уведомление
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Данный анализ носит исключительно информационный характер и не заменяет 
                профессиональную медицинскую консультацию. При серьезных симптомах 
                обязательно обратитесь к врачу.
              </p>
            </div>
          </div>
        </div>

        {/* Кнопки переключения */}
        <div className="flex space-x-4 mb-8">
          <button
            onClick={() => setShowHistory(false)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              !showHistory 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Новый анализ
          </button>
          <button
            onClick={() => setShowHistory(true)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              showHistory 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            История диагностики
          </button>
        </div>

        <AnimatePresence mode="wait">
          {!showHistory ? (
            <motion.div
              key="diagnosis-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Форма диагностики */}
              <div className="bg-white rounded-lg shadow-md">
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Описание симптомов
                  </h2>
                  
                  <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                    {/* Основное описание симптомов */}
                    <div>
                      <label htmlFor="symptoms_description" className="block text-sm font-medium text-gray-700 mb-2">
                        Опишите ваши симптомы *
                      </label>
                      <textarea
                        id="symptoms_description"
                        name="symptoms_description"
                        value={formData.symptoms_description}
                        onChange={handleInputChange}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Например: У меня болит голова уже третий день, температура 37.2, кашель сухой, особенно по утрам. Также чувствую слабость..."
                        required
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Опишите как можно подробнее: что именно болит, когда появились симптомы, 
                        их характер и интенсивность
                      </p>
                    </div>

                    {/* Дополнительная информация */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label htmlFor="patient_age" className="block text-sm font-medium text-gray-700 mb-2">
                          Возраст
                        </label>
                        <input
                          type="number"
                          id="patient_age"
                          name="patient_age"
                          value={formData.patient_age}
                          onChange={handleInputChange}
                          min="0"
                          max="120"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Например: 25"
                        />
                      </div>

                      <div>
                        <label htmlFor="patient_gender" className="block text-sm font-medium text-gray-700 mb-2">
                          Пол
                        </label>
                        <select
                          id="patient_gender"
                          name="patient_gender"
                          value={formData.patient_gender}
                          onChange={handleInputChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">Выберите пол</option>
                          <option value="male">Мужской</option>
                          <option value="female">Женский</option>
                          <option value="other">Другой</option>
                        </select>
                      </div>
                    </div>

                    {/* Дополнительная информация */}
                    <div>
                      <label htmlFor="additional_info" className="block text-sm font-medium text-gray-700 mb-2">
                        Дополнительная информация
                      </label>
                      <textarea
                        id="additional_info"
                        name="additional_info"
                        value={formData.additional_info}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Хронические заболевания, принимаемые лекарства, аллергии, недавние поездки..."
                      />
                    </div>

                    {/* Кнопка отправки */}
                    <div>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-md transition-colors duration-200 flex items-center justify-center"
                      >
                        {isLoading ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Анализирую симптомы...
                          </>
                        ) : (
                          'Проанализировать симптомы'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Результаты диагностики */}
              {diagnosisResult && (
                <motion.div
                  id="diagnosis-results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-8 bg-white rounded-lg shadow-md"
                >
                  <div className="p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">
                      Результаты анализа
                    </h2>

                    {/* Общая информация */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {diagnosisResult.extracted_symptoms?.length || 0}
                        </div>
                        <div className="text-sm text-gray-600">Симптомов обнаружено</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getConfidenceColor(diagnosisResult.confidence)}`}>
                          {Math.round(diagnosisResult.confidence * 100)}%
                        </div>
                        <div className="text-sm text-gray-600">Уверенность</div>
                      </div>
                      <div className="text-center">
                        <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getUrgencyColor(diagnosisResult.urgency)}`}>
                          {getUrgencyText(diagnosisResult.urgency)}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">Срочность</div>
                      </div>
                    </div>

                    {/* Обнаруженные симптомы */}
                    {diagnosisResult.extracted_symptoms?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">
                          Обнаруженные симптомы
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {diagnosisResult.extracted_symptoms.map((symptom, index) => (
                            <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <div className="font-medium text-blue-900">
                                {symptom.name?.replace(/_/g, ' ') || 'Неизвестный симптом'}
                              </div>
                              <div className="text-sm text-blue-700 mt-1">
                                Уверенность: {Math.round((symptom.confidence || 0) * 100)}%
                              </div>
                              {symptom.severity && (
                                <div className="text-sm text-blue-600 mt-1">
                                  Тяжесть: {symptom.severity}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Возможные заболевания */}
                    {diagnosisResult.possible_diseases?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">
                          Возможные заболевания
                        </h3>
                        <div className="space-y-4">
                          {diagnosisResult.possible_diseases.map((disease, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium text-gray-900">
                                  {disease.name}
                                </h4>
                                <span className={`text-sm font-medium ${getConfidenceColor(disease.confidence)}`}>
                                  {Math.round((disease.confidence || 0) * 100)}%
                                </span>
                              </div>
                              {disease.description && (
                                <p className="text-gray-600 text-sm mb-2">
                                  {disease.description}
                                </p>
                              )}
                              <div className="text-sm text-gray-500">
                                Совпадений симптомов: {disease.matched_symptoms || 0} из {disease.total_symptoms || 0}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Рекомендации */}
                    {diagnosisResult.recommendations?.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-3">
                          Рекомендации
                        </h3>
                        <div className="space-y-3">
                          {diagnosisResult.recommendations.map((recommendation, index) => (
                            <div 
                              key={index} 
                              className={`p-3 rounded-lg border-l-4 ${
                                recommendation.priority === 'urgent' 
                                  ? 'bg-red-50 border-red-400 text-red-800'
                                  : recommendation.priority === 'high'
                                  ? 'bg-orange-50 border-orange-400 text-orange-800'
                                  : recommendation.priority === 'medium'
                                  ? 'bg-yellow-50 border-yellow-400 text-yellow-800'
                                  : 'bg-blue-50 border-blue-400 text-blue-800'
                              }`}
                            >
                              <div className="font-medium">
                                {recommendation.type === 'urgent' && '🚨 '}
                                {recommendation.type === 'warning' && '⚠️ '}
                                {recommendation.type === 'treatment' && '💊 '}
                                {recommendation.type === 'general' && '💡 '}
                                {recommendation.text}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Отказ от ответственности */}
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700">
                        <strong>Отказ от ответственности:</strong> {diagnosisResult.disclaimer}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        Время обработки: {diagnosisResult.processing_time?.toFixed(2) || 0} сек. | 
                        ID запроса: {diagnosisResult.request_id}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="diagnosis-history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg shadow-md"
            >
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">
                  История диагностики
                </h2>
                
                {diagnosisHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 mb-4">
                      <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      История пуста
                    </h3>
                    <p className="text-gray-600">
                      У вас пока нет сохраненных диагностических сессий.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {diagnosisHistory.map((diagnosis, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">
                            Диагностика #{diagnosis.id}
                          </h4>
                          <span className="text-sm text-gray-500">
                            {new Date(diagnosis.timestamp).toLocaleDateString('ru-RU')}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-2">
                          {diagnosis.symptoms_description?.substring(0, 150)}...
                        </p>
                        <div className="flex justify-between items-center">
                          <div className="text-sm text-gray-500">
                            Симптомов: {diagnosis.symptoms_count} | 
                            Заболеваний: {diagnosis.diseases_count}
                          </div>
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            Подробнее
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIDiagnosisPage; 