import React from 'react';
import { useTranslation } from '../components/LanguageSelector';
import { motion } from 'framer-motion';
import { 
  FaHeart, 
  FaGlobe, 
  FaUserMd, 
  FaShieldAlt, 
  FaHandsHelping,
  FaInfinity,
  FaUsers,
  FaLightbulb
} from 'react-icons/fa';
import { Card, CardBody } from '@nextui-org/react';

const AboutPage = () => {
  const { t } = useTranslation();

  const fadeInVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
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

      {/* Hero Section */}
      <motion.div 
        className="relative py-20 px-4 sm:px-6 lg:px-8 text-center z-10"
        initial="hidden"
        animate="visible"
        variants={fadeInVariants}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-4xl mx-auto">
          <motion.h1 
            className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-500 to-blue-700 bg-clip-text text-transparent mb-8"
            variants={fadeInVariants}
          >
            {t('aboutTitle')}
          </motion.h1>
          
          <motion.p 
            className="text-xl md:text-2xl text-gray-700 leading-relaxed mb-12"
            variants={fadeInVariants}
            transition={{ delay: 0.2 }}
          >
            {t('aboutMission')}
          </motion.p>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 relative z-10">
        
        {/* Vision Section */}
        <motion.section 
          className="mb-16"
          initial="hidden"
          animate="visible"
          variants={staggerVariants}
        >
          <motion.div variants={fadeInVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              {t('aboutVisionTitle')}
            </h2>
          </motion.div>
          
          <motion.div variants={fadeInVariants} className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardBody className="p-8">
                <FaGlobe className="text-4xl text-blue-500 mb-4" />
                <p className="text-lg text-gray-700 leading-relaxed">
                  {t('aboutVision1')}
                </p>
              </CardBody>
            </Card>
            
            <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
              <CardBody className="p-8">
                <FaHeart className="text-4xl text-red-500 mb-4" />
                <p className="text-lg text-gray-700 leading-relaxed">
                  {t('aboutVision2')}
                </p>
              </CardBody>
            </Card>
          </motion.div>

          <motion.div variants={fadeInVariants} className="text-center">
            <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm">
              <CardBody className="p-8">
                <p className="text-xl text-gray-800 leading-relaxed mb-6">
                  {t('aboutMovement')}
                </p>
                <div className="flex justify-center items-center space-x-8 text-gray-600">
                  <motion.div 
                    className="text-center"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <FaInfinity className="text-3xl text-blue-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">{t('aboutUnlimited')}</p>
                  </motion.div>
                  <motion.div 
                    className="text-center"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <FaUsers className="text-3xl text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">{t('aboutCommunity')}</p>
                  </motion.div>
                  <motion.div 
                    className="text-center"
                    whileHover={{ scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <FaLightbulb className="text-3xl text-yellow-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">{t('aboutInnovation')}</p>
                  </motion.div>
                </div>
              </CardBody>
            </Card>
          </motion.div>
        </motion.section>

        {/* Commitment Section */}
        <motion.section 
          className="mb-16"
          initial="hidden"
          animate="visible"
          variants={staggerVariants}
        >
          <motion.div variants={fadeInVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              {t('aboutCommitmentTitle')}
            </h2>
            <p className="text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed">
              {t('aboutCommitment')}
            </p>
          </motion.div>
          
          <motion.div variants={fadeInVariants} className="text-center mb-12">
            <Card className="border-0 shadow-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm">
              <CardBody className="p-12">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
                  {t('aboutYourHealth')}
                </h3>
                <p className="text-xl text-gray-700 mb-4">
                  {t('aboutWithYou')}
                </p>
              </CardBody>
            </Card>
          </motion.div>
        </motion.section>

        {/* Values Section */}
        <motion.section 
          className="mb-16"
          initial="hidden"
          animate="visible"
          variants={staggerVariants}
        >
          <motion.div variants={fadeInVariants} className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
              {t('aboutValuesTitle')}
            </h2>
          </motion.div>
          
          <motion.div variants={staggerVariants} className="grid md:grid-cols-2 gap-8">
            <motion.div variants={fadeInVariants}>
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-full">
                <CardBody className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 mt-1">
                      1
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        {t('aboutValue1Title')}
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {t('aboutValue1')}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
            
            <motion.div variants={fadeInVariants}>
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-full">
                <CardBody className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 mt-1">
                      2
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        {t('aboutValue2Title')}
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {t('aboutValue2')}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
            
            <motion.div variants={fadeInVariants}>
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-full">
                <CardBody className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 mt-1">
                      3
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        {t('aboutValue3Title')}
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {t('aboutValue3')}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
            
            <motion.div variants={fadeInVariants}>
              <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm h-full">
                <CardBody className="p-8">
                  <div className="flex items-start space-x-4">
                    <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 mt-1">
                      4
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-4">
                        {t('aboutValue4Title')}
                      </h3>
                      <p className="text-gray-700 leading-relaxed">
                        {t('aboutValue4')}
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* Final Message */}
        <motion.section 
          className="text-center"
          initial="hidden"
          animate="visible"
          variants={fadeInVariants}
          transition={{ delay: 0.5 }}
        >
          <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <CardBody className="p-12">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">
                {t('aboutFinalTitle')}
              </h2>
              <p className="text-lg mb-4">
                {t('aboutFinalMessage')}
              </p>
              <p className="text-xl font-semibold">
                {t('aboutWithHeart')}
              </p>
              
              <div className="flex justify-center items-center space-x-6 mt-8">
                <FaHeart className="text-3xl animate-pulse" />
                <FaGlobe className="text-3xl" />
                <FaHandsHelping className="text-3xl" />
              </div>
            </CardBody>
          </Card>
        </motion.section>
      </div>
    </div>
  );
};

export default AboutPage; 