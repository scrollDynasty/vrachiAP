import React, { useState, useEffect } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Textarea, RadioGroup, Radio, Divider, Avatar, Card, Progress } from '@nextui-org/react';
import { toast } from 'react-hot-toast';
import api from '../api';

// Компонент модального окна для оставления отзыва о консультации
function ReviewForm({ isOpen, onClose, consultationId, onReviewSubmitted, doctorName, doctorAvatar }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);
  const [animate, setAnimate] = useState(false);

  // Эффект для анимации при открытии
  useEffect(() => {
    if (isOpen) {
      setAnimate(true);
      
      // Сбрасываем анимацию при закрытии
      return () => setAnimate(false);
    }
  }, [isOpen]);

  // Получаем эмодзи для текущего рейтинга
  const getRatingEmoji = (value) => {
    const emojis = {
      1: '😞',
      2: '🙁',
      3: '😐',
      4: '🙂',
      5: '😀'
    };
    return emojis[value] || '';
  };

  // Получаем текст для текущего рейтинга
  const getRatingText = (value) => {
    const texts = {
      1: 'Очень плохо',
      2: 'Плохо',
      3: 'Нормально',
      4: 'Хорошо',
      5: 'Отлично'
    };
    return texts[value] || '';
  };

  // Получаем цвет для текущего рейтинга
  const getRatingColor = (value) => {
    const colors = {
      1: 'danger',
      2: 'warning',
      3: 'primary',
      4: 'success',
      5: 'success'
    };
    return colors[value] || 'default';
  };

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
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="lg"
      classNames={{
        base: "bg-white shadow-lg rounded-xl",
        header: "border-b border-gray-100",
        footer: "border-t border-gray-100"
      }}
    >
      <ModalContent>
        <ModalHeader className="flex gap-3 items-center bg-gradient-to-r from-primary-50 to-blue-50 rounded-t-xl">
          <div className="rounded-full bg-primary-100 p-2">
            <i className="fas fa-comment-medical text-primary-500"></i>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-medium">Оставить отзыв</h3>
            {doctorName && (
              <p className="text-sm text-gray-500">Консультация с {doctorName}</p>
            )}
          </div>
        </ModalHeader>
        
        <ModalBody className="py-6 px-6">
          <div className={`transition-all duration-500 ${animate ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <Card className="mb-6 shadow-sm bg-gradient-to-b from-gray-50 to-white border-none">
              <div className="p-4 text-center">
                <p className="text-default-700 mb-4">
                  Ваш отзыв поможет другим пациентам выбрать подходящего врача. Спасибо за обратную связь!
                </p>
                
                {doctorAvatar && (
                  <div className="flex justify-center mb-4">
                    <Avatar 
                      src={doctorAvatar} 
                      size="lg" 
                      className="ring-2 ring-primary-200 ring-offset-2"
                    />
                  </div>
                )}
                
                <div className="mb-6">
                  <h3 className="text-medium font-semibold mb-3 text-center">Как вы оцениваете консультацию?</h3>
                  
                  <div className="flex justify-center items-center mb-3">
                    <div className="text-4xl transition-all duration-300 transform hover:scale-110">
                      {getRatingEmoji(hoverRating || rating)}
                    </div>
                  </div>
                  
                  <div className="text-center mb-3">
                    <span className={`font-medium text-${getRatingColor(hoverRating || rating)}-600`}>
                      {getRatingText(hoverRating || rating)}
                    </span>
                  </div>
                  
                  <div className="flex justify-center">
                    <RadioGroup
                      orientation="horizontal"
                      value={rating.toString()}
                      onValueChange={(value) => setRating(parseInt(value))}
                      classNames={{
                        wrapper: "gap-6"
                      }}
                    >
                      {[1, 2, 3, 4, 5].map((value) => (
                        <Radio
                          key={value}
                          value={value.toString()}
                          onMouseEnter={() => setHoverRating(value)}
                          onMouseLeave={() => setHoverRating(0)}
                          className={`transition-all duration-200 ${
                            (hoverRating || rating) >= value ? 'scale-110' : 'opacity-70'
                          }`}
                          classNames={{
                            base: `hover:bg-${getRatingColor(value)}-100 ${
                              rating === value ? `bg-${getRatingColor(value)}-100` : ''
                            }`,
                            wrapper: "w-10 h-10",
                            labelWrapper: "text-lg font-medium"
                          }}
                        >
                          {value}
                        </Radio>
                      ))}
                    </RadioGroup>
                  </div>
                  
                  <div className="mt-3">
                    <Progress 
                      value={rating * 20} 
                      color={getRatingColor(rating)}
                      className="h-1.5"
                      showValueLabel={false}
                    />
                  </div>
                </div>
                
                <div className="text-left">
                  <h3 className="text-medium font-semibold mb-2">Ваш комментарий</h3>
                  <Textarea
                    placeholder="Расскажите о вашем опыте консультации..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    minRows={3}
                    maxRows={5}
                    variant="bordered"
                    className={`transition-all duration-300 ${animate ? 'opacity-100' : 'opacity-0'}`}
                    classNames={{
                      input: "resize-none",
                      inputWrapper: "hover:border-primary-300 focus-within:border-primary-500"
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Ваш комментарий поможет врачу улучшить качество консультаций
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </ModalBody>
        
        <ModalFooter className="flex justify-between bg-gray-50 rounded-b-xl">
          <Button 
            variant="light" 
            onPress={onClose} 
            disabled={isSubmitting}
            className="hover:bg-gray-100"
          >
            Отмена
          </Button>
          <Button 
            color="primary" 
            onPress={handleSubmit}
            isLoading={isSubmitting}
            className="shadow-sm hover:shadow-md transition-all duration-300"
            startContent={<i className="fas fa-paper-plane"></i>}
          >
            Отправить отзыв
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ReviewForm; 