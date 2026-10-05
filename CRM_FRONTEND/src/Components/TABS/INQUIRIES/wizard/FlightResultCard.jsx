import React, { useState } from 'react';
import {
  Briefcase,
  ChevronDown,
  ChevronUp,
  Luggage,
} from 'lucide-react';

function formatTime(at) {
  if (!at) return '--:--';
  const s = String(at);
  const m = s.match(/T(\d{2}:\d{2})/) || s.match(/\b(\d{2}:\d{2})\b/);
  return m ? m[1] : s;
}

function formatDateShort(at) {
  if (!at) return '';
  const d = new Date(String(at).includes('T') ? at : at.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatMoney(currency, amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${currency} —`;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function segmentsFromOffer(offer) {
  const rawFlights = offer?.raw?.flights;
  if (Array.isArray(rawFlights) && rawFlights.length) {
    return rawFlights.map((f) => ({
      airline: f.airline,
      flightNumber: f.flight_number,
      airplane: f.airplane,
      travelClass: f.travel_class,
      logo: f.airline_logo,
      depTime: f.departure_airport?.time,
      depAirport: f.departure_airport?.id,
      depName: f.departure_airport?.name,
      arrTime: f.arrival_airport?.time,
      arrAirport: f.arrival_airport?.id,
      arrName: f.arrival_airport?.name,
      duration: f.duration,
    }));
  }
  return [
    {
      airline: offer.airline?.name,
      flightNumber: offer.flightNumber,
      airplane: '',
      travelClass: offer.cabinClass,
      logo: offer.airline?.logoSymbolUrl || offer.airline?.logoLockupUrl,
      depTime: offer.departure?.at,
      depAirport: offer.departure?.airport,
      depName: offer.departure?.city,
      arrTime: offer.arrival?.at,
      arrAirport: offer.arrival?.airport,
      arrName: offer.arrival?.city,
      duration: null,
    },
  ];
}

function baggageFromOffer(offer) {
  const ext = offer?.raw?.extensions;
  if (Array.isArray(ext) && ext.length) {
    const cabin = ext.find((x) => /cabin|carry/i.test(x));
    const check = ext.find((x) => /checked|baggage|bag/i.test(x));
    if (cabin || check) return { cabin, check };
    // Amenity/baggage lines without keywords — extension captures only
    const src = offer?.raw?.source;
    if (src === 'kiwi-extension' || src === 'google-extension') {
      return { cabin: ext[0] || null, check: ext[1] || null };
    }
    return null;
  }
  // Extension capture fallback (SerpApi/Duffel never set raw.capture)
  const bags = offer?.raw?.capture?.baggage;
  if (Array.isArray(bags) && bags.length) {
    return { cabin: bags[0] || null, check: bags[1] || null };
  }
  return null;
}

/**
 * MMT-style flight card with expandable details.
 * Select / markup callbacks stay in parent (wizard logic unchanged).
 */
export default function FlightResultCard({
  offer,
  selected,
  markup,
  onMarkupChange,
  onFocusMarkup,
  onSelect,
}) {
  const [expanded, setExpanded] = useState(false);
  const hasPrice = Number(offer.costPrice) > 0;
  /** Outbound RT without SerpApi price — price comes after return select */
  const priceOnReturn =
    !hasPrice && Boolean(offer.departureToken) && offer.leg !== 'return';
  const finalPrice = Number(offer.costPrice || 0) + Number(markup || 0);
  const logo =
    offer.airline?.logoSymbolUrl || offer.airline?.logoLockupUrl;
  const segments = segmentsFromOffer(offer);
  const bags = baggageFromOffer(offer);

  return (
    <div
      className={`overflow-hidden rounded-xl border bg-white shadow-sm transition ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-100'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
            {logo ? (
              <img src={logo} alt="" className="h-8 w-8 object-contain" />
            ) : (
              <span className="text-xs font-bold text-slate-500">
                {offer.airline?.iataCode || '—'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {offer.airline?.name || 'Airline'}{' '}
              <span className="font-normal text-slate-500">
                {offer.flightNumber}
              </span>
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 sm:gap-6">
              <div className="text-center">
                <p className="text-lg font-bold tabular-nums text-slate-900">
                  {formatTime(offer.departure?.at)}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {offer.departure?.airport}
                </p>
              </div>
              <div className="min-w-[5.5rem] flex-1 text-center">
                <p className="text-[11px] text-slate-500">
                  {offer.duration || '—'}
                </p>
                <div className="my-1 h-px bg-slate-200" />
                <p className="text-[11px] text-slate-500">
                  {Number(offer.stops) === 0
                    ? 'Non stop'
                    : `${offer.stops} stop(s)`}
                </p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold tabular-nums text-slate-900">
                  {formatTime(offer.arrival?.at)}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {offer.arrival?.airport}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 border-t border-slate-100 pt-3 sm:items-end sm:border-t-0 sm:pt-0 lg:min-w-[200px]">
          {priceOnReturn ? (
            <p className="text-right text-sm font-semibold text-amber-700">
              Select return for price
            </p>
          ) : hasPrice ? (
            <>
              <p className="text-xs text-slate-500">
                Supplier:{' '}
                <span className="font-medium text-slate-700">
                  {formatMoney(offer.currency, offer.costPrice)}
                </span>
              </p>
              <label className="flex items-center justify-end gap-2 text-xs text-slate-600">
                Markup
                <input
                  type="number"
                  min={0}
                  className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={markup}
                  onChange={(e) => onMarkupChange?.(Number(e.target.value))}
                  onFocus={() => onFocusMarkup?.(offer)}
                />
              </label>
              <p className="text-right text-lg font-bold text-slate-900">
                {formatMoney(offer.currency, finalPrice)}
              </p>
            </>
          ) : (
            <p className="text-right text-sm font-medium text-slate-500">
              Price unavailable
            </p>
          )}
          <button
            type="button"
            className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
            onClick={() => onSelect?.(offer)}
          >
            Select
          </button>
        </div>
      </div>

      <button
        type="button"
        className="flex w-full items-center justify-center gap-1 border-t border-slate-100 bg-slate-50/80 py-2 text-xs font-medium text-blue-700 hover:bg-slate-50"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? 'Hide flight details' : 'View flight details'}
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-white p-4">
          <p className="mb-3 text-sm font-semibold text-slate-900">
            Flight Details
          </p>
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="min-w-0 flex-1 space-y-0">
              {segments.map((seg, i) => (
                <div key={i} className="relative flex gap-3">
                  <div className="flex w-4 flex-col items-center pt-1">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-blue-600 bg-white" />
                    <span className="my-1 w-px flex-1 min-h-[4.5rem] bg-blue-200" />
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-blue-600 bg-white" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3 pb-5">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatTime(seg.depTime)}
                        {formatDateShort(seg.depTime)
                          ? `, ${formatDateShort(seg.depTime)}`
                          : ''}
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">
                          {seg.depName || seg.depAirport}
                        </span>
                        {seg.depAirport && seg.depName
                          ? ` (${seg.depAirport})`
                          : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                      {seg.logo && (
                        <img
                          src={seg.logo}
                          alt=""
                          className="h-5 w-5 object-contain"
                        />
                      )}
                      <span>
                        {[
                          seg.airline,
                          seg.flightNumber,
                          seg.airplane,
                          seg.travelClass,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                      {offer.duration && (
                        <span className="ml-auto font-medium text-slate-500">
                          {offer.duration}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatTime(seg.arrTime)}
                        {formatDateShort(seg.arrTime)
                          ? `, ${formatDateShort(seg.arrTime)}`
                          : ''}
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="font-medium">
                          {seg.arrName || seg.arrAirport}
                        </span>
                        {seg.arrAirport && seg.arrName
                          ? ` (${seg.arrAirport})`
                          : ''}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="shrink-0 border-t border-slate-100 pt-3 md:w-48 md:border-l md:border-t-0 md:pl-4 md:pt-0">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Baggage
              </p>
              {bags ? (
                <ul className="space-y-2 text-xs text-slate-600">
                  {bags.cabin && (
                    <li className="flex items-start gap-2">
                      <Briefcase className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                      {bags.cabin}
                    </li>
                  )}
                  {bags.check && (
                    <li className="flex items-start gap-2">
                      <Luggage className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                      {bags.check}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="text-xs text-slate-400">
                  Check fare rules with supplier
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
