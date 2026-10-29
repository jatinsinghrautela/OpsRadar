import React, { useEffect, useState } from 'react';
import { setupTotp, enableTotp } from '../services/api';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

const TotpSetup = () => {
  const navigate = useNavigate();
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    (async () => {
      try {
        const data = await setupTotp();
        setQr(data.qr_data_url);
        setSecret(data.secret);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to start authenticator setup');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleEnable = async () => {
    setError('');
    try {
      await enableTotp(code);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code');
    }
  };

  const handleSkip = () => {
    navigate('/');
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 440 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Set up authenticator
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Scan the QR code with Google Authenticator, Aegis, or another TOTP app. No SMS or email
          required.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {loading ? (
          <Typography>Preparing…</Typography>
        ) : (
          <>
            {qr && (
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Box component="img" src={qr} alt="TOTP QR" sx={{ width: 200, height: 200 }} />
              </Box>
            )}
            <Typography variant="caption" display="block" sx={{ mb: 2, wordBreak: 'break-all' }}>
              Manual key: {secret}
            </Typography>
            <TextField
              fullWidth
              label="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
            />
            <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={handleEnable}>
              Enable authenticator
            </Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={handleSkip}>
              Skip for now
            </Button>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default TotpSetup;
