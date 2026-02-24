'use client';

import { useAuthStore } from '@/stores/auth';
import { useSubscription } from '@/contexts/subscription-context';

export type BusinessType = 'HOTEL' | 'RESTAURANT' | 'RETAIL';

interface BusinessFeatureCheck {
  hasFeature: boolean;
  hasBusinessType: boolean;
  canAccess: boolean;
  reason?: string;
}

/**
 * Hook to check both subscription features AND business type requirements
 * Some features like Recipe Management require both Professional plan AND RESTAURANT business type
 */
export function useBusinessFeatures() {
  const { tenant } = useAuthStore();
  const { hasFeature } = useSubscription();

  const businessType = tenant?.businessType as BusinessType;

  /**
   * Check if user has access to a feature based on subscription AND business type
   */
  const checkFeatureAccess = (
    featureName: string,
    requiredBusinessTypes?: BusinessType[]
  ): BusinessFeatureCheck => {
    const hasSubscriptionFeature = hasFeature(featureName as any);
    
    // If no business type requirement, only check subscription
    if (!requiredBusinessTypes || requiredBusinessTypes.length === 0) {
      return {
        hasFeature: hasSubscriptionFeature,
        hasBusinessType: true,
        canAccess: hasSubscriptionFeature,
        reason: hasSubscriptionFeature ? undefined : 'Subscription plan does not include this feature',
      };
    }

    const hasRequiredBusinessType = businessType && requiredBusinessTypes.includes(businessType);

    // Both conditions must be met
    if (!hasSubscriptionFeature && !hasRequiredBusinessType) {
      return {
        hasFeature: false,
        hasBusinessType: false,
        canAccess: false,
        reason: 'This feature requires a Professional plan and a different business type',
      };
    }

    if (!hasSubscriptionFeature) {
      return {
        hasFeature: false,
        hasBusinessType: !!hasRequiredBusinessType,
        canAccess: false,
        reason: 'Upgrade to Professional plan to access this feature',
      };
    }

    if (!hasRequiredBusinessType) {
      return {
        hasFeature: true,
        hasBusinessType: false,
        canAccess: false,
        reason: `This feature is only available for ${requiredBusinessTypes.join(', ')} business types`,
      };
    }

    return {
      hasFeature: true,
      hasBusinessType: true,
      canAccess: true,
    };
  };

  /**
   * Check if current business type matches any of the required types
   */
  const isBusinessType = (...types: BusinessType[]): boolean => {
    return businessType ? types.includes(businessType) : false;
  };

  /**
   * Feature-specific check functions
   */
  const canAccessVendors = () => checkFeatureAccess('vendorManagement');
  const canAccessSmartReordering = () => checkFeatureAccess('smartReordering');
  const canAccessPurchaseOrders = () => checkFeatureAccess('purchaseOrders');
  const canAccessWastageTracking = () => checkFeatureAccess('wastageTracking');
  
  // Recipe management requires both Professional plan AND RESTAURANT/HOTEL business type
  const canAccessRecipes = () => checkFeatureAccess('recipeManagement', ['RESTAURANT', 'HOTEL']);

  return {
    businessType,
    isBusinessType,
    checkFeatureAccess,
    canAccessVendors,
    canAccessSmartReordering,
    canAccessPurchaseOrders,
    canAccessWastageTracking,
    canAccessRecipes,
  };
}
