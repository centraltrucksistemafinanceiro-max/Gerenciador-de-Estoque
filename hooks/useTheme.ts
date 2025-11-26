import { useState, useEffect, useCallback } from 'react';
import type { Tema } from '../types';

const defaultTheme: Tema = {
  primary: '#38bdf8', // sky-400
  background: '#0f172a', // slate-900
  card: '#1e293b', // slate-800
  text: '#f8fafc', // slate-50
  textSecondary: '#94a3b8', // slate-400
  border: '#334155', // slate-700
};

export const useTheme = () => {
  const [theme, setTheme] = useState<Tema>(() => {
    try {
      const storedTheme = localStorage.getItem('app-theme');
      return storedTheme ? JSON.parse(storedTheme) : defaultTheme;
    } catch (error) {
      console.error('Error reading theme from localStorage', error);
      return defaultTheme;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('app-theme', JSON.stringify(theme));
      const root = document.documentElement;
      root.style.setProperty('--color-primary', theme.primary);
      root.style.setProperty('--color-background', theme.background);
      root.style.setProperty('--color-card', theme.card);
      root.style.setProperty('--color-text', theme.text);
      root.style.setProperty('--color-text-secondary', theme.textSecondary);
      root.style.setProperty('--color-border', theme.border);
    } catch (error) {
      console.error('Error saving theme to localStorage', error);
    }
  }, [theme]);
  
  const resetTheme = useCallback(() => {
    setTheme(defaultTheme);
  }, []);

  return { theme, setTheme, resetTheme };
};