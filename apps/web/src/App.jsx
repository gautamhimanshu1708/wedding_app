import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { RoyalIntro } from './features/intro/RoyalIntro.jsx';
import { AuthPage } from './features/auth/AuthPage.jsx';
import { MobileLayout } from './layouts/MobileLayout.jsx';
import { LiveGalleryPage } from './features/live-gallery/LiveGalleryPage.jsx';
import { EventsPage } from './features/events/EventsPage.jsx';
import { EventDetailPage } from './features/events/EventDetailPage.jsx';
import { UploadPage } from './features/uploads/UploadPage.jsx';
import { MyUploadsPage } from './features/my-uploads/MyUploadsPage.jsx';
import { ProfilePage } from './features/profile/ProfilePage.jsx';
import { AdminDashboard } from './features/admin/AdminDashboard.jsx';

export default function App() {
  return (
    <Routes>
      {/* 1. Main Wedding QR Landing / Intro by Slug */}
      <Route path="/w/:slug" element={<RoyalIntro />} />

      {/* Root redirect to default wedding intro */}
      <Route path="/" element={<Navigate to="/w/royal-udaipur-2026" replace />} />

      {/* 2. Authentication Screen */}
      <Route path="/auth" element={<AuthPage />} />

      {/* 3. Protected Mobile Guest Application */}
      <Route element={<MobileLayout />}>
        <Route path="/live" element={<LiveGalleryPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/events/:eventId" element={<EventDetailPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/my-uploads" element={<MyUploadsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* 4. Couple and Admin Dashboard */}
      <Route path="/admin" element={<AdminDashboard />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/live" replace />} />
    </Routes>
  );
}
