import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Grid, Skeleton, Stack, Chip } from '@mui/material';
import { getDashboardSummary, getAlerts, getServers, getUsers } from '../services/api';
import { useFeedback } from '../context/FeedbackContext';

const agentTone = (live, total) => {
  if (!total) return 'default';
  if (live === total) return 'success';
  if (live === 0) return 'error';
  return 'warning';
};

const Dashboard = () => {
  const { notifyError } = useFeedback();
  const [summary, setSummary] = useState({
    alerts: 0,
    servers: 0,
    users: 0,
    agents_live: 0,
    agents_total: 0,
    agents_down: 0,
    agents_unknown: 0
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getDashboardSummary();
      setSummary({
        alerts: data.alerts ?? 0,
        servers: data.servers ?? 0,
        users: data.users ?? 0,
        agents_live: data.agents_live ?? 0,
        agents_total: data.agents_total ?? 0,
        agents_down: data.agents_down ?? 0,
        agents_unknown: data.agents_unknown ?? 0
      });
    } catch (error) {
      try {
        const [alerts, servers, users] = await Promise.all([
          getAlerts({ status: 'active' }),
          getServers(),
          getUsers()
        ]);
        const live = servers.filter((s) => s.agent_status === 'live').length;
        setSummary({
          alerts: alerts.length,
          servers: servers.filter((s) => s.is_active).length,
          users: users.filter((u) => u.is_active).length,
          agents_live: live,
          agents_total: servers.length,
          agents_down: servers.filter((s) => s.agent_status === 'down').length,
          agents_unknown: servers.filter((s) => s.agent_status === 'unknown').length
        });
      } catch (err) {
        notifyError('Failed to load dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [notifyError]);

  const tiles = [
    { label: 'Active alerts', value: summary.alerts },
    {
      label: 'Agents live',
      value: `${summary.agents_live}/${summary.agents_total}`,
      chip: agentTone(summary.agents_live, summary.agents_total),
      detail:
        summary.agents_down || summary.agents_unknown
          ? `${summary.agents_down} down · ${summary.agents_unknown} never seen`
          : null
    },
    { label: 'Active servers', value: summary.servers },
    { label: 'Active users', value: summary.users }
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={2}>
        {tiles.map((tile) => (
          <Grid item xs={12} sm={6} md={3} key={tile.label}>
            <Card
              sx={{
                borderRadius: 2,
                borderLeft: tile.chip
                  ? `4px solid ${
                      tile.chip === 'success'
                        ? '#2e7d32'
                        : tile.chip === 'error'
                          ? '#c62828'
                          : tile.chip === 'warning'
                            ? '#ed6c02'
                            : 'transparent'
                    }`
                  : undefined,
                animation: 'listEnter 320ms ease-out',
                '@keyframes listEnter': {
                  from: { opacity: 0, transform: 'translateY(8px)' },
                  to: { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              <CardContent>
                <Typography variant="body2" color="text.secondary">
                  {tile.label}
                </Typography>
                {loading ? (
                  <Skeleton width={64} height={40} />
                ) : (
                  <Stack spacing={0.5} sx={{ mt: 0.5 }}>
                    <Typography variant="h4">{tile.value}</Typography>
                    {tile.chip && (
                      <Chip
                        size="small"
                        color={tile.chip}
                        variant="outlined"
                        label={
                          tile.chip === 'success'
                            ? 'All live'
                            : tile.chip === 'error'
                              ? 'All down / unseen'
                              : 'Partial'
                        }
                        sx={{ alignSelf: 'flex-start' }}
                      />
                    )}
                    {tile.detail && (
                      <Typography variant="caption" color="text.secondary">
                        {tile.detail}
                      </Typography>
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Dashboard;
