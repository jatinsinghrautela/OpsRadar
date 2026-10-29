import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableContainer, TableHead, TableRow, TableCell, TableBody,
  Typography, Button, TextField, InputAdornment, Pagination, Chip, Switch,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel,
  Select, MenuItem, FormControl, Skeleton, Stack, useMediaQuery, useTheme
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import GroupIcon from '@mui/icons-material/Group';
import {
  getUsers, createUser, updateUser, deleteUser, checkAdmin, getCurrentUser,
  getGroups, assignUserGroup, removeUserGroup, lockUser, unlockUser
} from '../services/api';
import { useFeedback } from '../context/FeedbackContext';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

const emptyNewUser = {
  username: '',
  email: '',
  is_admin: false,
  tempPassword: true,
  password: ''
};

const Users = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { notifyError, notifySuccess } = useFeedback();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [usersData, setUsersData] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openAddUser, setOpenAddUser] = useState(false);
  const [openEditUser, setOpenEditUser] = useState(false);
  const [newUser, setNewUser] = useState(emptyNewUser);
  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [groupsDialogUser, setGroupsDialogUser] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const users = await getUsers();
      const formattedUsers = users.map((user) => ({
        id: user.user_id,
        username: user.username,
        email: user.email,
        is_admin: user.is_admin,
        is_active: user.is_active !== false,
        tempPassword: false,
        locked: user.is_active === false,
        groups: user.groups || []
      }));
      setUsersData(formattedUsers);
      setFilteredUsers(formattedUsers);
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAdmin().then(() => setIsAdmin(true)).catch(() => setIsAdmin(false));
    getCurrentUser()
      .then((u) => setCurrentUserId(u.user_id ?? u.id ?? null))
      .catch(() => {});
    fetchUsers();
    getGroups().then(setAllGroups).catch(() => {});
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase();
    setFilteredUsers(
      usersData.filter(
        (user) =>
          user.username.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q)
      )
    );
    setPage(1);
  }, [searchQuery, usersData]);

  const makePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generatePassword = () => {
    setNewUser((prev) => ({ ...prev, password: makePassword() }));
  };

  const handleOpenAddUser = () => {
    const next = { ...emptyNewUser, password: makePassword() };
    setNewUser(next);
    setOpenAddUser(true);
  };

  const handleCloseAddUser = () => {
    setOpenAddUser(false);
    setNewUser(emptyNewUser);
  };

  const handleOpenEditUser = (user) => {
    setEditUser({ id: user.id, username: user.username, email: user.email, is_admin: user.is_admin });
    setOpenEditUser(true);
  };

  const handleCloseEditUser = () => {
    setOpenEditUser(false);
    setEditUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({ ...newUser, [name]: value });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditUser({ ...editUser, [name]: value });
  };

  const handleToggleChange = (e) => {
    const checked = e.target.checked;
    setNewUser({
      ...newUser,
      tempPassword: checked,
      password: checked ? (newUser.password || makePassword()) : ''
    });
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email) {
      notifyError('Username and email are required');
      return;
    }
    if (!newUser.tempPassword && !newUser.password) {
      notifyError('Please enter a password or enable temporary password');
      return;
    }
    setSaving(true);
    try {
      await createUser({
        username: newUser.username,
        password: newUser.tempPassword && !newUser.password ? makePassword() : newUser.password,
        email: newUser.email,
        is_admin: newUser.is_admin
      });
      notifySuccess('User created');
      handleCloseAddUser();
      await fetchUsers();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to add user');
    } finally {
      setSaving(false);
    }
  };

  const handleEditUser = async () => {
    if (!editUser?.username || !editUser?.email) {
      notifyError('Username and email are required');
      return;
    }
    setSaving(true);
    try {
      await updateUser(editUser.id, {
        username: editUser.username,
        email: editUser.email,
        is_admin: editUser.is_admin
      });
      notifySuccess('User updated');
      handleCloseEditUser();
      await fetchUsers();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteUser(deleteTarget.id);
      notifySuccess('User deleted');
      setDeleteTarget(null);
      await fetchUsers();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to delete user');
    } finally {
      setSaving(false);
    }
  };

  const handleAssignGroup = async () => {
    if (!groupsDialogUser || !selectedGroupId) {
      notifyError('Select a group');
      return;
    }
    setSaving(true);
    try {
      await assignUserGroup(groupsDialogUser.id, selectedGroupId);
      notifySuccess('Group assigned');
      setSelectedGroupId('');
      await fetchUsers();
      const refreshed = (await getUsers()).find((u) => u.user_id === groupsDialogUser.id);
      if (refreshed) {
        setGroupsDialogUser({
          id: refreshed.user_id,
          username: refreshed.username,
          groups: refreshed.groups || []
        });
      }
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to assign group');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveGroup = async (groupId) => {
    if (!groupsDialogUser) return;
    setSaving(true);
    try {
      await removeUserGroup(groupsDialogUser.id, groupId);
      notifySuccess('Group removed');
      await fetchUsers();
      setGroupsDialogUser((prev) =>
        prev
          ? { ...prev, groups: (prev.groups || []).filter((g) => g.group_id !== groupId) }
          : prev
      );
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to remove group');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async (user) => {
    if (currentUserId != null && user.id === currentUserId) {
      notifyError('Cannot lock your own account');
      return;
    }
    setSaving(true);
    try {
      if (user.locked) {
        await unlockUser(user.id);
        notifySuccess('User unlocked');
      } else {
        await lockUser(user.id);
        notifySuccess('User locked');
      }
      await fetchUsers();
    } catch (error) {
      notifyError(error.response?.data?.error || 'Failed to update lock status');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newUser.password);
    notifySuccess('Password copied');
  };

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / rowsPerPage));
  const paginated = filteredUsers.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const actions = (user) =>
    isAdmin && (
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => handleOpenEditUser(user)}>
          Edit
        </Button>
        <Button
          size="small"
          variant="outlined"
          color={user.locked ? 'success' : 'warning'}
          disabled={saving || (currentUserId != null && user.id === currentUserId)}
          onClick={() => handleToggleLock(user)}
        >
          {user.locked ? 'Unlock' : 'Lock'}
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<GroupIcon />}
          onClick={() => {
            setGroupsDialogUser({ id: user.id, username: user.username, groups: user.groups || [] });
            setSelectedGroupId('');
          }}
        >
          Groups
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={() => setDeleteTarget(user)}
        >
          Delete
        </Button>
      </Stack>
    );

  const groupChips = (user) =>
    (user.groups || []).length ? (
      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
        {user.groups.map((g) => (
          <Chip key={g.group_id} size="small" label={g.group_name} />
        ))}
      </Stack>
    ) : (
      <Typography variant="body2" color="text.secondary">—</Typography>
    );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h4">Users</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddUser}>
            Add user
          </Button>
        )}
      </Box>

      <TextField
        size="small"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
        sx={{ mb: 2, width: { xs: '100%', sm: 320 } }}
      />

      <Dialog open={openAddUser} onClose={() => !saving && handleCloseAddUser()} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>Add user</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={newUser.username}
              onChange={handleInputChange}
              size="small"
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={newUser.email}
              onChange={handleInputChange}
              size="small"
              required
            />
            <FormControl fullWidth size="small">
              <Select
                name="is_admin"
                value={newUser.is_admin}
                onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.value })}
              >
                <MenuItem value={false}>Regular</MenuItem>
                <MenuItem value={true}>Admin</MenuItem>
              </Select>
            </FormControl>
            <Typography variant="caption" color="text.secondary">
              Note: Admin users cannot be deleted, but their admin privileges can be revoked.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={newUser.tempPassword}
                  onChange={handleToggleChange}
                  name="tempPassword"
                  color="primary"
                />
              }
              label="Generate temp password"
            />
            <TextField
              fullWidth
              label="Password"
              name="password"
              value={newUser.password}
              onChange={handleInputChange}
              size="small"
              InputProps={{
                readOnly: newUser.tempPassword,
                endAdornment: newUser.tempPassword && (
                  <InputAdornment position="end">
                    <IconButton onClick={copyToClipboard}><ContentCopyIcon fontSize="small" /></IconButton>
                    <IconButton onClick={generatePassword}><RefreshIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseAddUser} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleAddUser} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openEditUser} onClose={() => !saving && handleCloseEditUser()} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 600 }}>Edit user</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={editUser?.username || ''}
              onChange={handleEditInputChange}
              size="small"
              required
            />
            <TextField
              fullWidth
              label="Email"
              name="email"
              value={editUser?.email || ''}
              onChange={handleEditInputChange}
              size="small"
              required
            />
            <FormControl fullWidth size="small">
              <Select
                name="is_admin"
                value={editUser?.is_admin || false}
                onChange={(e) => setEditUser({ ...editUser, is_admin: e.target.value })}
              >
                <MenuItem value={false}>Regular</MenuItem>
                <MenuItem value={true}>Admin</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseEditUser} disabled={saving}>Cancel</Button>
          <Button variant="contained" onClick={handleEditUser} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete user"
        message={`Delete “${deleteTarget?.username}”? This cannot be undone.`}
        confirmLabel="Delete"
        loading={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />

      <Dialog
        open={!!groupsDialogUser}
        onClose={() => !saving && setGroupsDialogUser(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Groups — {groupsDialogUser?.username}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Membership grants visibility to alerts for that group.
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {(groupsDialogUser?.groups || []).length === 0 && (
                <Typography variant="body2" color="text.secondary">No groups yet</Typography>
              )}
              {(groupsDialogUser?.groups || []).map((g) => (
                <Chip
                  key={g.group_id}
                  label={g.group_name}
                  onDelete={isAdmin ? () => handleRemoveGroup(g.group_id) : undefined}
                  disabled={saving}
                />
              ))}
            </Stack>
            {isAdmin && (
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <FormControl fullWidth size="small">
                  <Select
                    displayEmpty
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Select group</em>
                    </MenuItem>
                    {allGroups
                      .filter(
                        (g) =>
                          !(groupsDialogUser?.groups || []).some((ug) => ug.group_id === g.group_id)
                      )
                      .map((g) => (
                        <MenuItem key={g.group_id} value={g.group_id}>
                          {g.group_name}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>
                <Button variant="contained" onClick={handleAssignGroup} disabled={saving || !selectedGroupId}>
                  Add
                </Button>
              </Stack>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setGroupsDialogUser(null)} disabled={saving}>Close</Button>
        </DialogActions>
      </Dialog>

      {loading ? (
        <Stack spacing={1}>{[1, 2, 3].map((i) => <Skeleton key={i} height={56} />)}</Stack>
      ) : filteredUsers.length === 0 ? (
        <EmptyState title="No users found" description="Try another search or add a user." />
      ) : isMobile ? (
        <Stack spacing={1.5}>
          {paginated.map((user) => (
            <Paper key={user.id} sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight={600}>{user.username}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {user.email}
              </Typography>
              <Box sx={{ mb: 1 }}>{groupChips(user)}</Box>
              <Stack direction="row" spacing={0.5} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label={user.is_admin ? 'Admin' : 'User'}
                  color={user.is_admin ? 'primary' : 'default'}
                />
                <Chip
                  size="small"
                  label={user.locked ? 'Locked' : 'Active'}
                  color={user.locked ? 'error' : 'success'}
                />
              </Stack>
              {actions(user)}
            </Paper>
          ))}
        </Stack>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Username</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Admin</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Groups</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginated.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>{user.username}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.is_admin ? 'Yes' : 'No'}
                        size="small"
                        color={user.is_admin ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.locked ? 'Locked' : 'Active'}
                        size="small"
                        color={user.locked ? 'error' : 'success'}
                      />
                    </TableCell>
                    <TableCell>{groupChips(user)}</TableCell>
                    <TableCell>{actions(user)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {filteredUsers.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination count={totalPages} page={page} onChange={(e, p) => setPage(p)} shape="rounded" />
        </Box>
      )}
    </Box>
  );
};

export default Users;
