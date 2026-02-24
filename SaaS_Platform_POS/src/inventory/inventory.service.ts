import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { RedisService } from '../common/services/redis.service';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaClient, Prisma } from '@prisma/client';

export interface BatchAllocation {
  batchId: string;
  quantityUsed: number;
  costPrice: number;
}

interface BatchQueryResult {
  id: string;
  currentQuantity: number | string;
  costPrice: number | string;
  purchaseDate: Date | string;
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * Get current stock for an item
   * LOCATION-AWARE: If locationId provided, only returns stock at that location
   */
  async getCurrentStock(tenantId: string, itemId: string, locationId?: string): Promise<number> {
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        itemId,
        ...(locationId && { locationId }),
        currentQuantity: { gt: 0 },
      },
    });

    return batches.reduce((sum, batch) => sum + Number(batch.currentQuantity), 0);
  }

  /**
   * Get all inventory batches for an item
   * LOCATION-AWARE: If locationId provided, only returns batches from that location
   */
  async getBatches(tenantId: string, itemId?: string, locationId?: string) {
    return this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        ...(itemId && { itemId }),
        ...(locationId && { locationId }),
      },
      include: {
        item: {
          select: {
            name: true,
            sku: true,
            unit: true,
          },
        },
        ingredient: {
          select: {
            name: true,
            unit: true,
          },
        },
      },
      orderBy: { purchaseDate: 'asc' }, // FIFO order
    });
  }

  /**
   * Get batch by ID
   */
  async getBatch(tenantId: string, batchId: string) {
    const batch = await this.prisma.inventoryBatch.findFirst({
      where: { id: batchId, tenantId },
      include: {
        item: true,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }

    return batch;
  }

  /**
   * FIFO allocation: Allocate batches for a given item and quantity
   * Returns array of batch allocations
   * NOW WITH ROW-LEVEL LOCKING FOR CONCURRENCY SAFETY
   */
  async allocateBatchesFIFO(
    tenantId: string,
    itemId: string,
    requiredQuantity: number,
    locationId: string,
    tx?: any,
  ): Promise<BatchAllocation[]> {
    const prisma = tx || this.prisma;

    // Use raw query with FOR UPDATE to lock rows and prevent race conditions
    // This ensures concurrent bills don't allocate the same inventory
    // LOCATION-AWARE: Only allocate from batches at the same location
    const batches = await prisma.$queryRaw<BatchQueryResult[]>`
      SELECT id, current_quantity as "currentQuantity", cost_price as "costPrice", purchase_date as "purchaseDate"
      FROM inventory_batches
      WHERE tenant_id = ${tenantId}
        AND item_id = ${itemId}
        AND location_id = ${locationId}
        AND current_quantity > 0
      ORDER BY purchase_date ASC
      FOR UPDATE
    `;

    if (batches.length === 0) {
      throw new BadRequestException(`No inventory available for item ${itemId}`);
    }

    const allocations: BatchAllocation[] = [];
    let remainingQuantity = requiredQuantity;

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const available = Number(batch.currentQuantity);
      const toAllocate = Math.min(available, remainingQuantity);

      allocations.push({
        batchId: batch.id,
        quantityUsed: toAllocate,
        costPrice: Number(batch.costPrice),
      });

      remainingQuantity -= toAllocate;
    }

    if (remainingQuantity > 0) {
      const totalAvailable = batches.reduce(
        (sum: number, b: BatchQueryResult) => sum + Number(b.currentQuantity),
        0,
      );
      throw new BadRequestException(
        `Insufficient inventory. Required: ${requiredQuantity}, Available: ${totalAvailable}`,
      );
    }

    return allocations;
  }

  /**
   * Allocate ingredient batches using FIFO
   * Used for Professional Plan when deducting ingredients for recipe preparation
   */
  async allocateIngredientBatchesFIFO(
    tenantId: string,
    ingredientId: string,
    requiredQuantity: number,
    locationId?: string,
    tx?: any,
  ): Promise<BatchAllocation[]> {
    const prisma = tx || this.prisma;

    // Debug: Check all batches for this tenant
    const debugAllBatches = await prisma.$queryRaw<any[]>`
      SELECT id, item_id, ingredient_id, current_quantity, batch_number
      FROM inventory_batches
      WHERE tenant_id = ${tenantId}
        AND current_quantity > 0
    `;
    console.log(`[FIFO DEBUG] All batches for tenant ${tenantId}:`, debugAllBatches);
    console.log(`[FIFO DEBUG] Looking for ingredientId: ${ingredientId}`);

    // Get ingredient batches with FIFO ordering and row locking
    const batches = await prisma.$queryRaw<BatchQueryResult[]>`
      SELECT id, current_quantity as "currentQuantity", cost_price as "costPrice", purchase_date as "purchaseDate"
      FROM inventory_batches
      WHERE tenant_id = ${tenantId}
        AND ingredient_id = ${ingredientId}
        ${locationId ? Prisma.sql`AND location_id = ${locationId}` : Prisma.sql``}
        AND current_quantity > 0
      ORDER BY purchase_date ASC
      FOR UPDATE
    `;

    console.log(`[FIFO] Searching for ingredient batches: tenantId=${tenantId}, ingredientId=${ingredientId}, found=${batches.length} batches`);

    if (batches.length === 0) {
      // Try to get total available across all batches (without filters)
      const allBatches = await prisma.$queryRaw<Array<{total: number}>>`
        SELECT COALESCE(SUM(current_quantity), 0) as total
        FROM inventory_batches
        WHERE tenant_id = ${tenantId}
          AND ingredient_id = ${ingredientId}
          AND current_quantity > 0
      `;
      const totalAvailable = allBatches[0]?.total || 0;
      throw new BadRequestException(`No batches available for ingredient ${ingredientId}. Total available: ${totalAvailable}`);
    }

    const allocations: BatchAllocation[] = [];
    let remainingQuantity = requiredQuantity;

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const available = Number(batch.currentQuantity);
      const toAllocate = Math.min(available, remainingQuantity);

      allocations.push({
        batchId: batch.id,
        quantityUsed: toAllocate,
        costPrice: Number(batch.costPrice),
      });

      remainingQuantity -= toAllocate;
    }

    if (remainingQuantity > 0) {
      const totalAvailable = batches.reduce(
        (sum: number, b: BatchQueryResult) => sum + Number(b.currentQuantity),
        0,
      );
      throw new BadRequestException(
        `Insufficient ingredient inventory. Required: ${requiredQuantity}, Available: ${totalAvailable}`,
      );
    }

    return allocations;
  }

  /**
   * Weighted average allocation
   * NOW WITH ROW-LEVEL LOCKING FOR CONCURRENCY SAFETY
   * LOCATION-AWARE: Only allocates from batches at specified location
   */
  async allocateBatchesWeightedAverage(
    tenantId: string,
    itemId: string,
    requiredQuantity: number,
    locationId: string,
    tx?: any,
  ): Promise<BatchAllocation[]> {
    const prisma = tx || this.prisma;

    // Use raw query with FOR UPDATE to lock rows
    // LOCATION-AWARE: Only select batches from the specified location
    const batches = await prisma.$queryRaw<BatchQueryResult[]>`
      SELECT id, current_quantity as "currentQuantity", cost_price as "costPrice", purchase_date as "purchaseDate"
      FROM inventory_batches
      WHERE tenant_id = ${tenantId}
        AND item_id = ${itemId}
        AND location_id = ${locationId}
        AND current_quantity > 0
      FOR UPDATE
    `;

    if (batches.length === 0) {
      throw new BadRequestException(`No inventory available for item ${itemId}`);
    }

    // Calculate weighted average cost
    let totalQuantity = 0;
    let totalValue = 0;

    for (const batch of batches) {
      const qty = Number(batch.currentQuantity);
      const cost = Number(batch.costPrice);
      totalQuantity += qty;
      totalValue += qty * cost;
    }

    if (totalQuantity < requiredQuantity) {
      throw new BadRequestException(
        `Insufficient inventory. Required: ${requiredQuantity}, Available: ${totalQuantity}`,
      );
    }

    const averageCost = totalValue / totalQuantity;

    // For deduction, still use FIFO order but with average cost
    const allocations: BatchAllocation[] = [];
    let remainingQuantity = requiredQuantity;

    // Sort by purchase date
    const sortedBatches = [...batches].sort(
      (a: BatchQueryResult, b: BatchQueryResult) => new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime(),
    );

    for (const batch of sortedBatches) {
      if (remainingQuantity <= 0) break;

      const available = Number(batch.currentQuantity);
      const toAllocate = Math.min(available, remainingQuantity);

      allocations.push({
        batchId: batch.id,
        quantityUsed: toAllocate,
        costPrice: averageCost, // Use weighted average cost
      });

      remainingQuantity -= toAllocate;
    }

    return allocations;
  }

  /**
   * Deduct inventory (called during billing)
   * This is concurrency-safe and transactional
   * NOW WITH PROPER TRANSACTION PASSING FOR ROW-LEVEL LOCKING
   * LOCATION-AWARE: Only deducts from batches at the specified location
   */
  async deductInventory(
    tenantId: string,
    itemId: string,
    quantity: number,
    locationId: string,
    inventoryMethod: 'FIFO' | 'WEIGHTED_AVERAGE' = 'FIFO',
    tx?: PrismaClient,
  ): Promise<BatchAllocation[]> {
    const prisma = tx || this.prisma;

    // Allocate batches WITH row-level locking
    // LOCATION-AWARE: Pass locationId to ensure only same-location batches are allocated
    const allocations =
      inventoryMethod === 'FIFO'
        ? await this.allocateBatchesFIFO(tenantId, itemId, quantity, locationId, prisma)
        : await this.allocateBatchesWeightedAverage(tenantId, itemId, quantity, locationId, prisma);

    // OPTIMIZED: Deduct from all batches in parallel instead of sequential loop
    await Promise.all(
      allocations.map((allocation) =>
        prisma.inventoryBatch.update({
          where: { id: allocation.batchId },
          data: {
            currentQuantity: {
              decrement: new Decimal(allocation.quantityUsed),
            },
          },
        })
      )
    );

    this.logger.log(
      `Deducted inventory for item ${itemId}: ${allocations.length} batches updated`
    );

    // Invalidate cache
    await this.redis.delTenantCache(tenantId, `inventory:${itemId}`);

    return allocations;
  }

  /**
   * BULK inventory deduction for multiple items (OPTIMIZED for billing)
   * Fetches all batches in ONE query, allocates in memory, updates in bulk
   * LOCATION-AWARE: Only allocates from batches at the specified location
   */
  async deductInventoryBulk(
    tenantId: string,
    items: Array<{ itemId: string; quantity: number }>,
    locationId: string,
    inventoryMethod: 'FIFO' | 'WEIGHTED_AVERAGE' = 'FIFO',
    tx?: PrismaClient,
  ): Promise<Map<string, BatchAllocation[]>> {
    const prisma = tx || this.prisma;
    const itemIds = items.map(i => i.itemId);

    // OPTIMIZED: Single SELECT for all items (Prisma ORM - stable)
    // Note: Using ORM instead of raw SQL to avoid UUID casting issues
    // Transaction isolation provides correctness even without FOR UPDATE SKIP LOCKED
    // LOCATION-AWARE: Only fetch batches from the specified location
    const batches = await prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        locationId,
        itemId: { in: itemIds },
        currentQuantity: { gt: 0 },
      },
      select: {
        id: true,
        itemId: true,
        currentQuantity: true,
        costPrice: true,
        purchaseDate: true,
      },
      orderBy: [
        { itemId: 'asc' },
        { purchaseDate: 'asc' },
      ],
    });

    // Group batches by item (skip ingredient batches)
    const batchesByItem = new Map<string, any[]>();
    for (const batch of batches) {
      if (!batch.itemId) continue; // Skip ingredient batches
      const existing = batchesByItem.get(batch.itemId) || [];
      existing.push(batch);
      batchesByItem.set(batch.itemId, existing);
    }

    // Allocate batches for each item IN MEMORY (no DB calls)
    const allAllocations = new Map<string, BatchAllocation[]>();
    const batchUpdates: Array<{ id: string; decrement: number }> = [];

    for (const { itemId, quantity } of items) {
      const itemBatches = batchesByItem.get(itemId) || [];

      if (itemBatches.length === 0) {
        throw new BadRequestException(`No inventory available for item ${itemId}`);
      }

      const allocations: BatchAllocation[] = [];
      let remainingQuantity = quantity;

      for (const batch of itemBatches) {
        if (remainingQuantity <= 0) break;

        const available = Number(batch.currentQuantity);
        const toAllocate = Math.min(available, remainingQuantity);

        allocations.push({
          batchId: batch.id,
          quantityUsed: toAllocate,
          costPrice: Number(batch.costPrice),
        });

        batchUpdates.push({ id: batch.id, decrement: toAllocate });
        remainingQuantity -= toAllocate;
      }

      if (remainingQuantity > 0) {
        const totalAvailable = itemBatches.reduce(
          (sum, b) => sum + Number(b.currentQuantity),
          0,
        );
        throw new BadRequestException(
          `Insufficient inventory for item ${itemId}. Required: ${quantity}, Available: ${totalAvailable}`,
        );
      }

      allAllocations.set(itemId, allocations);
    }

    // OPTIMIZED: Bulk UPDATE using Prisma ORM (stable)
    // Using Promise.all for parallel updates instead of CASE WHEN to avoid UUID issues
    if (batchUpdates.length > 0) {
      await Promise.all(
        batchUpdates.map(({ id, decrement }) =>
          prisma.inventoryBatch.update({
            where: { id },
            data: {
              currentQuantity: {
                decrement,
              },
            },
          })
        )
      );
    }

    this.logger.log(
      `Bulk deducted ${items.length} items: ${batchUpdates.length} batches (parallel updates)`
    );

    return allAllocations;
  }

  /**
   * Restore inventory (called during bill cancellation)
   */
  async restoreInventory(
    allocations: BatchAllocation[],
    tx?: PrismaClient,
  ): Promise<void> {
    const prisma = tx || this.prisma;

    // OPTIMIZED: Restore all batches in parallel
    await Promise.all(
      allocations.map((allocation) =>
        prisma.inventoryBatch.update({
          where: { id: allocation.batchId },
          data: {
            currentQuantity: {
              increment: new Decimal(allocation.quantityUsed),
            },
          },
        })
      )
    );

    this.logger.log(
      `Restored inventory: ${allocations.length} batches updated`
    );
  }

  /**
   * Manual inventory adjustment
   */
  async adjustInventory(
    tenantId: string,
    batchId: string,
    newQuantity: number,
    reason: string,
  ) {
    const batch = await this.getBatch(tenantId, batchId);

    const updated = await this.prisma.inventoryBatch.update({
      where: { id: batchId },
      data: {
        currentQuantity: new Decimal(newQuantity),
      },
    });

    this.logger.warn(
      `Manual adjustment: Batch ${batchId} changed from ${batch.currentQuantity} to ${newQuantity}. Reason: ${reason}`,
    );

    // Invalidate cache
    await this.redis.delTenantCache(tenantId, `inventory:${batch.itemId}`);

    return updated;
  }

  /**
   * Get inventory valuation
   */
  async getInventoryValuation(tenantId: string) {
    const batches = await this.prisma.inventoryBatch.findMany({
      where: {
        tenantId,
        currentQuantity: { gt: 0 },
      },
      include: {
        item: {
          select: {
            name: true,
            sku: true,
            unit: true,
          },
        },
        ingredient: {
          select: {
            name: true,
            unit: true,
          },
        },
      },
    });

    const valuation = batches.map((batch) => ({
      batchNumber: batch.batchNumber,
      itemName: batch.item?.name || batch.ingredient?.name || 'Unknown',
      itemSku: batch.item?.sku || '',
      quantity: Number(batch.currentQuantity),
      costPrice: Number(batch.costPrice),
      value: Number(batch.currentQuantity) * Number(batch.costPrice),
      purchaseDate: batch.purchaseDate,
    }));

    const totalValue = valuation.reduce((sum, v) => sum + v.value, 0);

    return {
      batches: valuation,
      totalValue,
      totalBatches: valuation.length,
    };
  }

  /**
   * Get low stock items
   */
  async getLowStockItems(tenantId: string, threshold: number = 10) {
    const items = await this.prisma.item.findMany({
      where: {
        tenantId,
        trackInventory: true,
        deletedAt: null,
      },
      include: {
        inventoryBatches: {
          where: {
            currentQuantity: { gt: 0 },
          },
        },
      },
    });

    const lowStockItems = items
      .map((item) => {
        const totalStock = item.inventoryBatches.reduce(
          (sum, batch) => sum + Number(batch.currentQuantity),
          0,
        );

        return {
          id: item.id,
          name: item.name,
          sku: item.sku,
          currentStock: totalStock,
          unit: item.unit,
        };
      })
      .filter((item) => item.currentStock < threshold)
      .sort((a, b) => a.currentStock - b.currentStock);

    return lowStockItems;
  }

  /**
   * Get reorder alerts (Professional Plan)
   * Items that have fallen below their reorder level
   */
  async getReorderAlerts(tenantId: string) {
    const items = await this.prisma.item.findMany({
      where: {
        tenantId,
        trackInventory: true,
        isActive: true,
        deletedAt: null,
        reorderLevel: { not: null },
      },
      include: {
        inventoryBatches: {
          where: {
            currentQuantity: { gt: 0 },
          },
        },
      },
    });

    const alerts: any[] = [];

    for (const item of items) {
      const totalStock = item.inventoryBatches.reduce(
        (sum, batch) => sum.plus(batch.currentQuantity),
        new Decimal(0),
      );

      const reorderLevel = item.reorderLevel ? new Decimal(item.reorderLevel) : null;

      if (reorderLevel && totalStock.lessThan(reorderLevel)) {
        // Calculate sales velocity to suggest purchase quantity
        const velocity = await this.getSalesVelocity(tenantId, item.id, 30);

        const suggestedQty = item.reorderQuantity
          ? Number(item.reorderQuantity)
          : Math.ceil(velocity.averageDailySales * 15); // 15 days supply

        let urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' = 'MEDIUM';
        const daysOfStock = velocity.averageDailySales > 0
          ? Number(totalStock) / velocity.averageDailySales
          : 999;

        if (daysOfStock <= 3) urgency = 'CRITICAL';
        else if (daysOfStock <= 7) urgency = 'HIGH';

        alerts.push({
          item: {
            id: item.id,
            name: item.name,
            sku: item.sku,
            unit: item.unit,
          },
          currentStock: Number(totalStock),
          reorderLevel: Number(reorderLevel),
          suggestedPurchaseQuantity: suggestedQty,
          salesVelocity: velocity,
          daysOfStockRemaining: Math.floor(daysOfStock),
          urgency,
        });
      }
    }

    return alerts.sort((a: any, b: any) => {
      const urgencyOrder: Record<'CRITICAL' | 'HIGH' | 'MEDIUM', number> = { 
        CRITICAL: 0, 
        HIGH: 1, 
        MEDIUM: 2 
      };
      return urgencyOrder[a.urgency as 'CRITICAL' | 'HIGH' | 'MEDIUM'] - urgencyOrder[b.urgency as 'CRITICAL' | 'HIGH' | 'MEDIUM'];
    });
  }

  /**
   * Calculate sales velocity for an item (Professional Plan)
   */
  async getSalesVelocity(tenantId: string, itemId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const billItems = await this.prisma.billItem.findMany({
      where: {
        itemId,
        bill: {
          tenantId,
          status: 'COMPLETED',
          createdAt: { gte: startDate },
        },
      },
      select: {
        quantity: true,
      },
    });

    const totalSold = billItems.reduce(
      (sum, item) => sum.plus(item.quantity),
      new Decimal(0),
    );

    const averageDailySales = Number(totalSold) / days;

    return {
      period: `Last ${days} days`,
      totalSold: Number(totalSold),
      averageDailySales: parseFloat(averageDailySales.toFixed(2)),
      projectedMonthlySales: parseFloat((averageDailySales * 30).toFixed(2)),
    };
  }

  /**
   * Get suggested purchase quantity (Professional Plan)
   */
  async getSuggestedPurchaseQuantity(
    tenantId: string,
    itemId: string,
    daysOfSupply: number = 30,
  ) {
    const item = await this.prisma.item.findFirst({
      where: { id: itemId, tenantId },
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    const currentStock = await this.getCurrentStock(tenantId, itemId);
    const velocity = await this.getSalesVelocity(tenantId, itemId, 30);

    const requiredStock = velocity.averageDailySales * daysOfSupply;
    const suggestedPurchase = Math.max(0, Math.ceil(requiredStock - currentStock));

    return {
      item: {
        id: item.id,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
      },
      currentStock,
      salesVelocity: velocity,
      daysOfSupply,
      requiredStock: parseFloat(requiredStock.toFixed(2)),
      suggestedPurchaseQuantity: suggestedPurchase,
    };
  }
}

