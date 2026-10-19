import { Call, Inquiry } from '../../models/index.js';
import {
  CALL_DISPOSITIONS,
  INQUIRY_STATUSES,
  ROLES,
} from '../../config/constants.js';

const TZ = 'Asia/Kolkata';

const DISPOSITION_LABELS = Object.freeze({
  new_booking: 'New booking',
  flight_changes: 'Flight changes',
  cancellation: 'Cancellation',
  name_correction: 'Name correction',
  pet_query: 'Pet Query',
  document_query: 'Document Query',
  blank_call: 'Blank call',
  airport_query: 'Airport Query',
  car_rental: 'Car rental',
  hotel: 'Hotel',
  others: 'Others',
});

function callScopeFilter(user) {
  const filter = { agencyId: user.agencyId };
  if (user.role !== ROLES.ADMIN) {
    filter.loggedBy = user._id;
  }
  return filter;
}

function inquiryScopeFilter(user) {
  const filter = { agencyId: user.agencyId };
  if (user.role !== ROLES.ADMIN) {
    filter.assignedTo = user._id;
  }
  return filter;
}

/** Format a Date in IST as YYYY-MM-DD */
function istDateKey(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function istHourKey(date) {
  const d = istDateKey(date);
  const hour = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    hour12: false,
  }).format(date);
  return `${d}T${hour}`;
}

function startOfDayIST(yyyyMmDd) {
  return new Date(`${yyyyMmDd}T00:00:00+05:30`);
}

function endOfDayIST(yyyyMmDd) {
  return new Date(`${yyyyMmDd}T23:59:59.999+05:30`);
}

/**
 * Normalize query dates: date-only → full IST day bounds; Date → as-is clamp.
 */
export function resolveRangeBounds(fromInput, toInput) {
  const fromRaw = fromInput instanceof Date ? fromInput : new Date(fromInput);
  const toRaw = toInput instanceof Date ? toInput : new Date(toInput);

  const fromIsDateOnly =
    typeof fromInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fromInput);
  const toIsDateOnly =
    typeof toInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(toInput);

  const from = fromIsDateOnly
    ? startOfDayIST(fromInput)
    : fromRaw;
  let to = toIsDateOnly ? endOfDayIST(toInput) : toRaw;

  // Cap "to" at now so Today doesn't include future hours
  const now = new Date();
  if (to > now) to = now;

  return { from, to };
}

function pickBucketMode(from, to) {
  const ms = to.getTime() - from.getTime();
  const hours = ms / (60 * 60 * 1000);
  if (hours <= 36) return 'hour';
  if (hours <= 31 * 24) return 'day';
  return 'week';
}

function buildBucketKeys(from, to, mode) {
  const keys = [];
  if (mode === 'hour') {
    const cursor = new Date(from);
    cursor.setMinutes(0, 0, 0);
    // Align to IST hour by walking
    while (cursor <= to) {
      keys.push(istHourKey(cursor));
      cursor.setTime(cursor.getTime() + 60 * 60 * 1000);
    }
    return [...new Set(keys)];
  }

  if (mode === 'day') {
    let day = istDateKey(from);
    const endDay = istDateKey(to);
    while (day <= endDay) {
      keys.push(day);
      const next = startOfDayIST(day);
      next.setTime(next.getTime() + 24 * 60 * 60 * 1000);
      day = istDateKey(next);
    }
    return keys;
  }

  // week: ISO week start (Mon) in IST — use date keys of each week's Monday
  let day = istDateKey(from);
  const endDay = istDateKey(to);
  const seen = new Set();
  while (day <= endDay) {
    const d = startOfDayIST(day);
    // getDay in UTC of that IST midnight — better: format weekday
    const wd = new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      weekday: 'short',
    }).format(d);
    const dayIndex = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[
      wd
    ];
    const monday = new Date(d);
    monday.setTime(d.getTime() - dayIndex * 24 * 60 * 60 * 1000);
    const weekKey = istDateKey(monday);
    if (!seen.has(weekKey)) {
      seen.add(weekKey);
      keys.push(weekKey);
    }
    const next = startOfDayIST(day);
    next.setTime(next.getTime() + 24 * 60 * 60 * 1000);
    day = istDateKey(next);
  }
  return keys;
}

