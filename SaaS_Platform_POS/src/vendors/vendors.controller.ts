import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { UpdateVendorDto } from './dto/update-vendor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequireFeature } from '../common/decorators/subscription.decorator';
import { AuthenticatedRequest } from '../types/express-types';

@Controller('vendors')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequireFeature('vendorManagement') // Professional Plan feature
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createVendorDto: CreateVendorDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.vendorsService.create(tenantId, createVendorDto);
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('includeInactive') includeInactive?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.vendorsService.findAll(tenantId, includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.vendorsService.findOne(tenantId, id);
  }

  @Get(':id/stats')
  getStats(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.vendorsService.getVendorStats(tenantId, id);
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateVendorDto: UpdateVendorDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.vendorsService.update(tenantId, id, updateVendorDto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.vendorsService.toggleActive(tenantId, id);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.vendorsService.remove(tenantId, id);
  }
}
