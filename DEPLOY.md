# Deployment Guide — Production Setup

Complete step-by-step guide to deploy your dashboard app to the cloud, free of cost.

**End result:**
- Database on MongoDB Atlas (cloud)
- Backend API on Render (free tier)
- Frontend on Vercel (free tier)
- Public URL that works from anywhere, 24/7

**Total time:** ~2-3 hours (most of it is waiting for builds/DNS)

---

## Phase 1 — MongoDB Atlas (database)

### 1.1 Create Atlas account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up with email or Google
3. Answer the onboarding questions:
   - Goal: "Build a new app"
   - Language: JavaScript / Node.js

### 1.2 Create a free cluster

1. Click **"Create"** under "Deploy your database"
2. Choose **M0 Free** tier
3. Provider: **AWS**
4. Region: **Mumbai (ap-south-1)** — closest to India
5. Cluster name: keep default or rename to `dashboard-cluster`
6. Click **Create Deployment**

This takes ~3-5 minutes.

### 1.3 Configure security

A modal will appear asking for connection setup:

**a) Database user:**
- Username: `dashboardadmin`
- Password: click "Autogenerate Secure Password" → **COPY THIS PASSWORD AND SAVE IT** (you can't see it again)
- Click **Create User**

**b) Network access:**
- Click "Add My Current IP Address" first (so you can connect from your laptop)
- Then click **"Add a Different IP Address"** → enter `0.0.0.0/0` → click Add
- Why `0.0.0.0/0`: this allows Render's servers to connect (their IPs change). For higher security later, you can use Render's static outbound IPs (paid plan).
- Click **Finish and Close**

### 1.4 Get connection string

1. In Atlas dashboard, click **"Connect"** button on your cluster
2. Choose **"Drivers"**
3. Driver: Node.js, Version: latest
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://dashboardadmin:<password>@dashboard-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with the password you saved
6. Add database name `/dashboard_app` before the `?`:
   ```
   mongodb+srv://dashboardadmin:YourPass@dashboard-cluster.xxxxx.mongodb.net/dashboard_app?retryWrites=true&w=majority
   ```
7. **Save this final connection string** — you'll paste it into Render in Phase 2

### 1.5 Test connection (optional but recommended)

Open your local backend `.env` file. Temporarily change:
```
MONGO_URI=mongodb+srv://dashboardadmin:YourPass@dashboard-cluster.xxxxx.mongodb.net/dashboard_app?retryWrites=true&w=majority
```

Run `npm run dev` — you should see `✅ MongoDB connected: dashboard-cluster.xxxxx.mongodb.net`.

If yes, your Atlas setup is correct! Optionally run `npm run seed` to populate it with demo data.

⚠️ **Revert your local `.env` back to local MongoDB** after testing — keep cloud DB for production only.

---

## Phase 2 — Backend on Render

### 2.1 Push your code to GitHub

Render deploys from a GitHub repo. If your code isn't on GitHub yet:

```bash
cd C:\Users\twink\Downloads\dashboard-app\crm-saas
git init
git add .
git commit -m "Initial commit"
```

