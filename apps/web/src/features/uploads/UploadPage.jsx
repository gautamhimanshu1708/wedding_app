import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import confetti from 'canvas-confetti';
import {
  Camera,
  Image as ImageIcon,
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Clock,
  Loader2,
} from 'lucide-react';
import { GoldDivider } from '../../components/common/OrnamentalBorder.jsx';

// Per-file upload statuses
const STATUS = {
  PENDING: 'pending',       // Selected, not started
  PREPARING: 'preparing',   // Validating locally
  UPLOADING: 'uploading',   // Sending to server
  PROCESSING: 'processing', // Server processing (Sharp, Drive upload)
  PUBLISHED: 'published',   // Success ✓
  FAILED: 'failed',         // Error ✗
};

const STATUS_LABELS = {
  [STATUS.PENDING]: 'Ready',
  [STATUS.PREPARING]: 'Preparing...',
  [STATUS.UPLOADING]: 'Uploading...',
  [STATUS.PROCESSING]: 'Processing...',
  [STATUS.PUBLISHED]: 'Published ✓',
  [STATUS.FAILED]: 'Failed — Tap to retry',
};

const STATUS_COLORS = {
  [STATUS.PENDING]: 'text-gray-400',
  [STATUS.PREPARING]: 'text-blue-500',
  [STATUS.UPLOADING]: 'text-gold',
  [STATUS.PROCESSING]: 'text-orange-500',
  [STATUS.PUBLISHED]: 'text-green-600',
  [STATUS.FAILED]: 'text-red-600',
};

