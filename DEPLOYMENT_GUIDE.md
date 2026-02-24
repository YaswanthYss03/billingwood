# 🚀 Deployment Guide - Vercel (Frontend) + Render (Backend)

## 📋 Prerequisites

- ✅ GitHub account
- ✅ Vercel account (free tier works)
- ✅ Render account (free tier works)
- ✅ Supabase account (already configured)
- ✅ Upstash Redis account (already configured)

---

## 🎯 Deployment Overview

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Users → Vercel (Frontend) → Render (Backend)  │
│              ↓                    ↓             │
│         Next.js 16            NestJS            │
│                                  ↓              │
│                           Supabase + Redis      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Part 1️⃣: Deploy Backend to Render (Do This First!)

### Step 1: Push Code to GitHub

```bash
cd /media/yashwanth/34202d5a-878f-4974-abf7-aeb2d0d89bc5/POS_PLATFORM

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - BlitzPOS backend"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/blitzpos-backend.git
git branch -M main
git push -u origin main
```

### Step 2: Create Render Web Service

1. **Go to Render Dashboard**: https://dashboard.render.com/
2. **Click "New +" → "Web Service"**
3. **Connect GitHub Repository**: Select `blitzpos-backend`
4. **Configure Service**:
   ```
   Name: blitzpos-backend
   Region: Singapore (closest to your Supabase)
   Branch: main
   Root Directory: SaaS_Platform_POS
   Runtime: Node
   Build Command: npm install && npm run prisma:generate && npm run build
   Start Command: npm run prisma:deploy && npm run start:prod
   Plan: Starter (FREE)
   ```

### Step 3: Set Environment Variables on Render

**Click "Advanced" → "Add Environment Variable"** and add these:

```bash
# Database (REQUIRED - From your .env)
DATABASE_URL=postgresql://postgres:Saaspos@2026@db.czjxphvykwgroivqpbna.supabase.co:6543/postgres?pgbouncer=true&connect_timeout=10&pool_timeout=10&statement_cache_size=0

DIRECT_URL=postgresql://postgres:Saaspos@2026@db.czjxphvykwgroivqpbna.supabase.co:5432/postgres

# Supabase (REQUIRED - From your .env)
SUPABASE_URL=https://czjxphvykwgroivqpbna.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6anhwaHZ5a3dncm9pdnFwYm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTU0NTYsImV4cCI6MjA4NjYzMTQ1Nn0.PYaznnmP3YhBVkRpt4CVJvhDHqI57V9sDHN5WIjqnW0
SUPABASE_JWT_SECRET=4+DJTpTSC6wey9vGpei/HKIuP8eKf3/jtKn/iSbrfegPh/XcAFHYP/qiy1neCsZBwvP0zUxWEQcXpWhMVaGUfA==
SUPABASE_JWT_JWK={"x":"VPL0GmsFehb3S9QQAFFWX8NM4-rnOb7BN91UdGBMXrI","y":"NIT3dKTVnOgfO9691kM4CNq2aK4L2HTe0DIohYBmsPs","alg":"ES256","crv":"P-256","ext":true,"kid":"99244bb1-411c-4222-a518-6ed1f76c80aa","kty":"EC","key_ops":["verify"]}

# Redis (REQUIRED - From your .env)
REDIS_URL=rediss://default:AZzNAAIncDIyZTMzOGQzMzJmZjA0ZTZiOGEwMmM3ZThjMTQ5NGMxOHAyNDAxNDE@eminent-mallard-40141.upstash.io:6379

# Application Config
NODE_ENV=production
PORT=4000
API_PREFIX=api/v1
JWT_EXPIRATION=7d
THROTTLE_TTL=60
THROTTLE_LIMIT=100
LOG_LEVEL=info

# JWT Secret (Generate a secure random string)
JWT_SECRET=YOUR_SECURE_RANDOM_SECRET_AT_LEAST_32_CHARACTERS_LONG

# CORS (⚠️ LEAVE EMPTY FOR NOW - Will update after Vercel deployment)
CORS_ORIGIN=
```

### Step 4: Deploy Backend

1. Click **"Create Web Service"**
2. Wait 3-5 minutes for deployment
3. **Copy the Backend URL**: `https://blitzpos-backend.onrender.com`
4. **Test the backend**: 
   ```bash
   curl https://blitzpos-backend.onrender.com/api/v1/health
   # Should return: {"status":"ok","timestamp":"..."}
   ```

---

## Part 2️⃣: Deploy Frontend to Vercel

### Step 1: Push Frontend to GitHub

```bash
cd /media/yashwanth/34202d5a-878f-4974-abf7-aeb2d0d89bc5/POS_PLATFORM/pos-frontend

# Initialize git
git init
git add .
git commit -m "Initial commit - BlitzPOS frontend"

# Create GitHub repository and push
git remote add origin https://github.com/YOUR_USERNAME/blitzpos-frontend.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel

1. **Go to Vercel**: https://vercel.com/new
2. **Import Git Repository**: Select `blitzpos-frontend`
3. **Configure Project**:
   ```
   Framework Preset: Next.js
   Root Directory: ./
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

### Step 3: Add Environment Variables on Vercel

**Click "Environment Variables"** and add:

