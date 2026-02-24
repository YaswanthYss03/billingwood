import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { AdminService } from './admin.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Guard to check if user is super admin
   */
  private checkSuperAdmin(user: any) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Access denied. Super admin only.');
    }
  }

  /**
   * Get all tenants
   */
  @Get('tenants')
  async getAllTenants(@CurrentUser() user: any) {
    this.checkSuperAdmin(user);
    const tenants = await this.adminService.getAllTenants();
    return {
      success: true,
      data: tenants,
      message: 'Tenants retrieved successfully',
    };
  }

  /**
   * Create new tenant with owner user
   */
  @Post('tenants')
  async createTenant(
    @CurrentUser() user: any,
    @Body() createTenantDto: CreateTenantDto,
  ) {
    this.checkSuperAdmin(user);
    
    try {
      const result = await this.adminService.createTenant(createTenantDto);
      return {
        success: true,
        data: {
          tenant: result.tenant,
          owner: {
            id: result.owner.id,
            name: result.owner.name,
            email: result.owner.email,
            username: result.owner.username,
          },
        },
        message: 'Tenant and owner user created successfully',
      };
    } catch (error) {
      throw new ForbiddenException(error.message || 'Failed to create tenant');
    }
  }

  /**
   * Get platform statistics
   */
  @Get('stats')
  async getPlatformStats(@CurrentUser() user: any) {
    this.checkSuperAdmin(user);
    const stats = await this.adminService.getPlatformStats();
    return {
      success: true,
      data: stats,
      message: 'Statistics retrieved successfully',
    };
  }

  /**
   * Get tenant details
   */
  @Get('tenants/:id')
  async getTenantDetails(
    @CurrentUser() user: any,
    @Param('id') tenantId: string,
  ) {
    this.checkSuperAdmin(user);
    const tenant = await this.adminService.getTenantDetails(tenantId);
    return {
      success: true,
      data: tenant,
      message: 'Tenant details retrieved successfully',
    };
  }

  /**
   * Update tenant subscription
   */
  @Patch('tenants/:id/subscription')
  async updateTenantSubscription(
    @CurrentUser() user: any,
    @Param('id') tenantId: string,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    this.checkSuperAdmin(user);

    const data: any = {};
    if (updateDto.subscriptionPlan) data.subscriptionPlan = updateDto.subscriptionPlan;
    if (updateDto.subscriptionStatus) data.subscriptionStatus = updateDto.subscriptionStatus;
    if (updateDto.billingCycle) data.billingCycle = updateDto.billingCycle;
    if (updateDto.subscriptionStartDate) data.subscriptionStartDate = new Date(updateDto.subscriptionStartDate);
    if (updateDto.subscriptionEndDate) data.subscriptionEndDate = new Date(updateDto.subscriptionEndDate);
    if (updateDto.trialEndDate) data.trialEndDate = new Date(updateDto.trialEndDate);

    const tenant = await this.adminService.updateTenantSubscription(
      tenantId,
      data,
    );

    return {
      success: true,
      data: tenant,
      message: 'Subscription updated successfully',
    };
  }

  /**
   * Toggle tenant active status
   */
  @Patch('tenants/:id/toggle-status')
  async toggleTenantStatus(
    @CurrentUser() user: any,
    @Param('id') tenantId: string,
  ) {
    this.checkSuperAdmin(user);
    const tenant = await this.adminService.toggleTenantStatus(tenantId);
    return {
      success: true,
      data: tenant,
      message: `Tenant ${tenant.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }
}
