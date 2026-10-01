import Joi from 'joi';
import {
  CABIN_CLASSES,
  PASSENGER_TYPES,
  INQUIRY_STATUSES,
  CLOSE_SOURCES,
} from '../../config/constants.js';

const passengerSchema = Joi.object({
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

export const sendInquirySchema = Joi.object({
  customer: Joi.object({
    firstName: Joi.string().trim().required(),
    lastName: Joi.string().trim().required(),
    phone: Joi.string().trim().required(),
    email: Joi.string().email().required(),
  }).required(),
  travel: Joi.object({
    from: Joi.string().trim().required(),
    fromLabel: Joi.string().trim().allow('').default(''),
    to: Joi.string().trim().required(),
    toLabel: Joi.string().trim().allow('').default(''),
    departureDate: Joi.date().iso().required(),
    returnDate: Joi.date().iso().allow(null),
    passengers: Joi.number().integer().min(1).max(9).required(),
    adults: Joi.number().integer().min(0).max(9),
    children: Joi.number().integer().min(0).max(8),
    infantsInSeat: Joi.number().integer().min(0).max(8),
    infantsOnLap: Joi.number().integer().min(0).max(8),
    cabinClass: Joi.string()
      .valid(...CABIN_CLASSES)
      .default('economy'),
  }).required(),
  selectedOffer: Joi.object().unknown(true).required(),
  markup: Joi.number().min(0).required(),
  costPrice: Joi.number().min(0).required(),
  currency: Joi.string().trim().default('USD'),
  passengers: Joi.array().items(passengerSchema).min(1).required(),
  billing: Joi.object({
    phone: Joi.string().trim().allow('').default(''),
    address: Joi.string().trim().allow('').default(''),
    state: Joi.string().trim().allow('').default(''),
    zip: Joi.string().trim().allow('').default(''),
    country: Joi.string().trim().allow('').default(''),
  }).default({}),
  notes: Joi.string().allow('').default(''),
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
  currency: Joi.string().trim(),
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
    state: Joi.string().trim().allow('').default(''),
    zip: Joi.string().trim().allow('').default(''),
    country: Joi.string().trim().allow('').default(''),
  }),
  notes: Joi.string().allow('').default(''),
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
