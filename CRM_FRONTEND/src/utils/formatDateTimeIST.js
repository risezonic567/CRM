/**
 * CRM event timestamps — always Asia/Kolkata, 24-hour clock, "IST" suffix.
 * Example: "17 Oct, 15:55 IST"
 */
export function formatDateTimeIST(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  const formatted = d.toLocaleString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${formatted} IST`;
}

/**
 * Same as formatDateTimeIST but includes year (detail pages).
 * Example: "17 Oct 2026, 15:55 IST"
 */
export function formatDateTimeISTWithYear(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';

  const formatted = d.toLocaleString('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${formatted} IST`;
}

export default formatDateTimeIST;
