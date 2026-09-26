import * as usersService from './users.service.js';
import { success } from '../../utils/apiResponse.js';

export async function list(req, res, next) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const result = await usersService.listUsers(req.user.agencyId, {
      page,
      limit,
      role: req.query.role,
    });
    return success(res, { data: result.items, meta: result.meta });
  } catch (err) {
    return next(err);
  }
}

export async function create(req, res, next) {
  try {
    const user = await usersService.createUser(req.user.agencyId, req.body);
    return success(res, { status: 201, message: 'User created', data: { user } });
  } catch (err) {
    return next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const user = await usersService.getUser(req.user.agencyId, req.params.id);
    return success(res, { data: { user } });
  } catch (err) {
    return next(err);
  }
}

export async function update(req, res, next) {
  try {
    const user = await usersService.updateUser(
      req.user.agencyId,
      req.params.id,
      req.body
    );
    return success(res, { message: 'User updated', data: { user } });
  } catch (err) {
    return next(err);
  }
}

export async function getCompany(req, res, next) {
  try {
    const agency = await usersService.getAgency(req.user.agencyId);
    return success(res, { data: { agency } });
  } catch (err) {
    return next(err);
  }
}

export async function updateCompany(req, res, next) {
  try {
    const agency = await usersService.updateAgency(req.user.agencyId, req.body);
    return success(res, { message: 'Company updated', data: { agency } });
  } catch (err) {
    return next(err);
  }
}
