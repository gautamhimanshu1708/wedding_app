import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { RoyalHeader } from '../components/common/RoyalHeader.jsx';
import { BottomNav } from '../components/common/BottomNav.jsx';
import { QRShareModal } from '../features/qr/QRShareModal.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { Crown } from 'lucide-react';

export function MobileLayout() {
  const { isAuthenticated, loading, activeWedding } = useAuth();
  const [qrModalOpen, setQrModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-burgundy flex flex-col items-center justify-center p-6 text-ivory">
        <Crown className="w-10 h-10 text-gold animate-bounce" />
        <p className="font-royal text-sm text-gold mt-3">Loading Royal Space...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-ivory flex flex-col selection:bg-gold/30 selection:text-burgundy">
      {/* Top Header */}
      <RoyalHeader onOpenQR={() => setQrModalOpen(true)} />

      {/* Main Screen Outlet */}
      <main className="flex-1 w-full">
        <Outlet />
      </main>

      {/* 5-Item Fixed Mobile Bottom Navigation */}
      <BottomNav />

      {/* Wedding QR Share Modal */}
      {qrModalOpen && activeWedding && (
        <QRShareModal
          wedding={activeWedding}
          onClose={() => setQrModalOpen(false)}
        />
      )}
    </div>
  );
}
