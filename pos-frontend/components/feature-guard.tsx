'use client';

import { useSubscription } from '@/contexts/subscription-context';
import { SubscriptionInfo } from '@/types/subscription';
import { Lock } from 'lucide-react';

interface FeatureGuardProps {
  feature: keyof SubscriptionInfo['features'];
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgradePrompt?: boolean;
}

export function FeatureGuard({
  feature,
  children,
  fallback,
  showUpgradePrompt = true,
}: FeatureGuardProps) {
  const { hasFeature, openUpgradeModal, loading } = useSubscription();

  if (loading) {
    return <div className="animate-pulse bg-gray-200 rounded h-20"></div>;
  }

  const hasAccess = hasFeature(feature);

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgradePrompt) {
      return (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50">
          <Lock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold mb-2">Feature Locked</h3>
          <p className="text-gray-600 mb-4">
            This feature is not available in your current plan
          </p>
          <button
            onClick={() => openUpgradeModal(feature)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Upgrade Now
          </button>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

interface LimitGuardProps {
  limit: keyof SubscriptionInfo['limits'];
  current: number;
  children: React.ReactNode;
  showWarning?: boolean;
  warningThreshold?: number; // Percentage at which to show warning (e.g., 80)
}

export function LimitGuard({
  limit,
  current,
  children,
  showWarning = true,
  warningThreshold = 80,
}: LimitGuardProps) {
  const { checkLimit, openUpgradeModal } = useSubscription();

  const limitInfo = checkLimit(limit, current);

  if (!limitInfo.allowed) {
    return (
      <div className="border-2 border-red-300 rounded-lg p-6 text-center bg-red-50">
        <Lock className="w-10 h-10 mx-auto mb-3 text-red-500" />
        <h3 className="text-lg font-semibold mb-2">Limit Reached</h3>
        <p className="text-gray-700 mb-4">
          You've reached your plan limit of {limitInfo.max} {limit}.
        </p>
        <button
          onClick={() => openUpgradeModal()}
          className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700"
        >
          Upgrade to Add More
        </button>
      </div>
    );
  }

  return (
    <>
      {showWarning && limitInfo.percentage >= warningThreshold && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <p className="text-sm text-yellow-800">
                You're using {limitInfo.current} of {limitInfo.max} {limit} ({Math.round(limitInfo.percentage)}%)
              </p>
              <button
                onClick={() => openUpgradeModal()}
                className="text-sm text-yellow-900 underline hover:no-underline"
              >
                Upgrade for more capacity
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

// Hook for programmatic feature checking
export function useFeature() {
  const { hasFeature, checkLimit, openUpgradeModal } = useSubscription();

  const requireFeature = (feature: keyof SubscriptionInfo['features']): boolean => {
    const has = hasFeature(feature);
    if (!has) {
      openUpgradeModal(feature);
    }
    return has;
  };

  const requireLimit = (
    limit: keyof SubscriptionInfo['limits'],
    current: number
  ): boolean => {
    const limitInfo = checkLimit(limit, current);
    if (!limitInfo.allowed) {
      openUpgradeModal();
    }
    return limitInfo.allowed;
  };

  return {
    hasFeature,
    checkLimit,
    requireFeature,
    requireLimit,
    openUpgradeModal,
  };
}
