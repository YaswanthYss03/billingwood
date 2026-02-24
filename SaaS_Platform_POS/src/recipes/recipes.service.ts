import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new recipe/BOM (Professional Plan)
   */
  async create(tenantId: string, createRecipeDto: CreateRecipeDto) {
    // Check if finished good exists
    const finishedGood = await this.prisma.item.findFirst({
      where: {
        id: createRecipeDto.finishedGoodId,
        tenantId,
      },
    });

    if (!finishedGood) {
      throw new NotFoundException('Finished good item not found');
    }

    // Check if all ingredients exist
    const ingredientIds = createRecipeDto.ingredients.map((i) => i.ingredientId);
    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        id: { in: ingredientIds },
        tenantId,
      },
    });

    if (ingredients.length !== ingredientIds.length) {
      throw new BadRequestException('One or more ingredients not found');
    }

    // Create recipe with ingredients in a transaction
    const recipe = await this.prisma.$transaction(async (tx) => {
      // Mark finished good as composite
      await tx.item.update({
        where: { id: createRecipeDto.finishedGoodId },
        data: { isComposite: true },
      });

      // Create recipe
      const newRecipe = await tx.recipe.create({
        data: {
          tenantId,
          finishedGoodId: createRecipeDto.finishedGoodId,
          name: createRecipeDto.name,
          description: createRecipeDto.description,
          yieldQuantity: createRecipeDto.yieldQuantity
            ? new Decimal(createRecipeDto.yieldQuantity)
            : new Decimal(1),
          yieldUnit: createRecipeDto.yieldUnit || 'PCS',
          preparationTime: createRecipeDto.preparationTime,
          ingredients: {
            create: createRecipeDto.ingredients.map((ing) => ({
              ingredientId: ing.ingredientId,
              quantity: new Decimal(ing.quantity),
              unit: ing.unit,
              wastagePercent: ing.wastagePercent
                ? new Decimal(ing.wastagePercent)
                : new Decimal(0),
              notes: ing.notes,
            })),
          },
        },
        include: {
          ingredients: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          finishedGood: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
            },
          },
        },
      });

      return newRecipe;
    });

    return recipe;
  }

  /**
   * Get all recipes for a tenant
   */
  async findAll(tenantId: string) {
    const recipes = await this.prisma.recipe.findMany({
      where: { tenantId },
      include: {
        finishedGood: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
          },
        },
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return recipes;
  }

  /**
   * Get a single recipe by ID
   */
  async findOne(tenantId: string, id: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        finishedGood: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
          },
        },
        ingredients: {
          include: {
            ingredient: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return recipe;
  }

  /**
   * Get recipe by finished good ID
   */
  async findByFinishedGood(tenantId: string, finishedGoodId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: {
        finishedGoodId,
        tenantId,
        isActive: true,
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    return recipe;
  }

  /**
   * Update a recipe
   */
  async update(tenantId: string, id: string, updateRecipeDto: UpdateRecipeDto) {
    // Check if recipe exists
    await this.findOne(tenantId, id);

    const recipe = await this.prisma.$transaction(async (tx) => {
      // If ingredients are updated, delete old ones and create new ones
      if (updateRecipeDto.ingredients) {
        // Check if all ingredients exist
        const ingredientIds = updateRecipeDto.ingredients.map((i) => i.ingredientId);
        const ingredients = await tx.ingredient.findMany({
          where: {
            id: { in: ingredientIds },
            tenantId,
          },
        });

        if (ingredients.length !== ingredientIds.length) {
          throw new BadRequestException('One or more ingredients not found');
        }

        // Delete existing ingredients
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: id },
        });

        // Create new ingredients
        await tx.recipeIngredient.createMany({
          data: updateRecipeDto.ingredients.map((ing) => ({
            recipeId: id,
            ingredientId: ing.ingredientId,
            quantity: new Decimal(ing.quantity),
            unit: ing.unit,
            wastagePercent: ing.wastagePercent
              ? new Decimal(ing.wastagePercent)
              : new Decimal(0),
            notes: ing.notes,
          })),
        });
      }

      // Update recipe
      const updateData: any = {};
      if (updateRecipeDto.name) updateData.name = updateRecipeDto.name;
      if (updateRecipeDto.description !== undefined)
        updateData.description = updateRecipeDto.description;
      if (updateRecipeDto.yieldQuantity)
        updateData.yieldQuantity = new Decimal(updateRecipeDto.yieldQuantity);
      if (updateRecipeDto.yieldUnit) updateData.yieldUnit = updateRecipeDto.yieldUnit;
      if (updateRecipeDto.preparationTime !== undefined)
        updateData.preparationTime = updateRecipeDto.preparationTime;
      if (updateRecipeDto.isActive !== undefined)
        updateData.isActive = updateRecipeDto.isActive;

      const updated = await tx.recipe.update({
        where: { id },
        data: updateData,
        include: {
          ingredients: {
            include: {
              ingredient: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          finishedGood: {
            select: {
              id: true,
              name: true,
              sku: true,
              price: true,
            },
          },
        },
      });

      return updated;
    });

    return recipe;
  }

  /**
   * Delete a recipe
   */
  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    await this.prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.findUnique({
        where: { id },
        select: { finishedGoodId: true },
      });

      // Delete recipe (ingredients will be cascade deleted)
      await tx.recipe.delete({
        where: { id },
      });

      // Unmark finished good as composite
      if (recipe) {
        await tx.item.update({
          where: { id: recipe.finishedGoodId },
          data: { isComposite: false },
        });
      }
    });

    return { message: 'Recipe deleted successfully' };
  }

  /**
   * Calculate recipe cost based on current ingredient prices
   * For Professional plan, this provides cost estimation
   * For actual cost tracking, batches would be needed (future enhancement)
   */
  async calculateRecipeCost(tenantId: string, recipeId: string) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id: recipeId, tenantId },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        finishedGood: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${recipeId} not found`);
    }

    let totalCost = new Decimal(0);
    const ingredientCosts: any[] = [];

    for (const ing of recipe.ingredients) {
      const quantity = new Decimal(ing.quantity);
      const wastage = new Decimal(ing.wastagePercent);
      const effectiveQty = quantity.times(new Decimal(1).plus(wastage.dividedBy(100)));
      
      // Get average cost from inventory batches for this ingredient
      const batches = await this.prisma.inventoryBatch.findMany({
        where: {
          tenantId,
          ingredientId: ing.ingredientId,
          currentQuantity: {
            gt: 0,
          },
        },
        orderBy: {
          purchaseDate: 'asc',
        },
      });

      let avgCost = new Decimal(0);
      
      if (batches.length > 0) {
        // Calculate weighted average cost
        let totalQty = new Decimal(0);
        let totalValue = new Decimal(0);
        
        for (const batch of batches) {
          const batchQty = new Decimal(batch.currentQuantity);
          const batchCost = new Decimal(batch.costPrice);
          
          totalQty = totalQty.plus(batchQty);
          totalValue = totalValue.plus(batchQty.times(batchCost));
        }
        
        if (totalQty.greaterThan(0)) {
          avgCost = totalValue.dividedBy(totalQty);
        }
      }
      
      const ingredientCost = avgCost.times(effectiveQty);
      totalCost = totalCost.plus(ingredientCost);

      ingredientCosts.push({
        ingredientId: ing.ingredientId,
        ingredientName: ing.ingredient.name,
        quantity: Number(quantity),
        unit: ing.unit,
        wastagePercent: Number(wastage),
        costPerUnit: Number(avgCost),
        totalCost: Number(ingredientCost),
      });
    }

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      finishedGood: recipe.finishedGood,
      yieldQuantity: Number(recipe.yieldQuantity),
      totalCost: Number(totalCost),
      costPerUnit: Number(totalCost.dividedBy(recipe.yieldQuantity)),
      ingredients: ingredientCosts,
    };
  }

  /**
   * Check if enough ingredients are available to make a recipe
   */
  async checkIngredientAvailability(
    tenantId: string,
    finishedGoodId: string,
    quantity: number,
  ) {
    const recipe = await this.findByFinishedGood(tenantId, finishedGoodId);

    if (!recipe) {
      return {
        available: true,
        message: 'Not a recipe item',
        maxCapacity: null,
      };
    }

    const shortages: any[] = [];
    let maxCapacity = Number.MAX_SAFE_INTEGER;

    for (const ing of recipe.ingredients) {
      const requiredQty = new Decimal(ing.quantity).times(quantity);

      // Get current stock from Ingredient table
      const ingredient = await this.prisma.ingredient.findUnique({
        where: { id: ing.ingredientId },
      });

      const currentStock = ingredient ? new Decimal(ingredient.quantity) : new Decimal(0);
      
      // Calculate max capacity from this ingredient
      if (new Decimal(ing.quantity).greaterThan(0)) {
        const capacityFromThisIng = Math.floor(
          Number(currentStock.dividedBy(new Decimal(ing.quantity)))
        );
        maxCapacity = Math.min(maxCapacity, capacityFromThisIng);
      }

      if (currentStock.lessThan(requiredQty)) {
        shortages.push({
          ingredientId: ing.ingredientId,
          ingredientName: ing.ingredient.name,
          required: Number(requiredQty),
          available: Number(currentStock),
          shortage: Number(requiredQty.minus(currentStock)),
          unit: ing.unit,
        });
      }
    }

    return {
      available: shortages.length === 0,
      maxCapacity: maxCapacity === Number.MAX_SAFE_INTEGER ? 0 : maxCapacity,
      shortages,
    };
  }

  /**
   * Deduct ingredients when dishes are prepared (NOT during billing)
   * This is called when owner adds stock of prepared dishes
   */
  async deductIngredientsForPreparation(
    tenantId: string,
    finishedGoodId: string,
    quantity: number,
    tx: any, // Prisma transaction client
  ) {
    const recipe = await tx.recipe.findFirst({
      where: {
        finishedGoodId,
        tenantId,
        isActive: true,
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!recipe) {
      // Not a recipe item, no deduction needed
      return null;
    }

    const deductions: any[] = [];

    for (const ing of recipe.ingredients) {
      const requiredQty = new Decimal(ing.quantity).times(quantity);

      // Get ingredient current quantity
      const ingredient = await tx.ingredient.findUnique({
        where: { id: ing.ingredientId },
      });

      if (!ingredient) {
        throw new BadRequestException(
          `Ingredient ${ing.ingredient.name} not found`,
        );
      }

      const currentQty = new Decimal(ingredient.quantity);

      if (currentQty.lessThan(requiredQty)) {
        throw new BadRequestException(
          `Insufficient ingredient: ${ing.ingredient.name}. Required: ${Number(requiredQty)}, Available: ${Number(currentQty)}`,
        );
      }

      // Deduct from ingredient quantity
      await tx.ingredient.update({
        where: { id: ing.ingredientId },
        data: {
          quantity: {
            decrement: requiredQty,
          },
        },
      });

      deductions.push({
        ingredientId: ing.ingredientId,
        ingredientName: ing.ingredient.name,
        totalDeducted: Number(requiredQty),
        unit: ing.unit,
      });
    }

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      deductions,
    };
  }
}
