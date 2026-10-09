import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  Minus,
  Plus,
  Trash2,
  Users,
} from 'lucide-react';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import { CABIN_CLASSES } from '../../../../constants/dispositions';
import {
  buildManualItineraryFromLegs,
  mapManualToOffer,
  travelPatchFromManualItinerary,
} from '../../../../utils/mapManualToOffer';
import AirportAutocomplete from './AirportAutocomplete';
import FlightDatePicker from './FlightDatePicker';
import PnrItineraryTable from './PnrItineraryTable';

const MAX_CONNECTIONS = 3; // max segments per direction (direct + 2 stops)

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

const legFieldClass =
  'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-900 outline-none focus:border-sky-600';

const labelClass = 'mb-0.5 block text-[11px] font-medium text-slate-500';

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

const emptySegment = () => ({
  from: '',
  fromLabel: '',
  to: '',
  toLabel: '',
  airlineCode: '',
  airlineName: '',
  flightNumber: '',
  bookingClass: '',
  departureTime: '',
  arrivalTime: '',
  arrivalDate: '',
  duration: '',
  layover: '',
});

function segmentFromSaved(seg) {
  if (!seg) return emptySegment();
  const layover =
    seg.layoverLabel ||
    (String(seg.operatingInfo || '').startsWith('Layover ')
      ? String(seg.operatingInfo).replace(/^Layover\s+/i, '')
      : '');
  return {
    from: seg.from || '',
    fromLabel: seg.from || '',
    to: seg.to || '',
    toLabel: seg.to || '',
    airlineCode: seg.airlineCode || '',
    airlineName: seg.airlineName || '',
    flightNumber: seg.flightNumber || '',
    bookingClass: seg.bookingClass || '',
    departureTime: seg.departureTime || '',
    arrivalTime: seg.arrivalTime || '',
    arrivalDate: seg.arrivalDate || '',
    duration:
      seg.durationLabel ||
      (seg.durationMinutes != null
        ? `${Math.floor(seg.durationMinutes / 60)}h ${String(
            seg.durationMinutes % 60
          ).padStart(2, '0')}m`
        : ''),
    layover,
  };
}

function wizardOutboundCount(segs, travel, tripType) {
  if (tripType !== 'round' || !travel?.returnDate) return segs.length;
  const byDate = segs.filter((s) => s.departureDate !== travel.returnDate);
  const ret = segs.filter((s) => s.departureDate === travel.returnDate);
  if (byDate.length && ret.length) return byDate.length;
  const dest = String(travel.to || '').toUpperCase();
  if (dest) {
    for (let i = 0; i < segs.length; i += 1) {
      if (String(segs[i].to || '').toUpperCase() === dest) return i + 1;
    }
  }
  return Math.max(1, Math.ceil(segs.length / 2));
}

