import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Chip,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Stack
} from '@mui/material';
import {
  getPasswordResetRequests,
  fulfillPasswordResetRequest,
  rejectPasswordResetRequest,
  checkAdmin
} from '../services/api';

const Requests = () => {
  const [rows, setRows] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState('');
  const [fulfillTarget, setFulfillTarget] = useState(null);
  const [resetTotp, setResetTotp] = useState(true);
  const [tempPassword, setTempPassword] = useState('');
  const [info, setInfo] = useState('');

  const load = async () => {
    try {
      const data = await getPasswordResetRequests();
      setRows(data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load requests (admin only)');
      setRows([]);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        await checkAdmin();
        setIsAdmin(true);
        await load();
      } catch {
        setIsAdmin(false);
        setError('Administrator access is required to manage password reset requests.');
      }
    })();
  }, []);

  const handleFulfill = async () => {
    if (!fulfillTarget) return;
    try {
      const result = await fulfillPasswordResetRequest(fulfillTarget.request_id, {
        reset_totp: resetTotp
      });
      setTempPassword(result.temp_password);
      setInfo(
        `Temporary password for ${result.username}. Share it out-of-band (chat/call). It will not be shown again.`
      );
      setFulfillTarget(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fulfill request');
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectPasswordResetRequest(id);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject request');
    }
  };

  const copyTemp = async () => {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword);
  };

  return (
    <Box>
      <Typography variant="h1" gutterBottom>
        Password reset requests
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Users request a reset in the app. Admins generate a temporary password and optionally reset
        TOTP — no email or SMS.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {info && (
        <Alert
          severity="success"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={copyTemp}>
              Copy password
            </Button>
          }
        >
          {info}
          {tempPassword ? (
            <Typography component="div" sx={{ mt: 1, fontFamily: 'monospace' }}>
              {tempPassword}
            </Typography>
          ) : null}
        </Alert>
      )}

      {!isAdmin ? null : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'background.default' }}>
                  <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>TOTP</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Requested</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No password reset requests.</TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.request_id} hover>
                      <TableCell>{row.user?.username}</TableCell>
                      <TableCell>{row.user?.email}</TableCell>
                      <TableCell>
                        {row.user?.totp_enabled ? (
                          <Chip size="small" label="Enabled" color="success" />
                        ) : (
                          <Chip size="small" label="Off" />
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={row.status} />
                      </TableCell>
                      <TableCell>
                        {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                      </TableCell>
                      <TableCell>
                        {row.status === 'pending' ? (
                          <Stack direction="row" spacing={1}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => {
                                setFulfillTarget(row);
                                setResetTotp(true);
                                setTempPassword('');
                                setInfo('');
                              }}
                            >
                              Issue temp password
                            </Button>
                            <Button size="small" color="inherit" onClick={() => handleReject(row.request_id)}>
                              Reject
                            </Button>
                          </Stack>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={Boolean(fulfillTarget)} onClose={() => setFulfillTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Issue temporary password</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            User: <strong>{fulfillTarget?.user?.username}</strong>
          </Typography>
          <FormControlLabel
            control={
              <Checkbox checked={resetTotp} onChange={(e) => setResetTotp(e.target.checked)} />
            }
            label="Reset TOTP so they enroll a fresh authenticator after login"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFulfillTarget(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleFulfill}>
            Generate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Requests;
