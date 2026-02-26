'use client';

import { useEffect, useState } from 'react';
import { useSubscription } from '@/contexts/subscription-context';
import { api } from '@/lib/api';
import { Crown, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface UsageStats {
  users: number;
  locations: number;
  items: number;
}

export function SubscriptionWidget() {
  const { subscription, loading, openUpgradeModal } = useSubscription();
  const [usageStats, setUsageStats] = useState<UsageStats>({
    users: 0,
    locations: 0,
    items: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (subscription) {
      loadUsageStats();
    }
  }, [subscription]);

  const loadUsageStats = async () => {
    try {
      setLoadingStats(true);
      
      // Fetch actual usage counts in parallel
      const [usersRes, locationsRes, itemsRes] = await Promise.all([
        api.users.list().catch(() => ({ data: [] })),
        subscription?.features.multiLocationManagement 
          ? api.locations.list().catch(() => ({ data: [] }))
          : Promise.resolve({ data: [] }),
        api.items.list().catch(() => ({ data: [] })),
      ]);

      setUsageStats({
        users: usersRes.data?.length || 0,
        locations: locationsRes.data?.length || 0,
        items: itemsRes.data?.length || 0,
      });
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      </div>
    );
  }

  if (!subscription) return null;

  const currentPlan = subscription.currentPlan || subscription.plan || 'STARTER';
  const planStatus = subscription.status || 'ACTIVE';

  const isTrialOrExpiring = 
    planStatus === 'TRIAL' || 
    (subscription.daysUntilRenewal && subscription.daysUntilRenewal <= 7);

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'FREE_TRIAL':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700';
      case 'STARTER':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'PROFESSIONAL':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700';
      case 'ENTERPRISE':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className={`p-4 ${getPlanColor(currentPlan)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5" />
            <span className="font-bold text-lg">
              {currentPlan.replace(/_/g, ' ')} Plan
            </span>
          </div>
          {planStatus === 'ACTIVE' && (
            <span className="px-2 py-1 bg-green-500 dark:bg-green-600 text-white text-xs rounded-full">
              Active
            </span>
          )}
          {planStatus === 'TRIAL' && (
            <span className="px-2 py-1 bg-purple-500 dark:bg-purple-600 text-white text-xs rounded-full">
              Trial
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Trial/Expiry Warning */}
        {isTrialOrExpiring && (
          <div className="flex items-start space-x-2 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-700 rounded-lg">
            <AlertCircle className="w-5 h-5 text-orange-500 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {planStatus === 'TRIAL' && subscription.trialEndsAt && (
                <>
                  <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Trial Period</p>
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    Expires {new Date(subscription.trialEndsAt).toLocaleDateString()}
                  </p>
                </>
              )}
              {subscription.daysUntilRenewal && subscription.daysUntilRenewal <= 7 && (
                <>
                  <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">Renewal Soon</p>
                  <p className="text-sm text-orange-700 dark:text-orange-400">
                    {subscription.daysUntilRenewal} days remaining
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Usage Limits */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Plan Usage</h4>
          
          {/* Max Users */}
          <UsageMeter
            label="Users"
            current={loadingStats ? 0 : usageStats.users}
            max={subscription.limits.maxUsers}
            loading={loadingStats}
          />

          {/* Max Locations */}
          {subscription.features.multiLocationManagement && (
            <UsageMeter
              label="Locations"
              current={loadingStats ? 0 : usageStats.locations}
              max={subscription.limits.maxLocations}
              loading={loadingStats}
            />
          )}

          {/* Max Items */}
          <UsageMeter
            label="Items"
            current={loadingStats ? 0 : usageStats.items}
            max={subscription.limits.maxItems}
            loading={loadingStats}
          />
        </div>

        {/* Quick Feature Highlights */}
        <div className="border-t dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Features Enabled</h4>
          <div className="flex flex-wrap gap-2">
            {subscription.features.multiLocationManagement && (
              <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                Multi-Location
              </span>
            )}
            {subscription.features.customerDatabase && (
              <span className="px-2 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded">
                CRM
              </span>
            )}
            {subscription.features.loyaltyProgram && (
              <span className="px-2 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                Loyalty
              </span>
            )}
            {subscription.features.advancedAnalytics && (
              <span className="px-2 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded">
                Analytics
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t dark:border-gray-700">
          {currentPlan !== 'ENTERPRISE' && (
            <button
              onClick={() => openUpgradeModal()}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 dark:bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Upgrade Plan
            </button>
          )}
          <Link
            href="/pricing"
            className="flex-1 text-center border border-gray-300 dark:border-gray-600 py-2 px-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-900 dark:text-gray-100"
          >
            View Plans
          </Link>
        </div>
      </div>
    </div>
  );
}

function UsageMeter({
  label,
  current,
  max,
  loading,
}: {
  label: string;
  current: number;
  max: number | 'unlimited';
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    );
  }

  if (max === 'unlimited') {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-green-600 dark:text-green-400">Unlimited</span>
      </div>
    );
  }

  const percentage = (current / max) * 100;
  const color = percentage >= 90 ? 'bg-red-500 dark:bg-red-400' : percentage >= 70 ? 'bg-yellow-500 dark:bg-yellow-400' : 'bg-green-500 dark:bg-green-400';

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {current} / {max}
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}
