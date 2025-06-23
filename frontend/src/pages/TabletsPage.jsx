import React from 'react';
import { Card, CardBody, CardHeader, Button, Chip } from '@nextui-org/react';
import { motion } from 'framer-motion';
import { PillIcon } from '../components/icons/PillIcon';
import { useTranslation } from '../components/LanguageSelector';

function TabletsPage() {
  const { t } = useTranslation();

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
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
                    color="primary" 
                    variant="flat" 
                    size="sm"
                  >
                    {t('planned', 'Планируется')}
                  </Chip>
                </CardBody>
              </Card>
            </motion.div>
          </div>

          {/* Кнопка обратной связи */}
          <motion.div 
            variants={cardVariants}
            className="text-center pt-8"
          >
            <Card className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-0 shadow-lg">
              <CardBody className="p-6">
                <h3 className="text-xl font-semibold mb-2">
                  {t('feedbackTitle', 'Есть предложения?')}
                </h3>
                <p className="text-blue-100 mb-4">
                  {t('feedbackDescription', 'Расскажите нам, какие функции управления таблетками вам нужны больше всего')}
                </p>
                <Button 
                  color="white" 
                  variant="flat" 
                  className="font-medium"
                  onClick={() => window.open('mailto:support@healzy.com', '_blank')}
                >
                  {t('sendFeedback', 'Отправить предложение')}
                </Button>
              </CardBody>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default TabletsPage; 