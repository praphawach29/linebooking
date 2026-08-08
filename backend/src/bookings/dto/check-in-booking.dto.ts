import { IsString, MaxLength, MinLength } from 'class-validator';

export class CheckInBookingDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  code: string;
}
