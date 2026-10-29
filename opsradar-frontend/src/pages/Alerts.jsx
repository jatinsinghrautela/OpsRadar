import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, TextField, InputAdornment, Pagination, MenuItem, FormControl,
  Select, Grid, Button, Checkbox, ListItemText, InputLabel, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Skeleton, Stack, Chip, ToggleButton,
  ToggleButtonGroup, useMediaQuery, useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import ClearIcon from '@mui/icons-material/Clear';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { getAlerts, createAlert, clearAlerts, checkAdmin } from '../services/api';
import { useFeedback } from '../context/FeedbackContext';
import EmptyState from '../components/EmptyState';
import SeverityChip from '../components/SeverityChip';
import ConfirmDialog from '../components/ConfirmDialog';

const MenuProps = {
  PaperProps: { style: { maxHeight: 48 * 4.5 + 8, width: 250 } }
};

const Alerts = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notifyError, notifySuccess } = useFeedback();
  const [isAdmin, setIsAdmin] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [statusView, setStatusView] = useState('active');
  const [filters, setFilters] = useState({
    countries: [], apps: [], severities: [], groups: [], servers: [], search: ''
  });
  const [facets, setFacets] = useState({
    countries: [], apps: [], groups: [], servers: []
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const rowsPerPage = 10;
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openAddAlert, setOpenAddAlert] = useState(false);
  const [newAlert, setNewAlert] = useState({
    message: '', severity: 'minor', country: '', server: '', app: '', group: ''
  });
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState('');
  const [clearScope, setClearScope] = useState(null); // 'resolved' | 'all'

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        pageSize: rowsPerPage
      };
      if (statusView !== 'all') params.status = statusView;
      if (debouncedSearch.trim()) params.q = debouncedSearch.trim();
      if (filters.severities.length) {
        params.severity = filters.severities.map((s) => s.toLowerCase()).join(',');
      }
      if (filters.countries.length) params.country = filters.countries.join(',');
      if (filters.apps.length) params.app = filters.apps.join(',');
      if (filters.groups.length) params.group = filters.groups.join(',');
      if (filters.servers.length) params.server = filters.servers.join(',');

      const data = await getAlerts(params);
      const items = Array.isArray(data) ? data : data.items || [];
      const mapped = items.map((alert) => ({
        ...alert,
        severity: alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)
      }));
      setAlerts(mapped);
      if (!Array.isArray(data)) {
        setTotal(data.total ?? mapped.length);
        setTotalPages(data.totalPages ?? Math.max(1, Math.ceil((data.total || 0) / rowsPerPage)));
      } else {
        setTotal(mapped.length);
        setTotalPages(1);
      }
      setFacets((prev) => ({
        countries: [...new Set([...prev.countries, ...mapped.map((a) => a.country)])].filter(Boolean).sort(),
        apps: [...new Set([...prev.apps, ...mapped.map((a) => a.app)])].filter(Boolean).sort(),
        groups: [...new Set([...prev.groups, ...mapped.map((a) => a.group)])].filter(Boolean).sort(),
        servers: [...new Set([...prev.servers, ...mapped.map((a) => a.server)])].filter(Boolean).sort()
      }));
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdmin().then(() => setIsAdmin(true)).catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 300);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    fetchAlerts();
    const timer = setInterval(fetchAlerts, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusView, page, debouncedSearch, filters.countries, filters.apps, filters.severities, filters.groups, filters.servers]);

  const allCountries = facets.countries;
  const allApps = facets.apps;
  const allSeverities = ['Critical', 'Major', 'Minor', 'Trivial'];
  const allGroups = facets.groups;
  const allServers = facets.servers;

  const paginatedAlerts = alerts;

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleAddAlert = async () => {
    if (!newAlert.message) {
      notifyError('Message is required');
      return;
    }
    setSaving(true);
    try {
      await createAlert({
        message: newAlert.message,
        severity: newAlert.severity.toLowerCase(),
        country_name: newAlert.country,
        server_name: newAlert.server,
        app_name: newAlert.app,
        group_name: newAlert.group
      });
      notifySuccess('Alert created');
      setOpenAddAlert(false);
      setNewAlert({ message: '', severity: 'minor', country: '', server: '', app: '', group: '' });
      await fetchAlerts();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to create alert');
    } finally {
      setSaving(false);
    }
  };

  const handleClearAlerts = async () => {
    if (!clearScope) return;
    setSaving(true);
    try {
      const result = await clearAlerts(clearScope);
      notifySuccess(
        clearScope === 'all'
          ? `Cleared ${result.deleted} alert(s)`
          : `Cleared ${result.deleted} resolved alert(s)`
      );
      setClearScope(null);
      await fetchAlerts();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to clear alerts');
    } finally {
      setSaving(false);
    }
  };

  const trimMessage = (message) => (message.length > 40 ? `${message.slice(0, 40)}…` : message);
  const formatTs = (ts) =>
    new Date(ts).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  const multiSelect = (label, name, options, values) => (
    <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 120 }, flex: { xs: '1 1 100%', sm: '0 0 auto' } }}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={values}
        onChange={(e) => handleFilterChange(name, e.target.value)}
        renderValue={(selected) => selected.join(', ')}
        MenuProps={MenuProps}
        label={label}
      >
        {options.map((opt) => (
          <MenuItem key={opt} value={opt}>
            <Checkbox checked={values.includes(opt)} />
            <ListItemText primary={opt} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h4">Alerts</Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={statusView}
            onChange={(_, v) => {
              if (v) {
                setStatusView(v);
                setPage(1);
              }
            }}
          >
            <ToggleButton value="active">Active</ToggleButton>
            <ToggleButton value="resolved">Resolved</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>
          {isAdmin && (
            <>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setClearScope('resolved')}
              >
                Clear resolved
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteSweepIcon />}
                onClick={() => setClearScope('all')}
              >
                Clear all
              </Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenAddAlert(true)}>
                Add alert
              </Button>
            </>
          )}
        </Box>
      </Box>

      <ConfirmDialog
        open={!!clearScope}
        title={clearScope === 'all' ? 'Clear all alerts' : 'Clear resolved alerts'}
        message={
          clearScope === 'all'
            ? 'Permanently delete all stored alerts (active and resolved) and their notifications? This cannot be undone.'
            : 'Permanently delete all resolved alerts and their notifications? Active alerts stay. This cannot be undone.'
        }
        confirmLabel={clearScope === 'all' ? 'Clear all' : 'Clear resolved'}
        loading={saving}
        onClose={() => setClearScope(null)}
        onConfirm={handleClearAlerts}
      />

      <Dialog open={openAddAlert} onClose={() => !saving && setOpenAddAlert(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>Add alert</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Message"
              name="message"
              value={newAlert.message}
              onChange={(e) => setNewAlert({ ...newAlert, message: e.target.value })}
              size="small"
              required
            />
            <FormControl fullWidth size="small">
              <InputLabel>Severity</InputLabel>
              <Select
                value={newAlert.severity}
                name="severity"
                label="Severity"
                onChange={(e) => setNewAlert({ ...newAlert, severity: e.target.value })}
              >
                {allSeverities.map((s) => (
                  <MenuItem key={s} value={s.toLowerCase()}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {['country', 'server', 'app', 'group'].map((field) => (
              <TextField
                key={field}
                fullWidth
                label={field.charAt(0).toUpperCase() + field.slice(1)}
                name={field}
                value={newAlert[field]}
                onChange={(e) => setNewAlert({ ...newAlert, [field]: e.target.value })}
                size="small"
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAddAlert(false)} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleAddAlert} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>Alert description</DialogTitle>
        <DialogContent>
          <Typography sx={{ wordBreak: 'break-word', py: 1 }}>{selectedMessage}</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenViewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Paper sx={{ p: { xs: 2, sm: 2.5 }, mb: 2, borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search alerts..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              <FilterAltIcon color="action" sx={{ display: { xs: 'none', sm: 'block' } }} />
              {multiSelect('Country', 'countries', allCountries, filters.countries)}
              {multiSelect('Severity', 'severities', allSeverities, filters.severities)}
              {multiSelect('App', 'apps', allApps, filters.apps)}
              {multiSelect('Group', 'groups', allGroups, filters.groups)}
              {multiSelect('Server', 'servers', allServers, filters.servers)}
              <Button
                onClick={() => {
                  setFilters({ countries: [], apps: [], severities: [], groups: [], servers: [], search: '' });
                  setPage(1);
                }}
                startIcon={<ClearIcon />}
                size="small"
              >
                Clear
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Stack spacing={1}>{[1, 2, 3, 4].map((i) => <Skeleton key={i} height={64} />)}</Stack>
      ) : alerts.length === 0 ? (
        <EmptyState title="No alerts found" description="Adjust filters or create an alert." />
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {paginatedAlerts.map((alert) => (
            <Paper
              key={alert.id}
              sx={{
                p: 2,
                borderRadius: 2,
                animation: 'listEnter 280ms ease-out',
                '@keyframes listEnter': {
                  from: { opacity: 0, transform: 'translateY(8px)' },
                  to: { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SeverityChip severity={alert.severity} />
                  <Chip
                    size="small"
                    label={alert.status || 'active'}
                    color={alert.status === 'resolved' ? 'default' : 'success'}
                    variant="outlined"
                  />
                </Stack>
                <IconButton
                  size="small"
                  aria-label="View message"
                  onClick={() => {
                    setSelectedMessage(alert.message);
                    setOpenViewDialog(true);
                  }}
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography fontWeight={600} sx={{ mb: 0.5 }}>
                {trimMessage(alert.message)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {alert.server} · {alert.app} · {alert.country}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatTs(alert.timestamp)}
              </Typography>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 480 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Message</TableCell>
                  <TableCell>Severity</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Country</TableCell>
                  <TableCell>Server</TableCell>
                  <TableCell>App</TableCell>
                  <TableCell>Group</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>View</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedAlerts.map((alert) => (
                  <TableRow
                    key={alert.id}
                    hover
                    sx={{
                      opacity: alert.status === 'resolved' ? 0.72 : 1,
                      animation: 'listEnter 280ms ease-out',
                      '@keyframes listEnter': {
                        from: { opacity: 0, transform: 'translateY(4px)' },
                        to: { opacity: 1, transform: 'translateY(0)' }
                      }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{trimMessage(alert.message)}</TableCell>
                    <TableCell>
                      <SeverityChip severity={alert.severity} />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={alert.status || 'active'}
                        color={alert.status === 'resolved' ? 'default' : 'success'}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{alert.country}</TableCell>
                    <TableCell>{alert.server}</TableCell>
                    <TableCell>{alert.app}</TableCell>
                    <TableCell>{alert.group}</TableCell>
                    <TableCell>{formatTs(alert.timestamp)}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedMessage(alert.message);
                          setOpenViewDialog(true);
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {total > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(e, p) => setPage(p)} shape="rounded" />
        </Box>
      )}
    </Box>
  );
};

export default Alerts;
