import { IsString, IsOptional, IsBoolean, IsObject, MaxLength, IsArray, IsEmail, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';

export class CreateUserForLocationDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  password: string;

  @IsEnum(UserRole)
  role: UserRole;
}

export class CreateLocationDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(20)
  code: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  pincode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsBoolean()
  isHeadquarters?: boolean;

  @IsOptional()
  @IsBoolean()
  allowStockTransfer?: boolean;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  // User assignments
  @IsOptional()
  @IsString()
  managerId?: string; // Assign existing user as manager

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateUserForLocationDto)
  newManager?: CreateUserForLocationDto; // Create new manager

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cashierIds?: string[]; // Assign existing users as cashiers

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateUserForLocationDto)
  newCashiers?: CreateUserForLocationDto[]; // Create new cashiers
}
