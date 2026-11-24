import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Share2,
  Sparkles,
  Plus,
  Power,
  Trash2,
  Download,
  AlertCircle,
  QrCode as QrIcon,
} from 'lucide-react';
import { GoldDivider } from '../../components/common/OrnamentalBorder.jsx';
import { api } from '../../services/api.js';

export function QRShareModal({ wedding, event, onClose }) {
  const [qrcodes, setQrcodes] = useState([]);
  const [selectedQR, setSelectedQR] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const weddingId = wedding?._id || wedding?.id;
  const eventId = event?._id || event?.id;

  // Load event QR codes from backend if this is an event QR modal
  useEffect(() => {
    async function loadQRCodes() {
      if (!weddingId || !eventId) return;
      try {
        setLoadingList(true);
        const res = await api.get(`/qr/weddings/${weddingId}/events/${eventId}/qrcodes`);
        if (res.success && res.data) {
          setQrcodes(res.data);
          if (res.data.length > 0) {
            setSelectedQR(res.data[0]);
          }
        }
      } catch (err) {
        console.warn('Could not load QR codes:', err.message);
      } finally {
        setLoadingList(false);
      }
    }
    loadQRCodes();
  }, [weddingId, eventId]);

  // Compute the URL encoded in the selected QR code
  const targetUrl = event && selectedQR
    ? `${window.location.origin}/w/${wedding.slug}?event=${eventId}&qr=${selectedQR.token}`
    : `${window.location.origin}/w/${wedding?.slug || 'royal-udaipur-2026'}`;

  // Generate QR image
  useEffect(() => {
    async function generateQR() {
      try {
        const url = await QRCode.toDataURL(targetUrl, {
          width: 320,
          margin: 2,
          color: {
            dark: selectedQR && !selectedQR.isActive ? '#888888' : '#681D32', // Gray out if inactive
            light: '#FDFBF7',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('QR code generation failed:', err);
      }
    }
    generateQR();
  }, [targetUrl, selectedQR]);

  // Handle creating a new QR code for this ceremony
  const handleCreateNewQR = async (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    try {
      setCreating(true);
      const res = await api.post(`/qr/weddings/${weddingId}/events/${eventId}/qrcodes`, {
        label: newLabel.trim(),
      });
      if (res.success && res.data) {
        setQrcodes((prev) => [res.data, ...prev]);
        setSelectedQR(res.data);
        setNewLabel('');
        setStatusMsg('New QR code created successfully!');
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) {
      alert('Failed to create QR code: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Toggle QR Active / Inactive status
  const handleToggleStatus = async (qrId) => {
    try {
      const res = await api.patch(`/qr/weddings/${weddingId}/events/${eventId}/qrcodes/${qrId}/toggle`);
      if (res.success && res.data) {
        setQrcodes((prev) =>
          prev.map((q) => (q._id === qrId ? { ...q, isActive: res.data.isActive } : q))
        );
        if (selectedQR?._id === qrId) {
          setSelectedQR((prev) => ({ ...prev, isActive: res.data.isActive }));
        }
      }
    } catch (err) {
      alert('Failed to toggle status: ' + err.message);
    }
  };

  // Delete a QR code
  const handleDeleteQR = async (qrId) => {
    if (!confirm('Are you sure you want to delete this QR code?')) return;
    try {
      const res = await api.delete(`/qr/weddings/${weddingId}/events/${eventId}/qrcodes/${qrId}`);
      if (res.success) {
        const remaining = qrcodes.filter((q) => q._id !== qrId);
        setQrcodes(remaining);
        if (selectedQR?._id === qrId) {
          setSelectedQR(remaining[0] || null);
        }
      }
    } catch (err) {
      alert('Failed to delete QR code: ' + err.message);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.download = `${event ? event.name : 'Wedding'}-${selectedQR?.label || 'QR'}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-ivory rounded-3xl max-w-lg w-full p-5 sm:p-6 border-2 border-gold/60 shadow-royal-lg relative animate-scaleIn my-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-deepBrown/60 hover:text-deepBrown rounded-full transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gold/20 text-gold mb-1.5 border border-gold/40">
            <QrIcon className="w-5 h-5 text-burgundy" />
          </div>
          <h3 className="font-royal text-lg font-bold text-burgundy">
            {event ? `${event.name} QR Manager` : 'Main Wedding Entry QR'}
          </h3>
          <p className="text-[11px] text-deepBrown/70">
            {event ? 'Create and control access QR codes for this ceremony' : 'General wedding guest join QR'}
          </p>
        </div>

        <GoldDivider className="my-3" />

        {/* MULTI-QR SECTION FOR EVENTS */}
        {event && (
          <div className="mb-4">
            {/* Create New QR Form */}
            <form onSubmit={handleCreateNewQR} className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="New Station Label (e.g. Table 4, Entry Gate)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-gold/40 focus:outline-none focus:ring-1 focus:ring-gold bg-white text-gray-900 placeholder:text-gray-400 font-medium"
                required
              />
              <button
                type="submit"
                disabled={creating}
                className="px-3.5 py-2 bg-burgundy hover:bg-burgundyLight text-goldLight font-bold text-xs rounded-xl shadow-royal flex items-center gap-1 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{creating ? 'Adding...' : 'Add QR'}</span>
              </button>
            </form>

            {statusMsg && (
              <p className="text-[10px] text-green-700 font-semibold mb-2 text-center bg-green-50 py-1 rounded-lg">
                {statusMsg}
              </p>
            )}

            {/* QR Codes List with Active/Inactive Toggles */}
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 no-scrollbar border border-gold/20 p-2 rounded-2xl bg-white/60">
              {qrcodes.map((qr) => {
                const isSelected = selectedQR?._id === qr._id;
                return (
                  <div
                    key={qr._id}
                    onClick={() => setSelectedQR(qr)}
                    className={`p-2.5 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'border-burgundy bg-champagne/30 shadow-sm'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          qr.isActive ? 'bg-green-500' : 'bg-red-400'
                        }`}
                      />
                      <div>
                        <p className="font-semibold text-deepBrown">{qr.label}</p>
                        <p className="text-[10px] text-gray-500">
                          {qr.isActive ? 'Active' : 'Deactivated'} • {qr.scansCount || 0} scans
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {/* Active / Inactive Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(qr._id)}
                        title={qr.isActive ? 'Deactivate QR' : 'Activate QR'}
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition ${
                          qr.isActive
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{qr.isActive ? 'Active' : 'Paused'}</span>
                      </button>

                      {qrcodes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteQR(qr._id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition"
                          title="Delete QR"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected QR Code Display */}
        <div className="text-center">
          <div className="relative inline-block p-2.5 bg-white rounded-2xl border border-gold/40 shadow-royal">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Ceremony QR Code"
                className="w-44 h-44 sm:w-48 sm:h-48 mx-auto rounded-lg object-contain"
              />
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-gray-400">
                Generating QR...
              </div>
            )}

            {selectedQR && !selectedQR.isActive && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] rounded-2xl flex flex-col items-center justify-center p-3 text-red-600 font-bold text-xs">
                <AlertCircle className="w-6 h-6 mb-1 text-red-500" />
                <span>QR Code Deactivated</span>
                <span className="text-[10px] text-gray-600 font-normal mt-0.5">
                  Scans will be rejected
                </span>
              </div>
            )}
          </div>

          <p className="text-[11px] font-semibold text-burgundy mt-1.5">
            {selectedQR?.label || 'General Entry QR'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-gold/60 bg-white hover:bg-champagne/30 text-xs font-bold text-deepBrown transition"
          >
            {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-goldDark" />}
            <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
          </button>

          <button
            onClick={handleDownloadQR}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-burgundy hover:bg-burgundyLight text-xs font-bold text-goldLight shadow-royal transition"
          >
            <Download className="w-4 h-4 text-goldLight" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
}
