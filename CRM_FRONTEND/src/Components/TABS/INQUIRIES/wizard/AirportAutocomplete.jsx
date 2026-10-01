import React, { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { useLazySuggestAirportsQuery } from '../../../../REDUX_FEATURES/REDUX_SLICES/Search_api/searchApi';
import { useDebounce } from '../../../../hooks/useDebounce';

/**
 * Live Duffel Places autocomplete — no hardcoded airports.
 * onSelect({ iataCode, label, name, cityName })
 */
const AirportAutocomplete = ({
  id,
  label,
  placeholder = 'City or airport',
  valueIata = '',
  valueLabel = '',
  inputClassName,
  showPin = false,
  onSelect,
  onClear,
}) => {
  const [input, setInput] = useState(valueLabel || valueIata || '');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const debounced = useDebounce(input.trim(), 350);
  const [trigger, { data, isFetching, isError, error }] =
    useLazySuggestAirportsQuery();

  const places = data?.data?.places || [];

  useEffect(() => {
    if (valueLabel) setInput(valueLabel);
    else if (valueIata) setInput(valueIata);
  }, [valueIata, valueLabel]);

  useEffect(() => {
    if (debounced.length < 2) return;
    if (valueIata && (input === valueLabel || input === valueIata)) return;
    trigger(debounced);
    setOpen(true);
  }, [debounced, trigger, valueIata, valueLabel, input]);

  useEffect(() => {
    const onDoc = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const handlePick = (place) => {
    setInput(place.label);
    setOpen(false);
    onSelect?.(place);
  };

  const handleChange = (e) => {
    const v = e.target.value;
    setInput(v);
    if (!v) {
      onClear?.();
      setOpen(false);
      return;
    }
    if (valueIata && v !== valueLabel && v !== valueIata) {
      onClear?.();
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      {label && (
        <span className="mb-1 block text-xs font-medium text-slate-600">
          {label}
        </span>
      )}
      <div className="relative">
        {showPin && (
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
        <input
          id={id}
          type="text"
          autoComplete="off"
          className={
            inputClassName ||
            'w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-600'
          }
          placeholder={placeholder}
          value={input}
          onChange={handleChange}
          onFocus={() => {
            if (places.length) setOpen(true);
          }}
        />
      </div>
      {valueIata && (
        <span className="mt-0.5 block text-[11px] font-medium text-blue-600/80">
          {valueIata}
        </span>
      )}

      {open && debounced.length >= 2 && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {isFetching && (
            <li className="px-3 py-2 text-xs text-slate-500">Searching…</li>
          )}
          {!isFetching && isError && (
            <li className="px-3 py-2 text-xs text-red-600">
              {error?.data?.message || 'Airport lookup failed'}
            </li>
          )}
          {!isFetching && !isError && places.length === 0 && (
            <li className="px-3 py-2 text-xs text-slate-500">
              No airports found
            </li>
          )}
          {!isFetching &&
            places.map((p) => (
              <li key={`${p.iataCode}-${p.id}`}>
                <button
                  type="button"
                  className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-slate-50"
                  onClick={() => handlePick(p)}
                >
                  <span className="font-medium text-slate-900">
                    {p.iataCode}{' '}
                    <span className="font-normal text-slate-600">{p.name}</span>
                  </span>
                  <span className="text-xs text-slate-500">
                    {[p.cityName, p.countryCode].filter(Boolean).join(', ')}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
};

export default AirportAutocomplete;
