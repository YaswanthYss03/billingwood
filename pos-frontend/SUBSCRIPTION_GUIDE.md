# Frontend Subscription Integration Guide

This guide shows you how to use the subscription system in your frontend components.

## 📦 What's Included

### 1. **Types & API** (`types/subscription.ts`, `lib/api.ts`)
- Subscription plan enums and interfaces
- API endpoints for subscription management
- Professional feature endpoints (locations, customers, analytics)

### 2. **Subscription Context** (`contexts/subscription-context.tsx`)
- Global subscription state management
- Feature checking utilities
- Upgrade modal integration

### 3. **Components**
- `FeatureGuard` - Conditionally render based on subscription features
- `LimitGuard` - Enforce usage limits
- `SubscriptionWidget` - Display subscription info in dashboard
- `UpgradeModal` - Prompt users to upgrade
- Pricing page - Full plan comparison

---

## 🚀 Quick Start

### Step 1: Check if a Feature is Available

```tsx
import { useSubscription } from '@/contexts/subscription-context';

function MyComponent() {
  const { hasFeature, subscription } = useSubscription();

  if (hasFeature('multiLocationManagement')) {
    return <LocationManager />;
  }

  return <div>Multi-location is not available on your plan</div>;
}
```

### Step 2: Protect a Feature with FeatureGuard

```tsx
import { FeatureGuard } from '@/components/feature-guard';

function CustomersPage() {
  return (
    <FeatureGuard feature="customerDatabase">
      <CustomerList />
    </FeatureGuard>
  );
}
```

The `FeatureGuard` will automatically show an upgrade prompt if the feature is not available.

### Step 3: Enforce Usage Limits

```tsx
import { LimitGuard } from '@/components/feature-guard';

function CreateLocationButton() {
  const [currentLocations, setCurrentLocations] = useState(2);

  return (
    <LimitGuard 
      limit="maxLocations" 
      current={currentLocations}
      showWarning={true}
      warningThreshold={80}
    >
      <button onClick={createNewLocation}>
        Create New Location
      </button>
    </LimitGuard>
  );
}
```

### Step 4: Programmatic Feature Checks

```tsx
import { useFeature } from '@/components/feature-guard';

function AddCustomerButton() {
  const { requireFeature } = useFeature();

  const handleClick = () => {
    // This will show upgrade modal if feature not available
    if (!requireFeature('customerDatabase')) {
      return; // User doesn't have access
    }

    // Feature is available, proceed
    openCustomerForm();
  };

  return <button onClick={handleClick}>Add Customer</button>;
}
```

---

## 📋 Common Use Cases

### 1. **Add Subscription Widget to Dashboard**

```tsx
// app/dashboard/page.tsx
import { SubscriptionWidget } from '@/components/subscription-widget';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Other dashboard widgets */}
      
      {/* Add subscription widget */}
      <div className="col-span-1">
        <SubscriptionWidget />
      </div>
    </div>
  );
}
```

### 2. **Conditionally Show Menu Items**

```tsx
// components/navigation.tsx
import { useSubscription } from '@/contexts/subscription-context';

function Navigation() {
  const { hasFeature } = useSubscription();

  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/pos">POS</Link>
      <Link href="/inventory">Inventory</Link>
      
      {hasFeature('multiLocationManagement') && (
        <Link href="/locations">Locations</Link>
      )}
      
      {hasFeature('customerDatabase') && (
        <Link href="/customers">Customers</Link>
      )}
      
      {hasFeature('advancedAnalytics') && (
        <Link href="/analytics">Analytics</Link>
      )}
    </nav>
  );
}
```

### 3. **Create a Professional Feature Page**

```tsx
// app/customers/page.tsx
import { FeatureGuard } from '@/components/feature-guard';
import { ProtectedRoute } from '@/components/auth-provider';

export default function CustomersPage() {
  return (
    <ProtectedRoute>
      <FeatureGuard feature="customerDatabase">
        <div>
          <h1>Customer Management</h1>
          <CustomerList />
        </div>
      </FeatureGuard>
    </ProtectedRoute>
  );
}
```

### 4. **Show Different Content Based on Plan**

```tsx
import { useSubscription } from '@/contexts/subscription-context';

function ReportsPage() {
  const { subscription } = useSubscription();

  return (
    <div>
      <h1>Reports</h1>
      
      {/* Basic reports - Available to all */}
      <BasicSalesReport />
      <InventoryReport />

      {/* Advanced analytics - Professional+ only */}
      {subscription?.features.advancedAnalytics && (
        <>
          <ProfitMarginChart />
          <RevenueForecasting />
          <CustomerRetentionMetrics />
        </>
      )}

      {/* Enterprise features */}
      {subscription?.currentPlan === 'ENTERPRISE' && (
        <CustomReportBuilder />
      )}
    </div>
  );
}
```

### 5. **Handle API Errors for Locked Features**

```tsx
import { api } from '@/lib/api';
import { useSubscription } from '@/contexts/subscription-context';
import toast from 'react-hot-toast';

function useCustomers() {
  const { openUpgradeModal } = useSubscription();

  const fetchCustomers = async () => {
    try {
      const response = await api.customers.list();
      return response.data;
    } catch (error: any) {
      // Backend returns 403 for locked features
      if (error.response?.status === 403) {
        const upgradeInfo = error.response?.data?.upgrade;
        toast.error(error.response?.data?.message);
        openUpgradeModal('Customer Database');
        return null;
      }
      throw error;
    }
  };

  return { fetchCustomers };
}
```

---

## 🎨 Available Features

