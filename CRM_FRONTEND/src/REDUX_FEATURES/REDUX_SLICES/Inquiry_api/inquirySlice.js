import { createSlice } from '@reduxjs/toolkit';

const emptyCustomer = { firstName: '', lastName: '', phone: '', email: '' };
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
    currency: 'USD',
    merchantFeePercent: 0,
    passengers: [],
    billing: { ...emptyBilling },
    notes: '',
    authorizationText: '',
    authorizationFills: null,
    // PNR decode (wizard step 1) — also mirrored on selectedOffer.raw
    pnrRaw: '',
    pnrSegments: [],
    pnrTripSummary: null,
    pnrWarnings: [],
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
  const pnrRawOffer = offer?.raw?.source === 'pnr' ? offer.raw : null;
  return {
    inquiryId: inquiry._id,
    step: typeof inquiry.wizardStep === 'number' ? inquiry.wizardStep : 0,
    customer: {
      firstName: inquiry.customer?.firstName || '',
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
    currency: pricing.currency || 'USD',
    merchantFeePercent: pricing.merchantFeePercent ?? 0,
    passengers: inquiry.passengers || [],
    billing: {
      phone: inquiry.billing?.phone || '',
      address: inquiry.billing?.address || '',
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
    authorizationText: inquiry.authorizationText || '',
    authorizationFills: inquiry.authorizationFills || null,
    pnrRaw: pnrRawOffer?.pnrRaw || '',
    pnrSegments: Array.isArray(pnrRawOffer?.segments) ? pnrRawOffer.segments : [],
    pnrTripSummary: pnrRawOffer?.tripSummary || null,
    pnrWarnings: Array.isArray(pnrRawOffer?.warnings) ? pnrRawOffer.warnings : [],
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
    currency: wizard.currency || 'USD',
    passengers: wizard.passengers || [],
    billing: wizard.billing || {},
    notes: wizard.notes || '',
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
      const { inquiryId, phone = '' } = action.payload;
      state.wizard = {
        ...initialState.wizard,
        inquiryId,
        customer: { ...emptyCustomer, phone },
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
