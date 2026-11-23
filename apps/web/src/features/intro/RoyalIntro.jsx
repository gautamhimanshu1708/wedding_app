import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Crown, Sparkles, ArrowRight, Heart } from 'lucide-react';
import { GoldDivider } from '../../components/common/OrnamentalBorder.jsx';

export function RoyalIntro() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const targetEventId = searchParams.get('event');
  const navigate = useNavigate();
  const { isAuthenticated, setActiveWedding, user } = useAuth();

  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);

  const targetSlug = slug || 'royal-udaipur-2026';

  useEffect(() => {
    async function fetchWedding() {
      try {
        setLoading(true);
        const res = await api.get(`/weddings/slug/${targetSlug}`);
        if (res.success) {
          setWedding(res.data);
        }
      } catch (err) {
        console.warn('Wedding slug fetch error:', err.message);
        setError('Wedding not found or link has changed.');
      } finally {
        setLoading(false);
      }
    }
    fetchWedding();
  }, [targetSlug]);

  const handleEnter = async () => {
    const destination = targetEventId ? `/events/${targetEventId}` : '/live';

    if (isAuthenticated) {
      // Already authenticated — join wedding immediately
      setJoining(true);
      try {
        const joinRes = await api.post(`/weddings/slug/${targetSlug}/join`, {});
        if (joinRes.success) {
          setActiveWedding(joinRes.data.wedding);
        }
      } catch (err) {
        console.warn('Auto-join failed:', err.message);
        // Still navigate — membership middleware will create it
      } finally {
        setJoining(false);
      }
      navigate(destination);
    } else {
      // Save wedding context for after-auth auto-join
      sessionStorage.setItem('royal_pending_wedding_slug', targetSlug);
      if (targetEventId) {
        sessionStorage.setItem('royal_pending_event_id', targetEventId);
      }
      navigate(`/auth?redirect=${encodeURIComponent(destination)}&slug=${targetSlug}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-burgundy flex flex-col items-center justify-center p-6 text-ivory">
        <Crown className="w-12 h-12 text-gold animate-bounce" />
        <p className="font-royal text-base text-gold mt-4 tracking-widest uppercase">
          Opening Royal Celebration...
        </p>
      </div>
    );
  }

  if (error || !wedding) {
    return (
      <div className="min-h-screen bg-ivory flex flex-col items-center justify-center p-6 text-center">
        <Crown className="w-12 h-12 text-burgundy mb-4" />
        <h2 className="font-royal text-2xl text-burgundy font-bold mb-2">Wedding Space Not Found</h2>
        <p className="text-xs text-deepBrown/80 mb-6 max-w-xs">
          The requested wedding gallery does not exist or may have been renamed.
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="px-6 py-2.5 rounded-xl bg-burgundy text-gold font-medium text-xs shadow-royal"
        >
          Return to Portal
        </button>
      </div>
    );
  }

  const coupleNames = `${wedding.coupleNames?.partner1 || 'Partner 1'} & ${wedding.coupleNames?.partner2 || 'Partner 2'}`;
  const formattedDate = wedding.weddingDate
    ? new Date(wedding.weddingDate).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Auspicious Date';

  return (
    <div className="min-h-screen bg-gradient-to-b from-burgundyDark via-burgundy to-deepBrown flex flex-col justify-between p-6 text-ivory relative overflow-hidden select-none">
      {/* Decorative Royal Corner Arches */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-gold/40 rounded-br-full pointer-events-none opacity-40" />
      <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-gold/40 rounded-bl-full pointer-events-none opacity-40" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-gold/40 rounded-tr-full pointer-events-none opacity-40" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-gold/40 rounded-tl-full pointer-events-none opacity-40" />

      {/* Top Bar */}
      <div className="flex items-center justify-between z-10 safe-top">
        <div className="flex items-center gap-1.5 text-gold text-xs tracking-widest uppercase font-semibold">
          <Sparkles className="w-4 h-4" />
          <span>Royal Wedding</span>
        </div>
        <button
          onClick={handleEnter}
          disabled={joining}
          className="text-xs text-champagne/80 hover:text-gold transition font-medium px-3 py-1.5 rounded-full border border-gold/30 hover:border-gold/60"
        >
          {joining ? 'Joining...' : 'Skip Intro →'}
        </button>
      </div>

      {/* Main Royal Card */}
      <div className="my-auto z-10 max-w-sm mx-auto text-center py-6 px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gold/15 border border-gold/60 text-gold mb-6 shadow-gold-glow animate-pulse">
          <Crown className="w-10 h-10" />
        </div>

        <p className="text-[11px] uppercase tracking-[0.25em] text-champagne/90 font-medium mb-2">
          Cordially Inviting You To Celebrate
        </p>

        <h1 className="font-royal text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-goldLight via-gold to-goldDark leading-tight mb-3">
          {coupleNames}
        </h1>

        <GoldDivider className="my-4" />

        <div className="space-y-1 mb-6">
          <p className="text-sm font-medium text-champagne">{formattedDate}</p>
          <p className="text-xs text-champagne/70">{wedding.venue}</p>
        </div>

        <p className="text-xs text-ivory/80 leading-relaxed max-w-xs mx-auto italic bg-black/20 p-3.5 rounded-2xl border border-gold/20 mb-8">
          "{wedding.welcomeMessage || 'Join us in capturing and sharing every auspicious moment of our wedding.'}"
        </p>

        {/* CTA */}
        <button
          onClick={handleEnter}
          disabled={joining}
          className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-goldDark via-gold to-goldLight text-burgundy font-bold text-sm shadow-royal-lg hover:brightness-110 active:scale-95 transition disabled:opacity-70"
        >
          <span>
            {joining ? 'Joining Celebration...' : isAuthenticated ? 'Enter Live Gallery' : 'Join Celebration'}
          </span>
          {!joining && <ArrowRight className="w-4 h-4 stroke-[2.5]" />}
        </button>

        {/* QR open indicator */}
        {wedding.settings?.allowPublicQR !== false && (
          <p className="text-[10px] text-champagne/50 mt-3 flex items-center justify-center gap-1">
            <span>✓</span>
            <span>Open to all guests with this link</span>
          </p>
        )}

        {/* Couple & Admin Portal Entry */}
        <button
          onClick={() => navigate('/auth?redirect=/admin')}
          className="mt-3 text-[11px] text-champagne/70 hover:text-gold transition underline flex items-center justify-center gap-1 mx-auto"
        >
          <Crown className="w-3.5 h-3.5 text-gold" />
          <span>Are you the Couple? Enter Admin Portal →</span>
        </button>
      </div>

      <footer className="text-center text-[10px] text-champagne/60 z-10 safe-pb">
        <p>Royal Wedding Photo Sharing Platform • Fast & Private</p>
      </footer>
    </div>
  );
}
