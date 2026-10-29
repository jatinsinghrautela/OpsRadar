import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  FormControlLabel,
  Switch,
  Button,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { useFeedback } from '../context/FeedbackContext';
import { getNotificationPrefs, updateNotificationPrefs } from '../services/api';
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
  unlockNotificationAudio,
  playNotificationChime
} from '../utils/notificationSound';

const defaults = {
  critical: true,
  major: true,
  minor: false,
  trivial: false
};

const Settings = () => {
  const { notifySuccess, notifyError } = useFeedback();
  const [prefs, setPrefs] = useState(defaults);
  const [soundEnabled, setSoundEnabled] = useState(() => isNotificationSoundEnabled());
  const [dirty, setDirty] = useState(false);
  const [soundDirty, setSoundDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getNotificationPrefs();
        if (!cancelled) setPrefs({ ...defaults, ...data });
      } catch {
        if (!cancelled) notifyError('Failed to load notification preferences');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notifyError]);

  const handleChange = (event) => {
    setPrefs((prev) => ({ ...prev, [event.target.name]: event.target.checked }));
    setDirty(true);
  };

  const handleSoundChange = (event) => {
    const on = event.target.checked;
    setSoundEnabled(on);
    setSoundDirty(true);
    unlockNotificationAudio();
    if (on) playNotificationChime();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (dirty) {
        const saved = await updateNotificationPrefs(prefs);
        setPrefs({ ...defaults, ...saved });
        setDirty(false);
      }
      if (soundDirty) {
        setNotificationSoundEnabled(soundEnabled);
        setSoundDirty(false);
      }
      notifySuccess('Notification preferences saved');
    } catch {
      notifyError('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Settings
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 520 }}>
        Choose which alert severities create in-app notifications for your account. Delivery is free
        (bell inbox only — no email/SMS/push).
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        Prefs apply to new alerts after you save. You only receive notifications for alerts you can view.
      </Alert>

      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2, mb: 2 }}>
        <Typography variant="h2" gutterBottom>
          In-app notify by severity
        </Typography>
        {loading ? (
          <CircularProgress size={28} sx={{ my: 2 }} />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
            {[
              { name: 'critical', label: 'Critical', color: 'error' },
              { name: 'major', label: 'Major', color: 'warning' },
              { name: 'minor', label: 'Minor', color: 'info' },
              { name: 'trivial', label: 'Trivial', color: 'success' }
            ].map((row) => (
              <FormControlLabel
                key={row.name}
                control={
                  <Switch
                    checked={Boolean(prefs[row.name])}
                    onChange={handleChange}
                    name={row.name}
                    color={row.color}
                  />
                }
                label={row.label}
              />
            ))}
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
        <Typography variant="h2" gutterBottom>
          Sound
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Short chime when a new unread notification arrives (this browser only).
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={soundEnabled}
              onChange={handleSoundChange}
              name="sound"
              color="primary"
            />
          }
          label="Play sound for new notifications"
        />
        <Divider sx={{ my: 1.5 }} />
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            unlockNotificationAudio();
            playNotificationChime();
          }}
        >
          Preview sound
        </Button>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={(!dirty && !soundDirty) || saving || loading}
        >
          {saving ? 'Saving…' : 'Save preferences'}
        </Button>
      </Box>
    </Box>
  );
};

export default Settings;
