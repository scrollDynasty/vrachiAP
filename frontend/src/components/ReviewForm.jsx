import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea, RadioGroup, Radio, Divider } from '@nextui-org/react';
import { toast } from 'react-hot-toast';
import api from '../api';

// Компонент модального окна для оставления отзыва о консультации
function ReviewForm({ isOpen, onClose, consultationId, onReviewSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Функция для отправки отзыва
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      await api.post(`/api/consultations/${consultationId}/review`, {
        rating,
        comment: comment.trim() || null
      });
      
      toast.success('Отзыв успешно отправлен');
      
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
      
      onClose();
      
    } catch (error) {
      console.error('Ошибка при отправке отзыва:', error);
      
      const errorMessage = error.response?.data?.detail || 
        'Не удалось отправить отзыв. Пожалуйста, попробуйте позже.';
      
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>Оставить отзыв о консультации</ModalHeader>
        <Divider />
        
        <ModalBody className="py-5">
          <p className="text-default-500 mb-4">
            Оцените качество консультации. Ваш отзыв поможет другим пациентам выбрать подходящего врача.
          </p>
          
          <div className="mb-4">
            <h3 className="text-medium mb-2">Оценка консультации</h3>
            <RadioGroup
              value={rating.toString()}
              onValueChange={(value) => setRating(parseInt(value))}
              orientation="horizontal"
            >
              <Radio value="1">1</Radio>
              <Radio value="2">2</Radio>
              <Radio value="3">3</Radio>
              <Radio value="4">4</Radio>
              <Radio value="5">5</Radio>
            </RadioGroup>
            <div className="text-xs text-default-500 mt-1">
              1 - очень плохо, 5 - отлично
            </div>
          </div>
          
          <div className="mb-2">
            <h3 className="text-medium mb-2">Комментарий (необязательно)</h3>
            <Textarea
              placeholder="Расскажите о вашем опыте консультации..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
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
            Отправить отзыв
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ReviewForm; 