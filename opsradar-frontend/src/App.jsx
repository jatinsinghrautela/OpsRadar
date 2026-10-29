import React from 'react';
import { CssBaseline } from '@mui/material';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import TotpSetup from './pages/TotpSetup';
import AppShell from './components/AppShell';
import { ThemeProviderWrapper } from './context/ThemeContext';
import { FeedbackProvider } from './context/FeedbackContext';
import { isAuthenticated } from './utils/auth';

const PrivateRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <ThemeProviderWrapper>
      <FeedbackProvider>
        <CssBaseline />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="/totp-setup" element={<TotpSetup />} />
            <Route
              path="*"
              element={
                <PrivateRoute>
                  <AppShell />
                </PrivateRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </FeedbackProvider>
    </ThemeProviderWrapper>
  );
}

export default App;
