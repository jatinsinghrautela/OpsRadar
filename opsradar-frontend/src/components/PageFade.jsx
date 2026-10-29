import React from 'react';
import { Box } from '@mui/material';
import { useLocation } from 'react-router-dom';

/** Subtle page enter — opacity + slight rise */
export default function PageFade({ children }) {
  const location = useLocation();
  return (
    <Box
      key={location.pathname}
      sx={{
        animation: 'pageEnter 280ms ease-out',
        '@keyframes pageEnter': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'translateY(0)' }
        }
      }}
    >
      {children}
    </Box>
  );
}
