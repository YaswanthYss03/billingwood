import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { SubscriptionService } from '../common/services/subscription.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateStockTransferDto, UpdateTransferStatusDto } from './dto/stock-transfer.dto';

@Injectable()
export class LocationsService {
  constructor(
    private prisma: PrismaService,
    private subscriptionService: SubscriptionService,
  ) {}

  /**
   * Create a new location with optional user assignments
   */
  async create(tenantId: string, dto: CreateLocationDto) {
    // Check if tenant can add more locations
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        locations: { where: { deletedAt: null } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const maxLocations = this.subscriptionService.getLimit(
      tenant.subscriptionPlan,
      'maxLocations',
    );

    if (maxLocations !== 'unlimited' && tenant.locations.length >= maxLocations) {
      throw new ForbiddenException({
        message: `You have reached the maximum number of locations (${maxLocations}) for your plan`,
        code: 'LOCATION_LIMIT_REACHED',
        currentCount: tenant.locations.length,
        limit: maxLocations,
        upgradeRequired: true,
      });
    }

    // Check for code uniqueness
    const existing = await this.prisma.location.findFirst({
      where: {
        tenantId,
        code: dto.code,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException('Location code already exists');
    }

    // Extract user assignment fields
    const { managerId, newManager, cashierIds, newCashiers, ...locationData } = dto;

    // Create location and handle user assignments in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // 1. Create the location
      const location = await prisma.location.create({
        data: {
          ...locationData,
          tenantId,
        },
      });

      const userAssignments = [];

      // 2. Assign existing manager
      if (managerId) {
        await prisma.user.update({
          where: { id: managerId },
          data: { locationId: location.id },
        });
        userAssignments.push({ id: managerId, role: 'MANAGER' });
      }

      // 3. Create new manager
      if (newManager) {
        const hashedPassword = require('bcrypt').hashSync(
          newManager.password,
          10,
        );
        const createdManager = await prisma.user.create({
          data: {
            ...newManager,
            password: hashedPassword,
            tenantId,
            locationId: location.id,
          },
        });
        userAssignments.push({ id: createdManager.id, role: 'MANAGER' });
      }

      // 4. Assign existing cashiers
      if (cashierIds && cashierIds.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: cashierIds } },
          data: { locationId: location.id },
        });
        cashierIds.forEach(id => userAssignments.push({ id, role: 'CASHIER' }));
      }

      // 5. Create new cashiers
      if (newCashiers && newCashiers.length > 0) {
        for (const cashier of newCashiers) {
          const hashedPassword = require('bcrypt').hashSync(
            cashier.password,
            10,
          );
          const createdCashier = await prisma.user.create({
            data: {
              ...cashier,
              password: hashedPassword,
              tenantId,
              locationId: location.id,
            },
          });
          userAssignments.push({ id: createdCashier.id, role: 'CASHIER' });
        }
      }

