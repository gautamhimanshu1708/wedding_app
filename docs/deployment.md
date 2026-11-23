# Deployment & Production Setup Guide

## 1. Prerequisites
- MongoDB Atlas cluster (M0 free tier or higher).
- Cloudflare R2 bucket (`royal-wedding-photos`) and API tokens with Object Read & Write permissions.
- Clerk project (`https://dashboard.clerk.com`) for modern authentication.
- Vercel (for `@wedding/web`) and Render / Fly.io / Railway (for `@wedding/api`).

## 2. Environment Variables Checklist
Ensure both client and server receive their respective variables as documented in `.env.example`.

### Frontend (`apps/web` on Vercel):
- `VITE_CLERK_PUBLISHABLE_KEY`: Clerk Frontend API key.
- `VITE_API_URL`: Production backend URL (e.g. `https://api.yourweddingapp.com`).

### Backend (`apps/api` on Render/Railway):
- `PORT`: Usually 5000 or `$PORT` assigned by host.
- `NODE_ENV`: `production`.
- `CLIENT_URL`: URL of the deployed frontend.
- `MONGODB_URI`: Atlas connection string with username/password.
- `CLERK_SECRET_KEY`: Clerk backend secret key.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`.
- `JWT_SECRET`: 64-character random string.

## 3. High-Concurrency Mobile Wedding Optimizations
- **Edge Caching**: Static assets served via Cloudflare CDN.
- **WebSocket Scaling**: For multi-server backend setups, attach `@socket.io/redis-adapter` using `REDIS_URL`.
- **Private Image Delivery**: R2 pre-signed URLs with 15-minute TTL ensure wedding photos are private while remaining performant.
