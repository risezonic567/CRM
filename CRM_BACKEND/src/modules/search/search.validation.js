import Joi from 'joi';

export const airportSuggestQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(80).required(),
});
