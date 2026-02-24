import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../services/prisma.service';
import { SubscriptionService } from '../services/subscription.service';
import { REQUIRED_FEATURE_KEY, REQUIRED_PLAN_KEY } from '../decorators/subscription.decorator';
import { PlanFeatures, SubscriptionPlan } from '../constants/subscription-plans';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check for required feature
    const requiredFeature = this.reflector.get<keyof PlanFeatures | (keyof PlanFeatures)[]>(
      REQUIRED_FEATURE_KEY,
      context.getHandler(),
    );

    // Check for required plan
    const requiredPlan = this.reflector.get<SubscriptionPlan>(
      REQUIRED_PLAN_KEY,
      context.getHandler(),
    );

    // If no subscription requirements, allow access
    if (!requiredFeature && !requiredPlan) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('Tenant not found');
    }

    // Fetch tenant subscription info
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        trialStartDate: true,
        trialEndDate: true,
        subscriptionStartDate: true,
        subscriptionEndDate: true,
      },
    });

    if (!tenant) {
      throw new ForbiddenException('Tenant not found');
    }

    // Convert null to undefined for optional fields
    const subscriptionInfo = this.subscriptionService.getSubscriptionInfo({
      subscriptionPlan: tenant.subscriptionPlan,
      subscriptionStatus: tenant.subscriptionStatus,
      trialStartDate: tenant.trialStartDate ?? undefined,
      trialEndDate: tenant.trialEndDate ?? undefined,
      subscriptionStartDate: tenant.subscriptionStartDate ?? undefined,
      subscriptionEndDate: tenant.subscriptionEndDate ?? undefined,
    });

    // Check if subscription is active
    if (!subscriptionInfo.isActive) {
      throw new ForbiddenException({
        message: 'Your subscription has expired',
        code: 'SUBSCRIPTION_EXPIRED',
        subscriptionInfo,
      });
    }

    // Check required plan
    if (requiredPlan) {
      const planHierarchy = [
        SubscriptionPlan.FREE_TRIAL,
        SubscriptionPlan.STARTER,
        SubscriptionPlan.PROFESSIONAL,
        SubscriptionPlan.ENTERPRISE,
      ];

      const currentPlanIndex = planHierarchy.indexOf(tenant.subscriptionPlan);
      const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);

      if (currentPlanIndex < requiredPlanIndex) {
        throw new ForbiddenException({
          message: `This feature requires ${requiredPlan} plan or higher`,
          code: 'PLAN_UPGRADE_REQUIRED',
          currentPlan: tenant.subscriptionPlan,
          requiredPlan,
          subscriptionInfo,
        });
      }
    }

    // Check required feature(s)
    if (requiredFeature) {
      const features = Array.isArray(requiredFeature) ? requiredFeature : [requiredFeature];

      for (const feature of features) {
        const hasFeature = this.subscriptionService.hasFeature(
          tenant.subscriptionPlan,
          tenant.subscriptionStatus,
          feature,
        );

        if (!hasFeature) {
          throw new ForbiddenException({
            message: `This feature is not available in your current plan`,
            code: 'FEATURE_NOT_AVAILABLE',
            feature,
            currentPlan: tenant.subscriptionPlan,
            subscriptionInfo,
            upgradeRequired: true,
          });
        }
      }
    }

    // Attach subscription info to request for controllers to use
    request.subscriptionInfo = subscriptionInfo;

    return true;
  }
}
