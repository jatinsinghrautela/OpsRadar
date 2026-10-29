import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const existing =
    config.headers?.Authorization ||
    config.headers?.authorization ||
    config.headers?.['X-Change-Token'];
  if (!existing) {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 403 = authenticated but not allowed (e.g. checkAdmin for non-admins) — do NOT logout.
    // 401 = missing/invalid session — clear token.
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      const method = (error.config?.method || '').toLowerCase();
      const isPublicAuth =
        url.includes('/login') ||
        url.includes('/change-password') ||
        (url.includes('/password-reset-requests') &&
          method === 'post' &&
          !localStorage.getItem('authToken'));
      if (!isPublicAuth && localStorage.getItem('authToken')) {
        localStorage.removeItem('authToken');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export const login = async (credentials) => {
  const response = await api.post('/login', credentials);
  return response.data;
};

export const verifyLoginTotp = async (pre_auth_token, totp_code) => {
  const response = await api.post('/login/totp', { pre_auth_token, totp_code });
  return response.data;
};

export const changePassword = async (new_password, changeToken) => {
  // Prefer Authorization Bearer so CORS / interceptors cannot drop a custom header.
  const headers = changeToken
    ? { Authorization: `Bearer ${changeToken}` }
    : {};
  const response = await api.post('/change-password', { new_password }, { headers });
  return response.data;
};

export const submitPasswordResetRequest = async (username) => {
  const response = await api.post('/password-reset-requests', { username });
  return response.data;
};

export const getPasswordResetRequests = async () => {
  const response = await api.get('/password-reset-requests');
  return response.data;
};

export const fulfillPasswordResetRequest = async (id, { reset_totp = false, notes } = {}) => {
  const response = await api.post(`/password-reset-requests/${id}/fulfill`, { reset_totp, notes });
  return response.data;
};

export const rejectPasswordResetRequest = async (id, notes) => {
  const response = await api.post(`/password-reset-requests/${id}/reject`, { notes });
  return response.data;
};

export const setupTotp = async () => {
  const response = await api.get('/totp/setup');
  return response.data;
};

export const enableTotp = async (totp_code) => {
  const response = await api.post('/totp/enable', { totp_code });
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data;
};

export const updateUser = async (userId, userData) => {
  const response = await api.put(`/users/${userId}`, userData);
  return response.data;
};

export const lockUser = async (userId) => {
  const response = await api.post(`/users/${userId}/lock`);
  return response.data;
};

export const unlockUser = async (userId) => {
  const response = await api.post(`/users/${userId}/unlock`);
  return response.data;
};

export const deleteUser = async (userId) => {
  const response = await api.delete(`/users/${userId}`);
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/current-user');
  return response.data;
};

export const getGroups = async () => {
  const response = await api.get('/groups');
  return response.data;
};

export const createGroup = async (groupData) => {
  const response = await api.post('/groups', groupData);
  return response.data;
};

export const updateGroup = async (groupId, groupData) => {
  const response = await api.put(`/groups/${groupId}`, groupData);
  return response.data;
};

export const deleteGroup = async (groupId) => {
  const response = await api.delete(`/groups/${groupId}`);
  return response.data;
};

export const getAlerts = async (params = {}) => {
  const response = await api.get('/alerts', { params });
  return response.data;
};

export const createAlert = async (alertData) => {
  const response = await api.post('/alert', alertData);
  return response.data;
};

export const clearAlerts = async (scope = 'resolved') => {
  const response = await api.delete('/alerts', { params: { scope } });
  return response.data;
};

export const getServers = async () => {
  const response = await api.get('/servers');
  return response.data;
};

export const createServer = async (serverData) => {
  const response = await api.post('/servers', serverData);
  return response.data;
};

export const updateServer = async (serverId, serverData) => {
  const response = await api.put(`/servers/${serverId}`, serverData);
  return response.data;
};

export const deleteServer = async (serverId) => {
  const response = await api.delete(`/servers/${serverId}`);
  return response.data;
};

export const getServerIngestKey = async (serverId) => {
  const response = await api.get(`/servers/${serverId}/ingest-key`);
  return response.data;
};

export const rotateServerIngestKey = async (serverId) => {
  const response = await api.post(`/servers/${serverId}/rotate-ingest-key`);
  return response.data;
};

export const getCountries = async () => {
  const response = await api.get('/countries');
  return response.data;
};

export const createCountry = async (data) => {
  const response = await api.post('/countries', data);
  return response.data;
};

export const updateCountry = async (id, data) => {
  const response = await api.put(`/countries/${id}`, data);
  return response.data;
};

export const deleteCountry = async (id) => {
  const response = await api.delete(`/countries/${id}`);
  return response.data;
};

export const getApplications = async () => {
  const response = await api.get('/applications');
  return response.data;
};

export const createApplication = async (appData) => {
  const response = await api.post('/applications', appData);
  return response.data;
};

export const updateApplication = async (appId, appData) => {
  const response = await api.put(`/applications/${appId}`, appData);
  return response.data;
};

export const deleteApplication = async (appId) => {
  const response = await api.delete(`/applications/${appId}`);
  return response.data;
};

export const getAuditLogs = async () => {
  const response = await api.get('/audit');
  return response.data;
};

export const getDashboardSummary = async () => {
  const response = await api.get('/dashboard/summary');
  return response.data;
};

export const checkAdmin = async () => {
  const response = await api.get('/check-admin');
  return response.data;
};

export const getUserGroups = async (userId) => {
  const response = await api.get(`/users/${userId}/groups`);
  return response.data;
};

export const assignUserGroup = async (userId, groupId) => {
  const response = await api.post(`/users/${userId}/groups/${groupId}`);
  return response.data;
};

export const removeUserGroup = async (userId, groupId) => {
  const response = await api.delete(`/users/${userId}/groups/${groupId}`);
  return response.data;
};

export const getAccessRequests = async () => {
  const response = await api.get('/access-requests');
  return response.data;
};

export const createAccessRequest = async (payload) => {
  const response = await api.post('/access-requests', payload);
  return response.data;
};

export const approveAccessRequest = async (id, notes) => {
  const response = await api.post(`/access-requests/${id}/approve`, { notes });
  return response.data;
};

export const rejectAccessRequest = async (id, notes) => {
  const response = await api.post(`/access-requests/${id}/reject`, { notes });
  return response.data;
};

export const getNotifications = async (params = {}) => {
  const response = await api.get('/notifications', { params });
  return response.data;
};

export const getUnreadNotificationCount = async () => {
  const response = await api.get('/notifications/unread-count');
  return response.data;
};

export const markNotificationRead = async (id) => {
  const response = await api.post(`/notifications/${id}/read`);
  return response.data;
};

export const markAllNotificationsRead = async () => {
  const response = await api.post('/notifications/read-all');
  return response.data;
};

export const getNotificationPrefs = async () => {
  const response = await api.get('/notification-prefs');
  return response.data;
};

export const updateNotificationPrefs = async (prefs) => {
  const response = await api.put('/notification-prefs', prefs);
  return response.data;
};

export default api;
