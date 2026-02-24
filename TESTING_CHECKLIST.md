# ✅ Professional Plan Testing Checklist

## Pre-Testing Setup
- [ ] Backend running: https://billingwoodserver.onrender.com
- [ ] Frontend running: https://billingwoodpos.vercel.app (or local)
- [ ] Logged in with valid account
- [ ] Know your current subscription plan

---

## 🎯 Quick Tests (5 minutes)

### Test 1: Dashboard Widget
- [ ] Visit `/dashboard`
- [ ] See **Subscription Widget** in right sidebar
- [ ] Widget shows:
  - [ ] Current plan name
  - [ ] Days remaining (if trial)
  - [ ] Feature list with checkmarks
  - [ ] Usage statistics

### Test 2: Navigation Lock Icons
- [ ] Open sidebar navigation
- [ ] If on STARTER plan, see lock icons on:
  - [ ] Customers
  - [ ] Locations
  - [ ] Analytics

### Test 3: Pricing Page
- [ ] Visit `/pricing`
- [ ] See 4 pricing tiers
- [ ] Current plan highlighted with "Current Plan" badge
- [ ] All features listed per plan

---

## 🔓 Professional Features Tests (If on Professional/Trial/Enterprise)

### Test 4: Customer Management
- [ ] Visit `/customers`
- [ ] Page loads (not blocked)
- [ ] See customer stats cards
- [ ] Click "Add Customer" button
- [ ] Modal opens with form
- [ ] Fill customer details:
  - [ ] Name: "Test Customer"
  - [ ] Phone: "9876543210"
  - [ ] Tier: "GOLD"
- [ ] Submit form
- [ ] Customer appears in list
- [ ] Click "View Details" on customer
- [ ] Edit modal opens with pre-filled data

### Test 5: Location Management
- [ ] Visit `/locations`
- [ ] Page loads (not blocked)
- [ ] See location stats cards
- [ ] Click "Add Location" button
- [ ] Modal opens with form
- [ ] Fill location details:
  - [ ] Name: "Main Store"
  - [ ] Code: "MAIN001"
  - [ ] Address: "123 Test Street"
  - [ ] City: "Bangalore"
  - [ ] State: "Karnataka"
- [ ] Submit form
- [ ] Location appears in grid
- [ ] Click "View Details" on location
- [ ] Edit modal opens with pre-filled data

### Test 6: Advanced Analytics
- [ ] Visit `/analytics`
- [ ] Page loads (not blocked)
- [ ] See 4 key metric cards:
  - [ ] Revenue Trend
  - [ ] Profit Margin
  - [ ] Customer Retention
  - [ ] Inventory Turnover
- [ ] See charts placeholders
- [ ] See top performing items
- [ ] See peak hours analysis
- [ ] Professional feature badge visible at bottom

---

## 🔒 Locked Feature Tests (If on STARTER plan)

### Test 7: Customer Page Lock
- [ ] Click "Customers" in sidebar
- [ ] See lock icon next to menu item
- [ ] Upgrade modal appears with:
  - [ ] Feature name: "Customer Database & Loyalty"
  - [ ] Description of feature
  - [ ] "Available on PROFESSIONAL" text
  - [ ] Price: ₹1,499/month
  - [ ] "Upgrade Now" button
- [ ] Click "Upgrade Now"
- [ ] Redirects to `/pricing`

### Test 8: Location Page Lock
- [ ] Click "Locations" in sidebar
- [ ] Upgrade modal appears
- [ ] Feature name: "Multi-Location Management"
- [ ] Shows correct pricing

### Test 9: Analytics Page Lock
- [ ] Click "Analytics" in sidebar
- [ ] Upgrade modal appears
- [ ] Feature name: "Advanced Analytics"
- [ ] Shows correct pricing

---

## 🚀 API Integration Tests

### Test 10: Customer API
Open browser console and run:
```javascript
// Test customer creation
fetch('/api/customers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    name: 'API Test Customer',
    phone: '9999999999',
    tier: 'SILVER'
  })
})
.then(r => r.json())
.then(console.log);
```

