import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function sameDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isBefore(a, b) {
  return toISODate(a) < toISODate(b);
}

function formatChip(iso) {
  const d = parseISO(iso);
  if (!d) return '';
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function MonthGrid({
  monthDate,
  minDate,
  departure,
  returnDate,
  selecting,
  tripType,
  onPick,
}) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }

  const dep = parseISO(departure);
  const ret = parseISO(returnDate);

  return (
    <div className="min-w-[240px] flex-1">
      <p className="mb-3 text-center text-sm font-semibold text-slate-900">
        {monthDate.toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric',
        })}
      </p>
      <div className="mb-1 grid grid-cols-7 gap-0.5">
        {WEEKDAYS.map((w, i) => (
          <div
            key={`${w}-${i}`}
            className="py-1 text-center text-[11px] font-medium text-slate-400"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((date, idx) => {
          if (!date) {
            return <div key={`e-${idx}`} className="h-10" />;
          }
          const disabled = minDate && isBefore(date, minDate);
          const isDep = sameDay(date, dep);
          const isRet = tripType === 'round' && sameDay(date, ret);
          const inRange =
            tripType === 'round' &&
            dep &&
            ret &&
            !isBefore(date, dep) &&
            !isBefore(ret, date) &&
            !isDep &&
            !isRet;

          let cellCls =
            'relative flex h-10 w-full items-center justify-center rounded-full text-sm tabular-nums transition ';
          if (disabled) {
            cellCls += 'cursor-not-allowed text-slate-300';
          } else if (isDep || isRet) {
            cellCls += 'bg-blue-600 font-semibold text-white';
          } else if (inRange) {
            cellCls += 'bg-blue-50 font-medium text-blue-800';
          } else {
            cellCls += 'text-slate-800 hover:bg-slate-100';
          }

          return (
            <button
              key={toISODate(date)}
              type="button"
              disabled={disabled}
              className={cellCls}
              onClick={() => onPick(date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Google-inspired dual-month date picker (light CRM theme).
 * Writes YYYY-MM-DD via onChange({ departureDate, returnDate }).
 */
export default function FlightDatePicker({
  tripType = 'oneway',
  departureDate = '',
  returnDate = '',
  minDate,
  onChange,
}) {
  const min = parseISO(minDate) || new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate()
  );
  const [open, setOpen] = useState(false);
  const [focusField, setFocusField] = useState('departure');
  const [draftDep, setDraftDep] = useState(departureDate);
  const [draftRet, setDraftRet] = useState(returnDate);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonth(parseISO(departureDate) || min)
  );
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setDraftDep(departureDate);
      setDraftRet(returnDate);
    }
  }, [departureDate, returnDate, open]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const openPicker = (field) => {
    if (tripType === 'oneway' && field === 'return') return;
    setFocusField(field);
    setDraftDep(departureDate);
    setDraftRet(returnDate);
    setViewMonth(startOfMonth(parseISO(departureDate) || min));
    setOpen(true);
  };

  const handlePick = (date) => {
    const iso = toISODate(date);
    if (tripType === 'oneway' || focusField === 'departure') {
      setDraftDep(iso);
      if (draftRet && isBefore(parseISO(draftRet), date)) {
        setDraftRet('');
      }
      if (tripType === 'round') {
        setFocusField('return');
      }
      return;
    }
    const dep = parseISO(draftDep);
    if (dep && isBefore(date, dep)) {
      setDraftDep(iso);
      setDraftRet('');
      setFocusField('return');
      return;
    }
    setDraftRet(iso);
  };

  const handleDone = () => {
    onChange?.({
      departureDate: draftDep || '',
      returnDate: tripType === 'round' ? draftRet || '' : '',
    });
    setOpen(false);
  };

  const handleReset = () => {
    setDraftDep('');
    setDraftRet('');
    setFocusField('departure');
  };

  const chipCls = (active, disabled) =>
    `flex min-h-[42px] flex-1 items-center gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm transition ${
      disabled
        ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-400'
        : active
          ? 'border-blue-500 ring-2 ring-blue-100'
          : 'border-slate-200 hover:border-slate-300'
    }`;

  const months = useMemo(
    () => [viewMonth, addMonths(viewMonth, 1)],
    [viewMonth]
  );

  return (
    <div className="relative" ref={wrapRef}>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          className={chipCls(open && focusField === 'departure', false)}
          onClick={() => openPicker('departure')}
        >
          <Calendar className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="min-w-0">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Departure
            </span>
            <span className="block truncate font-medium text-slate-900">
              {formatChip(departureDate) || 'Select date'}
            </span>
          </span>
        </button>
        <button
          type="button"
          disabled={tripType === 'oneway'}
          className={chipCls(
            open && focusField === 'return',
            tripType === 'oneway'
          )}
          onClick={() => openPicker('return')}
        >
          <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="min-w-0">
            <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
              Return
            </span>
            <span className="block truncate font-medium text-slate-900">
              {tripType === 'oneway'
                ? 'One way'
                : formatChip(returnDate) || 'Select date'}
            </span>
          </span>
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close calendar"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-[680px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl sm:p-5"
          >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  focusField === 'departure'
                    ? 'border-blue-500 text-blue-700'
                    : 'border-slate-200 text-slate-600'
                }`}
                onClick={() => setFocusField('departure')}
              >
                {formatChip(draftDep) || 'Departure'}
              </button>
              {tripType === 'round' && (
                <button
                  type="button"
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    focusField === 'return'
                      ? 'border-blue-500 text-blue-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                  onClick={() => setFocusField('return')}
                >
                  {formatChip(draftRet) || 'Return'}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="text-xs font-medium text-blue-600 hover:underline"
                onClick={handleReset}
              >
                Reset
              </button>
              <button
                type="button"
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded-full border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-full border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-col gap-6 sm:flex-row">
            {months.map((m) => (
              <MonthGrid
                key={toISODate(m)}
                monthDate={m}
                minDate={min}
                departure={draftDep}
                returnDate={draftRet}
                selecting={focusField}
                tripType={tripType}
                onPick={handlePick}
              />
            ))}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              disabled={!draftDep || (tripType === 'round' && !draftRet)}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              onClick={handleDone}
            >
              Done
            </button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
