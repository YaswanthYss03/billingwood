import { IsString, IsEnum, IsOptional, IsNumber, IsArray, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { TableStatus } from './update-table.dto';
import { Type } from 'class-transformer';

export class UpdateTableStatusDto {
  @IsEnum(TableStatus)
  status: TableStatus;

  @IsString()
  @IsOptional()
  kotId?: string;
}

export class OccupyTableDto {
  @IsString()
  kotId: string;
}

export class MoveTableDto {
  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsString()
  @IsOptional()
  layoutZone?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  positionX?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  positionY?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(360)
  rotation?: number;

  @IsInt()
  @IsOptional()
  @Min(40)
  @Max(500)
  width?: number;

  @IsInt()
  @IsOptional()
  @Min(40)
  @Max(500)
  height?: number;

  @IsString()
  @IsOptional()
  shape?: string;
}

export class TablePositionUpdate {
  @IsString()
  id: string;

  @IsNumber()
  @Min(0)
  positionX: number;

  @IsNumber()
  @Min(0)
  positionY: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(360)
  rotation?: number;
}

export class BulkPositionUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TablePositionUpdate)
  updates: TablePositionUpdate[];
}

