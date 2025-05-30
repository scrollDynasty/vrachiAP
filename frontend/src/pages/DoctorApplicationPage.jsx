import React from 'react';
import { useNavigate } from 'react-router-dom';
import DoctorApplicationForm from '../components/DoctorApplicationForm';
import { Card, CardBody, CardHeader, Divider } from '@nextui-org/react';
import { ApplicationStatusTracker } from '../components/Notification';

function DoctorApplicationPage() {
  const navigate = useNavigate();
  
  // Функция обратного вызова при успешной отправке заявки
  const handleSuccess = () => {
    // Можно добавить перенаправление на профиль после успешной отправки
    setTimeout(() => {
      navigate('/profile');
    }, 3000);
  };
  
  return (
    <div className="py-12 px-6 sm:px-8 lg:px-10 bg-gradient-to-br from-blue-50 to-indigo-50 min-h-[calc(100vh-100px)]">
      <div className="max-w-4xl mx-auto">
        {/* Компонент для отслеживания и отображения статусов заявок */}
        <ApplicationStatusTracker />
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 mb-3">
            Подача заявки на роль врача
          </h1>
          <p className="text-gray-600">
            Заполните форму и предоставьте необходимые документы для получения роли врача
          </p>
        </div>
        
        <Card className="shadow-lg border-none overflow-hidden mb-6">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
          
          <CardHeader className="flex justify-between items-center gap-3 p-8 bg-gradient-to-b from-indigo-50 to-transparent">
            <div>
              <h2 className="text-xl font-semibold">Анкета врача</h2>
              <p className="text-sm text-gray-500">
                Ваша заявка будет рассмотрена администрацией
              </p>
            </div>
          </CardHeader>
          
          <Divider />
          
          <CardBody className="p-8">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 mb-8">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">Важная информация</h3>
              <p className="text-blue-600 mb-2">
                Для получения роли врача необходимо предоставить следующие документы:
              </p>
              <ul className="list-disc list-inside text-blue-600 ml-4">
                <li>Фотография (для профиля)</li>
                <li>Скан диплома о медицинском образовании</li>
                <li>Скан лицензии/сертификата на медицинскую деятельность</li>
              </ul>
              <p className="text-blue-600 mt-2">
                После отправки заявки администрация проверит предоставленные документы и примет решение.
              </p>
            </div>
            
            <DoctorApplicationForm onSuccess={handleSuccess} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export default DoctorApplicationPage; 