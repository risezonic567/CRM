import Joi from 'joi';
import { CALL_DISPOSITIONS } from '../../config/constants.js';

export const createCallSchema = Joi.object({
  callerName: Joi.string().trim().allow('').default(''),
  phoneNumber: Joi.string().trim().allow('').default(''),
  disposition: Joi.string()
    .valid(...CALL_DISPOSITIONS)
    .required(),
  // New booking: remarks optional; all other dispositions: required
  remarks: Joi.when('disposition', {
    is: 'new_booking',
    then: Joi.string().trim().allow('').default(''),
    otherwise: Joi.string().trim().min(1).required(),
  }),
});

export const listCallsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  disposition: Joi.string().valid(...CALL_DISPOSITIONS),
  search: Joi.string().trim().allow(''),
  loggedBy: Joi.string().hex().length(24),
});
