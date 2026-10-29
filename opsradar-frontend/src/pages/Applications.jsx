import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, TextField, InputAdornment, Pagination, Dialog, DialogTitle,
  DialogContent, DialogActions, Skeleton, Stack, useMediaQuery, useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getApplications, createApplication, updateApplication, deleteApplication, checkAdmin } from '../services/api';
import { useFeedback } from '../context/FeedbackContext';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const emptyForm = { app_name: '', description: '', retention_days: '' };

const Applications = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notifyError, notifySuccess } = useFeedback();
  const [isAdmin, setIsAdmin] = useState(false);
  const [applicationsData, setApplicationsData] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const apps = await getApplications();
      setApplicationsData(apps);
      setFilteredApplications(apps);
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdmin().then(() => setIsAdmin(true)).catch(() => setIsAdmin(false));
    fetchApplications();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredApplications(
      applicationsData.filter(
        (app) =>
          (app.name || '').toLowerCase().includes(q) ||
          (app.description || '').toLowerCase().includes(q)
      )
    );
    setPage(1);
  }, [searchQuery, applicationsData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (app) => {
    setEditing(app);
    setForm({
      app_name: app.name || '',
      description: app.description || '',
      retention_days: app.retention_days != null ? String(app.retention_days) : ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.app_name) {
      notifyError('Application name is required');
      return;
    }
    const payload = {
      ...form,
      retention_days: form.retention_days === '' ? null : Number(form.retention_days)
    };
    setSaving(true);
    try {
      if (editing) {
        await updateApplication(editing.id, payload);
        notifySuccess('Application updated');
      } else {
        await createApplication(payload);
        notifySuccess('Application created');
      }
      setDialogOpen(false);
      await fetchApplications();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to save application');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteApplication(deleteTarget.id);
      notifySuccess('Application deleted');
      setDeleteTarget(null);
      await fetchApplications();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to delete application');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredApplications.length / rowsPerPage));
  const paginated = filteredApplications.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const actions = (app) =>
    isAdmin && (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openEdit(app)}>
          Edit
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteTarget(app)}
        >
          Delete
        </Button>
      </Stack>
    );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h4">Applications</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add application
          </Button>
        )}
      </Box>

      <TextField
        size="small"
        placeholder="Search applications..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
      />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>{editing ? 'Edit application' : 'Add application'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Application name"
              name="app_name"
              value={form.app_name}
              onChange={(e) => setForm({ ...form, app_name: e.target.value })}
              size="small"
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              size="small"
            />
            <TextField
              fullWidth
              type="number"
              label="Resolved alert retention (days)"
              name="retention_days"
              value={form.retention_days}
              onChange={(e) => setForm({ ...form, retention_days: e.target.value })}
              size="small"
              helperText="Overrides server retention when set; leave empty for server/global default"
              inputProps={{ min: 1, step: 1 }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete application"
        message={`Delete “${deleteTarget?.name}”? This cannot be undone.`}
        confirmLabel="Delete"
        loading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {loading ? (
        <Stack spacing={1}>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</Stack>
      ) : filteredApplications.length === 0 ? (
        <EmptyState title="No applications found" description="Try another search or add an application." />
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {paginated.map((app) => (
            <Paper key={app.id} sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={600}>{app.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {app.description || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Retention: {app.retention_days != null ? `${app.retention_days}d` : 'default'}
              </Typography>
              {actions(app)}
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Retention</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((app) => (
                  <TableRow key={app.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{app.name}</TableCell>
                    <TableCell>{app.description || '—'}</TableCell>
                    <TableCell>
                      {app.retention_days != null ? `${app.retention_days} days` : 'Default'}
                    </TableCell>
                    <TableCell>{actions(app)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {filteredApplications.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(e, p) => setPage(p)} shape="rounded" />
        </Box>
      )}
    </Box>
  );
};

export default Applications;
