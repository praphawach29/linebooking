import {
  IsString,
  IsOptional,
  Matches,
  MinLength,
  MaxLength,
} from 'class-validator';
import { IsRealDateString } from '../../common/validators/is-real-date-string.validator';
import { IsLooseUuid } from '../../common/validators/is-loose-uuid.validator';

export class CreateMerchantBookingDto {
  @IsLooseUuid()
  customerId: string;

  @IsLooseUuid()
  serviceId: string;

  @IsOptional()
  @IsLooseUuid()
  staffId?: string;

  @IsRealDateString({
    message: 'bookingDate must be a valid real date in YYYY-MM-DD format',
  })
  bookingDate: string; // YYYY-MM-DD

  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  customerName?: string;

  @IsOptional()
  @IsString()
  @MinLength(9)
  @MaxLength(20)
  @Matches(/^(?:\+66|0)\d{8,9}$/, {
    message:
      'customerPhone must be a valid Thai phone number (e.g. 0812345678 or +66812345678)',
  })
  customerPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
