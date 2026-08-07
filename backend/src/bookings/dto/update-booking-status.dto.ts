import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateBookingStatusDto {
  @IsIn(['pending', 'confirmed', 'checked_in', 'completed', 'cancelled', 'no_show'])
  status: 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled' | 'no_show';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
