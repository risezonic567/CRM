import * as publicService from './public.service.js';
import { AppError } from '../../utils/apiResponse.js';
import { renderTemplate } from '../notification/notification.service.js';
import { Inquiry, Agency } from '../../models/index.js';
import { resolveClientIp } from '../../utils/clientMeta.js';
import {
  fillsFromInquiry,
  renderAuthorizationHtml,
} from '../../utils/buildAuthorizationText.js';
import {
  buildDocSlots,
  supportDocumentsFromUpload,
  unlinkUploadedFiles,
} from '../../utils/supportDocuments.js';
import { supportDocumentMetaFromFile as legacyMetaFromFile } from '../../middlewares/authorizeUpload.middleware.js';

export async function showConfirm(req, res, next) {
  try {
    const token = req.query.token;
    const result = await publicService.loadConfirmPage(req.params.inquiryId, token);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(result.html);
  } catch (err) {
    return renderError(res, err, next);
  }
}

export async function submitConfirm(req, res, next) {
  const uploaded = Array.isArray(req.files) ? req.files : [];
  try {
    const token = req.body.token || req.query.token;

    // Load inquiry once for slot mapping (token verified again inside service)
    const inquiry = await Inquiry.findById(req.params.inquiryId);
    let supportDocuments = supportDocumentsFromUpload(uploaded, inquiry);

    // Legacy single field fallback
    let supportDocument = null;
    if (!supportDocuments.length && uploaded.length === 1) {
      const only = uploaded[0];
      if (only.fieldname === 'supportDocument') {
        supportDocument = legacyMetaFromFile(only);
      }
    }

    const result = await publicService.confirmInquiry(
      req.params.inquiryId,
      { token, supportDocuments, supportDocument },
      {
        ip: resolveClientIp(req),
        userAgent: req.headers['user-agent'] || '',
      }
    );

    // Already authorized / race — do not keep this request's uploads
    if (!result.savedDocuments && uploaded.length) {
      unlinkUploadedFiles(uploaded);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(result.html);
  } catch (err) {
    unlinkUploadedFiles(uploaded);
    if (err instanceof AppError && err.statusCode === 400) {
      return renderConfirmError(req, res, next, err);
    }
    return renderError(res, err, next);
  }
}

/** Re-show confirm page with error (upload / validation). */
export async function renderConfirmError(req, res, next, err) {
  try {
    const token = req.body?.token || req.query?.token;
    const inquiry = await Inquiry.findById(req.params.inquiryId);
    const agency = inquiry ? await Agency.findById(inquiry.agencyId) : null;
    const fills = inquiry ? fillsFromInquiry(inquiry, agency) : {};
    const authorizationHtml = inquiry
      ? renderAuthorizationHtml(inquiry.authorizationText || '', fills)
      : '';
    const html = await renderTemplate('confirmPage.ejs', {
      inquiry,
      agency,
      token,
      error: err.message || 'Unable to authorize',
      authorizationHtml,
      docSlots: inquiry ? buildDocSlots(inquiry) : [],
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(err.statusCode || 400).send(html);
  } catch (inner) {
    return renderError(res, inner, next);
  }
}

function renderError(res, err, next) {
  if (err instanceof AppError) {
    const safe = String(err.message).replace(/[<>&]/g, '');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(err.statusCode).send(`<!DOCTYPE html>
<html><body style="font-family:Arial;padding:40px;text-align:center;">
  <h2>Unable to continue</h2>
  <p>${safe}</p>
</body></html>`);
  }
  return next(err);
}
