import { IsString, IsArray, IsEnum, IsOptional, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class TransferItemDto {
  @IsString()
  itemId: string;

  @IsString()
  batchId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export enum TransferStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

export class CreateStockTransferDto {
  @IsString()
  fromLocationId: string;

  @IsString()
  toLocationId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransferItemDto)
  items: TransferItemDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTransferStatusDto {
  @IsEnum(TransferStatus)
  status: TransferStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
