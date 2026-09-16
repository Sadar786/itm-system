export function analyticsQuery({ shopId, startDate, endDate }) {
  if (startDate && endDate && startDate > endDate) {
    throw new Error("Check the sidebar date range: start must be before end.");
  }
  const params = new URLSearchParams({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  if (shopId) params.set("shopId", shopId);
  if (startDate) params.set("startDate", new Date(`${startDate}T00:00:00`).toISOString());
  if (endDate) params.set("endDate", new Date(`${endDate}T23:59:59.999`).toISOString());
  return params;
}
