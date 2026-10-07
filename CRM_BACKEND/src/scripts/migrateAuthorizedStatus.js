import { Inquiry } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * One-shot migration: customer_confirmed → authorized.
 * Safe to call on every boot (no-op when none left).
 */
export async function migrateAuthorizedStatus() {
  const result = await Inquiry.updateMany(
    { status: 'customer_confirmed' },
    { $set: { status: 'authorized' } }
  );

  const count = result.modifiedCount ?? result.nModified ?? 0;
  if (count > 0) {
    logger.info('Migrated inquiry statuses to authorized', { count });
  }

  return count;
}

export default migrateAuthorizedStatus;
