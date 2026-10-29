// src/context/ThemeContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { opsradarTheme } from '../theme';

export const ThemeContext = createContext();

export const ThemeProviderWrapper = ({ children }) => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const theme = opsradarTheme(darkMode ? 'dark' : 'light');

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      <ThemeProvider theme={theme}>
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};