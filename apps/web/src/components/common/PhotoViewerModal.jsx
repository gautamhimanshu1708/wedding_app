import React, { useEffect } from 'react';
import { X, Heart, Calendar } from 'lucide-react';

export function PhotoViewerModal({ photo, onClose, onLike }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!photo) return null;

  const uploaderName = photo.uploadedBy?.name || 'Wedding Guest';

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between backdrop-blur-md animate-fadeIn">
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 text-white safe-top">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-gold/60 overflow-hidden bg-burgundy/40">
            {photo.uploadedBy?.avatar ? (
              <img src={photo.uploadedBy.avatar} alt={uploaderName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gold font-bold text-xs">
                {uploaderName[0]}
              </div>
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-ivory">{uploaderName}</h4>
            <p className="text-[11px] text-champagne/70">{photo.eventId?.name || 'Royal Celebration'}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition focus:outline-none"
          aria-label="Close photo viewer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Center Image Container */}
      <div className="flex-1 flex items-center justify-center p-2 relative overflow-hidden">
        <img
          src={photo.displayUrl || photo.thumbnailUrl}
          alt={photo.caption || 'Wedding moment'}
          className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
        />
      </div>

      {/* Bottom Bar: Like, Count & Caption (No download buttons!) */}
      <div className="p-4 bg-gradient-to-t from-black/80 to-transparent text-white safe-pb">
        <div className="max-w-md mx-auto flex items-center justify-between mb-2">
          <button
            onClick={() => onLike(photo._id)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition active:scale-95"
          >
            <Heart
              className={`w-5 h-5 ${
                photo.isLikedByMe ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
            <span className="text-sm font-medium">{photo.likesCount || 0}</span>
          </button>
          <span className="text-xs text-champagne/80">
            {new Date(photo.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {photo.caption && (
          <p className="max-w-md mx-auto text-xs text-champagne/90 leading-relaxed text-center px-2">
            {photo.caption}
          </p>
        )}
      </div>
    </div>
  );
}
