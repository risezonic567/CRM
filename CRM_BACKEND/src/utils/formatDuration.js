/**
 * Format ISO-8601 duration (Duffel: PT3H10M) or pass through human strings.
 * → "3h 10m" / "3h" / "45m"
 */
export function formatDuration(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (!s) return '';

  // Already human-readable (SerpApi / MCP style)
  if (/^\d+h(?:\s+\d+m)?$/.test(s) || /^\d+m$/.test(s)) return s;

  const m = s.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i
  );
  if (!m) return s;

  const days = Number(m[1] || 0);
  const hours = Number(m[2] || 0) + days * 24;
  const mins = Math.round(Number(m[3] || 0));
  if (!hours && !mins) return '';
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}
