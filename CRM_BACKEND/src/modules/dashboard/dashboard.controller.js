import * as dashboardService from './dashboard.service.js';
import { success } from '../../utils/apiResponse.js';

export async function summary(req, res, next) {
  try {
    const data = await dashboardService.getDashboardSummary(req.user, req.query);
    return success(res, { data });
  } catch (err) {
    return next(err);
  }
}
