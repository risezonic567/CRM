import React, { useMemo } from 'react';
import { ArrowUpDown, Plane } from 'lucide-react';

/**
 * Client-side filters for offers already in Redux (does not mutate store).
 */
export default function FlightFilters({
  offers = [],
  filters,
  onChange,
}) {
  const airlines = useMemo(() => {
    const map = new Map();
    for (const o of offers) {
      const name = o.airline?.name || 'Other';
      map.set(name, (map.get(name) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [offers]);

  const prices = offers.map((o) => Number(o.costPrice) || 0);
  const maxPrice = prices.length ? Math.ceil(Math.max(...prices)) : 0;

  const set = (patch) => onChange({ ...filters, ...patch });

  const toggleAirline = (name) => {
    const selected = new Set(filters.airlines || []);
    if (selected.has(name)) selected.delete(name);
    else selected.add(name);
    set({ airlines: [...selected] });
  };

  return (
    <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Filters</h4>
        <p className="text-[11px] text-slate-500">
          Narrow results · does not re-search
        </p>
      </div>

      <div>
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Sort
        </p>
        <select
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
          value={filters.sort || 'price_asc'}
          onChange={(e) => set({ sort: e.target.value })}
        >
          <option value="price_asc">Price · low to high</option>
          <option value="price_desc">Price · high to low</option>
          <option value="duration">Duration</option>
          <option value="departure">Departure time</option>
        </select>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Stops
        </p>
        <div className="space-y-1.5">
          {[
            { value: 'any', label: 'Any' },
            { value: '0', label: 'Non stop' },
            { value: '1', label: '1 stop or fewer' },
          ].map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1 text-sm text-slate-700 hover:bg-slate-50"
            >
              <input
                type="radio"
                name="stops"
                className="accent-blue-600"
                checked={(filters.stops || 'any') === opt.value}
                onChange={() => set({ stops: opt.value })}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      {maxPrice > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Max price
          </p>
          <input
            type="range"
            min={0}
            max={maxPrice}
            step={Math.max(1, Math.round(maxPrice / 50))}
            value={filters.maxPrice ?? maxPrice}
            onChange={(e) => set({ maxPrice: Number(e.target.value) })}
            className="w-full accent-blue-600"
          />
          <p className="mt-1 text-xs text-slate-600">
            Up to{' '}
            <span className="font-semibold tabular-nums">
              {filters.maxPrice ?? maxPrice}
            </span>
          </p>
        </div>
      )}

      {airlines.length > 0 && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <Plane className="h-3.5 w-3.5" />
            Airlines
          </p>
          <ul className="max-h-48 space-y-1 overflow-auto">
            {airlines.map(([name, count]) => (
              <li key={name}>
                <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg px-1 py-1 text-sm text-slate-700 hover:bg-slate-50">
                  <span className="flex min-w-0 items-center gap-2">
                    <input
                      type="checkbox"
                      className="accent-blue-600"
                      checked={(filters.airlines || []).includes(name)}
                      onChange={() => toggleAirline(name)}
                    />
                    <span className="truncate">{name}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">{count}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="w-full rounded-xl border border-slate-200 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
        onClick={() =>
          onChange({
            sort: 'price_asc',
            stops: 'any',
            airlines: [],
            maxPrice: maxPrice || undefined,
          })
        }
      >
        Clear filters
      </button>
    </aside>
  );
}

/** Apply FlightFilters state to offer list (pure). */
export function applyFlightFilters(offers, filters) {
  let list = Array.isArray(offers) ? [...offers] : [];

  if (filters.stops === '0') {
    list = list.filter((o) => Number(o.stops) === 0);
  } else if (filters.stops === '1') {
    list = list.filter((o) => Number(o.stops) <= 1);
  }

  if (filters.airlines?.length) {
    const set = new Set(filters.airlines);
    list = list.filter((o) => set.has(o.airline?.name || 'Other'));
  }

  if (filters.maxPrice != null && Number.isFinite(filters.maxPrice)) {
    list = list.filter((o) => Number(o.costPrice) <= filters.maxPrice);
  }

  const timeKey = (at) => String(at || '');

  if (filters.sort === 'price_desc') {
    list.sort((a, b) => Number(b.costPrice) - Number(a.costPrice));
  } else if (filters.sort === 'duration') {
    list.sort(
      (a, b) => String(a.duration || '').localeCompare(String(b.duration || ''))
    );
  } else if (filters.sort === 'departure') {
    list.sort((a, b) =>
      timeKey(a.departure?.at).localeCompare(timeKey(b.departure?.at))
    );
  } else {
    list.sort((a, b) => Number(a.costPrice) - Number(b.costPrice));
  }

  return list;
}
