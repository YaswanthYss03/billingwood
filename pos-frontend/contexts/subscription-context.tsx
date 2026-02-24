'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { SubscriptionInfo, SubscriptionPlan } from '@/types/subscription';
import toast from 'react-hot-toast';

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  hasFeature: (feature: keyof SubscriptionInfo['features']) => boolean;
  checkLimit: (limit: keyof SubscriptionInfo['limits'], current: number) => {
    allowed: boolean;
    current: number;
    max: number | 'unlimited';
    percentage: number;
  };
  openUpgradeModal: (feature?: string) => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [lockedFeature, setLockedFeature] = useState<string | undefined>();

  const refreshSubscription = async () => {
    try {
      const response = await api.subscription.getInfo();
      const data = response.data;
      
      // Map backend response to frontend format
      const mappedData: SubscriptionInfo = {
        ...data,
        currentPlan: data.plan || data.currentPlan,
        daysUntilRenewal: data.daysRemaining || data.daysUntilRenewal,
      };
      
      setSubscription(mappedData);
    } catch (error: any) {
      // Silently handle 401 errors (user not authenticated or token expired)
      if (error?.response?.status === 401) {
        setSubscription(null);
      } else {
        console.error('Failed to fetch subscription info:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if user has a valid token before trying to fetch subscription
    const token = localStorage.getItem('accessToken');
    if (token) {
      refreshSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  const hasFeature = (feature: keyof SubscriptionInfo['features']): boolean => {
    if (!subscription) return false;
    return subscription.features[feature] as boolean;
  };

  const checkLimit = (
    limit: keyof SubscriptionInfo['limits'],
    current: number
  ): {
    allowed: boolean;
    current: number;
    max: number | 'unlimited';
    percentage: number;
  } => {
    if (!subscription) {
      return { allowed: false, current, max: 0, percentage: 100 };
    }

    const max = subscription.limits[limit];
    
    if (max === 'unlimited') {
      return { allowed: true, current, max, percentage: 0 };
    }

    const allowed = current < (max as number);
    const percentage = ((current / (max as number)) * 100);

    return { allowed, current, max, percentage };
  };

  const openUpgradeModal = (feature?: string) => {
    setLockedFeature(feature);
    setUpgradeModalOpen(true);
  };

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        loading,
        refreshSubscription,
        hasFeature,
        checkLimit,
        openUpgradeModal,
      }}
    >
      {children}
      {upgradeModalOpen && (
        <UpgradeModal
          isOpen={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          lockedFeature={lockedFeature}
        />
      )}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// Upgrade Modal Component (imported above)
function UpgradeModal({
  isOpen,
  onClose,
  lockedFeature,
}: {
  isOpen: boolean;
  onClose: () => void;
  lockedFeature?: string;
}) {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.subscription.getPlans();
        setPlans(response.data);
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    try {
      await api.subscription.upgrade({
        targetPlan: plan,
        billingCycle: 'MONTHLY',
      });
      toast.success(`Successfully upgraded to ${plan} plan!`);
      window.location.reload(); // Reload to reflect new subscription
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upgrade plan');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">
            {lockedFeature ? `Unlock ${lockedFeature}` : 'Upgrade Your Plan'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {lockedFeature && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800">
              <strong>{lockedFeature}</strong> is available on Professional and Enterprise plans.
              Upgrade now to unlock this feature!
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`border rounded-lg p-6 ${
                  plan.popular ? 'border-blue-500 shadow-lg' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-2">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">₹{plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                <ul className="space-y-2 mb-6">
                  {plan.highlights?.map((feature: string, idx: number) => (
                    <li key={idx} className="flex items-start text-sm">
                      <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleUpgrade(plan.plan)}
                  className={`w-full py-2 px-4 rounded font-semibold ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Upgrade to {plan.name}
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Need help choosing? <a href="/pricing" className="text-blue-600 hover:underline">Compare all plans</a></p>
        </div>
      </div>
    </div>
  );
}
