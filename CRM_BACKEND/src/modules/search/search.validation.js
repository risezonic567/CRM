import Joi from 'joi';
import { CABIN_CLASSES } from '../../config/constants.js';

/** YYYY-MM-DD only — avoids timezone shift from Date objects */
const dateOnly = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    'string.pattern.base': 'Date must be YYYY-MM-DD',
  });

export const searchFlightsSchema = Joi.object({
  from: Joi.string().trim().length(3).uppercase().required(),
  to: Joi.string().trim().length(3).uppercase().required(),
  departureDate: dateOnly.required(),
  returnDate: dateOnly.allow(null, ''),
  passengers: Joi.number().integer().min(1).max(9).required(),
  cabinClass: Joi.string()
    .valid(...CABIN_CLASSES)
    .default('economy'),
});

export const airportSuggestQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(80).required(),
});
