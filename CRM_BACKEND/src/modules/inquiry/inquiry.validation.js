import Joi from 'joi';
import {
  CABIN_CLASSES,
  PASSENGER_TYPES,
  INQUIRY_STATUSES,
  CLOSE_SOURCES,
  INQUIRY_CURRENCIES,
} from '../../config/constants.js';

const passengerSchema = Joi.object({
  _id: Joi.string().hex().length(24).optional(),
  firstName: Joi.string().trim().required(),
  lastName: Joi.string().trim().required(),
  middleName: Joi.string().trim().allow('').default(''),
  dob: Joi.date().iso().allow(null),
  email: Joi.string().email().allow('').default(''),
  phone: Joi.string().trim().min(1).required(),
  documentType: Joi.string().trim().allow('').default(''),
  documentNumber: Joi.string().trim().allow('').default(''),
  type: Joi.string()
    .valid(...PASSENGER_TYPES)
    .default('adult'),
});

const docRequestSlotSchema = Joi.object({
  key: Joi.string().trim().allow('').optional(),
  role: Joi.string().valid('cardholder', 'passenger', 'other').required(),
  passengerId: Joi.string().hex().length(24).allow(null, '').optional(),
  passengerIndex: Joi.number().integer().min(0).optional(),
  label: Joi.string().trim().allow('').optional(),
  docKind: Joi.string().trim().allow('').optional(),
}).unknown(true);

const docRequestSchema = Joi.object({
  mode: Joi.string()
    .valid('all_slots', 'agent_selected', 'none')
    .default('all_slots'),
  slots: Joi.array().items(docRequestSlotSchema).default([]),
}).default({ mode: 'all_slots', slots: [] });

export const sendInquirySchema = Joi.object({
  customer: Joi.object({
    firstName: Joi.string().trim().required(),
    middleName: Joi.string().trim().allow('').default(''),
    lastName: Joi.string().trim().required(),
    phone: Joi.string().trim().required(),
    email: Joi.string().email().required(),
  }).required(),
  // Booking requires full travel/offer/pax — enforced in sendInquiryToCustomer when kind≠service
  travel: Joi.object({
    from: Joi.string().trim().allow('').default(''),
    fromLabel: Joi.string().trim().allow('').default(''),
    to: Joi.string().trim().allow('').default(''),
    toLabel: Joi.string().trim().allow('').default(''),
    departureDate: Joi.date().iso().allow(null),
    returnDate: Joi.date().iso().allow(null),
    passengers: Joi.number().integer().min(1).max(9).default(1),
    adults: Joi.number().integer().min(0).max(9),
    children: Joi.number().integer().min(0).max(8),
    infantsInSeat: Joi.number().integer().min(0).max(8),
    infantsOnLap: Joi.number().integer().min(0).max(8),
    cabinClass: Joi.string()
      .valid(...CABIN_CLASSES)
      .default('economy'),
  }).default({}),
  selectedOffer: Joi.object().unknown(true).allow(null).optional(),
  markup: Joi.number().min(0).required(),
  costPrice: Joi.number().min(0).required(),
  currency: Joi.string()
    .trim()
    .uppercase()
    .valid(...INQUIRY_CURRENCIES)
    .default('USD'),
  passengers: Joi.array().items(passengerSchema).default([]),
  billing: Joi.object({
    phone: Joi.string().trim().allow('').default(''),
    address: Joi.string().trim().allow('').default(''),
    city: Joi.string().trim().allow('').default(''),
    state: Joi.string().trim().allow('').default(''),
    zip: Joi.string().trim().allow('').default(''),
    country: Joi.string().trim().allow('').default(''),
    cardType: Joi.string().trim().allow('').default(''),
    cardholderName: Joi.string().trim().allow('').default(''),
    last4: Joi.string().trim().pattern(/^\d{0,4}$/).allow('').default(''),
    expiryMonth: Joi.string().trim().allow('').default(''),
    expiryYear: Joi.string().trim().allow('').default(''),
    // Accept then strip — never persisted (sanitizeBilling)
    cvv: Joi.string().trim().allow('').optional(),
  }).default({}),
  notes: Joi.string().allow('').default(''),
  authorizationText: Joi.string().trim().allow('').max(5000).default(''),
  authorizationFills: Joi.object({
    authorizerName: Joi.string().trim().allow('').default(''),
    agencyName: Joi.string().trim().allow('').default(''),
    amountLabel: Joi.string().trim().allow('').default(''),
    purpose: Joi.string().trim().allow('').default(''),
    currency: Joi.string().trim().allow('').default(''),
    amount: Joi.string().trim().allow('').default(''),
  }).optional(),
  docRequest: docRequestSchema,
});

