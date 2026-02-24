'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useSubscription } from '@/contexts/subscription-context';
import { Check, X, Crown, Zap, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProtectedRoute } from '@/components/auth-provider';

export default function PricingPage() {
  return (
    <ProtectedRoute>
      <PricingContent />
    </ProtectedRoute>
  );
}

function PricingContent() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { subscription, refreshSubscription } = useSubscription();

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.subscription.getPlans();
        setPlans(response.data);
      } catch (error) {
        console.error('Failed to fetch plans:', error);
        toast.error('Failed to load pricing plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleUpgrade = async (targetPlan: string) => {
    try {
      await api.subscription.upgrade({
        targetPlan,
        billingCycle: billingCycle.toUpperCase(),
      });
      toast.success('Successfully upgraded! Refreshing...');
      await refreshSubscription();
      window.location.href = '/dashboard';
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upgrade plan');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Perfect Plan
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Scale your business with the right features at the right price
          </p>

          {/* Current Plan Badge */}
          {subscription && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full">
              <Crown className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Current: {(subscription.currentPlan || subscription.plan || 'STARTER').replace(/_/g, ' ')} Plan
              </span>
            </div>
          )}

          {/* Billing Toggle */}
          <div className="mt-8 inline-flex items-center gap-4 p-1 bg-white border border-gray-200 rounded-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-6 py-2 rounded-md transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => {
            const currentPlan = subscription?.currentPlan || subscription?.plan;
            const isCurrent = currentPlan === plan.plan;
            const price = billingCycle === 'yearly' ? plan.price * 12 * 0.8 : plan.price;
            const Icon = getPlanIcon(plan.plan);

            return (
              <div
                key={plan.name}
                className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:scale-105 ${
                  plan.popular ? 'ring-2 ring-blue-500 shadow-2xl' : ''
                } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
              >
                {/* Popular Badge */}
                {plan.popular && !isCurrent && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    MOST POPULAR
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrent && (
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-xs font-bold px-4 py-1 rounded-bl-lg">
                    CURRENT PLAN
                  </div>
                )}

                <div className="p-8">
                  {/* Icon & Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <Icon className="w-8 h-8 text-blue-600" />
                    <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        ₹{Math.round(price).toLocaleString()}
                      </span>
                      <span className="text-gray-600">
                        /{billingCycle === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <p className="text-sm text-green-600 mt-1">
                        Save ₹{Math.round(plan.price * 12 * 0.2).toLocaleString()}/year
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 mb-6">{plan.description}</p>

                  {/* CTA Button */}
                  <button
                    onClick={() => !isCurrent && handleUpgrade(plan.plan)}
                    disabled={isCurrent}
                    className={`w-full py-3 rounded-lg font-semibold transition-all ${
                      isCurrent
                        ? 'bg-green-100 text-green-800 cursor-not-allowed'
                        : plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
                  </button>

                  {/* Feature List */}
                  <div className="mt-8 space-y-4">
                    <h4 className="font-semibold text-gray-900">What's included:</h4>
                    <ul className="space-y-3">
                      {plan.highlights?.map((feature: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Detailed Feature Comparison
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-4 px-6 text-gray-900 font-semibold">
                      Feature
                    </th>
                    <th className="text-center py-4 px-6 text-gray-900 font-semibold">
                      Starter
                    </th>
                    <th className="text-center py-4 px-6 text-gray-900 font-semibold bg-blue-50">
                      Professional
                    </th>
                    <th className="text-center py-4 px-6 text-gray-900 font-semibold">
                      Enterprise
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <FeatureRow feature="Users" starter="3" professional="Unlimited" enterprise="Unlimited" />
                  <FeatureRow feature="Locations" starter="1" professional="5" enterprise="Unlimited" />
                  <FeatureRow feature="Items" starter="100" professional="Unlimited" enterprise="Unlimited" />
                  <FeatureRow feature="Basic POS" starter={true} professional={true} enterprise={true} />
                  <FeatureRow feature="Inventory Management" starter={true} professional={true} enterprise={true} />
                  <FeatureRow feature="Reports" starter={true} professional={true} enterprise={true} />
                  <FeatureRow feature="Multi-Location Management" starter={false} professional={true} enterprise={true} />
                  <FeatureRow feature="Stock Transfers" starter={false} professional={true} enterprise={true} />
                  <FeatureRow feature="Customer Database (CRM)" starter={false} professional={true} enterprise={true} />
                  <FeatureRow feature="Loyalty Program" starter={false} professional={true} enterprise={true} />
                  <FeatureRow feature="Advanced Analytics" starter={false} professional={true} enterprise={true} />
                  <FeatureRow feature="Profit Margin Analysis" starter={false} professional={true} enterprise={true} />
                  <FeatureRow feature="AI Forecasting" starter={false} professional={false} enterprise={true} />
                  <FeatureRow feature="WhatsApp Integration" starter={false} professional={false} enterprise={true} />
                  <FeatureRow feature="White Label" starter={false} professional={false} enterprise={true} />
                  <FeatureRow feature="API Access" starter={false} professional={true} enterprise={true} />
                  <FeatureRow feature="Support" starter="Email" professional="Priority" enterprise="Dedicated" />
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            Have questions? Contact us at{' '}
            <a href="mailto:support@yourpos.com" className="text-blue-600 hover:underline">
              support@yourpos.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  feature,
  starter,
  professional,
  enterprise,
}: {
  feature: string;
  starter: boolean | string;
  professional: boolean | string;
  enterprise: boolean | string;
}) {
  const renderCell = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="w-5 h-5 text-green-500 mx-auto" />
      ) : (
        <X className="w-5 h-5 text-gray-300 mx-auto" />
      );
    }
    return <span className="text-gray-700">{value}</span>;
  };

  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-4 px-6 text-gray-900">{feature}</td>
      <td className="py-4 px-6 text-center">{renderCell(starter)}</td>
      <td className="py-4 px-6 text-center bg-blue-50">{renderCell(professional)}</td>
      <td className="py-4 px-6 text-center">{renderCell(enterprise)}</td>
    </tr>
  );
}

function getPlanIcon(plan: string) {
  switch (plan) {
    case 'STARTER':
      return Zap;
    case 'PROFESSIONAL':
      return Crown;
    case 'ENTERPRISE':
      return Building2;
    default:
      return Crown;
  }
}
