import React, { useState } from 'react';
import { Card, CardBody, CardHeader, Button, Chip, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Textarea, Input } from '@nextui-org/react';
import { motion } from 'framer-motion';
import { PillIcon } from '../components/icons/PillIcon';
import { useTranslation } from '../components/LanguageSelector';
import { Notification } from '../components/Notification';

const TELEGRAM_BOT_TOKEN = '8120853924:AAE8QVugXnKY3Ax_uiDDWE9OP1wjlQHztMQ';
const TELEGRAM_CHAT_ID = -1002756008326; // Укажите chat_id, если хотите отправлять только в определённый чат

function TabletsPage() {
  const { t } = useTranslation();
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackData, setFeedbackData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackData.message.trim()) {
      setNotification({ type: 'error', message: 'Пожалуйста, введите ваше предложение' });
      setTimeout(() => setNotification(null), 3000);
      return;
    }
    setIsSubmitting(true);
    try {
      // Получаем IP адрес пользователя
      let userIP = 'Не определен';
      try {
        // Пробуем несколько сервисов для более точного определения IP
        const ipServices = [
          'https://api.ipify.org?format=json',
          'https://api.myip.com',
          'https://ipapi.co/json/',
          'https://ipinfo.io/json'
        ];
        
        for (const service of ipServices) {
          try {
            const ipResponse = await fetch(service, { timeout: 3000 });
            const ipData = await ipResponse.json();
            
            if (ipData.ip) {
              userIP = ipData.ip;
              break;
            } else if (ipData.query) {
              userIP = ipData.query;
              break;
            }
          } catch (serviceError) {
            continue; // Пробуем следующий сервис
          }
        }
      } catch (ipError) {
        // IP не удалось получить
      }

      const message = `\uD83D\uDCCA Новое предложение для раздела "Таблетки":\n\nИмя: ${feedbackData.name || 'Не указано'}\nEmail: ${feedbackData.email || 'Не указано'}\nIP адрес: ${userIP}\nСообщение: ${feedbackData.message}\n\nДата: ${new Date().toLocaleString()}`;
      let chatId = TELEGRAM_CHAT_ID;
      if (!chatId) {
        const updatesResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
        const updates = await updatesResp.json();
        if (updates.result && updates.result.length > 0) {
          const lastMsg = updates.result[updates.result.length - 1];
          chatId = lastMsg.message?.chat?.id;
        }
      }
      if (!chatId) {
        setIsSubmitting(false);
        return;
      }
      const sendResp = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
      const sendResult = await sendResp.json();
      if (sendResult.ok) {
        setNotification({ type: 'success', message: 'Спасибо за ваше предложение! Мы рассмотрим его в ближайшее время.' });
        setIsFeedbackModalOpen(false);
        setFeedbackData({ name: '', email: '', message: '' });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (error) {
      // Не показываем алерт, просто ничего не делаем
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Декоративные плавающие элементы */}
      <div className="absolute top-0 left-0 w-full h-full z-0 opacity-70">
        <motion.div 
          className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-gradient-to-r from-blue-300/20 to-indigo-300/20"
          animate={{
            y: [0, 20, 0],
            scale: [1, 1.05, 1],
            rotate: [0, 5, 0, -5, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute bottom-20 right-[10%] w-80 h-80 rounded-full bg-gradient-to-r from-purple-300/20 to-indigo-300/20"
          animate={{
            y: [0, -25, 0],
            scale: [1, 1.05, 1],
            rotate: [0, -5, 0, 5, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute top-1/3 right-[15%] w-40 h-40 rounded-full bg-gradient-to-r from-indigo-300/20 to-blue-300/20"
          animate={{
            y: [0, 15, 0],
            scale: [1, 1.08, 1],
            rotate: [0, 10, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        <motion.div 
          className="absolute bottom-1/4 left-[20%] w-56 h-56 rounded-full bg-gradient-to-r from-cyan-300/20 to-teal-300/20"
          animate={{
            y: [0, -15, 0],
            scale: [1, 1.03, 1],
            rotate: [0, -8, 0]
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4 relative z-10">
        {/* Заголовок страницы */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full">
              <PillIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800">
              {t('tablets', 'Таблетки')}
            </h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            {t('tabletsDescription', 'Управление лекарственными препаратами и их назначениями')}
          </p>
        </motion.div>

        {/* Основной контент */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          {/* Карточка с информацией о статусе */}
          <motion.div variants={cardVariants}>
            <Card className="bg-white/80 backdrop-blur-sm border border-blue-100 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-full">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('comingSoon', 'Скоро будет доступно')}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {t('tabletsFeature', 'Функция управления таблетками находится в разработке')}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Карточки с планируемыми функциями */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Карточка 1 */}
            <motion.div variants={cardVariants}>
              <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 hover:shadow-lg transition-all duration-300 group">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('prescriptionManagement', 'Управление рецептами')}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {t('prescriptionDescription', 'Создание, редактирование и отслеживание назначений лекарств')}
                  </p>
                  <Chip 
                    className="mt-3" 
                    color="primary" 
                    variant="flat" 
                    size="sm"
                  >
                    {t('planned', 'Планируется')}
                  </Chip>
                </CardBody>
              </Card>
            </motion.div>

            {/* Карточка 2 */}
            <motion.div variants={cardVariants}>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 hover:shadow-lg transition-all duration-300 group">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('medicationSchedule', 'Расписание приема')}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {t('scheduleDescription', 'Настройка напоминаний о приеме лекарств в нужное время')}
                  </p>
                  <Chip 
                    className="mt-3" 
                    color="success" 
                    variant="flat" 
                    size="sm"
                  >
                    {t('planned', 'Планируется')}
                  </Chip>
                </CardBody>
              </Card>
            </motion.div>

            {/* Карточка 3 */}
            <motion.div variants={cardVariants}>
              <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 hover:shadow-lg transition-all duration-300 group">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('medicationHistory', 'История приема')}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {t('historyDescription', 'Отслеживание истории приема лекарств и их эффективности')}
                  </p>
                  <Chip 
                    className="mt-3" 
                    color="secondary" 
                    variant="flat" 
                    size="sm"
                  >
                    {t('planned', 'Планируется')}
                  </Chip>
                </CardBody>
              </Card>
            </motion.div>

            {/* Карточка 4 */}
            <motion.div variants={cardVariants}>
              <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 hover:shadow-lg transition-all duration-300 group">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                      <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('drugInteractions', 'Взаимодействие лекарств')}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {t('interactionsDescription', 'Проверка совместимости и взаимодействия препаратов')}
                  </p>
                  <Chip 
                    className="mt-3" 
                    color="warning" 
                    variant="flat" 
                    size="sm"
                  >
                    {t('planned', 'Планируется')}
                  </Chip>
                </CardBody>
              </Card>
            </motion.div>

            {/* Карточка 5 */}
            <motion.div variants={cardVariants}>
              <Card className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 hover:shadow-lg transition-all duration-300 group">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('sideEffects', 'Побочные эффекты')}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {t('sideEffectsDescription', 'Информация о возможных побочных эффектах препаратов')}
                  </p>
                  <Chip 
                    className="mt-3" 
                    color="danger" 
                    variant="flat" 
                    size="sm"
                  >
                    {t('planned', 'Планируется')}
                  </Chip>
                </CardBody>
              </Card>
            </motion.div>

            {/* Карточка 6 */}
            <motion.div variants={cardVariants}>
              <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 hover:shadow-lg transition-all duration-300 group">
                <CardBody className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
                      <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 15h6v-2H4v2zM4 11h6V9H4v2zM4 7h6V5H4v2zM4 3h6V1H4v2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {t('refillReminders', 'Напоминания о пополнении')}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm">
                    {t('refillDescription', 'Уведомления о необходимости пополнения запаса лекарств')}
                  </p>
                  <Chip 
                    className="mt-3" 
                    color="default" 
                    variant="flat" 
                    size="sm"
                  >
                    {t('planned', 'Планируется')}
                  </Chip>
                </CardBody>
              </Card>
            </motion.div>
          </div>

          {/* Секция обратной связи */}
          <motion.div variants={cardVariants} className="mt-12">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 shadow-lg">
              <CardBody className="p-8 text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {t('feedbackTitle', 'Есть предложения?')}
                  </h3>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    {t('feedbackDescription', 'Расскажите нам, какие функции управления таблетками вам нужны больше всего')}
                  </p>
                </div>
                <Button
                  color="primary"
                  size="lg"
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold px-8 py-3"
                  onPress={() => setIsFeedbackModalOpen(true)}
                >
                  {t('sendFeedback', 'Отправить предложение')}
                </Button>
              </CardBody>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Модальное окно для обратной связи */}
      <Modal 
        isOpen={isFeedbackModalOpen} 
        onOpenChange={setIsFeedbackModalOpen}
        size="2xl"
        classNames={{
          base: "bg-white/95 backdrop-blur-md",
          header: "border-b border-gray-200",
          body: "py-6",
          footer: "border-t border-gray-200"
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">
                  {t('feedbackTitle', 'Есть предложения?')}
                </h3>
                <p className="text-sm text-gray-600">
                  Ваше мнение поможет нам сделать раздел "Таблетки" лучше
                </p>
              </div>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Ваше имя (необязательно)"
                placeholder="Введите ваше имя"
                value={feedbackData.name}
                onChange={(e) => setFeedbackData({...feedbackData, name: e.target.value})}
                variant="bordered"
              />
              <Input
                label="Email (необязательно)"
                placeholder="Введите ваш email"
                type="email"
                value={feedbackData.email}
                onChange={(e) => setFeedbackData({...feedbackData, email: e.target.value})}
                variant="bordered"
              />
              <Textarea
                label="Ваше предложение"
                placeholder="Расскажите нам, какие функции управления таблетками вам нужны больше всего..."
                value={feedbackData.message}
                onChange={(e) => setFeedbackData({...feedbackData, message: e.target.value})}
                variant="bordered"
                minRows={4}
                maxRows={8}
                isRequired
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button 
              variant="light" 
              onPress={() => setIsFeedbackModalOpen(false)}
              disabled={isSubmitting}
            >
              Отмена
            </Button>
            <Button 
              color="primary" 
              onPress={handleFeedbackSubmit}
              isLoading={isSubmitting}
              disabled={!feedbackData.message.trim()}
              className="bg-gradient-to-r from-blue-500 to-indigo-600"
            >
              {isSubmitting ? 'Отправка...' : 'Отправить'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {notification && (
        <div className={`fixed top-6 left-1/2 z-50 -translate-x-1/2 px-6 py-3 rounded-xl shadow-lg font-semibold text-base transition-all duration-300
          ${notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}

export default TabletsPage; 