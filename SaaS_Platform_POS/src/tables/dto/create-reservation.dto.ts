import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, IsOptional, IsDateString, IsEmail, IsArray } from 'class-validator';

export class CreateReservationDto {
  @ApiProperty({ example: 'clk5j4g0w0000qzrmn0zqjzqz', description: 'Table ID' })
  @IsString()
  @IsNotEmpty()
  tableId: string;

  @ApiProperty({ example: 'John Doe', description: 'Customer name' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: '+919876543210', description: 'Customer phone number' })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiPropertyOptional({ example: 'john@example.com', description: 'Customer email' })
  @IsEmail()
  @IsOptional()
  customerEmail?: string;

  @ApiProperty({ example: 4, description: 'Number of people (seats required)' })
  @IsInt()
  @Min(1)
  numberOfPeople: number;

  @ApiProperty({ example: '2026-02-28', description: 'Reservation date (YYYY-MM-DD)' })
  @IsDateString()
  @IsNotEmpty()
  reservationDate: string;

  @ApiProperty({ example: '19:30', description: 'Reservation time (HH:mm)' })
  @IsString()
  @IsNotEmpty()
  reservationTime: string;

  @ApiPropertyOptional({ example: 120, description: 'Duration in minutes (default: 120)' })
  @IsInt()
  @IsOptional()
  @Min(30)
  duration?: number;

  @ApiPropertyOptional({ example: 'Birthday celebration, need cake setup', description: 'Special requirements or arrangements' })
  @IsString()
  @IsOptional()
  specialRequirements?: string;

  @ApiPropertyOptional({ 
    example: [{ itemId: 'item123', name: 'Pasta', quantity: 2, price: 15.99 }], 
    description: 'Pre-order items (optional)' 
  })
  @IsArray()
  @IsOptional()
  preOrderItems?: any[];

  @ApiPropertyOptional({ example: 'Please prepare items 15 minutes before arrival', description: 'Notes for pre-order' })
  @IsString()
  @IsOptional()
  preOrderNotes?: string;

  @ApiPropertyOptional({ example: 'Customer prefers window seat', description: 'Additional notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
