import React, { useState } from 'react';
import { changePassword } from '../services/api';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ChangePassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const username = sessionStorage.getItem('changeUsername') || '';
  const changeToken = sessionStorage.getItem('changeToken');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!changeToken && !localStorage.getItem('authToken')) {
      setError('Session expired. Sign in with your temporary password again.');
      navigate('/login');
      return;
    }
    try {
      const data = await changePassword(password, changeToken);
      sessionStorage.removeItem('changeToken');
      sessionStorage.removeItem('changeUsername');
      localStorage.setItem('authToken', data.token);
      if (data.must_enroll_totp) {
        navigate('/totp-setup');
      } else {
        navigate('/');
      }
    } catch (err) {
      const detail =
        err.response?.data?.error ||
        err.message ||
        'Failed to change password';
      setError(detail);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          Set a new password
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {username
            ? `Signed in as ${username} with a temporary password. Choose a new password to continue.`
            : 'Choose a new password to continue.'}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            type="password"
            label="New password"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <TextField
            fullWidth
            type="password"
            label="Confirm password"
            margin="normal"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 2 }}>
            Save password
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default ChangePassword;