**Expected**: Customer created successfully OR 403 if locked

### Test 11: Location API
```javascript
// Test location creation
fetch('/api/locations', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify({
    name: 'API Test Location',
    code: 'TEST001',
    address: '456 Test Road',
    city: 'Mumbai',
    state: 'Maharashtra'
  })
})
.then(r => r.json())
.then(console.log);
```

**Expected**: Location created successfully OR 403 if locked

### Test 12: Analytics API
```javascript
// Test analytics overview
fetch('/api/analytics/overview', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
})
.then(r => r.json())
.then(console.log);
```

**Expected**: Analytics data OR 403 if locked

---

## 📱 Mobile Responsiveness Tests

### Test 13: Mobile View
- [ ] Open browser dev tools
- [ ] Switch to mobile view (375px width)
- [ ] Visit `/dashboard`
  - [ ] Widget stacks below content
  - [ ] Stats cards stack vertically
- [ ] Visit `/customers`
  - [ ] Table scrolls horizontally
  - [ ] Modal fits screen
- [ ] Visit `/pricing`
  - [ ] Plan cards stack vertically
  - [ ] All text readable

---

## 🎨 UI/UX Tests

### Test 14: Loading States
- [ ] Customer page shows loading spinner while fetching
- [ ] Location page shows loading spinner while fetching
- [ ] Modal shows "Saving..." when submitting

### Test 15: Error Handling
- [ ] Try creating customer with duplicate phone
- [ ] Error toast appears
- [ ] Try creating location with existing code
- [ ] Error toast appears

### Test 16: Empty States
- [ ] If no customers, see "No customers found" message
- [ ] If no locations, see "Create First Location" card
- [ ] Professional feature badges visible on all pages

---

## 🔄 Full User Flow Test

### Test 17: Complete Professional Workflow
1. [ ] Start on `/dashboard`
2. [ ] Check subscription widget shows Professional
3. [ ] Click "Customers" in sidebar
4. [ ] Add 3 customers with different tiers
5. [ ] Click "Locations" in sidebar
6. [ ] Add 2 locations
7. [ ] Click "Analytics" in sidebar
8. [ ] View revenue trends
9. [ ] Return to dashboard
10. [ ] See updated metrics
11. [ ] Visit `/pricing`
12. [ ] Verify current plan highlighted

---

## 🐛 Known Issues to Check
- [ ] No console errors in browser
- [ ] No TypeScript compilation errors
- [ ] All icons render correctly (Lucide icons)
- [ ] All modals close properly
- [ ] Navigation sidebar works on mobile
- [ ] Toasts appear and dismiss correctly

---

## ✅ Success Criteria

**All tests passing means:**
- ✅ Professional plan fully functional
- ✅ Feature guards working correctly
- ✅ Subscription system integrated
- ✅ CRUD operations working
- ✅ UI/UX polished
- ✅ Ready for production

---

## 📊 Test Results

| Test | Status | Notes |
|------|--------|-------|
| Dashboard Widget | ⏳ | |
| Navigation Locks | ⏳ | |
| Pricing Page | ⏳ | |
| Customers CRUD | ⏳ | |
| Locations CRUD | ⏳ | |
| Analytics View | ⏳ | |
| API Integration | ⏳ | |
| Mobile View | ⏳ | |
| Error Handling | ⏳ | |

**Legend**: ⏳ Not tested | ✅ Passed | ❌ Failed

---

## 🚨 If Tests Fail

### Backend Issues
```bash
# Check backend logs
curl https://billingwoodserver.onrender.com/health

# Restart backend (Render dashboard)
```

### Frontend Issues
```bash
# Clear build cache
cd pos-frontend
rm -rf .next
npm run build
npm run dev
```

### Database Issues
```bash
# Check Prisma connection
cd SaaS_Platform_POS
npx prisma studio
```

---

**🎯 Goal**: Get all tests passing to confirm Professional Plan is production-ready!
