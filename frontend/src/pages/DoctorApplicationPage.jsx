import React from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorApplicationForm from '../components/DoctorApplicationForm';
import { Card, CardBody, CardHeader, Divider } from '@nextui-org/react';
import { ApplicationStatusTracker } from '../components/Notification';
import { motion } from 'framer-motion';
import { useTranslation } from '../components/LanguageSelector.jsx';

// Анимационные варианты
const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.6 } }
};

const slideInFromTop = {
  hidden: { y: -30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

const slideInFromBottom = {
  hidden: { y: 30, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 100, damping: 15 } }
};

function DoctorApplicationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Функция обратного вызова при успешной отправке заявки
  const handleSuccess = () => {
    // Можно добавить перенаправление на профиль после успешной отправки
    setTimeout(() => {
      navigate('/profile');
    }, 3000);
  };
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Динамический градиентный фон */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 z-0"
        animate={{ 
          background: [
            'linear-gradient(to bottom right, rgba(239, 246, 255, 0.8), rgba(224, 231, 255, 0.8), rgba(237, 233, 254, 0.8))',
            'linear-gradient(to bottom right, rgba(224, 242, 254, 0.8), rgba(219, 234, 254, 0.8), rgba(224, 231, 255, 0.8))',
            'linear-gradient(to bottom right, rgba(236, 254, 255, 0.8), rgba(224, 242, 254, 0.8), rgba(219, 234, 254, 0.8))',
            'linear-gradient(to bottom right, rgba(239, 246, 255, 0.8), rgba(224, 231, 255, 0.8), rgba(237, 233, 254, 0.8))'
          ]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
      />
      
      {/* Анимированная сетка */}
      <div className="absolute inset-0 overflow-hidden opacity-10">
        <motion.div 
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px), 
                             linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
          animate={{
            x: [0, -40],
            y: [0, -40]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>
      
      {/* Декоративные плавающие элементы */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Верхний градиентный круг */}
        <motion.div 
          className="absolute top-0 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-200/60 to-indigo-300/60 blur-[60px]"
          animate={{ 
            y: [0, 15, -15, 0],
            rotate: [0, 5, 0, -5, 0],
            scale: [1, 1.05, 0.95, 1]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        {/* Нижний градиентный круг */}
        <motion.div 
          className="absolute -bottom-20 -left-20 w-[450px] h-[450px] rounded-full bg-gradient-to-br from-red-200/50 to-pink-300/50 blur-[50px]"
          animate={{ 
            y: [0, -15, 15, 0],
            rotate: [0, -5, 0, 5, 0],
            scale: [1, 0.95, 1.05, 1]
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        {/* Маленькие плавающие круги */}
        <motion.div 
          className="absolute top-1/3 left-1/4 w-[200px] h-[200px] rounded-full bg-gradient-to-br from-green-200/50 to-teal-300/50 blur-[40px]"
          animate={{ 
            y: [0, 30, 0],
            x: [0, 15, 0],
            rotate: [0, 10, 0],
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: 15, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        <motion.div 
          className="absolute bottom-1/3 right-1/4 w-[250px] h-[250px] rounded-full bg-gradient-to-br from-purple-200/50 to-indigo-300/50 blur-[45px]"
          animate={{ 
            y: [0, -20, 0],
            x: [0, -10, 0],
            rotate: [0, -8, 0],
            scale: [1, 0.9, 1]
          }}
          transition={{ 
            duration: 18, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        <motion.div 
          className="absolute top-2/3 right-1/3 w-[180px] h-[180px] rounded-full bg-gradient-to-br from-blue-200/50 to-cyan-300/50 blur-[35px]"
          animate={{ 
            y: [0, -25, 0],
            x: [0, 10, 0],
            rotate: [0, 15, 0],
            scale: [1, 1.15, 1]
          }}
          transition={{ 
            duration: 12, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        <motion.div 
          className="absolute top-1/4 right-1/3 w-[220px] h-[220px] rounded-full bg-gradient-to-br from-amber-200/50 to-orange-300/50 blur-[40px]"
          animate={{ 
            y: [0, 20, 0],
            x: [0, -15, 0],
            rotate: [0, -12, 0],
            scale: [1, 0.85, 1]
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        {/* Дополнительные яркие шарики */}
        <motion.div 
          className="absolute top-1/2 left-10 w-[150px] h-[150px] rounded-full bg-gradient-to-r from-violet-300/60 to-fuchsia-300/60 blur-[30px]"
          animate={{ 
            y: [0, -40, 0],
            x: [0, 20, 0],
            rotate: [0, 20, 0],
            scale: [1, 1.2, 1]
          }}
          transition={{ 
            duration: 17, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
        
        <motion.div 
          className="absolute bottom-1/4 right-20 w-[180px] h-[180px] rounded-full bg-gradient-to-r from-rose-200/60 to-pink-300/60 blur-[35px]"
          animate={{ 
            y: [0, 30, 0],
            x: [0, -25, 0],
            rotate: [0, -15, 0],
            scale: [1, 0.9, 1]
          }}
          transition={{ 
            duration: 22, 
            repeat: Infinity,
            ease: "easeInOut" 
          }}
        />
      </div>

      {/* Контент страницы */}
      <div className="relative z-10 container mx-auto max-w-4xl py-12 px-4">
        {/* Компонент для отслеживания и отображения статусов заявок */}
        <ApplicationStatusTracker />
        
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={slideInFromTop} 
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-3">
            {t('doctorApplicationTitle') || 'Подача заявки на роль врача'}
          </h1>
          <p className="text-gray-600 text-md max-w-xl mx-auto">
            {t('doctorApplicationDescription') || 'Заполните форму и предоставьте необходимые документы'}
          </p>
        </motion.div>
        
        <motion.div 
          initial="hidden"
          animate="visible"
          variants={slideInFromBottom}
        >
          <Card className="shadow-lg border-none overflow-hidden mb-6 bg-white/90 backdrop-blur-sm">
            {/* Анимированная линия вверху */}
            <div className="h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 relative overflow-hidden">
              <motion.div 
                className="absolute inset-0 bg-white opacity-30"
                animate={{ 
                  x: ["0%", "100%"],
                  opacity: [0, 0.3, 0]
                }}
                transition={{ 
                  repeat: Infinity, 
                  duration: 3,
                  ease: "easeInOut"
                }}
              />
            </div>
            
            <CardHeader className="flex justify-between items-center gap-3 p-6 bg-gradient-to-b from-indigo-50/50 to-transparent">
              <div>
                <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                  {t('doctorQuestionnaire')}
                </h2>
                <p className="text-gray-600 text-sm">
                  {t('applicationReviewTime')}
                </p>
              </div>
            </CardHeader>
            
            <Divider />
            
            <CardBody className="p-6">
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-200 mb-6 shadow-sm"
              >
                <h3 className="text-lg font-bold text-blue-700 mb-2">{t('importantInformation')}</h3>
                <p className="text-blue-600 mb-2 text-sm">
                  {t('requiredDocuments')}
                </p>
                <ul className="list-disc list-inside text-blue-600 ml-2 space-y-1 text-sm">
                  <li>{t('photoForProfile')}</li>
                  <li>{t('diplomaScan')}</li>
                  <li>{t('licenseScan')}</li>
                </ul>
                <p className="text-blue-600 mt-2 text-sm">
                  {t('afterSubmissionInfo')}
                </p>
              </motion.div>
              
              <DoctorApplicationForm onSuccess={handleSuccess} />
            </CardBody>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default DoctorApplicationPage; 