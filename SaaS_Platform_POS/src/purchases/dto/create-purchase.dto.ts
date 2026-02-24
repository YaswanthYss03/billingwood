import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  Min,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PurchaseItemDto {
  @ApiPropertyOptional({ example: 'uuid-of-item', description: 'For finished goods' })
  @IsOptional()
  @IsUUID()
  itemId?: string;

  @ApiPropertyOptional({ example: 'uuid-of-ingredient', description: 'For raw materials' })
  @IsOptional()
  @IsUUID()
  ingredientId?: string;

  @ApiProperty({ example: 100 })
  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity: number;

  @ApiProperty({ example: 50.00 })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice: number;
}

export class CreatePurchaseDto {
  @ApiPropertyOptional({ example: 'uuid-of-vendor', description: 'Professional Plan: Link to vendor' })
  @IsOptional()
  @IsUUID()
  vendorId?: string;

  @ApiPropertyOptional({ example: 'ABC Suppliers' })
  @IsOptional()
  @IsString()
  supplierName?: string;

  @ApiPropertyOptional({ example: 'INV-2024-001' })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({ example: '2024-02-14T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  purchaseDate?: Date;

  @ApiPropertyOptional({ example: '2024-02-20T10:00:00Z', description: 'Professional Plan: Expected delivery date' })
  @IsOptional()
  @IsDateString()
  expectedDate?: Date;

  @ApiPropertyOptional({ example: 'Bulk order for inventory replenishment' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];
}
