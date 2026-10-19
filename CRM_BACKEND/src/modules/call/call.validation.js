import Joi from 'joi';
import { CALL_DISPOSITIONS, INQUIRY_CURRENCIES } from '../../config/constants.js';

export const createCallSchema = Joi.object({
  callerName: Joi.string().trim().allow('').default(''),
  phoneNumber: Joi.string().trim().allow('').default(''),
  disposition: Joi.string()
    .valid(...CALL_DISPOSITIONS)
    .required(),
  // Remarks optional for all dispositions (wizard / follow-up notes cover detail)
  remarks: Joi.string().trim().allow('').default(''),
});

export const listCallsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  disposition: Joi.string().valid(...CALL_DISPOSITIONS),
  search: Joi.string().trim().allow(''),
  // Accept only Mongo ObjectId; strip names / junk so old FE never 400s the list
  loggedBy: Joi.string()
    .trim()
    .allow('')
    .optional()
    .custom((value, helpers) => {
      if (!value) return undefined;
      if (!/^[a-f\d]{24}$/i.test(value)) return undefined;
      return value;
    }),
});

export const addCallNoteSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required(),
});

export const recordCallPricingSchema = Joi.object({
  costPrice: Joi.number().min(0).required(),
  markup: Joi.number().min(0).required(),
  currency: Joi.string()
    .trim()
    .uppercase()
    .valid(...INQUIRY_CURRENCIES)
    .default('USD'),
  paymentReceived: Joi.boolean().default(false),
});
