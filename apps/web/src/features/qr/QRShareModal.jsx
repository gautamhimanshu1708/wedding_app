import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Copy, Check, Share2, Sparkles } from 'lucide-react';
import { GoldDivider } from '../../components/common/OrnamentalBorder.jsx';

export function QRShareModal({ wedding, event, onClose }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const targetUrl = event
    ? `${window.location.origin}/w/${wedding.slug}?event=${event._id}`
    : `${window.location.origin}/w/${wedding.slug}`;

  useEffect(() => {
    async function generateQR() {
      try {
        const url = await QRCode.toDataURL(targetUrl, {
          width: 320,
          margin: 2,
          color: {
            dark: '#681D32', // Burgundy QR pattern
            light: '#FDFBF7', // Ivory background
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('QR code generation failed:', err);
      }
    }
    if (wedding) {
      generateQR();
    }
  }, [wedding, event, targetUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${wedding.title} — Royal Photo Gallery`,
        text: `Scan and share your cherished wedding photos for ${wedding.coupleNames?.partner1} & ${wedding.coupleNames?.partner2}!`,
        url: targetUrl,
      }).catch(() => {});
    } else {
      handleCopy();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-ivory rounded-3xl max-w-sm w-full p-6 border-2 border-gold/60 shadow-royal-lg text-center relative animate-scaleIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-deepBrown/60 hover:text-deepBrown rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold/20 text-gold mb-2 border border-gold/40">
          <Sparkles className="w-6 h-6 text-burgundy" />
        </div>

        <h3 className="font-royal text-xl font-bold text-burgundy">
          {wedding.coupleNames?.partner1} & {wedding.coupleNames?.partner2}
        </h3>
        <p className="text-xs text-goldDark font-medium mt-0.5">
          {event ? `${event.name} Event QR Code` : 'Royal Wedding Guest Entry QR'}
        </p>

        <GoldDivider className="my-3" />

        {/* QR Code Container with Royal Gold Border */}
        <div className="p-3 bg-white rounded-2xl border border-gold/40 shadow-royal inline-block my-2">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="Wedding QR Code" className="w-56 h-56 mx-auto rounded-lg" />
          ) : (
            <div className="w-56 h-56 flex items-center justify-center text-xs text-gray-400">
              Generating royal QR...
            </div>
          )}
        </div>

        <p className="text-[11px] text-deepBrown/80 mt-2 px-4">
          Scan using any mobile smartphone camera to instantly enter the live wedding photo feed.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-5">
          <button
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-gold/60 bg-white hover:bg-champagne/30 text-xs font-semibold text-deepBrown transition"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-goldDark" />}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleNativeShare}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-burgundy hover:bg-burgundyLight text-xs font-semibold text-ivory shadow-royal transition"
          >
            <Share2 className="w-4 h-4 text-gold" />
            <span>Share QR</span>
          </button>
        </div>
      </div>
    </div>
  );
}
