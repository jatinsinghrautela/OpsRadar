import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  useMediaQuery,
  useTheme,
  Popover
} from '@mui/material';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead
} from '../services/api';
import SeverityChip from './SeverityChip';
import EmptyState from './EmptyState';
import {
  isNotificationSoundEnabled,
  playNotificationChime,
  unlockNotificationAudio
} from '../utils/notificationSound';

const POLL_MS = 15000;

export default function NotificationBell() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const prevUnreadRef = useRef(null);

  const refreshCount = useCallback(async () => {
    try {
      const data = await getUnreadNotificationCount();
      const next = Number(data.count) || 0;
      const prev = prevUnreadRef.current;
      if (prev !== null && next > prev && isNotificationSoundEnabled()) {
        playNotificationChime();
      }
      prevUnreadRef.current = next;
      setUnread(next);
    } catch {
      /* ignore poll errors */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        getNotifications({ limit: 40, unread: 'true' }),
        getUnreadNotificationCount()
      ]);
      const rows = Array.isArray(list) ? list : [];
      setItems(rows);
      const next = Number(count.count) || 0;
      prevUnreadRef.current = next;
      setUnread(next);
    } catch (err) {
      console.error('Failed to load notifications', err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const id = setInterval(refreshCount, POLL_MS);
    return () => clearInterval(id);
  }, [refreshCount]);

  const closePanel = useCallback(() => {
    setAnchorEl(null);
    setMobileOpen(false);
  }, []);

  const openPanel = (event) => {
    // User gesture — unlock audio so later chimes can play
    unlockNotificationAudio();
    if (isMobile) {
      setMobileOpen(true);
    } else {
      setAnchorEl(event.currentTarget);
    }
    loadList();
  };

  const openMessage = (item, event) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    // Close popover/drawer first so Dialog is not blocked by Popover focus trap
    closePanel();
    const snapshot = { ...item };
    window.setTimeout(() => {
      setSelected(snapshot);
    }, 50);

    if (!item.is_read && item.id != null) {
      markNotificationRead(item.id)
        .then(() => {
          setItems((prev) => prev.filter((n) => n.id !== item.id));
          setUnread((c) => {
            const next = Math.max(0, c - 1);
            prevUnreadRef.current = next;
            return next;
          });
        })
        .catch((err) => console.error('mark read failed', err));
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems([]);
      setUnread(0);
      prevUnreadRef.current = 0;
    } catch (err) {
      console.error('mark all read failed', err);
    }
  };

  const panel = (
    <Box
      sx={{
        width: { xs: '100%', sm: 360 },
        maxHeight: { xs: '100%', sm: 480 },
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography fontWeight={700}>Notifications</Typography>
        <Button
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleReadAll();
          }}
          disabled={!items.length}
        >
          Mark all read
        </Button>
      </Box>
      <Divider />
      <Box sx={{ overflow: 'auto', flex: 1 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 2 }}>
            <EmptyState
              title="No unread notifications"
              description="New alerts matching your prefs will show here."
            />
          </Box>
        ) : (
          <List disablePadding>
            {items.map((item) => (
              <ListItemButton
                key={item.id}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => openMessage(item, e)}
                sx={{
                  alignItems: 'flex-start',
                  bgcolor: 'action.hover',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  py: 1.25,
                  cursor: 'pointer'
                }}
              >
                <ListItemText
                  primaryTypographyProps={{ component: 'div' }}
                  secondaryTypographyProps={{ component: 'div' }}
                  primary={
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.5 }}>
                      <SeverityChip severity={item.severity} />
                      <Typography variant="caption" color="text.secondary">
                        {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.primary" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {(item.message || '').length > 120
                        ? `${item.message.slice(0, 120)}…`
                        : item.message || '(no message)'}
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Box>
  );

  return (
    <>
      <IconButton aria-label="Notifications" onClick={openPanel} color="inherit">
        <Badge badgeContent={unread > 99 ? '99+' : unread} color="error" overlap="circular">
          <NotificationsNoneIcon />
        </Badge>
      </IconButton>

      <Popover
        open={!isMobile && Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={closePanel}
        disableScrollLock
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: { sx: { mt: 1, borderRadius: 2, overflow: 'hidden' } }
        }}
      >
        {panel}
      </Popover>

      <Drawer
        anchor="bottom"
        open={isMobile && mobileOpen}
        onClose={closePanel}
        disableScrollLock
        PaperProps={{ sx: { height: '75vh', borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}
      >
        {panel}
      </Drawer>

      <Dialog
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        fullWidth
        maxWidth="sm"
        disableScrollLock
        // Above AppBar / Popover
        sx={{ zIndex: (t) => t.zIndex.modal + 10 }}
      >
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          Alert notification
          {selected && <SeverityChip severity={selected.severity} />}
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
            {selected?.created_at ? new Date(selected.created_at).toLocaleString() : ''}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {selected?.message || ''}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setSelected(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
