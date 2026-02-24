import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { SubscriptionService } from '../common/services/subscription.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpgradePlanDto, CancelSubscriptionDto } from './dto/subscription.dto';
import { Tenant } from '@prisma/client';
import { SubscriptionPlan, SubscriptionStatus } from '../common/constants/subscription-plans';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private subscriptionService: SubscriptionService,
  ) {}

  async create(createTenantDto: CreateTenantDto) {
    // Initialize with 7-day free trial of Professional features
    const trial = this.subscriptionService.initializeTrial();
    
    const tenant = await this.prisma.tenant.create({
      data: {
        name: createTenantDto.name,
        businessType: createTenantDto.businessType,
        gstNumber: createTenantDto.gstNumber,
        address: createTenantDto.address,
        phone: createTenantDto.phone,
        email: createTenantDto.email,
        inventoryMethod: createTenantDto.inventoryMethod || 'FIFO',
        currency: createTenantDto.currency || 'INR',
        timezone: createTenantDto.timezone || 'Asia/Kolkata',
        // Subscription trial
        subscriptionPlan: trial.subscriptionPlan,
        subscriptionStatus: trial.subscriptionStatus,
        trialStartDate: trial.trialStartDate,
        trialEndDate: trial.trialEndDate,
      },
    });

    // Cache tenant data
    await this.redis.set(`tenant:${tenant.id}`, tenant, 3600);

    return tenant;
  }

  async findAll() {
    return this.prisma.tenant.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Tenant> {
    // Try cache first
    const cached = await this.redis.get(`tenant:${id}`);
    if (cached) {
      return cached as Tenant;
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id, deletedAt: null },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID ${id} not found`);
    }

    // Cache for 1 hour
    await this.redis.set(`tenant:${id}`, tenant, 3600);

    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    await this.findOne(id); // Ensure exists

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: updateTenantDto,
    });

    // Invalidate cache
    await this.redis.del(`tenant:${id}`);

    return tenant;
  }

  async remove(id: string) {
    await this.findOne(id); // Ensure exists

    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Invalidate cache
    await this.redis.del(`tenant:${id}`);

    return tenant;
  }

  async toggleStatus(id: string) {
    const tenant = await this.findOne(id);

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: !(tenant as any).isActive },
    });

    // Invalidate cache
    await this.redis.del(`tenant:${id}`);

    return updated;
  }

  async updateSettings(id: string, settings: any) {
    const tenant = await this.prisma.tenant.update({
      where: { id },
      data: { settings },
    });

    // Invalidate tenant cache
    await this.redis.del(`tenant:${id}`);
    
    // Invalidate all user caches for this tenant (they include tenant data)
    // Get all users for this tenant and clear their caches
    const users = await this.prisma.user.findMany({
      where: { tenantId: id },
      select: { id: true, username: true },
    });
    
    for (const user of users) {
      await this.redis.del(`user:${user.id}`);
      await this.redis.del(`user:username:${user.username}`);
    }

    return tenant;
  }

  // ==========================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================

  async upgradePlan(tenantId: string, dto: UpgradePlanDto) {
    const tenant = await this.findOne(tenantId);

    // Validate plan upgrade
    if (tenant.subscriptionPlan === dto.targetPlan) {
      throw new BadRequestException('Already on this plan');
    }

    // In production, integrate with payment gateway here
    // For now, just update the subscription
    const upgrade = this.subscriptionService.upgradeToPaidPlan(
      dto.targetPlan,
      dto.billingCycle,
    );

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionPlan: upgrade.subscriptionPlan,
        subscriptionStatus: upgrade.subscriptionStatus,
        subscriptionStartDate: upgrade.subscriptionStartDate,
        subscriptionEndDate: upgrade.subscriptionEndDate,
        billingCycle: upgrade.billingCycle,
      },
    });

    // Invalidate cache
    await this.redis.del(`tenant:${tenantId}`);

    return {
      success: true,
      message: `Successfully upgraded to ${dto.targetPlan} plan`,
      subscription: this.subscriptionService.getSubscriptionInfo({
        subscriptionPlan: updated.subscriptionPlan,
        subscriptionStatus: updated.subscriptionStatus,
        trialStartDate: updated.trialStartDate ?? undefined,
        trialEndDate: updated.trialEndDate ?? undefined,
        subscriptionStartDate: updated.subscriptionStartDate ?? undefined,
        subscriptionEndDate: updated.subscriptionEndDate ?? undefined,
      }),
    };
  }

  async cancelSubscription(tenantId: string, dto: CancelSubscriptionDto) {
    const tenant = await this.findOne(tenantId);

    if (tenant.subscriptionStatus === SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription already cancelled');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: SubscriptionStatus.CANCELLED,
        // Store cancellation feedback
        settings: {
          ...(tenant.settings as any || {}),
          cancellation: {
            reason: dto.reason,
            feedback: dto.feedback,
            cancelledAt: new Date(),
          },
        },
      },
    });

    // Invalidate cache
    await this.redis.del(`tenant:${tenantId}`);

    return {
      success: true,
      message: 'Subscription cancelled successfully',
      accessUntil: tenant.subscriptionEndDate,
    };
  }

  async reactivateSubscription(tenantId: string) {
    const tenant = await this.findOne(tenantId);

    if (tenant.subscriptionStatus !== SubscriptionStatus.CANCELLED) {
      throw new BadRequestException('Subscription is not cancelled');
    }

    // Check if subscription has expired
    if (tenant.subscriptionEndDate && new Date() > tenant.subscriptionEndDate) {
      throw new BadRequestException('Subscription has expired. Please upgrade to a new plan.');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        subscriptionStatus: SubscriptionStatus.ACTIVE,
      },
    });

    // Invalidate cache
    await this.redis.del(`tenant:${tenantId}`);

    return {
      success: true,
      message: 'Subscription reactivated successfully',
      subscription: this.subscriptionService.getSubscriptionInfo({
        subscriptionPlan: updated.subscriptionPlan,
        subscriptionStatus: updated.subscriptionStatus,
        trialStartDate: updated.trialStartDate ?? undefined,
        trialEndDate: updated.trialEndDate ?? undefined,
        subscriptionStartDate: updated.subscriptionStartDate ?? undefined,
        subscriptionEndDate: updated.subscriptionEndDate ?? undefined,
      }),
    };
  }
}
