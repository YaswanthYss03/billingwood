import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/services/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class IngredientsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: { name: string; unit: string }) {
    const ingredient = await this.prisma.ingredient.create({
      data: {
        tenantId,
        name: data.name,
        unit: data.unit,
        quantity: new Decimal(0),
      },
    });

    return ingredient;
  }

  async findAll(tenantId: string) {
    const ingredients = await this.prisma.ingredient.findMany({
      where: {
        tenantId,
        deletedAt: null,
      },
      include: {
        recipeIngredients: {
          include: {
            recipe: {
              include: {
                finishedGood: {
                  select: {
                    id: true,
                    name: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return ingredients;
  }

  async findOne(tenantId: string, id: string) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!ingredient) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }

    return ingredient;
  }

  async update(tenantId: string, id: string, data: { name?: string; unit?: string }) {
    await this.findOne(tenantId, id); // Ensure exists

    const ingredient = await this.prisma.ingredient.update({
      where: { id },
      data,
    });

    return ingredient;
  }

  async updateQuantity(tenantId: string, id: string, quantity: number, isIncrement: boolean = true) {
    await this.findOne(tenantId, id); // Ensure exists

    const updateData = isIncrement
      ? { quantity: { increment: new Decimal(quantity) } }
      : { quantity: new Decimal(quantity) };

    const ingredient = await this.prisma.ingredient.update({
      where: { id },
      data: updateData,
    });

    return ingredient;
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id); // Ensure exists

    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return updated;
  }

  async toggleStatus(tenantId: string, id: string) {
    const ingredient = await this.findOne(tenantId, id);

    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: { isActive: !ingredient.isActive },
    });

    return updated;
  }
}
