import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Crown, ShieldCheck, Users } from 'lucide-react';
import { SignIn } from '@clerk/react';

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const initialRedirect = searchParams.get('redirect') || '/live';
  
  // Track login mode: 'guest' or 'admin'
  const [mode, setMode] = useState(initialRedirect.includes('admin') ? 'admin' : 'guest');
  const redirectPath = mode === 'admin' ? '/admin' : (initialRedirect.includes('admin') ? '/live' : initialRedirect);

  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If already authenticated, redirect to the destination immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectPath]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundyDark via-burgundy to-deepBrown flex flex-col items-center justify-center p-4">
      {/* Top Brand Header */}
      <div className="mb-4 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gold/15 border border-gold/50 text-gold mb-2.5 shadow-royal">
          {mode === 'admin' ? <ShieldCheck className="w-7 h-7 text-gold" /> : <Crown className="w-7 h-7" />}
        </div>
        <h1 className="font-royal text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-goldLight via-gold to-goldDark">
          {mode === 'admin' ? 'Couple & Admin Portal' : 'Royal Wedding Access'}
        </h1>
        <p className="text-xs text-champagne/80 mt-1 max-w-xs mx-auto">
          {mode === 'admin'
            ? 'Sign in to configure ceremonies, QR access & live photo moderation'
            : 'Sign in or sign up to browse & share memories in the live feed'}
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

      {/* Clerk Sign In Widget */}
      <div className="w-full max-w-md flex justify-center">
        <SignIn
          routing="hash"
          afterSignInUrl={redirectPath}
          afterSignUpUrl={redirectPath}
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
              card: 'shadow-royal-lg border border-gold/40 rounded-3xl',
              formButtonPrimary: 'bg-burgundy hover:bg-burgundyLight text-gold font-semibold shadow-royal',
              footerActionLink: 'text-burgundy hover:text-burgundyLight font-medium',
              headerTitle: 'hidden',
              headerSubtitle: 'hidden',
            },
          }}
        />
      </div>

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
        Royal Wedding Photo Sharing Platform • Private, Secure &amp; Instant
      </p>
    </div>
  );
}
