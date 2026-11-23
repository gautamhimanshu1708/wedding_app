import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { socketService } from '../services/socket.js';
import { useAuth as useClerkAuth } from '@clerk/react';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const AuthContext = createContext(null);

// ─── Helper: auto-join wedding saved in sessionStorage after QR scan ───────
async function autoJoinPendingWedding(setActiveWedding) {
  const pendingSlug = sessionStorage.getItem('royal_pending_wedding_slug');
  if (!pendingSlug) return null;

  try {
    const res = await api.post(`/weddings/slug/${pendingSlug}/join`, {});
    if (res.success) {
      const wedding = res.data.wedding;
      setActiveWedding(wedding);
      localStorage.setItem('royal_active_wedding_id', wedding._id);
      sessionStorage.removeItem('royal_pending_wedding_slug');
      sessionStorage.removeItem('royal_pending_event_id');
      return wedding;
    }
  } catch (err) {
    console.warn('[AutoJoin] Failed to join pending wedding:', err.message);
    sessionStorage.removeItem('royal_pending_wedding_slug');
  }
  return null;
}


// ─── Helper: resolve active wedding from memberships or default wedding ───────
async function resolveActiveWedding(memberships, setActiveWedding) {
  const savedId = localStorage.getItem('royal_active_wedding_id');
  const found = (memberships || []).find(
    (m) => m.weddingId?._id === savedId || m.weddingId?.slug === savedId
  );
  if (found?.weddingId) {
    setActiveWedding({ ...found.weddingId, userRole: found.role });
    return found.weddingId;
  }
  if (memberships?.[0]?.weddingId) {
    setActiveWedding({
      ...memberships[0].weddingId,
      userRole: memberships[0].role,
    });
    return memberships[0].weddingId;
  }
  try {
    const res = await api.get('/weddings/slug/royal-udaipur-2026');
    if (res.success && res.data) {
      setActiveWedding(res.data);
      return res.data;
    }
  } catch (e) {
    console.warn('[resolveActiveWedding] Fallback fetch failed:', e.message);
  }
  return null;
}

// ─── Clerk-backed provider ─────────────────────────────────────────────────
function ClerkAuthProvider({ children }) {
  const { isSignedIn, getToken, isLoaded } = useClerkAuth();
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [activeWedding, setActiveWeddingState] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectWedding = useCallback((wedding) => {
    if (!wedding) return;
    const normalized = { ...wedding, _id: wedding._id || wedding.id, id: wedding.id || wedding._id };
    setActiveWeddingState(normalized);
    localStorage.setItem('royal_active_wedding_id', normalized._id);
    socketService.joinWedding(normalized._id);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    async function syncClerkSession() {
      if (isSignedIn) {
        try {
          const token = await getToken();
          if (!token) { setLoading(false); return; }

          api.setTokenGetter(() => getToken());

          // Sync user to backend
          const syncRes = await api.post('/auth/clerk-sync', {});
          if (syncRes.success) setUser(syncRes.data.user);

          socketService.connect(token);

          // Auto-join pending wedding from QR scan
          const joined = await autoJoinPendingWedding(selectWedding);

          // Load memberships
          const meRes = await api.get('/auth/me');
          if (meRes.success) {
            setMemberships(meRes.data.memberships || []);
            if (!joined) {
              await resolveActiveWedding(meRes.data.memberships || [], selectWedding);
            }
          }
        } catch (err) {
          console.error('[ClerkSync]', err);
        }
      } else {
        api.setTokenGetter(null);
        socketService.disconnect();
        setUser(null);
        setMemberships([]);
        setActiveWeddingState(null);
      }
      setLoading(false);
    }

    syncClerkSession();
  }, [isSignedIn, isLoaded, selectWedding]);

  const refreshMemberships = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.success) { setMemberships(res.data.memberships || []); return res.data.memberships; }
    } catch (err) { console.error('refreshMemberships:', err); }
  }, []);

  const logout = useCallback(() => {
    api.setTokenGetter(null);
    localStorage.removeItem('royal_active_wedding_id');
    socketService.disconnect();
    setUser(null); setMemberships([]); setActiveWeddingState(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, memberships, activeWedding,
      setActiveWedding: selectWedding,
      loading: loading || !isLoaded,
      isAuthenticated: Boolean(user),
      loginAsGuest: async () => { throw new Error('Use Clerk sign-in.'); },
      logout, refreshMemberships,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Guest/JWT provider ────────────────────────────────────────────────────
function GuestAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [memberships, setMemberships] = useState([]);
  const [activeWedding, setActiveWeddingState] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectWedding = useCallback((wedding) => {
    if (!wedding) return;
    const normalized = { ...wedding, _id: wedding._id || wedding.id, id: wedding.id || wedding._id };
    setActiveWeddingState(normalized);
    localStorage.setItem('royal_active_wedding_id', normalized._id);
    socketService.joinWedding(normalized._id);
  }, []);

  useEffect(() => {
    async function loadSession() {
      const token = localStorage.getItem('royal_wedding_token');
      if (!token) { setLoading(false); return; }

      try {
        const res = await api.get('/auth/me');
        if (res.success) {
          setUser(res.data.user);
          setMemberships(res.data.memberships || []);
          socketService.connect(token);

          // Auto-join pending wedding from QR
          const joined = await autoJoinPendingWedding(selectWedding);

          if (!joined) {
            await resolveActiveWedding(res.data.memberships || [], selectWedding);
          }
        }
      } catch {
        localStorage.removeItem('royal_wedding_token');
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, [selectWedding]);

  const loginAsGuest = useCallback(async (name = 'Royal Guest', email = null) => {
    try {
      setLoading(true);
      const res = await api.post('/auth/guest-demo-login', { name, email });
      if (res.success && res.data.token) {
        localStorage.setItem('royal_wedding_token', res.data.token);
        setUser(res.data.user);
        socketService.connect(res.data.token);

        // Auto-join pending wedding from QR
        const joined = await autoJoinPendingWedding(selectWedding);

        try {
          const meRes = await api.get('/auth/me');
          if (meRes.success) {
            const mems = meRes.data.memberships || [];
            setMemberships(mems);
            if (!joined) {
              await resolveActiveWedding(mems, selectWedding);
            }
          }
        } catch (meErr) {
          console.warn('[loginAsGuest] me fetch error:', meErr.message);
        }

        return res.data.user;
      }
    } catch (err) {
      console.error('Guest login failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectWedding]);

  const refreshMemberships = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.success) { setMemberships(res.data.memberships || []); return res.data.memberships; }
    } catch (err) { console.error('refreshMemberships:', err); }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('royal_wedding_token');
    localStorage.removeItem('royal_active_wedding_id');
    socketService.disconnect();
    setUser(null); setMemberships([]); setActiveWeddingState(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, memberships, activeWedding,
      setActiveWedding: selectWedding,
      loading, isAuthenticated: Boolean(user),
      loginAsGuest, logout, refreshMemberships,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }) {
  if (CLERK_KEY) return <ClerkAuthProvider>{children}</ClerkAuthProvider>;
  return <GuestAuthProvider>{children}</GuestAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
