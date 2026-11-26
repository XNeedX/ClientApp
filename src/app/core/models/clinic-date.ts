const CLINIC_TIME_ZONE = 'Europe/Moscow';
const dayFormatter = new Intl.DateTimeFormat('sv-SE', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const offsetFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: CLINIC_TIME_ZONE,
  timeZoneName: 'longOffset',
});

export function clinicToday(): string {
  return dayFormatter.format(new Date());
}

export function appointmentUtcTime(date: string, time: string): string {
  const local = date + 'T' + time + ':00';
  const offset = offsetFormatter.formatToParts(new Date(local + 'Z'))
    .find((part) => part.type === 'timeZoneName')?.value;
  if (!offset?.startsWith('GMT')) throw new Error('Could not resolve the clinic time zone.');
  return new Date(local + (offset.slice(3) || 'Z')).toISOString();
}
