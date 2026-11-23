# Royal Wedding Platform — Architecture Overview

## 1. System Vision
The Royal Wedding Photo Sharing Platform is a multi-tenant, mobile-first web application designed for the high-volume, real-time photo sharing needs of Indian weddings.

## 2. Architecture Diagram

```mermaid
flowchart TD
    GuestMobile["Guest Smartphone (Mobile Browser / PWA)"] -->|QR Scan / HTTPS| CloudflareCDN["Cloudflare CDN / Edge"]
    AdminDesktop["Couple & Admin Dashboard"] -->|HTTPS| CloudflareCDN
    
    CloudflareCDN --> Frontend["React + Vite Mobile PWA (@wedding/web)"]
    Frontend -->|Clerk Auth Flow| Clerk["Clerk Authentication Service"]
    Frontend -->|REST API /api/v1| ExpressAPI["Express REST API Server (@wedding/api)"]
    Frontend <-->|WebSockets| SocketIO["Socket.IO Real-time Engine"]
    
    ExpressAPI --> MongoDB[("MongoDB Atlas Database")]
    ExpressAPI --> SharpWorker["Sharp Image Processor (EXIF strip, Thumbnail, Display WebP)"]
    ExpressAPI <--> R2Storage[("Cloudflare R2 Private Bucket")]
    
    SharpWorker -->|Async Publish Event| SocketIO
    SocketIO -->|Broadcast to Wedding Room| GuestMobile
```

## 3. Key Tenets
1. **Multi-Tenancy & Data Isolation**:
   - Every wedding is completely isolated. Data queries always enforce `weddingId` filtering on backend middleware.
   - Storage objects in Cloudflare R2 are namespaced: `weddings/{weddingId}/photos/{photoId}/{variant}.webp`.
   - Socket.IO rooms are segmented per wedding: `room:wedding:{weddingId}`.

2. **Automated Validation & Immediate Publishing**:
   - Zero manual approval queue for standard uploads.
   - Real-time MIME type validation, magic bytes signature verification, and image dimension checking.
   - GPS and sensitive EXIF metadata stripped via Sharp before saving.
   - Thumbnails (400px width) and display versions (1600px width) generated on the fly.
   - Sockets immediately broadcast newly published photos to all connected guests in that wedding room.

3. **Privacy & Security**:
   - No direct photo download buttons or bulk guest ZIP exports.
   - No watermarking or awkward screenshot blockers.
   - Role-Based Access Control (RBAC): Owner, Admin, Event Manager, Guest.
   - Invitations use cryptographically secure random tokens; token hashes (`sha256`) are stored in the database.
