import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import { useSearchFlightsMutation } from '../../../../REDUX_FEATURES/REDUX_SLICES/Search_api/searchApi';
import { getErrorMessage } from '../../../../utils/getErrorMessage';
import FlightFilters, { applyFlightFilters } from './FlightFilters';
import FlightResultCard from './FlightResultCard';

const KIWI_EXT_ENABLED =
  String(import.meta.env.VITE_ENABLE_KIWI_EXT || '').toLowerCase() === 'true';

const sourceLabel = (source) => {
  if (source === 'duffel') return 'Duffel (live)';
  if (source === 'flightmcp') return 'Flight MCP';
  if (source === 'serpapi') return 'Google Flights (SerpApi)';
  if (source === 'kiwi') return 'Kiwi (extension)';
  if (source === 'google') return 'Google Flights (extension)';
  return 'Mock';
};

const sourceBadgeClass = (source) => {
  if (source === 'duffel' || source === 'flightmcp' || source === 'serpapi') {
    return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
  }
  if (source === 'kiwi' || source === 'google') {
    return 'bg-sky-50 text-sky-800 border border-sky-200';
  }
  return 'bg-amber-50 text-amber-800 border border-amber-200';
};

function legSnapshot(offer) {
  if (!offer) return null;
  return {
    id: offer.id,
    airline: offer.airline,
    flightNumber: offer.flightNumber,
    departure: offer.departure,
    arrival: offer.arrival,
    duration: offer.duration,
    stops: offer.stops,
    cabinClass: offer.cabinClass,
    costPrice: offer.costPrice,
    currency: offer.currency,
    raw: offer.raw,
  };
}

/** Final CRM offer — one-way or round itinerary (backward-compatible top-level fields). */
function buildItineraryOffer({ outbound, inbound, tripType }) {
  const priceSource = inbound || outbound;
  return {
    id: inbound
      ? `rt_${outbound.id}_${inbound.id}`
      : outbound.id,
    tripType,
    airline: outbound.airline,
    flightNumber: outbound.flightNumber,
    departure: outbound.departure,
    arrival: outbound.arrival,
    duration: outbound.duration,
    stops: outbound.stops,
    cabinClass: outbound.cabinClass,
    costPrice: Number(priceSource?.costPrice) || 0,
    currency: priceSource?.currency || outbound.currency || 'USD',
    expiresAt: null,
    outbound: legSnapshot(outbound),
    inbound: inbound ? legSnapshot(inbound) : null,
    raw: {
      outbound: outbound.raw,
      inbound: inbound?.raw || null,
    },
  };
}

const EMPTY_OFFERS = [];