Use these feature keys with `hasFeature()` or `FeatureGuard`:

### Core Features
- `basicPOS` - Basic point of sale
- `inventory` - Inventory management
- `reporting` - Basic reporting

### User Management
- `roleBasedAccess` - Role-based permissions
- `staffPerformanceTracking` - Staff metrics

### Location Features (Professional+)
- `multiLocationManagement` - Multiple store locations
- `stockTransfers` - Transfer stock between locations
- `locationWiseReporting` - Location-specific reports

### Customer Features (Professional+)
- `customerDatabase` - CRM system
- `loyaltyProgram` - Points and rewards
- `birthdayRewards` - Birthday campaigns
- `customerInsights` - Customer analytics

### Analytics (Professional+)
- `advancedAnalytics` - Advanced dashboards
- `profitMarginAnalysis` - Profit tracking
- `forecastingAI` - AI-powered forecasting (Enterprise only)

### Integrations (Professional+)
- `apiAccess` - REST API access
- `webhooks` - Webhook events
- `whatsappIntegration` - WhatsApp Business API (Enterprise only)

---

## 📊 Usage Limits

Check these limits with `checkLimit()`:

- `maxUsers` - Maximum number of users
- `maxLocations` - Maximum number of locations
- `maxItems` - Maximum number of items
- `maxBillsPerMonth` - Monthly billing limit
- `maxApiCallsPerDay` - API rate limit

### Example:

```tsx
function CreateUserForm() {
  const { checkLimit } = useSubscription();
  const [userCount, setUserCount] = useState(5);

  const limitInfo = checkLimit('maxUsers', userCount);

  if (!limitInfo.allowed) {
    return (
      <div className="text-red-600">
        You've reached your limit of {limitInfo.max} users.
        <button onClick={() => openUpgradeModal()}>Upgrade Now</button>
      </div>
    );
  }

  return <UserForm />;
}
```

---

## 🎯 Best Practices

### 1. **Always Check Features Before API Calls**

```tsx
// ❌ Bad - API call might fail with 403
const createLocation = async () => {
  await api.locations.create(data);
};

// ✅ Good - Check feature first
const createLocation = async () => {
  if (!hasFeature('multiLocationManagement')) {
    openUpgradeModal('Multi-Location Management');
    return;
  }
  await api.locations.create(data);
};
```

### 2. **Show Upgrade Prompts Proactively**

```tsx
// Instead of hiding features completely, show them as locked
<div className="relative">
  {hasFeature('advancedAnalytics') ? (
    <AnalyticsDashboard />
  ) : (
    <div className="blur-sm pointer-events-none">
      <AnalyticsDashboard />
      <div className="absolute inset-0 flex items-center justify-center">
        <UpgradePrompt />
      </div>
    </div>
  )}
</div>
```

### 3. **Handle Loading States**

```tsx
function MyComponent() {
  const { subscription, loading } = useSubscription();

  if (loading) {
    return <LoadingSpinner />;
  }

  return <div>...</div>;
}
```

---

## 🔗 API Endpoints

All new endpoints are available in `lib/api.ts`:

### Subscription Management
- `api.subscription.getInfo()` - Get current subscription
- `api.subscription.getPlans()` - Get available plans
- `api.subscription.upgrade(data)` - Upgrade to new plan
- `api.subscription.cancel(data)` - Cancel subscription

### Locations (Professional+)
- `api.locations.list()`
- `api.locations.create(data)`
- `api.stockTransfers.create(data)`

### Customers (Professional+)
- `api.customers.list()`
- `api.customers.create(data)`
- `api.loyalty.earnPoints(data)`
- `api.customers.getInsights()`

### Analytics (Professional+)
- `api.analytics.revenueTrends(startDate, endDate)`
- `api.analytics.profitMargin(startDate, endDate)`
- `api.analytics.customerRetention()`

---

## 📱 Example: Complete Feature Implementation

Here's a complete example of adding a new Professional feature:

```tsx
// app/loyalty/page.tsx
'use client';

import { useState } from 'react';
import { FeatureGuard } from '@/components/feature-guard';
import { ProtectedRoute } from '@/components/auth-provider';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

export default function LoyaltyPage() {
  return (
    <ProtectedRoute>
      <FeatureGuard feature="loyaltyProgram">
        <LoyaltyContent />
      </FeatureGuard>
    </ProtectedRoute>
  );
}

function LoyaltyContent() {
  const [phone, setPhone] = useState('');
  const [points, setPoints] = useState(0);

  const handleEarnPoints = async () => {
    try {
      // Find customer by phone
      const customer = await api.customers.findByPhone(phone);
      
      // Award points
      await api.loyalty.earnPoints({
        customerId: customer.data.id,
        points,
        reason: 'Purchase reward',
      });

      toast.success(`Awarded ${points} points!`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to award points');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Loyalty Program</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <input
          type="tel"
          placeholder="Customer Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="border p-2 rounded mb-4 w-full"
        />
        
        <input
          type="number"
          placeholder="Points to Award"
          value={points}
          onChange={(e) => setPoints(Number(e.target.value))}
          className="border p-2 rounded mb-4 w-full"
        />

        <button
          onClick={handleEarnPoints}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Award Points
        </button>
      </div>
    </div>
  );
}
```

---

## 🎉 You're All Set!

Your frontend now has complete subscription integration with:
- ✅ Feature gating
- ✅ Usage limits
- ✅ Upgrade prompts
- ✅ Subscription info display
- ✅ Pricing page
- ✅ Professional plan API endpoints

Start building amazing subscription-based features! 🚀
