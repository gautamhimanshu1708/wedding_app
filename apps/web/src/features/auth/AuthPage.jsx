import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, IS_CLERK_ENABLED } from '../../context/AuthContext.jsx';
import {
  Crown,
  ShieldCheck,
  Users,
  CheckCircle2,
  LogOut,
  ArrowRight,
  AlertCircle,
  User,
  Mail,
} from 'lucide-react';
import { SignIn } from '@clerk/react';

class ClerkSignInBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(err) {
    console.warn('[AuthPage] Clerk SignIn fallback triggered:', err?.message || err);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialRedirect = searchParams.get('redirect') || '/live';

  // Track login mode: 'guest' or 'admin'
  const [mode, setMode] = useState(initialRedirect.includes('admin') ? 'admin' : 'guest');
  const redirectPath = mode === 'admin' ? '/admin' : (initialRedirect.includes('admin') ? '/live' : initialRedirect);

  const { isAuthenticated, user, logout, loginAsGuest } = useAuth();
  const navigate = useNavigate();

  // Native JWT Sign-In form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [preferNativeLogin, setPreferNativeLogin] = useState(!IS_CLERK_ENABLED);

  const handleNativeLogin = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setAuthError('Please enter your name to continue.');
      return;
    }

    try {
      setSubmitting(true);
      setAuthError(null);
      const loggedInUser = await loginAsGuest(trimmedName, email.trim() || null);
      if (!loggedInUser) {
        throw new Error('Unable to sign in. Please check your connection and try again.');
      }

      if (mode === 'admin') {
        localStorage.setItem('royal_admin_mode', 'true');
      } else {
        localStorage.removeItem('royal_admin_mode');
      }

      navigate(redirectPath);
    } catch (err) {
      setAuthError(err?.message || 'Sign-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const nativeLoginCard = (
    <div className="w-full max-w-sm bg-white/95 text-deepBrown rounded-3xl p-6 border-2 border-gold/40 shadow-royal-lg space-y-4 animate-fade-in">
      <div className="text-center">
        <h2 className="font-royal text-lg font-bold text-burgundy">
          {mode === 'admin' ? 'Organizer Sign In' : 'Guest Sign In'}
        </h2>
        <p className="text-[11px] text-gray-500 mt-0.5">
          {mode === 'admin'
            ? 'Enter your details, then verify your 4-digit Organizer PIN'
            : 'Enter your name to join the celebration & share photos'}
        </p>
      </div>

      {authError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2 text-left">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{authError}</span>
        </div>
      )}

      <form onSubmit={handleNativeLogin} className="space-y-3.5 text-left">
        <div>
          <label className="block text-[11px] font-semibold text-burgundy mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-goldDark absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={mode === 'admin' ? 'e.g. Aarav & Diya' : 'e.g. Rahul Sharma'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/60 bg-ivory/40 text-deepBrown"
              required
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-burgundy mb-1">
            Email Address <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-goldDark absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="email"
              placeholder="e.g. rahul@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold/60 bg-ivory/40 text-deepBrown"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            Use the same email to keep your uploads linked across sessions.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-burgundy hover:bg-burgundyLight text-gold font-bold text-xs rounded-xl shadow-royal flex items-center justify-center gap-1.5 transition disabled:opacity-60"
        >
          <span>
            {submitting
              ? 'Signing In...'
              : mode === 'admin'
              ? 'Continue to Admin Portal'
              : 'Enter Celebration'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      {IS_CLERK_ENABLED && (
        <button
          type="button"
          onClick={() => setPreferNativeLogin(false)}
          className="w-full text-[11px] text-burgundy/80 hover:text-burgundy underline text-center pt-1"
        >
          Use Clerk SSO Sign In instead
        </button>
      )}
    </div>
  );

  return (
    <div
      className="min-h-screen royal-page-bg bg-gradient-to-b from-burgundyDark via-burgundy to-deepBrown flex flex-col items-center justify-center p-4"
      style={{
        backgroundColor: '#4A1222',
        backgroundImage: 'linear-gradient(180deg, #4A1222 0%, #681D32 50%, #1F1614 100%)',
        color: '#F7F0E4',
      }}
    >
      {/* Top Brand Header */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/15 border border-gold/50 text-gold mb-2.5 shadow-royal">
          {mode === 'admin' ? <ShieldCheck className="w-7 h-7 text-gold" /> : <Crown className="w-7 h-7" />}
        </div>
        <h1
          className="font-royal text-2xl sm:text-3xl font-bold royal-text-gold-gradient"
          style={{
            background: 'linear-gradient(135deg, #FFF6E5 0%, #E2CA92 35%, #C5A15B 70%, #A6843D 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: '#E2CA92',
          }}
        >
          {mode === 'admin' ? 'Couple & Admin Portal' : 'ShadiVibes Guest Login'}
        </h1>
        <p className="text-xs text-[#E8D8BD] mt-1 max-w-xs mx-auto">
          {mode === 'admin'
            ? 'Sign in to configure ceremonies, QR access & live photo moderation'
            : 'Sign in to browse & share memories in the live feed'}
        </p>
      </div>

      {/* Mode Switcher Tabs: Guest vs Admin */}
      <div className="w-full max-w-sm mb-4 bg-black/25 p-1 rounded-2xl border border-gold/30 flex items-center shadow-inner">
        <button
          type="button"
          onClick={() => setMode('guest')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
            mode === 'guest'
              ? 'bg-gradient-to-r from-goldDark via-gold to-goldLight text-burgundy shadow-sm font-bold'
              : 'text-champagne/70 hover:text-champagne'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Guest Access</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('admin')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
            mode === 'admin'
              ? 'bg-gradient-to-r from-goldDark via-gold to-goldLight text-burgundy shadow-sm font-bold'
              : 'text-champagne/70 hover:text-champagne'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Couple &amp; Admin</span>
        </button>
      </div>

      {/* If already authenticated, show status card instead of redirect loop */}
      {isAuthenticated ? (
        <div className="w-full max-w-sm bg-white/95 rounded-3xl p-6 border border-gold/40 shadow-royal text-center space-y-4 animate-fade-in">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-700 mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-royal text-base font-bold text-deepBrown">
              Signed in as {user?.name || 'Guest'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email || 'Active Session'}</p>
          </div>

          <button
            onClick={() => {
              if (mode === 'admin') {
                localStorage.setItem('royal_admin_mode', 'true');
              } else {
                localStorage.removeItem('royal_admin_mode');
              }
              navigate(redirectPath);
            }}
            className="w-full py-3 bg-burgundy hover:bg-burgundyLight text-gold font-bold text-xs rounded-xl shadow-royal flex items-center justify-center gap-1.5 transition"
          >
            <span>Continue to {mode === 'admin' ? 'Admin Portal' : 'Live Photo Feed'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={logout}
            className="text-xs text-red-600 hover:underline font-semibold flex items-center justify-center gap-1 mx-auto pt-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out / Switch Account</span>
          </button>
        </div>
      ) : IS_CLERK_ENABLED && !preferNativeLogin ? (
        <div className="w-full max-w-md flex flex-col items-center">
          <ClerkSignInBoundary fallback={nativeLoginCard}>
            <SignIn
              routing="path"
              path="/auth"
              signUpUrl="/auth"
              fallbackRedirectUrl={redirectPath}
              forceRedirectUrl={redirectPath}
              appearance={{
                layout: { logoPlacement: 'none' },
                variables: {
                  colorPrimary: '#681D32',
                  colorBackground: '#F7F0E4',
                  colorText: '#30231F',
                  colorInputBackground: '#ffffff',
                  colorInputText: '#30231F',
                  borderRadius: '0.75rem',
                  fontFamily: 'Inter, sans-serif',
                },
                elements: {
                  card: 'shadow-royal-lg border border-gold/40 rounded-3xl bg-white/95',
                  formButtonPrimary: 'bg-burgundy hover:bg-burgundyLight text-gold font-semibold shadow-royal',
                  footerActionLink: 'text-burgundy hover:text-burgundyLight font-medium',
                },
              }}
            />
          </ClerkSignInBoundary>

          <button
            type="button"
            onClick={() => setPreferNativeLogin(true)}
            className="mt-4 text-[11px] text-champagne/70 hover:text-gold transition underline"
          >
            Having trouble with Clerk? Join with your name instead →
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md flex flex-col items-center">
          {nativeLoginCard}
        </div>
      )}

      {/* Bottom Switch Note */}
      <div className="mt-4 text-center">
        {mode === 'guest' ? (
          <button
            type="button"
            onClick={() => setMode('admin')}
            className="text-[11px] text-champagne/70 hover:text-gold transition flex items-center justify-center gap-1 mx-auto"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-gold/80" />
            <span>Are you the Couple or Wedding Manager? Switch to Admin Sign In</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMode('guest')}
            className="text-[11px] text-champagne/70 hover:text-gold transition flex items-center justify-center gap-1 mx-auto"
          >
            <Users className="w-3.5 h-3.5 text-gold/80" />
            <span>Attending as a Guest? Switch to Guest Sign In</span>
          </button>
        )}
      </div>

      <p className="mt-4 text-[10px] text-champagne/50 tracking-wide text-center">
        ShadiVibes • Private, Secure &amp; Instant Photo Sharing
      </p>
    </div>
  );
}
