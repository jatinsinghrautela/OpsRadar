import React, { useState } from 'react';
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  IconButton,
  Tooltip,
  useTheme,
  Divider
} from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import {
  Dashboard as DashboardIcon,
  Notifications as AlertsIcon,
  Dns as ServersIcon,
  Public as CountriesIcon,
  Description as RequestsIcon,
  VpnKey as AccessIcon,
  Groups as GroupsIcon,
  People as UsersIcon,
  History as AuditIcon,
  Settings as SettingsIcon,
  Apps as AppsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon
} from '@mui/icons-material';

export const DRAWER_WIDTH = 240;
export const DRAWER_WIDTH_COLLAPSED = 72;

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Alerts', icon: <AlertsIcon />, path: '/alerts' },
  { text: 'Servers', icon: <ServersIcon />, path: '/servers' },
  { text: 'Countries', icon: <CountriesIcon />, path: '/countries' },
  { text: 'Reset requests', icon: <RequestsIcon />, path: '/requests' },
  { text: 'Access requests', icon: <AccessIcon />, path: '/access' },
  { text: 'Groups', icon: <GroupsIcon />, path: '/groups' },
  { text: 'Users', icon: <UsersIcon />, path: '/users' },
  { text: 'Audit', icon: <AuditIcon />, path: '/audit' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  { text: 'Applications', icon: <AppsIcon />, path: '/applications' }
];

function NavList({ expanded, onNavigate }) {
  const theme = useTheme();
  const location = useLocation();

  return (
    <List sx={{ px: expanded ? 1.5 : 1, py: 1 }}>
      {navItems.map((item) => {
        const selected = location.pathname === item.path;
        return (
          <Tooltip key={item.text} title={expanded ? '' : item.text} placement="right">
            <ListItemButton
              component={Link}
              to={item.path}
              onClick={onNavigate}
              selected={selected}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                minHeight: 44,
                justifyContent: expanded ? 'flex-start' : 'center',
                px: expanded ? 1.5 : 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.light',
                  color: 'primary.dark',
                  '& .MuiListItemIcon-root': { color: 'primary.main' }
                },
                '&.Mui-selected:hover': {
                  bgcolor: 'primary.light'
                }
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: expanded ? 40 : 0,
                  mr: expanded ? 0 : 0,
                  justifyContent: 'center',
                  color: selected ? 'primary.main' : theme.palette.text.secondary
                }}
              >
                {item.icon}
              </ListItemIcon>
              {expanded && <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: selected ? 600 : 500 }} />}
            </ListItemButton>
          </Tooltip>
        );
      })}
    </List>
  );
}

/**
 * Mobile: temporary drawer. Desktop: permanent, collapsible.
 */
export default function Sidebar({ mobileOpen, onMobileClose, isMdUp }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(true);
  const width = expanded ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED;

  const brand = (
    <Box
      sx={{
        p: expanded || !isMdUp ? 2.5 : 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: expanded || !isMdUp ? 'flex-start' : 'center',
        gap: 1.5
      }}
    >
      <Box
        component="img"
        src="/opsradar-logo.svg"
        alt="OpsRadar"
        sx={{ width: 28, height: 28, objectFit: 'contain' }}
      />
      {(expanded || !isMdUp) && (
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main', letterSpacing: '-0.02em' }}>
          OpsRadar
        </Typography>
      )}
    </Box>
  );

  const desktopPaper = (
    <>
      {brand}
      <Box sx={{ display: 'flex', justifyContent: expanded ? 'flex-end' : 'center', px: 1, pb: 1 }}>
        <Tooltip title={expanded ? 'Collapse' : 'Expand'}>
          <IconButton size="small" onClick={() => setExpanded((v) => !v)} aria-label="Toggle sidebar width">
            {expanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />
      <NavList expanded={expanded} />
    </>
  );

  const mobilePaper = (
    <>
      {brand}
      <Divider />
      <NavList expanded onNavigate={onMobileClose} />
    </>
  );

  if (!isMdUp) {
    return (
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            bgcolor: 'background.paper',
            transition: theme.transitions.create('transform', {
              easing: theme.transitions.easing.easeOut,
              duration: theme.transitions.duration.enteringScreen
            })
          }
        }}
      >
        {mobilePaper}
      </Drawer>
    );
  }

  return (
    <Drawer
      variant="permanent"
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.standard
          })
        }
      }}
      open
    >
      {desktopPaper}
    </Drawer>
  );
}
