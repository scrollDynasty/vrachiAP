import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea, Divider } from '@nextui-org/react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { motion } from 'framer-motion';

// Компонент модального окна для запроса консультации
function RequestConsultationModal({ isOpen, onClose, doctorId, doctorName }) {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingConsultation, setExistingConsultation] = useState(false);
  const navigate = useNavigate();

  // Функция для отправки запроса на консультацию
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Для отладки
      console.log('Отправляем запрос на консультацию к врачу:', doctorName);
      console.log('doctorId:', doctorId);
      
      // Подготавливаем данные для отправки
      const consultationData = {
        doctor_id: doctorId,
        patient_note: note
      };
      
      console.log('Данные для отправки:', consultationData);
      
      const response = await api.post('/api/consultations', consultationData);
      console.log('Ответ сервера:', response.data);
      
      toast.success('Заявка на консультацию успешно отправлена!');
      onClose();
      
      // Перенаправляем пользователя в историю консультаций, чтобы увидеть новую заявку
      setTimeout(() => {
        navigate('/history');
      }, 1500);
      
    } catch (error) {
      console.error('Ошибка при отправке заявки на консультацию:', error);
      
      const errorMessage = error.response?.data?.detail || 
        'Не удалось отправить заявку на консультацию. Пожалуйста, попробуйте позже.';
      
      // Проверяем, связана ли ошибка с существующей консультацией
      if (errorMessage.includes('уже есть активная консультация')) {
        toast.error('У вас уже есть активная консультация с этим врачом');
        setExistingConsultation(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Функция для перехода к истории консультаций
  const handleGoToHistory = () => {
    onClose();
    navigate('/history');
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="3xl"
      classNames={{
        base: "bg-white rounded-xl shadow-xl",
        body: "p-5",
        backdrop: "bg-gradient-to-br from-blue-900/20 to-indigo-900/20 backdrop-opacity-30",
        wrapper: "z-50"
      }}
      motionProps={{
        variants: {
          enter: {
            y: 0,
            opacity: 1,
            transition: {
              duration: 0.3,
              ease: "easeOut"
            }
          },
          exit: {
            y: -20,
            opacity: 0,
            transition: {
              duration: 0.2,
              ease: "easeIn"
            }
          }
        }
      }}
    >
      <ModalContent>
        {existingConsultation ? (
          <>
            <ModalHeader className="flex justify-center text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              У вас уже есть консультация
            </ModalHeader>
            <Divider className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <ModalBody className="py-8">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="text-center"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-lg font-medium mb-4">
                  У вас уже существует активная консультация с врачом <span className="font-semibold text-indigo-600">{doctorName}</span>.
                </p>
                <p className="text-gray-600">
                  Вы можете перейти к истории консультаций, чтобы продолжить общение в существующей консультации.
                </p>
              </motion.div>
            </ModalBody>
            <Divider className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <ModalFooter className="flex justify-center gap-4 pt-4">
              <Button 
                variant="light" 
                onPress={onClose}
                className="px-6"
                radius="full"
              >
                Закрыть
              </Button>
              <Button 
                color="primary" 
                onPress={handleGoToHistory}
                className="px-6 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md"
                radius="full"
              >
                Перейти к консультациям
              </Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <ModalHeader className="flex justify-center text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Заявка на консультацию
            </ModalHeader>
            <Divider className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            
            <ModalBody className="py-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl mb-5 shadow-inner">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Врач</h3>
                      <p className="text-indigo-600 font-medium">{doctorName || `#${doctorId}`}</p>
                    </div>
                  </div>
                  
                  <div className="flex mb-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Формат</h3>
                      <p className="text-gray-600">Консультация в чате</p>
                    </div>
                  </div>
                  
                  <div className="flex">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center mr-3 shadow-md">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800">Лимит сообщений</h3>
                      <p className="text-gray-600">30 сообщений (с возможностью продления)</p>
                    </div>
                  </div>
                </div>
              
                <div className="mt-6">
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Сопроводительное письмо (необязательно)
                  </label>
                  <Textarea
                    placeholder="Опишите кратко причину обращения к врачу, симптомы или вопросы, которые вы хотели бы обсудить..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    minRows={4}
                    maxRows={6}
                    className="w-full"
                    classNames={{
                      inputWrapper: "bg-gradient-to-br from-blue-50 to-indigo-50 shadow-inner border-1 border-indigo-100 focus-within:ring-2 focus-within:ring-indigo-200",
                      input: "text-gray-700"
                    }}
                  />
                </div>
              </motion.div>
            </ModalBody>
            
            <Divider className="h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            
            <ModalFooter className="flex justify-center gap-4 pt-4">
              <Button 
                variant="light" 
                onPress={onClose} 
                disabled={isSubmitting}
                className="px-6"
                radius="full"
              >
                Отмена
              </Button>
              <Button 
                color="primary" 
                onPress={handleSubmit}
                isLoading={isSubmitting}
                className="px-8 bg-gradient-to-r from-blue-500 to-indigo-600 shadow-md"
                radius="full"
              >
                Отправить заявку
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

export default RequestConsultationModal; 