      return { location, userAssignments };
    });

    // Return location with user assignment info
    return {
      ...result.location,
      assignedUsers: result.userAssignments,
    };
  }

  /**
   * Get all locations for a tenant with assigned users
   */
  async findAll(tenantId: string, includeInactive = false) {
    const where: any = {
      tenantId,
      deletedAt: null,
    };

    if (!includeInactive) {
      where.isActive = true;
    }

    return this.prisma.location.findMany({
      where,
      include: {
        users: {
          where: { isActive: true, deletedAt: null },
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            role: true,
          },
        },
        _count: {
          select: {
            bills: true,
            users: true,
          },
        },
      },
      orderBy: [
        { isHeadquarters: 'desc' },
        { createdAt: 'asc' },
      ],
    });
  }

  /**
   * Get a single location by ID
   */
  async findOne(tenantId: string, id: string) {
    const location = await this.prisma.location.findFirst({
      where: {
        id,
        tenantId,
        deletedAt: null,
      },
    });

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  /**
   * Update a location
   */
  async update(tenantId: string, id: string, dto: UpdateLocationDto) {
    const location = await this.findOne(tenantId, id);

    // If code is being changed, check uniqueness
    if (dto.code && dto.code !== location.code) {
      const existing = await this.prisma.location.findFirst({
        where: {
          tenantId,
          code: dto.code,
          deletedAt: null,
          id: { not: id },
        },
      });

      if (existing) {
        throw new BadRequestException('Location code already exists');
      }
    }

    return this.prisma.location.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Soft delete a location
   */
  async remove(tenantId: string, id: string) {
    const location = await this.findOne(tenantId, id);

    // Check if location has any bills
    const billCount = await this.prisma.bill.count({
      where: {
        locationId: id,
        status: { not: 'CANCELLED' },
      },
    });

    if (billCount > 0) {
      throw new BadRequestException(
        'Cannot delete location with existing bills. Please archive it instead.',
      );
    }

    return this.prisma.location.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  /**
   * Get location-wise sales reports
   */
  async getLocationReport(tenantId: string, startDate?: Date, endDate?: Date) {
    const locations = await this.findAll(tenantId);

    const reports = await Promise.all(
      locations.map(async (location) => {
        const where: any = {
          tenantId,
          locationId: location.id,
          status: { not: 'CANCELLED' },
        };

        if (startDate) {
          where.billedAt = { gte: startDate };
        }
        if (endDate) {
          where.billedAt = { ...where.billedAt, lte: endDate };
        }

        const bills = await this.prisma.bill.findMany({
          where,
          select: {
            totalAmount: true,
            subtotal: true,
            taxAmount: true,
            discount: true,
            billedAt: true,
          },
        });

        const totalRevenue = bills.reduce(
          (sum, bill) => sum + Number(bill.totalAmount),
          0,
        );

        const totalDiscount = bills.reduce(
          (sum, bill) => sum + Number(bill.discount),
          0,
        );

        return {
          locationId: location.id,
          locationName: location.name,
          locationCode: location.code,
          totalBills: bills.length,
          totalRevenue,
          averageBillValue: bills.length > 0 ? totalRevenue / bills.length : 0,
          totalDiscount,
        };
      }),
    );

    return reports;
  }

  // ==========================================
  // STOCK TRANSFERS
  // ==========================================

  /**
   * Create a stock transfer between locations
   */
  async createStockTransfer(tenantId: string, userId: string, dto: CreateStockTransferDto) {
    // Validate locations
    const [fromLocation, toLocation] = await Promise.all([
      this.findOne(tenantId, dto.fromLocationId),
      this.findOne(tenantId, dto.toLocationId),
    ]);

    if (!fromLocation.allowStockTransfer) {
      throw new BadRequestException('Stock transfer not allowed from this location');
    }

    // Check if items have sufficient stock at the source location
    for (const item of dto.items) {
      const batch = await this.prisma.inventoryBatch.findFirst({
        where: {
          id: item.batchId,
          itemId: item.itemId,
          tenantId,
          locationId: dto.fromLocationId, // CRITICAL: Ensure batch is from source location
        },
      });

      if (!batch) {
        throw new NotFoundException(
          `Batch ${item.batchId} not found at source location`,
        );
      }

      if (Number(batch.currentQuantity) < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for item ${item.itemId}. Available: ${batch.currentQuantity}, Requested: ${item.quantity}`,
        );
      }
    }

    // Generate transfer number
    const transferCount = await this.prisma.stockTransfer.count({
      where: { tenantId },
    });
    const transferNumber = `ST-${new Date().getFullYear()}-${String(transferCount + 1).padStart(6, '0')}`;

    // Create transfer
    const transfer = await this.prisma.stockTransfer.create({
      data: {
        tenantId,
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        transferNumber,
        items: dto.items as any, // Cast to any for JSON field compatibility
        notes: dto.notes,
        status: 'PENDING',
        sentBy: userId,
      },
      include: {
        fromLocation: true,
        toLocation: true,
      },
    });

    return transfer;
  }

  /**
   * Update stock transfer status
   */
  async updateTransferStatus(
    tenantId: string,
    transferId: string,
    userId: string,
    dto: UpdateTransferStatusDto,
  ) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: {
        id: transferId,
        tenantId,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Stock transfer not found');
    }

    const updateData: any = {
      status: dto.status,
    };

    // Handle status-specific logic
    if (dto.status === 'IN_TRANSIT' && transfer.status === 'PENDING') {
      updateData.sentAt = new Date();
      updateData.sentBy = userId;

      // Deduct stock from source location
      const items = transfer.items as any[];
      for (const item of items) {
        await this.prisma.inventoryBatch.update({
          where: { id: item.batchId },
          data: {
            currentQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }
    }

    if (dto.status === 'RECEIVED' && transfer.status === 'IN_TRANSIT') {
      updateData.receivedAt = new Date();
      updateData.receivedBy = userId;

      // Create new inventory batches at destination location
      const items = transfer.items as any[];
      for (const item of items) {
        // Get original batch info for cost price
        const sourceBatch = await this.prisma.inventoryBatch.findUnique({
          where: { id: item.batchId },
        });

        if (!sourceBatch) {
          throw new NotFoundException(
            `Source batch ${item.batchId} not found`,
          );
        }

        // Create new batch at destination with same cost price
        await this.prisma.inventoryBatch.create({
          data: {
            tenantId,
            itemId: item.itemId,
            locationId: transfer.toLocationId, // CRITICAL: Set destination location
            batchNumber: `TRANSFER-${transfer.transferNumber}-${item.itemId.substring(0, 8)}`,
            initialQuantity: item.quantity,
            currentQuantity: item.quantity,
            costPrice: sourceBatch.costPrice,
            purchaseDate: new Date(),
          },
        });
      }
    }

    if (dto.status === 'CANCELLED') {
      // If transfer was in-transit, return stock to source
      if (transfer.status === 'IN_TRANSIT') {
        const items = transfer.items as any[];
        for (const item of items) {
          await this.prisma.inventoryBatch.update({
            where: { id: item.batchId },
            data: {
              currentQuantity: {
                increment: item.quantity,
              },
            },
          });
        }
      }
    }

    return this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: updateData,
      include: {
        fromLocation: true,
        toLocation: true,
      },
    });
  }

  /**
   * Get all stock transfers
   */
  async getStockTransfers(tenantId: string, locationId?: string, status?: string) {
    const where: any = { tenantId };

    if (locationId) {
      where.OR = [
        { fromLocationId: locationId },
        { toLocationId: locationId },
      ];
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.stockTransfer.findMany({
      where,
      include: {
        fromLocation: true,
        toLocation: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single stock transfer
   */
  async getStockTransfer(tenantId: string, transferId: string) {
    const transfer = await this.prisma.stockTransfer.findFirst({
      where: {
        id: transferId,
        tenantId,
      },
      include: {
        fromLocation: true,
        toLocation: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Stock transfer not found');
    }

    return transfer;
  }
}
