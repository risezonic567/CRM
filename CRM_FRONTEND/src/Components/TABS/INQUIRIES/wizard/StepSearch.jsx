import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
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

const KIWI_EXT_ENABLED =
  String(import.meta.env.VITE_ENABLE_KIWI_EXT || '').toLowerCase() === 'true';

/** Today as YYYY-MM-DD in local calendar (no UTC shift) */
function todayLocalISO() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const StepSearch = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const t = wizard.travel;
  const [searchFlights, { isLoading }] = useSearchFlightsMutation();

  const setTravel = (patch) =>
    dispatch(patchWizard({ travel: { ...t, ...patch } }));

  const handleSearch = async () => {
    if (!t.from || !t.to || !t.departureDate || !t.passengers) {
      toast.error('Select From, To, date, and passengers');
      return;
    }
    if (t.from === t.to) {
      toast.error('From and To must be different');
      return;
    }

    try {
      const res = await searchFlights({
        from: t.from.toUpperCase(),
        to: t.to.toUpperCase(),
        departureDate: t.departureDate, // already YYYY-MM-DD from <input type="date">
        returnDate: t.returnDate || null,
        passengers: t.passengers,
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
          `No flights from Duffel for ${t.from} → ${t.to} on ${t.departureDate}`,
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
    // Staff searches on Google Flights; Send to CRM fills wizard (same bridge as Kiwi).
    window.open(
      'https://www.google.com/travel/flights?gl=IN&hl=en',
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-slate-800">Flight search</h3>
      <p className="text-xs text-slate-500">
        Type city/airport name 
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <AirportAutocomplete
          id="from-airport"
          label="From *"
          placeholder="e.g. Delhi or DEL"
          valueIata={t.from}
          valueLabel={t.fromLabel || ''}
          onSelect={(p) =>
            setTravel({ from: p.iataCode, fromLabel: p.label })
          }
          onClear={() => setTravel({ from: '', fromLabel: '' })}
        />
        <AirportAutocomplete
          id="to-airport"
          label="To *"
          placeholder="e.g. Mumbai or BOM"
          valueIata={t.to}
          valueLabel={t.toLabel || ''}
          onSelect={(p) => setTravel({ to: p.iataCode, toLabel: p.label })}
          onClear={() => setTravel({ to: '', toLabel: '' })}
        />
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-slate-600">
            Departure date *
          </span>
          <input
            type="date"
            min={todayLocalISO()}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={t.departureDate || ''}
            onChange={(e) => setTravel({ departureDate: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-slate-600">
            Return date (optional)
          </span>
          <input
            type="date"
            min={t.departureDate || todayLocalISO()}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={t.returnDate || ''}
            onChange={(e) => setTravel({ returnDate: e.target.value || '' })}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-slate-600">Passengers *</span>
          <input
            type="number"
            min={1}
            max={9}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={t.passengers}
            onChange={(e) =>
              setTravel({ passengers: Number(e.target.value) || 1 })
            }
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-slate-600">Cabin</span>
          <select
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={t.cabinClass}
            onChange={(e) => setTravel({ cabinClass: e.target.value })}
          >
            {CABIN_CLASSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-md border px-4 py-2 text-sm"
          onClick={() => dispatch(setWizardStep(0))}
        >
          Back
        </button>
        <button
          type="button"
          disabled={isLoading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
          onClick={handleSearch}
        >
          {isLoading ? 'Searching…' : 'Search Flights'}
        </button>
        {KIWI_EXT_ENABLED && (
          <>
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
              onClick={openKiwi}
              title="Opens Kiwi.com — search there, then Send to CRM"
            >
              Open Kiwi (extension)
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
              onClick={openGoogleFlights}
              title="Opens Google Flights — search there, then Send to CRM"
            >
              Open Google Flights
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default StepSearch;
