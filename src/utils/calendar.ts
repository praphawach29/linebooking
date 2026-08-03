export interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
}

const formatDateForCalendar = (date: Date): string => {
  return date.toISOString().replace(/-|:|\.\d+/g, '');
};

export const generateGoogleCalendarUrl = (event: CalendarEvent): string => {
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.append('action', 'TEMPLATE');
  url.searchParams.append('text', event.title);
  url.searchParams.append('details', event.description);
  url.searchParams.append('location', event.location);
  url.searchParams.append(
    'dates',
    `${formatDateForCalendar(event.startDate)}/${formatDateForCalendar(event.endDate)}`
  );
  return url.toString();
};

export const generateICSFile = (event: CalendarEvent): string => {
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LINE OA Booking SaaS//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTART:${formatDateForCalendar(event.startDate)}`,
    `DTEND:${formatDateForCalendar(event.endDate)}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}`,
    `LOCATION:${event.location}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  return `data:text/calendar;charset=utf-8,${encodeURIComponent(icsContent)}`;
};
