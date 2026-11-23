# 👑 Royal Wedding Photo Sharing Platform

> A production-oriented, mobile-first multi-wedding photo-sharing web application engineered for Indian royal weddings.

Built with an Indian Royal visual identity featuring **Burgundy (`#681D32`)**, **Antique Gold (`#C5A15B`)**, **Ivory (`#F7F0E4`)**, and **Playfair Display & Inter** typography.

---

## 🌟 Key Highlights

- 📱 **Mobile-First Smartphone Experience**: Optimized for mobile browser access via QR code scans at Indian wedding venues.
- ⚡ **Automated Validation & Immediate Publishing**: Uploaded photos are verified (MIME type, magic byte signatures, dimension checks), metadata/GPS stripped with Sharp, and published instantly. **Zero manual approval queues**.
- 🔄 **Real-Time Live Feed**: Instant gallery updates, like counters, and moderation updates powered by **Socket.IO**.
- 🏰 **Ceremony & Event Discovery**: Segregated galleries for Haldi, Mehendi, Sangeet, Wedding, and Reception.
- 🔒 **Data Privacy & Zero Downloads**: Guest photo downloading is disabled (no download buttons, no bulk exports).
- 🏷️ **Multi-Tenant Isolation**: Complete isolation per wedding across database models, storage namespaces, and WebSocket rooms.
- 🛡️ **Role-Based Access Control**: Strict server-side verification for Owner, Admin, Event Manager, and Guest.

---

## 🏗️ Repository Architecture (Monorepo)

```
├── apps/
│   ├── api/                     # Node.js + Express REST API & Socket.IO Server
│   │   ├── src/
│   │   │   ├── config/          # DB, Clerk, Environment configuration
│   │   │   ├── controllers/     # Wedding, Event, Photo, Invitation, Moderation
│   │   │   ├── middleware/      # Clerk Auth, Tenant RBAC, Error Handler
│   │   │   ├── models/          # 9 MongoDB Mongoose models
│   │   │   ├── routes/          # Versioned REST endpoints (/api/v1)
│   │   │   ├── services/        # Storage (Cloudflare R2 / Local) & Sharp Image Processing
│   │   │   ├── sockets/         # Socket.IO wedding rooms
│   │   │   ├── app.js
│   │   │   └── server.js
│   │   └── test.js
│   └── web/                     # React + Vite + Tailwind CSS Mobile-First PWA
│       ├── public/              # Manifest, PWA service worker
│       └── src/
│           ├── components/      # RoyalHeader, BottomNav, PhotoCard, Viewer, Modals
│           ├── context/         # AuthContext with Clerk & Guest session support
│           ├── features/        # RoyalIntro, LiveGallery, Events, Upload, MyUploads, Profile, Admin
│           ├── layouts/         # MobileLayout with safe-area bottom navbar
│           └── styles/          # Royal Indian palette design tokens
├── packages/
│   └── shared/                  # Constants, Zod schemas, roles hierarchy & helpers
├── docs/                        # Architecture, DB Schema, REST API Docs, Deployment
├── .env.example
└── package.json
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- **Node.js** v20+ / v22+
- **MongoDB** (local MongoDB instance or MongoDB Atlas cluster URI)

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Ensure `MONGODB_URI` points to your MongoDB instance (e.g., `mongodb://localhost:27017/royal-wedding-platform`).

### 3. Install Dependencies
```bash
npm install
```

### 4. Run Initial Tests
```bash
npm test --workspaces
```

### 5. Seed Demo Wedding Space
```bash
npm run seed
```
Creates "Aarav & Diya's Royal Wedding" (`/w/royal-udaipur-2026`) with Haldi, Mehendi, Sangeet, Wedding, and Reception ceremonies.

### 6. Start Development Servers
Run frontend and backend concurrently:
```bash
# Terminal 1: Backend API (port 5000)
npm run dev:api

# Terminal 2: Mobile Frontend (port 5173)
npm run dev:web
```

---

## 📱 Mobile Guest User Flow

1. **QR Scan**: Guest scans a table or entrance QR code, opening `/w/royal-udaipur-2026`.
2. **Royal Intro**: An animated intro displays the royal crest, couple names, venue, and "Skip Intro" option.
3. **Guest Join**: Quick 1-click name entry or Clerk authentication.
4. **Live Gallery**: Guest lands on the live photos feed with real-time photo streaming and filter chips.
5. **Upload**: Instant camera capture or multi-photo picker with progress feedback and automated publishing.
6. **Couple & Admin Dashboard**: Accessible via `/admin` for analytics, QR generation, guest management, and photo moderation.

---

## 📄 Documentation Links
- [System Architecture](docs/architecture.md)
- [Database Schema Reference](docs/database-schema.md)
- [REST API Documentation](docs/api-documentation.md)
- [Production Deployment Guide](docs/deployment.md)
