import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Camera, RefreshCw, AlertCircle, CheckCircle2, UploadCloud } from 'lucide-react';
import { api } from '../../services/api.js';

export function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successData, setSuccessData] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setErrorMsg(null);
      setSuccessData(null);
      return;
    }

    const timer = setTimeout(() => {
      startScanner();
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    setErrorMsg(null);
    try {
      const element = document.getElementById('qr-reader-container');
      if (!element) return;

      const html5QrCode = new Html5Qrcode('qr-reader-container');
      html5QrCodeRef.current = html5QrCode;

      const qrCodeSuccessCallback = async (decodedText) => {
        // Prevent duplicate processing
        if (verifying || successData) return;
        await handleDecodedData(decodedText);
      };

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        qrCodeSuccessCallback,
        () => {
          // Ignore periodic frame scan errors
        }
      );
      setScanning(true);
    } catch (err) {
      console.warn('Camera scan start failed:', err);
      setErrorMsg(
        'Unable to access camera. Please allow camera permissions, or upload a photo of the QR code below.'
      );
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (e) {
        // Safe to ignore
      }
    }
    setScanning(false);
  };

  const handleDecodedData = async (rawText) => {
    setVerifying(true);
    setErrorMsg(null);

    try {
      const cleanText = rawText ? rawText.trim() : '';

      // 1. Check if rawText contains a direct QR token
      let token = null;
      if (cleanText.includes('qr=')) {
        try {
          const url = new URL(cleanText.startsWith('http') ? cleanText : `https://${cleanText}`);
          token = url.searchParams.get('qr');
        } catch (e) {
          const match = cleanText.match(/qr=([^&]+)/);
          if (match) token = match[1];
        }
      } else if (cleanText.includes('/verify/')) {
        const parts = cleanText.split('/verify/');
        token = parts[1]?.split('?')[0];
      }

      // 2. If it's a general wedding space URL without a ceremony token
      if (!token && (cleanText.includes('/w/') || cleanText.startsWith('http'))) {
        const match = cleanText.match(/\/w\/([a-zA-Z0-9_-]+)/);
        if (match) {
          const slug = match[1];
          const wedRes = await api.get(`/weddings/slug/${slug}`);
          if (wedRes.success && wedRes.data) {
            setSuccessData({ wedding: wedRes.data });
            await stopScanner();
            setTimeout(() => {
              if (onScanSuccess) {
                onScanSuccess({ wedding: wedRes.data });
              }
              onClose();
            }, 1000);
            return;
          }
        }
        throw new Error('This QR code is not linked to an active ceremony.');
      }

      // 3. Fallback: bare token string
      if (!token) {
        token = cleanText;
      }

      if (!token || token.startsWith('http')) {
        throw new Error('Unrecognized or invalid QR code format.');
      }

      // Verify token with backend
      const res = await api.get(`/qr/verify/${encodeURIComponent(token)}`);

      if (res.success && res.data) {
        setSuccessData(res.data);
        await stopScanner();

        setTimeout(() => {
          if (onScanSuccess) {
            onScanSuccess(res.data);
          }
          onClose();
        }, 1200);
      } else {
        throw new Error(res.error || 'Failed to verify QR code');
      }
    } catch (err) {
      const message = err.data?.error || err.message || 'Invalid or inactive QR code.';
      setErrorMsg(message);
    } finally {
      setVerifying(false);
    }
  };

  // Allow uploading a photo of a QR code as a fallback
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMsg(null);
      setVerifying(true);
      const html5QrCode = new Html5Qrcode('qr-reader-container');
      const result = await html5QrCode.scanFile(file, true);
      await handleDecodedData(result);
    } catch (err) {
      setErrorMsg('No readable QR code found in this image. Please try another photo.');
      setVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-white rounded-3xl overflow-hidden shadow-2xl border border-gold/40">
        {/* Header */}
        <div className="bg-burgundy text-ivory p-4 flex items-center justify-between border-b border-gold/30">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-gold" />
            <h3 className="font-royal font-bold text-sm text-gold">Scan Ceremony QR</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-champagne hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport Area */}
        <div className="relative bg-black flex flex-col items-center justify-center min-h-[300px] overflow-hidden">
          <div id="qr-reader-container" className="w-full h-full min-h-[280px]" />

          {/* Viewfinder Target Border Overlay */}
          {!successData && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative w-56 h-56 border-2 border-gold/80 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                {/* Gold corner accents */}
                <span className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-gold rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-gold rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-gold rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-gold rounded-br-lg" />

                {/* Animated Scanner laser bar */}
                {scanning && !verifying && (
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-gold to-transparent animate-pulse shadow-[0_0_8px_#C5A15B]" />
                )}
              </div>
            </div>
          )}

          {/* Verifying Spinner Overlay */}
          {verifying && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-ivory z-20">
              <RefreshCw className="w-8 h-8 text-gold animate-spin mb-2" />
              <p className="text-xs font-royal text-gold font-bold">Verifying Ceremony QR...</p>
            </div>
          )}

          {/* Success Checkmark Overlay */}
          {successData && (
            <div className="absolute inset-0 bg-burgundy/90 flex flex-col items-center justify-center text-ivory p-6 text-center z-30 animate-fade-in">
              <CheckCircle2 className="w-14 h-14 text-green-400 mb-2" />
              <h4 className="font-royal text-lg font-bold text-gold">Access Unlocked!</h4>
              <p className="text-sm font-semibold text-white mt-1">
                {successData.event?.name}
              </p>
              <p className="text-[11px] text-champagne/80 mt-1">
                Entering live event feed &amp; gallery...
              </p>
            </div>
          )}
        </div>

        {/* Footer & Controls */}
        <div className="p-4 bg-ivory space-y-3">
          {errorMsg ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Unable to unlock</p>
                <p className="text-[11px] text-red-600 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-deepBrown/70 font-medium">
              Point your camera at any printed ceremony QR code at the venue.
            </p>
          )}

          {/* Image Upload Fallback Button */}
          <div className="flex items-center justify-center pt-1 border-t border-gold/20">
            <label className="cursor-pointer flex items-center gap-1.5 text-xs text-burgundy hover:text-burgundyDark font-semibold transition">
              <UploadCloud className="w-4 h-4 text-goldDark" />
              <span>Upload QR image from gallery</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
