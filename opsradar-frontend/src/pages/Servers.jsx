import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, Button, TextField, InputAdornment, Pagination, Dialog, DialogTitle,
  DialogContent, DialogActions, DialogContentText, MenuItem, Skeleton, Stack, Chip,
  useMediaQuery, useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import KeyIcon from '@mui/icons-material/Key';
import {
  getServers, createServer, updateServer, deleteServer, getCountries, checkAdmin,
  getServerIngestKey, rotateServerIngestKey
} from '../services/api';
import { useFeedback } from '../context/FeedbackContext';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const emptyForm = { server_name: '', ip_address: '', country_name: '', retention_days: '' };

const Servers = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notifyError, notifySuccess } = useFeedback();
  const [isAdmin, setIsAdmin] = useState(false);
  const [serversData, setServersData] = useState([]);
  const [filteredServers, setFilteredServers] = useState([]);
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [keyDialog, setKeyDialog] = useState(null); // { name, ingest_api_key }
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const fetchServers = async () => {
    setLoading(true);
    try {
      const servers = await getServers();
      setServersData(servers);
      setFilteredServers(servers);
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const countryData = await getCountries();
      setCountries(countryData);
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to fetch countries');
    }
  };

  useEffect(() => {
    checkAdmin().then(() => setIsAdmin(true)).catch(() => setIsAdmin(false));
    fetchServers();
    fetchCountries();
    const timer = setInterval(fetchServers, 15000);
    return () => clearInterval(timer);
  }, []);

  const agentChip = (status) => {
    if (status === 'live') return <Chip size="small" color="success" label="Live" />;
    if (status === 'down') return <Chip size="small" color="error" label="Down" />;
    return <Chip size="small" variant="outlined" label="Unknown" />;
  };

  const rowTone = (status) => {
    if (status === 'live') return { borderLeft: '4px solid', borderLeftColor: 'success.main' };
    if (status === 'down') return { borderLeft: '4px solid', borderLeftColor: 'error.main' };
    return { borderLeft: '4px solid', borderLeftColor: 'divider' };
  };

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredServers(
      serversData.filter(
        (server) =>
          (server.name || '').toLowerCase().includes(q) ||
          (server.ip || '').toLowerCase().includes(q) ||
          (server.country || '').toLowerCase().includes(q)
      )
    );
    setPage(1);
  }, [searchQuery, serversData]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (server) => {
    setEditing(server);
    setForm({
      server_name: server.name || '',
      ip_address: server.ip || '',
      country_name: server.country || '',
      retention_days: server.retention_days != null ? String(server.retention_days) : ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.server_name || !form.ip_address || !form.country_name) {
      notifyError('Server name, IP address, and country are required');
      return;
    }
    const payload = {
      ...form,
      retention_days: form.retention_days === '' ? null : Number(form.retention_days)
    };
    setSaving(true);
    try {
      if (editing) {
        await updateServer(editing.id, payload);
        notifySuccess('Server updated');
        setDialogOpen(false);
      } else {
        const created = await createServer(payload);
        notifySuccess('Server created — copy the agent API key');
        setDialogOpen(false);
        if (created.ingest_api_key) {
          setKeyDialog({ name: created.name, ingest_api_key: created.ingest_api_key });
        }
      }
      await fetchServers();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to save server');
    } finally {
      setSaving(false);
    }
  };

  const handleShowKey = async (server) => {
    setSaving(true);
    try {
      const data = await getServerIngestKey(server.id);
      if (data.revealable && data.ingest_api_key) {
        setKeyDialog({
          name: data.name,
          ingest_api_key: data.ingest_api_key,
          prefix: data.ingest_api_key_prefix
        });
      } else {
        setKeyDialog({
          name: data.name,
          ingest_api_key: null,
          prefix: data.ingest_api_key_prefix || server.ingest_api_key_prefix,
          note: data.note || 'Keys are hashed at rest. Rotate to mint a new key.'
        });
      }
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to load ingest key');
    } finally {
      setSaving(false);
    }
  };

  const handleRotateKey = async (server) => {
    setSaving(true);
    try {
      const data = await rotateServerIngestKey(server.id);
      setKeyDialog({
        name: data.name,
        ingest_api_key: data.ingest_api_key,
        prefix: data.ingest_api_key_prefix
      });
      notifySuccess('Agent API key rotated — update CLI config on that host');
      await fetchServers();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to rotate ingest key');
    } finally {
      setSaving(false);
    }
  };

  const copyKey = async () => {
    if (!keyDialog?.ingest_api_key) return;
    try {
      await navigator.clipboard.writeText(keyDialog.ingest_api_key);
      notifySuccess('API key copied');
    } catch {
      notifyError('Could not copy — select and copy manually');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteServer(deleteTarget.id);
      notifySuccess('Server deleted');
      setDeleteTarget(null);
      await fetchServers();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to delete server');
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredServers.length / rowsPerPage));
  const paginated = filteredServers.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const actions = (server) =>
    isAdmin && (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button size="small" variant="outlined" startIcon={<KeyIcon />} onClick={() => handleShowKey(server)}>
          Agent key
        </Button>
        <Button size="small" variant="outlined" onClick={() => handleRotateKey(server)}>
          Rotate key
        </Button>
        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openEdit(server)}>
          Edit
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteTarget(server)}
        >
          Delete
        </Button>
      </Stack>
    );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h4">Servers</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Add server
          </Button>
        )}
      </Box>

      <TextField
        size="small"
        placeholder="Search servers..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
      />

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>{editing ? 'Edit server' : 'Add server'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Server name"
              name="server_name"
              value={form.server_name}
              onChange={(e) => setForm({ ...form, server_name: e.target.value })}
              size="small"
            />
            <TextField
              fullWidth
              label="IP address"
              name="ip_address"
              value={form.ip_address}
              onChange={(e) => setForm({ ...form, ip_address: e.target.value })}
              size="small"
            />
            <TextField
              select
              fullWidth
              label="Country"
              name="country_name"
              value={form.country_name}
              onChange={(e) => setForm({ ...form, country_name: e.target.value })}
              size="small"
            >
              {countries.map((country) => (
                <MenuItem key={country.country_id} value={country.country_name}>
                  {country.country_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              fullWidth
              type="number"
              label="Resolved alert retention (days)"
              name="retention_days"
              value={form.retention_days}
              onChange={(e) => setForm({ ...form, retention_days: e.target.value })}
              size="small"
              helperText="Leave empty to use application or global default"
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
        title="Delete server"
        message={`Delete “${deleteTarget?.name}”? This cannot be undone.`}
        confirmLabel="Delete"
        loading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <Dialog open={!!keyDialog} onClose={() => setKeyDialog(null)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>Agent API key — {keyDialog?.name}</DialogTitle>
        <DialogContent>
          {keyDialog?.ingest_api_key ? (
            <>
              <DialogContentText sx={{ mb: 2 }}>
                Copy this key into the CLI <code>config.yaml</code> as <code>api_key</code> on that host only.
                It is shown once and stored hashed — it cannot be retrieved later.
              </DialogContentText>
              <TextField
                fullWidth
                multiline
                minRows={2}
                value={keyDialog.ingest_api_key}
                InputProps={{ readOnly: true }}
                size="small"
              />
            </>
          ) : (
            <DialogContentText>
              {keyDialog?.note || 'Keys are hashed at rest.'}
              {keyDialog?.prefix ? (
                <>
                  {' '}Prefix: <code>{keyDialog.prefix}…</code>
                </>
              ) : null}
              {' '}Use <strong>Rotate key</strong> to mint a new plaintext key.
            </DialogContentText>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setKeyDialog(null)}>Close</Button>
          {keyDialog?.ingest_api_key && (
            <Button variant="contained" onClick={copyKey}>Copy</Button>
          )}
        </DialogActions>
      </Dialog>

      {loading ? (
        <Stack spacing={1}>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</Stack>
      ) : filteredServers.length === 0 ? (
        <EmptyState title="No servers found" description="Try another search or add a server." />
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {paginated.map((server) => (
            <Paper key={server.id} sx={{ p: 2, borderRadius: 2, ...rowTone(server.agent_status) }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                <Typography fontWeight={600}>{server.name}</Typography>
                {agentChip(server.agent_status)}
              </Box>
              <Typography variant="body2" color="text.secondary">{server.ip}</Typography>
              <Typography variant="body2" color="text.secondary">
                {server.country || '—'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Retention: {server.retention_days != null ? `${server.retention_days}d` : 'default'}
              </Typography>
              {actions(server)}
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
                  <TableCell>Agent</TableCell>
                  <TableCell>IP address</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell>Retention</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((server) => (
                  <TableRow
                    key={server.id}
                    hover
                    sx={{
                      ...rowTone(server.agent_status),
                      bgcolor: server.agent_status === 'down' ? 'rgba(198, 40, 40, 0.06)' : undefined
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{server.name}</TableCell>
                    <TableCell>{agentChip(server.agent_status)}</TableCell>
                    <TableCell>{server.ip}</TableCell>
                    <TableCell>{server.country}</TableCell>
                    <TableCell>
                      {server.retention_days != null ? `${server.retention_days} days` : 'Default'}
                    </TableCell>
                    <TableCell>{actions(server)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {filteredServers.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(e, p) => setPage(p)} shape="rounded" />
        </Box>
      )}
    </Box>
  );
};

export default Servers;
