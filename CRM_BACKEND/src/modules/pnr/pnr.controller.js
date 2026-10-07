import * as pnrService from './pnr.service.js';
import { success } from '../../utils/apiResponse.js';

export async function convert(req, res, next) {
  try {
    const itinerary = await pnrService.convertPnr(req.body.rawText);
    return success(res, {
      message: 'Itinerary decoded',
      data: { itinerary },
    });
  } catch (err) {
    return next(err);
  }
}
