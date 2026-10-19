import Joi from 'joi';

const dateOrIso = Joi.string()
  .trim()
  .required()
  .custom((value, helpers) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return helpers.error('any.invalid');
    }
    return value;
  });

/** Query: ISO datetime or YYYY-MM-DD. Max span 366 days. */
export const dashboardSummaryQuerySchema = Joi.object({
  from: dateOrIso,
  to: dateOrIso,
}).custom((value, helpers) => {
  const fromProbe = /^\d{4}-\d{2}-\d{2}$/.test(value.from)
    ? new Date(`${value.from}T00:00:00+05:30`)
    : new Date(value.from);
  const toProbe = /^\d{4}-\d{2}-\d{2}$/.test(value.to)
    ? new Date(`${value.to}T23:59:59.999+05:30`)
    : new Date(value.to);

  if (Number.isNaN(fromProbe.getTime()) || Number.isNaN(toProbe.getTime())) {
    return helpers.error('any.invalid');
  }
  if (toProbe < fromProbe) {
    return helpers.message('"to" must be on or after "from"');
  }
  const maxMs = 366 * 24 * 60 * 60 * 1000;
  if (toProbe.getTime() - fromProbe.getTime() > maxMs) {
    return helpers.message('Date range cannot exceed 366 days');
  }
  // Keep original strings for IST day-bound expansion in service
  return value;
});
