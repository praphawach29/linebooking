import { IsOptional, IsNotEmpty } from 'class-validator';
import { IsRealDateString } from '../../common/validators/is-real-date-string.validator';
import { IsLooseUuid } from '../../common/validators/is-loose-uuid.validator';

export class GetAvailableSlotsQueryDto {
  @IsNotEmpty({ message: 'serviceId is required' })
  @IsLooseUuid({ message: 'serviceId must be a valid UUID' })
  serviceId: string;

  @IsNotEmpty({ message: 'bookingDate is required' })
  @IsRealDateString({
    message: 'bookingDate must be a valid real date in YYYY-MM-DD format',
  })
  bookingDate: string; // YYYY-MM-DD

  @IsOptional()
  @IsLooseUuid({ message: 'staffId must be a valid UUID' })
  staffId?: string;

  @IsOptional()
  @IsLooseUuid({ message: 'courtId must be a valid UUID' })
  courtId?: string;
}
