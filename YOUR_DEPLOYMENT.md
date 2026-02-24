# ✅ YOUR DEPLOYMENT CONFIGURATION

## 🌐 Deployed URLs

**Frontend (Vercel)**: https://billingwoodpos.vercel.app/
**Backend (Render)**: https://billingwoodserver.onrender.com

---

## 🔧 IMMEDIATE ACTION REQUIRED

### Step 1: Update Render Environment Variable (CRITICAL!)

1. Go to Render Dashboard: https://dashboard.render.com/
2. Open your backend service: **billingwoodserver**
3. Click **"Environment"** tab
4. Find the `CORS_ORIGIN` variable
5. Update it to:
   ```
   https://billingwoodpos.vercel.app
   ```
6. Click **"Save Changes"**
7. ⚠️ Service will auto-redeploy (takes 2-3 minutes)

**Why this is critical**: Without this, your frontend will get CORS errors and won't be able to connect to the backend.

---

### Step 2: Verify Vercel Environment Variables

1. Go to Vercel Dashboard: https://vercel.com/
2. Open your project: **billingwoodpos**
3. Go to **Settings → Environment Variables**
4. Verify these exist (add if missing):

```bash
NEXT_PUBLIC_API_URL=https://billingwoodserver.onrender.com/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://czjxphvykwgroivqpbna.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6anhwaHZ5a3dncm9pdnFwYm5hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTU0NTYsImV4cCI6MjA4NjYzMTQ1Nn0.PYaznnmP3YhBVkRpt4CVJvhDHqI57V9sDHN5WIjqnW0
```

5. If you added/changed anything, click **"Redeploy"**

---

## 🧪 Test Your Deployment

### Test 1: Backend Health Check

Open in browser or run in terminal:
```bash
curl https://billingwoodserver.onrender.com/api/v1/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"2026-02-18T..."}
```

⚠️ **First load may take 30-60 seconds** (Render free tier cold start)

---

### Test 2: Frontend Access

Open: https://billingwoodpos.vercel.app/

**Expected**: Login page shows with no errors in browser console

---

### Test 3: CORS Verification

1. Open: https://billingwoodpos.vercel.app/
2. Open browser **Developer Tools** (F12)
3. Go to **Console** tab
4. Paste this:
   ```javascript
   fetch('https://billingwoodserver.onrender.com/api/v1/health')
     .then(r => r.json())
     .then(data => console.log('✅ CORS working:', data))
     .catch(err => console.error('❌ CORS error:', err));
   ```
5. Press Enter

**Expected**: See `✅ CORS working: {status: "ok", ...}`

**If you see CORS error**: Go back to Step 1 and verify `CORS_ORIGIN` is set correctly in Render

---

### Test 4: Full Login Flow

1. Go to: https://billingwoodpos.vercel.app/login
2. Login with your test credentials
3. Should redirect to dashboard
4. Check that data loads (items, categories, etc.)

---

## 📋 Deployment Checklist

After completing Steps 1 & 2, verify:

- [ ] Backend health check returns `{"status":"ok"}`
- [ ] Frontend loads without errors
- [ ] No CORS errors in browser console
- [ ] Can login successfully
- [ ] Dashboard loads
- [ ] POS page shows items
- [ ] Can create a test bill
- [ ] Receipt generates
- [ ] Reports load data

---

## 🚨 Common Issues & Fixes

### Issue 1: CORS Error
**Symptom**: Console shows "blocked by CORS policy"
**Fix**: Update `CORS_ORIGIN` in Render to `https://billingwoodpos.vercel.app`

### Issue 2: Backend Returns 500 Error
**Symptom**: All API calls fail with 500
**Check**: Render logs (Dashboard → Logs tab)
**Common causes**: Missing environment variables, database connection failed

### Issue 3: "Network Error" on Frontend
**Symptom**: All API calls fail immediately
**Fix**: Check `NEXT_PUBLIC_API_URL` in Vercel is set to `https://billingwoodserver.onrender.com/api/v1`

### Issue 4: Backend Takes Forever to Load
**Cause**: Render free tier cold start (30-60 seconds)
**Solutions**:
- Keep health check open in a tab (prevents sleep)
- Upgrade to paid plan ($7/month for instant  start)
- Use Render cron job to ping every 10 minutes

### Issue 5: Login Fails
**Symptom**: "Invalid credentials" or network error
**Check**:
1. Supabase environment variables match in both Render and Vercel
2. JWT secrets are correct
3. Database has users (check Supabase dashboard)

---

## 🎯 Automated Verification

Run the verification script:
```bash
cd /media/yashwanth/34202d5a-878f-4974-abf7-aeb2d0d89bc5/POS_PLATFORM
./verify-deployment.sh
```

When prompted, enter:
- Backend URL: `https://billingwoodserver.onrender.com`
- Frontend URL: `https://billingwoodpos.vercel.app`

---

## 📊 Next Steps After Successful Deployment

1. **Create Test Data**:
   - Login to your app
   - Create categories, items
   - Test billing flow
   - Generate reports

2. **Performance Monitoring**:
   - Monitor Render logs for errors
   - Check Vercel analytics
   - Monitor database usage in Supabase

3. **Custom Domain** (Optional):
   - Frontend: Add custom domain in Vercel
   - Backend: Add custom domain in Render
   - Update CORS_ORIGIN when domain changes

4. **Backup Strategy**:
   - Supabase provides automated backups
   - Export important data weekly
   - Test restore procedures

---

## 🆘 Need Help?

If something isn't working:

1. Check Render logs: Dashboard → Your Service → Logs
2. Check Vercel logs: Dashboard → Deployments → Click latest → Function Logs
3. Check browser console (F12)
4. Verify all environment variables are set correctly
5. Wait 2-3 minutes after making changes (deployment time)

---

## ✅ Success Criteria

Your deployment is successful when:
- ✅ https://billingwoodserver.onrender.com/api/v1/health returns `{"status":"ok"}`
- ✅ https://billingwoodpos.vercel.app/ loads login page
- ✅ No CORS errors in browser console
- ✅ Can login and access all features
- ✅ Can create bills, manage inventory, view reports

**Ready to test? Start with Step 1 above! 🚀**
