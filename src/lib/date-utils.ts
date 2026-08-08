/**
 * Formats a Date as a local YYYY-MM-DD string using the browser's own
 * timezone-aware getters (getFullYear/getMonth/getDate).
 *
 * `date.toISOString().split('T')[0]` looks equivalent but is NOT — it
 * converts to UTC first, so during early-morning hours in timezones ahead
 * of UTC (e.g. Asia/Bangkok, UTC+7, between local 00:00–06:59) it silently
 * returns the PREVIOUS calendar day. In a booking app this causes date
 * pickers to query/report the wrong day without any visible error.
 */
export function toLocalDateStr(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
