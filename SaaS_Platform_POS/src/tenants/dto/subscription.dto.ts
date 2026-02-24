import { IsEnum, IsString, IsOptional } from 'class-validator';
import { SubscriptionPlan } from '../../common/constants/subscription-plans';

export class UpgradePlanDto {
  @IsEnum(SubscriptionPlan)
  targetPlan: SubscriptionPlan;

  @IsString()
  billingCycle: 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  paymentId?: string;
}

export class CancelSubscriptionDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}
