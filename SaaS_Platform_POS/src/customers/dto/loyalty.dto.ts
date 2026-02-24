import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class EarnPointsDto {
  @IsString()
  customerId: string;

  @IsInt()
  @Min(1)
  points: number;

  @IsString()
  billId: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class RedeemPointsDto {
  @IsString()
  customerId: string;

  @IsInt()
  @Min(1)
  points: number;

  @IsOptional()
  @IsString()
  billId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AdjustPointsDto {
  @IsString()
  customerId: string;

  @IsInt()
  points: number; // Can be positive or negative

  @IsString()
  description: string;
}
