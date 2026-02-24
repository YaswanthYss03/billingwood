'use client';

import { useSubscription } from '@/contexts/subscription-context';
import { Crown, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export function SubscriptionWidget() {
  const { subscription, loading, openUpgradeModal } = useSubscription();

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
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
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'STARTER':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PROFESSIONAL':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'ENTERPRISE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className={`p-4 ${getPlanColor(currentPlan)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5" />
            <span className="font-bold text-lg">
              {currentPlan.replace(/_/g, ' ')} Plan
            </span>
          </div>
          {planStatus === 'ACTIVE' && (
            <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
              Active
            </span>
          )}
          {planStatus === 'TRIAL' && (
            <span className="px-2 py-1 bg-purple-500 text-white text-xs rounded-full">
              Trial
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Trial/Expiry Warning */}
        {isTrialOrExpiring && (
          <div className="flex items-start space-x-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              {planStatus === 'TRIAL' && subscription.trialEndsAt && (
                <>
                  <p className="text-sm font-semibold text-orange-800">Trial Period</p>
                  <p className="text-sm text-orange-700">
                    Expires {new Date(subscription.trialEndsAt).toLocaleDateString()}
                  </p>
                </>
              )}
              {subscription.daysUntilRenewal && subscription.daysUntilRenewal <= 7 && (
                <>
                  <p className="text-sm font-semibold text-orange-800">Renewal Soon</p>
                  <p className="text-sm text-orange-700">
                    {subscription.daysUntilRenewal} days remaining
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Usage Limits */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-700">Plan Usage</h4>
          
          {/* Max Users */}
          <UsageMeter
            label="Users"
            current={0} // You'll need to fetch actual usage
            max={subscription.limits.maxUsers}
          />

          {/* Max Locations */}
          {subscription.features.multiLocationManagement && (
            <UsageMeter
              label="Locations"
              current={0} // You'll need to fetch actual usage
              max={subscription.limits.maxLocations}
            />
          )}

          {/* Max Items */}
          <UsageMeter
            label="Items"
            current={0} // You'll need to fetch actual usage
            max={subscription.limits.maxItems}
          />
        </div>

        {/* Quick Feature Highlights */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Features Enabled</h4>
          <div className="flex flex-wrap gap-2">
            {subscription.features.multiLocationManagement && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                Multi-Location
              </span>
            )}
            {subscription.features.customerDatabase && (
              <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded">
                CRM
              </span>
            )}
            {subscription.features.loyaltyProgram && (
              <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                Loyalty
              </span>
            )}
            {subscription.features.advancedAnalytics && (
              <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs rounded">
                Analytics
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t">
          {currentPlan !== 'ENTERPRISE' && (
            <button
              onClick={() => openUpgradeModal()}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              Upgrade Plan
            </button>
          )}
          <Link
            href="/pricing"
            className="flex-1 text-center border border-gray-300 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
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
}: {
  label: string;
  current: number;
  max: number | 'unlimited';
}) {
  if (max === 'unlimited') {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold text-green-600">Unlimited</span>
      </div>
    );
  }

  const percentage = (current / max) * 100;
  const color = percentage >= 90 ? 'bg-red-500' : percentage >= 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-semibold">
          {current} / {max}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    </div>
  );
}
