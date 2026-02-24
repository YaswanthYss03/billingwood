import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequireFeature } from '../common/decorators/subscription.decorator';
import { UserRole } from '@prisma/client';
import { CurrentTenant, CurrentUserLocationId } from '../common/decorators/user.decorator';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';

@ApiTags('inventory')
@Controller('inventory')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('batches')
  @ApiOperation({ summary: 'Get all inventory batches' })
  @ApiQuery({ name: 'itemId', required: false })
  @ApiQuery({ name: 'locationId', required: false })
  getBatches(
    @CurrentTenant() tenantId: string,
    @Query('itemId') itemId?: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.inventoryService.getBatches(tenantId, itemId, locationId);
  }

  @Get('batches/:id')
  @ApiOperation({ summary: 'Get batch by ID' })
  getBatch(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.inventoryService.getBatch(tenantId, id);
  }

  @Get('stock/:itemId')
  @ApiOperation({ summary: 'Get current stock for an item' })
  @ApiQuery({ name: 'locationId', required: false })
  getCurrentStock(
    @CurrentTenant() tenantId: string,
    @Param('itemId') itemId: string,
    @Query('locationId') locationId?: string,
  ) {
    return this.inventoryService.getCurrentStock(tenantId, itemId, locationId);
  }

  @Get('valuation')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get inventory valuation' })
  getValuation(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getInventoryValuation(tenantId);
  }

  @Get('low-stock')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Get low stock items' })
  @ApiQuery({ name: 'threshold', required: false })
  getLowStock(
    @CurrentTenant() tenantId: string,
    @Query('threshold') threshold?: string,
  ) {
    const thresholdNum = threshold ? parseInt(threshold) : 10;
    return this.inventoryService.getLowStockItems(tenantId, thresholdNum);
  }

  @Post('adjust')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Manual inventory adjustment' })
  adjustInventory(
    @CurrentTenant() tenantId: string,
    @Body() adjustInventoryDto: AdjustInventoryDto,
  ) {
    return this.inventoryService.adjustInventory(
      tenantId,
      adjustInventoryDto.batchId,
      adjustInventoryDto.newQuantity,
      adjustInventoryDto.reason,
    );
  }

  // Professional Plan Features - Smart Reordering
  @Get('reorder-alerts')
  @UseGuards(RolesGuard, SubscriptionGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @RequireFeature('smartReordering')
  @ApiOperation({ summary: 'Get reorder alerts (Professional Plan)' })
  getReorderAlerts(@CurrentTenant() tenantId: string) {
    return this.inventoryService.getReorderAlerts(tenantId);
  }

  @Get('sales-velocity/:itemId')
  @UseGuards(RolesGuard, SubscriptionGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @RequireFeature('smartReordering')
  @ApiOperation({ summary: 'Get sales velocity for an item (Professional Plan)' })
  @ApiQuery({ name: 'days', required: false })
  getSalesVelocity(
    @CurrentTenant() tenantId: string,
    @Param('itemId') itemId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = days ? parseInt(days) : 30;
    return this.inventoryService.getSalesVelocity(tenantId, itemId, daysNum);
  }

  @Get('suggested-purchase/:itemId')
  @UseGuards(RolesGuard, SubscriptionGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @RequireFeature('smartReordering')
  @ApiOperation({ summary: 'Get suggested purchase quantity (Professional Plan)' })
  @ApiQuery({ name: 'daysOfSupply', required: false })
  getSuggestedPurchase(
    @CurrentTenant() tenantId: string,
    @Param('itemId') itemId: string,
    @Query('daysOfSupply') daysOfSupply?: string,
  ) {
    const days = daysOfSupply ? parseInt(daysOfSupply) : 30;
    return this.inventoryService.getSuggestedPurchaseQuantity(tenantId, itemId, days);
  }
}
