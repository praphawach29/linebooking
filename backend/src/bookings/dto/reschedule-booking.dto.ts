import { IsNotEmpty, Matches } from 'class-validator';
import { IsRealDateString } from '../../common/validators/is-real-date-string.validator';

export class RescheduleBookingDto {
  @IsNotEmpty()
  @IsRealDateString()
  bookingDate: string;

  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime: string;
}
