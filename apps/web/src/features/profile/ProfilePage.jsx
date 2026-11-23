import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Crown,
  Bell,
  LogOut,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { GoldDivider } from '../../components/common/OrnamentalBorder.jsx';

export function ProfilePage() {
  const { user, memberships, activeWedding, logout } = useAuth();
  const navigate = useNavigate();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const userAvatar =
    user?.avatar ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      user?.name || 'Royal Guest'
    )}&backgroundColor=681D32,C5A15B`;

  return (
    <div className="pb-28 px-4 max-w-md mx-auto pt-6 safe-pb">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-6 border-2 border-gold/40 shadow-royal text-center relative mb-5">
        <div className="w-20 h-20 rounded-full border-2 border-gold p-1 mx-auto mb-3 shadow-royal">
          <img
            src={userAvatar}
            alt={user?.name || 'Guest'}
            className="w-full h-full rounded-full object-cover"
          />
        </div>

        <h2 className="font-royal text-xl font-bold text-burgundy">{user?.name || 'Royal Guest'}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{user?.email || 'Guest Member'}</p>

        {activeWedding && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne/40 border border-gold/40 text-burgundy text-xs font-semibold">
            <Crown className="w-3.5 h-3.5 text-gold" />
            <span className="capitalize">{activeWedding.userRole || 'Guest'}</span>
          </div>
        )}
      </div>

      {/* Couple / Admin Management Entry */}
      <div className="bg-gradient-to-r from-burgundyDark via-burgundy to-deepBrown rounded-2xl p-4 border border-gold/40 shadow-royal mb-4 text-ivory">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold/60 flex items-center justify-center text-gold shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-royal text-sm font-bold text-gold">Couple &amp; Admin Portal</h4>
              <p className="text-[10px] text-champagne/80">Manage ceremonies, QR codes &amp; moderation</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-goldDark via-gold to-goldLight text-burgundy font-bold text-xs shadow-royal hover:brightness-110 active:scale-95 transition shrink-0"
          >
            Open →
          </button>
        </div>
      </div>

      {/* Account Info & Weddings Joined */}
      <div className="bg-white rounded-2xl border border-gold/30 shadow-sm p-4 mb-4 space-y-3">
        <h3 className="font-royal text-sm font-bold text-burgundy">Weddings Joined</h3>
        <div className="space-y-2">
          {memberships.map((m) => {
            const w = m.weddingId;
            if (!w) return null;
            const isCurrent = w._id === activeWedding?._id;
            return (
              <div
                key={w._id}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  isCurrent
                    ? 'border-gold bg-champagne/20 font-semibold text-burgundy'
                    : 'border-gray-200 text-deepBrown'
                }`}
              >
                <div>
                  <p className="font-medium">{w.title}</p>
                  <p className="text-[10px] text-gray-500">
                    Role: <span className="capitalize">{m.role}</span>
                  </p>
                </div>
                {isCurrent && (
                  <span className="text-[10px] text-goldDark font-semibold uppercase tracking-wider">
                    Current
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-2xl border border-gold/30 shadow-sm p-4 mb-5">
        <h3 className="font-royal text-sm font-bold text-burgundy mb-3">Preferences</h3>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-burgundy" />
            <div>
              <p className="text-xs font-semibold text-deepBrown">Live Photo Alerts</p>
              <p className="text-[10px] text-gray-500">Real-time alerts when new ceremony photos appear</p>
            </div>
          </div>
          <button
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-11 h-6 rounded-full transition-colors p-1 ${
              notificationsEnabled ? 'bg-burgundy' : 'bg-gray-300'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="w-full py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
      >
        <LogOut className="w-4 h-4" />
        <span>Log Out of Royal Platform</span>
      </button>
    </div>
  );
}
