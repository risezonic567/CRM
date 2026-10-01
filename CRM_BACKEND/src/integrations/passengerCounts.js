/**
 * Normalize search passenger counts across providers.
 * Prefer adults/children/infants*; fall back to passengers = adults.
 */
export function resolvePassengerCounts({
  passengers,
  adults,
  children,
  infantsInSeat,
  infantsOnLap,
} = {}) {
  const hasBreakdown =
    adults != null ||
    children != null ||
    infantsInSeat != null ||
    infantsOnLap != null;

  if (hasBreakdown) {
    const a = Math.min(9, Math.max(0, Number(adults) || 0));
    const c = Math.min(8, Math.max(0, Number(children) || 0));
    const iSeat = Math.min(8, Math.max(0, Number(infantsInSeat) || 0));
    const iLap = Math.min(8, Math.max(0, Number(infantsOnLap) || 0));
    const total = a + c + iSeat + iLap;
    return {
      adults: a,
      children: c,
      infantsInSeat: iSeat,
      infantsOnLap: iLap,
      total: total || 1,
    };
  }

  const n = Math.min(9, Math.max(1, Number(passengers) || 1));
  return {
    adults: n,
    children: 0,
    infantsInSeat: 0,
    infantsOnLap: 0,
    total: n,
  };
}

/**
 * Build Duffel offer-request passengers[] from counts.
 * Types: adult | child | infant_without_seat (on lap).
 * In-seat infants mapped as child (Duffel has no separate in-seat infant on all versions).
 */
export function duffelPassengersFromCounts(counts) {
  const list = [];
  for (let i = 0; i < counts.adults; i++) list.push({ type: 'adult' });
  for (let i = 0; i < counts.children; i++) list.push({ type: 'child' });
  for (let i = 0; i < counts.infantsInSeat; i++) list.push({ type: 'child' });
  for (let i = 0; i < counts.infantsOnLap; i++) {
    list.push({ type: 'infant_without_seat' });
  }
  return list.length ? list : [{ type: 'adult' }];
}
