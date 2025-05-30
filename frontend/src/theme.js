import { nextui } from '@nextui-org/react';

// Настройка темы NextUI для медицинского приложения
const nextUITheme = {
  type: 'light',
  themes: {
    light: {
      colors: {
        primary: '#3b82f6',
        secondary: '#64748b',
        success: '#22c55e',
        warning: '#f59e0b',
        danger: '#ef4444',
        info: '#06b6d4',
      },
    },
  },
};

export const nextUIPlugin = nextui(nextUITheme); 