import React from 'react';

/**
 * Multi-segment itinerary table (PNR Converter–style).
 */
export default function PnrItineraryTable({ segments = [] }) {
  if (!segments.length) {
    return (
      <p className="text-xs text-slate-500 py-4">No segments decoded yet.</p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              #
            </th>
            <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Airline
            </th>
            <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Flight
            </th>
            <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Class
            </th>
            <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Date
            </th>
            <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Route
            </th>
            <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Dep
            </th>
            <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Arr
            </th>
            <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Status
            </th>
            <th className="py-2.5 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Op
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {segments.map((seg) => (
            <tr key={`${seg.lineNumber}-${seg.flightNumber}-${seg.from}`}>
              <td className="py-2.5 px-3 font-mono text-slate-500">
                {seg.lineNumber}
              </td>
              <td className="py-2.5 px-3 font-medium text-slate-900">
                {seg.airlineName || seg.airlineCode || '—'}
              </td>
              <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                {seg.airlineCode} {seg.flightNumber}
              </td>
              <td className="py-2.5 px-3 text-slate-700">{seg.bookingClass || '—'}</td>
              <td className="py-2.5 px-3 whitespace-nowrap text-slate-600">
                {seg.departureDate || '—'}
              </td>
              <td className="py-2.5 px-3">
                <span className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-800">
                  {seg.from}
                  <span className="text-slate-400">→</span>
                  {seg.to}
                </span>
              </td>
              <td className="py-2.5 px-3 font-mono tabular-nums text-slate-800">
                {seg.departureTime || '—'}
              </td>
              <td className="py-2.5 px-3 font-mono tabular-nums text-slate-800">
                <span>{seg.arrivalTime || '—'}</span>
                {seg.arrivalDate &&
                  seg.arrivalDate !== seg.departureDate && (
                    <span className="ml-1 text-[10px] text-amber-700">
                      {seg.arrivalDate}
                    </span>
                  )}
              </td>
              <td className="py-2.5 px-3">
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                  {seg.status || '—'}
                </span>
              </td>
              <td
                className="py-2.5 px-3 max-w-[120px] truncate text-slate-500"
                title={seg.operatingInfo || ''}
              >
                {seg.operatingInfo || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
