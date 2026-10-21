import * as publicService from './public.service.js';
import { AppError } from '../../utils/apiResponse.js';
import { renderTemplate } from '../notification/notification.service.js';
import { resolveClientIp } from '../../utils/clientMeta.js';
import {
  paxAuthorizationHtml,
  paxTemplateLocals,
} from '../../i18n/index.js';
import {
  buildDocSlots,
  supportDocumentsFromUpload,
  unlinkUploadedFiles,
} from '../../utils/supportDocuments.js';
import {
  supportDocumentMetaFromFile as legacyMetaFromFile,
  assertUploadedFileMagic,
} from '../../middlewares/authorizeUpload.middleware.js';
import config from '../../config/index.js';

function setPublicSecurityHeaders(res) {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

function resolvePublicToken(req) {
  const inquiryId = req.params.inquiryId;
  const cookieName = publicService.publicConfirmCookieName(inquiryId);
  return (
    req.query.token ||
    req.body?.token ||
    req.cookies?.[cookieName] ||
    ''
  );
}

export async function showConfirm(req, res, next) {
  try {
    setPublicSecurityHeaders(res);
    const inquiryId = req.params.inquiryId;

    // Email links use ?token= once → httpOnly cookie → redirect strips token from URL/logs/history
    if (req.query.token) {
      await publicService.verifyAndLoad(inquiryId, req.query.token);
      res.cookie(publicService.publicConfirmCookieName(inquiryId), req.query.token, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: 'lax',
        path: `/public/confirm/${inquiryId}`,
        maxAge: 2 * 60 * 60 * 1000,
      });
      return res.redirect(302, `/public/confirm/${inquiryId}`);
    }

    const token = resolvePublicToken(req);
    const result = await publicService.loadConfirmPage(inquiryId, token);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(result.html);
  } catch (err) {
    return renderError(res, err, next);
  }
}

/**
 * Runs before multer — token from query or confirm cookie only (multipart body not parsed yet).
 */
export async function requireConfirmToken(req, res, next) {
  try {
    setPublicSecurityHeaders(res);
    const token =
      req.query.token ||
      req.cookies?.[publicService.publicConfirmCookieName(req.params.inquiryId)] ||
      '';
    await publicService.verifyAndLoad(req.params.inquiryId, token);
    req.publicConfirmToken = token;
    return next();
  } catch (err) {
    return renderError(res, err, next);
  }
}

export async function submitConfirm(req, res, next) {
  const uploaded = Array.isArray(req.files) ? req.files : [];
  try {
    setPublicSecurityHeaders(res);
    const token = resolvePublicToken(req) || req.publicConfirmToken;
    const { inquiry } = await publicService.verifyAndLoad(
      req.params.inquiryId,
      token
    );

    for (const file of uploaded) {
      try {
        assertUploadedFileMagic(file);
      } catch (magicErr) {
        unlinkUploadedFiles(uploaded);
        throw magicErr;
      }
    }

    const requiredSlots = buildDocSlots(inquiry);
    if (requiredSlots.length > 0) {
      const byField = new Map(
        (uploaded || []).map((f) => [f.fieldname, f])
      );
      const missing = requiredSlots.filter((s) => !byField.has(s.key));
      if (missing.length) {
        throw new AppError(
          'Please upload all required supporting documents before authorizing',
          400
        );
      }
    }

    let supportDocuments = supportDocumentsFromUpload(uploaded, inquiry);

    let supportDocument = null;
    if (
      !requiredSlots.length &&
      !supportDocuments.length &&
      uploaded.length === 1
    ) {
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

/** Re-show confirm page with error — only after token verified (no anonymous PII). */
export async function renderConfirmError(req, res, next, err) {
  try {
    setPublicSecurityHeaders(res);
    const token = resolvePublicToken(req) || req.publicConfirmToken;
    const { inquiry, agency } = await publicService.verifyAndLoad(
      req.params.inquiryId,
      token
    );
    const html = await renderTemplate('confirmPage.ejs', {
      inquiry,
      agency,
      token,
      error: err.message || 'Unable to authorize',
      authorizationHtml: paxAuthorizationHtml(inquiry, agency),
      docSlots: buildDocSlots(inquiry),
      ...paxTemplateLocals(inquiry),
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(err.statusCode || 400).send(html);
  } catch (inner) {
    return renderError(res, inner, next);
  }
}

function renderError(res, err, next) {
  setPublicSecurityHeaders(res);
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
