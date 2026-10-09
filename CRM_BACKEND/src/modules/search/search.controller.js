import * as searchService from './search.service.js';
import { success } from '../../utils/apiResponse.js';

export async function airports(req, res, next) {
  try {
    const data = await searchService.searchAirports(req.query.q);
    return success(res, { message: 'Airport suggestions', data });
  } catch (err) {
    return next(err);
  }
}
