import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { 
  CreateTableDto, 
  UpdateTableDto, 
  UpdateTableStatusDto, 
  OccupyTableDto, 
  MoveTableDto,
  BulkPositionUpdateDto
} from './dto';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';

@Controller('tables')
@UseGuards(JwtAuthGuard)
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async findAll(
    @CurrentUser() user: any,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
  ) {
    // If no locationId provided, use user's assigned location
    const targetLocationId = locationId || user.locationId;

    if (!targetLocationId) {
      return {
        success: false,
        message: 'Location ID required',
      };
    }

    const tables = await this.tablesService.findAll(user.tenantId, targetLocationId, status);
    return {
      success: true,
      data: tables,
    };
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getStats(
    @CurrentUser() user: any,
    @Query('locationId') locationId?: string,
  ) {
    const targetLocationId = locationId || user.locationId;

    if (!targetLocationId) {
      return {
        success: false,
        message: 'Location ID required',
      };
    }

    const stats = await this.tablesService.getLocationStats(user.tenantId, targetLocationId);
    return {
      success: true,
      data: stats,
    };
  }

  @Get('available')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getAvailable(
    @CurrentUser() user: any,
    @Query('locationId') locationId?: string,
    @Query('capacity') capacity?: string,
  ) {
    const targetLocationId = locationId || user.locationId;

    if (!targetLocationId) {
      return {
        success: false,
        message: 'Location ID required',
      };
    }

    const tables = await this.tablesService.getAvailableTables(
      user.tenantId,
      targetLocationId,
      capacity ? parseInt(capacity) : undefined,
    );
    return {
      success: true,
      data: tables,
    };
  }

  // ============================================
  // RESERVATION ENDPOINTS - GET (must come before :id route)
  // ============================================

  @Get('reservations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async findAllReservations(
    @CurrentUser() user: any,
    @Query('locationId') locationId?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('tableId') tableId?: string,
    @Query('customerPhone') customerPhone?: string,
  ) {
    const targetLocationId = locationId || user.locationId;

    if (!targetLocationId) {
      return {
        success: false,
        message: 'Location ID required',
      };
    }

    const filters: any = {};
    if (status) filters.status = status;
    if (date) filters.date = date;
    if (tableId) filters.tableId = tableId;
    if (customerPhone) filters.customerPhone = customerPhone;

    const reservations = await this.tablesService.findAllReservations(
      user.tenantId,
      targetLocationId,
      filters,
    );

    return {
      success: true,
      data: reservations,
    };
  }

  @Get('reservations/today')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getTodayReservations(
    @CurrentUser() user: any,
    @Query('locationId') locationId?: string,
  ) {
    const targetLocationId = locationId || user.locationId;

    if (!targetLocationId) {
      return {
        success: false,
        message: 'Location ID required',
      };
    }

    const reservations = await this.tablesService.getTodayReservations(
      user.tenantId,
      targetLocationId,
    );

    return {
      success: true,
      data: reservations,
    };
  }

  @Get('reservations/upcoming')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async getUpcomingReservations(
    @CurrentUser() user: any,
    @Query('locationId') locationId?: string,
    @Query('days') days?: string,
  ) {
    const targetLocationId = locationId || user.locationId;

    if (!targetLocationId) {
      return {
        success: false,
        message: 'Location ID required',
      };
    }

    const daysAhead = days ? parseInt(days) : 7;

    const reservations = await this.tablesService.getUpcomingReservations(
      user.tenantId,
      targetLocationId,
      daysAhead,
    );

    return {
      success: true,
      data: reservations,
    };
  }

  @Get('reservations/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async findOneReservation(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const reservation = await this.tablesService.findOneReservation(user.tenantId, id);
    return {
      success: true,
      data: reservation,
    };
  }

  // ============================================
  // TABLE ENDPOINTS - GET with :id parameter (must come AFTER specific routes)
  // ============================================

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const table = await this.tablesService.findOne(user.tenantId, id);
    return {
      success: true,
      data: table,
    };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async create(@CurrentUser() user: any, @Body() createTableDto: CreateTableDto) {
    const table = await this.tablesService.create(user.tenantId, createTableDto);
    return {
      success: true,
      message: 'Table created successfully',
      data: table,
    };
  }

  // Bulk update positions - MUST come before :id route
  @Patch('bulk-position')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async bulkUpdatePositions(
    @CurrentUser() user: any,
    @Body() bulkUpdateDto: BulkPositionUpdateDto,
  ) {
    const result = await this.tablesService.bulkUpdatePositions(
      user.tenantId,
      bulkUpdateDto,
    );
    return {
      success: true,
      message: `${result.updated} tables updated successfully`,
      data: result,
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateTableDto: UpdateTableDto,
  ) {
    const table = await this.tablesService.update(user.tenantId, id, updateTableDto);
    return {
      success: true,
      message: 'Table updated successfully',
      data: table,
    };
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async updateStatus(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTableStatusDto,
  ) {
    const table = await this.tablesService.updateStatus(user.tenantId, id, updateStatusDto);
    return {
      success: true,
      message: 'Table status updated successfully',
      data: table,
    };
  }

  @Post(':id/occupy')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async occupy(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() occupyDto: OccupyTableDto,
  ) {
    const table = await this.tablesService.occupy(user.tenantId, id, occupyDto);
    return {
      success: true,
      message: 'Table occupied successfully',
      data: table,
    };
  }

  @Post(':id/free')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async free(@CurrentUser() user: any, @Param('id') id: string) {
    const table = await this.tablesService.free(user.tenantId, id);
    return {
      success: true,
      message: 'Table freed successfully',
      data: table,
    };
  }

  @Patch(':id/move')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async move(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() moveDto: MoveTableDto,
  ) {
    const table = await this.tablesService.move(user.tenantId, id, moveDto);
    return {
      success: true,
      message: 'Table moved successfully',
      data: table,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    await this.tablesService.remove(user.tenantId, id);
    return {
      success: true,
      message: 'Table deleted successfully',
    };
  }

  // ============================================
  // RESERVATION ENDPOINTS - POST/PATCH/DELETE
  // ============================================

  @Post('reservations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async createReservation(
    @CurrentUser() user: any,
    @Body() createReservationDto: CreateReservationDto,
  ) {
    const locationId = user.locationId;

    if (!locationId) {
      return {
        success: false,
        message: 'Location ID required',
      };
    }

    const reservation = await this.tablesService.createReservation(
      user.tenantId,
      locationId,
      createReservationDto,
      user.id,
    );

    return {
      success: true,
      message: 'Reservation created successfully',
      data: reservation,
    };
  }

  @Patch('reservations/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async updateReservation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateReservationDto: UpdateReservationDto,
  ) {
    const reservation = await this.tablesService.updateReservation(
      user.tenantId,
      id,
      updateReservationDto,
    );

    return {
      success: true,
      message: 'Reservation updated successfully',
      data: reservation,
    };
  }

  @Patch('reservations/:id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async confirmReservation(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const reservation = await this.tablesService.confirmReservation(user.tenantId, id);
    return {
      success: true,
      message: 'Reservation confirmed successfully',
      data: reservation,
    };
  }

  @Patch('reservations/:id/seated')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async markAsSeated(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    const reservation = await this.tablesService.markAsSeated(user.tenantId, id);
    return {
      success: true,
      message: 'Customer marked as seated',
      data: reservation,
    };
  }

  @Patch('reservations/:id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  async cancelReservation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    const reservation = await this.tablesService.cancelReservation(user.tenantId, id, reason);
    return {
      success: true,
      message: 'Reservation cancelled successfully',
      data: reservation,
    };
  }

  @Delete('reservations/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async removeReservation(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    await this.tablesService.removeReservation(user.tenantId, id);
    return {
      success: true,
      message: 'Reservation deleted successfully',
    };
  }
}
