import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea, Divider } from '@nextui-org/react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import api from '../api';

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
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        {existingConsultation ? (
          <>
            <ModalHeader>У вас уже есть консультация</ModalHeader>
            <Divider />
            <ModalBody className="py-5">
              <p className="text-center mb-4">
                У вас уже существует активная консультация с врачом {doctorName}.
              </p>
              <p className="text-center">
                Вы можете перейти к истории консультаций, чтобы продолжить общение в существующей консультации.
              </p>
            </ModalBody>
            <Divider />
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Закрыть
              </Button>
              <Button 
                color="primary" 
                onPress={handleGoToHistory}
              >
                Перейти к консультациям
              </Button>
            </ModalFooter>
          </>
        ) : (
          <>
            <ModalHeader>Заявка на консультацию</ModalHeader>
            <Divider />
            
            <ModalBody className="py-5">
              <p className="text-default-500 mb-4">
                Вы собираетесь подать заявку на консультацию к врачу {doctorName || `#${doctorId}`}.
              </p>
              
              <p className="text-default-500 mb-4">
                После создания консультации, врач должен будет принять ее. 
                Консультация будет проходить в режиме чата.
              </p>
              
              <p className="text-default-500 mb-4">
                <strong>Лимит консультации: 30 сообщений</strong>. После достижения лимита, 
                вы сможете продлить консультацию еще на 30 сообщений.
              </p>
              
              <div className="mb-2 mt-4">
                <label className="block text-sm font-medium mb-1">
                  Сопроводительное письмо (необязательно)
                </label>
                <Textarea
                  placeholder="Опишите кратко причину обращения к врачу..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  minRows={3}
                  maxRows={5}
                />
              </div>
            </ModalBody>
            
            <Divider />
            
            <ModalFooter>
              <Button variant="flat" onPress={onClose} disabled={isSubmitting}>
                Отмена
              </Button>
              <Button 
                color="primary" 
                onPress={handleSubmit}
                isLoading={isSubmitting}
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