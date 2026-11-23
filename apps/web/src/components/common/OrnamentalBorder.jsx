import React from 'react';

export function GoldDivider({ className = '' }) {
  return (
    <div className={`flex items-center justify-center my-3 gap-2 ${className}`}>
      <div className="h-[1px] bg-gradient-to-r from-transparent via-gold to-transparent flex-1 opacity-50" />
      <span className="text-gold text-xs opacity-75">❖</span>
      <div className="h-[1px] bg-gradient-to-l from-transparent via-gold to-transparent flex-1 opacity-50" />
    </div>
  );
}

export function RoyalArch({ children, className = '' }) {
  return (
    <div className={`relative border border-gold/30 rounded-2xl p-4 bg-white/70 backdrop-blur-sm shadow-royal ${className}`}>
      {/* Corner Ornaments */}
      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-gold" />
      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-gold" />
      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-gold" />
      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-gold" />
      {children}
    </div>
  );
}
