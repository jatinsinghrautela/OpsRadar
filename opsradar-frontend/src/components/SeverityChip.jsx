import React from 'react';
import { Chip } from '@mui/material';
import { severityPulse } from '../theme';

const colorMap = {
  Critical: 'error',
  critical: 'error',
  Major: 'warning',
  major: 'warning',
  Minor: 'info',
  minor: 'info',
  Trivial: 'success',
  trivial: 'success'
};

export default function SeverityChip({ severity, size = 'small' }) {
  const label = severity || 'unknown';
  const isCritical = String(label).toLowerCase() === 'critical';

  return (
    <Chip
      label={label}
      color={colorMap[label] || 'default'}
      size={size}
      sx={
        isCritical
          ? {
              animation: `${severityPulse} 1.8s ease-out infinite`,
              fontWeight: 700
            }
          : undefined
      }
    />
  );
}
