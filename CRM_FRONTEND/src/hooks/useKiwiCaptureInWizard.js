import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  patchWizard,
  selectWizard,
  setWizardStep,
} from '../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquirySlice';
import { setSearchResults } from '../REDUX_FEATURES/REDUX_SLICES/Search_api/searchSlice';
import { useExtensionBridge } from './useExtensionBridge';
import {
  mapKiwiCaptureToOffer,
  travelPatchFromCapture,
} from '../utils/mapKiwiCaptureToOffer';

const KIWI_EXT_ENABLED =
  String(import.meta.env.VITE_ENABLE_KIWI_EXT || '').toLowerCase() === 'true';

/**
 * Wizard-level Kiwi capture — fills travel + full offer, then Select Flight.
 */
export function useKiwiCaptureInWizard() {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const offers = useSelector((s) => s.search.lastResults) || [];
  const meta = useSelector((s) => s.search.meta);
  const agencyDefaults = useSelector((s) => s.search.agencyDefaults);

  const onFlightCaptured = useCallback(
    (capture) => {
      if (!KIWI_EXT_ENABLED) return;

      const offer = mapKiwiCaptureToOffer(capture);
      const travelPatch = travelPatchFromCapture(capture, wizard.travel || {});
      const hasRoute = Boolean(travelPatch.from && travelPatch.to);
      const hasPriceOrTimes = Boolean(
        offer.costPrice || offer.departure?.at || offer.arrival?.at
      );

      const captureSource =
        capture?.captureSource || capture?.source || 'kiwi';
      const sourceLabel =
        captureSource === 'google' ? 'Google Flights' : 'Kiwi';

      if (!hasPriceOrTimes && !hasRoute) {
        toast.error(
          `${sourceLabel} capture empty — check extension console Extracted log`
        );
        return;
      }

      const prev = Array.isArray(offers) ? offers : [];
      const nextOffers = [
        offer,
        ...prev.filter((o) => o.id !== offer.id),
      ];

      const nextTravel = {
        ...(wizard.travel || {}),
        ...travelPatch,
      };

      dispatch(
        setSearchResults({
          offers: nextOffers,
          agencyDefaults,
          source: captureSource,
          meta: {
            ...(meta || {}),
            offerCount: nextOffers.length,
            fromExtension: true,
            from: nextTravel.from || meta?.from,
            to: nextTravel.to || meta?.to,
            departureDate: nextTravel.departureDate || meta?.departureDate,
          },
        })
      );

      dispatch(
        patchWizard({
          travel: nextTravel,
          selectedOffer: offer,
          costPrice: offer.costPrice,
          currency: offer.currency || wizard.currency || 'USD',
        })
      );
      dispatch(setWizardStep(2));

      if (hasRoute) {
        const detailNote = capture?.detailCaptured ? ' (with details)' : '';
        toast.success(
          `Captured ${nextTravel.from} → ${nextTravel.to} · ${offer.currency} ${Number(offer.costPrice).toFixed(2)}${detailNote}`
        );
      } else {
        toast.error(
          'Price/times captured but route From/To missing — fill From & To on Flight Search before Send'
        );
        // Still show results so user can see what arrived
      }
    },
    [agencyDefaults, dispatch, meta, offers, wizard.currency, wizard.travel]
  );

  useExtensionBridge(KIWI_EXT_ENABLED ? onFlightCaptured : null);
}

export default useKiwiCaptureInWizard;
