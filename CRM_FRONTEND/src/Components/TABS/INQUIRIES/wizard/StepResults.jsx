import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';

const KIWI_EXT_ENABLED =
  String(import.meta.env.VITE_ENABLE_KIWI_EXT || '').toLowerCase() === 'true';

const sourceLabel = (source) => {
  if (source === 'duffel') return 'Duffel (live)';
  if (source === 'flightmcp') return 'Flight MCP';
  if (source === 'kiwi') return 'Kiwi (extension)';
  if (source === 'google') return 'Google Flights';
  return 'Mock';
};

const StepResults = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const offers = useSelector((s) => s.search.lastResults) || [];
  const source = useSelector((s) => s.search.source);
  const meta = useSelector((s) => s.search.meta);

  const selectOffer = (offer) => {
    dispatch(
      patchWizard({
        selectedOffer: offer,
        costPrice: offer.costPrice,
        currency: offer.currency || 'USD',
      })
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-slate-800">Results</h3>
        {source && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              source === 'duffel' || source === 'flightmcp'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : source === 'kiwi' || source === 'google'
                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            Source: {sourceLabel(source)}
            {typeof meta?.offerCount === 'number'
              ? ` · ${meta.offerCount} offer(s)`
              : ''}
          </span>
        )}
      </div>

      {KIWI_EXT_ENABLED && (source === 'kiwi' || source === 'google') && (
        <p className="text-[11px] text-emerald-700">
          Captured from {source === 'google' ? 'Google Flights' : 'Kiwi'} —
          review markup, then Select to continue.
        </p>
      )}

      {!offers.length && (
        <p className="rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500">
          No offers returned
          {meta?.from && meta?.to
            ? ` for ${meta.from} → ${meta.to} on ${meta.departureDate}`
            : ''}
          . Try API search, or capture via Kiwi / Google Flights extension if
          enabled.
        </p>
      )}

      <div className="space-y-3">
        {offers.map((offer) => {
          const selected = wizard.selectedOffer?.id === offer.id;
          const finalPrice =
            Number(offer.costPrice || 0) + Number(wizard.markup || 0);
          return (
            <div
              key={offer.id}
              className={`rounded-lg border p-4 ${
                selected ? 'border-slate-900' : 'border-slate-200'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex gap-3 min-w-0">
                  {(offer.airline?.logoSymbolUrl ||
                    offer.airline?.logoLockupUrl) && (
                    <img
                      src={
                        offer.airline.logoSymbolUrl ||
                        offer.airline.logoLockupUrl
                      }
                      alt={offer.airline?.name || 'Airline'}
                      className="h-8 w-8 object-contain shrink-0 rounded border border-slate-100 bg-white"
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium">
                      {offer.airline?.name} {offer.flightNumber}
                    </p>
                    <p className="text-sm text-slate-600">
                      {offer.departure?.airport} {offer.departure?.at} →{' '}
                      {offer.arrival?.airport} {offer.arrival?.at}
                    </p>
                    <p className="text-xs text-slate-500">
                      {offer.duration}
                      {offer.duration ? ' · ' : ''}
                      {offer.stops} stop(s)
                    </p>
                    {wizard.travel?.from && wizard.travel?.to && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Trip: {wizard.travel.from} → {wizard.travel.to}
                        {wizard.travel.departureDate
                          ? ` · ${wizard.travel.departureDate}`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p>
                    Supplier: {offer.currency}{' '}
                    {Number(offer.costPrice).toFixed(2)}
                  </p>
                  <label className="mt-1 flex items-center justify-end gap-2">
                    Markup
                    <input
                      type="number"
                      min={0}
                      className="w-24 rounded border px-2 py-1"
                      value={wizard.markup}
                      onChange={(e) =>
                        dispatch(
                          patchWizard({ markup: Number(e.target.value) })
                        )
                      }
                      onFocus={() => selectOffer(offer)}
                    />
                  </label>
                  <p className="mt-1 text-base font-semibold">
                    Final: {offer.currency} {finalPrice.toFixed(2)}
                  </p>
                  <button
                    type="button"
                    className="mt-2 rounded-md bg-slate-900 px-3 py-1.5 text-xs text-white"
                    onClick={() => {
                      selectOffer(offer);
                      dispatch(setWizardStep(3));
                    }}
                  >
                    Select
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="rounded-md border px-4 py-2 text-sm"
        onClick={() => dispatch(setWizardStep(1))}
      >
        Back
      </button>
    </div>
  );
};

export default StepResults;
