import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { Loader2, FileCode2 } from 'lucide-react';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import { useConvertPnrMutation } from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquiryApi';
import { getErrorMessage } from '../../../../utils/getErrorMessage';
import {
  mapPnrToOffer,
  travelPatchFromPnr,
} from '../../../../utils/mapPnrToOffer';
import PnrItineraryTable from './PnrItineraryTable';

const SAMPLE_HINT = `2 NZ 456 H 26OCT 5 WLGAKL HK1 1945 2050 26OCT E NZ/W268NH
3 NZ 002 W 26OCT 5 AKLLAX HK1 2250 1500 26OCT E NZ/W268NH`;

const StepPnrSearch = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const [rawText, setRawText] = useState(wizard.pnrRaw || '');
  const [itinerary, setItinerary] = useState(() =>
    wizard.pnrSegments?.length
      ? {
          rawText: wizard.pnrRaw || '',
          segments: wizard.pnrSegments,
          tripSummary: wizard.pnrTripSummary || null,
          warnings: wizard.pnrWarnings || [],
          source: wizard.selectedOffer?.raw?.decodeSource,
        }
      : null
  );
  const [convertPnr, { isLoading }] = useConvertPnrMutation();

  const handleConvert = async () => {
    if (!rawText.trim()) {
      toast.error('Paste at least one GDS air segment line');
      return;
    }
    try {
      const res = await convertPnr({ rawText }).unwrap();
      const decoded = res?.data?.itinerary;
      if (!decoded?.segments?.length) {
        toast.error('No segments decoded');
        return;
      }
      setItinerary(decoded);
      dispatch(
        patchWizard({
          pnrRaw: decoded.rawText || rawText,
          pnrSegments: decoded.segments,
          pnrTripSummary: decoded.tripSummary || null,
          pnrWarnings: decoded.warnings || [],
        })
      );
      const warnCount = decoded.warnings?.length || 0;
      toast.success(
        warnCount
          ? `Decoded ${decoded.segments.length} segment(s) · ${warnCount} warning(s)`
          : `Decoded ${decoded.segments.length} segment(s)`
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to decode PNR'));
    }
  };

  const handleContinue = () => {
    if (!itinerary?.segments?.length) {
      toast.error('Convert the itinerary before continuing');
      return;
    }
    const travelPatch = travelPatchFromPnr(itinerary, wizard.travel || {});
    const offer = mapPnrToOffer(itinerary, {
      costPrice: wizard.costPrice || 0,
      currency: wizard.currency || 'USD',
    });
    dispatch(
      patchWizard({
        travel: { ...(wizard.travel || {}), ...travelPatch },
        selectedOffer: offer,
        pnrRaw: itinerary.rawText || rawText,
        pnrSegments: itinerary.segments,
        pnrTripSummary: itinerary.tripSummary || null,
        pnrWarnings: itinerary.warnings || [],
      })
    );
    dispatch(setWizardStep(2));
  };

  const summary = itinerary?.tripSummary;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-bold text-slate-900">Paste GDS itinerary</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Paste Galileo / Sabre / Amadeus air segments (one line per flight). Multi-segment
          supported. Decoding uses the local parser until a PNR Converter API key is configured.
        </p>
      </div>

      <textarea
        className="min-h-[160px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:outline-none"
        placeholder={SAMPLE_HINT}
        value={rawText}
        onChange={(e) => setRawText(e.target.value)}
        spellCheck={false}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isLoading}
          onClick={handleConvert}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileCode2 className="h-4 w-4" />
          )}
          {isLoading ? 'Decoding…' : 'Convert'}
        </button>
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
          onClick={() => dispatch(setWizardStep(0))}
        >
          Back
        </button>
      </div>

      {itinerary?.warnings?.length > 0 && (
        <ul className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 space-y-1">
          {itinerary.warnings.map((w, i) => (
            <li key={i}>
              {w.lineNumber != null ? `Line ${w.lineNumber}: ` : ''}
              {w.reason || w.line}
            </li>
          ))}
        </ul>
      )}

      {itinerary?.segments?.length > 0 && (
        <div className="flex flex-col gap-3">
          {summary && (
            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-900">
                {summary.origin || '—'} → {summary.destination || '—'}
              </span>
              {' · '}
              {summary.segmentCount} segment(s)
              {summary.departureDate ? ` · dep ${summary.departureDate}` : ''}
              {summary.returnDate ? ` · ret ${summary.returnDate}` : ''}
              {itinerary.source ? (
                <span className="ml-2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">
                  {itinerary.source}
                </span>
              ) : null}
            </p>
          )}
          <PnrItineraryTable segments={itinerary.segments} />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleContinue}
              className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Continue to pricing
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepPnrSearch;
