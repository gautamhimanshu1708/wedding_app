import React from 'react';

export function LoadingSkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gold/20 shadow-royal mb-4 p-3 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-full bg-champagne/40" />
        <div className="space-y-1.5 flex-1">
          <div className="w-24 h-3 bg-champagne/40 rounded" />
          <div className="w-16 h-2 bg-champagne/30 rounded" />
        </div>
      </div>
      {/* Photo skeleton */}
      <div className="aspect-[4/5] bg-champagne/30 rounded-xl mb-3 animate-shimmer" />
      {/* Footer skeleton */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-champagne/40" />
        <div className="w-8 h-3 bg-champagne/40 rounded" />
      </div>
    </div>
  );
}

export function LoadingFeedSkeletons({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeletonCard key={i} />
      ))}
    </div>
  );
}
