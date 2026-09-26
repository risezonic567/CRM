import { fail } from '../utils/apiResponse.js';

export function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      }));
      return fail(res, {
        status: 422,
        message: 'Validation failed',
        errors,
      });
    }

    req[property] = value;
    return next();
  };
}

export default validate;
