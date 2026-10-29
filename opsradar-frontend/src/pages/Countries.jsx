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
import {
  getCountries, createCountry, updateCountry, deleteCountry, checkAdmin
} from '../services/api';
import { useFeedback } from '../context/FeedbackContext';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const emptyForm = { country_code: '', country_name: '' };

const Countries = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notifyError, notifySuccess } = useFeedback();
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const fetchRows = async () => {
    setLoading(true);
    try {
      const data = await getCountries();
      setRows(data);
      setFiltered(data);
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to fetch countries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdmin().then(() => setIsAdmin(true)).catch(() => setIsAdmin(false));
    fetchRows();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFiltered(
      rows.filter(
        (c) =>
          (c.country_name || '').toLowerCase().includes(q) ||
          (c.country_code || '').toLowerCase().includes(q)
      )
    );
    setPage(1);
  }, [searchQuery, rows]);

  const handleSave = async () => {
    if (!form.country_code || !form.country_name) {
      notifyError('Country code and name are required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCountry(editing.country_id, form);
        notifySuccess('Country updated');
      } else {
        await createCountry(form);
        notifySuccess('Country created');
      }
      setDialogOpen(false);
      await fetchRows();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to save country');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteCountry(deleteTarget.country_id);
      notifySuccess('Country deleted');
      setDeleteTarget(null);
      await fetchRows();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to delete country');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const paginated = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h4">Countries</Typography>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
              setDialogOpen(true);
            }}
          >
            Add country
          </Button>
        )}
      </Box>

      <TextField
        size="small"
        placeholder="Search countries..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
      />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>{editing ? 'Edit country' : 'Add country'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Code (ISO-2)"
              value={form.country_code}
              onChange={(e) => setForm({ ...form, country_code: e.target.value })}
              size="small"
              inputProps={{ maxLength: 2 }}
            />
            <TextField
              fullWidth
              label="Name"
              value={form.country_name}
              onChange={(e) => setForm({ ...form, country_name: e.target.value })}
              size="small"
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
        title="Delete country"
        message={`Delete “${deleteTarget?.country_name}”?`}
        confirmLabel="Delete"
        loading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {loading ? (
        <Stack spacing={1}>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</Stack>
      ) : filtered.length === 0 ? (
        <EmptyState title="No countries" description="Add countries before creating servers." />
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {paginated.map((c) => (
            <Paper key={c.country_id} sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={600}>{c.country_name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {c.country_code}
              </Typography>
              {isAdmin && (
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => {
                      setEditing(c);
                      setForm({ country_code: c.country_code, country_name: c.country_name });
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setDeleteTarget(c)}
                  >
                    Delete
                  </Button>
                </Stack>
              )}
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((c) => (
                  <TableRow key={c.country_id} hover>
                    <TableCell>{c.country_code}</TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{c.country_name}</TableCell>
                    <TableCell>
                      {isAdmin && (
                        <Stack direction="row" spacing={1}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => {
                              setEditing(c);
                              setForm({ country_code: c.country_code, country_name: c.country_name });
                              setDialogOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DeleteIcon />}
                            onClick={() => setDeleteTarget(c)}
                          >
                            Delete
                          </Button>
                        </Stack>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {filtered.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(e, p) => setPage(p)} shape="rounded" />
        </Box>
      )}
    </Box>
  );
};

export default Countries;
