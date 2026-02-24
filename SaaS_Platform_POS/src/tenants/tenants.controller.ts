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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpgradePlanDto, CancelSubscriptionDto } from './dto/subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { getBusinessFeatures, getTenantSettings } from '../common/config/business-config';
import { SubscriptionService } from '../common/services/subscription.service';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new tenant (business)' })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all tenants (OWNER only)' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('config')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant configuration and business features' })
  async getConfig(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const tenant = await this.tenantsService.findOne(tenantId);
    
    if (!tenant) {
      return {
        success: false,
        message: 'Tenant not found',
      };
    }

    const features = getBusinessFeatures(tenant.businessType);
    const settings = getTenantSettings(tenant.businessType, tenant.settings);

    return {
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          businessType: tenant.businessType,
          email: tenant.email,
          phone: tenant.phone,
        },
        features,
        settings,
      },
    };
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant settings' })
  async getSettings(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const tenant = await this.tenantsService.findOne(tenantId);
    
    if (!tenant) {
      return {
        success: false,
        message: 'Tenant not found',
      };
    }

    const settings = getTenantSettings(tenant.businessType, tenant.settings);

    return {
      success: true,
      data: {
        businessType: tenant.businessType,
        settings,
      },
    };
  }

  @Patch('settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant settings (OWNER/MANAGER only)' })
  async updateSettings(@Request() req: any, @Body() updateSettingsDto: UpdateSettingsDto) {
    const tenantId = req.user.tenantId;
    const tenant = await this.tenantsService.findOne(tenantId);
    
    if (!tenant) {
      return {
        success: false,
        message: 'Tenant not found',
      };
    }

    // Merge with existing settings
    const currentSettings = (tenant.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      ...updateSettingsDto,
    };

    await this.tenantsService.updateSettings(tenantId, updatedSettings);

    return {
      success: true,
      data: {
        settings: updatedSettings,
      },
      message: 'Settings updated successfully',
    };
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current tenant (OWNER only)' })
  async updateCurrent(@Request() req: any, @Body() updateTenantDto: UpdateTenantDto) {
    const tenantId = req.user.tenantId;
    const updatedTenant = await this.tenantsService.update(tenantId, updateTenantDto);
    
    return {
      success: true,
      data: updatedTenant,
      message: 'Tenant updated successfully',
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant by ID' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tenant (OWNER only)' })
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete tenant (OWNER only)' })
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle tenant active status (OWNER only)' })
  async toggleStatus(@Param('id') id: string) {
    return this.tenantsService.toggleStatus(id);
  }

  // ==========================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================

  @Get('subscription/info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current subscription information' })
  async getSubscriptionInfo(@Request() req: any) {
    const tenant = await this.tenantsService.findOne(req.user.tenantId);
    return this.subscriptionService.getSubscriptionInfo({
      subscriptionPlan: tenant.subscriptionPlan,
      subscriptionStatus: tenant.subscriptionStatus,
      trialStartDate: tenant.trialStartDate ?? undefined,
      trialEndDate: tenant.trialEndDate ?? undefined,
      subscriptionStartDate: tenant.subscriptionStartDate ?? undefined,
      subscriptionEndDate: tenant.subscriptionEndDate ?? undefined,
    });
  }

  @Get('subscription/plans')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all available subscription plans' })
  getAvailablePlans() {
    return this.subscriptionService.getAllPlans();
  }

  @Get('subscription/upgrade-suggestions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get upgrade suggestions based on usage' })
  async getUpgradeSuggestions(@Request() req: any) {
    const tenant = await this.tenantsService.findOne(req.user.tenantId);
    const usageStats = tenant.usageStats as any || {};
    
    return this.subscriptionService.getSuggestedUpgrade(
      tenant.subscriptionPlan,
      usageStats,
    );
  }

  @Post('subscription/upgrade')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upgrade subscription plan (OWNER only)' })
  async upgradePlan(@Request() req: any, @Body() dto: UpgradePlanDto) {
    return this.tenantsService.upgradePlan(req.user.tenantId, dto);
  }

  @Post('subscription/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription (OWNER only)' })
  async cancelSubscription(@Request() req: any, @Body() dto: CancelSubscriptionDto) {
    return this.tenantsService.cancelSubscription(req.user.tenantId, dto);
  }

  @Post('subscription/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reactivate cancelled subscription (OWNER only)' })
  async reactivateSubscription(@Request() req: any) {
    return this.tenantsService.reactivateSubscription(req.user.tenantId);
  }
}
