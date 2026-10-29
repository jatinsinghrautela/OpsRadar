import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { Routes, Route } from 'react-router-dom';
import Sidebar, { DRAWER_WIDTH } from './Sidebar';
import Navbar from './Navbar';
import PageFade from './PageFade';
import Dashboard from '../pages/Dashboard';
import Alerts from '../pages/Alerts';
import Servers from '../pages/Servers';
import Countries from '../pages/Countries';
import Requests from '../pages/Requests';
import AccessRequests from '../pages/AccessRequests';
import Groups from '../pages/Groups';
import Users from '../pages/Users';
import Audit from '../pages/Audit';
import Settings from '../pages/Settings';
import Applications from '../pages/Applications';

export default function AppShell() {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        isMdUp={isMdUp}
      />
      <Box
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Navbar showMenu={!isMdUp} onMenuClick={() => setMobileOpen(true)} />
        <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 2.5, md: 3 } }}>
          <PageFade>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/servers" element={<Servers />} />
              <Route path="/countries" element={<Countries />} />
              <Route path="/requests" element={<Requests />} />
              <Route path="/access" element={<AccessRequests />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/users" element={<Users />} />
              <Route path="/audit" element={<Audit />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/applications" element={<Applications />} />
            </Routes>
          </PageFade>
        </Box>
      </Box>
    </Box>
  );
}
