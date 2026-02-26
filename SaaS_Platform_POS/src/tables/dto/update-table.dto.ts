import { PartialType } from '@nestjs/mapped-types';
import { CreateTableDto } from './create-table.dto';
import { IsOptional, IsEnum } from 'class-validator';

export enum TableStatus {
  FREE = 'FREE',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  BILLED = 'BILLED',
  CLEANING = 'CLEANING',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
}

export class UpdateTableDto extends PartialType(CreateTableDto) {
  @IsEnum(TableStatus)
  @IsOptional()
  status?: TableStatus;
}
