import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  AUTHORIZE_UPLOAD_ROOT,
  resolveSupportDocumentAbsolutePath,
} from '../middlewares/authorizeUpload.middleware.js';

/** Plan B retention window (UI countdown now; cron delete later). */
export const SUPPORT_DOC_TTL_MS = 3 * 24 * 60 * 60 * 1000;

export const DOC_FIELD_CARDHOLDER = 'doc__cardholder';
export const DOC_FIELD_PASSENGER_PREFIX = 'doc__passenger__';

/**
 * Plan B slots for confirm page: cardholder + each passenger (all optional).
 * Future Plan A: filter by inquiry.docRequest.slots.
 */
export function buildDocSlots(inquiry) {
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
