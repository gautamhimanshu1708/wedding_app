import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { socketService } from '../../services/socket.js';
import { PhotoCard } from '../../components/common/PhotoCard.jsx';
import { PhotoViewerModal } from '../../components/common/PhotoViewerModal.jsx';
import { ReportModal } from '../../components/common/ReportModal.jsx';
import { LoadingFeedSkeletons } from '../../components/common/LoadingSkeleton.jsx';
import { SOCKET_EVENTS } from '@wedding/shared';
import { ArrowUp, Filter, Sparkles, ImageOff, RefreshCw } from 'lucide-react';

export function LiveGalleryPage() {
  const { activeWedding, user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest', 'oldest', 'mostLiked'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Modals state
  const [viewingPhoto, setViewingPhoto] = useState(null);
  const [reportingPhoto, setReportingPhoto] = useState(null);

  // New photos indicator pill
  const [newPhotoCount, setNewPhotoCount] = useState(0);
  const isNearTopRef = useRef(true);

  // Fetch Events for filter chips
  useEffect(() => {
    async function fetchEvents() {
      if (!activeWedding?._id) return;
      try {
        const res = await api.get(`/weddings/${activeWedding._id}/events`);
        if (res.success) {
          setEvents(res.data);
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      }
    }
    fetchEvents();
  }, [activeWedding?._id]);

  // Fetch Photos
  const fetchPhotos = useCallback(
    async (pageNum = 1, append = false) => {
      if (!activeWedding?._id) return;
      try {
        if (!append) setLoading(true);
        const params = {
          page: pageNum,
          limit: 15,
          sort: sortBy,
        };
        if (selectedEventId !== 'all') {
          params.eventId = selectedEventId;
        }

        const res = await api.get(`/weddings/${activeWedding._id}/photos`, params);
        if (res.success) {
          const fetchedPhotos = res.data.photos || [];
          setPhotos((prev) => (append ? [...prev, ...fetchedPhotos] : fetchedPhotos));
          setHasMore(res.data.pagination?.hasMore || false);
          setPage(pageNum);
        }
      } catch (err) {
        console.error('Failed to fetch photos:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeWedding?._id, selectedEventId, sortBy]
  );

  useEffect(() => {
    fetchPhotos(1, false);
  }, [fetchPhotos]);

  // Track scroll position to decide whether to show new photo pill
  useEffect(() => {
    const handleScroll = () => {
      const isTop = window.scrollY < 200;
      isNearTopRef.current = isTop;
      if (isTop) {
        setNewPhotoCount(0);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Real-Time Socket.IO Subscriptions
  useEffect(() => {
    if (!activeWedding?._id) return;

    // Join wedding room
    socketService.joinWedding(activeWedding._id);

    // 1. Photo Published Event
    const handlePhotoPublished = ({ photo }) => {
      if (!photo) return;

      // Check if photo matches current event filter
      const matchesFilter =
        selectedEventId === 'all' || photo.eventId?._id === selectedEventId || photo.eventId === selectedEventId;

      if (!matchesFilter) return;

      setPhotos((prev) => {
        // Prevent duplicates
        if (prev.some((p) => p._id === photo._id)) return prev;
        return [photo, ...prev];
      });

      if (!isNearTopRef.current) {
        setNewPhotoCount((c) => c + 1);
      }
    };

    // 2. Photo Liked Event
    const handlePhotoLiked = ({ photoId, likesCount }) => {
      setPhotos((prev) =>
        prev.map((p) => (p._id === photoId ? { ...p, likesCount } : p))
      );
      if (viewingPhoto?._id === photoId) {
        setViewingPhoto((prev) => (prev ? { ...prev, likesCount } : prev));
      }
    };

    // 3. Photo Unliked Event
    const handlePhotoUnliked = ({ photoId, likesCount }) => {
      setPhotos((prev) =>
        prev.map((p) => (p._id === photoId ? { ...p, likesCount } : p))
      );
      if (viewingPhoto?._id === photoId) {
        setViewingPhoto((prev) => (prev ? { ...prev, likesCount } : prev));
      }
    };

    // 4. Photo Removed / Moderated Event
    const handlePhotoRemoved = ({ photoId }) => {
      setPhotos((prev) => prev.filter((p) => p._id !== photoId));
      if (viewingPhoto?._id === photoId) {
        setViewingPhoto(null);
      }
    };

    socketService.on(SOCKET_EVENTS.PHOTO_PUBLISHED, handlePhotoPublished);
    socketService.on(SOCKET_EVENTS.PHOTO_LIKED, handlePhotoLiked);
    socketService.on(SOCKET_EVENTS.PHOTO_UNLIKED, handlePhotoUnliked);
    socketService.on(SOCKET_EVENTS.PHOTO_REMOVED, handlePhotoRemoved);

    return () => {
      socketService.off(SOCKET_EVENTS.PHOTO_PUBLISHED, handlePhotoPublished);
      socketService.off(SOCKET_EVENTS.PHOTO_LIKED, handlePhotoLiked);
      socketService.off(SOCKET_EVENTS.PHOTO_UNLIKED, handlePhotoUnliked);
      socketService.off(SOCKET_EVENTS.PHOTO_REMOVED, handlePhotoRemoved);
    };
  }, [activeWedding?._id, selectedEventId, viewingPhoto?._id]);

  // Handle Like Action
  const handleLike = async (photoId) => {
    // Optimistic UI update
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

    if (viewingPhoto?._id === photoId) {
      setViewingPhoto((prev) =>
        prev
          ? {
              ...prev,
              isLikedByMe: !prev.isLikedByMe,
              likesCount: !prev.isLikedByMe
                ? (prev.likesCount || 0) + 1
                : Math.max(0, (prev.likesCount || 0) - 1),
            }
          : prev
      );
    }

    try {
      await api.post(`/weddings/${activeWedding._id}/photos/${photoId}/like`);
    } catch (err) {
      console.error('Like failed:', err);
      // Revert if request fails
      fetchPhotos(page, false);
    }
  };

  // Handle Report Action
  const handleReportSubmit = async (photoId, reason, details) => {
    await api.post(`/weddings/${activeWedding._id}/photos/${photoId}/report`, {
      reason,
      details,
    });
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNewPhotoCount(0);
  };

  return (
    <div className="pb-20 safe-pb">
      {/* Sticky Filter & Sort Header Bar */}
      <div className="sticky top-14 z-30 bg-ivory/95 backdrop-blur-md border-b border-gold/30 px-3 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-burgundy">
            <Sparkles className="w-4 h-4 text-gold" />
            <span>Live Wedding Gallery</span>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-semibold text-deepBrown bg-white border border-gold/40 rounded-lg px-2 py-1 focus:outline-none"
            >
              <option value="newest">Newest</option>
              <option value="mostLiked">Most Liked</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>
        </div>

        {/* Horizontal Event Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedEventId('all')}
            className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
              selectedEventId === 'all'
                ? 'bg-burgundy text-gold shadow-sm font-semibold'
                : 'bg-white text-deepBrown/80 border border-gold/30 hover:border-gold'
            }`}
          >
            All Events
          </button>
          {events.map((evt) => (
            <button
              key={evt._id}
              onClick={() => setSelectedEventId(evt._id)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition ${
                selectedEventId === evt._id
                  ? 'bg-burgundy text-gold shadow-sm font-semibold'
                  : 'bg-white text-deepBrown/80 border border-gold/30 hover:border-gold'
              }`}
            >
              {evt.name}
            </button>
          ))}
        </div>
      </div>

      {/* Floating "New Photos" Notification Pill */}
      {newPhotoCount > 0 && (
        <div className="fixed top-32 left-1/2 -translate-x-1/2 z-40 animate-bounce">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-burgundy text-gold font-semibold text-xs shadow-royal-lg border border-gold/60"
          >
            <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{newPhotoCount} new {newPhotoCount === 1 ? 'photo' : 'photos'} added</span>
          </button>
        </div>
      )}

      {/* Main Feed Container */}
      <main className="max-w-md mx-auto px-4 pt-3">
        {loading && photos.length === 0 ? (
          <LoadingFeedSkeletons count={3} />
        ) : photos.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center border border-gold/30 shadow-royal my-8">
            <div className="w-16 h-16 rounded-full bg-champagne/30 border border-gold/50 flex items-center justify-center mx-auto mb-4 text-goldDark">
              <ImageOff className="w-8 h-8" />
            </div>
            <h3 className="font-royal text-lg font-bold text-burgundy mb-1">
              No Photos Here Yet
            </h3>
            <p className="text-xs text-gray-600 mb-5 leading-relaxed">
              Be the first royal guest to capture a memorable moment for this wedding celebration!
            </p>
            <a
              href="/upload"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-burgundy text-gold font-semibold text-xs shadow-royal hover:bg-burgundyLight transition"
            >
              Upload First Photo
            </a>
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

            {/* Pagination / Load More */}
            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={() => fetchPhotos(page + 1, true)}
                  className="px-5 py-2.5 rounded-xl bg-white border border-gold/50 text-xs font-semibold text-burgundy shadow-sm hover:bg-champagne/20 transition"
                >
                  Load More Photos
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fullscreen Photo Viewer */}
      {viewingPhoto && (
        <PhotoViewerModal
          photo={viewingPhoto}
          onClose={() => setViewingPhoto(null)}
          onLike={handleLike}
        />
      )}

      {/* Photo Report Modal */}
      {reportingPhoto && (
        <ReportModal
          photo={reportingPhoto}
          onClose={() => setReportingPhoto(null)}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
}
