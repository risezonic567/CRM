import * as searchService from './search.service.js';
import { success } from '../../utils/apiResponse.js';

export async function flights(req, res, next) {
  try {
    const data = await searchService.search(req.user, req.body);
    return success(res, { message: 'Flight search completed', data });
  } catch (err) {
    return next(err);
  }
}

export async function airports(req, res, next) {
  try {
    const data = await searchService.searchAirports(req.query.q);
    return success(res, { message: 'Airport suggestions', data });
  } catch (err) {
    return next(err);
  }
}
