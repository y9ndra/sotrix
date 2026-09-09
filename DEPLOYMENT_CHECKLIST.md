# ☁️ Sotrix Cloud Deployment Checklist & Plan

This document guides the deployment of Sotrix: **Backend on Render (Docker)**, **Frontend on Vercel**, **MongoDB Atlas**, and **Upstash Redis**.

---

## 📌 When to Switch to Upstash Redis?
> **Answer: During Phase 2 (Configuring Render Environment Variables)**
> 
> - **Locally**: Keep your local Redis (`redis://localhost:6379`) in your local `.env`.
> - **In Production (Render)**: Render is in the cloud and cannot access `localhost`. In **Phase 2**, sign up for a free Redis database at [Upstash](https://upstash.com/), copy the connection URL (format: `rediss://default:<password>@<host>.upstash.io:6379`), and set it as `REDIS_URL` inside Render's **Environment Variables** dashboard. No code changes are required!

---

## 📋 Phase-by-Phase Checklist

### ✅ Phase 1: Local Cleanup & Pre-Deployment Hardening (Codebase)
- [x] **Remove Accidental Binary Uploads**: Untracked `server/uploads/*` and preserved directory structure with `.gitkeep`.
- [x] **Remove Dead/Unused Assets**: Removed unused boilerplate (`react.svg`, `vite.svg`, placeholder READMEs).
- [x] **Optimize `.dockerignore`**: Excluded `tests/`, `jest.config.js`, `uploads/`, `coverage/` from the Docker build context so Render builds are lean and fast.
- [x] **Update `.gitignore`**: Ensure local uploads, caches, coverage, and `.env*` files are strictly ignored.
- [x] **SPA Routing on Vercel (`vercel.json`)**: Configured client-side rewrite rules to prevent 404 errors when refreshing pages in React Router.
- [x] **Bind Host to `0.0.0.0`**: Updated `server/src/server.ts` to listen on `0.0.0.0:PORT` for Render container networking.
- [x] **Database Variable Fallback**: Supported both `DATABASE_URL` and `MONGO_URI` across `server/src/config/db.ts` and `server/src/config/env.ts`.
- [x] **Cross-Site Cookie Handling**: Configured `sameSite: "none"` and `secure: true` for the refresh token in production (`NODE_ENV === "production"`) so cross-domain authentication between Vercel and Render works.
- [x] **Multi-Origin CORS**: Allowed comma-separated origins in `CLIENT_URL` across Express and Socket.IO.
- [x] **Inline Worker Support**: Added `RUN_INLINE_WORKER=true` capability so background jobs (BullMQ) can run within the single free Web Service container on Render without requiring a paid background worker.

---

### 🚀 Phase 2: Deploy Backend to Render (Docker)
1. **Create Upstash Redis Database**:
   - Go to [console.upstash.com](https://console.upstash.com/) -> Create Database -> Choose Redis (Free Serverless).
   - Under **Connect Details**, copy the **Node.js / ioredis** URL or the raw connection string:
     `rediss://default:<password>@<endpoint>.upstash.io:6379`
2. **Create MongoDB Atlas Cluster** (if not already done):
   - Whitelist `0.0.0.0/0` (allow access from anywhere) in Atlas Network Access so Render can connect.
   - Copy connection string: `mongodb+srv://<user>:<password>@cluster.mongodb.net/sotrix?retryWrites=true&w=majority`
3. **Create Web Service on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com/) -> **New +** -> **Web Service**.
   - Connect your GitHub repository: `y9ndra/sotrix`.
   - **Name**: `sotrix-backend`
   - **Root Directory**: `server` *(Important: NOT `backend`)*
   - **Runtime**: **Docker**
   - **Health Check Path**: `/health`
4. **Set Environment Variables on Render**:
   | Variable | Value | Notes |
   |---|---|---|
   | `NODE_ENV` | `production` | Enables production optimizations & cross-site cookies |
   | `PORT` | `5000` | Render will bind this port |
   | `DATABASE_URL` | `mongodb+srv://...` | From MongoDB Atlas |
   | `REDIS_URL` | `rediss://default:...` | From Upstash Redis |
   | `JWT_SECRET` | `<your-32-char-random-secret>` | Auth signing key |
   | `JWT_ACCESS_SECRET` | `<your-jwt-access-secret>` | (Optional: defaults to JWT_SECRET) |
   | `JWT_REFRESH_SECRET` | `<your-jwt-refresh-secret>` | (Optional: defaults to JWT_SECRET) |
   | `CLIENT_URL` | `http://localhost:5173` | Set temporarily; update in Phase 4 once Vercel URL is known |
   | `CLOUDINARY_CLOUD_NAME` | `<your-cloud-name>` | From Cloudinary dashboard |
   | `CLOUDINARY_API_KEY` | `<your-api-key>` | From Cloudinary dashboard |
   | `CLOUDINARY_API_SECRET` | `<your-api-secret>` | From Cloudinary dashboard |
   | `RUN_INLINE_WORKER` | `true` | Runs BullMQ workers inside the web container |
5. **Deploy & Verify**:
   - Click **Deploy Web Service**.
   - Once deployment completes, visit:
     `https://<your-service-name>.onrender.com/health`
   - Expect: `{"status":"success","message":"Sotrix Backend is running smoothly",...}`

---

### 🌐 Phase 3: Deploy Frontend to Vercel
1. Go to [vercel.com](https://vercel.com/) -> **Add New...** -> **Project**.
2. Select your `sotrix` repository.
3. Configure Project:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set Environment Variables on Vercel:
   | Variable | Value |
   |---|---|
   | `VITE_API_BASE_URL` | `https://<your-backend>.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://<your-backend>.onrender.com` |
5. Click **Deploy**.
6. Copy your live Vercel URL (e.g., `https://sotrix-app.vercel.app`).

---

### 🔄 Phase 4: Connect Vercel & Render + Verification
1. Return to **Render Dashboard** -> `sotrix-backend` -> **Environment**.
2. Update `CLIENT_URL` to your Vercel URL:
   ```text
   CLIENT_URL=https://sotrix-app.vercel.app
   ```
3. Render will automatically redeploy with the updated CORS origin.
4. **End-to-End Verification**:
   - Visit `https://sotrix-app.vercel.app`.
   - Test Sign Up / Sign In.
   - Inspect network requests to confirm cookies (`refreshToken`) and Bearer tokens work cross-domain.
   - Test creating a post and image upload to Cloudinary.
   - Test real-time messaging / presence via WebSockets.

---

### 🔁 Phase 5: CI/CD Continuous Deployment Test
1. Make a small update in `README.md`.
2. Commit and push:
   ```bash
   git add README.md
   git commit -m "docs: test automated deployment"
   git push origin main
   ```
3. Check **GitHub Actions** tab: backend & frontend CI should pass.
4. Check **Render** and **Vercel** dashboards: both will automatically detect the commit, build, and deploy new live versions.
