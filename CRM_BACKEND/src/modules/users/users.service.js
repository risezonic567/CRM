import bcrypt from 'bcryptjs';
import { User, Agency } from '../../models/index.js';
import { AppError } from '../../utils/apiResponse.js';
import { ROLES } from '../../config/constants.js';

export async function listUsers(agencyId, { page = 1, limit = 20, role } = {}) {
  const filter = { agencyId, role: { $ne: ROLES.ADMIN } };
  if (role) filter.role = role;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map((u) => u.toSafeJSON()),
    meta: { page, limit, total, pages: Math.ceil(total / limit) || 1 },
  };
}

export async function createUser(agencyId, payload) {
  const exists = await User.findOne({ email: payload.email.toLowerCase() });
  if (exists) throw new AppError('Email already in use', 409);

  const agency = await Agency.findById(agencyId);
  if (!agency) throw new AppError('Agency not found', 404);

  if (![ROLES.AGENT, ROLES.VIEWER].includes(payload.role)) {
    throw new AppError('Admin can only create agent or viewer', 400);
  }

  const hashed = await bcrypt.hash(payload.password, 12);
  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email.toLowerCase(),
    password: hashed,
    role: payload.role,
    agencyId,
  });

  return user.toSafeJSON();
}

export async function updateUser(agencyId, userId, payload) {
  const user = await User.findOne({ _id: userId, agencyId });
  if (!user) throw new AppError('User not found', 404);
  if (user.role === ROLES.ADMIN) {
    throw new AppError('Cannot modify admin via this endpoint', 403);
  }

  if (payload.email && payload.email.toLowerCase() !== user.email) {
    const exists = await User.findOne({ email: payload.email.toLowerCase() });
    if (exists) throw new AppError('Email already in use', 409);
    user.email = payload.email.toLowerCase();
  }

  if (payload.firstName !== undefined) user.firstName = payload.firstName;
  if (payload.lastName !== undefined) user.lastName = payload.lastName;
  if (payload.role !== undefined) {
    if (![ROLES.AGENT, ROLES.VIEWER].includes(payload.role)) {
      throw new AppError('Role must be agent or viewer', 400);
    }
    user.role = payload.role;
  }
  if (payload.isActive !== undefined) user.isActive = payload.isActive;
  if (payload.password) {
    user.password = await bcrypt.hash(payload.password, 12);
  }

  await user.save();
  return user.toSafeJSON();
}

/**
 * Permanent delete — agent/viewer only (admin accounts blocked).
 */
export async function deleteUser(agencyId, userId, requesterId) {
  if (String(userId) === String(requesterId)) {
    throw new AppError('Cannot delete your own account', 400);
  }

  const user = await User.findOne({ _id: userId, agencyId });
  if (!user) throw new AppError('User not found', 404);
  if (user.role === ROLES.ADMIN) {
    throw new AppError('Cannot delete admin via this endpoint', 403);
  }

  await User.deleteOne({ _id: user._id });
  return user.toSafeJSON();
}

export async function getUser(agencyId, userId) {
  const user = await User.findOne({ _id: userId, agencyId });
  if (!user) throw new AppError('User not found', 404);
  return user.toSafeJSON();
}

export async function getAgency(agencyId) {
  const agency = await Agency.findById(agencyId);
  if (!agency) throw new AppError('Agency not found', 404);
  return agency;
}

export async function updateAgency(agencyId, payload) {
  const agency = await Agency.findById(agencyId);
  if (!agency) throw new AppError('Agency not found', 404);

  const allowed = [
    'name',
    'logo',
    'address',
    'country',
    'currency',
    'gstNumber',
    'iataNumber',
    'defaultMarkup',
    'merchantFeePercent',
  ];
  for (const key of allowed) {
    if (payload[key] !== undefined) agency[key] = payload[key];
  }
  await agency.save();
  return agency;
}