const StepResults = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  // Stable fallback — `|| []` creates a new array every render → infinite useEffect loop
  const offers = useSelector((s) => s.search.lastResults) ?? EMPTY_OFFERS;
  const source = useSelector((s) => s.search.source);
  const meta = useSelector((s) => s.search.meta);
  const [searchFlights, { isLoading: loadingReturn }] =
    useSearchFlightsMutation();

  const isRoundTrip = Boolean(wizard.travel?.returnDate);
  const [phase, setPhase] = useState('departing');
  const [outboundOffer, setOutboundOffer] = useState(null);
  const [returnOffers, setReturnOffers] = useState([]);

  const [filters, setFilters] = useState({
    sort: 'price_asc',
    stops: 'any',
    airlines: [],
    maxPrice: undefined,
  });

  // Reset RT phase only when the outbound search identity changes (not array ref noise)
  const outboundSearchKey =
    meta?.requestId ||
    `${meta?.from || ''}-${meta?.to || ''}-${meta?.departureDate || ''}-${meta?.returnDate || ''}-${offers.length}`;

  useEffect(() => {
    setPhase('departing');
    setOutboundOffer(null);
    setReturnOffers([]);
  }, [outboundSearchKey]);
  const listForPhase =
    phase === 'returning' ? returnOffers : offers;

  const filtered = useMemo(
    () => applyFlightFilters(listForPhase, filters),
    [listForPhase, filters]
  );

  const selectOffer = (offer) => {
    dispatch(
      patchWizard({
        selectedOffer: offer,
        costPrice: offer.costPrice,
        currency: offer.currency || 'USD',
      })
    );
  };

  const finalize = (itinerary) => {
    selectOffer(itinerary);
    dispatch(setWizardStep(3));
  };

  const handleSelect = async (offer) => {
    if (!isRoundTrip) {
      finalize(
        buildItineraryOffer({
          outbound: offer,
          inbound: null,
          tripType: 'oneway',
        })
      );
      return;
    }

    // Duffel (and similar): full RT already on offer.inbound
    if (phase === 'departing' && offer.inbound) {
      finalize(
        buildItineraryOffer({
          outbound: offer,
          inbound: {
            ...offer.inbound,
            costPrice: offer.costPrice,
            currency: offer.currency,
            id: `${offer.id}_inbound`,
          },
          tripType: 'round',
        })
      );
      return;
    }

    if (phase === 'departing') {
      const token = offer.departureToken;
      if (!token) {
        toast.error(
          'Return flights unavailable for this offer. Try another departing flight or provider.'
        );
        return;
      }
      try {
        const t = wizard.travel || {};
        const res = await searchFlights({
          from: t.from,
          to: t.to,
          departureDate: t.departureDate,
          returnDate: t.returnDate,
          passengers: t.passengers || 1,
          adults: t.adults ?? t.passengers ?? 1,
          children: t.children ?? 0,
          infantsInSeat: t.infantsInSeat ?? 0,
          infantsOnLap: t.infantsOnLap ?? 0,
          cabinClass: t.cabinClass,
          departureToken: token,
        }).unwrap();

        const next = res.data?.offers || [];
        if (!next.length) {
          toast.error('No return flights for this departing option');
          return;
        }
        setOutboundOffer(offer);
        setReturnOffers(next);
        setPhase('returning');
        setFilters({
          sort: 'price_asc',
          stops: 'any',
          airlines: [],
          maxPrice: undefined,
        });
        toast.success('Choose a return flight');
      } catch (err) {
        toast.error(getErrorMessage(err, 'Return search failed'));
      }
      return;
    }

    if (phase === 'returning' && outboundOffer) {
      finalize(
        buildItineraryOffer({
          outbound: outboundOffer,
          inbound: offer,
          tripType: 'round',
        })
      );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-900">
            {phase === 'returning'
              ? 'Choose return flight'
              : isRoundTrip
                ? 'Choose departing flight'
                : 'Results'}
          </h3>
          {phase === 'returning' && outboundOffer && (
            <p className="text-xs text-slate-500">
              Departing {outboundOffer.departure?.airport} →{' '}
              {outboundOffer.arrival?.airport} ·{' '}
              {outboundOffer.airline?.name} {outboundOffer.flightNumber}
              <button
                type="button"
                className="ml-2 font-medium text-blue-600 hover:underline"
                onClick={() => {
                  setPhase('departing');
                  setOutboundOffer(null);
                  setReturnOffers([]);
                }}
              >
                Change departing
              </button>
            </p>
          )}
        </div>
        {source && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sourceBadgeClass(source)}`}
          >
            Source: {sourceLabel(source)}
            {typeof meta?.offerCount === 'number' && phase === 'departing'
              ? ` · ${meta.offerCount} offer(s)`
              : ''}
            {listForPhase.length
              ? ` · showing ${filtered.length}`
              : ''}
          </span>
        )}
      </div>

      {KIWI_EXT_ENABLED && (source === 'kiwi' || source === 'google') && (
        <p className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          Captured from {source === 'google' ? 'Google Flights' : 'Kiwi'}
          {meta?.fromExtension
            ? ' — for full flight no / bags / seat info, open the itinerary on Kiwi then use “Send details to CRM”'
            : ''}
          . Review price/markup, then Select to continue.
        </p>
      )}

      {!offers.length ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
          No offers returned
          {meta?.from && meta?.to
            ? ` for ${meta.from} → ${meta.to} on ${meta.departureDate}`
            : ''}
          . Try API search, or capture via Kiwi / Google Flights extension if
          enabled.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[240px_1fr] lg:items-start">
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:self-start">
            <FlightFilters
              offers={listForPhase}
              filters={filters}
              onChange={setFilters}
            />
          </div>
          <div className="relative min-w-0 space-y-3">
            {loadingReturn && (
              <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading return flights…
              </div>
            )}
            {!filtered.length && !loadingReturn && (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                No flights match these filters. Clear filters to see all{' '}
                {listForPhase.length} offer(s).
              </p>
            )}
            {filtered.map((offer) => (
              <FlightResultCard
                key={offer.id}
                offer={offer}
                selected={wizard.selectedOffer?.id === offer.id}
                markup={wizard.markup}
                onMarkupChange={(markup) =>
                  dispatch(patchWizard({ markup }))
                }
                onFocusMarkup={(o) => {
                  if (phase === 'departing' && !isRoundTrip) selectOffer(o);
                }}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
        onClick={() => {
          if (phase === 'returning') {
            setPhase('departing');
            setOutboundOffer(null);
            setReturnOffers([]);
            return;
          }
          dispatch(setWizardStep(1));
        }}
      >
        Back
      </button>
    </div>
  );
};

export default StepResults;
