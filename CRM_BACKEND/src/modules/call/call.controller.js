import * as callService from './call.service.js';
import { success } from '../../utils/apiResponse.js';

export async function create(req, res, next) {
  try {
    const result = await callService.createCall(req.user, req.body);
    return success(res, {
      status: 201,
      message:
        result.openWizard === 'booking'
          ? 'Call logged — opening booking wizard'
          : result.openWizard === 'service'
            ? 'Call logged — opening service authorize wizard'
            : 'Call logged successfully',
      data: {
        call: result.call,
        inquiry: result.inquiry,
        openWizard: result.openWizard,
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function list(req, res, next) {
  try {
    const result = await callService.listCalls(req.user, req.query);
    return success(res, { data: result.items, meta: result.meta });
  } catch (err) {
    return next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const call = await callService.getCall(req.user, req.params.id);
    return success(res, { data: { call } });
  } catch (err) {
    return next(err);
  }
}

export async function addNote(req, res, next) {
  try {
    const call = await callService.addCallNote(
      req.user,
      req.params.id,
      req.body.text
    );
    return success(res, {
      message: 'Follow-up note added',
      data: { call },
    });
  } catch (err) {
    return next(err);
  }
}

export async function recordPricing(req, res, next) {
  try {
    const result = await callService.recordCallPricing(
      req.user,
      req.params.id,
      req.body
    );
    return success(res, {
      message: req.body.paymentReceived
        ? 'Markup saved — counted in Margin Collected'
        : 'Markup saved on call',
      data: {
        call: result.call,
        inquiry: result.inquiry,
      },
    });
  } catch (err) {
    return next(err);
  }
}
