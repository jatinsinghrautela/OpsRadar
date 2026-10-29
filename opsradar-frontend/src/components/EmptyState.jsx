import React from 'react';
import { Box, Typography } from '@mui/material';

export default function EmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <Box
      sx={{
        py: 6,
        px: 2,
        textAlign: 'center',
        color: 'text.secondary',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.default'
      }}
    >
      <Typography variant="h2" color="text.primary" gutterBottom>
        {title}
      </Typography>
      {description && (
        <Typography variant="body2" sx={{ mb: action ? 2 : 0, maxWidth: 360, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {action}
    </Box>
  );
}
