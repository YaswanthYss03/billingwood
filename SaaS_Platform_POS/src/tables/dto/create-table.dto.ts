import { IsString, IsInt, IsOptional, IsBoolean, IsEnum, Min, Max } from 'class-validator';

export class CreateTableDto {
  @IsString()
  locationId: string;

  @IsString()
  tableNumber: string;

  @IsString()
  @IsOptional()
  tableName?: string;

  @IsInt()
  @Min(1)
  @Max(50)
  capacity: number = 4;

  @IsString()
  @IsOptional()
  section?: string;

  @IsString()
  @IsOptional()
  floor?: string;

  @IsInt()
  @IsOptional()
  positionX?: number;

  @IsInt()
  @IsOptional()
  positionY?: number;

  @IsString()
  @IsOptional()
  layoutZone?: string;

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

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;
}
