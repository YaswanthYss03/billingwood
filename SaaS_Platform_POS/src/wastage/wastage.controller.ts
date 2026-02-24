import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { WastageService } from './wastage.service';
import { CreateWastageLogDto } from './dto/create-wastage-log.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequireFeature } from '../common/decorators/subscription.decorator';
import { AuthenticatedRequest } from '../types/express-types';

@Controller('wastage')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequireFeature('wastageTracking') // Professional Plan feature
export class WastageController {
  constructor(private readonly wastageService: WastageService) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createWastageLogDto: CreateWastageLogDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id; // Use user.id instead of userId
    return this.wastageService.create(tenantId, userId, createWastageLogDto);
  }

  @Get()
  findAll(
    @Request() req: AuthenticatedRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('reason') reason?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.wastageService.findAll(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
      reason,
    );
  }

  @Get('summary')
  getSummary(
    @Request() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.wastageService.getWastageSummary(
      tenantId,
      days ? parseInt(days) : 30,
    );
  }

  @Get('expiring')
  getExpiringItems(
    @Request() req: AuthenticatedRequest,
    @Query('daysThreshold') daysThreshold?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.wastageService.getExpiringItems(
      tenantId,
      daysThreshold ? parseInt(daysThreshold) : 30,
    );
  }

  @Get('expired')
  getExpiredItems(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.wastageService.getExpiredItems(tenantId);
  }
}
