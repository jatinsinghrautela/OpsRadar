// src/components/ThemeToggle.jsx
import React, { useContext } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import { ThemeContext } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { darkMode, setDarkMode } = useContext(ThemeContext);

  return (
    <Tooltip title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>
      <IconButton onClick={() => setDarkMode(!darkMode)} color="inherit">
        {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </Tooltip>
  );
};

export default ThemeToggle;