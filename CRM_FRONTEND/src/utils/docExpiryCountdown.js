/** Match backend SUPPORT_DOC_TTL_MS (3 days). */
export const SUPPORT_DOC_TTL_MS = 3 * 24 * 60 * 60 * 1000;

export function resolveDocExpiresAt(doc) {
  if (!doc) return null;
  if (doc.expiresAt) {
    const d = new Date(doc.expiresAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (doc.uploadedAt) {
    const u = new Date(doc.uploadedAt);
    if (!Number.isNaN(u.getTime())) {
      return new Date(u.getTime() + SUPPORT_DOC_TTL_MS);
    }
  }
  return null;
}

/** Human remaining string, e.g. "2d 14h 05m" or "Expired". */
export function formatDocCountdown(expiresAt, now = new Date()) {
  if (!expiresAt) return '';
  const end = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(end.getTime())) return '';
  const ms = end.getTime() - now.getTime();
  if (ms <= 0) return 'Expired';

  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  }
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  }
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

/**
 * Normalize inquiry docs for agent UI (array + legacy single).
 */
export function listInquirySupportDocs(inquiry) {
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
        label: 'Supporting document',
        docKind: 'passport',
        originalName: legacy.originalName || '',
        relativePath: legacy.relativePath,
        mimeType: legacy.mimeType || '',
        uploadedAt: legacy.uploadedAt || null,
        expiresAt: legacy.uploadedAt
          ? new Date(
              new Date(legacy.uploadedAt).getTime() + SUPPORT_DOC_TTL_MS
            ).toISOString()
          : null,
      },
    ];
  }
  return [];
}

export function docRoleLabel(doc) {
  if (!doc) return 'Document';
  if (doc.role === 'cardholder') return 'Cardholder';
  if (doc.role === 'passenger') return 'Passenger';
  return 'Document';
}
