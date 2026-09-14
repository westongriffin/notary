// Pure functions for the UserProfile.credentials array and its derived fields.
// Used by the data hooks and by the nightly refresh job.

import {
  CREDENTIAL_TYPES,
  CREDENTIAL_STATUS,
  CREDENTIAL_EXPIRING_WINDOW_DAYS,
} from 'public/constants.js';
import { ValidationError, toDate, addDays } from 'backend/lib/validators.js';

/**
 * Validates and normalizes each credential entry. Mutates and returns the array.
 * Shape of one credential:
 * {
 *   id:         string   (stable id so the UI can edit/remove a row)
 *   type:       one of CREDENTIAL_TYPES
 *   label:      string   (e.g. "Commission certificate")
 *   fileUrl:    string   (wix:document://... URL returned by the upload button)
 *   fileName:   string
 *   uploadedAt: Date
 *   expiresAt:  Date
 * }
 */
export function normalizeCredentials(credentials) {
  if (credentials === undefined || credentials === null) return [];
  if (!Array.isArray(credentials)) {
    throw new ValidationError('credentials must be an array', 'credentials');
  }
  if (credentials.length > 50) {
    throw new ValidationError('Too many credentials on one profile', 'credentials');
  }

  return credentials.map((raw, i) => {
    const c = { ...raw };
    const where = `credentials[${i}]`;

    if (!CREDENTIAL_TYPES.includes(c.type)) {
      throw new ValidationError(`${where}.type must be one of: ${CREDENTIAL_TYPES.join(', ')}`, 'credentials');
    }
    if (typeof c.label !== 'string' || !c.label.trim()) {
      throw new ValidationError(`${where}.label is required`, 'credentials');
    }
    if (typeof c.fileUrl !== 'string' || !c.fileUrl.trim()) {
      throw new ValidationError(`${where}.fileUrl is required`, 'credentials');
    }

    const uploadedAt = toDate(c.uploadedAt) || new Date();
    const expiresAt = toDate(c.expiresAt);
    if (!expiresAt) {
      throw new ValidationError(`${where}.expiresAt must be a valid date`, 'credentials');
    }
    if (expiresAt.getTime() <= uploadedAt.getTime()) {
      throw new ValidationError(`${where}.expiresAt must be after uploadedAt`, 'credentials');
    }

    return {
      id: typeof c.id === 'string' && c.id ? c.id : makeId(),
      type: c.type,
      label: c.label.trim().slice(0, 200),
      fileUrl: c.fileUrl.trim(),
      fileName: typeof c.fileName === 'string' ? c.fileName.trim().slice(0, 255) : '',
      uploadedAt,
      expiresAt,
    };
  });
}

/** Returns { nextCredentialExpiry: Date|null, credentialStatus: string }. */
export function deriveCredentialFields(credentials, now = new Date()) {
  if (!credentials || credentials.length === 0) {
    return { nextCredentialExpiry: null, credentialStatus: CREDENTIAL_STATUS.NONE };
  }

  const soonest = credentials
    .map((c) => toDate(c.expiresAt))
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  if (!soonest) {
    return { nextCredentialExpiry: null, credentialStatus: CREDENTIAL_STATUS.NONE };
  }

  let credentialStatus = CREDENTIAL_STATUS.VALID;
  if (soonest.getTime() <= now.getTime()) {
    credentialStatus = CREDENTIAL_STATUS.EXPIRED;
  } else if (soonest.getTime() <= addDays(now, CREDENTIAL_EXPIRING_WINDOW_DAYS).getTime()) {
    credentialStatus = CREDENTIAL_STATUS.EXPIRING;
  }

  return { nextCredentialExpiry: soonest, credentialStatus };
}

function makeId() {
  return `cred_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
