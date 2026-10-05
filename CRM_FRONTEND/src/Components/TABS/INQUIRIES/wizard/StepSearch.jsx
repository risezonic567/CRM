import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  Loader2,
  Minus,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import { useSearchFlightsMutation } from '../../../../REDUX_FEATURES/REDUX_SLICES/Search_api/searchApi';
import { setSearchResults } from '../../../../REDUX_FEATURES/REDUX_SLICES/Search_api/searchSlice';
import { CABIN_CLASSES } from '../../../../constants/dispositions';
import { getErrorMessage } from '../../../../utils/getErrorMessage';
import AirportAutocomplete from './AirportAutocomplete';
import FlightDatePicker from './FlightDatePicker';

const KIWI_EXT_ENABLED =
  String(import.meta.env.VITE_ENABLE_KIWI_EXT || '').toLowerCase() === 'true';

function todayLocalISO() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function totalPax(t) {
  return (
    (Number(t.adults) || 0) +
    (Number(t.children) || 0) +
    (Number(t.infantsInSeat) || 0) +
    (Number(t.infantsOnLap) || 0)
  );
}

const fieldClass =
  'w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100';

const menuBtn =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-white';

function useMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  return { open, setOpen, ref };
}

const StepSearch = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const t = wizard.travel;
  const [searchFlights, { isLoading }] = useSearchFlightsMutation();
  const [tripType, setTripType] = useState(t.returnDate ? 'round' : 'oneway');
  const tripMenu = useMenu();
  const paxMenu = useMenu();
  const cabinMenu = useMenu();
  const [draftPax, setDraftPax] = useState({
    adults: t.adults ?? 1,
    children: t.children ?? 0,
    infantsInSeat: t.infantsInSeat ?? 0,
    infantsOnLap: t.infantsOnLap ?? 0,
  });

  // Resume / hydrate: if travel has returnDate, show Round trip (not stuck One way)
  useEffect(() => {
    if (t.returnDate) setTripType('round');
  }, [t.returnDate]);

  const setTravel = (patch) =>
    dispatch(patchWizard({ travel: { ...t, ...patch } }));

  const syncPaxTravel = (pax) => {
    const passengers =
      pax.adults + pax.children + pax.infantsInSeat + pax.infantsOnLap;
    setTravel({ ...pax, passengers: Math.max(1, passengers) });
  };

  const swapAirports = () => {
    setTravel({
      from: t.to || '',
      fromLabel: t.toLabel || '',
      to: t.from || '',
      toLabel: t.fromLabel || '',
    });
  };

  const handleSearch = async () => {
    const adults = t.adults ?? t.passengers ?? 1;
    const children = t.children ?? 0;
    const infantsInSeat = t.infantsInSeat ?? 0;
    const infantsOnLap = t.infantsOnLap ?? 0;
    const passengers = totalPax({
      adults,
      children,
      infantsInSeat,
      infantsOnLap,
    });

    if (!t.from || !t.to || !t.departureDate || passengers < 1) {
      toast.error('Select From, To, date, and passengers');
      return;
    }
    if (t.from === t.to) {
      toast.error('From and To must be different');
      return;
    }
    if (adults < 1) {
      toast.error('At least 1 adult is required');
      return;
    }
    if (tripType === 'round' && !t.returnDate) {
      toast.error('Select a return date for round trip');
      return;
    }

    try {
      const res = await searchFlights({
        from: t.from.toUpperCase(),
        to: t.to.toUpperCase(),
        departureDate: t.departureDate,
        returnDate: tripType === 'round' ? t.returnDate || null : null,
        passengers,
        adults,
        children,
        infantsInSeat,
        infantsOnLap,
        cabinClass: t.cabinClass,
      }).unwrap();

      dispatch(setSearchResults(res.data));
      const defaults = res.data?.agencyDefaults;
      if (defaults) {
        const patch = {};
        if (defaults.defaultMarkup != null) patch.markup = defaults.defaultMarkup;
        if (defaults.merchantFeePercent != null) {
          patch.merchantFeePercent = defaults.merchantFeePercent;
        }
        if (defaults.currency) patch.currency = defaults.currency;
        if (Object.keys(patch).length) dispatch(patchWizard(patch));
      }
      dispatch(setWizardStep(2));

      if (!res.data?.offers?.length) {
        toast(
          `No flights for ${t.from} → ${t.to} on ${t.departureDate}`,
          { icon: 'ℹ️' }
        );
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Search failed'));
    }
  };

  const openKiwi = () => {
    let url = 'https://www.kiwi.com/en/';
    if (t.from && t.to && t.departureDate) {
      url = `https://www.kiwi.com/en/search/results/${encodeURIComponent(
        t.from.toLowerCase()
      )}/${encodeURIComponent(t.to.toLowerCase())}/${t.departureDate}/${
        t.returnDate || t.departureDate
      }`;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openGoogleFlights = () => {
    window.open(
      'https://www.google.com/travel/flights?gl=IN&hl=en',
      '_blank',
      'noopener,noreferrer'
    );
  };

  const paxTotal = totalPax({
    adults: t.adults ?? 1,
    children: t.children ?? 0,
    infantsInSeat: t.infantsInSeat ?? 0,
    infantsOnLap: t.infantsOnLap ?? 0,
  });

  const bump = (key, delta, min = 0) => {
    setDraftPax((prev) => {
      let next = { ...prev, [key]: Math.max(min, (prev[key] || 0) + delta) };
      const sum =
        next.adults + next.children + next.infantsInSeat + next.infantsOnLap;
      if (sum > 9) return prev;
      if (key === 'adults' && next.infantsOnLap > next.adults) {
        next = { ...next, infantsOnLap: next.adults };
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">
          Flights
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Search airports, then explore available offers
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-1">
          {/* Trip type */}
          <div className="relative" ref={tripMenu.ref}>
            <button
              type="button"
              className={`${menuBtn} ${tripMenu.open ? 'bg-white ring-1 ring-blue-200' : ''}`}
              onClick={() => tripMenu.setOpen((v) => !v)}
            >
              <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400" />
              {tripType === 'round' ? 'Round trip' : 'One way'}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {tripMenu.open && (
              <ul className="absolute left-0 z-30 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {[
                  { value: 'round', label: 'Round trip' },
                  { value: 'oneway', label: 'One way' },
                ].map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                        tripType === opt.value
                          ? 'bg-blue-50 font-medium text-blue-800'
                          : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setTripType(opt.value);
                        if (opt.value === 'oneway') setTravel({ returnDate: '' });
                        tripMenu.setOpen(false);
                      }}
                    >
                      <span className="w-4">
                        {tripType === opt.value && (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </span>
                      {opt.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Passengers */}
          <div className="relative" ref={paxMenu.ref}>
            <button
              type="button"
              className={`${menuBtn} ${paxMenu.open ? 'bg-white ring-1 ring-blue-200' : ''}`}
              onClick={() => {
                setDraftPax({
                  adults: t.adults ?? 1,
                  children: t.children ?? 0,
                  infantsInSeat: t.infantsInSeat ?? 0,
                  infantsOnLap: t.infantsOnLap ?? 0,
                });
                paxMenu.setOpen((v) => !v);
              }}
            >
              <Users className="h-3.5 w-3.5 text-slate-400" />
              {paxTotal}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {paxMenu.open && (
              <div className="absolute left-0 z-30 mt-1 w-[280px] rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                {[
                  { key: 'adults', label: 'Adults', sub: '', min: 1 },
                  {
                    key: 'children',
                    label: 'Children',
                    sub: 'Aged 2–11',
                    min: 0,
                  },
                  {
                    key: 'infantsInSeat',
                    label: 'Infants',
                    sub: 'In seat',
                    min: 0,
                  },
                  {
                    key: 'infantsOnLap',
                    label: 'Infants',
                    sub: 'On lap',
                    min: 0,
                  },
                ].map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {row.label}
                      </p>
                      {row.sub && (
                        <p className="text-[11px] text-slate-400">{row.sub}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30"
                        disabled={draftPax[row.key] <= row.min}
                        onClick={() => bump(row.key, -1, row.min)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold tabular-nums">
                        {draftPax[row.key]}
                      </span>
                      <button
                        type="button"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600"
                        onClick={() => bump(row.key, 1, row.min)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="mt-2 flex justify-end gap-3 border-t border-slate-100 pt-2">
                  <button
                    type="button"
                    className="text-sm font-medium text-slate-500"
                    onClick={() => paxMenu.setOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="text-sm font-semibold text-blue-600"
                    onClick={() => {
                      syncPaxTravel(draftPax);
                      paxMenu.setOpen(false);
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cabin */}
          <div className="relative" ref={cabinMenu.ref}>
            <button
              type="button"
              className={`${menuBtn} ${cabinMenu.open ? 'bg-white ring-1 ring-blue-200' : ''}`}
              onClick={() => cabinMenu.setOpen((v) => !v)}
            >
              {CABIN_CLASSES.find((c) => c.value === t.cabinClass)?.label ||
                'Economy'}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
            {cabinMenu.open && (
              <ul className="absolute left-0 z-30 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                {CABIN_CLASSES.map((c) => (
                  <li key={c.value}>
                    <button
                      type="button"
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                        t.cabinClass === c.value
                          ? 'bg-blue-50 font-medium text-blue-800'
                          : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setTravel({ cabinClass: c.value });
                        cabinMenu.setOpen(false);
                      }}
                    >
                      <span className="w-4">
                        {t.cabinClass === c.value && (
                          <Check className="h-3.5 w-3.5" />
                        )}
                      </span>
                      {c.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
          <div className="relative grid min-w-0 flex-1 gap-2 sm:grid-cols-[1fr_auto_1fr]">
            <AirportAutocomplete
              id="from-airport"
              label="From"
              placeholder="Where from?"
              valueIata={t.from}
              valueLabel={t.fromLabel || ''}
              inputClassName={fieldClass}
              showPin
              onSelect={(p) =>
                setTravel({ from: p.iataCode, fromLabel: p.label })
              }
              onClear={() => setTravel({ from: '', fromLabel: '' })}
            />
            <div className="flex items-end justify-center pb-1">
              <button
                type="button"
                onClick={swapAirports}
                title="Swap airports"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-300 hover:text-blue-600"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </button>
            </div>
            <AirportAutocomplete
              id="to-airport"
              label="To"
              placeholder="Where to?"
              valueIata={t.to}
              valueLabel={t.toLabel || ''}
              inputClassName={fieldClass}
              showPin
              onSelect={(p) => setTravel({ to: p.iataCode, toLabel: p.label })}
              onClear={() => setTravel({ to: '', toLabel: '' })}
            />
          </div>

          <div className="min-w-0 flex-1 lg:max-w-md">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Dates
            </span>
            <FlightDatePicker
              tripType={tripType}
              departureDate={t.departureDate || ''}
              returnDate={t.returnDate || ''}
              minDate={todayLocalISO()}
              onChange={({ departureDate, returnDate }) =>
                setTravel({
                  departureDate: departureDate || '',
                  returnDate: returnDate || '',
                })
              }
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-between">
          <button
            type="button"
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => dispatch(setWizardStep(0))}
          >
            Back
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {KIWI_EXT_ENABLED && (
              <>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={openKiwi}
                  title="Opens Kiwi.com — search there, then Send to CRM"
                >
                  Open Kiwi
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={openGoogleFlights}
                  title="Opens Google Flights — search there, then Send to CRM"
                >
                  Open Google Flights
                </button>
              </>
            )}
            <button
              type="button"
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              onClick={handleSearch}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {isLoading ? 'Searching…' : 'Explore'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StepSearch;
