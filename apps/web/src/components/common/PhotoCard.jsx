import React, { useState, useEffect } from 'react';
import { Heart, MoreHorizontal, Flag, Sparkles } from 'lucide-react';

function formatTimestamp(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PhotoCard({
  photo,
  onLike,
  onReport,
  onView,
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(photo.displayUrl || photo.thumbnailUrl);
  const [hasError, setHasError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setImgSrc(photo.displayUrl || photo.thumbnailUrl);
    setImageLoaded(false);
    setHasError(false);
  }, [photo.displayUrl, photo.thumbnailUrl, photo.fallbackUrl]);

  const handleImageError = () => {
    // 1. Try streaming proxy fallback if available
    if (photo.fallbackUrl && imgSrc !== photo.fallbackUrl) {
      setImgSrc(photo.fallbackUrl);
      return;
    }
    // 2. Try thumbnail if not yet tried
    if (photo.thumbnailUrl && imgSrc !== photo.thumbnailUrl) {
      setImgSrc(photo.thumbnailUrl);
      return;
    }
    // 3. Prevent infinite skeleton shimmer
    setImageLoaded(true);
    setHasError(true);
  };

  const uploaderName = photo.uploadedBy?.name || 'Wedding Guest';
  const uploaderAvatar =
    photo.uploadedBy?.avatar ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(uploaderName)}&backgroundColor=681D32,C5A15B`;
  const eventName = photo.eventId?.name || 'Wedding';

  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-gold/30 shadow-royal mb-4 transition hover:border-gold/60">
      {/* Top Header: Uploader Info & Event Badge */}
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2.5">
          <img
            src={uploaderAvatar}
            alt={uploaderName}
            className="w-9 h-9 rounded-full border border-gold/50 object-cover bg-ivory"
            loading="lazy"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-deepBrown truncate max-w-[140px]">
                {uploaderName}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-champagne/40 text-burgundy font-medium border border-gold/30">
                {eventName}
              </span>
            </div>
            <time className="text-[10px] text-gray-500 block">
              {formatTimestamp(photo.createdAt)}
            </time>
          </div>
        </div>

        {/* Options Menu: Report */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-gray-400 hover:text-burgundy rounded-full transition"
            aria-label="Options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 bg-white border border-gold/30 rounded-xl shadow-royal-lg py-1 px-1 z-30 min-w-[120px]">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onReport(photo);
                }}
                className="w-full text-left px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 flex items-center gap-2 rounded-lg"
              >
                <Flag className="w-3.5 h-3.5 text-red-600" />
                <span>Report photo</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Photo Image with loading skeleton placeholder */}
      <div
        className="relative bg-ivory/60 cursor-pointer overflow-hidden aspect-[4/5] max-h-[500px]"
        onClick={() => onView(photo)}
      >
        {!imageLoaded && !hasError && (
          <div className="absolute inset-0 animate-shimmer flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-gold/40 animate-pulse" />
          </div>
        )}
        {hasError ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-ivory/90 p-4 text-center">
            <Sparkles className="w-8 h-8 text-gold/60 mb-2 animate-pulse" />
            <span className="text-xs font-serif text-deepBrown/80">Photo loading moment...</span>
          </div>
        ) : (
          <img
            src={imgSrc}
            alt={photo.caption || 'Wedding celebration'}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            loading="lazy"
          />
        )}
      </div>

      {/* Bottom Footer: Like Button, Count & Caption */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onLike(photo._id)}
            className="flex items-center gap-1.5 group focus:outline-none"
            aria-label={photo.isLikedByMe ? 'Unlike photo' : 'Like photo'}
          >
            <Heart
              className={`w-6 h-6 transition-transform active:scale-125 ${
                photo.isLikedByMe
                  ? 'fill-burgundy text-burgundy stroke-[1.5]'
                  : 'text-gray-600 group-hover:text-burgundy stroke-[1.8]'
              }`}
            />
            <span
              className={`text-xs font-semibold ${
                photo.isLikedByMe ? 'text-burgundy' : 'text-gray-700'
              }`}
            >
              {photo.likesCount || 0}
            </span>
          </button>
        </div>

        {/* Caption */}
        {photo.caption && (
          <p className="mt-2 text-xs text-deepBrown leading-relaxed">
            <span className="font-semibold mr-1.5">{uploaderName}</span>
            {photo.caption}
          </p>
        )}
      </div>
    </article>
  );
}
