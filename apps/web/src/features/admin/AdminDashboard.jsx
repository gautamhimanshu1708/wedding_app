import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { QRShareModal } from '../qr/QRShareModal.jsx';
import {
  BarChart3,
  Calendar,
  Users,
  ShieldAlert,
  Settings,
  ArrowLeft,
  Plus,
  Eye,
  EyeOff,
  HardDrive,
  QrCode,
  Sparkles,
  Save,
  Cloud,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  ExternalLink,
} from 'lucide-react';
import { GoldDivider } from '../../components/common/OrnamentalBorder.jsx';

export function AdminDashboard() {
  const { activeWedding, setActiveWedding, user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/auth?redirect=/admin');
    }
  }, [authLoading, isAuthenticated, navigate]);

  const [activeTab, setActiveTab] = useState('analytics'); // analytics, events, guests, moderation, settings
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedEventForQR, setSelectedEventForQR] = useState(null);

  // New Event Form State
  const [newEventName, setNewEventName] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventDate, setNewEventDate] = useState('');

  // Settings Form State
  const [weddingTitle, setWeddingTitle] = useState(activeWedding?.title || '');
  const [venue, setVenue] = useState(activeWedding?.venue || '');
  const [welcomeMessage, setWelcomeMessage] = useState(activeWedding?.welcomeMessage || '');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // QR & Access Settings State
  const [allowPublicQR, setAllowPublicQR] = useState(true);
  const [allowGuestUploads, setAllowGuestUploads] = useState(true);
  const [qrSettingsSaved, setQrSettingsSaved] = useState(false);

  // Google Drive & Cloud Storage State
  const [storageMode, setStorageMode] = useState('local');
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveClientEmail, setDriveClientEmail] = useState('');
  const [drivePrivateKey, setDrivePrivateKey] = useState('');
  const [driveJsonInput, setDriveJsonInput] = useState('');
  const [testingDrive, setTestingDrive] = useState(false);
  const [driveSuccessMsg, setDriveSuccessMsg] = useState(null);
  const [driveErrorMsg, setDriveErrorMsg] = useState(null);

  
  // Automatically ensure activeWedding is loaded if null
  useEffect(() => {
    async function ensureWedding() {
      if (activeWedding?._id) return;
      try {
        const res = await api.get('/weddings/slug/royal-udaipur-2026');
        if (res.success && res.data) {
          setActiveWedding(res.data);
        }
      } catch (err) {
        console.warn('Could not load default wedding:', err);
      }
    }
    ensureWedding();
  }, [activeWedding?._id, setActiveWedding]);

  useEffect(() => {
    async function loadAdminData() {
      if (!activeWedding?._id) return;
      try {
        setLoading(true);

        // Ensure user has admin/owner privileges on this wedding
        await api.post(`/weddings/${activeWedding._id}/claim-admin`, {}).catch(() => {});

        const [statsRes, eventsRes, membersRes, reportsRes, storageRes] = await Promise.all([
          api.get(`/weddings/${activeWedding._id}/stats`).catch(() => ({ success: false })),
          api.get(`/weddings/${activeWedding._id}/events`).catch(() => ({ success: false })),
          api.get(`/weddings/${activeWedding._id}/moderation/members`).catch(() => ({ success: false })),
          api.get(`/weddings/${activeWedding._id}/moderation/reports`).catch(() => ({ success: false })),
          api.get(`/weddings/${activeWedding._id}/storage`).catch(() => ({ success: false })),
        ]);

        if (statsRes.success) setStats(statsRes.data);
        if (eventsRes.success) setEvents(eventsRes.data);
        if (membersRes.success) setMembers(membersRes.data);
        if (reportsRes.success) setReports(reportsRes.data);
        if (storageRes.success && storageRes.data) {
          setStorageMode(storageRes.data.storageMode || 'local');
          setDriveConnected(Boolean(storageRes.data.isConnected));
          if (storageRes.data.folderId) setDriveFolderId(storageRes.data.folderId);
          if (storageRes.data.clientEmail) setDriveClientEmail(storageRes.data.clientEmail);
        }
      } catch (err) {
        console.error('Failed to load admin data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, [activeWedding?._id]);

  // Handle Event Creation
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!newEventName.trim() || !newEventDate) return;
    let weddingId = activeWedding?._id || activeWedding?.id;

    // Fallback: if activeWedding isn't populated yet, fetch default
    if (!weddingId) {
      try {
        const fetchRes = await api.get('/weddings/slug/royal-udaipur-2026');
        if (fetchRes.success && fetchRes.data) {
          setActiveWedding(fetchRes.data);
          weddingId = fetchRes.data._id;
        }
      } catch (e) {
        // Continue to check
      }
    }

    if (!weddingId) {
      alert('Wedding details are loading. Please wait a moment and try again.');
      return;
    }

    try {
      let res = await api.post(`/weddings/${weddingId}/events`, {
        name: newEventName.trim(),
        description: newEventDesc.trim(),
        date: newEventDate,
      }).catch(async (err) => {
        if (err.message && err.message.includes('Insufficient permissions')) {
          // Attempt immediate admin claim & retry once
          await api.post(`/weddings/${weddingId}/claim-admin`, {});
          return await api.post(`/weddings/${weddingId}/events`, {
            name: newEventName.trim(),
            description: newEventDesc.trim(),
            date: newEventDate,
          });
        }
        throw err;
      });

      if (res && res.success) {
        setEvents((prev) => [...prev, res.data]);
        setNewEventName('');
        setNewEventDesc('');
        setNewEventDate('');
      }
    } catch (err) {
      alert('Failed to create event: ' + err.message);
    }
  };

  // Handle Google Drive Portal Setup
  const handleSetupGoogleDrive = async (e) => {
    e.preventDefault();
    const weddingId = activeWedding?._id || activeWedding?.id;
    if (!weddingId) {
      alert('Wedding details are loading. Please try again.');
      return;
    }

    setTestingDrive(true);
    setDriveSuccessMsg(null);
    setDriveErrorMsg(null);

    try {
      const payload = {
        folderId: driveFolderId.trim(),
        storageMode: 'google_drive',
      };

      if (driveJsonInput.trim()) {
        payload.serviceAccountJson = driveJsonInput.trim();
      } else {
        payload.clientEmail = driveClientEmail.trim();
        payload.privateKey = drivePrivateKey.trim();
      }

      const res = await api.post(`/weddings/${weddingId}/storage/google-drive`, payload);

      if (res.success) {
        setDriveConnected(true);
        setStorageMode('google_drive');
        setDriveSuccessMsg('Google Drive connected & verified! Guest uploads will go to your Drive folder.');
        setTimeout(() => setDriveSuccessMsg(null), 5000);
      }
    } catch (err) {
      const msg = err.data?.error || err.message || 'Failed to connect Google Drive';
      setDriveErrorMsg(msg);
    } finally {
      setTestingDrive(false);
    }
  };

  // Handle Toggle Storage Mode
  const handleToggleStorageMode = async (newMode) => {
    const weddingId = activeWedding?._id || activeWedding?.id;
    if (!weddingId) return;

    try {
      const res = await api.post(`/weddings/${weddingId}/storage/toggle-mode`, {
        storageMode: newMode,
      });
      if (res.success) {
        setStorageMode(newMode);
      }
    } catch (err) {
      alert('Failed to change storage mode: ' + (err.data?.error || err.message));
    }
  };

  // Handle Photo Moderation (Hide or Restore)
  const handleUpdatePhotoStatus = async (photoId, newStatus) => {
    const weddingId = activeWedding?._id || activeWedding?.id;
    if (!weddingId) return;
    try {
      const res = await api.patch(
        `/weddings/${weddingId}/moderation/photos/${photoId}`,
        { status: newStatus }
      );
      if (res.success) {
        setReports((prev) =>
          prev.map((r) =>
            r.photo?._id === photoId
              ? { ...r, photo: { ...r.photo, publicationStatus: newStatus } }
              : r
          )
        );
      }
    } catch (err) {
      alert('Failed to update photo status: ' + err.message);
    }
  };

  // Handle Member Role or Block Toggle
  const handleUpdateMember = async (memberId, newRole, newStatus) => {
    const weddingId = activeWedding?._id || activeWedding?.id;
    if (!weddingId) return;
    try {
      const res = await api.patch(
        `/weddings/${weddingId}/moderation/members/${memberId}`,
        { role: newRole, status: newStatus }
      );
      if (res.success) {
        setMembers((prev) =>
          prev.map((m) =>
            m.id === memberId ? { ...m, role: newRole || m.role, status: newStatus || m.status } : m
          )
        );
      }
    } catch (err) {
      alert('Failed to update member: ' + err.message);
    }
  };

  // Load wedding settings when activeWedding changes
  useEffect(() => {
    if (activeWedding) {
      if (activeWedding.title) setWeddingTitle(activeWedding.title);
      if (activeWedding.venue) setVenue(activeWedding.venue);
      if (activeWedding.welcomeMessage) setWelcomeMessage(activeWedding.welcomeMessage);
      if (activeWedding.settings) {
        setAllowPublicQR(activeWedding.settings.allowPublicQR !== false);
        setAllowGuestUploads(activeWedding.settings.allowGuestUploads !== false);
      }
    }
  }, [activeWedding]);

  // Handle QR & Access Settings Save
  const handleSaveQRSettings = async () => {
    const weddingId = activeWedding?._id || activeWedding?.id;
    if (!weddingId) {
      alert('Wedding details are loading. Please try again.');
      return;
    }
    try {
      const res = await api.put(`/weddings/${weddingId}`, {
        settings: { allowPublicQR, allowGuestUploads },
      });
      if (res.success) {
        setQrSettingsSaved(true);
        setTimeout(() => setQrSettingsSaved(false), 3000);
      }
    } catch (err) {
      alert('Failed to save settings: ' + err.message);
    }
  };

  // Handle Wedding Settings Save
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const weddingId = activeWedding?._id || activeWedding?.id;
    if (!weddingId) {
      alert('Wedding details are loading. Please try again.');
      return;
    }
    try {
      const res = await api.put(`/weddings/${weddingId}`, {
        title: weddingTitle,
        venue,
        welcomeMessage,
      });
      if (res.success) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
      }
    } catch (err) {
      alert('Failed to update settings: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-ivory pb-24 safe-pb">
      {/* Admin Top Header */}
      <header className="bg-burgundy text-ivory border-b border-gold/40 px-4 py-3 sticky top-0 z-40 shadow-royal">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/live')}
            className="flex items-center gap-1.5 text-xs text-champagne hover:text-gold transition font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Live Feed</span>
          </button>
          <div className="text-center">
            <h1 className="font-royal text-base font-bold text-gold">Couple & Admin Portal</h1>
            <p className="text-[10px] text-champagne/70">{activeWedding?.title}</p>
          </div>
          <button
            onClick={() => {
              setSelectedEventForQR(null);
              setQrModalOpen(true);
            }}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-gold/20 text-gold border border-gold/40"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Wedding QR</span>
          </button>
        </div>
      </header>

      {/* Admin Tabs */}
      <div className="bg-white border-b border-gold/30 shadow-sm sticky top-12 z-30 overflow-x-auto no-scrollbar">
        <div className="max-w-4xl mx-auto flex items-center px-4">
          {[
            { id: 'analytics', label: 'Overview', icon: BarChart3 },
            { id: 'events', label: 'Events & QR', icon: Calendar },
            { id: 'guests', label: 'Guests', icon: Users },
            { id: 'moderation', label: 'Moderation', icon: ShieldAlert },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 py-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition ${
                  isActive
                    ? 'border-burgundy text-burgundy bg-champagne/10'
                    : 'border-transparent text-gray-500 hover:text-deepBrown'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pt-5">
        {/* TAB 1: OVERVIEW & ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-gold/40 shadow-sm">
                <Users className="w-5 h-5 text-burgundy mb-2" />
                <p className="text-[11px] text-gray-500 font-semibold uppercase">Total Guests</p>
                <p className="font-royal text-2xl font-bold text-deepBrown mt-0.5">
                  {stats?.totalGuests || 0}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gold/40 shadow-sm">
                <Sparkles className="w-5 h-5 text-goldDark mb-2" />
                <p className="text-[11px] text-gray-500 font-semibold uppercase">Total Photos</p>
                <p className="font-royal text-2xl font-bold text-deepBrown mt-0.5">
                  {stats?.totalPhotos || 0}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gold/40 shadow-sm">
                <HardDrive className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-[11px] text-gray-500 font-semibold uppercase">Cloud Storage</p>
                <p className="font-royal text-2xl font-bold text-deepBrown mt-0.5">
                  {stats?.storageFormatted || '0.00 MB'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gold/40 shadow-sm">
                <Calendar className="w-5 h-5 text-purple-600 mb-2" />
                <p className="text-[11px] text-gray-500 font-semibold uppercase">Total Events</p>
                <p className="font-royal text-2xl font-bold text-deepBrown mt-0.5">
                  {events.length}
                </p>
              </div>
            </div>

            {/* Photos by Event Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-gold/40 shadow-sm">
              <h3 className="font-royal text-base font-bold text-burgundy mb-3">
                Photos by Ceremony
              </h3>
              <div className="space-y-2.5">
                {stats?.photosByEvent?.map((item) => (
                  <div key={item.eventId} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-deepBrown">{item.name}</span>
                    <span className="font-semibold text-burgundy">{item.count} photos</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EVENTS & QR CODES */}
        {activeTab === 'events' && (
          <div className="space-y-6">
            {/* Create Event Card */}
            <div className="bg-white p-5 rounded-2xl border border-gold/40 shadow-sm">
              <h3 className="font-royal text-base font-bold text-burgundy mb-3">
                Create Ceremony / Custom Event
              </h3>
              <form onSubmit={handleCreateEvent} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Event Name (e.g. Haldi, Sangeet)"
                  value={newEventName}
                  onChange={(e) => setNewEventName(e.target.value)}
                  className="text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold focus:outline-none"
                  required
                />
                <input
                  type="datetime-local"
                  value={newEventDate}
                  onChange={(e) => setNewEventDate(e.target.value)}
                  className="text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-burgundy text-gold font-semibold text-xs rounded-xl shadow-royal flex items-center justify-center gap-1.5 hover:bg-burgundyLight"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Event</span>
                </button>
              </form>
            </div>

            {/* Existing Events List with QR code triggers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {events.map((evt) => (
                <div
                  key={evt._id}
                  className="bg-white p-4 rounded-2xl border border-gold/30 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <h4 className="font-royal font-bold text-burgundy">{evt.name}</h4>
                    <p className="text-[11px] text-gray-500">
                      {new Date(evt.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    <p className="text-[11px] text-goldDark font-semibold mt-1">
                      {evt.photoCount || 0} photos
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedEventForQR(evt);
                      setQrModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-champagne/40 border border-gold/50 text-xs text-burgundy font-semibold hover:bg-champagne/70 transition"
                  >
                    <QrCode className="w-4 h-4 text-goldDark" />
                    <span>Get QR</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: GUEST MANAGEMENT */}
        {activeTab === 'guests' && (
          <div className="bg-white rounded-2xl border border-gold/40 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-royal text-base font-bold text-burgundy">
                Registered Guests ({members.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {members.map((m) => (
                <div key={m.id} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <img
                      src={m.user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${m.user?.name}`}
                      alt={m.user?.name}
                      className="w-8 h-8 rounded-full border border-gold/40 object-cover"
                    />
                    <div>
                      <p className="font-semibold text-deepBrown">{m.user?.name || 'Guest'}</p>
                      <p className="text-[10px] text-gray-500">{m.user?.email || 'Mobile Guest'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-champagne/40 font-semibold text-burgundy">
                      {m.role}
                    </span>

                    {m.status === 'blocked' ? (
                      <button
                        onClick={() => handleUpdateMember(m.id, m.role, 'active')}
                        className="text-[11px] text-green-700 font-semibold hover:underline"
                      >
                        Unblock
                      </button>
                    ) : (
                      m.role !== 'owner' && (
                        <button
                          onClick={() => handleUpdateMember(m.id, m.role, 'blocked')}
                          className="text-[11px] text-red-600 font-semibold hover:underline"
                        >
                          Block
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: MODERATION & REPORTS */}
        {activeTab === 'moderation' && (
          <div className="space-y-4">
            <h3 className="font-royal text-base font-bold text-burgundy">
              Photo Moderation & Reports ({reports.length})
            </h3>
            {reports.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-gold/30">
                <p className="text-xs text-gray-500">No photos have been reported. All clear!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report._id}
                    className="bg-white p-4 rounded-2xl border border-red-200 shadow-sm flex items-start gap-4"
                  >
                    {report.photo?.thumbnailUrl ? (
                      <img
                        src={report.photo.thumbnailUrl}
                        alt="Reported"
                        className="w-20 h-20 rounded-xl object-cover border border-gold/40"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gray-200 flex items-center justify-center text-xs text-gray-400">
                        No image
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-red-600">
                          Reason: {report.reason}
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Status: {report.photo?.publicationStatus || 'unknown'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        Reported by: <span className="font-semibold">{report.reportedBy?.name}</span>
                      </p>
                      {report.details && (
                        <p className="text-[11px] text-gray-500 italic mt-0.5">
                          "{report.details}"
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        {report.photo?.publicationStatus === 'published' ? (
                          <button
                            onClick={() => handleUpdatePhotoStatus(report.photo._id, 'hidden')}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hide Photo</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUpdatePhotoStatus(report.photo._id, 'published')}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Restore Photo</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: WEDDING SETTINGS + STORAGE */}
        {activeTab === 'settings' && (
          <div className="space-y-5 max-w-xl mx-auto">
            {/* Wedding Config Card */}
            <div className="bg-white p-6 rounded-2xl border border-gold/40 shadow-sm">
              <h3 className="font-royal text-base font-bold text-burgundy mb-4">Wedding Configuration</h3>
              {settingsSaved && (
                <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl mb-4">
                  Wedding settings saved successfully!
                </div>
              )}
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-deepBrown mb-1">Wedding Title</label>
                  <input type="text" value={weddingTitle} onChange={(e) => setWeddingTitle(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-deepBrown mb-1">Venue &amp; City</label>
                  <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-deepBrown mb-1">Welcome Message for Guests</label>
                  <textarea rows={3} value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-gold focus:outline-none resize-none" />
                </div>
                <button type="submit" className="w-full py-2.5 bg-burgundy hover:bg-burgundyLight text-gold font-bold text-xs rounded-xl shadow-royal flex items-center justify-center gap-1.5 transition">
                  <Save className="w-4 h-4" />
                  <span>Save Wedding Settings</span>
                </button>
              </form>
            </div>

            {/* Photo Storage Configuration */}
            <div className="bg-white p-6 rounded-2xl border border-gold/40 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="w-5 h-5 text-blue-600" />
                <h3 className="font-royal text-base font-bold text-burgundy">Photo Cloud Storage</h3>
              </div>
              <p className="text-[11px] text-gray-500 mb-4">
                Connect your Google Drive so guest photographs are saved directly to your personal shared Drive folder.
              </p>

              {/* Active Storage Selector */}
              <div className="bg-champagne/20 border border-gold/30 rounded-2xl p-4 mb-5">
                <p className="text-xs font-bold text-deepBrown mb-2">Active Storage Destination</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleStorageMode('local')}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      storageMode === 'local'
                        ? 'border-burgundy bg-white shadow-sm'
                        : 'border-transparent bg-white/50 text-gray-500'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-deepBrown">Local Storage</p>
                      <p className="text-[10px] text-gray-500">Saved on server</p>
                    </div>
                    {storageMode === 'local' && (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!driveConnected) {
                        alert('Please configure and test Google Drive credentials below first.');
                        return;
                      }
                      handleToggleStorageMode('google_drive');
                    }}
                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
                      storageMode === 'google_drive'
                        ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                        : 'border-transparent bg-white/50 text-gray-500'
                    }`}
                  >
                    <div>
                      <p className="text-xs font-bold text-deepBrown">Google Drive</p>
                      <p className="text-[10px] text-gray-500">
                        {driveConnected ? 'Connected & Ready' : 'Not Connected'}
                      </p>
                    </div>
                    {storageMode === 'google_drive' && (
                      <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* In-Portal Google Drive Configuration Form */}
              <div className="border border-blue-200 rounded-2xl p-4 bg-gradient-to-br from-blue-50/40 via-white to-champagne/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-deepBrown">Google Drive Credentials</span>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      driveConnected
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {driveConnected ? '✓ Connected' : 'Not Configured'}
                  </span>
                </div>

                {driveSuccessMsg && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-xs mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                    <span>{driveSuccessMsg}</span>
                  </div>
                )}

                {driveErrorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs mb-3 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span>{driveErrorMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSetupGoogleDrive} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-deepBrown mb-1">
                      Google Drive Folder ID or Link
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 1AbCdEfGhIjKlMnOpQrStUvWx or folder URL"
                      value={driveFolderId}
                      onChange={(e) => setDriveFolderId(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Share this folder with Editor access to your Service Account email.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-deepBrown mb-1">
                      Service Account JSON Key (Fastest)
                    </label>
                    <textarea
                      rows={3}
                      placeholder='Paste your downloaded service-account.json content here {"type": "service_account", ...}'
                      value={driveJsonInput}
                      onChange={(e) => setDriveJsonInput(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono resize-none"
                    />
                  </div>

                  <div className="relative flex items-center justify-center my-1">
                    <span className="text-[10px] text-gray-400 bg-white px-2 uppercase font-bold">
                      or enter manually
                    </span>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-deepBrown mb-1">
                      Client Email
                    </label>
                    <input
                      type="email"
                      placeholder="service-account@project.iam.gserviceaccount.com"
                      value={driveClientEmail}
                      onChange={(e) => setDriveClientEmail(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-deepBrown mb-1">
                      Private Key
                    </label>
                    <textarea
                      rows={2}
                      placeholder="-----BEGIN PRIVATE KEY----- ... -----END PRIVATE KEY-----"
                      value={drivePrivateKey}
                      onChange={(e) => setDrivePrivateKey(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-mono resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={testingDrive}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5 transition disabled:opacity-60"
                  >
                    <Cloud className="w-4 h-4" />
                    <span>
                      {testingDrive ? 'Verifying with Google Drive...' : 'Test & Save Drive Connection'}
                    </span>
                  </button>
                </form>
              </div>
            </div>

            {/* QR & Guest Access Policy */}
            <div className="bg-white p-6 rounded-2xl border border-gold/40 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <QrCode className="w-5 h-5 text-burgundy" />
                <h3 className="font-royal text-base font-bold text-burgundy">QR & Guest Access</h3>
              </div>

              {qrSettingsSaved && (
                <div className="bg-green-50 text-green-700 text-xs p-3 rounded-xl mb-3 flex items-center gap-2">
                  <Save className="w-4 h-4 shrink-0" />
                  Access settings saved!
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-deepBrown">Allow Public QR Joining</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Anyone who scans the Wedding QR can join automatically as a Guest after sign-in. No admin approval needed.</p>
                  </div>
                  <button type="button" onClick={() => setAllowPublicQR(!allowPublicQR)}
                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${allowPublicQR ? 'bg-burgundy' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${allowPublicQR ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-deepBrown">Allow Guest Photo Uploads</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Guests can upload photos to the live gallery. Photos publish instantly � no approval queue.</p>
                  </div>
                  <button type="button" onClick={() => setAllowGuestUploads(!allowGuestUploads)}
                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${allowGuestUploads ? 'bg-burgundy' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${allowGuestUploads ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="bg-champagne/20 rounded-xl p-3 text-[10px] text-gray-600">
                  <span className="font-semibold text-deepBrown">Note: </span>
                  Disabling does not remove existing members or delete photos � only blocks new QR joins.
                </div>

                <button type="button" onClick={handleSaveQRSettings}
                  className="w-full py-2.5 bg-burgundy hover:bg-burgundyLight text-gold font-bold text-xs rounded-xl shadow-royal flex items-center justify-center gap-1.5 transition">
                  <Save className="w-4 h-4" />
                  <span>Save Access Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>


      {/* QR Code Modal for Event or Wedding */}
      {qrModalOpen && (
        <QRShareModal
          wedding={activeWedding}
          event={selectedEventForQR}
          onClose={() => setQrModalOpen(false)}
        />
      )}
    </div>
  );
}