Then on GitHub:
1. Go to https://github.com/new
2. Repository name: `dashboard-app`
3. Keep it **Private** (so JWT secret etc don't leak)
4. Don't initialize with README (you already have files)
5. Click **Create**
6. Follow the "push existing repository" commands GitHub shows you, e.g:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/dashboard-app.git
   git branch -M main
   git push -u origin main
   ```

### 2.2 Create Render account

1. Go to https://render.com
2. Sign up with **GitHub** (this auto-links your repos)
3. Authorize Render to access your repositories

### 2.3 Create Web Service for backend

1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Connect your `dashboard-app` repository
3. Configure:
   - **Name**: `dashboard-backend` (this becomes part of your URL)
   - **Region**: Singapore (closest to India)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free**

4. Click **"Advanced"** to set environment variables. Add these:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | *paste the Atlas connection string from Phase 1.4* |
   | `JWT_SECRET` | *generate one — see below* |
   | `JWT_EXPIRES_IN` | `7d` |
   | `RATE_LIMIT_MAX` | `200` |
   | `CLIENT_URL` | `http://localhost:5173` *(temporary; we'll update this after frontend deploy)* |

   **Generating JWT_SECRET:** Open any terminal and run:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the 64-char string output. Paste as `JWT_SECRET`.

5. Click **"Create Web Service"**

### 2.4 Wait for first deploy (~5 minutes)

Render will:
1. Clone your repo
2. Run `npm install` in `/backend`
3. Run `npm start`
4. Show logs in real-time

When you see `🚀 Server running on port 10000 (production)` — you're live.

### 2.5 Test the backend

Render will show your service URL at the top, like:
```
https://dashboard-backend-xxxx.onrender.com
```

Open in browser: `https://dashboard-backend-xxxx.onrender.com/api/health`

You should see: `{"status":"ok","uptime":42.5}`

🎉 Backend is live! Save this URL — you'll need it for the frontend.

### 2.6 Seed production database (optional)

If you want demo data in production Atlas:

In Render dashboard → your service → **"Shell"** tab → run:
```bash
node src/utils/seed.js
```

⚠️ Only do this once. Re-running wipes data.

For a fresh production app, **skip seeding** — let your client add their real data.

---

## Phase 3 — Frontend on Vercel

### 3.1 Update frontend env

In your local `frontend/.env` file:
```env
VITE_API_URL=https://dashboard-backend-xxxx.onrender.com/api
VITE_SOCKET_URL=https://dashboard-backend-xxxx.onrender.com
```

(Use the actual Render URL from Phase 2.5.)

Commit and push:
```bash
git add frontend/.env.example frontend/.env
git commit -m "Add production API URL"
git push
```

⚠️ **Wait — `.env` files shouldn't go to git** because they're listed in `.gitignore`. Instead, we'll set these as **Vercel environment variables** in step 3.3. Skip the commit if `.env` is gitignored (it is, by default).

### 3.2 Create Vercel account

1. Go to https://vercel.com/signup
2. Sign up with **GitHub** (same as Render)
3. Authorize Vercel

### 3.3 Import project

1. Click **"Add New..."** → **"Project"**
2. Import your `dashboard-app` repository
3. Configure:
   - **Framework Preset**: Vite (should auto-detect)
   - **Root Directory**: click "Edit" → select `frontend`
   - **Build Command**: `npm run build` (default)
   - **Output Directory**: `dist` (default)
   - **Install Command**: `npm install` (default)

4. **Environment Variables** — expand this section, add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_URL` | `https://dashboard-backend-xxxx.onrender.com/api` |
   | `VITE_SOCKET_URL` | `https://dashboard-backend-xxxx.onrender.com` |

5. Click **"Deploy"**

### 3.4 Wait for build (~2 minutes)

Vercel will:
1. Clone repo
2. Install dependencies
3. Run `npm run build`
4. Deploy the `dist/` folder to their CDN

When done, you'll see your URL like:
```
https://dashboard-app-xxxx.vercel.app
```

### 3.5 Update backend CLIENT_URL

Now that you know the frontend URL, go back to Render:

1. Render dashboard → `dashboard-backend` → **Environment**
2. Edit `CLIENT_URL`:
   ```
   https://dashboard-app-xxxx.vercel.app
   ```
3. Click **Save Changes**
4. Render will redeploy automatically (~1 min)

### 3.6 Test the live app!

1. Open `https://dashboard-app-xxxx.vercel.app`
2. Register a new account (first user becomes admin)
3. Add a team, add a registration, check the dashboard

If it all works — **you have a live app!** 🎉

Send the URL to your client.

---

## Common issues & fixes

### "Failed to save" / CORS error after deploy

**Cause:** `CLIENT_URL` on Render doesn't match the actual Vercel URL.

**Fix:** Render → Environment → make `CLIENT_URL` exactly equal to Vercel URL (no trailing slash).

### Backend takes 30-60 seconds to respond first time

**Cause:** Render free tier sleeps after 15 min of idle time. First request after sleep wakes it up ("cold start").

**Options:**
1. **Accept it** — clients used to it once you explain
2. **UptimeRobot** (free) — pings your `/api/health` every 5 min to keep it warm: https://uptimerobot.com
3. **Upgrade Render to Starter ($7/mo)** — no sleep, instant response

### MongoDB connection error from Render

**Cause:** Atlas Network Access doesn't include `0.0.0.0/0`.

**Fix:** Atlas → Security → Network Access → Add IP Address → `0.0.0.0/0` (Allow Access from Anywhere).

### Vercel build fails

**Common cause:** Missing dependency in `package.json` (e.g. you imported something but didn't install it).

**Fix:** Look at Vercel build logs — usually says exactly what's missing. Run `cd frontend && npm install <package>` locally, commit, push.

### "Cannot find module" on Render

**Cause:** Same as above — missing dep.

**Fix:** `cd backend && npm install <package>`, commit, push.

---

## What's next after Phase 3

Once everything works:

1. **Custom domain** (optional) — buy from GoDaddy/Namecheap, point DNS to Vercel + Render. ~30 min setup, ~24-48 hr DNS propagation.

2. **Email notifications** — sign up for Resend (free 3000/mo), add API key as Render env var, integrate in backend code.

3. **UptimeRobot** — keep backend warm, also alerts you if it goes down.

4. **MongoDB backups** — Atlas free tier has automatic daily backups (kept 2 days). For longer retention, upgrade to M10 paid tier or use `mongodump` from a cron job.

5. **Custom branding** — replace "Dashboard Pro" name and logo in `Sidebar.jsx`, `LoginPage.jsx`, `index.html`.
