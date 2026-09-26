import Joi from 'joi';

export const updateAgencySchema = Joi.object({
  name: Joi.string().trim().min(1),
  logo: Joi.string().allow(''),
  address: Joi.string().allow(''),
  country: Joi.string().allow(''),
  currency: Joi.string().trim().min(3).max(3),
  gstNumber: Joi.string().allow(''),
  iataNumber: Joi.string().allow(''),
  defaultMarkup: Joi.number().min(0),
  merchantFeePercent: Joi.number().min(0).max(100),
}).min(1);
