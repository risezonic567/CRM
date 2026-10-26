/**
 * Dashboard date presets → { from, to } as YYYY-MM-DD (IST calendar days).
 * Backend expands date-only into IST day bounds.
 */

const TZ = 'Asia/Kolkata';

/** CRM go-live (IST) — All time dashboard starts here. */
export const DASHBOARD_GO_LIVE = '2026-10-01';

export const DASHBOARD_PRESETS = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'custom', label: 'Custom' },
];

/** Current calendar date in IST as YYYY-MM-DD */
export function istTodayKey(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

function addDaysIST(yyyyMmDd, deltaDays) {
  const base = new Date(`${yyyyMmDd}T12:00:00+05:30`);
  base.setTime(base.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return istTodayKey(base);
}

function startOfMonthIST(yyyyMmDd) {
  return `${yyyyMmDd.slice(0, 7)}-01`;
}

function formatRangeLabel(from, to, preset) {
  if (preset === 'all') return 'All time';
  if (preset === 'today') return 'Today';
  if (preset === 'weekly') return 'Last 7 days';
  if (preset === 'monthly') {
    const d = new Date(`${from}T12:00:00+05:30`);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      month: 'long',
      year: 'numeric',
    }).format(d);
  }
  if (from === to) return from;
  return `${from} → ${to}`;
}

/**
 * @param {'all'|'today'|'weekly'|'monthly'|'custom'} preset
 * @param {{ from?: string, to?: string }} custom — YYYY-MM-DD when preset=custom
 */
export function resolveDashboardRange(preset, custom = {}) {
  const today = istTodayKey();

  if (preset === 'all') {
    // Go-live → today (never after today; if clock before go-live, clamp)
    const from = DASHBOARD_GO_LIVE;
    const to = today < from ? from : today;
    return {
      from,
      to,
      label: formatRangeLabel(from, to, 'all'),
      preset: 'all',
    };
  }

  if (preset === 'today') {
    return {
      from: today,
      to: today,
      label: formatRangeLabel(today, today, 'today'),
      preset,
    };
  }

  if (preset === 'weekly') {
    const from = addDaysIST(today, -6);
    return {
      from,
      to: today,
      label: formatRangeLabel(from, today, 'weekly'),
      preset,
    };
  }

  if (preset === 'monthly') {
    const from = startOfMonthIST(today);
    return {
      from,
      to: today,
      label: formatRangeLabel(from, today, 'monthly'),
      preset,
    };
  }

  // custom
  let from = String(custom.from || today).slice(0, 10);
  let to = String(custom.to || today).slice(0, 10);
  if (to < from) {
    const swap = from;
    from = to;
    to = swap;
  }
  return {
    from,
    to,
    label: formatRangeLabel(from, to, 'custom'),
    preset: 'custom',
  };
}
