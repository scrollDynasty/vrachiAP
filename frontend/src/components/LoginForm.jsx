import React, { useState, useEffect } from 'react';
import { Button, Spinner, Checkbox, Card, CardBody, Input, Divider } from '@nextui-org/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from './LanguageSelector';
import MedicalLoader from './MedicalLoader';

function LoginForm({ onSubmit, isLoading, error }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState(null);
  const [activeInput, setActiveInput] = useState(null);

  // Анимационные переменные
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        duration: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  // Декоративные элементы - убрали эффекты blur
  const floatingElements = [
    { size: '60px', delay: 0, duration: 8, x: [-10, 10], y: [-5, 5], color: 'from-blue-400/30 to-indigo-400/30' },
    { size: '100px', delay: 1, duration: 10, x: [5, -5], y: [10, -10], color: 'from-purple-400/20 to-pink-400/20' },
    { size: '80px', delay: 2, duration: 12, x: [-8, 8], y: [8, -8], color: 'from-indigo-300/20 to-sky-300/20' },
    { size: '40px', delay: 3, duration: 9, x: [15, -15], y: [-12, 12], color: 'from-cyan-400/20 to-blue-400/20' },
  ];

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Сбрасываем ошибки перед новой отправкой
    setFormError(null);
    
    // Проверка заполнения полей
    if (!email) {
      setFormError(t('emailRequired'));
      return;
    }
    if (!password) {
      setFormError(t('passwordRequired'));
      return;
    }
    
    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
              setFormError(t('invalidEmail'));
      return;
    }
    
    try {
      // Очищаем любой предыдущий error state перед новой попыткой
      
      // Вызываем функцию onSubmit, переданную из родительского компонента
      // Обычно это AuthPage.handleLogin, которая вызывает useAuthStore.login
      await onSubmit(email.trim(), password, rememberMe);
      
      // Если успешно (не выброшено исключение), можно ничего не делать,
      // так как перенаправление обычно происходит в родительском компоненте
      
    } catch (err) {
      // Если ошибка возникла в этом компоненте и не была обработана выше,
      // устанавливаем ее в локальное состояние
      setFormError(err.message || t('loginError'));
    }
  };

  // Если форма уже отправлена и есть ошибка от родительского компонента, показываем ее
  useEffect(() => {
    if (error) {
      setFormError(error);
    }
  }, [error]);

  // Показать ошибку валидации формы
  const displayError = formError || error;

  // Функция для анимации при фокусе на поле ввода
  const handleFocus = (inputName) => {
    setActiveInput(inputName);
  };

  // Функция для анимации при потере фокуса
  const handleBlur = () => {
    setActiveInput(null);
  };

  return (
    <div className="w-full max-w-md mx-auto relative login-form">
      {/* Плавающие декоративные элементы - убрали эффект размытия */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        {floatingElements.map((el, index) => (
          <motion.div
            key={index}
            className={`absolute rounded-full bg-gradient-to-br ${el.color} opacity-60`}
            style={{ 
              width: el.size, 
              height: el.size,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              x: el.x,
              y: el.y,
              scale: [1, 1.05, 0.95, 1],
            }}
            transition={{
              repeat: Infinity,
              repeatType: "reverse",
              duration: el.duration,
              delay: el.delay,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ rotateX: -10, scale: 0.95, opacity: 0 }}
        animate={{ rotateX: 0, scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, damping: 20, duration: 0.8 }}
        style={{ perspective: 1000 }}
        className="relative z-10"
      >
        <Card className="bg-white/95 border border-white/20 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
          
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 to-purple-50/20 pointer-events-none"></div>
          
          <motion.div 
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 opacity-30"
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 180, 270, 360],
              opacity: [0.3, 0.5, 0.3]
            }}
            transition={{ 
              duration: 15,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          <CardBody className="px-8 py-10 z-10 relative">
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl font-bold text-center mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              {t('welcome')}
            </motion.h2>

            <AnimatePresence>
              {displayError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="bg-red-50 text-red-700 p-4 rounded-xl mb-6 border border-red-200"
                >
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p>{displayError}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.form 
              onSubmit={handleSubmit} 
              className="space-y-6"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div 
                variants={itemVariants}
                className="relative"
                animate={activeInput === 'email' ? {
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 400, damping: 25 }
                } : {}}
              >
                <Input
                  type="email"
                  label="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => handleFocus('email')}
                  onBlur={handleBlur}
                  placeholder={t('emailPlaceholder')}
                  variant="bordered"
                  radius="lg"
                  autoComplete="email"
                  fullWidth
                  isRequired
                  classNames={{
                    inputWrapper: "bg-white/90 border-2 hover:border-primary focus-within:border-primary transition-all shadow-sm hover:shadow-md",
                    input: "text-gray-800 placeholder:text-gray-400",
                    label: "text-gray-700 font-medium"
                  }}
                  startContent={
                    <motion.div
                      animate={activeInput === 'email' ? { 
                        rotate: [0, 5, 0, -5, 0],
                        scale: 1.2,
                        color: '#3b82f6'
                      } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </motion.div>
                  }
                />
                <motion.div 
                  className="absolute -z-10 inset-0 bg-gradient-to-r from-blue-200/30 to-indigo-200/30 rounded-xl"
                  animate={activeInput === 'email' ? { 
                    opacity: 1,
                    scale: 1.05
                  } : { 
                    opacity: 0,
                    scale: 1 
                  }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>

              <motion.div 
                variants={itemVariants}
                className="relative"
                animate={activeInput === 'password' ? {
                  scale: 1.02,
                  transition: { type: "spring", stiffness: 400, damping: 25 }
                } : {}}
              >
                <Input
                  type="password"
                  label={t('password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => handleFocus('password')}
                  onBlur={handleBlur}
                  placeholder={t('passwordPlaceholder')}
                  variant="bordered"
                  radius="lg"
                  autoComplete="current-password"
                  fullWidth
                  isRequired
                  classNames={{
                    inputWrapper: "bg-white/90 border-2 hover:border-primary focus-within:border-primary transition-all shadow-sm hover:shadow-md",
                    input: "text-gray-800 placeholder:text-gray-400",
                    label: "text-gray-700 font-medium"
                  }}
                  startContent={
                    <motion.div
                      animate={activeInput === 'password' ? { 
                        rotate: [0, 5, 0, -5, 0],
                        scale: 1.2,
                        color: '#3b82f6'
                      } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </motion.div>
                  }
                />
                <motion.div 
                  className="absolute -z-10 inset-0 bg-gradient-to-r from-blue-200/30 to-indigo-200/30 rounded-xl"
                  animate={activeInput === 'password' ? { 
                    opacity: 1,
                    scale: 1.05
                  } : { 
                    opacity: 0,
                    scale: 1 
                  }}
                  transition={{ duration: 0.3 }}
                />
              </motion.div>

              <motion.div variants={itemVariants} className="flex justify-between items-center">
                <Checkbox
                  isSelected={rememberMe}
                  onValueChange={setRememberMe}
                  size="sm"
                  color="primary"
                  classNames={{
                    label: "text-gray-700",
                    wrapper: "before:border-2 before:border-gray-300 group-data-[selected=true]:before:border-primary"
                  }}
                >
                  <span className="text-gray-700">{t('rememberMe')}</span>
                </Checkbox>
                
                <motion.a 
                  href="#" 
                  className="text-primary hover:text-primary-dark text-sm font-medium transition-colors relative overflow-hidden group"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>{t('forgotPassword')}</span>
                  <motion.span 
                    className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 origin-left"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.a>
              </motion.div>

              <motion.div variants={itemVariants}>
                <motion.div 
                  className="relative overflow-hidden group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    type="submit"
                    color="primary"
                    className="w-full font-semibold text-white py-7 text-base bg-gradient-to-r from-primary to-indigo-600 shadow-lg hover:shadow-xl z-10 relative"
                    isLoading={isLoading}
                    radius="lg"
                    disableRipple
                    startContent={!isLoading && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                      </svg>
                    )}
                  >
                    {isLoading ? <div className="flex items-center justify-center"><MedicalLoader size="small" text="" /></div> : t('login')}
                  </Button>
                  
                  <motion.div 
                    className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-indigo-700/80 z-0"
                    initial={{ y: '100%' }}
                    whileHover={{ y: 0 }}
                    transition={{ duration: 0.4 }}
                  />
                </motion.div>
              </motion.div>
              
              <motion.div 
                variants={itemVariants} 
                className="text-center mt-6"
              >
                <p className="text-gray-600">
                  {t('noAccount')}{' '}
                  <motion.a 
                    href="/register" 
                    className="text-primary hover:text-primary-dark font-medium transition-colors relative inline-block"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span className="relative z-10">{t('register')}</span>
                    <motion.span 
                      className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 origin-left"
                      initial={{ scaleX: 0 }}
                      whileHover={{ scaleX: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.a>
                </p>
              </motion.div>
            </motion.form>
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}

export default LoginForm;