export const closeInquirySchema = Joi.object({
  reason: Joi.string().trim().min(1).required(),
  source: Joi.string()
    .valid(...Object.values(CLOSE_SOURCES))
    .default(CLOSE_SOURCES.DETAIL_PAGE),
});

/** Partial wizard save — all fields optional, draft status only */
export const saveDraftSchema = Joi.object({
  wizardStep: Joi.number().integer().min(0).max(5),
  customer: Joi.object({
    firstName: Joi.string().trim().allow('').default(''),
    middleName: Joi.string().trim().allow('').default(''),
    lastName: Joi.string().trim().allow('').default(''),
    phone: Joi.string().trim().allow('').default(''),
    email: Joi.string().trim().allow('').default(''),
  }),
  travel: Joi.object({
    from: Joi.string().trim().allow('').default(''),
    fromLabel: Joi.string().trim().allow('').default(''),
    to: Joi.string().trim().allow('').default(''),
    toLabel: Joi.string().trim().allow('').default(''),
    departureDate: Joi.date().iso().allow(null, ''),
    returnDate: Joi.date().iso().allow(null, ''),
    passengers: Joi.number().integer().min(1).max(9),
    adults: Joi.number().integer().min(0).max(9),
    children: Joi.number().integer().min(0).max(8),
    infantsInSeat: Joi.number().integer().min(0).max(8),
    infantsOnLap: Joi.number().integer().min(0).max(8),
    cabinClass: Joi.string()
      .valid(...CABIN_CLASSES)
      .default('economy'),
  }),
  selectedOffer: Joi.object().unknown(true).allow(null),
  markup: Joi.number().min(0),
  costPrice: Joi.number().min(0),
  currency: Joi.string()
    .trim()
    .uppercase()
    .valid(...INQUIRY_CURRENCIES),
  passengers: Joi.array().items(
    Joi.object({
      firstName: Joi.string().trim().allow('').default(''),
      lastName: Joi.string().trim().allow('').default(''),
      middleName: Joi.string().trim().allow('').default(''),
      dob: Joi.date().iso().allow(null, ''),
      email: Joi.string().trim().allow('').default(''),
      phone: Joi.string().trim().allow('').default(''),
      documentType: Joi.string().trim().allow('').default(''),
      documentNumber: Joi.string().trim().allow('').default(''),
      type: Joi.string()
        .valid(...PASSENGER_TYPES)
        .default('adult'),
    }).unknown(true)
  ),
  billing: Joi.object({
    phone: Joi.string().trim().allow('').default(''),
    address: Joi.string().trim().allow('').default(''),
    city: Joi.string().trim().allow('').default(''),
    state: Joi.string().trim().allow('').default(''),
    zip: Joi.string().trim().allow('').default(''),
    country: Joi.string().trim().allow('').default(''),
    cardType: Joi.string().trim().allow('').default(''),
    cardholderName: Joi.string().trim().allow('').default(''),
    last4: Joi.string().trim().pattern(/^\d{0,4}$/).allow('').default(''),
    expiryMonth: Joi.string().trim().allow('').default(''),
    expiryYear: Joi.string().trim().allow('').default(''),
    cvv: Joi.string().trim().allow('').optional(),
  }),
  notes: Joi.string().allow('').default(''),
  authorizationText: Joi.string().trim().allow('').max(5000),
  authorizationFills: Joi.object({
    authorizerName: Joi.string().trim().allow('').default(''),
    agencyName: Joi.string().trim().allow('').default(''),
    amountLabel: Joi.string().trim().allow('').default(''),
    purpose: Joi.string().trim().allow('').default(''),
    currency: Joi.string().trim().allow('').default(''),
    amount: Joi.string().trim().allow('').default(''),
  }).optional(),
}).min(1);

export const listInquiriesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(...Object.values(INQUIRY_STATUSES)),
  search: Joi.string().trim().allow(''),
  assignedTo: Joi.string().hex().length(24),
});

export const lookupQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).required(),
});
