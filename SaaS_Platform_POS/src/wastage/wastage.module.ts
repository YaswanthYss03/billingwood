import { Module } from '@nestjs/common';
import { WastageService } from './wastage.service';
import { WastageController } from './wastage.controller';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [WastageController],
  providers: [WastageService],
  exports: [WastageService],
})
export class WastageModule {}
