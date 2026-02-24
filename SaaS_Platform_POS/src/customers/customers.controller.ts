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
import { CustomersService } from './customers.service';
import { CreateCustomerDto, CustomerTier } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { EarnPointsDto, RedeemPointsDto, AdjustPointsDto } from './dto/loyalty.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequireFeature } from '../common/decorators/subscription.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ==========================================
  // CUSTOMER MANAGEMENT
  // ==========================================

  @Post()
  @RequireFeature('customerDatabase')
  async create(@Request() req: AuthenticatedRequest, @Body() dto: CreateCustomerDto) {
    const tenantId = req.user.tenantId;
    return this.customersService.create(tenantId, dto);
  }

  @Get()
  @RequireFeature('customerDatabase')
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('search') search?: string,
    @Query('tier') tier?: CustomerTier,
    @Query('tags') tags?: string,
    @Query('includeInactive') includeInactive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.customersService.findAll(tenantId, {
      search,
      tier,
      tags: tags ? tags.split(',') : undefined,
      includeInactive: includeInactive === 'true',
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('insights')
  @RequireFeature('customerInsights')
  async getInsights(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.customersService.getCustomerInsights(tenantId);
  }

  @Get('birthdays')
  @RequireFeature('birthdayRewards')
  async getBirthdayCustomers(
    @Request() req: AuthenticatedRequest,
    @Query('daysAhead') daysAhead?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.customersService.getBirthdayCustomers(
      tenantId,
      daysAhead ? parseInt(daysAhead) : 7,
    );
  }

  @Get('phone/:phone')
  @RequireFeature('customerDatabase')
  async findByPhone(@Request() req: AuthenticatedRequest, @Param('phone') phone: string) {
    const tenantId = req.user.tenantId;
    return this.customersService.findByPhone(tenantId, phone);
  }

  @Get(':id')
  @RequireFeature('customerDatabase')
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.customersService.findOne(tenantId, id);
  }

  @Put(':id')
  @RequireFeature('customerDatabase')
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.customersService.update(tenantId, id, dto);
  }

  @Delete(':id')
  @RequireFeature('customerDatabase')
  async remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.customersService.remove(tenantId, id);
  }

  // ==========================================
  // LOYALTY PROGRAM
  // ==========================================

  @Post('loyalty/earn')
  @RequireFeature('loyaltyProgram')
  async earnPoints(@Request() req: AuthenticatedRequest, @Body() dto: EarnPointsDto) {
    const tenantId = req.user.tenantId;
    return this.customersService.earnPoints(tenantId, dto);
  }

  @Post('loyalty/redeem')
  @RequireFeature('loyaltyProgram')
  async redeemPoints(@Request() req: AuthenticatedRequest, @Body() dto: RedeemPointsDto) {
    const tenantId = req.user.tenantId;
    return this.customersService.redeemPoints(tenantId, dto);
  }

  @Post('loyalty/adjust')
  @RequireFeature('loyaltyProgram')
  async adjustPoints(@Request() req: AuthenticatedRequest, @Body() dto: AdjustPointsDto) {
    const tenantId = req.user.tenantId;
    return this.customersService.adjustPoints(tenantId, dto);
  }

  @Get(':id/loyalty/transactions')
  @RequireFeature('loyaltyProgram')
  async getLoyaltyTransactions(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.customersService.getLoyaltyTransactions(tenantId, id);
  }
}
