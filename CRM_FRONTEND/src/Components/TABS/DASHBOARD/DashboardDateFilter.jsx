import React, { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import {
  DASHBOARD_PRESETS,
  resolveDashboardRange,
} from '../../../utils/dashboardDateRange';

/**
 * Preset dropdown + optional custom from/to (YYYY-MM-DD).
 * Calls onChange({ from, to, label, preset }) when range is ready.
 */
export default function DashboardDateFilter({ value, onChange }) {
  const preset = value?.preset || 'weekly';
  const [customFrom, setCustomFrom] = useState(value?.from || '');
  const [customTo, setCustomTo] = useState(value?.to || '');

  useEffect(() => {
    if (preset !== 'custom') return;
    setCustomFrom(value?.from || '');
    setCustomTo(value?.to || '');
  }, [preset, value?.from, value?.to]);

  const handlePreset = (next) => {
    if (next === 'custom') {
      const base = resolveDashboardRange('weekly');
      const from = customFrom || base.from;
      const to = customTo || base.to;
      setCustomFrom(from);
      setCustomTo(to);
      onChange(resolveDashboardRange('custom', { from, to }));
      return;
    }
    onChange(resolveDashboardRange(next));
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    onChange(resolveDashboardRange('custom', { from: customFrom, to: customTo }));
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      <div className="inline-flex items-center gap-1.5">
        <CalendarDays className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <select
          value={preset}
          onChange={(e) => handlePreset(e.target.value)}
          className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-sm cursor-pointer hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
          aria-label="Dashboard date range"
        >
          {DASHBOARD_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {preset === 'custom' && (
        <div className="flex flex-wrap items-center gap-1.5">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white"
            aria-label="From date"
          />
          <span className="text-[11px] text-slate-400">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 bg-white"
            aria-label="To date"
          />
          <button
            type="button"
            onClick={applyCustom}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 cursor-pointer"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
