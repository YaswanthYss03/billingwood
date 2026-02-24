import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { SubscriptionService } from '../common/services/subscription.service';
import { CreateCustomerDto, CustomerTier } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { EarnPointsDto, RedeemPointsDto, AdjustPointsDto } from './dto/loyalty.dto';

@Injectable()
export class CustomersService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Create a new customer
   */
  async create(tenantId: string, dto: CreateCustomerDto) {
    // Check if tenant can add more customers
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        customers: { where: { deletedAt: null } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const maxCustomers = this.subscriptionService.getLimit(
      tenant.subscriptionPlan,
      'maxCustomers',
    );

    if (maxCustomers !== 'unlimited' && tenant.customers.length >= maxCustomers) {
      throw new ForbiddenException({
        message: `You have reached the maximum number of customers (${maxCustomers}) for your plan`,
        code: 'CUSTOMER_LIMIT_REACHED',
        currentCount: tenant.customers.length,
        limit: maxCustomers,
        upgradeRequired: true,
      });
    }

    // Check for phone number uniqueness
    const existing = await this.prisma.customer.findFirst({
      where: {
        tenantId,
        phone: dto.phone,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException('Customer with this phone number already exists');
    }

    // Convert dateOfBirth to ISO DateTime if provided
    const customerData: any = {
      ...dto,
      tenantId,
      tier: dto.tier || CustomerTier.BRONZE,
    };

    if (dto.dateOfBirth) {
      // Convert date string to ISO DateTime format
      customerData.dateOfBirth = new Date(dto.dateOfBirth).toISOString();
    }

    return this.prisma.customer.create({
      data: customerData,
    });
  }

  /**
   * Get all customers with filtering and pagination
   */
  async findAll(
    tenantId: string,
    options?: {
      search?: string;
      tier?: CustomerTier;
      tags?: string[];
      includeInactive?: boolean;
      page?: number;
      limit?: number;
    },
  ) {
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (!options?.includeInactive) {
      where.isActive = true;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options?.tier) {
      where.tier = options.tier;
    }

    if (options?.tags && options.tags.length > 0) {
      where.tags = { hasSome: options.tags };
    }

    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { tier: 'desc' },
          { totalSpent: 'desc' },
        ],
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single customer by ID
   */
  async findOne(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
      include: {
        bills: {
          where: { status: { not: 'CANCELLED' } },
          orderBy: { billedAt: 'desc' },
          take: 10,
        },
        loyaltyTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return customer;
  }

  /**
   * Find customer by phone number
   */
  async findByPhone(tenantId: string, phone: string) {
    return this.prisma.customer.findFirst({
      where: {
        tenantId,
        phone,
        deletedAt: null,
        isActive: true,
      },
    });
  }

  /**
   * Update customer
   */
  async update(tenantId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.findOne(tenantId, id);

    // If phone is being changed, check uniqueness
    if (dto.phone && dto.phone !== customer.phone) {
      const existing = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          phone: dto.phone,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException('Customer with this phone number already exists');
      }
    }

    // Convert dateOfBirth to ISO DateTime if provided
    const updateData: any = { ...dto };
    if (dto.dateOfBirth) {
      updateData.dateOfBirth = new Date(dto.dateOfBirth).toISOString();
    }

    return this.prisma.customer.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Soft delete customer
   */
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Get customer insights and statistics
   */
  async getCustomerInsights(tenantId: string) {
    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
      },
    });

    const totalCustomers = customers.length;
    const tierDistribution = customers.reduce((acc, customer) => {
      acc[customer.tier] = (acc[customer.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalLifetimeValue = customers.reduce(
      (sum, customer) => sum + Number(customer.totalSpent),
      0,
    );

    const averageLifetimeValue = totalCustomers > 0 ? totalLifetimeValue / totalCustomers : 0;

    // Get top customers
    const topCustomers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
      },
      orderBy: { totalSpent: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        phone: true,
        tier: true,
        totalSpent: true,
        visitCount: true,
        loyaltyPoints: true,
      },
    });

    // Customer acquisition by month
    const last6Months = new Date();
    last6Months.setMonth(last6Months.getMonth() - 6);

    const newCustomers = await this.prisma.customer.count({
      where: {
        tenantId,
        createdAt: { gte: last6Months },
        deletedAt: null,
      },
    });

    return {
      totalCustomers,
      tierDistribution,
      totalLifetimeValue,
      averageLifetimeValue,
      topCustomers,
      newCustomersLast6Months: newCustomers,
    };
  }

  // ==========================================
  // LOYALTY PROGRAM
  // ==========================================

  /**
   * Calculate and award loyalty points for a purchase
   */
  async earnPoints(tenantId: string, dto: EarnPointsDto) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Create loyalty transaction
    await this.prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        type: 'EARNED',
        points: dto.points,
        billId: dto.billId,
        description: dto.description || `Earned ${dto.points} points`,
      },
    });

    // Update customer points
    const updatedCustomer = await this.prisma.customer.update({
      where: { id: dto.customerId },
      data: {
        loyaltyPoints: { increment: dto.points },
      },
    });

    // Check and upgrade tier if needed
    await this.checkAndUpgradeTier(tenantId, dto.customerId);

    return updatedCustomer;
  }

  /**
   * Redeem loyalty points
   */
  async redeemPoints(tenantId: string, dto: RedeemPointsDto) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (customer.loyaltyPoints < dto.points) {
      throw new BadRequestException(
        `Insufficient points. Available: ${customer.loyaltyPoints}, Requested: ${dto.points}`,
      );
    }

    // Create loyalty transaction
    await this.prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        type: 'REDEEMED',
        points: -dto.points,
        billId: dto.billId,
        description: dto.description || `Redeemed ${dto.points} points`,
      },
    });

    // Update customer points
    return this.prisma.customer.update({
      where: { id: dto.customerId },
      data: {
        loyaltyPoints: { decrement: dto.points },
      },
    });
  }

  /**
   * Adjust loyalty points (manual adjustment by admin)
   */
  async adjustPoints(tenantId: string, dto: AdjustPointsDto) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: dto.customerId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Create loyalty transaction
    await this.prisma.loyaltyTransaction.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        type: 'ADJUSTED',
        points: dto.points,
        description: dto.description,
      },
    });

    // Update customer points
    return this.prisma.customer.update({
      where: { id: dto.customerId },
      data: {
        loyaltyPoints: { increment: dto.points },
      },
    });
  }

  /**
   * Get loyalty transactions for a customer
   */
  async getLoyaltyTransactions(tenantId: string, customerId: string) {
    return this.prisma.loyaltyTransaction.findMany({
      where: {
        tenantId,
        customerId,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Check and auto-upgrade customer tier based on total spent
   */
  private async checkAndUpgradeTier(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) return;

    const totalSpent = Number(customer.totalSpent);
    let newTier = customer.tier;

    // Define tier thresholds
    if (totalSpent >= 100000) {
      newTier = CustomerTier.VIP;
    } else if (totalSpent >= 50000) {
      newTier = CustomerTier.PLATINUM;
    } else if (totalSpent >= 25000) {
      newTier = CustomerTier.GOLD;
    } else if (totalSpent >= 10000) {
      newTier = CustomerTier.SILVER;
    } else {
      newTier = CustomerTier.BRONZE;
    }

    // Update tier if changed
    if (newTier !== customer.tier) {
      await this.prisma.customer.update({
        where: { id: customerId },
        data: { tier: newTier },
      });
    }
  }

  /**
   * Get birthday customers (for automated campaigns)
   */
  async getBirthdayCustomers(tenantId: string, daysAhead = 7) {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysAhead);

    const customers = await this.prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        isActive: true,
        marketingOptIn: true,
        dateOfBirth: { not: null },
      },
    });

    // Filter by birthday (month and day only)
    return customers.filter((customer) => {
      if (!customer.dateOfBirth) return false;
      const birthday = new Date(customer.dateOfBirth);
      const birthdayThisYear = new Date(
        today.getFullYear(),
        birthday.getMonth(),
        birthday.getDate(),
      );

      return birthdayThisYear >= today && birthdayThisYear <= endDate;
    });
  }
}
