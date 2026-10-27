import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  ImagePlus,
  Loader2,
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
import { useUploadItineraryScreenshotMutation } from '../../../../REDUX_FEATURES/REDUX_SLICES/Inquiry_api/inquiryApi';
import { CABIN_CLASSES } from '../../../../constants/dispositions';
import { normalizeInquiryCurrency } from '../../../../constants/currencies';
import { mapScreenshotToOffer } from '../../../../utils/mapScreenshotToOffer';
import { getErrorMessage } from '../../../../utils/getErrorMessage';
import axiosInstance from '../../../../SERVICES/AxiosInstance';
import AirportAutocomplete from './AirportAutocomplete';
import FlightDatePicker from './FlightDatePicker';

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

/**
 * Third itinerary mode: same route bar as Manual + screenshot upload.
 * Segment table is skipped; PAX email/confirm show the image.
 */
const StepScreenshotItinerary = () => {
  const dispatch = useDispatch();
  const wizard = useSelector(selectWizard);
  const fileRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadShot, { isLoading: uploading }] =
    useUploadItineraryScreenshotMutation();

  const travel = wizard.travel || {};
  const initialTrip = travel.returnDate ? 'round' : 'oneway';
  const [tripType, setTripType] = useState(initialTrip);
  const tripMenu = useMenu();
  const paxMenu = useMenu();
  const cabinMenu = useMenu();
  const [draftPax, setDraftPax] = useState({
    adults: travel.adults ?? 1,
    children: travel.children ?? 0,
    infantsInSeat: travel.infantsInSeat ?? 0,
    infantsOnLap: travel.infantsOnLap ?? 0,
  });

  const hasShot = Boolean(
    wizard.itineraryScreenshot?.relativePath ||
      wizard.selectedOffer?.raw?.source === 'screenshot'
  );

  // Resume: load stored screenshot with auth (img src cannot send Bearer).
  useEffect(() => {
    let revoked = false;
    let objectUrl = null;
    const load = async () => {
      if (previewUrl) return;
      if (!wizard.inquiryId || !wizard.itineraryScreenshot?.relativePath) return;
      try {
        const res = await axiosInstance.get(
          `/inquiries/${wizard.inquiryId}/itinerary-screenshot`,
          { responseType: 'blob' }
        );
        objectUrl = URL.createObjectURL(res.data);
        if (!revoked) setPreviewUrl(objectUrl);
      } catch {
        /* leave empty — agent can re-upload */
      }
    };
    load();
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when inquiry/shot path changes
  }, [wizard.inquiryId, wizard.itineraryScreenshot?.relativePath]);

  useEffect(() => {
    if (travel.returnDate) setTripType('round');
  }, [travel.returnDate]);

  const agentPreviewSrc = previewUrl;

  const setTravel = (patch) => {
    dispatch(patchWizard({ travel: { ...travel, ...patch } }));
  };

  const syncPaxTravel = (pax) => {
    const passengers =
      pax.adults + pax.children + pax.infantsInSeat + pax.infantsOnLap;
    setTravel({ ...pax, passengers: Math.max(1, passengers) });
  };

  const swapAirports = () => {
    setTravel({
      from: travel.to || '',
      fromLabel: travel.toLabel || '',
      to: travel.from || '',
      toLabel: travel.fromLabel || '',
    });
  };

  const paxTotal = totalPax({
    adults: travel.adults ?? 1,
    children: travel.children ?? 0,
    infantsInSeat: travel.infantsInSeat ?? 0,
    infantsOnLap: travel.infantsOnLap ?? 0,
  });

  const bump = (key, delta, min = 0) => {
    setDraftPax((prev) => {
      let next = { ...prev, [key]: Math.max(min, (prev[key] || 0) + delta) };
      const sum =
        next.adults +
        next.children +
        next.infantsInSeat +
        next.infantsOnLap;
      if (sum < 1) next = { ...next, adults: 1 };
      return next;
    });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpeg|png)$/i.test(file.type)) {
      toast.error('Only JPG or PNG screenshots allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Screenshot must be 5 MB or smaller');
      return;
    }
    if (!wizard.inquiryId) {
      toast.error('No inquiry loaded');
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    try {
      const res = await uploadShot({ id: wizard.inquiryId, file }).unwrap();
      const inquiry = res.data?.inquiry;
      const shot = inquiry?.itineraryScreenshot;
      if (!shot?.relativePath) {
        throw new Error('Upload did not return screenshot meta');
      }
      const offer = mapScreenshotToOffer({
        travel,
        currency: normalizeInquiryCurrency(wizard.currency),
        screenshot: shot,
      });
      dispatch(
        patchWizard({
          itineraryScreenshot: shot,
          selectedOffer: offer,
          pnrSegments: [],
          pnrTripSummary: offer.raw.tripSummary,
          pnrWarnings: [],
          pnrRaw: '',
          itineraryEntryMode: 'screenshot',
        })
      );
      toast.success('Screenshot uploaded');
    } catch (err) {
      setPreviewUrl(null);
      toast.error(getErrorMessage(err, 'Screenshot upload failed'));
    }
  };

  const clearShot = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    dispatch(
      patchWizard({
        itineraryScreenshot: null,
        selectedOffer:
          wizard.selectedOffer?.raw?.source === 'screenshot'
            ? null
            : wizard.selectedOffer,
      })
    );
  };

  const handleContinue = () => {
    if (!travel.from || !travel.to) {
      toast.error('Select from and to airports');
      return;
    }
    if (!travel.departureDate) {
      toast.error('Select departure date');
      return;
    }
    if (tripType === 'round' && !travel.returnDate) {
      toast.error('Select return date');
      return;
    }
    if (!hasShot && !wizard.itineraryScreenshot?.relativePath) {
      toast.error('Upload an itinerary screenshot');
      return;
    }

    const shot = wizard.itineraryScreenshot;
    const offer = mapScreenshotToOffer({
      travel,
      currency: normalizeInquiryCurrency(wizard.currency),
      screenshot: shot,
    });
    dispatch(
      patchWizard({
        selectedOffer: {
          ...offer,
          costPrice: Number(wizard.costPrice) || 0,
          currency: normalizeInquiryCurrency(wizard.currency),
        },
        pnrSegments: [],
        pnrTripSummary: offer.raw.tripSummary,
        itineraryEntryMode: 'screenshot',
      })
    );
    dispatch(setWizardStep(2));
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-sm font-bold text-slate-900">
          Screenshot itinerary
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Choose route and dates, then upload the flight screenshot the customer
          will see. Price is set on the next step.
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
                  adults: travel.adults ?? 1,
                  children: travel.children ?? 0,
                  infantsInSeat: travel.infantsInSeat ?? 0,
                  infantsOnLap: travel.infantsOnLap ?? 0,
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

          <div className="relative" ref={cabinMenu.ref}>
            <button
              type="button"
              className={`${menuBtn} ${cabinMenu.open ? 'bg-white ring-1 ring-blue-200' : ''}`}
              onClick={() => cabinMenu.setOpen((v) => !v)}
            >
              {CABIN_CLASSES.find((c) => c.value === travel.cabinClass)?.label ||
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
                        travel.cabinClass === c.value
                          ? 'bg-blue-50 font-medium text-blue-800'
                          : 'text-slate-700'
                      }`}
                      onClick={() => {
                        setTravel({ cabinClass: c.value });
                        cabinMenu.setOpen(false);
                      }}
                    >
                      <span className="w-4">
                        {travel.cabinClass === c.value && (
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
              id="shot-from"
              label="From"
              placeholder="Where from?"
              valueIata={travel.from}
              valueLabel={travel.fromLabel || ''}
              inputClassName={fieldClass}
              showPin
              onSelect={(p) =>
                setTravel({
                  from: p.iataCode,
                  fromLabel: p.label || p.iataCode,
                })
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
              id="shot-to"
              label="To"
              placeholder="Where to?"
              valueIata={travel.to}
              valueLabel={travel.toLabel || ''}
              inputClassName={fieldClass}
              showPin
              onSelect={(p) =>
                setTravel({
                  to: p.iataCode,
                  toLabel: p.label || p.iataCode,
                })
              }
              onClear={() => setTravel({ to: '', toLabel: '' })}
            />
          </div>

          <div className="min-w-0 flex-1 lg:max-w-md">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Dates
            </span>
            <FlightDatePicker
              tripType={tripType}
              departureDate={travel.departureDate || ''}
              returnDate={travel.returnDate || ''}
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
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFile}
        />
        {agentPreviewSrc || hasShot ? (
          <div className="space-y-3">
            {agentPreviewSrc ? (
              <img
                src={agentPreviewSrc}
                alt="Itinerary screenshot"
                className="max-h-80 w-full rounded-lg border border-slate-200 object-contain bg-white"
              />
            ) : (
              <p className="py-6 text-center text-xs text-slate-500">
                Screenshot on file — preview loading…
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Replace image
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={clearShot}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center gap-2 py-8 text-slate-600 hover:text-slate-900"
          >
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
            ) : (
              <ImagePlus className="h-8 w-8 text-slate-400" />
            )}
            <span className="text-sm font-semibold">
              {uploading ? 'Uploading…' : 'Upload itinerary screenshot'}
            </span>
            <span className="text-[11px] text-slate-500">
              JPG or PNG · max 5 MB
            </span>
          </button>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={uploading}
          onClick={handleContinue}
          className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Continue to pricing
        </button>
      </div>
    </div>
  );
};

export default StepScreenshotItinerary;
