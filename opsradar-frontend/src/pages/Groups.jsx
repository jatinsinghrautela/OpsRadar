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
import { getGroups, createGroup, updateGroup, deleteGroup, checkAdmin } from '../services/api';
import { useFeedback } from '../context/FeedbackContext';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const emptyForm = { group_name: '', description: '' };

const Groups = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notifyError, notifySuccess } = useFeedback();
  const [isAdmin, setIsAdmin] = useState(false);
  const [groupsData, setGroupsData] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const groups = await getGroups();
      const formatted = groups.map((g) => ({
        id: g.group_id,
        group_name: g.group_name,
        description: g.description || ''
      }));
      setGroupsData(formatted);
      setFilteredGroups(formatted);
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to fetch groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdmin().then(() => setIsAdmin(true)).catch(() => setIsAdmin(false));
    fetchGroups();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredGroups(
      groupsData.filter(
        (g) => g.group_name.toLowerCase().includes(q) || g.description.toLowerCase().includes(q)
      )
    );
    setPage(1);
  }, [searchQuery, groupsData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (group) => {
    setEditing(group);
    setForm({ group_name: group.group_name, description: group.description });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.group_name) {
      notifyError('Group name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateGroup(editing.id, form);
        notifySuccess('Group updated');
      } else {
        await createGroup(form);
        notifySuccess('Group created');
      }
      setDialogOpen(false);
      await fetchGroups();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to save group');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteGroup(deleteTarget.id);
      notifySuccess('Group deleted');
      setDeleteTarget(null);
      await fetchGroups();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to delete group');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / rowsPerPage));
  const paginated = filteredGroups.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const actions = (group) =>
    isAdmin && (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openEdit(group)}>
          Edit
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteTarget(group)}
        >
          Delete
        </Button>
      </Stack>
    );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h4">Groups</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add group
          </Button>
        )}
      </Box>

      <TextField
        size="small"
        placeholder="Search groups..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
      />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>{editing ? 'Edit group' : 'Add group'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Group name"
              name="group_name"
              value={form.group_name}
              onChange={(e) => setForm({ ...form, group_name: e.target.value })}
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
        title="Delete group"
        message={`Delete “${deleteTarget?.group_name}”? This cannot be undone.`}
        confirmLabel="Delete"
        loading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      {loading ? (
        <Stack spacing={1}>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</Stack>
      ) : filteredGroups.length === 0 ? (
        <EmptyState title="No groups found" description="Try another search or add a group." />
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {paginated.map((group) => (
            <Paper key={group.id} sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={600}>{group.group_name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {group.description || '—'}
              </Typography>
              {actions(group)}
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Group name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((group) => (
                  <TableRow key={group.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{group.group_name}</TableCell>
                    <TableCell>{group.description || '—'}</TableCell>
                    <TableCell>{actions(group)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {filteredGroups.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(e, p) => setPage(p)} shape="rounded" />
        </Box>
      )}
    </Box>
  );
};

export default Groups;
