import { PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateReservationDto } from './create-reservation.dto';

export class UpdateReservationDto extends PartialType(CreateReservationDto) {
  @ApiPropertyOptional({ 
    enum: ['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'],
    description: 'Reservation status' 
  })
  @IsEnum(['PENDING', 'CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW', 'COMPLETED'])
  @IsOptional()
  status?: 'PENDING' | 'CONFIRMED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';

  @ApiPropertyOptional({ example: 'Customer requested cancellation', description: 'Reason for cancellation' })
  @IsString()
  @IsOptional()
  cancellationReason?: string;
}
