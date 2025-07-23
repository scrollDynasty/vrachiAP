import React, { useState, useEffect } from 'react';
import { 
  Input, 
  Button, 
  Card, 
  CardBody, 
  CardHeader, 
  Select, 
  SelectItem,
  Spinner,
  Divider,
  Radio,
  RadioGroup,
  Avatar
} from '@nextui-org/react';
import api from '../api';
import { getRegions, getDistrictsByRegion } from '../constants/uzbekistanRegions';
import { translateDistrict } from './RegionTranslations';
import { useTranslation } from './LanguageSelector';
import useAuthStore from '../stores/authStore';
import AvatarWithFallback from './AvatarWithFallback';

const GoogleProfileForm = ({ onCompleted }) => {
  const { t, currentLanguage } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  
  // Получаем текущего пользователя из стора
  const user = useAuthStore(state => state.user);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    role: 'patient', // По умолчанию - пациент
    full_name: '',
    contact_phone: '',
    contact_address: '',
    city: '', // регион/город
    district: '' // район внутри региона
  });

  // Загружаем список регионов при монтировании
  useEffect(() => {
    const regions = getRegions();
    setRegions(regions);
    setCities(regions); // Используем регионы как города
  }, []);

  // Обновляем районы при изменении города/региона
  useEffect(() => {
    if (formData.city) {
      const districts = getDistrictsByRegion(formData.city);
      setDistricts(districts);
    } else {
      setDistricts([]);
    }
  }, [formData.city]);

  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Обработчик изменения роли
  const handleRoleChange = (value) => {
    setFormData(prev => ({
      ...prev,
      role: value
    }));
  };

  // Обработчик изменения города/региона
  const handleCityChange = (e) => {
    const newCity = e.target.value;
    setFormData(prev => ({
      ...prev,
      city: newCity,
      district: '' // Сбрасываем район при смене региона
    }));
  };

  // Обработчик изменения района
  const handleDistrictChange = (e) => {
    setFormData(prev => ({
      ...prev,
      district: e.target.value
    }));
  };

  // Отправка формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Получаем токен для авторизации
      const token = localStorage.getItem('auth_token');
      const config = token ? {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      } : undefined;
      
      const response = await api.post('/users/me/google-profile', formData, config);
      
      // Обновляем информацию о пользователе в сторе
      if (user) {
        useAuthStore.setState(state => ({
          ...state,
          user: {
            ...user,
            role: formData.role,
            is_active: true
          },
          needsProfileUpdate: false
        }));
      }
      
      // Получаем обновленные данные пользователя
      try {
        const userResponse = await api.get('/users/me', config);
        if (userResponse.status === 200) {
          useAuthStore.setState(state => ({
            ...state,
            user: userResponse.data,
            needsProfileUpdate: false
          }));
        }
      } catch (userError) {
        // Пропускаем ошибки загрузки пользователя
      }
      
      // Вызываем колбэк завершения
      if (onCompleted) {
        setTimeout(() => {
          onCompleted(response.data);
        }, 500);
      }
    } catch (error) {
      
      setError(error.response?.data?.detail || 'Не удалось сохранить профиль. Пожалуйста, попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <Card className="shadow-xl border-none overflow-hidden transition-all duration-300 bg-white">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3"></div>
        <CardHeader className="flex flex-col items-center justify-center pt-8 pb-4 px-8 bg-gradient-to-b from-indigo-50 to-transparent">
          <AvatarWithFallback 
            src="https://cdn-icons-png.flaticon.com/512/2102/2102647.png" 
            className="w-20 h-20 text-large shadow-lg mb-4"
            color="primary"
            isBordered
            name="G"
          />
          <h2 className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            Завершение регистрации
          </h2>
          <p className="text-default-600 mt-1 text-center max-w-md">
            Пожалуйста, заполните необходимую информацию для завершения создания аккаунта
          </p>
        </CardHeader>
        
        <CardBody className="px-8 py-6">
          {error && (
            <div className="bg-danger-50 text-danger p-5 rounded-xl mb-6 shadow-sm border border-danger-200 animate-pulse">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="bg-blue-50 p-6 rounded-xl shadow-sm transition-all hover:shadow-md">
              <RadioGroup
                label="Кем вы являетесь?"
                value={formData.role}
                onChange={handleRoleChange}
                orientation="horizontal"
                classNames={{
                  label: "text-lg font-semibold mb-3 text-blue-800"
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <Radio 
                    value="patient" 
                    className="border border-blue-100 p-3 rounded-lg transition-all hover:bg-blue-100"
                    classNames={{
                      label: "text-base",
                    }}
                    description="Получить консультацию врача"
                  >
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">Я пациент</span>
                    </div>
                  </Radio>
                  <Radio 
                    value="doctor"
                    className="border border-blue-100 p-3 rounded-lg transition-all hover:bg-blue-100"
                    classNames={{
                      label: "text-base",
                    }}
                    description="Предоставлять консультации"
                  >
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span className="font-medium">Я врач</span>
                    </div>
                  </Radio>
                </div>
              </RadioGroup>
            </div>
            
            <Divider className="my-5" />
            
            <div className="space-y-6">
              <div className="relative">
                <Input
                  label="ФИО"
                  placeholder="Введите ваше полное имя"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  isRequired
                  size="lg"
                  className="w-full"
                  classNames={{
                    label: "text-base font-medium",
                    input: "text-base",
                    inputWrapper: "shadow-sm bg-default-50 hover:bg-default-100 transition-all"
                  }}
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-default-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  }
                />
              </div>
              
              <div className="relative">
                                  <Input
                  label="Номер телефона"
                  placeholder="+998 __ ___ __ __"
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  size="lg"
                  className="w-full"
                  classNames={{
                    label: "text-base font-medium",
                    input: "text-base",
                    inputWrapper: "shadow-sm bg-default-50 hover:bg-default-100 transition-all"
                  }}
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-default-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <Select
                    label={t('city')}
                    placeholder="Выберите город"
                    value={formData.city}
                    onChange={handleCityChange}
                    size="lg"
                    className="w-full"
                    isLoading={isLoadingCities}
                    classNames={{
                      label: "text-base font-medium",
                      value: "text-base",
                      trigger: "shadow-sm bg-default-50 hover:bg-default-100 transition-all"
                    }}
                    startContent={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-default-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    }
                  >
                    {cities.map((cityItem) => (
                      <SelectItem key={cityItem.value || cityItem} value={cityItem.value || cityItem} textValue={cityItem.label || cityItem}>
                        {cityItem.label || cityItem}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
                
                <div className="relative">
                  <Select
                    label={t('district')}
                    placeholder="Выберите район"
                    value={formData.district}
                    onChange={handleDistrictChange}
                    size="lg"
                    className="w-full"
                    isLoading={isLoadingDistricts}
                    classNames={{
                      label: "text-base font-medium",
                      value: "text-base",
                      trigger: "shadow-sm bg-default-50 hover:bg-default-100 transition-all"
                    }}
                    startContent={
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-default-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    }
                  >
                    {districts.map((district) => (
                      <SelectItem key={district} value={district} textValue={district}>
                        {translateDistrict(district, currentLanguage)}
                      </SelectItem>
                    ))}
                  </Select>
                </div>
              </div>
              
              <div className="relative">
                <Input
                  label={t('address')}
                  placeholder="Введите ваш адрес"
                  name="contact_address"
                  value={formData.contact_address}
                  onChange={handleChange}
                  size="lg"
                  className="w-full"
                  classNames={{
                    label: "text-base font-medium",
                    input: "text-base",
                    inputWrapper: "shadow-sm bg-default-50 hover:bg-default-100 transition-all"
                  }}
                  startContent={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-default-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  }
                />
              </div>
            </div>
            
            <div className="pt-4">
              <Button 
                color="primary" 
                type="submit" 
                isLoading={loading}
                disabled={!formData.full_name}
                size="lg"
                className="w-full py-7 text-base font-medium shadow-lg hover:shadow-xl transition-all"
                startContent={!loading && 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              >
                Сохранить и продолжить
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
};

export default GoogleProfileForm; 