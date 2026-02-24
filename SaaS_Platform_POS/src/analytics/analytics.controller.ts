import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthenticatedRequest } from '../types/express-types';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequireFeature } from '../common/decorators/subscription.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('revenue-trends')
  @RequireFeature('advancedAnalytics')
  async getRevenueTrends(
    @Request() req: AuthenticatedRequest,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
  ) {
    const tenantId = req.user.tenantId;
    return this.analyticsService.getRevenueTrends(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      groupBy || 'day',
    );
  }

  @Get('profit-margin')
  @RequireFeature('profitMarginAnalysis')
  async getProfitMarginAnalysis(
    @Request() req: AuthenticatedRequest,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.analyticsService.getProfitMarginAnalysis(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('item-profit')
  @RequireFeature('profitMarginAnalysis')
  async getItemProfitAnalysis(
    @Request() req: AuthenticatedRequest,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.analyticsService.getItemProfitAnalysis(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('peak-hours')
  @RequireFeature('advancedAnalytics')
  async getPeakHoursAnalysis(
    @Request() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.analyticsService.getPeakHoursAnalysis(
      tenantId,
      days ? parseInt(days) : 30,
    );
  }

  @Get('customer-retention')
  @RequireFeature('customerInsights')
  async getCustomerRetentionAnalysis(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.analyticsService.getCustomerRetentionAnalysis(tenantId);
  }

  @Get('category-performance')
  @RequireFeature('advancedAnalytics')
  async getCategoryPerformance(
    @Request() req: AuthenticatedRequest,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.analyticsService.getCategoryPerformance(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('comparative-reports')
  @RequireFeature('advancedAnalytics')
  async getComparativeReports(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.analyticsService.getComparativeReports(tenantId);
  }

  @Get('dead-stock')
  @RequireFeature('advancedAnalytics')
  async getDeadStockAnalysis(
    @Request() req: AuthenticatedRequest,
    @Query('daysThreshold') daysThreshold?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.analyticsService.getDeadStockAnalysis(
      tenantId,
      daysThreshold ? parseInt(daysThreshold) : 30,
    );
  }

  @Get('abc-analysis')
  @RequireFeature('advancedAnalytics')
  async getABCAnalysis(
    @Request() req: AuthenticatedRequest,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.analyticsService.getABCAnalysis(
      tenantId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('seasonal-trends')
  @RequireFeature('advancedAnalytics')
  async getSeasonalTrends(
    @Request() req: AuthenticatedRequest,
    @Query('yearsBack') yearsBack?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.analyticsService.getSeasonalTrends(
      tenantId,
      yearsBack ? parseInt(yearsBack) : 2,
    );
  }
}
