import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Crown, Sparkles, ChevronDown, ShieldCheck, QrCode } from 'lucide-react';
import { isAdminOrAbove } from '@wedding/shared';

export function RoyalHeader({ onOpenQR }) {
  const { activeWedding, memberships, setActiveWedding } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const coupleNames = (activeWedding?.coupleNames?.partner1 && activeWedding?.coupleNames?.partner2)
    ? `${activeWedding.coupleNames.partner1} & ${activeWedding.coupleNames.partner2}`
    : activeWedding?.title || 'ShadiVibes';

  const userRole = activeWedding?.userRole || 'guest';
  const isAdmin = isAdminOrAbove(userRole);

  return (
    <header className="sticky top-0 z-40 bg-burgundy/95 backdrop-blur-md text-ivory border-b border-gold/40 shadow-royal">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Crown Icon & Wedding Title / Switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/60 flex items-center justify-center text-gold">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-royal text-sm font-semibold tracking-wide text-ivory group-hover:text-gold transition truncate max-w-[180px]">
                  {coupleNames}
                </span>
                {memberships.length > 1 && (
                  <ChevronDown className="w-3.5 h-3.5 text-gold/80" />
                )}
              </div>
              <p className="text-[10px] text-champagne/80 tracking-widest uppercase">
                {activeWedding?.venue || 'Royal Gallery'}
              </p>
            </div>
          </button>

          {/* Wedding Switcher Dropdown */}
          {dropdownOpen && memberships.length > 1 && (
            <div className="absolute top-12 left-0 w-64 bg-deepBrown border border-gold/40 rounded-xl shadow-royal-lg p-2 z-50">
              <p className="text-[10px] uppercase tracking-wider text-gold px-2 py-1 font-semibold">
                Your Weddings
              </p>
              {memberships.map((m) => {
                const w = m.weddingId;
                if (!w) return null;
                const isCurrent = w._id === activeWedding?._id;
                return (
                  <button
                    key={w._id}
                    onClick={() => {
                      setActiveWedding({ ...w, userRole: m.role });
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                      isCurrent
                        ? 'bg-burgundy text-gold font-medium'
                        : 'text-ivory hover:bg-white/10'
                    }`}
                  >
                    <span className="truncate">{w.title}</span>
                    <span className="text-[10px] uppercase opacity-75">{m.role}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Action Icons: QR button & Admin dashboard button */}
        <div className="flex items-center gap-2">
          {onOpenQR && (
            <button
              onClick={onOpenQR}
              title="View Wedding QR"
              className="p-2 rounded-full hover:bg-white/10 text-gold transition"
            >
              <QrCode className="w-5 h-5" />
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => navigate('/admin')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gold/20 hover:bg-gold/30 border border-gold/50 text-gold text-xs transition font-medium"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
