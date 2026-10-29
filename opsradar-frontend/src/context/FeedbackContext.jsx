import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';

const FeedbackContext = createContext(null);

export function FeedbackProvider({ children }) {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const showToast = useCallback((message, severity = 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  const notifyError = useCallback((message) => showToast(message || 'Something went wrong', 'error'), [showToast]);
  const notifySuccess = useCallback((message) => showToast(message || 'Saved', 'success'), [showToast]);
  const notifyInfo = useCallback((message) => showToast(message, 'info'), [showToast]);

  const value = useMemo(
    () => ({ showToast, notifyError, notifySuccess, notifyInfo }),
    [showToast, notifyError, notifySuccess, notifyInfo]
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={4500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return ctx;
}
