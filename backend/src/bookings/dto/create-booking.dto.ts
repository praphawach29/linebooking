import { IsNotEmpty, IsString, IsDateString, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  service_id: string;

  @IsOptional()
  @IsString()
  staff_id?: string;

  @IsNotEmpty()
  @IsDateString()
  booking_date: string; // ISO 8601 YYYY-MM-DD

  @IsNotEmpty()
  @IsString()
  start_time: string; // HH:mm

  @IsNotEmpty()
  @IsString()
  end_time: string; // HH:mm

  @IsOptional()
  @IsString()
  customer_note?: string;
}
