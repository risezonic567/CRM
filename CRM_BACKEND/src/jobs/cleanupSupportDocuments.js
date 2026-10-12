import fs from 'fs/promises';
import path from 'path';
import config from '../config/index.js';
import { AUTHORIZE_UPLOAD_ROOT } from '../middlewares/authorizeUpload.middleware.js';
import logger from '../utils/logger.js';

const EXPECTED_SUFFIX = path.join('uploads', 'authorize');
const INTERVAL_MS = config.supportDocs.cleanupIntervalMs;

let running = false;
let started = false;

/**
 * Refuse to run unless root is absolute and clearly the authorize uploads dir.
 * Never fall back to cwd.
 */
function assertSafeAuthorizeRoot(root) {
  if (!root || typeof root !== 'string' || !root.trim()) {
    return { ok: false, reason: 'AUTHORIZE_UPLOAD_ROOT is empty' };
  }
  if (!path.isAbsolute(root)) {
    return { ok: false, reason: 'AUTHORIZE_UPLOAD_ROOT is not absolute' };
  }
  const normalized = path.normalize(root);
  const suffixOk = normalized
    .toLowerCase()
    .endsWith(EXPECTED_SUFFIX.toLowerCase());
  if (!suffixOk) {
    return {
      ok: false,
      reason: `path must end with ${EXPECTED_SUFFIX}`,
    };
  }
  return { ok: true, root: normalized };
}

async function walkAndCollect(dir, root, cutoffMs, out) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    logger.error('Support doc cleanup: readdir failed', {
      dir,
      code: err.code,
      message: err.message,
    });
    return;
  }

  for (const ent of entries) {
    const full = path.join(dir, ent.name);

    // Prefer Dirent; re-check with lstat (do not follow symlinks)
    let st;
    try {
      st = await fs.lstat(full);
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      logger.error('Support doc cleanup: lstat failed', {
        path: full,
        code: err.code,
        message: err.message,
      });
      continue;
    }

    if (st.isSymbolicLink()) {
      logger.warn('Support doc cleanup: skip symlink', { path: full });
      continue;
    }

    if (st.isDirectory()) {
      await walkAndCollect(full, root, cutoffMs, out);
      continue;
    }

    if (!st.isFile()) continue;

    if (st.mtimeMs < cutoffMs) {
      out.files.push(full);
    }
  }
}

async function removeEmptyDirs(dir, root) {
  if (path.normalize(dir) === path.normalize(root)) return;

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    return;
  }

  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    let st;
    try {
      st = await fs.lstat(full);
    } catch {
      continue;
    }
    if (st.isDirectory() && !st.isSymbolicLink()) {
      await removeEmptyDirs(full, root);
    }
  }

  try {
    const left = await fs.readdir(dir);
    if (left.length === 0 && path.normalize(dir) !== path.normalize(root)) {
      if (config.supportDocs.cleanupDryRun) {
        logger.info('Support doc cleanup DRY_RUN: would rmdir', { dir });
      } else {
        await fs.rmdir(dir);
      }
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      logger.error('Support doc cleanup: rmdir failed', {
        dir,
        code: err.code,
        message: err.message,
      });
    }
  }
}

/**
 * Disk-only cleanup. Does not touch MongoDB.
 */
export async function runSupportDocCleanupOnce() {
  const check = assertSafeAuthorizeRoot(AUTHORIZE_UPLOAD_ROOT);
  if (!check.ok) {
    logger.error('Support doc cleanup skipped — unsafe root', {
      root: AUTHORIZE_UPLOAD_ROOT,
      reason: check.reason,
    });
    return { skipped: true, reason: check.reason };
  }

  const root = check.root;
  const ttlMs = config.supportDocs.ttlMs;
  const dryRun = config.supportDocs.cleanupDryRun;
  const cutoffMs = Date.now() - ttlMs;
  const out = { files: [] };

  await walkAndCollect(root, root, cutoffMs, out);

  let deleted = 0;
  let errors = 0;

  for (const filePath of out.files) {
    try {
      if (dryRun) {
        logger.info('Support doc cleanup DRY_RUN: would delete', {
          path: filePath,
        });
      } else {
        await fs.unlink(filePath);
        deleted += 1;
      }
    } catch (err) {
      if (err.code === 'ENOENT') continue;
      errors += 1;
      logger.error('Support doc cleanup: unlink failed', {
        path: filePath,
        code: err.code,
        message: err.message,
      });
    }
  }

  await removeEmptyDirs(root, root);

  logger.info('Support doc cleanup finished', {
    dryRun,
    ttlDays: config.supportDocs.ttlDays,
    candidates: out.files.length,
    deleted: dryRun ? 0 : deleted,
    errors,
    root,
  });

  return {
    dryRun,
    candidates: out.files.length,
    deleted: dryRun ? 0 : deleted,
    errors,
  };
}

async function tick() {
  if (running) {
    logger.warn('Support doc cleanup skipped — previous run still active');
    return;
  }
  running = true;
  try {
    await runSupportDocCleanupOnce();
  } catch (err) {
    logger.error('Support doc cleanup crashed (isolated)', {
      message: err.message,
      stack: err.stack,
    });
  } finally {
    running = false;
  }
}

/**
 * Fire-and-forget from listen callback (same pattern as verifyMail).
 * Never throws to caller; never process.exit.
 */
export function startCleanupJob() {
  if (started) return;
  started = true;

  logger.info('Support doc cleanup job scheduled', {
    ttlDays: config.supportDocs.ttlDays,
    dryRun: config.supportDocs.cleanupDryRun,
    intervalMin: INTERVAL_MS / 60000,
    root: AUTHORIZE_UPLOAD_ROOT,
  });

  // Run once after boot (non-blocking)
  setImmediate(() => {
    tick();
  });

  const timer = setInterval(() => {
    tick();
  }, INTERVAL_MS);
  timer.unref();
}

export default startCleanupJob;
