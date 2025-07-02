// src/theme/index.js
import { createTheme } from '@mui/material/styles';

// Определяем нашу тему MUI
const theme = createTheme({
  palette: {
    primary: {
      main: '#0056b3', // Наш "медицинский синий" как основной цвет
    },
    secondary: {
      main: '#6c757d', // Наш серый как вторичный
    },
    success: {
       main: '#28a745', // Зеленый для успеха
    },
     error: {
        main: '#dc3545', // Красный для ошибок
     },
     warning: {
        main: '#ffc107', // Желтый для предупреждений
     },
  },
  typography: {
    fontFamily: 'Arial, sans-serif', // Используем наш базовый шрифт
    h1: {
       fontSize: '2.5rem', // Размер заголовка h1
       marginBottom: '1.5rem', // Отступ под заголовком
       color: '#0056b3', // Цвет заголовка
    },
     h2: {
         fontSize: '2rem',
         marginBottom: '1.2rem',
         color: '#0056b3',
     }
    // TODO: Настроить другие стили типографики
  },
  spacing: 8, // Базовая единица отступа (px)
  shape: {
    borderRadius: 4, // Скругление углов
  },
  components: {
    // TODO: Настроить стили для конкретных компонентов MUI, если нужно
    MuiButton: {
       styleOverrides: {
          root: {
             textTransform: 'none', // Не переводить текст в верхний регистр
          },
       },
    },
     MuiTextField: { // Стили для поля ввода MUI
        defaultProps: {
           variant: 'outlined', // По умолчанию используем стиль с рамкой
           fullWidth: true, // По умолчанию на всю ширину
        },
         styleOverrides: {
             root: {
                 marginBottom: '1.5rem', // Отступ между полями
             }
         }
     }
  },
  // TODO: Добавить другие настройки темы
});

export default theme;