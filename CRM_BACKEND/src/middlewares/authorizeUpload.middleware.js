import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { AppError } from '../utils/apiResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const AUTHORIZE_UPLOAD_ROOT = path.resolve(
  __dirname,
  '../../uploads/authorize'
);

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const EXT_BY_MIME = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

const MAX_FILES = 10;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const inquiryId = String(req.params.inquiryId || 'unknown');
      const dir = path.join(AUTHORIZE_UPLOAD_ROOT, inquiryId);
      ensureDir(dir);
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename(_req, file, cb) {
    const ext =
      EXT_BY_MIME[file.mimetype] ||
      path.extname(file.originalname || '').toLowerCase() ||
      '.bin';
    const id = crypto.randomUUID();
    cb(null, `${id}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new AppError('Only PDF, JPG, or PNG files are allowed (max 5 MB)', 400)
    );
  }
  // Plan B field names: doc__cardholder | doc__passenger_<id>
  // Legacy: supportDocument
  const name = String(file.fieldname || '');
  const ok =
    name === 'supportDocument' ||
    name === 'doc__cardholder' ||
    name.startsWith('doc__passenger__');
  if (!ok) {
    return cb(new AppError('Unexpected upload field', 400));
  }
  return cb(null, true);
}

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES },
  fileFilter,
});

/**
 * Optional multi-slot docs on authorize POST (Plan B).
 * Also accepts legacy single field `supportDocument`.
 */
export const optionalSupportDocumentUpload = upload.any();

/**
 * Map multer file → persistable meta (relative path under uploads/authorize).
 * @deprecated Prefer supportDocuments utils for multi-slot; kept for legacy single.
 */
export function supportDocumentMetaFromFile(file) {
  if (!file) return null;
  const relativePath = path
    .relative(AUTHORIZE_UPLOAD_ROOT, file.path)
    .split(path.sep)
    .join('/');

  return {
    originalName: String(file.originalname || '').slice(0, 255),
    storedName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    relativePath,
    uploadedAt: new Date(),
  };
}

export function resolveSupportDocumentAbsolutePath(relativePath) {
  if (!relativePath) return null;
  const abs = path.resolve(AUTHORIZE_UPLOAD_ROOT, relativePath);
  if (!abs.startsWith(AUTHORIZE_UPLOAD_ROOT)) {
    throw new AppError('Invalid document path', 400);
  }
  return abs;
}

export default optionalSupportDocumentUpload;
