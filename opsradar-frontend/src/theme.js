import { createTheme } from '@mui/material/styles';
import { keyframes } from '@emotion/react';

/** Severity attention pulse — used for critical chips */
export const severityPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(185, 28, 28, 0.35); }
  50% { box-shadow: 0 0 0 6px rgba(185, 28, 28, 0); }
`;

const lightPalette = {
  primary: {
    main: '#0f766e',
    light: '#ccfbf1',
    dark: '#115e59',
    contrastText: '#f8fafc'
  },
  secondary: {
    main: '#334155',
    light: '#e2e8f0'
  },
  critical: {
    main: '#b91c1c',
    light: 'rgba(185, 28, 28, 0.12)'
  },
  high: {
    main: '#c2410c',
    light: 'rgba(194, 65, 12, 0.12)'
  },
  medium: {
    main: '#0369a1',
    light: 'rgba(3, 105, 161, 0.12)'
  },
  low: {
    main: '#15803d',
    light: 'rgba(21, 128, 61, 0.12)'
  },
  background: {
    default: '#f1f5f9',
    paper: '#ffffff'
  },
  text: {
    primary: '#0f172a',
    secondary: '#64748b'
  },
  divider: '#e2e8f0'
};

const darkPalette = {
  primary: {
    main: '#2dd4bf',
    light: '#134e4a',
    dark: '#5eead4',
    contrastText: '#042f2e'
  },
  secondary: {
    main: '#94a3b8',
    light: '#1e293b'
  },
  critical: {
    main: '#f87171',
    light: 'rgba(248, 113, 113, 0.18)'
  },
  high: {
    main: '#fb923c',
    light: 'rgba(251, 146, 60, 0.18)'
  },
  medium: {
    main: '#38bdf8',
    light: 'rgba(56, 189, 248, 0.18)'
  },
  low: {
    main: '#4ade80',
    light: 'rgba(74, 222, 128, 0.18)'
  },
  background: {
    default: '#0b1220',
    paper: '#111827'
  },
  text: {
    primary: '#e2e8f0',
    secondary: '#94a3b8'
  },
  divider: '#1f2937'
};

export const opsradarTheme = (mode = 'light') =>
  createTheme({
    palette: {
      mode,
      ...(mode === 'light' ? lightPalette : darkPalette)
    },
    typography: {
      fontFamily: '"DM Sans", "Segoe UI", sans-serif',
      h1: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontSize: '1.15rem', fontWeight: 600 },
      h4: { fontSize: '1.35rem', fontWeight: 600, letterSpacing: '-0.01em' },
      body1: { fontSize: '0.9375rem' },
      body2: { fontSize: '0.8125rem' },
      button: { textTransform: 'none', fontWeight: 600 }
    },
    shape: { borderRadius: 10 },
    transitions: {
      duration: {
        shortest: 120,
        shorter: 180,
        short: 220,
        standard: 280
      }
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            transition: 'background-color 0.25s ease, color 0.25s ease'
          }
        }
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8 }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            boxShadow:
              mode === 'light'
                ? '0 1px 2px rgba(15, 23, 42, 0.06)'
                : '0 1px 2px rgba(0, 0, 0, 0.35)'
          }
        }
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow:
              mode === 'light'
                ? '0 1px 2px rgba(15, 23, 42, 0.06)'
                : '0 1px 2px rgba(0, 0, 0, 0.35)',
            transition: 'border-color 0.2s ease, transform 0.2s ease',
            border: '1px solid',
            borderColor: mode === 'light' ? '#e2e8f0' : '#1f2937',
            '&:hover': {
              transform: 'none'
            }
          }
        }
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
            textTransform: 'capitalize'
          }
        }
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: '1px solid',
            borderColor: mode === 'light' ? '#e2e8f0' : '#1f2937',
            boxShadow: 'none'
          }
        }
      },
      MuiTableCell: {
        styleOverrides: {
          head: {
            backgroundColor: mode === 'light' ? '#f8fafc' : '#1e293b',
            color: mode === 'light' ? '#64748b' : '#94a3b8',
            fontWeight: 600
          }
        }
      }
    }
  });
