import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all tenants with their subscription details
   */
  async getAllTenants() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            users: true,
            items: true,
            bills: true,
            locations: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return tenants.map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
      businessType: tenant.businessType,
      email: tenant.email,
      phone: tenant.phone,
      gstNumber: tenant.gstNumber,
      subscriptionPlan: tenant.subscriptionPlan,
      subscriptionStatus: tenant.subscriptionStatus,
      trialStartDate: tenant.trialStartDate,
      trialEndDate: tenant.trialEndDate,
      subscriptionStartDate: tenant.subscriptionStartDate,
      subscriptionEndDate: tenant.subscriptionEndDate,
      billingCycle: tenant.billingCycle,
      isActive: tenant.isActive,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      userCount: tenant._count.users,
      itemCount: tenant._count.items,
      billCount: tenant._count.bills,
      locationCount: tenant._count.locations,
      users: tenant.users,
    }));
  }

  /**
   * Update tenant subscription
   */
  async updateTenantSubscription(
    tenantId: string,
    data: {
      subscriptionPlan?: SubscriptionPlan;
      subscriptionStatus?: SubscriptionStatus;
      subscriptionStartDate?: Date;
      subscriptionEndDate?: Date;
      billingCycle?: string;
      trialEndDate?: Date;
    },
  ) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats() {
    const [
      totalTenants,
      activeTenants,
      trialTenants,
      starterTenants,
      professionalTenants,
      enterpriseTenants,
      totalUsers,
      totalBills,
      totalItems,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.tenant.count({
        where: { subscriptionStatus: 'ACTIVE' },
      }),
      this.prisma.tenant.count({
        where: { subscriptionStatus: 'TRIAL' },
      }),
      this.prisma.tenant.count({
        where: { subscriptionPlan: 'STARTER' },
      }),
      this.prisma.tenant.count({
        where: { subscriptionPlan: 'PROFESSIONAL' },
      }),
      this.prisma.tenant.count({
        where: { subscriptionPlan: 'ENTERPRISE' },
      }),
      this.prisma.user.count({
        where: { role: { not: 'SUPER_ADMIN' } },
      }),
      this.prisma.bill.count(),
      this.prisma.item.count(),
    ]);

    return {
      totalTenants,
      activeTenants,
      trialTenants,
      starterTenants,
      professionalTenants,
      enterpriseTenants,
      totalUsers,
      totalBills,
      totalItems,
    };
  }

  /**
   * Get tenant details
   */
  async getTenantDetails(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        locations: {
          select: {
            id: true,
            name: true,
            address: true,
            isActive: true,
          },
        },
      },
    });
  }

  /**
   * Create new tenant with owner user
   */
  async createTenant(data: {
    name: string;
    businessType: string;
    gstNumber?: string;
    address?: string;
    phone?: string;
    email?: string;
    ownerName: string;
    ownerEmail: string;
    ownerUsername: string;
    ownerPassword: string;
    ownerPhone?: string;
  }) {
    // Check if username already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { username: data.ownerUsername },
    });

    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash owner password
    const hashedPassword = await bcrypt.hash(data.ownerPassword, 10);

    // Calculate trial end date (30 days from now)
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    // Create tenant and owner user in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create tenant with PROFESSIONAL plan
      const tenant = await prisma.tenant.create({
        data: {
          name: data.name,
          businessType: data.businessType,
          gstNumber: data.gstNumber,
          address: data.address,
          phone: data.phone,
          email: data.email,
          subscriptionPlan: 'PROFESSIONAL',
          subscriptionStatus: 'ACTIVE',
          trialStartDate,
          trialEndDate,
          subscriptionStartDate: trialStartDate,
          subscriptionEndDate: trialEndDate,
          isActive: true,
        },
      });

      // Create owner user
      const owner = await prisma.user.create({
        data: {
          tenantId: tenant.id,
          username: data.ownerUsername,
          password: hashedPassword,
          email: data.ownerEmail,
          name: data.ownerName,
          phone: data.ownerPhone,
          role: 'OWNER',
          isActive: true,
        },
      });

      return { tenant, owner };
    });

    return result;
  }

  /**
   * Toggle tenant active status
   */
  async toggleTenantStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new Error('Tenant not found');
    }

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive: !tenant.isActive },
    });
  }
}
