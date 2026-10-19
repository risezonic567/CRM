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

function safeInquiryUploadDir(inquiryId) {
  const id = String(inquiryId || '');
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new AppError('Invalid inquiry', 400);
  }
  const dir = path.resolve(AUTHORIZE_UPLOAD_ROOT, id);
  if (
    dir !== AUTHORIZE_UPLOAD_ROOT &&
    !dir.startsWith(AUTHORIZE_UPLOAD_ROOT + path.sep)
  ) {
    throw new AppError('Invalid document path', 400);
  }
  return dir;
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const dir = safeInquiryUploadDir(req.params.inquiryId);
      ensureDir(dir);
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename(_req, file, cb) {
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) {
      return cb(new AppError('Only PDF, JPG, or PNG files are allowed (max 5 MB)', 400));
    }
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
  if (
    abs !== AUTHORIZE_UPLOAD_ROOT &&
    !abs.startsWith(AUTHORIZE_UPLOAD_ROOT + path.sep)
  ) {
    throw new AppError('Invalid document path', 400);
  }
  return abs;
}

/**
 * Reject client MIME spoofing — check magic bytes after multer write.
 * @param {Express.Multer.File} file
 */
export function assertUploadedFileMagic(file) {
  if (!file?.path) {
    throw new AppError('Upload failed', 400);
  }
  const fd = fs.openSync(file.path, 'r');
  try {
    const buf = Buffer.alloc(8);
    const n = fs.readSync(fd, buf, 0, 8, 0);
    const head = buf.subarray(0, n);
    const mime = file.mimetype;
    let ok = false;
    if (mime === 'application/pdf') {
      ok = head.length >= 4 && head.subarray(0, 4).toString('ascii') === '%PDF';
    } else if (mime === 'image/jpeg') {
      ok = head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    } else if (mime === 'image/png') {
      ok =
        head.length >= 8 &&
        head[0] === 0x89 &&
        head[1] === 0x50 &&
        head[2] === 0x4e &&
        head[3] === 0x47 &&
        head[4] === 0x0d &&
        head[5] === 0x0a &&
        head[6] === 0x1a &&
        head[7] === 0x0a;
    }
    if (!ok) {
      throw new AppError('File content does not match an allowed PDF/JPG/PNG type', 400);
    }
  } finally {
    fs.closeSync(fd);
  }
}

export default optionalSupportDocumentUpload;
