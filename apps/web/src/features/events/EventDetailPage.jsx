import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { PhotoCard } from '../../components/common/PhotoCard.jsx';
import { PhotoViewerModal } from '../../components/common/PhotoViewerModal.jsx';
import { ReportModal } from '../../components/common/ReportModal.jsx';
import { ArrowLeft, PlusCircle, Calendar, Sparkles, ImageOff } from 'lucide-react';
import { QRShareModal } from '../qr/QRShareModal.jsx';

export function EventDetailPage() {
  const { eventId } = useParams();
  const { activeWedding } = useAuth();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [reportingPhoto, setReportingPhoto] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  useEffect(() => {
    async function loadEventData() {
      if (!activeWedding?._id || !eventId) return;
      try {
        setLoading(true);

        // Fetch events to find current event metadata
        const eventsRes = await api.get(`/weddings/${activeWedding._id}/events`);
        if (eventsRes.success) {
          const found = eventsRes.data.find((e) => e._id === eventId);
          if (found) setEvent(found);
        }

        // Fetch photos for this event
        const photosRes = await api.get(`/weddings/${activeWedding._id}/photos`, {
          eventId,
          sort: sortBy,
        });
        if (photosRes.success) {
          setPhotos(photosRes.data.photos || []);
        }
      } catch (err) {
        console.error('Failed to load event details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEventData();
  }, [activeWedding?._id, eventId, sortBy]);

  const handleLike = async (photoId) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p._id === photoId) {
          const nextLiked = !p.isLikedByMe;
          return {
            ...p,
            isLikedByMe: nextLiked,
            likesCount: nextLiked ? (p.likesCount || 0) + 1 : Math.max(0, (p.likesCount || 0) - 1),
          };
        }
        return p;
      })
    );
    try {
      await api.post(`/weddings/${activeWedding._id}/photos/${photoId}/like`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleReport = async (photoId, reason, details) => {
    await api.post(`/weddings/${activeWedding._id}/photos/${photoId}/report`, {
      reason,
      details,
    });
  };

  return (
    <div className="pb-24 max-w-md mx-auto safe-pb">
      {/* Top Navigation */}
      <div className="sticky top-14 z-30 bg-burgundy text-ivory px-4 py-3 flex items-center justify-between border-b border-gold/40 shadow-royal">
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-1.5 text-xs text-champagne hover:text-gold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All Events</span>
        </button>

        <h2 className="font-royal text-sm font-bold text-gold truncate max-w-[180px]">
          {event?.name || 'Event Album'}
        </h2>

        <button
          onClick={() => setQrModalOpen(true)}
          className="text-[11px] px-2.5 py-1 rounded-full bg-gold/20 text-gold border border-gold/50"
        >
          Event QR
        </button>
      </div>

      {/* Event Header Banner */}
      {event && (
        <div className="bg-white border-b border-gold/30 p-4 shadow-sm mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="font-royal text-2xl font-bold text-burgundy">{event.name}</h1>
              <p className="text-xs text-deepBrown/70 mt-1 leading-relaxed">
                {event.description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500 font-medium">
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'} in album
            </span>

            <button
              onClick={() => navigate(`/upload?event=${eventId}`)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-burgundy text-gold text-xs font-semibold shadow-royal hover:bg-burgundyLight transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Upload to {event.name}</span>
            </button>
          </div>
        </div>
      )}

      {/* Photos List */}
      <div className="px-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gold/20" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-gold/30 shadow-royal my-4">
            <ImageOff className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <h3 className="font-royal text-base font-bold text-burgundy mb-1">
              No photos in {event?.name || 'this event'} yet
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Be the first to upload photos from this auspicious ceremony!
            </p>
            <button
              onClick={() => navigate(`/upload?event=${eventId}`)}
              className="px-5 py-2.5 rounded-xl bg-burgundy text-gold font-semibold text-xs shadow-royal"
            >
              Upload Photos
            </button>
          </div>
        ) : (
          <div>
            {photos.map((photo) => (
              <PhotoCard
                key={photo._id}
                photo={photo}
                onLike={handleLike}
                onReport={(p) => setReportingPhoto(p)}
                onView={(p) => setViewingPhoto(p)}
              />
            ))}
          </div>
        )}
      </div>

      {viewingPhoto && (
        <PhotoViewerModal
          photo={viewingPhoto}
          onClose={() => setViewingPhoto(null)}
          onLike={handleLike}
        />
      )}

      {reportingPhoto && (
        <ReportModal
          photo={reportingPhoto}
          onClose={() => setReportingPhoto(null)}
          onSubmit={handleReport}
        />
      )}

      {qrModalOpen && event && (
        <QRShareModal
          wedding={activeWedding}
          event={event}
          onClose={() => setQrModalOpen(false)}
        />
      )}
    </div>
  );
}
