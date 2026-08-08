import { buildBookingFlexMessage } from './line-flex.templates';

describe('buildBookingFlexMessage', () => {
  it('keeps database time-only values as booking wall-clock times', () => {
    const message = buildBookingFlexMessage(
      'booking_confirmed',
      {
        ref_no: 'BK-TEST',
        service_name: 'Court rental',
        court_name: 'Court 1',
        bookingDate: new Date('2026-08-09T00:00:00.000Z'),
        startTime: new Date('1970-01-01T21:00:00.000Z'),
        endTime: new Date('1970-01-01T23:00:00.000Z'),
        finalPrice: 2400,
      },
      'JackSports',
    );

    const serialized = JSON.stringify(message);
    expect(serialized).toContain('21:00 - 23:00');
    expect(serialized).not.toContain('04:00 - 06:00');
  });

  it('builds a checked-in confirmation message', () => {
    const message = buildBookingFlexMessage(
      'booking_checked_in',
      {
        ref_no: 'BK-CHECKED-IN',
        service_name: 'Court rental',
        court_name: 'Court 1',
        bookingDate: new Date('2026-08-09T00:00:00.000Z'),
        startTime: new Date('1970-01-01T21:00:00.000Z'),
        endTime: new Date('1970-01-01T23:00:00.000Z'),
        finalPrice: 2400,
      },
      'JackSports',
    );

    expect(JSON.stringify(message)).toContain('เช็กอินเรียบร้อยแล้ว');
  });
});
