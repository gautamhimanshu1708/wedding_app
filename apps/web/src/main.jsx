import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/react';
import { AuthProvider, IS_CLERK_ENABLED } from './context/AuthContext.jsx';
import App from './App.jsx';
import './styles/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
    },
  },
});

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Pre-warm backend API immediately in the background on initial page boot
const API_BASE = import.meta.env.VITE_API_URL || '';
if (typeof window !== 'undefined') {
  const healthUrl = API_BASE ? `${API_BASE.replace(/\/$/, '')}/api/health` : '/api/health';
  fetch(healthUrl, { method: 'GET', keepalive: true }).catch(() => {});
}

// If Clerk key is present and login is NOT paused, wrap with ClerkProvider
// Otherwise fall back to frictionless local bypass testing
function AppRoot() {
  if (IS_CLERK_ENABLED) {
    return (
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} afterSignOutUrl="/w/royal-udaipur-2026">
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ClerkProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>
);