```bash
# Backend API (⚠️ REPLACE with your Render backend URL)
NEXT_PUBLIC_API_URL=https://blitzpos-backend.onrender.com/api/v1

# Supabase (Same as backend)
NEXT_PUBLIC_SUPABASE_URL=https://czjxphvykwgroivqpbna.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6anhwaHZ5a3dncm9pdnFwYm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTU0NTYsImV4cCI6MjA4NjYzMTQ1Nn0.PYaznnmP3YhBVkRpt4CVJvhDHqI57V9sDHN5WIjqnW0
```

### Step 4: Deploy Frontend

1. Click **"Deploy"**
2. Wait 2-3 minutes
3. **Copy Frontend URL**: `https://your-app.vercel.app`

---

## Part 3️⃣: Update CORS Settings (CRITICAL!)

### Go Back to Render Dashboard

1. **Open your backend service** on Render
2. **Go to "Environment" tab**
3. **Update `CORS_ORIGIN` variable**:
   ```bash
   CORS_ORIGIN=https://your-app.vercel.app
   ```
4. **Click "Save Changes"**
5. ⚠️ **Service will auto-redeploy** (1-2 minutes)

---

## Part 4️⃣: Test Your Deployment

### 1. Test Backend Health

```bash
curl https://blitzpos-backend.onrender.com/api/v1/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"2026-02-18T..."}
```

### 2. Test Frontend

Open: `https://your-app.vercel.app`

- Should see login page
- Try logging in with your test credentials
- Check browser console for errors

### 3. Test CORS

Open browser console on your Vercel app and run:
```javascript
fetch('https://blitzpos-backend.onrender.com/api/v1/health')
  .then(r => r.json())
  .then(data => console.log('✅ CORS working:', data))
  .catch(err => console.error('❌ CORS error:', err));
```

---

## 🎯 Post-Deployment Checklist

- [ ] Backend health endpoint working
- [ ] Frontend loads without errors
- [ ] Login functionality works
- [ ] No CORS errors in browser console
- [ ] POS page loads items
- [ ] Can create a test bill
- [ ] Receipt generates correctly
- [ ] Reports page loads data

---

## 🐛 Troubleshooting

### Issue 1: CORS Error in Browser Console

**Error**: `Access to fetch at 'https://backend.onrender.com' from origin 'https://app.vercel.app' has been blocked by CORS`

**Fix**:
1. Check Render environment variable `CORS_ORIGIN`
2. Make sure it matches your Vercel URL exactly
3. Redeploy backend on Render

### Issue 2: Backend Not Starting

**Check Render Logs**:
1. Go to Render Dashboard → Your Service → "Logs"
2. Look for errors in deployment logs
3. Common issues:
   - Missing environment variables
   - Database connection failed
   - Prisma migration failed

### Issue 3: "404 Not Found" on Backend

**Check**:
- URL should be: `https://your-backend.onrender.com/api/v1/health`
- NOT: `https://your-backend.onrender.com/health` (missing `/api/v1`)

### Issue 4: Frontend Shows "Network Error"

**Fix**:
1. Check `NEXT_PUBLIC_API_URL` in Vercel
2. Should end with `/api/v1` without trailing slash
3. Redeploy frontend

### Issue 5: Render Service Sleeping (Free Tier)

**Issue**: First request takes 30-60 seconds

**Solutions**:
- Use Render cron job to ping health endpoint every 10 minutes
- Upgrade to paid plan ($7/month for always-on)
- Accept the spin-up delay on free tier

---

## 🎨 Custom Domain Setup (Optional)

### For Frontend (Vercel):
1. Go to Vercel → Project Settings → Domains
2. Add your domain: `blitzpos.com`
3. Follow DNS configuration instructions
4. Update `CORS_ORIGIN` in Render to include your custom domain

### For Backend (Render):
1. Go to Render → Settings → Custom Domain
2. Add: `api.blitzpos.com`
3. Update DNS records
4. Update `NEXT_PUBLIC_API_URL` in Vercel

---

## 📊 Performance Optimizations

### Render (Backend)
- ✅ Using pgbouncer (connection pooling)
- ✅ Redis for caching
- ✅ Prisma query optimization
- ✅ Async operations with setImmediate

### Vercel (Frontend)
- ✅ Next.js automatic code splitting
- ✅ Image optimization
- ✅ CDN edge network
- ✅ Optimistic UI for instant response

---

## 💰 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Render Backend | Starter | $0 (Free tier) |
| Vercel Frontend | Hobby | $0 (Free tier) |
| Supabase | Free | $0 |
| Upstash Redis | Free | $0 |
| **Total** | | **$0/month** ✅ |

**Free Tier Limits**:
- Render: 750 hours/month (always on)
- Vercel: 100GB bandwidth, unlimited deployments
- Supabase: 500MB database, 2GB bandwidth
- Upstash: 10k commands/day

---

## 🚀 Ready to Deploy?

Once you provide the URLs, I'll update the code with the correct values!

**I need from you**:
1. Backend URL (after Render deployment)
2. Frontend URL (after Vercel deployment)

Then I'll update:
- ✅ `CORS_ORIGIN` in backend
- ✅ `NEXT_PUBLIC_API_URL` in frontend
- ✅ Verify CORS configuration
