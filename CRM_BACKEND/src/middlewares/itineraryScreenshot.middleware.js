import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { AppError } from '../utils/apiResponse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ITINERARY_UPLOAD_ROOT = path.resolve(
  __dirname,
  '../../uploads/itinerary'
);

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png']);
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeInquiryUploadDir(inquiryId) {
  const id = String(inquiryId || '');
  if (!/^[a-f\d]{24}$/i.test(id)) {
    throw new AppError('Invalid inquiry', 400);
  }
  const dir = path.resolve(ITINERARY_UPLOAD_ROOT, id);
  if (
    dir !== ITINERARY_UPLOAD_ROOT &&
    !dir.startsWith(ITINERARY_UPLOAD_ROOT + path.sep)
  ) {
    throw new AppError('Invalid screenshot path', 400);
  }
  return dir;
}

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    try {
      const dir = safeInquiryUploadDir(req.params.id || req.params.inquiryId);
      ensureDir(dir);
      cb(null, dir);
    } catch (err) {
      cb(err);
    }
  },
  filename(_req, file, cb) {
    const ext = EXT_BY_MIME[file.mimetype];
    if (!ext) {
      return cb(new AppError('Only JPG or PNG screenshots allowed (max 5 MB)', 400));
    }
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(_req, file, cb) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    return cb(
      new AppError('Only JPG or PNG screenshots allowed (max 5 MB)', 400)
    );
  }
  if (String(file.fieldname || '') !== 'itineraryScreenshot') {
    return cb(new AppError('Unexpected upload field', 400));
  }
  return cb(null, true);
}

export const itineraryScreenshotUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
  fileFilter,
}).single('itineraryScreenshot');

export function itineraryScreenshotMetaFromFile(file) {
  if (!file) return null;
  const relativePath = path
    .relative(ITINERARY_UPLOAD_ROOT, file.path)
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

export function resolveItineraryScreenshotAbsolutePath(relativePath) {
  if (!relativePath) return null;
  const abs = path.resolve(ITINERARY_UPLOAD_ROOT, relativePath);
  if (
    abs !== ITINERARY_UPLOAD_ROOT &&
    !abs.startsWith(ITINERARY_UPLOAD_ROOT + path.sep)
  ) {
    throw new AppError('Invalid screenshot path', 400);
  }
  return abs;
}

/** Magic-byte check for JPEG/PNG after multer write. */
export function assertItineraryScreenshotMagic(file) {
  if (!file?.path) throw new AppError('Upload failed', 400);
  const fd = fs.openSync(file.path, 'r');
  try {
    const buf = Buffer.alloc(8);
    const n = fs.readSync(fd, buf, 0, 8, 0);
    const head = buf.subarray(0, n);
    let ok = false;
    if (file.mimetype === 'image/jpeg') {
      ok = head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    } else if (file.mimetype === 'image/png') {
      ok =
        head.length >= 8 &&
        head[0] === 0x89 &&
        head[1] === 0x50 &&
        head[2] === 0x4e &&
        head[3] === 0x47;
    }
    if (!ok) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        /* ignore */
      }
      throw new AppError('File content does not match JPG/PNG', 400);
    }
  } finally {
    fs.closeSync(fd);
  }
}
