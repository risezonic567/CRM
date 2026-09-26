/**
 * Extract a human-readable message from RTK Query / Axios errors.
 */
export function getErrorMessage(err, fallback = 'Something went wrong') {
  if (!err) return fallback;

  const body = err.data;

  if (typeof body === 'string' && body.trim()) return body;

  if (body && typeof body === 'object') {
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      return body.errors
        .map((e) => e.message || e.field)
        .filter(Boolean)
        .join(', ');
    }
    if (body.message) return body.message;
  }

  if (typeof err.error === 'string') return err.error;
  if (err.message && err.message !== 'Rejected') return err.message;

  return fallback;
}

export default getErrorMessage;
