# 🚀 Royal Wedding Platform — Deployment Guide (Option 1: Vercel + Render)

This guide walks you through deploying the **Frontend to Vercel** and the **Backend to Render** with live WebSockets and Google Drive support.

---

## Architecture Overview

- **Frontend (`apps/web`)**: Hosted on **Vercel** (Global edge CDN, instant page loads, free SSL).
- **Backend (`apps/api`)**: Hosted on **Render** (Continuous Node.js runtime, native Socket.IO WebSockets).
- **Database**: **MongoDB Atlas** (Managed cloud cluster).
- **Photos Storage**: **Google Drive** or **Cloudflare R2** (Set up via in-portal admin settings).

---

## Part 1: Deploy Backend on Render (Do this first)

1. Sign up / Log in to [Render.com](https://render.com).
2. Click **"New +"** in the top navigation and select **"Web Service"**.
3. Connect your GitHub repository (`wedding_app`).
4. Configure the settings:
   - **Name**: `royal-wedding-api`
   - **Region**: Choose closest to you (e.g., *Singapore / Frankfurt / Ohio*)
   - **Branch**: `main`
   - **Root Directory**: `.` *(leave blank or root)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start --workspace=apps/api`
   - **Plan**: `Free`
5. Under **Environment Variables**, click **"Add Environment Variable"** and add:
   | Key | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `MONGODB_URI` | *Your MongoDB Atlas connection string* |
   | `CLERK_SECRET_KEY` | *Your Clerk Secret Key from clerk.com* |
   | `CLIENT_URL` | *Your Vercel URL (e.g. `https://royal-wedding.vercel.app` — you can update this after Vercel deploy)* |
   | `JWT_SECRET` | *Any long random secure string* |
6. Click **"Deploy Web Service"**.
7. Once deployed, Render will display your backend URL (e.g. `https://royal-wedding-api.onrender.com`).
   - Test it by visiting: `https://royal-wedding-api.onrender.com/api/health`
   - It should return: `{"status":"ok","timestamp":"..."}`

---

## Part 2: Deploy Frontend on Vercel

1. Sign up / Log in to [Vercel.com](https://vercel.com).
2. Click **"Add New..."** → **"Project"**.
3. Import your GitHub repository (`wedding_app`).
4. Configure the project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select **`apps/web`**
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. In **Environment Variables**, add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Your Clerk Publishable Key |
   | `VITE_API_URL` | `https://royal-wedding-api.onrender.com` | Your Render backend URL from Part 1 |
6. Click **"Deploy"**.
7. In ~30 seconds, Vercel will give you a live production link (e.g., `https://royal-wedding.vercel.app`)!

---

## Part 3: Final 1-Minute Connection

1. Go back to your **Render Dashboard** → `royal-wedding-api` → **Environment**.
2. Set `CLIENT_URL` to your exact Vercel frontend URL (e.g. `https://royal-wedding.vercel.app`).
3. In your **Clerk Dashboard** ([dashboard.clerk.com](https://dashboard.clerk.com)):
   - Go to **Configure** → **Paths / Domains**
   - Add your Vercel domain to the allowed origins.

---

## Done! 🎉

- **Admins & Couples**: Visit `https://your-domain.vercel.app/admin` to set up ceremonies, generate printable QR cards, and connect Google Drive.
- **Guests**: Scan the ceremony QR from their phone camera or open the link to view memories and upload in real-time.