function labelForKey(key, mode) {
  if (mode === 'hour') {
    const hour = key.slice(11, 13);
    const h = Number(hour);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}${suffix}`;
  }
  if (mode === 'week') {
    return `W ${key.slice(5)}`; // MM-DD of week start
  }
  // day
  const d = startOfDayIST(key);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

function mongoDateFormat(mode) {
  if (mode === 'hour') return '%Y-%m-%dT%H';
  return '%Y-%m-%d';
}

async function countByBucket(Model, match, dateField, mode) {
  const format = mongoDateFormat(mode);
  const rows = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: {
            format,
            date: `$${dateField}`,
            timezone: TZ,
          },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  if (mode === 'week') {
    // Re-bucket daily rows into week-start keys
    const map = new Map();
    for (const row of rows) {
      const dayKey = row._id;
      if (!dayKey) continue;
      const d = startOfDayIST(dayKey);
      const wd = new Intl.DateTimeFormat('en-US', {
        timeZone: TZ,
        weekday: 'short',
      }).format(d);
      const dayIndex = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[
        wd
      ];
      const monday = new Date(d);
      monday.setTime(d.getTime() - dayIndex * 24 * 60 * 60 * 1000);
      const weekKey = istDateKey(monday);
      map.set(weekKey, (map.get(weekKey) || 0) + row.count);
    }
    return map;
  }

  const map = new Map();
  for (const row of rows) {
    if (row._id) map.set(row._id, row.count);
  }
  return map;
}

/**
 * Dashboard summary for date range (IST). Role-scoped like calls/inquiries lists.
 */
export async function getDashboardSummary(user, { from: fromInput, to: toInput }) {
  const { from, to } = resolveRangeBounds(fromInput, toInput);
  const mode = pickBucketMode(from, to);
  const bucketKeys = buildBucketKeys(from, to, mode);

  const callBase = {
    ...callScopeFilter(user),
    createdAt: { $gte: from, $lte: to },
  };
  const inquiryCreated = {
    ...inquiryScopeFilter(user),
    createdAt: { $gte: from, $lte: to },
  };
  const inquiryAuthorized = {
    ...inquiryScopeFilter(user),
    status: INQUIRY_STATUSES.AUTHORIZED,
    confirmedAt: { $gte: from, $lte: to },
  };

  const [
    callsLogged,
    inquiriesCreated,
    activeInquiries,
    authorizedCount,
    marginRows,
    dispositionRows,
    callBuckets,
    inquiryBuckets,
  ] = await Promise.all([
    Call.countDocuments(callBase),
    Inquiry.countDocuments(inquiryCreated),
    Inquiry.countDocuments({
      ...inquiryCreated,
      status: { $ne: INQUIRY_STATUSES.CANCELLED },
    }),
    Inquiry.countDocuments(inquiryAuthorized),
    Inquiry.aggregate([
      { $match: inquiryAuthorized },
      {
        $group: {
          _id: { $ifNull: ['$pricing.currency', 'USD'] },
          totalMargin: { $sum: { $ifNull: ['$pricing.markup', 0] } },
          confirmedCount: { $sum: 1 },
        },
      },
      { $sort: { confirmedCount: -1 } },
    ]),
    Call.aggregate([
      { $match: callBase },
      { $group: { _id: '$disposition', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    countByBucket(Call, callBase, 'createdAt', mode),
    countByBucket(Inquiry, inquiryCreated, 'createdAt', mode),
  ]);

  const authorizationRate =
    inquiriesCreated > 0
      ? Math.round((authorizedCount / inquiriesCreated) * 100)
      : 0;

  const primaryMargin = marginRows[0];
  const margin = {
    currency: primaryMargin?._id || 'USD',
    totalMargin: primaryMargin?.totalMargin ?? 0,
    confirmedCount: primaryMargin?.confirmedCount ?? 0,
    byCurrency: marginRows.map((r) => ({
      currency: r._id || 'USD',
      totalMargin: r.totalMargin,
      confirmedCount: r.confirmedCount,
    })),
  };

  const trend = bucketKeys.map((key) => ({
    key,
    label: labelForKey(key, mode),
    calls: callBuckets.get(key) || 0,
    inquiries: inquiryBuckets.get(key) || 0,
  }));

  const dispositionOrder = new Map(
    CALL_DISPOSITIONS.map((v, i) => [v, i])
  );
  const dispositions = dispositionRows
    .filter((r) => r._id && r.count > 0)
    .map((r) => ({
      value: r._id,
      label: DISPOSITION_LABELS[r._id] || r._id,
      count: r.count,
    }))
    .sort(
      (a, b) =>
        (dispositionOrder.get(a.value) ?? 99) -
        (dispositionOrder.get(b.value) ?? 99)
    );

  return {
    range: {
      from: from.toISOString(),
      to: to.toISOString(),
      timezone: TZ,
      bucket: mode,
    },
    kpis: {
      callsLogged,
      activeInquiries,
      inquiriesCreated,
      authorizedCount,
      authorizationRate,
      margin,
    },
    trend,
    dispositions,
  };
}
