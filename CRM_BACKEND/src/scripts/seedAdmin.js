import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import config from '../config/index.js';
import { connectDatabase } from '../config/database.js';
import { Agency, User } from '../models/index.js';
import { ROLES } from '../config/constants.js';
import logger from '../utils/logger.js';

async function seed() {
  await connectDatabase();

  let agency = await Agency.findOne({ name: config.seed.agencyName });
  if (!agency) {
    agency = await Agency.create({
      name: config.seed.agencyName,
      currency: config.pricing.defaultCurrency,
      defaultMarkup: config.pricing.defaultMarkup,
      merchantFeePercent: config.pricing.merchantFeePercent,
      country: 'US',
    });
    logger.info('Agency created', { id: agency._id.toString(), name: agency.name });
  } else {
    logger.info('Agency already exists', { id: agency._id.toString() });
  }

  const email = config.seed.adminEmail.toLowerCase();
  let admin = await User.findOne({ email });

  if (!admin) {
    const password = await bcrypt.hash(config.seed.adminPassword, 12);
    admin = await User.create({
      firstName: config.seed.adminFirstName,
      lastName: config.seed.adminLastName,
      email,
      password,
      role: ROLES.ADMIN,
      agencyId: agency._id,
      isActive: true,
    });
    logger.info('Admin user created', { email: admin.email, role: admin.role });
  } else {
    logger.info('Admin user already exists', { email: admin.email });
  }

  console.log('\n=== Seed complete ===');
  console.log(`Agency : ${agency.name}`);
  console.log(`Admin  : ${email}`);
  console.log(`Password (from env SEED_ADMIN_PASSWORD): ${config.seed.adminPassword}`);
  console.log('Login via POST /api/auth/login\n');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(async (err) => {
  logger.error('Seed failed', { message: err.message });
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
