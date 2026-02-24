import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { CurrentTenant } from '../common/decorators/user.decorator';

@ApiTags('ingredients')
@Controller('ingredients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Create a new ingredient' })
  create(@CurrentTenant() tenantId: string, @Body() data: { name: string; unit: string }) {
    return this.ingredientsService.create(tenantId, data);
  }

  @Get()
  @ApiOperation({ summary: 'Get all ingredients' })
  findAll(@CurrentTenant() tenantId: string) {
    return this.ingredientsService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ingredient by ID' })
  findOne(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.ingredientsService.findOne(tenantId, id);
  }

  @Patch(':id/quantity')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.CASHIER)
  @ApiOperation({ summary: 'Update ingredient quantity' })
  updateQuantity(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() body: { quantity: number; isIncrement?: boolean },
  ) {
    return this.ingredientsService.updateQuantity(tenantId, id, body.quantity, body.isIncrement ?? true);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Update ingredient' })
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body() data: { name?: string; unit?: string },
  ) {
    return this.ingredientsService.update(tenantId, id, data);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Soft delete ingredient' })
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.ingredientsService.remove(tenantId, id);
  }

  @Patch(':id/toggle-status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  @ApiOperation({ summary: 'Toggle ingredient active status' })
  toggleStatus(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.ingredientsService.toggleStatus(tenantId, id);
  }
}
