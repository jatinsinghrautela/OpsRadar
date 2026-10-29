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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Skeleton,
  useMediaQuery,
  useTheme,
  Tabs,
  Tab
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  getAccessRequests,
  createAccessRequest,
  approveAccessRequest,
  rejectAccessRequest,
  getGroups,
  getServers,
  checkAdmin
} from '../services/api';
import { useFeedback } from '../context/FeedbackContext';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const statusColor = {
  pending: 'warning',
  approved: 'success',
  rejected: 'default'
};

export default function AccessRequests() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notifyError, notifySuccess } = useFeedback();
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ resource_type: 'group', resource_id: '' });
  const [groups, setGroups] = useState([]);
  const [servers, setServers] = useState([]);
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAccessRequests();
      setRows(data);
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to load access requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdmin().then(() => setIsAdmin(true)).catch(() => setIsAdmin(false));
    load();
    getGroups().then(setGroups).catch(() => {});
    getServers().then(setServers).catch(() => {});
  }, []);

  const visible = rows.filter((r) => {
    if (tab === 1) return r.status === 'pending';
    if (tab === 2) return r.status !== 'pending';
    return true;
  });

  const handleCreate = async () => {
    if (!form.resource_id) {
      notifyError('Select a group or server');
      return;
    }
    setSaving(true);
    try {
      await createAccessRequest({
        resource_type: form.resource_type,
        resource_id: Number(form.resource_id)
      });
      notifySuccess('Access request submitted');
      setCreateOpen(false);
      setForm({ resource_type: 'group', resource_id: '' });
      await load();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to submit request');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (row) => {
    setSaving(true);
    try {
      await approveAccessRequest(row.request_id);
      notifySuccess('Access approved');
      await load();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setSaving(true);
    try {
      await rejectAccessRequest(rejectTarget.request_id);
      notifySuccess('Request rejected');
      setRejectTarget(null);
      await load();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to reject');
    } finally {
      setSaving(false);
    }
  };

  const actions = (row) =>
    isAdmin &&
    row.status === 'pending' && (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button size="small" variant="contained" disabled={saving} onClick={() => handleApprove(row)}>
          Approve
        </Button>
        <Button size="small" variant="outlined" color="error" disabled={saving} onClick={() => setRejectTarget(row)}>
          Reject
        </Button>
      </Stack>
    );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Typography variant="h4">Access requests</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Request access
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 560 }}>
        Request membership in a group or view access to a server. Admins approve or reject; this is separate from password-reset requests.
      </Typography>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="All" />
        <Tab label="Pending" />
        <Tab label="Resolved" />
      </Tabs>

      <Dialog open={createOpen} onClose={() => !saving && setCreateOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>Request access</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={form.resource_type}
                onChange={(e) => setForm({ resource_type: e.target.value, resource_id: '' })}
              >
                <MenuItem value="group">Group</MenuItem>
                <MenuItem value="server">Server</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>{form.resource_type === 'group' ? 'Group' : 'Server'}</InputLabel>
              <Select
                label={form.resource_type === 'group' ? 'Group' : 'Server'}
                value={form.resource_id}
                onChange={(e) => setForm({ ...form, resource_id: e.target.value })}
              >
                {form.resource_type === 'group'
                  ? groups.map((g) => (
                      <MenuItem key={g.group_id} value={g.group_id}>
                        {g.group_name}
                      </MenuItem>
                    ))
                  : servers.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.name}
                      </MenuItem>
                    ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={saving}>
            {saving ? 'Submitting…' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject request"
        message={`Reject access to ${rejectTarget?.resource_name}?`}
        confirmLabel="Reject"
        loading={saving}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleReject}
      />

      {loading ? (
        <Stack spacing={1}>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</Stack>
      ) : visible.length === 0 ? (
        <EmptyState title="No access requests" description="Submit a request for a group or server." />
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {visible.map((row) => (
            <Paper key={row.request_id} sx={{ p: 2, borderRadius: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                <Chip size="small" label={row.status} color={statusColor[row.status] || 'default'} />
                <Typography variant="caption" color="text.secondary">
                  {row.resource_type}
                </Typography>
              </Box>
              <Typography fontWeight={600}>{row.resource_name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {row.user?.username || 'User'} · {new Date(row.createdAt).toLocaleString()}
              </Typography>
              {actions(row)}
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Requested</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visible.map((row) => (
                  <TableRow key={row.request_id} hover>
                    <TableCell>{row.user?.username || '—'}</TableCell>
                    <TableCell>{row.resource_type}</TableCell>
                    <TableCell>{row.resource_name}</TableCell>
                    <TableCell>
                      <Chip size="small" label={row.status} color={statusColor[row.status] || 'default'} />
                    </TableCell>
                    <TableCell>{new Date(row.createdAt).toLocaleString()}</TableCell>
                    <TableCell>{actions(row) || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}