export function UploadPage() {
  const { activeWedding } = useAuth();
  const [searchParams] = useSearchParams();
  const preselectedEventId = searchParams.get('event');
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(preselectedEventId || '');
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState([]); // { id, file, previewUrl, status, error, retries }
  const [globalError, setGlobalError] = useState('');
  const [allDone, setAllDone] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Load events
  useEffect(() => {
    async function fetchEvents() {
      if (!activeWedding?._id) return;
      try {
        const res = await api.get(`/weddings/${activeWedding._id}/events`);
        if (res.success && res.data.length > 0) {
          setEvents(res.data);
          if (!selectedEventId) {
            setSelectedEventId(preselectedEventId || res.data[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      }
    }
    fetchEvents();
  }, [activeWedding?._id, preselectedEventId]);

  const updateFileStatus = (id, patch) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  };

  const handleFilesAdded = (filesList) => {
    setGlobalError('');
    const maxFiles = 10;
    if (files.length + filesList.length > maxFiles) {
      setGlobalError(`Maximum ${maxFiles} photos at a time.`);
      return;
    }

    const newItems = [];
    Array.from(filesList).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        setGlobalError('Only image files (JPEG, PNG, WebP) are supported.');
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setGlobalError(`"${file.name}" exceeds the 25 MB limit.`);
        return;
      }
      newItems.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        status: STATUS.PENDING,
        error: null,
        retries: 0,
      });
    });

    setFiles((prev) => [...prev, ...newItems]);
  };

  const removeFile = (id) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  };

  /**
   * Upload a single file, updating its status at each stage.
   * Returns true on success.
   */
  const uploadSingleFile = async (item) => {
    if (!selectedEventId) return false;

    updateFileStatus(item.id, { status: STATUS.PREPARING, error: null });

    // Brief pause so "Preparing" is visible
    await new Promise((r) => setTimeout(r, 300));

    updateFileStatus(item.id, { status: STATUS.UPLOADING });

    try {
      const formData = new FormData();
      formData.append('eventId', selectedEventId);
      formData.append('caption', caption.trim());
      formData.append('photos', item.file);

      updateFileStatus(item.id, { status: STATUS.PROCESSING });

      const res = await api.uploadPhotos(activeWedding._id, formData, () => {});

      const result = res.data?.[0];
      if (res.success && result && !result.error) {
        updateFileStatus(item.id, { status: STATUS.PUBLISHED });
        return true;
      } else {
        throw new Error(result?.error || 'Upload failed');
      }
    } catch (err) {
      updateFileStatus(item.id, { status: STATUS.FAILED, error: err.message });
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pendingFiles = files.filter((f) => f.status === STATUS.PENDING || f.status === STATUS.FAILED);

    if (pendingFiles.length === 0) {
      setGlobalError('Please select at least one photo to upload.');
      return;
    }
    if (!selectedEventId) {
      setGlobalError('Please select a wedding event.');
      return;
    }

    setGlobalError('');

    // Upload sequentially to show per-file progress clearly
    let successCount = 0;
    for (const item of pendingFiles) {
      const ok = await uploadSingleFile(item);
      if (ok) successCount++;
    }

    if (successCount > 0) {
      setAllDone(true);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#681D32', '#C5A15B', '#E8D8BD', '#F7F0E4'],
      });

      // Navigate after delay
      setTimeout(() => navigate('/live'), 2200);
    }
  };

  const retryFile = async (id) => {
    const item = files.find((f) => f.id === id);
    if (!item || item.status !== STATUS.FAILED) return;
    updateFileStatus(id, { status: STATUS.PENDING, retries: (item.retries || 0) + 1 });
    await uploadSingleFile({ ...item, status: STATUS.PENDING });
  };

  const anyUploading = files.some((f) =>
    [STATUS.PREPARING, STATUS.UPLOADING, STATUS.PROCESSING].includes(f.status)
  );
  const pendingCount = files.filter((f) => [STATUS.PENDING, STATUS.FAILED].includes(f.status)).length;
  const publishedCount = files.filter((f) => f.status === STATUS.PUBLISHED).length;

  return (
    <div className="pb-28 px-4 max-w-md mx-auto pt-4 safe-pb">
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne/40 border border-gold/40 text-burgundy text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-gold" />
          <span>Instant Photo Sharing</span>
        </div>
        <h2 className="font-royal text-2xl font-bold text-burgundy mt-1.5">Share Wedding Moments</h2>
        <p className="text-xs text-deepBrown/70">
          Photos publish instantly to the live gallery — no approval needed
        </p>
      </div>

      <GoldDivider className="mb-4" />

      {allDone ? (
        <div className="bg-white rounded-3xl p-8 text-center border-2 border-gold/60 shadow-royal-lg my-8">
          <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="font-royal text-xl font-bold text-burgundy">Photos Published!</h3>
          <p className="text-xs text-gray-600 mt-2">
            {publishedCount} photo{publishedCount !== 1 ? 's' : ''} are now live for all wedding guests to see!
            <br />Redirecting to Live feed...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {globalError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{globalError}</span>
            </div>
          )}

          {/* Event Selector */}
          <div>
            <label className="block text-xs font-semibold text-deepBrown mb-1.5">
              Select Wedding Event <span className="text-burgundy">*</span>
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full text-xs font-semibold p-3 rounded-xl border border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold bg-white text-gray-900 shadow-sm"
              required
              disabled={anyUploading}
            >
              <option value="" disabled>-- Choose Ceremony / Event --</option>
              {events.map((evt) => (
                <option key={evt._id} value={evt._id}>
                  {evt.name} ({new Date(evt.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
                </option>
              ))}
            </select>
          </div>

          {/* Camera & File Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={anyUploading}
              className="flex flex-col items-center justify-center py-4 px-3 rounded-2xl bg-white border border-gold/50 shadow-sm hover:border-gold hover:bg-champagne/10 transition active:scale-95 text-deepBrown disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-burgundy/10 text-burgundy flex items-center justify-center mb-1.5">
                <Camera className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-semibold">Take Photo</span>
              <span className="text-[10px] text-gray-500">Camera</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={anyUploading}
              className="flex flex-col items-center justify-center py-4 px-3 rounded-2xl bg-white border border-gold/50 shadow-sm hover:border-gold hover:bg-champagne/10 transition active:scale-95 text-deepBrown disabled:opacity-50"
            >
              <div className="w-10 h-10 rounded-full bg-gold/20 text-goldDark flex items-center justify-center mb-1.5">
                <ImageIcon className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-semibold">Choose Photos</span>
              <span className="text-[10px] text-gray-500">Up to 10 photos</span>
            </button>
          </div>

          <input type="file" ref={fileInputRef} onChange={(e) => handleFilesAdded(e.target.files)} accept="image/*" multiple className="hidden" />
          <input type="file" ref={cameraInputRef} onChange={(e) => handleFilesAdded(e.target.files)} accept="image/*" capture="environment" className="hidden" />

          {/* Selected Photos with per-file status */}
          {files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-deepBrown">
                  Photos ({files.length}) · {publishedCount} published
                </span>
                {!anyUploading && (
                  <button type="button" onClick={() => { files.forEach(f => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); }); setFiles([]); }} className="text-[11px] text-red-600 hover:underline">
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {files.map((item) => (
                  <div key={item.id} className={`flex items-center gap-3 p-2.5 rounded-xl border transition ${
                    item.status === STATUS.PUBLISHED ? 'border-green-200 bg-green-50' :
                    item.status === STATUS.FAILED ? 'border-red-200 bg-red-50' :
                    'border-gold/30 bg-white'
                  }`}>
                    {/* Thumbnail */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 relative bg-gray-100">
                      <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover" />
                      {item.status === STATUS.PUBLISHED && (
                        <div className="absolute inset-0 bg-green-600/40 flex items-center justify-center">
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </div>

                    {/* Status */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-deepBrown truncate">{item.file.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {[STATUS.PREPARING, STATUS.UPLOADING, STATUS.PROCESSING].includes(item.status) && (
                          <Loader2 className="w-3 h-3 animate-spin text-gold" />
                        )}
                        {item.status === STATUS.PENDING && <Clock className="w-3 h-3 text-gray-400" />}
                        <span className={`text-[11px] font-semibold ${STATUS_COLORS[item.status]}`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                      </div>
                      {item.error && (
                        <p className="text-[10px] text-red-500 mt-0.5 truncate">{item.error}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {item.status === STATUS.FAILED && (
                        <button type="button" onClick={() => retryFile(item.id)} className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition" title="Retry">
                          <RefreshCw className="w-3.5 h-3.5 text-red-600" />
                        </button>
                      )}
                      {[STATUS.PENDING, STATUS.FAILED].includes(item.status) && (
                        <button type="button" onClick={() => removeFile(item.id)} className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition">
                          <X className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Caption */}
          <div>
            <label className="block text-xs font-semibold text-deepBrown mb-1">Add a Caption (Optional)</label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Beautiful Sangeet dance performance 💃🕺"
              maxLength={250}
              disabled={anyUploading}
              className="w-full text-xs p-3 rounded-xl border border-gold/40 focus:outline-none focus:ring-2 focus:ring-gold bg-white text-gray-900 placeholder:text-gray-500 font-medium shadow-sm"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={anyUploading || files.length === 0}
            className="w-full py-3.5 px-4 rounded-xl bg-burgundy hover:bg-burgundyLight text-ivory font-bold text-sm shadow-royal flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-60"
          >
            {anyUploading ? (
              <>
                <Loader2 className="w-5 h-5 text-gold animate-spin" />
                <span>Publishing Photos...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5 text-gold" />
                <span>
                  {pendingCount > 0
                    ? `Publish ${pendingCount} ${pendingCount === 1 ? 'Photo' : 'Photos'} Now`
                    : 'All Published!'}
                </span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
