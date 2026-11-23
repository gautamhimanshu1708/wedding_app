# REST API Documentation (/api/v1)

All endpoints are versioned under `/api/v1`. Authenticated requests require an Authorization header with Bearer token:
`Authorization: Bearer <clerk_or_jwt_token>`

## 1. Authentication & Profile
- `GET /api/v1/auth/me` — Get current authenticated user profile and memberships.
- `POST /api/v1/auth/sync` — Synchronize Clerk user data to MongoDB.

## 2. Weddings
- `POST /api/v1/weddings` — Create a new wedding space (User becomes Owner).
- `GET /api/v1/weddings/my` — List all weddings current user is a member of.
- `GET /api/v1/weddings/:slug` — Get wedding public metadata (couple names, date, venue, intro).
- `PUT /api/v1/weddings/:id` — Update wedding settings (Owner/Admin only).
- `GET /api/v1/weddings/:id/stats` — Get wedding analytics and storage consumption.

## 3. Events
- `GET /api/v1/weddings/:id/events` — Get all events for a wedding.
- `POST /api/v1/weddings/:id/events` — Create an event (Admin / Event Manager).
- `PUT /api/v1/weddings/:id/events/:eventId` — Update an event.
- `DELETE /api/v1/weddings/:id/events/:eventId` — Archive an event.

## 4. Invitations & QR Access
- `POST /api/v1/weddings/:id/invitations` — Generate a secure invitation link / QR payload.
- `GET /api/v1/invitations/validate/:token` — Validate an invitation token.
- `POST /api/v1/invitations/join/:token` — Join a wedding using an invitation token.

## 5. Photos & Live Feed
- `GET /api/v1/weddings/:id/photos` — Get paginated live photo feed (filters: eventId, uploaderId, sort).
- `POST /api/v1/weddings/:id/photos/upload-session` — Request upload credentials or direct processing session.
- `POST /api/v1/weddings/:id/photos/upload-direct` — Direct multipart photo upload (with automatic Sharp optimization and publish).
- `POST /api/v1/weddings/:id/photos/:photoId/like` — Toggle like for a photo.
- `POST /api/v1/weddings/:id/photos/:photoId/report` — Report inappropriate photo.
- `GET /api/v1/weddings/:id/photos/my` — Get current user's uploads for this wedding.

## 6. Guestbook & Messages
- `GET /api/v1/weddings/:id/messages` — Get wedding guestbook messages.
- `POST /api/v1/weddings/:id/messages` — Post a congratulatory message.

## 7. Moderation (Admins)
- `GET /api/v1/weddings/:id/moderation/reports` — List reported photos.
- `PATCH /api/v1/weddings/:id/moderation/photos/:photoId` — Hide, quarantine, or restore a photo.
- `GET /api/v1/weddings/:id/members` — List wedding guests and members.
- `PATCH /api/v1/weddings/:id/members/:memberId` — Update guest role or block access.
