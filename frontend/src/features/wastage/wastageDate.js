// Use the same business calendar as the API, regardless of the device timezone.
const businessDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dubai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function getWastageDateRange(now = new Date()) {
  const parts = Object.fromEntries(businessDate.formatToParts(now).map(({ type, value }) => [type, value]));
  const maxDate = `${parts.year}-${parts.month}-${parts.day}`;
  const earliest = new Date(`${maxDate}T00:00:00Z`);
  earliest.setUTCDate(earliest.getUTCDate() - 3);
  return { minDate: earliest.toISOString().slice(0, 10), maxDate };
}

export function isAllowedWastageDate(value, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return false;
  const { minDate, maxDate } = getWastageDateRange(now);
  return value >= minDate && value <= maxDate;
}
