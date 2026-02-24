import { Injectable } from '@nestjs/common';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  SUBSCRIPTION_PLANS,
  PlanFeatures,
  PlanLimits,
  TRIAL_CONFIG,
} from '../constants/subscription-plans';

export interface SubscriptionInfo {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  isActive: boolean;
  isTrial: boolean;
  trialEndsAt?: Date;
  subscriptionEndsAt?: Date;
  daysRemaining?: number;
  features: PlanFeatures;
  limits: PlanLimits;
}

@Injectable()
export class SubscriptionService {
  /**
   * Check if a tenant has access to a specific feature
   */
  hasFeature(
    subscriptionPlan: SubscriptionPlan,
    subscriptionStatus: SubscriptionStatus,
    featureKey: keyof PlanFeatures,
  ): boolean {
    // If subscription is not active, no features available
    if (!this.isSubscriptionActive(subscriptionStatus)) {
      return false;
    }

    const planConfig = SUBSCRIPTION_PLANS[subscriptionPlan];
    return planConfig?.features[featureKey] === true;
  }

  /**
   * Get complete subscription information for a tenant
   */
  getSubscriptionInfo(tenant: {
    subscriptionPlan: SubscriptionPlan;
    subscriptionStatus: SubscriptionStatus;
    trialStartDate?: Date;
    trialEndDate?: Date;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
  }): SubscriptionInfo {
    const planConfig = SUBSCRIPTION_PLANS[tenant.subscriptionPlan];
    const isActive = this.isSubscriptionActive(tenant.subscriptionStatus);
    const isTrial = tenant.subscriptionStatus === SubscriptionStatus.TRIAL;

    let daysRemaining: number | undefined;
    if (isTrial && tenant.trialEndDate) {
      const now = new Date();
      const endDate = new Date(tenant.trialEndDate);
      daysRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );
    } else if (tenant.subscriptionEndDate) {
      const now = new Date();
      const endDate = new Date(tenant.subscriptionEndDate);
      daysRemaining = Math.max(
        0,
        Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );
    }

    return {
      plan: tenant.subscriptionPlan,
      status: tenant.subscriptionStatus,
      isActive,
      isTrial,
      trialEndsAt: tenant.trialEndDate,
      subscriptionEndsAt: tenant.subscriptionEndDate,
      daysRemaining,
      features: planConfig.features,
      limits: planConfig.limits,
    };
  }

  /**
   * Check if subscription is currently active
   */
  isSubscriptionActive(status: SubscriptionStatus): boolean {
    return status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIAL;
  }

  /**
   * Check if trial has expired
   */
  isTrialExpired(trialEndDate: Date): boolean {
    return new Date() > new Date(trialEndDate);
  }

  /**
   * Check if subscription has expired
   */
  isSubscriptionExpired(subscriptionEndDate: Date): boolean {
    return new Date() > new Date(subscriptionEndDate);
  }

  /**
   * Check if tenant is within usage limits
   */
  checkUsageLimit(
    currentUsage: number,
    limit: number | 'unlimited',
  ): { allowed: boolean; remaining?: number } {
    if (limit === 'unlimited') {
      return { allowed: true };
    }

    if (currentUsage >= limit) {
      return { allowed: false, remaining: 0 };
    }

    return { allowed: true, remaining: limit - currentUsage };
  }

  /**
   * Get limit for a specific resource
   */
  getLimit(
    plan: SubscriptionPlan,
    limitKey: keyof PlanLimits,
  ): number | 'unlimited' {
    const planConfig = SUBSCRIPTION_PLANS[plan];
    return planConfig.limits[limitKey];
  }

  /**
   * Initialize trial subscription
   */
  initializeTrial(): {
    subscriptionPlan: SubscriptionPlan;
    subscriptionStatus: SubscriptionStatus;
    trialStartDate: Date;
    trialEndDate: Date;
  } {
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + TRIAL_CONFIG.durationDays);

    return {
      subscriptionPlan: SubscriptionPlan.FREE_TRIAL,
      subscriptionStatus: SubscriptionStatus.TRIAL,
      trialStartDate: now,
      trialEndDate: trialEnd,
    };
  }

  /**
   * Upgrade from trial to paid plan
   */
  upgradeToPaidPlan(
    targetPlan: SubscriptionPlan,
    billingCycle: 'MONTHLY' | 'YEARLY',
  ): {
    subscriptionPlan: SubscriptionPlan;
    subscriptionStatus: SubscriptionStatus;
    subscriptionStartDate: Date;
    subscriptionEndDate: Date;
    billingCycle: string;
  } {
    const now = new Date();
    const endDate = new Date(now);

    if (billingCycle === 'YEARLY') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    return {
      subscriptionPlan: targetPlan,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      subscriptionStartDate: now,
      subscriptionEndDate: endDate,
      billingCycle,
    };
  }

  /**
   * Get plan comparison data for frontend
   */
  getAllPlans() {
    return Object.entries(SUBSCRIPTION_PLANS)
      .filter(([key]) => key !== SubscriptionPlan.FREE_TRIAL)
      .map(([key, config]) => ({
        id: key,
        name: config.name,
        description: config.description,
        priceMonthly: config.priceMonthly,
        priceYearly: config.priceYearly,
        features: config.features,
        limits: config.limits,
      }));
  }

  /**
   * Get upgrade suggestions based on current usage
   */
  getSuggestedUpgrade(
    currentPlan: SubscriptionPlan,
    usageStats: {
      users?: number;
      locations?: number;
      items?: number;
      billsThisMonth?: number;
    },
  ): {
    shouldUpgrade: boolean;
    reason?: string;
    suggestedPlan?: SubscriptionPlan;
  } {
    const currentConfig = SUBSCRIPTION_PLANS[currentPlan];
    const currentLimits = currentConfig.limits;

    // Check if hitting limits
    const checks = [
      {
        usage: usageStats.users,
        limit: currentLimits.maxUsers,
        reason: 'You need more users',
        field: 'users',
      },
      {
        usage: usageStats.locations,
        limit: currentLimits.maxLocations,
        reason: 'You need more locations',
        field: 'locations',
      },
      {
        usage: usageStats.items,
        limit: currentLimits.maxItems,
        reason: 'You need more items',
        field: 'items',
      },
      {
        usage: usageStats.billsThisMonth,
        limit: currentLimits.maxBillsPerMonth,
        reason: 'You need higher billing capacity',
        field: 'bills',
      },
    ];

    for (const check of checks) {
      if (check.usage && check.limit !== 'unlimited') {
        const usagePercentage = (check.usage / check.limit) * 100;
        if (usagePercentage >= 80) {
          // Suggest next tier
          const suggestedPlan =
            currentPlan === SubscriptionPlan.STARTER
              ? SubscriptionPlan.PROFESSIONAL
              : SubscriptionPlan.ENTERPRISE;

          return {
            shouldUpgrade: true,
            reason: check.reason,
            suggestedPlan,
          };
        }
      }
    }

    return { shouldUpgrade: false };
  }
}
