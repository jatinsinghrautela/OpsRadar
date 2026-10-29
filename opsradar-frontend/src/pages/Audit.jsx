import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Typography, TextField, InputAdornment, Pagination, Switch, FormControlLabel,
  Skeleton, Stack, useMediaQuery, useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { getAuditLogs } from '../services/api';
import { useFeedback } from '../context/FeedbackContext';
import EmptyState from '../components/EmptyState';

const Audit = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notifyError } = useFeedback();
  const [auditData, setAuditData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;
  const [showMiddlewareLogs, setShowMiddlewareLogs] = useState(true);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const logs = await getAuditLogs();
      setAuditData(logs);
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = auditData.filter(
    (log) =>
      (showMiddlewareLogs || !log.action.includes(' ')) &&
      (
        (log.user || '').toLowerCase().includes(search.toLowerCase()) ||
        (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
        new Date(log.timestamp).toLocaleString().toLowerCase().includes(search.toLowerCase())
      )
  );

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / rowsPerPage));
  const paginated = filteredLogs.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const formatDetails = (details) => (details ? JSON.stringify(details) : 'N/A');

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Audit log
      </Typography>

      <TextField
        size="small"
        placeholder="Search audit logs..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          )
        }}
        sx={{ mb: 1, width: { xs: '100%', sm: 320 } }}
        aria-label="Search audit logs"
      />
      <FormControlLabel
        control={
          <Switch
            checked={showMiddlewareLogs}
            onChange={(e) => {
              setShowMiddlewareLogs(e.target.checked);
              setPage(1);
            }}
          />
        }
        label="Show middleware logs (e.g., DELETE /users/9)"
        sx={{ mb: 2, display: 'block' }}
      />

      {loading ? (
        <Stack spacing={1}>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</Stack>
      ) : filteredLogs.length === 0 ? (
        <EmptyState title="No logs found" description="Try another search or toggle middleware logs." />
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {paginated.map((log) => (
            <Paper key={log.id} sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={600}>{log.user}</Typography>
              <Typography variant="body2" sx={{ mb: 0.5 }}>{log.action}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {new Date(log.timestamp).toLocaleString()}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
                {formatDetails(log.details)}
              </Typography>
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table stickyHeader aria-label="Audit log table">
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((log) => (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{log.user}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>
                      {new Date(log.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell>{formatDetails(log.details)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {filteredLogs.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(e, p) => setPage(p)}
            shape="rounded"
            aria-label="Audit log pagination"
          />
        </Box>
      )}
    </Box>
  );
};

export default Audit;
