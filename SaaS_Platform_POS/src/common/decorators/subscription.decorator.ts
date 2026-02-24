import { SetMetadata } from '@nestjs/common';
import { PlanFeatures } from '../constants/subscription-plans';

export const REQUIRED_FEATURE_KEY = 'required_feature';

/**
 * Decorator to protect routes with subscription feature requirements
 * 
 * @example
 * @RequireFeature('customerDatabase')
 * @Get('customers')
 * async getCustomers() { ... }
 */
export const RequireFeature = (feature: keyof PlanFeatures) =>
  SetMetadata(REQUIRED_FEATURE_KEY, feature);

/**
 * Decorator for multiple feature requirements (AND logic)
 * 
 * @example
 * @RequireFeatures(['customerDatabase', 'loyaltyProgram'])
 * @Post('loyalty/redeem')
 * async redeemPoints() { ... }
 */
export const RequireFeatures = (features: (keyof PlanFeatures)[]) =>
  SetMetadata(REQUIRED_FEATURE_KEY, features);

export const REQUIRED_PLAN_KEY = 'required_plan';

/**
 * Decorator to require minimum subscription plan
 * 
 * @example
 * @RequirePlan(SubscriptionPlan.PROFESSIONAL)
 * @Get('analytics')
 * async getAnalytics() { ... }
 */
export const RequirePlan = (plan: string) =>
  SetMetadata(REQUIRED_PLAN_KEY, plan);
