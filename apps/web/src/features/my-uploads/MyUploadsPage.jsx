import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { PhotoViewerModal } from '../../components/common/PhotoViewerModal.jsx';
import { Image, Clock, Heart, PlusCircle, CheckCircle } from 'lucide-react';
import { GoldDivider } from '../../components/common/OrnamentalBorder.jsx';
import { Link } from 'react-router-dom';

export function MyUploadsPage() {
  const { activeWedding } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingPhoto, setViewingPhoto] = useState(null);

  useEffect(() => {
    async function fetchMyPhotos() {
      if (!activeWedding?._id) return;
      try {
        setLoading(true);
        const res = await api.get(`/weddings/${activeWedding._id}/photos/my`);
        if (res.success) {
          setPhotos(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load my uploads:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchMyPhotos();
  }, [activeWedding?._id]);

  return (
    <div className="pb-24 px-4 max-w-md mx-auto pt-4 safe-pb">
      <div className="text-center mb-4">
        <h2 className="font-royal text-2xl font-bold text-burgundy">
          My Wedding Uploads
        </h2>
        <p className="text-xs text-deepBrown/70 mt-1">
          {photos.length} {photos.length === 1 ? 'photo' : 'photos'} contributed by you
        </p>
      </div>

      <GoldDivider className="mb-4" />

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-square bg-white rounded-2xl animate-pulse border border-gold/20" />
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-gold/30 shadow-royal my-8">
          <div className="w-14 h-14 rounded-full bg-champagne/30 text-goldDark flex items-center justify-center mx-auto mb-3">
            <Image className="w-7 h-7" />
          </div>
          <h3 className="font-royal text-base font-bold text-burgundy mb-1">
            You haven't uploaded yet
          </h3>
          <p className="text-xs text-gray-500 mb-5">
            Share your favorite wedding memories with the couple and guests.
          </p>
          <Link
            to="/upload"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-burgundy text-gold font-semibold text-xs shadow-royal"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Upload Photo Now</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div
              key={photo._id}
              onClick={() => setViewingPhoto(photo)}
              className="group bg-white rounded-2xl overflow-hidden border border-gold/30 shadow-sm hover:border-gold hover:shadow-royal cursor-pointer transition relative"
            >
              <div className="aspect-square relative overflow-hidden bg-ivory">
                <img
                  src={photo.thumbnailUrl || photo.displayUrl}
                  alt={photo.caption || 'Upload'}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  loading="lazy"
                />

                {/* Status Badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-ivory font-medium border border-gold/30">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span>{photo.publicationStatus}</span>
                </div>

                {/* Likes count */}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] text-ivory font-medium">
                  <Heart className="w-3 h-3 text-red-400 fill-red-400" />
                  <span>{photo.likesCount || 0}</span>
                </div>
              </div>

              <div className="p-2.5">
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span className="font-medium text-burgundy truncate max-w-[90px]">
                    {photo.eventId?.name || 'Wedding'}
                  </span>
                  <span>
                    {new Date(photo.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                {photo.caption && (
                  <p className="text-[11px] text-deepBrown mt-1 truncate">
                    {photo.caption}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingPhoto && (
        <PhotoViewerModal
          photo={viewingPhoto}
          onClose={() => setViewingPhoto(null)}
          onLike={() => {}}
        />
      )}
    </div>
  );
}
