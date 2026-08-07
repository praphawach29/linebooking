import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class MerchantOnboardingDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  shopName: string;

  @IsString()
  @IsIn(['spa', 'barbershop', 'clinic', 'salon', 'sports', 'other'])
  businessType: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;
}
