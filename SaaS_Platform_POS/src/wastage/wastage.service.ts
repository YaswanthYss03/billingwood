import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateWastageLogDto } from './dto/create-wastage-log.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class WastageService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record wastage/loss of inventory (Professional Plan)
   */
  async create(tenantId: string, userId: string, createWastageLogDto: CreateWastageLogDto) {
    // Verify item exists
    const item = await this.prisma.item.findFirst({
      where: {
        id: createWastageLogDto.itemId,
        tenantId,
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // If batch specified, verify and deduct from that batch
    if (createWastageLogDto.batchId) {
      const batch = await this.prisma.inventoryBatch.findFirst({
        where: {
          id: createWastageLogDto.batchId,
          tenantId,
          itemId: createWastageLogDto.itemId,
        },
      });

      if (!batch) {
        throw new NotFoundException('Batch not found');
      }

      const currentQty = new Decimal(batch.currentQuantity);
      const wastageQty = new Decimal(createWastageLogDto.quantity);

      if (currentQty.lessThan(wastageQty)) {
        throw new BadRequestException(
          `Insufficient quantity in batch. Available: ${currentQty}, Requested: ${wastageQty}`,
        );
      }

      // Deduct from batch and create wastage log in transaction
      const wastageLog = await this.prisma.$transaction(async (tx) => {
        // Deduct from batch
        await tx.inventoryBatch.update({
          where: { id: createWastageLogDto.batchId },
          data: {
            currentQuantity: currentQty.minus(wastageQty),
          },
        });

        // Create wastage log
        const log = await tx.wastageLog.create({
          data: {
            tenantId,
            itemId: createWastageLogDto.itemId,
            batchId: createWastageLogDto.batchId,
            quantity: wastageQty,
            reason: createWastageLogDto.reason,
            description: createWastageLogDto.description,
            estimatedValue: new Decimal(createWastageLogDto.estimatedValue),
            recordedBy: userId,
          },
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
              },
            },
            batch: {
              select: {
                id: true,
                batchNumber: true,
                expiryDate: true,
              },
            },
          },
        });

        return log;
      });

      return wastageLog;
    } else {
      // No specific batch - deduct from oldest batches (FIFO)
      const batches = await this.prisma.inventoryBatch.findMany({
        where: {
          itemId: createWastageLogDto.itemId,
          tenantId,
          currentQuantity: { gt: 0 },
        },
        orderBy: {
          purchaseDate: 'asc',
        },
      });

      let remainingQty = new Decimal(createWastageLogDto.quantity);
      const totalAvailable = batches.reduce(
        (sum, b) => sum.plus(b.currentQuantity),
        new Decimal(0),
      );

      if (totalAvailable.lessThan(remainingQty)) {
        throw new BadRequestException(
          `Insufficient total quantity. Available: ${totalAvailable}, Requested: ${remainingQty}`,
        );
      }

      // Deduct from batches in FIFO order
      const wastageLog = await this.prisma.$transaction(async (tx) => {
        for (const batch of batches) {
          if (remainingQty.lessThanOrEqualTo(0)) break;

          const currentQty = new Decimal(batch.currentQuantity);
          const deductQty = Decimal.min(currentQty, remainingQty);

          await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: {
              currentQuantity: currentQty.minus(deductQty),
            },
          });

          remainingQty = remainingQty.minus(deductQty);
        }

        // Create wastage log
        const log = await tx.wastageLog.create({
          data: {
            tenantId,
            itemId: createWastageLogDto.itemId,
            quantity: new Decimal(createWastageLogDto.quantity),
            reason: createWastageLogDto.reason,
            description: createWastageLogDto.description,
            estimatedValue: new Decimal(createWastageLogDto.estimatedValue),
            recordedBy: userId,
          },
          include: {
            item: {
              select: {
                id: true,
                name: true,
                sku: true,
                unit: true,
              },
            },
          },
        });

        return log;
      });

      return wastageLog;
    }
  }

  /**
   * Get all wastage logs for a tenant
   */
  async findAll(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
    reason?: string,
  ) {
    const where: any = { tenantId };

    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) where.recordedAt.gte = startDate;
      if (endDate) where.recordedAt.lte = endDate;
    }

    if (reason) {
      where.reason = reason;
    }

    const wastageLogs = await this.prisma.wastageLog.findMany({
      where,
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
          },
        },
        batch: {
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
          },
        },
      },
      orderBy: {
        recordedAt: 'desc',
      },
    });

    return wastageLogs;
  }

  /**
   * Get wastage summary
   */
  async getWastageSummary(tenantId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const wastageLogs = await this.prisma.wastageLog.findMany({
      where: {
        tenantId,
        recordedAt: { gte: startDate },
      },
    });

    const totalValue = wastageLogs.reduce(
      (sum, log) => sum.plus(log.estimatedValue),
      new Decimal(0),
    );

    const byReason = wastageLogs.reduce((acc: any, log) => {
      const reason = log.reason;
      if (!acc[reason]) {
        acc[reason] = {
          count: 0,
          value: new Decimal(0),
        };
      }
      acc[reason].count++;
      acc[reason].value = acc[reason].value.plus(log.estimatedValue);
      return acc;
    }, {});

    // Convert Decimal to number for JSON serialization
    const byReasonFormatted = Object.entries(byReason).map(([reason, data]: any) => ({
      reason,
      count: data.count,
      value: Number(data.value),
    }));

    return {
      period: `Last ${days} days`,
      totalWastageLogs: wastageLogs.length,
      totalValue: Number(totalValue),
      byReason: byReasonFormatted,
    };
  }

  /**
   * Get items expiring soon (Professional Plan)
   */
  async getExpiringItems(tenantId: string, daysThreshold: number = 30) {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const expiringBatches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        currentQuantity: { gt: 0 },
        expiryDate: {
          not: null,
          lte: thresholdDate,
          gte: new Date(), // Not already expired
        },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            price: true,
          },
        },
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });

    return expiringBatches
      .filter((batch) => batch.item) // Only process item batches (skip ingredients)
      .map((batch) => {
        const daysUntilExpiry = Math.floor(
          (batch.expiryDate!.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
        );

        let urgency = 'LOW';
        if (daysUntilExpiry <= 3) urgency = 'CRITICAL';
        else if (daysUntilExpiry <= 7) urgency = 'HIGH';
        else if (daysUntilExpiry <= 14) urgency = 'MEDIUM';

        const estimatedValue = new Decimal(batch.currentQuantity).times(batch.item!.price);

        return {
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          item: batch.item,
          currentQuantity: Number(batch.currentQuantity),
          expiryDate: batch.expiryDate,
          daysUntilExpiry,
          urgency,
          estimatedValue: Number(estimatedValue),
          suggestedDiscount: daysUntilExpiry <= 7 ? 0.2 : daysUntilExpiry <= 14 ? 0.1 : 0.05,
        };
      });
  }

  /**
   * Get already expired items
   */
  async getExpiredItems(tenantId: string) {
    const expiredBatches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        currentQuantity: { gt: 0 },
        expiryDate: {
          not: null,
          lt: new Date(),
        },
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            sku: true,
            unit: true,
            price: true,
          },
        },
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });

    return expiredBatches.map((batch) => {
      const daysExpired = Math.floor(
        (new Date().getTime() - batch.expiryDate!.getTime()) / (1000 * 60 * 60 * 24),
      );

      const estimatedLoss = new Decimal(batch.currentQuantity).times(batch.costPrice);

      return {
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        item: batch.item,
        currentQuantity: Number(batch.currentQuantity),
        expiryDate: batch.expiryDate,
        daysExpired,
        estimatedLoss: Number(estimatedLoss),
      };
    });
  }
}
