import Joi from 'joi';

/** Company settings UI currently edits legal name only — other Agency fields stay in DB untouched. */
export const updateAgencySchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
});
