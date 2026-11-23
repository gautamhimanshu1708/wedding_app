# Database Schema Reference (MongoDB & Mongoose)

The platform is designed with schema-level validation, multi-tenant compound indexes, and relational integrity across wedding boundaries.

## Collections

### 1. `users`
- `_id`: ObjectId
- `clerkUserId`: String (Indexed, Unique)
- `name`: String
- `email`: String (Indexed)
- `avatar`: String
- `createdAt`: Date
- `updatedAt`: Date

### 2. `weddings`
- `_id`: ObjectId
- `title`: String
- `slug`: String (Indexed, Unique)
- `ownerId`: ObjectId (Ref: User, Indexed)
- `coupleNames`: Object `{ partner1: String, partner2: String }`
- `weddingDate`: Date
- `venue`: String
- `coverImage`: String
- `theme`: Object `{ primary: String, secondary: String, font: String }`
- `settings`: Object `{ allowGuestUploads: Boolean, maxPhotosPerGuest: Number, isPrivate: Boolean }`
- `status`: String `['active', 'archived', 'draft']`
- `createdAt`: Date
- `updatedAt`: Date

### 3. `memberships`
- `_id`: ObjectId
- `weddingId`: ObjectId (Ref: Wedding, Indexed)
- `userId`: ObjectId (Ref: User, Indexed)
- `role`: String `['owner', 'admin', 'event_manager', 'guest']`
- `status`: String `['active', 'blocked', 'pending']`
- `joinedAt`: Date
*Compound Index: `{ weddingId: 1, userId: 1 }` (Unique)*

### 4. `events`
- `_id`: ObjectId
- `weddingId`: ObjectId (Ref: Wedding, Indexed)
- `name`: String
- `description`: String
- `date`: Date
- `coverImage`: String
- `status`: String `['upcoming', 'live', 'completed']`
- `createdAt`: Date

### 5. `photos`
- `_id`: ObjectId
- `weddingId`: ObjectId (Ref: Wedding, Indexed)
- `eventId`: ObjectId (Ref: Event, Indexed)
- `uploadedBy`: ObjectId (Ref: User, Indexed)
- `originalObjectKey`: String
- `thumbnailObjectKey`: String
- `displayObjectKey`: String
- `mimeType`: String
- `sizeBytes`: Number
- `width`: Number
- `height`: Number
- `caption`: String
- `processingStatus`: String `['pending', 'processing', 'completed', 'failed', 'quarantined']`
- `publicationStatus`: String `['published', 'hidden', 'reported', 'deleted']`
- `likesCount`: Number (Default: 0)
- `createdAt`: Date
*Compound Index: `{ weddingId: 1, publicationStatus: 1, createdAt: -1 }`*
*Compound Index: `{ weddingId: 1, eventId: 1, publicationStatus: 1, createdAt: -1 }`*

### 6. `invitations`
- `_id`: ObjectId
- `weddingId`: ObjectId (Ref: Wedding, Indexed)
- `tokenHash`: String (Indexed, Unique)
- `role`: String `['guest', 'event_manager', 'admin']`
- `expiresAt`: Date
- `maxUses`: Number
- `usedCount`: Number (Default: 0)
- `status`: String `['active', 'revoked', 'expired']`
- `createdAt`: Date

### 7. `likes`
- `_id`: ObjectId
- `weddingId`: ObjectId (Ref: Wedding, Indexed)
- `photoId`: ObjectId (Ref: Photo, Indexed)
- `userId`: ObjectId (Ref: User, Indexed)
- `createdAt`: Date
*Compound Index: `{ photoId: 1, userId: 1 }` (Unique)*

### 8. `guest_messages`
- `_id`: ObjectId
- `weddingId`: ObjectId (Ref: Wedding, Indexed)
- `userId`: ObjectId (Ref: User, Indexed)
- `message`: String
- `createdAt`: Date

### 9. `photo_reports`
- `_id`: ObjectId
- `weddingId`: ObjectId (Ref: Wedding, Indexed)
- `photoId`: ObjectId (Ref: Photo, Indexed)
- `reportedBy`: ObjectId (Ref: User, Indexed)
- `reason`: String
- `details`: String
- `status`: String `['pending', 'reviewed', 'dismissed', 'actioned']`
- `createdAt`: Date
