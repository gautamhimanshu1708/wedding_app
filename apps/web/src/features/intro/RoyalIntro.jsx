import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { Crown, Sparkles, ArrowRight, Camera, CheckCircle2, QrCode, AlertCircle, HardDrive } from 'lucide-react';
import { GoldDivider } from '../../components/common/OrnamentalBorder.jsx';
import { QRScannerModal } from '../qr/QRScannerModal.jsx';

export function RoyalIntro() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const directEventId = searchParams.get('event');
  const directQRToken = searchParams.get('qr');
  const navigate = useNavigate();
  const { isAuthenticated, setActiveWedding, user } = useAuth();

  const [wedding, setWedding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [unlockedEvent, setUnlockedEvent] = useState(null);
  const [qrDeactivatedAlert, setQrDeactivatedAlert] = useState(null);

  const targetSlug = slug || 'royal-udaipur-2026';

  // 1. Fetch Wedding metadata
  useEffect(() => {
    async function fetchWedding() {
      try {
        setLoading(true);
        const res = await api.get(`/weddings/slug/${targetSlug}`);
        if (res.success) {
          setWedding(res.data);
          setActiveWedding(res.data);
        }
      } catch (err) {
        console.warn('Wedding slug fetch error, using resilient fallback:', err.message);
        // Resilient fallback so the wedding space is always accessible
        const fallbackWedding = {
          _id: 'wedding_royal_udaipur_001',
          id: 'wedding_royal_udaipur_001',
          title: "Aarav & Diya's Royal Wedding",
          slug: 'royal-udaipur-2026',
          coupleNames: { partner1: 'Aarav Sharma', partner2: 'Diya Verma' },
          weddingDate: new Date(Date.now() + 14 * 86400000),
          venue: 'City Palace, Lake Pichola, Udaipur',
          welcomeMessage: 'Padharo mhare des! Welcome to our royal wedding celebrations. Capture and share your cherished moments with us!',
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

        {isAuthenticated ? (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-champagne/80 font-medium hidden sm:inline">
              Welcome, {user?.name || 'Guest'}
            </span>
            <button
              onClick={() => handleEnterGallery()}
              className="text-xs text-champagne/90 hover:text-gold transition font-medium px-3 py-1 rounded-full border border-gold/30 hover:border-gold/60"
            >
              All Photos →
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate(`/auth?redirect=/live&slug=${targetSlug}`)}
            className="text-xs text-champagne/90 hover:text-gold transition font-medium px-3 py-1.5 rounded-full border border-gold/40 bg-gold/10"
          >
            Guest Login
          </button>
        )}
      </div>

      {/* Main Royal Card */}
      <div className="my-auto z-10 max-w-sm mx-auto text-center py-4 px-3 w-full">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gold/15 border border-gold/60 text-gold mb-4 shadow-gold-glow animate-pulse">
          <Crown className="w-8 h-8" />
        </div>

        <p className="text-[10px] uppercase tracking-[0.25em] text-champagne/90 font-medium mb-1">
          Cordially Inviting You To Celebrate
        </p>

        <h1 className="font-royal text-2xl sm:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-goldLight via-gold to-goldDark leading-tight mb-2">
          {coupleNames}
        </h1>

        <div className="text-[11px] text-champagne/80 space-y-0.5 mb-4">
          <p className="font-medium text-champagne">{formattedDate}</p>
          <p className="text-champagne/60">{wedding.venue}</p>
        </div>

        {/* Deactivated QR Banner if any */}
        {qrDeactivatedAlert && (
          <div className="p-3 bg-red-900/60 border border-red-400/40 rounded-2xl mb-4 text-xs text-red-200 flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{qrDeactivatedAlert}</span>
          </div>
        )}

        {/* UNLOCKED EVENT STATE */}
        {unlockedEvent ? (
          <div className="bg-gradient-to-b from-burgundyLight/80 to-burgundy/90 border-2 border-gold p-5 rounded-3xl shadow-royal mb-4 text-center animate-fade-in">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 text-green-400 mb-2 border border-green-400/40">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-[11px] text-champagne uppercase font-bold tracking-wider">
              Ceremony Unlocked
            </p>
            <h3 className="font-royal text-xl font-bold text-gold mt-0.5">
              {unlockedEvent.name}
            </h3>
            {unlockedEvent.description && (
              <p className="text-xs text-champagne/80 mt-1 line-clamp-2">
                {unlockedEvent.description}
              </p>
            )}

            <button
              onClick={() => handleEnterGallery(unlockedEvent.id)}
              disabled={joining}
              className="mt-4 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-goldDark via-gold to-goldLight text-burgundy font-bold text-xs shadow-royal-lg hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-1.5"
            >
              <span>{joining ? 'Entering...' : `Enter ${unlockedEvent.name} Photos`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* NO EVENT SELECTED YET - SCANNER PROMPT */
          <div className="bg-black/30 border border-gold/30 rounded-3xl p-5 mb-5 shadow-inner backdrop-blur-sm">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gold/15 text-gold border border-gold/40 mb-3">
              <QrCode className="w-6 h-6 text-gold" />
            </div>

            <h3 className="font-royal text-base font-bold text-gold mb-1">
              No Ceremony Selected Yet
            </h3>
            <p className="text-xs text-champagne/80 leading-relaxed max-w-xs mx-auto mb-4">
              To view &amp; upload photographs for a ceremony, please scan the QR code placed at your venue table or event banner.
            </p>

            {/* In-Browser QR Scanner Button */}
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-goldDark via-gold to-goldLight text-burgundy font-bold text-xs shadow-royal hover:brightness-110 active:scale-95 transition flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4 text-burgundy stroke-[2.5]" />
              <span>📷 Scan Ceremony QR at Venue</span>
            </button>
          </div>
        )}

        {/* Secondary: General Wedding Photos Feed */}
        <button
          onClick={() => handleEnterGallery()}
          disabled={joining}
          className="text-xs text-champagne/70 hover:text-gold transition font-medium flex items-center justify-center gap-1.5 mx-auto hover:underline"
        >
          <span>Or explore the general wedding photo feed →</span>
        </button>

        {/* Couple & Admin Portal Entry */}
        <div className="mt-5 pt-4 border-t border-gold/20">
          <button
            onClick={() => navigate('/auth?redirect=/admin')}
            className="text-[11px] text-champagne/60 hover:text-gold transition flex items-center justify-center gap-1 mx-auto"
          >
            <Crown className="w-3.5 h-3.5 text-gold" />
            <span>Couple / Admin Portal Login</span>
          </button>
        </div>
      </div>

      <footer className="text-center text-[10px] text-champagne/50 z-10 safe-pb">
        <p>Royal Wedding Photo Sharing Platform • Fast &amp; Private</p>
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
