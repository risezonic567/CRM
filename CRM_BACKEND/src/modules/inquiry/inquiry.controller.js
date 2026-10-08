import * as inquiryService from './inquiry.service.js';
import { success } from '../../utils/apiResponse.js';

export async function list(req, res, next) {
  try {
    const result = await inquiryService.listInquiries(req.user, req.query);
    return success(res, { data: result.items, meta: result.meta });
  } catch (err) {
    return next(err);
  }
}

export async function lookup(req, res, next) {
  try {
    const items = await inquiryService.lookupInquiries(req.user, req.query.q);
    return success(res, { data: items });
  } catch (err) {
    return next(err);
  }
}

export async function marginStats(req, res, next) {
  try {
    const stats = await inquiryService.getMarginStats(req.user);
    return success(res, { data: stats });
  } catch (err) {
    return next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const inquiry = await inquiryService.getInquiry(req.user, req.params.id);
    return success(res, { data: { inquiry } });
  } catch (err) {
    return next(err);
  }
}

export async function send(req, res, next) {
  try {
    const result = await inquiryService.sendInquiryToCustomer(
      req.user,
      req.params.id,
      req.body
    );
    return success(res, {
      message: 'Inquiry sent to customer',
      data: {
        inquiry: result.inquiry,
        ...(process.env.NODE_ENV !== 'production'
          ? { confirmUrl: result.confirmUrl }
          : {}),
      },
    });
  } catch (err) {
    return next(err);
  }
}

export async function saveDraft(req, res, next) {
  try {
    const inquiry = await inquiryService.saveDraft(
      req.user,
      req.params.id,
      req.body
    );
    return success(res, {
      message: 'Draft saved',
      data: { inquiry },
    });
  } catch (err) {
    return next(err);
  }
}

export async function close(req, res, next) {
  try {
    const inquiry = await inquiryService.closeInquiry(
      req.user,
      req.params.id,
      req.body
    );
    return success(res, {
      message: 'Inquiry closed',
      data: { inquiry },
    });
  } catch (err) {
    return next(err);
  }
}

export async function resendConfirmation(req, res, next) {
  try {
    const result = await inquiryService.resendConfirmationEmail(
      req.user,
      req.params.id
    );
    return success(res, {
      message: `Confirmation email resent to ${result.emailedTo}`,
      data: { inquiry: result.inquiry },
    });
  } catch (err) {
    return next(err);
  }
}

export async function downloadConfirmationReceipt(req, res, next) {
  try {
    const { html, filename } = await inquiryService.getConfirmationReceipt(
      req.user,
      req.params.id
    );
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename.replace(/"/g, '')}"`
    );
    return res.status(200).send(html);
  } catch (err) {
    return next(err);
  }
}

export async function downloadSupportDocument(req, res, next) {
  try {
    const { absolutePath, mimeType, downloadName } =
      await inquiryService.getSupportDocument(req.user, req.params.id);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${downloadName.replace(/"/g, '')}"`
    );
    return res.sendFile(absolutePath);
  } catch (err) {
    return next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const inquiry = await inquiryService.deleteInquiry(req.user, req.params.id);
    return success(res, {
      message: 'Inquiry deleted',
      data: { inquiry },
    });
  } catch (err) {
    return next(err);
  }
}
