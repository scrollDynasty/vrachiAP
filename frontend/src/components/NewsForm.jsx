import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  ModalContent, 
  ModalHeader, 
  ModalBody, 
  ModalFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Switch,
  Chip
} from '@nextui-org/react';
import api from '../api';

function NewsForm({ isOpen, onClose, onSuccess, news = null, isEditing = false }) {
  const [formData, setFormData] = useState({
    title: '',
    summary: '',
    content: '',
    category: '',
    read_time: '',
    tags: '',
    is_published: false,
    is_featured: false
  });
  
  const [image, setImage] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Категории новостей
  const categories = [
    'Кардиология',
    'Эндокринология', 
    'Онкология',
    'Неврология',
    'Педиатрия',
    'Гинекология',
    'Урология',
    'Дерматология',
    'Офтальмология',
    'Психология',
    'Технологии',
    'Общие вопросы'
  ];

  useEffect(() => {
    if (isEditing && news) {
      setFormData({
        title: news.title || '',
        summary: news.summary || '',
        content: news.content || '',
        category: news.category || '',
        read_time: news.read_time || '',
        tags: news.tags ? news.tags.join(', ') : '',
        is_published: news.is_published || false,
        is_featured: news.is_featured || false
      });
      setRemoveImage(false);
    } else {
      // Сброс формы для создания новой новости
      setFormData({
        title: '',
        summary: '',
        content: '',
        category: '',
        read_time: '',
        tags: '',
        is_published: false,
        is_featured: false
      });
      setRemoveImage(false);
    }
    setImage(null);
    setError('');
  }, [isEditing, news, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setRemoveImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.summary.trim() || !formData.content.trim() || !formData.category) {
      setError('Заполните все обязательные поля');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const submitData = new FormData();
      
      // Добавляем текстовые поля
      submitData.append('title', formData.title);
      submitData.append('summary', formData.summary);
      submitData.append('content', formData.content);
      submitData.append('category', formData.category);
      
      if (formData.read_time) {
        submitData.append('read_time', formData.read_time);
      }
      
      if (formData.tags) {
        submitData.append('tags', JSON.stringify(
          formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        ));
      }
      
      submitData.append('is_published', formData.is_published);
      submitData.append('is_featured', formData.is_featured);
      
      // Добавляем изображение
      if (image) {
        submitData.append('image', image);
      }
      
      if (isEditing && removeImage) {
        submitData.append('remove_image', true);
      }

      let response;
      if (isEditing) {
        response = await api.put(`/api/news/${news.id}`, submitData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        response = await api.post('/api/news', submitData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      onSuccess(response.data);
      onClose();
    } catch (error) {
      setError(error.response?.data?.detail || 'Ошибка при сохранении новости');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="4xl"
      scrollBehavior="inside"
      isDismissable={!loading}
    >
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Редактировать новость' : 'Создать новость'}
            </h2>
          </ModalHeader>
          
          <ModalBody className="gap-4">
            {error && (
              <div className="bg-danger-50 text-danger p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Заголовок */}
            <Input
              label="Заголовок новости"
              placeholder="Введите заголовок"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              isRequired
              variant="bordered"
            />

            {/* Краткое описание */}
            <Textarea
              label="Краткое описание"
              placeholder="Краткое описание для главной страницы"
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              isRequired
              variant="bordered"
              minRows={2}
              maxRows={4}
            />

            {/* Полный текст */}
            <Textarea
              label="Полный текст новости"
              placeholder="Полный текст новости"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              isRequired
              variant="bordered"
              minRows={6}
              maxRows={12}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Категория */}
              <Select
                label="Категория"
                placeholder="Выберите категорию"
                selectedKeys={formData.category ? [formData.category] : []}
                onSelectionChange={(keys) => {
                  const category = Array.from(keys)[0];
                  handleInputChange('category', category || '');
                }}
                isRequired
                variant="bordered"
              >
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </Select>

              {/* Время чтения */}
              <Input
                label="Время чтения"
                placeholder="например: 5 мин"
                value={formData.read_time}
                onChange={(e) => handleInputChange('read_time', e.target.value)}
                variant="bordered"
              />
            </div>

            {/* Теги */}
            <div>
              <Input
                label="Теги"
                placeholder="Введите теги через запятую"
                value={formData.tags}
                onChange={(e) => handleInputChange('tags', e.target.value)}
                variant="bordered"
                description="Теги разделяйте запятыми"
              />
              {formData.tags && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.split(',').map((tag, index) => {
                    const trimmedTag = tag.trim();
                    return trimmedTag ? (
                      <Chip key={index} size="sm" variant="flat">
                        #{trimmedTag}
                      </Chip>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Изображение */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Изображение новости
              </label>
              
              {/* Текущее изображение при редактировании */}
              {isEditing && news?.image_path && !removeImage && (
                <div className="mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={`${import.meta.env.VITE_API_URL || 'https://healzy.uz'}${news.image_path}`}
                      alt="Текущее изображение"
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div>
                      <p className="text-sm text-gray-600">Текущее изображение</p>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={() => setRemoveImage(true)}
                      >
                        Удалить изображение
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Загрузка нового изображения */}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500
                         file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0
                         file:text-sm file:font-semibold
                         file:bg-blue-50 file:text-blue-700
                         hover:file:bg-blue-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                Поддерживаются форматы: JPG, PNG, WebP
              </p>
            </div>

            {/* Настройки публикации */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700">Настройки публикации</h4>
              
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Опубликовать</p>
                  <p className="text-xs text-gray-500">Новость будет видна на сайте</p>
                </div>
                <Switch
                  isSelected={formData.is_published}
                  onValueChange={(value) => handleInputChange('is_published', value)}
                  color="success"
                />
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">Рекомендуемая</p>
                  <p className="text-xs text-gray-500">Показывать на главной странице</p>
                </div>
                <Switch
                  isSelected={formData.is_featured}
                  onValueChange={(value) => handleInputChange('is_featured', value)}
                  color="primary"
                />
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <Button
              color="danger"
              variant="light"
              onPress={onClose}
              isDisabled={loading}
            >
              Отмена
            </Button>
            <Button
              color="primary"
              type="submit"
              isLoading={loading}
              loadingText={isEditing ? "Сохранение..." : "Создание..."}
            >
              {isEditing ? 'Сохранить' : 'Создать'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

export default NewsForm; 