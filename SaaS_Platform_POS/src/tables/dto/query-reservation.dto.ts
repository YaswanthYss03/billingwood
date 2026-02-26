import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsDateString, IsString } from 'class-validator';

export class QueryReservationDto {
  @ApiPropertyOptional({ 
    enum: ['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'],
    description: 'Filter by status' 
  })
  @IsEnum(['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'])
  @IsOptional()
  status?: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';

  @ApiPropertyOptional({ example: '2026-02-28', description: 'Filter by reservation date (YYYY-MM-DD)' })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiPropertyOptional({ example: 'table123', description: 'Filter by table ID' })
  @IsString()
  @IsOptional()
  tableId?: string;

  @ApiPropertyOptional({ example: '+919876543210', description: 'Filter by customer phone' })
  @IsString()
  @IsOptional()
  customerPhone?: string;
}
