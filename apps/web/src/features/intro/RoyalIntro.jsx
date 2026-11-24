import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Crown,
  Sparkles,
  ArrowRight,
  Camera,
  CheckCircle2,
  QrCode,
  AlertCircle,
  Lock,
  LogOut,
} from 'lucide-react';
import { QRScannerModal } from '../qr/QRScannerModal.jsx';

export function RoyalIntro() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const directEventId = searchParams.get('event');
  const directQRToken = searchParams.get('qr');
  const navigate = useNavigate();
  const { isAuthenticated, setActiveWedding, user, logout } = useAuth();

  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [unlockedEvent, setUnlockedEvent] = useState(null);
  const [qrDeactivatedAlert, setQrDeactivatedAlert] = useState(null);

  const targetSlug = slug || 'royal-udaipur-2026';
  const isQRScanned = Boolean(
    directQRToken ||
    directEventId ||
    unlockedEvent ||
    searchParams.get('scanned') === 'true' ||
    searchParams.get('venue') === 'true'
  );

  // 1. Fetch Wedding metadata
  useEffect(() => {
    async function fetchWedding() {
      try {
        setLoading(true);
        const res = await api.get(`/weddings/slug/${targetSlug}`);
        if (res.success && res.data) {
          setWedding(res.data);
          setActiveWedding(res.data);
        }
      } catch (err) {
        console.warn('Wedding slug fetch error, using clean fallback:', err.message);
        const fallbackWedding = {
          _id: 'wedding_royal_udaipur_001',
          id: 'wedding_royal_udaipur_001',
          title: 'Royal Wedding Celebration',
          slug: 'royal-udaipur-2026',
          coupleNames: { partner1: '', partner2: '' },
          weddingDate: new Date(Date.now() + 14 * 86400000),
          venue: 'City Palace, Lake Pichola, Udaipur',
          welcomeMessage: 'Welcome to our royal wedding celebrations. Capture and share your cherished moments!',
          settings: { allowPublicQR: true, allowGuestUploads: true },
        };
        setWedding(fallbackWedding);
        setActiveWedding(fallbackWedding);
      } finally {
        setLoading(false);
      }
    }
    fetchWedding();
  }, [targetSlug, setActiveWedding]);

  // 2. If guest scanned a physical venue QR with ?qr=:token directly
  useEffect(() => {
    async function verifyDirectToken() {
      if (!directQRToken) return;
      try {
        const res = await api.get(`/qr/verify/${directQRToken}`);
        if (res.success && res.data) {
          setUnlockedEvent(res.data.event);
          sessionStorage.setItem('royal_pending_event_id', res.data.event.id);
        }
      } catch (err) {
        if (err.data?.code === 'QR_DEACTIVATED') {
          setQrDeactivatedAlert('This venue QR code has been paused by the wedding host.');
        } else {
          setQrDeactivatedAlert('Invalid or expired QR code.');
        }
      }
    }
    verifyDirectToken();
  }, [directQRToken]);

  // Handle successful camera scan from in-browser scanner
  const handleScannerResult = (data) => {
    if (data.event) {
      setUnlockedEvent(data.event);
      sessionStorage.setItem('royal_pending_event_id', data.event.id);
    }
  };

  // Navigate to live feed / event gallery
  const handleEnterGallery = async (eventId = null) => {
    const targetId = eventId || unlockedEvent?.id || directEventId;
    const destination = targetId ? `/live?eventId=${targetId}` : '/live';

    if (isAuthenticated) {
      setJoining(true);
      try {
        const joinRes = await api.post(`/weddings/slug/${targetSlug}/join`, {});
        if (joinRes.success) {
          setActiveWedding(joinRes.data.wedding);
        }
      } catch (err) {
        console.warn('Auto-join error:', err.message);
      } finally {
        setJoining(false);
      }
      navigate(destination);
    } else {
      sessionStorage.setItem('royal_pending_wedding_slug', targetSlug);
      if (targetId) {
        sessionStorage.setItem('royal_pending_event_id', targetId);
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

  // Display couple names only if actually customized by user, else graceful ShadiVibes title
  const p1 = wedding.coupleNames?.partner1?.trim();
  const p2 = wedding.coupleNames?.partner2?.trim();
  const hasCustomCouple = Boolean(p1 && p2 && p1 !== 'Partner 1' && p1 !== 'Aarav Sharma');
  const displayTitle = hasCustomCouple
    ? `${p1} & ${p2}`
    : wedding.title && wedding.title !== "Aarav & Diya's Royal Wedding"
    ? wedding.title
    : 'ShadiVibes Celebration';

  // If couple has not customized their date yet, dynamically display today's current date
  const formattedDate = (hasCustomCouple && wedding.weddingDate)
    ? new Date(wedding.weddingDate).toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date().toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  return (
    <div
      className="min-h-screen royal-page-bg bg-gradient-to-b from-burgundyDark via-burgundy to-deepBrown flex flex-col justify-between p-6 text-ivory relative overflow-hidden select-none"
      style={{
        backgroundColor: '#4A1222',
        backgroundImage: 'linear-gradient(180deg, #4A1222 0%, #681D32 50%, #1F1614 100%)',
        color: '#F7F0E4',
      }}
    >
      {/* Decorative Royal Corner Arches */}
      <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-gold/40 rounded-br-full pointer-events-none opacity-40" />
      <div className="absolute top-0 right-0 w-32 h-32 border-t-2 border-r-2 border-gold/40 rounded-bl-full pointer-events-none opacity-40" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-b-2 border-l-2 border-gold/40 rounded-tr-full pointer-events-none opacity-40" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-gold/40 rounded-tl-full pointer-events-none opacity-40" />

      {/* Floating Animated Golden Particles & Sparkles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {[
          { left: '10%', delay: '0s', size: 'w-2 h-2' },
          { left: '22%', delay: '1.2s', size: 'w-2.5 h-2.5' },
          { left: '38%', delay: '0.5s', size: 'w-1.5 h-1.5' },
          { left: '55%', delay: '2.4s', size: 'w-2 h-2' },
          { left: '70%', delay: '1.0s', size: 'w-3 h-3' },
          { left: '85%', delay: '1.8s', size: 'w-2 h-2' },
          { left: '15%', delay: '3.0s', size: 'w-2.5 h-2.5' },
          { left: '78%', delay: '3.6s', size: 'w-1.5 h-1.5' },
        ].map((p, idx) => (
          <div
            key={idx}
            className="absolute bottom-[-10px] rounded-full bg-gradient-to-t from-gold via-yellow-200 to-white animate-float-particle opacity-80"
            style={{
              left: p.left,
              animationDelay: p.delay,
              width: p.size.includes('3') ? '8px' : p.size.includes('2.5') ? '6px' : '4px',
              height: p.size.includes('3') ? '8px' : p.size.includes('2.5') ? '6px' : '4px',
              boxShadow: '0 0 8px rgba(226, 202, 146, 0.9)',
            }}
          />
        ))}
      </div>

      {/* Top Bar */}
      <div className="flex items-center justify-between z-10 safe-top">
        <div className="flex items-center gap-1.5 text-gold text-xs tracking-widest uppercase font-semibold">
          <Sparkles className="w-4 h-4 text-gold animate-spin-slow" />
          <span>ShadiVibes</span>
        </div>

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#E8D8BD] font-medium hidden sm:inline">
              Guest: {user?.name || 'Signed In'}
            </span>
            <button
              onClick={async () => {
                if (logout) await logout();
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="text-[11px] text-[#E8D8BD]/90 hover:text-red-300 transition font-medium px-2.5 py-1 rounded-full border border-gold/30 bg-burgundy/40 flex items-center gap-1"
              title="Sign out of current account"
            >
              <LogOut className="w-3 h-3" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate(`/auth?redirect=/live&slug=${targetSlug}`)}
            className="text-xs text-[#E8D8BD] hover:text-[#FFF6E5] transition font-medium px-3 py-1.5 rounded-full border border-gold/40 bg-gold/10"
          >
            Sign In
          </button>
        )}
      </div>

      {/* Centerpiece: Royal Invitation & Entry Card */}
      <div className="my-auto z-10 max-w-sm mx-auto text-center py-4 px-3 w-full">
        {/* Animated Royal Crest with Glowing Aura */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full bg-gold/20 blur-xl animate-pulse-gold scale-125" />
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-goldDark via-gold to-goldLight p-[2px] shadow-gold-glow animate-float-gentle">
            <div className="w-full h-full rounded-full bg-burgundyDark flex items-center justify-center border border-gold/40">
              <Crown className="w-10 h-10 text-gold drop-shadow-[0_2px_8px_rgba(226,202,146,0.6)]" />
            </div>
          </div>
        </div>

        <p className="text-[11px] uppercase tracking-[0.25em] text-[#E8D8BD] font-semibold mb-2">
          Cordially Inviting You To Celebrate
        </p>

        <h1
          className="font-royal text-3xl sm:text-4xl font-bold leading-tight mb-2 tracking-wide royal-text-gold-gradient"
          style={{
            background: 'linear-gradient(135deg, #FFF6E5 0%, #E2CA92 35%, #C5A15B 70%, #A6843D 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: '#E2CA92',
          }}
        >
          {displayTitle}
        </h1>

        <div className="text-[13px] text-[#F2E8D7] space-y-1 mb-6">
          <p className="font-semibold text-[#F2E8D7] tracking-wide">{formattedDate}</p>
          {isQRScanned ? (
            <p className="text-[#E8D8BD] font-medium animate-fade-in flex items-center justify-center gap-1.5">
              <span>📍 {wedding.venue || 'City Palace, Lake Pichola, Udaipur'}</span>
            </p>
          ) : (
            <p className="text-[#E8D8BD] font-medium italic tracking-wide">
              Capture, Celebrate &amp; Share Every Magical Moment
            </p>
          )}
        </div>

        {/* Deactivated QR Banner if any */}
        {qrDeactivatedAlert && (
          <div className="p-3 bg-red-900/60 border border-red-400/40 rounded-2xl mb-4 text-xs text-red-200 flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{qrDeactivatedAlert}</span>
          </div>
        )}

        {/* UNLOCKED EVENT BANNER IF SCANNED */}
        {unlockedEvent ? (
          <div className="bg-gradient-to-b from-burgundyLight/80 to-burgundy/90 border-2 border-gold p-4 rounded-2xl shadow-royal mb-4 text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-400 mb-1 border border-green-400/40">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <p className="text-[10px] text-[#E8D8BD] uppercase font-bold tracking-wider">
              Ceremony Unlocked
            </p>
            <h3 className="font-royal text-base font-bold text-gold">
              {unlockedEvent.name}
            </h3>
          </div>
        ) : null}

        {/* PRIMARY ACTIONS: Login as Guest + Camera Scan */}
        <div className="space-y-3 max-w-xs mx-auto">
          {/* Main "Login as Guest" Button */}
          <button
            onClick={() => handleEnterGallery()}
            disabled={joining}
            style={{
              background: 'linear-gradient(135deg, #FFF3D6 0%, #E2CA92 35%, #C5A15B 70%, #A6843D 100%)',
              color: '#2B0E17',
              boxShadow: '0 0 25px rgba(226, 202, 146, 0.45), 0 8px 24px rgba(0,0,0,0.5)',
            }}
            className="w-full py-4 px-6 rounded-2xl font-bold text-sm shadow-royal-lg hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2.5 group border-2 border-gold/60"
          >
            <Sparkles className="w-5 h-5 text-[#2B0E17] shrink-0" />
            <span className="tracking-wide text-sm font-extrabold uppercase">
              {joining ? 'Opening Celebration...' : 'Login as Guest'}
            </span>
            <ArrowRight className="w-4 h-4 text-[#2B0E17] group-hover:translate-x-1 transition-transform shrink-0" />
          </button>

          {/* Scan Venue QR Code Option */}
          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="w-full py-3 px-4 rounded-xl text-xs font-semibold border border-gold/30 bg-burgundy/50 hover:bg-burgundy/80 text-[#E8D8BD] hover:text-white flex items-center justify-center gap-2 transition"
          >
            <Camera className="w-4 h-4 text-gold" />
            <span>Scan Ceremony QR at Venue</span>
          </button>
        </div>

        {/* Organizer / Admin Portal Link (PIN Protected) */}
        <div className="mt-6 pt-4 border-t border-[#C5A15B]/20">
          <button
            onClick={() => navigate('/auth?redirect=/admin')}
            className="text-xs text-[#E8D8BD]/80 hover:text-gold transition flex items-center justify-center gap-1.5 mx-auto font-medium"
          >
            <Lock className="w-3.5 h-3.5 text-gold/80" />
            <span>Couple &amp; Organizer Access (PIN Protected)</span>
          </button>
        </div>
      </div>

      <footer className="text-center text-[11px] text-[#E8D8BD]/70 font-medium z-10 safe-pb">
        <p>ShadiVibes • Live &amp; Private Wedding Moments</p>
      </footer>

      {/* QR Scanner Camera Modal */}
      <QRScannerModal
        isOpen={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanSuccess={handleScannerResult}
      />
    </div>
  );
}
