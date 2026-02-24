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
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { RequireFeature } from '../common/decorators/subscription.decorator';
import { AuthenticatedRequest } from '../types/express-types';

@Controller('recipes')
@UseGuards(JwtAuthGuard, SubscriptionGuard)
@RequireFeature('recipeManagement') // Professional Plan feature
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  create(
    @Request() req: AuthenticatedRequest,
    @Body() createRecipeDto: CreateRecipeDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.recipesService.create(tenantId, createRecipeDto);
  }

  @Get()
  findAll(@Request() req: AuthenticatedRequest) {
    const tenantId = req.user.tenantId;
    return this.recipesService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.recipesService.findOne(tenantId, id);
  }

  @Get(':id/cost')
  getRecipeCost(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.recipesService.calculateRecipeCost(tenantId, id);
  }

  @Get('finished-good/:finishedGoodId')
  findByFinishedGood(
    @Request() req: AuthenticatedRequest,
    @Param('finishedGoodId') finishedGoodId: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.recipesService.findByFinishedGood(tenantId, finishedGoodId);
  }

  @Get('finished-good/:finishedGoodId/check-availability')
  checkIngredientAvailability(
    @Request() req: AuthenticatedRequest,
    @Param('finishedGoodId') finishedGoodId: string,
    @Query('quantity') quantity: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.recipesService.checkIngredientAvailability(
      tenantId,
      finishedGoodId,
      parseInt(quantity) || 1,
    );
  }

  @Patch(':id')
  update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() updateRecipeDto: UpdateRecipeDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.recipesService.update(tenantId, id, updateRecipeDto);
  }

  @Delete(':id')
  remove(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    const tenantId = req.user.tenantId;
    return this.recipesService.remove(tenantId, id);
  }
}
