import { IsString, IsNumber, IsEnum, IsOptional, IsUUID, Min } from 'class-validator';
import { WastageReason } from '@prisma/client';

export class CreateWastageLogDto {
  @IsUUID()
  itemId: string;

  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;

  @IsEnum(WastageReason)
  reason: WastageReason;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  estimatedValue: number;
}
