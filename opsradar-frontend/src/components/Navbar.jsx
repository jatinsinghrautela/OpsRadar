import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  IconButton,
  Box,
  Skeleton
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import { logout } from '../utils/auth';
import { getCurrentUser } from '../services/api';
import ThemeToggle from './ThemeToggle';
import NotificationBell from './NotificationBell';

const Navbar = ({ onMenuClick, showMenu = false }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [userInitials, setUserInitials] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const open = Boolean(anchorEl);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await getCurrentUser();
        if (cancelled) return;
        const username = user.username || '';
        if (username) {
          setUserInitials(
            `${username.charAt(0)}${username.charAt(username.length - 1)}`.toUpperCase()
          );
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
        top: 0,
        zIndex: (t) => t.zIndex.appBar
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
        {showMenu && (
          <IconButton edge="start" onClick={onMenuClick} aria-label="Open navigation" sx={{ mr: 0.5 }}>
            <MenuIcon />
          </IconButton>
        )}
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            color: 'primary.main',
            display: { xs: 'block', md: 'none' },
            flexGrow: 1,
            letterSpacing: '-0.02em'
          }}
        >
          OpsRadar
        </Typography>
        <Box sx={{ flexGrow: { xs: 0, md: 1 } }} />
        <ThemeToggle />
        {!loading && <NotificationBell />}
        {loading ? (
          <Skeleton variant="circular" width={36} height={36} />
        ) : (
          <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} aria-label="Account menu">
            <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36, fontSize: 14 }}>
              {userInitials || '?'}
            </Avatar>
          </IconButton>
        )}
        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={() => setAnchorEl(null)}
          PaperProps={{ sx: { mt: 1.5, minWidth: 160 } }}
        >
          <MenuItem onClick={handleLogout}>
            <Typography color="error">Logout</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
