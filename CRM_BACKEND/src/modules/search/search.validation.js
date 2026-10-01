import Joi from 'joi';
import { CABIN_CLASSES } from '../../config/constants.js';

/** YYYY-MM-DD only — avoids timezone shift from Date objects */
const dateOnly = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .messages({
    'string.pattern.base': 'Date must be YYYY-MM-DD',
  });

const paxCount = Joi.number().integer().min(0).max(8);

/**
 * Flight search — supports pax breakdown + optional SerpApi departure_token (RT return leg).
 * Backward compatible: `passengers` alone still works (treated as adults).
 */
export const searchFlightsSchema = Joi.object({
  from: Joi.string().trim().length(3).uppercase().required(),
  to: Joi.string().trim().length(3).uppercase().required(),
  departureDate: dateOnly.required(),
  returnDate: dateOnly.allow(null, ''),
  passengers: Joi.number().integer().min(1).max(9),
  adults: Joi.number().integer().min(0).max(9),
  children: paxCount,
  infantsInSeat: paxCount,
  infantsOnLap: paxCount,
  cabinClass: Joi.string()
    .valid(...CABIN_CLASSES)
    .default('economy'),
  /** SerpApi Google Flights — second request after outbound select */
  departureToken: Joi.string().trim().allow('', null),
})
  .custom((value, helpers) => {
    const adults = Number(value.adults);
    const children = Number(value.children) || 0;
    const infantsInSeat = Number(value.infantsInSeat) || 0;
    const infantsOnLap = Number(value.infantsOnLap) || 0;
    const hasBreakdown =
      value.adults != null ||
      value.children != null ||
      value.infantsInSeat != null ||
      value.infantsOnLap != null;

    if (hasBreakdown) {
      const a = Number.isFinite(adults) ? adults : 0;
      const total = a + children + infantsInSeat + infantsOnLap;
      if (a < 1) {
        return helpers.message('At least 1 adult is required');
      }
      if (total < 1 || total > 9) {
        return helpers.message('Total passengers must be between 1 and 9');
      }
      if (infantsOnLap > a) {
        return helpers.message('Infants on lap cannot exceed adults');
      }
    } else if (value.passengers == null) {
      return helpers.message('passengers or adults is required');
    }
    return value;
  })
  .prefs({ abortEarly: false });

export const airportSuggestQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(80).required(),
});
