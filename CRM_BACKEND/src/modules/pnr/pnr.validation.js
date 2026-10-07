import Joi from 'joi';

export const convertPnrSchema = Joi.object({
  rawText: Joi.string().trim().min(1).required().messages({
    'string.empty': 'Paste at least one GDS air segment line',
    'any.required': 'Paste at least one GDS air segment line',
  }),
});
