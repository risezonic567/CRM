import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import config from '../config/index.js';
import {
  AUTHORIZE_UPLOAD_ROOT,
  resolveSupportDocumentAbsolutePath,
} from '../middlewares/authorizeUpload.middleware.js';

/** Retention window from env SUPPORT_DOC_TTL_DAYS (default 3). */
export const SUPPORT_DOC_TTL_MS = config.supportDocs.ttlMs;

export const DOC_FIELD_CARDHOLDER = 'doc__cardholder';
export const DOC_FIELD_PASSENGER_PREFIX = 'doc__passenger__';

/**
 * Full slot list (Plan B): cardholder + each passenger with _id.
 */
export function buildAllDocSlots(inquiry) {
  const billing = inquiry?.billing || {};
  const cardholderName =
    String(billing.cardholderName || '').trim() ||
    [inquiry?.customer?.firstName, inquiry?.customer?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    'Cardholder';

  const slots = [
    {
      key: DOC_FIELD_CARDHOLDER,
      role: 'cardholder',
      passengerId: null,
      label: cardholderName,
      docKind: 'passport',
    },
  ];

  for (const p of inquiry?.passengers || []) {
    const id = p?._id != null ? String(p._id) : '';
    if (!id) continue;
    const name =
      [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || 'Passenger';
    slots.push({
      key: `${DOC_FIELD_PASSENGER_PREFIX}${id}`,
      role: 'passenger',
      passengerId: id,
      label: name,
      docKind: 'passport',
    });
  }

  return slots;
}

/**
 * Confirm-page slots. Plan A: filter by inquiry.docRequest when mode is
 * agent_selected. Missing/all_slots → full list (Plan B, backward compatible).
 */
export function buildDocSlots(inquiry) {
  const all = buildAllDocSlots(inquiry);
  const mode = inquiry?.docRequest?.mode;
  if (mode !== 'agent_selected') return all;

  const wanted = Array.isArray(inquiry.docRequest?.slots)
    ? inquiry.docRequest.slots
    : [];
  if (!wanted.length) return [];

  const keys = new Set(wanted.map((s) => s?.key).filter(Boolean));
  const paxIds = new Set(
    wanted
      .filter((s) => s?.role === 'passenger' && s?.passengerId)
      .map((s) => String(s.passengerId))
  );
  const wantCard = wanted.some(
    (s) => s?.role === 'cardholder' || s?.key === DOC_FIELD_CARDHOLDER
  );

  return all.filter((s) => {
    if (keys.has(s.key)) return true;
    if (s.role === 'cardholder' && wantCard) return true;
    if (
      s.role === 'passenger' &&
      s.passengerId &&
      paxIds.has(String(s.passengerId))
    ) {
      return true;
    }
    return false;
  });
}

/**
 * Resolve agent payload → persisted docRequest after passengers have _ids.
 * Uses passengerId and/or passengerIndex (order in passengers array).
 */
export function resolveDocRequest(raw, inquiry) {
  if (!raw || raw.mode !== 'agent_selected') {
    return { mode: 'all_slots', slots: [] };
  }

  const all = buildAllDocSlots(inquiry);
  const paxSlots = all.filter((s) => s.role === 'passenger');
  const out = [];

  for (const r of raw.slots || []) {
    if (!r || typeof r !== 'object') continue;

    if (r.role === 'cardholder' || r.key === DOC_FIELD_CARDHOLDER) {
      const s = all.find((x) => x.role === 'cardholder');
      if (s) out.push({ ...s });
      continue;
    }

    if (r.role === 'passenger') {
      let s = null;
      if (r.passengerId) {
        s = all.find((x) => x.passengerId === String(r.passengerId));
      }
      if (
        !s &&
        Number.isInteger(r.passengerIndex) &&
        r.passengerIndex >= 0 &&
        r.passengerIndex < paxSlots.length
      ) {
        s = paxSlots[r.passengerIndex];
      }
      if (s) out.push({ ...s });
    }
  }

  const seen = new Set();
  const slots = out.filter((s) => {
    if (!s?.key || seen.has(s.key)) return false;
    seen.add(s.key);
    return true;
  });

  return { mode: 'agent_selected', slots };
}

export function expiresAtFromUpload(uploadedAt = new Date()) {
  const base = uploadedAt instanceof Date ? uploadedAt : new Date(uploadedAt);
  return new Date(base.getTime() + SUPPORT_DOC_TTL_MS);
}

/**
 * Map one multer file + slot → persistable meta.
 */
export function documentMetaFromFile(file, slot) {
  if (!file || !slot) return null;
  const relativePath = path
    .relative(AUTHORIZE_UPLOAD_ROOT, file.path)
    .split(path.sep)
    .join('/');
  const uploadedAt = new Date();

  return {
    id: crypto.randomUUID(),
    role: slot.role,
    passengerId: slot.passengerId || null,
    label: String(slot.label || '').slice(0, 200),
    docKind: slot.docKind || 'passport',
    originalName: String(file.originalname || '').slice(0, 255),
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    relativePath,
    uploadedAt,
    expiresAt: expiresAtFromUpload(uploadedAt),
    uploadedBy: 'customer',
  };
}

/**
 * Parse req.files (multer.any) against Plan B slots → supportDocuments[].
 */
export function supportDocumentsFromUpload(files, inquiry) {
  const slots = buildDocSlots(inquiry);
  const byKey = new Map(slots.map((s) => [s.key, s]));
  const list = [];

  for (const file of files || []) {
    const slot = byKey.get(file.fieldname);
    if (!slot) continue;
    const meta = documentMetaFromFile(file, slot);
    if (meta) list.push(meta);
  }

  return list;
}

/**
 * Read path: prefer supportDocuments[]; fall back to legacy supportDocument.
 */
export function listSupportDocuments(inquiry) {
  const arr = inquiry?.supportDocuments;
  if (Array.isArray(arr) && arr.length) {
    return arr.filter((d) => d?.relativePath);
  }
  const legacy = inquiry?.supportDocument;
  if (legacy?.relativePath) {
    return [
      {
        id: 'legacy',
        role: 'other',
        passengerId: null,
        label: 'Supporting document',
        docKind: 'passport',
        originalName: legacy.originalName || '',
        storedName: legacy.storedName || '',
        mimeType: legacy.mimeType || '',
        size: legacy.size || 0,
        relativePath: legacy.relativePath,
        uploadedAt: legacy.uploadedAt || null,
        expiresAt: legacy.uploadedAt
          ? expiresAtFromUpload(legacy.uploadedAt)
          : null,
        uploadedBy: 'customer',
      },
    ];
  }
  return [];
}

export function findSupportDocument(inquiry, docId) {
  const docs = listSupportDocuments(inquiry);
  if (!docId) return docs[0] || null;
  return docs.find((d) => String(d.id) === String(docId)) || null;
}

/** True if the file still exists under AUTHORIZE_UPLOAD_ROOT. */
export function isSupportDocFileAvailable(relativePath) {
  if (!relativePath) return false;
  try {
    const abs = resolveSupportDocumentAbsolutePath(relativePath);
    return Boolean(abs && fs.existsSync(abs));
  } catch {
    return false;
  }
}

/**
 * Attach non-persisted `available` on doc meta for agent UI (disk cleanup may
 * have removed the file while Mongo meta remains).
 */
export function attachSupportDocAvailability(inquiryPlain) {
  if (!inquiryPlain || typeof inquiryPlain !== 'object') return inquiryPlain;

  if (Array.isArray(inquiryPlain.supportDocuments)) {
    inquiryPlain.supportDocuments = inquiryPlain.supportDocuments.map((d) => ({
      ...d,
      available: isSupportDocFileAvailable(d?.relativePath),
    }));
  }

  if (inquiryPlain.supportDocument?.relativePath) {
    inquiryPlain.supportDocument = {
      ...inquiryPlain.supportDocument,
      available: isSupportDocFileAvailable(
        inquiryPlain.supportDocument.relativePath
      ),
    };
  }

  return inquiryPlain;
}

/** Best-effort delete of uploaded files (orphan cleanup). */
export function unlinkUploadedFiles(files) {
  for (const file of files || []) {
    try {
      if (file?.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch {
      // ignore
    }
  }
}

export function unlinkDocumentsByMeta(docs) {
  for (const doc of docs || []) {
    try {
      const abs = resolveSupportDocumentAbsolutePath(doc.relativePath);
      if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
    } catch {
      // ignore
    }
  }
}
