import { createSlice } from '@reduxjs/toolkit';
import {
  DEFAULT_INQUIRY_CURRENCY,
  normalizeInquiryCurrency,
} from '../../../constants/currencies';
import {
  DEFAULT_CUSTOMER_LOCALE,
  normalizeCustomerLocale,
} from '../../../constants/locales';

const emptyCustomer = {
  firstName: '',
  middleName: '',
  lastName: '',
  phone: '',
  email: '',
};
const emptyTravel = {
  from: '',
  fromLabel: '',
  to: '',
  toLabel: '',
  departureDate: '',
  returnDate: '',
  passengers: 1,
  adults: 1,
  children: 0,
  infantsInSeat: 0,
  infantsOnLap: 0,
  cabinClass: 'economy',
};
const emptyBilling = {
  phone: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  cardType: '',
  cardholderName: '',
  last4: '',
  expiryMonth: '',
  expiryYear: '',
};

const initialState = {
  filters: {
    status: '',
    search: '',
  },
  // Client wizard state — also autosaved to DB while draft
  wizard: {
    inquiryId: null,
    step: 0,
    customer: { ...emptyCustomer },
    travel: { ...emptyTravel },
    selectedOffer: null,
    markup: 50,
    costPrice: 0,
    currency: DEFAULT_INQUIRY_CURRENCY,
    merchantFeePercent: 0,
    passengers: [],
    billing: { ...emptyBilling },
    notes: '',
    customerLocale: DEFAULT_CUSTOMER_LOCALE,
    authorizationText: '',
    authorizationFills: null,
    // PNR decode (wizard step 1) — also mirrored on selectedOffer.raw
    pnrRaw: '',
    pnrSegments: [],
    pnrTripSummary: null,
    pnrWarnings: [],
    /** pnr | manual | screenshot */
    itineraryEntryMode: 'manual',
    /** Meta from POST /inquiries/:id/itinerary-screenshot */
    itineraryScreenshot: null,
  },
};

function toDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Map saved Inquiry document → wizard state for resume */
export function mapInquiryToWizard(inquiry) {
  if (!inquiry) return null;
  const travel = inquiry.travel || {};
  const pricing = inquiry.pricing || {};
  const offer = inquiry.selectedOffer || null;
  const raw = offer?.raw;
  const pnrRawOffer = raw?.source === 'pnr' ? raw : null;
  const segmentRawOffer =
    (raw?.source === 'pnr' || raw?.source === 'manual') &&
    Array.isArray(raw?.segments)
      ? raw
      : null;
  const entryMode =
    raw?.source === 'pnr'
      ? 'pnr'
      : raw?.source === 'screenshot'
        ? 'screenshot'
        : 'manual';
  return {
    inquiryId: inquiry._id,
    step: typeof inquiry.wizardStep === 'number' ? inquiry.wizardStep : 0,
    customer: {
      firstName: inquiry.customer?.firstName || '',
      middleName: inquiry.customer?.middleName || '',
      lastName: inquiry.customer?.lastName || '',
      phone: inquiry.customer?.phone || '',
      email: inquiry.customer?.email || '',
    },
    travel: {
      from: travel.from || '',
      fromLabel: travel.fromLabel || '',
      to: travel.to || '',
      toLabel: travel.toLabel || '',
      departureDate: toDateInput(travel.departureDate),
      returnDate: toDateInput(travel.returnDate),
      passengers: travel.passengers || 1,
      adults: travel.adults ?? travel.passengers ?? 1,
      children: travel.children ?? 0,
      infantsInSeat: travel.infantsInSeat ?? 0,
      infantsOnLap: travel.infantsOnLap ?? 0,
      cabinClass: travel.cabinClass || 'economy',
    },
    selectedOffer: offer,
    markup: pricing.markup ?? 50,
    costPrice: pricing.costPrice ?? 0,
    currency: normalizeInquiryCurrency(pricing.currency),
    merchantFeePercent: pricing.merchantFeePercent ?? 0,
    passengers: inquiry.passengers || [],
    billing: {
      phone: inquiry.billing?.phone || '',
      address: inquiry.billing?.address || '',
      city: inquiry.billing?.city || '',
      state: inquiry.billing?.state || '',
      zip: inquiry.billing?.zip || '',
      country: inquiry.billing?.country || '',
      cardType: inquiry.billing?.cardType || '',
      cardholderName: inquiry.billing?.cardholderName || '',
      last4: inquiry.billing?.last4 || '',
      expiryMonth: inquiry.billing?.expiryMonth || '',
      expiryYear: inquiry.billing?.expiryYear || '',
    },
    notes: inquiry.notes || '',
    customerLocale: normalizeCustomerLocale(inquiry.customerLocale),
    authorizationText: inquiry.authorizationText || '',
    authorizationFills: inquiry.authorizationFills || null,
    pnrRaw: pnrRawOffer?.pnrRaw || '',
    pnrSegments: Array.isArray(segmentRawOffer?.segments)
      ? segmentRawOffer.segments
      : [],
    pnrTripSummary: segmentRawOffer?.tripSummary || null,
    pnrWarnings: Array.isArray(segmentRawOffer?.warnings)
      ? segmentRawOffer.warnings
      : [],
    itineraryEntryMode: entryMode,
    itineraryScreenshot: inquiry.itineraryScreenshot?.relativePath
      ? inquiry.itineraryScreenshot
      : null,
  };
}