function FlightSegmentFields({
  title,
  segment,
  onChange,
  showLayover,
  canRemove,
  onRemove,
  lockFrom,
  lockTo,
  fromHint,
  toHint,
}) {
  const set = (field) => (e) => onChange({ ...segment, [field]: e.target.value });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-slate-800">{title}</p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        )}
      </div>

      <div className="mb-2 grid gap-2 sm:grid-cols-2">
        <AirportAutocomplete
          id={`seg-from-${title}`}
          label={lockFrom ? 'From (trip origin)' : 'From *'}
          placeholder={fromHint || 'Airport'}
          valueIata={segment.from || (lockFrom ? fromHint : '') || ''}
          valueLabel={
            segment.fromLabel ||
            segment.from ||
            (lockFrom ? fromHint : '') ||
            ''
          }
          inputClassName={legFieldClass}
          onSelect={(p) =>
            onChange({
              ...segment,
              from: p.iataCode,
              fromLabel: p.label,
            })
          }
          onClear={() =>
            onChange({
              ...segment,
              from: lockFrom ? segment.from : '',
              fromLabel: lockFrom ? segment.fromLabel : '',
            })
          }
        />
        <AirportAutocomplete
          id={`seg-to-${title}`}
          label={lockTo ? 'To (trip destination)' : 'To *'}
          placeholder={toHint || 'Airport'}
          valueIata={segment.to || (lockTo ? toHint : '') || ''}
          valueLabel={
            segment.toLabel || segment.to || (lockTo ? toHint : '') || ''
          }
          inputClassName={legFieldClass}
          onSelect={(p) =>
            onChange({
              ...segment,
              to: p.iataCode,
              toLabel: p.label,
            })
          }
          onClear={() =>
            onChange({
              ...segment,
              to: lockTo ? segment.to : '',
              toLabel: lockTo ? segment.toLabel : '',
            })
          }
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className={labelClass}>Airline code *</label>
          <input
            className={legFieldClass}
            maxLength={3}
            placeholder="F9"
            value={segment.airlineCode}
            onChange={set('airlineCode')}
          />
        </div>
        <div>
          <label className={labelClass}>Airline name</label>
          <input
            className={legFieldClass}
            placeholder="Frontier"
            value={segment.airlineName}
            onChange={set('airlineName')}
          />
        </div>
        <div>
          <label className={labelClass}>Flight # *</label>
          <input
            className={legFieldClass}
            placeholder="2135"
            value={segment.flightNumber}
            onChange={set('flightNumber')}
          />
        </div>
        <div>
          <label className={labelClass}>Class</label>
          <input
            className={legFieldClass}
            maxLength={2}
            placeholder="Y"
            value={segment.bookingClass}
            onChange={set('bookingClass')}
          />
        </div>
        <div>
          <label className={labelClass}>Dep time *</label>
          <input
            className={legFieldClass}
            placeholder="09:47"
            value={segment.departureTime}
            onChange={set('departureTime')}
          />
        </div>
        <div>
          <label className={labelClass}>Arr time *</label>
          <input
            className={legFieldClass}
            placeholder="12:19"
            value={segment.arrivalTime}
            onChange={set('arrivalTime')}
          />
        </div>
        <div>
          <label className={labelClass}>Arr date</label>
          <input
            type="date"
            className={legFieldClass}
            value={segment.arrivalDate}
            onChange={set('arrivalDate')}
          />
        </div>
        <div>
          <label className={labelClass}>Duration *</label>
          <input
            className={legFieldClass}
            placeholder="3h 32m"
            value={segment.duration}
            onChange={set('duration')}
          />
        </div>
        {showLayover && (
          <div className="sm:col-span-2 lg:col-span-4">
            <label className={labelClass}>Layover before next flight</label>
            <input
              className={legFieldClass}
              placeholder="1h 19m"
              value={segment.layover}
              onChange={set('layover')}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DirectionBlock({
  title,
  segments,
  onChange,
  tripFrom,
  tripTo,
  tripFromLabel,
  tripToLabel,
}) {
  const updateAt = (index, next) => {
    onChange(segments.map((s, i) => (i === index ? next : s)));
  };

  const addConnection = () => {
    if (segments.length >= MAX_CONNECTIONS) {
      toast.error(`Max ${MAX_CONNECTIONS} flights per direction`);
      return;
    }
    const last = segments[segments.length - 1] || emptySegment();
    // previous last was going to trip destination — new last takes destination;
    // new middle inherits previous "to" as its from if set
    const inserted = {
      ...emptySegment(),
      from: last.to || '',
      fromLabel: last.toLabel || last.to || '',
    };
    const prevLast = {
      ...last,
      to: last.to && last.to !== tripTo ? last.to : '',
      toLabel: last.to && last.to !== tripTo ? last.toLabel : '',
    };
    onChange([
      ...segments.slice(0, -1),
      prevLast,
      inserted,
    ]);
  };

  const removeAt = (index) => {
    if (segments.length <= 1) return;
    onChange(segments.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        <button
          type="button"
          onClick={addConnection}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add connection
        </button>
      </div>
      <p className="text-[11px] text-slate-500">
        Direct = one flight. Connecting = add stop (e.g. MIA→DFW then DFW→LAX).
      </p>
      {segments.map((seg, index) => {
        const isFirst = index === 0;
        const isLast = index === segments.length - 1;
        return (
          <FlightSegmentFields
            key={`${title}-${index}`}
            title={
              segments.length === 1
                ? 'Flight'
                : `Flight ${index + 1}${isLast ? ' (to destination)' : ''}`
            }
            segment={seg}
            onChange={(next) => updateAt(index, next)}
            showLayover={!isLast}
            canRemove={segments.length > 1}
            onRemove={() => removeAt(index)}
            lockFrom={isFirst}
            lockTo={isLast}
            fromHint={isFirst ? tripFromLabel || tripFrom : ''}
            toHint={isLast ? tripToLabel || tripTo : ''}
          />
        );
      })}
    </div>
  );
}

const StepManualFlight = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const t = wizard.travel || {};
  const savedSegs =
    wizard.selectedOffer?.raw?.source === 'manual'
      ? wizard.selectedOffer.raw.segments || []
      : wizard.pnrSegments || [];

  const initialTrip = t.returnDate ? 'round' : 'oneway';
  const savedSplit = (() => {
    if (!savedSegs.length) {
      return { outbound: [emptySegment()], inbound: [emptySegment()] };
    }
    const summaryCount =
      wizard.pnrTripSummary?.outboundSegmentCount ??
      wizard.selectedOffer?.raw?.tripSummary?.outboundSegmentCount;
    let outCount;
    if (summaryCount && summaryCount > 0) {
      outCount = summaryCount;
    } else {
      outCount = wizardOutboundCount(savedSegs, t, initialTrip);
    }
    return {
      outbound: savedSegs.slice(0, outCount).map(segmentFromSaved),
      inbound:
        initialTrip === 'round' && savedSegs.length > outCount
          ? savedSegs.slice(outCount).map(segmentFromSaved)
          : [emptySegment()],
    };
  })();

  const [tripType, setTripType] = useState(initialTrip);
  const [outboundSegments, setOutboundSegments] = useState(
    () => savedSplit.outbound
  );
  const [inboundSegments, setInboundSegments] = useState(
    () => savedSplit.inbound
  );
  const [preview, setPreview] = useState(() =>
    savedSegs.length
      ? {
          segments: savedSegs,
          tripSummary: wizard.pnrTripSummary || null,
        }
      : null
  );
  const tripMenu = useMenu();
  const paxMenu = useMenu();
  const cabinMenu = useMenu();
  const [draftPax, setDraftPax] = useState({
    adults: t.adults ?? 1,
    children: t.children ?? 0,
    infantsInSeat: t.infantsInSeat ?? 0,
    infantsOnLap: t.infantsOnLap ?? 0,
  });

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

  const validateSegment = (seg, label, { needFrom, needTo, tripFrom, tripTo }) => {
    const from = (seg.from || (needFrom ? tripFrom : '') || '').trim();
    const to = (seg.to || (needTo ? tripTo : '') || '').trim();
    if (!from || !to) {
      toast.error(`${label}: from / to airports required`);
      return false;
    }
    if (from.toUpperCase() === to.toUpperCase()) {
      toast.error(`${label}: from and to must differ`);
      return false;
    }
    if (!seg.airlineCode?.trim() || !seg.flightNumber?.trim()) {
      toast.error(`${label}: airline code and flight number required`);
      return false;
    }
    if (!seg.departureTime?.trim() || !seg.arrivalTime?.trim()) {
      toast.error(`${label}: departure and arrival times required`);
      return false;
    }
    if (!seg.duration?.trim()) {
      toast.error(`${label}: duration required`);
      return false;
    }
    return true;
  };

  const validate = () => {
    const adults = t.adults ?? t.passengers ?? 1;
    if (!t.from || !t.to || !t.departureDate) {
      toast.error('Select From, To, and departure date');
      return false;
    }
    if (t.from === t.to) {
      toast.error('From and To must be different');
      return false;
    }
    if (adults < 1) {
      toast.error('At least 1 adult is required');
      return false;
    }
    if (tripType === 'round' && !t.returnDate) {
      toast.error('Select a return date for round trip');
      return false;
    }

    for (let i = 0; i < outboundSegments.length; i += 1) {
      const ok = validateSegment(outboundSegments[i], `Outbound flight ${i + 1}`, {
        needFrom: i === 0,
        needTo: i === outboundSegments.length - 1,
        tripFrom: t.from,
        tripTo: t.to,
      });
      if (!ok) return false;
    }

    if (tripType === 'round') {
      for (let i = 0; i < inboundSegments.length; i += 1) {
        const ok = validateSegment(inboundSegments[i], `Return flight ${i + 1}`, {
          needFrom: i === 0,
          needTo: i === inboundSegments.length - 1,
          tripFrom: t.to,
          tripTo: t.from,
        });
        if (!ok) return false;
      }
    }
    return true;
  };

  /** Apply locked trip endpoints onto first/last segment for mapping. */
  const withLockedAirports = (list, start, end) =>
    list.map((seg, i) => {
      const isFirst = i === 0;
      const isLast = i === list.length - 1;
      return {
        ...seg,
        from: isFirst ? start.iata || seg.from : seg.from,
        fromLabel: isFirst ? start.label || seg.fromLabel : seg.fromLabel,
        to: isLast ? end.iata || seg.to : seg.to,
        toLabel: isLast ? end.label || seg.toLabel : seg.toLabel,
      };
    });

  const buildItinerary = () => {
    const out = withLockedAirports(
      outboundSegments,
      { iata: t.from, label: t.fromLabel },
      { iata: t.to, label: t.toLabel }
    );
    const inn =
      tripType === 'round'
        ? withLockedAirports(
            inboundSegments,
            { iata: t.to, label: t.toLabel },
            { iata: t.from, label: t.fromLabel }
          )
        : [];
    return buildManualItineraryFromLegs({
      travel: t,
      tripType,
      outboundSegments: out,
      inboundSegments: inn,
    });
  };

  const handlePreview = () => {
    if (!validate()) return;
    const built = buildItinerary();
    setPreview(built);
    dispatch(
      patchWizard({
        pnrSegments: built.segments,
        pnrTripSummary: built.tripSummary,
        pnrWarnings: [],
        pnrRaw: '',
        itineraryEntryMode: 'manual',
      })
    );
    toast.success(`Preview · ${built.segments.length} flight(s)`);
  };

  const handleContinue = () => {
    if (!validate()) return;
    const built = buildItinerary();
    const travelPatch = travelPatchFromManualItinerary(built, t);
    const offer = mapManualToOffer(built, {
      costPrice: wizard.costPrice || 0,
      currency: wizard.currency || 'USD',
    });
    dispatch(
      patchWizard({
        travel: {
          ...t,
          ...travelPatch,
          returnDate: tripType === 'round' ? t.returnDate || '' : '',
        },
        selectedOffer: offer,
        pnrRaw: '',
        pnrSegments: built.segments,
        pnrTripSummary: built.tripSummary,
        pnrWarnings: [],
        itineraryEntryMode: 'manual',
      })
    );
    dispatch(setWizardStep(2));
  };

  const summary = preview?.tripSummary;
  const tableSegs = preview?.segments || [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-slate-900">
          Flight details
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">
          Choose route and dates, then enter each flight. Use Add connection for
          stops. Price is set on the next step.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex flex-wrap items-center gap-1">
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
                        setPreview(null);
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
                  { key: 'children', label: 'Children', sub: 'Aged 2–11', min: 0 },
                  { key: 'infantsInSeat', label: 'Infants', sub: 'In seat', min: 0 },
                  { key: 'infantsOnLap', label: 'Infants', sub: 'On lap', min: 0 },
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
              onSelect={(p) => {
                setPreview(null);
                setTravel({ from: p.iataCode, fromLabel: p.label });
              }}
              onClear={() => setTravel({ from: '', fromLabel: '' })}
            />
            <div className="flex items-end justify-center pb-1">
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  swapAirports();
                }}
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
              onSelect={(p) => {
                setPreview(null);
                setTravel({ to: p.iataCode, toLabel: p.label });
              }}
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
              onChange={({ departureDate, returnDate }) => {
                setPreview(null);
                setTravel({
                  departureDate: departureDate || '',
                  returnDate: returnDate || '',
                });
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <DirectionBlock
          title="Outbound"
          segments={outboundSegments}
          onChange={(next) => {
            setPreview(null);
            setOutboundSegments(next);
          }}
          tripFrom={t.from}
          tripTo={t.to}
          tripFromLabel={t.fromLabel}
          tripToLabel={t.toLabel}
        />
        {tripType === 'round' && (
          <DirectionBlock
            title="Return"
            segments={inboundSegments}
            onChange={(next) => {
              setPreview(null);
              setInboundSegments(next);
            }}
            tripFrom={t.to}
            tripTo={t.from}
            tripFromLabel={t.toLabel}
            tripToLabel={t.fromLabel}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePreview}
          className="rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          Update preview
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
          onClick={() => dispatch(setWizardStep(0))}
        >
          Back
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={handleContinue}
          className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          Continue to pricing
        </button>
      </div>

      {tableSegs.length > 0 && (
        <div className="flex flex-col gap-2">
          {summary && (
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">
                {summary.origin || '—'} → {summary.destination || '—'}
              </span>
              {summary.departureDate ? ` · dep ${summary.departureDate}` : ''}
              {summary.returnDate ? ` · ret ${summary.returnDate}` : ''}
              {` · ${tableSegs.length} flight(s)`}
            </p>
          )}
          <PnrItineraryTable segments={tableSegs} />
        </div>
      )}
    </div>
  );
};

export default StepManualFlight;
