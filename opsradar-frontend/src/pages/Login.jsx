import React, { useState, useEffect } from 'react';
import { login, verifyLoginTotp, submitPasswordResetRequest } from '../services/api';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import { Lock as LockIcon, Person as PersonIcon, Visibility, VisibilityOff } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';

const Login = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetUsername, setResetUsername] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalInfo, setModalInfo] = useState('');
  const [totpOpen, setTotpOpen] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) navigate('/');
  }, [navigate]);

  const finishLogin = (data) => {
    localStorage.setItem('authToken', data.token);
    if (data.must_enroll_totp) {
      navigate('/totp-setup');
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    if (!credentials.username || !credentials.password) {
      setError('Please enter both username and password');
      return;
    }
    try {
      const data = await login(credentials);
      if (data.requires_password_change) {
        sessionStorage.setItem('changeToken', data.change_token);
        sessionStorage.setItem('changeUsername', data.username || credentials.username);
        navigate('/change-password');
        return;
      }
      if (data.requires_totp) {
        setPreAuthToken(data.pre_auth_token);
        setTotpCode('');
        setTotpOpen(true);
        return;
      }
      finishLogin(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    }
  };

  const handleTotpSubmit = async () => {
    try {
      const data = await verifyLoginTotp(preAuthToken, totpCode);
      setTotpOpen(false);
      finishLogin(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid authenticator code');
    }
  };

  const handleResetRequest = async () => {
    if (!resetUsername.trim()) {
      setModalError('Enter your username');
      return;
    }
    try {
      const data = await submitPasswordResetRequest(resetUsername.trim());
      setModalError('');
      setModalInfo(data.message);
    } catch (err) {
      setModalError(err.response?.data?.error || 'Failed to submit request');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2
      }}
    >
      <Paper sx={{ p: 4, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" gutterBottom fontWeight={600}>
          OpsRadar
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Sign in to manage alerts
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {info}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            margin="normal"
            label="Username"
            name="username"
            value={credentials.username}
            onChange={(e) => setCredentials((p) => ({ ...p, username: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon fontSize="small" />
                </InputAdornment>
              )
            }}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={credentials.password}
            onChange={(e) => setCredentials((p) => ({ ...p, password: e.target.value }))}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((s) => !s)} edge="end" size="small">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => {
                setForgotOpen(true);
                setModalError('');
                setModalInfo('');
                setResetUsername(credentials.username);
              }}
            >
              Need a password reset?
            </Link>
          </Box>
          <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>
            Sign in
          </Button>
        </Box>
      </Paper>

      <Dialog open={forgotOpen} onClose={() => setForgotOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Request password reset</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            No email or SMS is used. An administrator will generate a temporary password and share
            it with you. They can also reset your authenticator if needed.
          </Typography>
          {modalError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {modalError}
            </Alert>
          )}
          {modalInfo && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {modalInfo}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Username"
            value={resetUsername}
            onChange={(e) => setResetUsername(e.target.value)}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setForgotOpen(false)}>Close</Button>
          <Button variant="contained" onClick={handleResetRequest}>
            Submit request
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={totpOpen} onClose={() => setTotpOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Authenticator code</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter the 6-digit code from your authenticator app.
          </Typography>
          <TextField
            fullWidth
            label="TOTP code"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value)}
            inputProps={{ inputMode: 'numeric', maxLength: 6 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTotpOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleTotpSubmit}>
            Verify
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;