/** Body for PATCH /inquiries/:id/draft */
export function buildDraftPayload(wizard) {
  return {
    wizardStep: wizard.step || 0,
    customer: wizard.customer,
    travel: {
      from: wizard.travel?.from || '',
      fromLabel: wizard.travel?.fromLabel || '',
      to: wizard.travel?.to || '',
      toLabel: wizard.travel?.toLabel || '',
      departureDate: wizard.travel?.departureDate || null,
      returnDate: wizard.travel?.returnDate || null,
      passengers: wizard.travel?.passengers || 1,
      adults: wizard.travel?.adults ?? wizard.travel?.passengers ?? 1,
      children: wizard.travel?.children ?? 0,
      infantsInSeat: wizard.travel?.infantsInSeat ?? 0,
      infantsOnLap: wizard.travel?.infantsOnLap ?? 0,
      cabinClass: wizard.travel?.cabinClass || 'economy',
    },
    selectedOffer: wizard.selectedOffer || null,
    markup: Number(wizard.markup) || 0,
    costPrice: Number(wizard.costPrice) || 0,
    currency: normalizeInquiryCurrency(wizard.currency),
    passengers: wizard.passengers || [],
    billing: wizard.billing || {},
    notes: wizard.notes || '',
    customerLocale: normalizeCustomerLocale(wizard.customerLocale),
    authorizationText: wizard.authorizationText || '',
    ...(wizard.authorizationFills
      ? { authorizationFills: wizard.authorizationFills }
      : {}),
  };
}

const inquirySlice = createSlice({
  name: 'inquiry',
  initialState,
  reducers: {
    setInquiryFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },
    startWizard(state, action) {
      const {
        inquiryId,
        phone = '',
        firstName = '',
        middleName = '',
        lastName = '',
      } = action.payload;
      state.wizard = {
        ...initialState.wizard,
        inquiryId,
        customer: {
          ...emptyCustomer,
          firstName: String(firstName || '').trim(),
          middleName: String(middleName || '').trim(),
          lastName: String(lastName || '').trim(),
          phone,
        },
      };
    },
    hydrateWizard(state, action) {
      const mapped = action.payload;
      if (!mapped?.inquiryId) return;
      state.wizard = { ...initialState.wizard, ...mapped };
    },
    setWizardStep(state, action) {
      state.wizard.step = action.payload;
    },
    patchWizard(state, action) {
      state.wizard = { ...state.wizard, ...action.payload };
    },
    resetWizard(state) {
      state.wizard = initialState.wizard;
    },
  },
});

export const {
  setInquiryFilters,
  startWizard,
  hydrateWizard,
  setWizardStep,
  patchWizard,
  resetWizard,
} = inquirySlice.actions;

export const selectInquiryFilters = (state) => state.inquiry.filters;
export const selectWizard = (state) => state.inquiry.wizard;

export default inquirySlice.reducer;
