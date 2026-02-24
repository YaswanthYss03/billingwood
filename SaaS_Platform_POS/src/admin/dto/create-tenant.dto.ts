import { IsString, IsEmail, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTenantDto {
  @ApiProperty({ example: 'Pavaki Restaurant' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'RESTAURANT', enum: ['HOTEL', 'RESTAURANT', 'RETAIL'] })
  @IsEnum(['HOTEL', 'RESTAURANT', 'RETAIL'])
  businessType: string;

  @ApiPropertyOptional({ example: '29AABCU9603R1ZM' })
  @IsOptional()
  @IsString()
  gstNumber?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Chennai' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+91 9876543210' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@pavaki.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  // Owner user details
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  ownerName: string;

  @ApiProperty({ example: 'john@pavaki.com' })
  @IsEmail()
  ownerEmail: string;

  @ApiProperty({ example: 'johndoe' })
  @IsString()
  ownerUsername: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  ownerPassword: string;

  @ApiPropertyOptional({ example: '+91 9876543210' })
  @IsOptional()
  @IsString()
  ownerPhone?: string;
}
