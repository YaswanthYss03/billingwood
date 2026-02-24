import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../types/express-types';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { CreateStockTransferDto, UpdateTransferStatusDto } from './dto/stock-transfer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequireFeature } from '../common/decorators/subscription.decorator';

@Controller('locations')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  // ==========================================
  // LOCATION MANAGEMENT
  // ==========================================

  @Post()
  @RequireFeature('multiLocationManagement')
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateLocationDto) {
    const tenantId = req.user.tenantId;
    return this.locationsService.create(tenantId, dto);
  }

  @Get()
  @RequireFeature('multiLocationManagement')
  async findAll(@Request() req: AuthenticatedRequest, @Query('includeInactive') includeInactive?: string) {
    const tenantId = req.user.tenantId;
    return this.locationsService.findAll(tenantId, includeInactive === 'true');
  }

  @Get('reports')
  @RequireFeature('locationWiseReports')
  async getLocationReport(
    @Request() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.locationsService.getLocationReport(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @RequireFeature('multiLocationManagement')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.locationsService.findOne(tenantId, id);
  }

  @Put(':id')
  @RequireFeature('multiLocationManagement')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.locationsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequireFeature('multiLocationManagement')
  async remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.locationsService.remove(tenantId, id);
  }

  // ==========================================
  // STOCK TRANSFERS
  // ==========================================

  @Post('transfers')
  @RequireFeature('stockTransfers')
  async createStockTransfer(@Request() req: AuthenticatedRequest, @Body() dto: CreateStockTransferDto) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.locationsService.createStockTransfer(tenantId, userId, dto);
  }

  @Get('transfers')
  @RequireFeature('stockTransfers')
  async getStockTransfers(
    @Request() req: AuthenticatedRequest,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.locationsService.getStockTransfers(tenantId, locationId, status);
  }

  @Get('transfers/:id')
  @RequireFeature('stockTransfers')
  async getStockTransfer(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.locationsService.getStockTransfer(tenantId, id);
  }

  @Put('transfers/:id/status')
  @RequireFeature('stockTransfers')
  async updateTransferStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTransferStatusDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.locationsService.updateTransferStatus(tenantId, id, userId, dto);
  }
}
