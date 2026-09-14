// Shared enums. Importable from BOTH page code and backend code:
//   import { ACT_TYPES } from 'public/constants.js';
// Keep every allowed value here so the CMS, hooks, and UI never drift apart.

export const COLLECTIONS = Object.freeze({
  USER_PROFILE: 'UserProfile',
  TRANSACTION_LOG: 'TransactionLog',
  DOCUMENT_STATUS: 'DocumentStatus',
});

// Generic names for common notarial acts. Adjust to match your jurisdiction's
// terminology in your own words; do not paste statutory text here.
export const ACT_TYPES = Object.freeze([
  'Acknowledgment',
  'Jurat',
  'Oath or Affirmation',
  'Copy Certification',
  'Signature Witnessing',
  'Other',
]);

export const ID_METHODS = Object.freeze([
  'Government-Issued Photo ID',
  'Personally Known',
  'Credible Witness',
  'Other',
]);

export const CREDENTIAL_TYPES = Object.freeze([
  'commission',
  'bond',
  'insurance',
  'training',
  'other',
]);

// Derived on the profile from the credentials array (see backend/data.js).
export const CREDENTIAL_STATUS = Object.freeze({
  NONE: 'none',
  VALID: 'valid',
  EXPIRING: 'expiring',
  EXPIRED: 'expired',
});

// Days before expiry at which a credential flips from "valid" to "expiring".
export const CREDENTIAL_EXPIRING_WINDOW_DAYS = 60;

export const DOC_STATUS = Object.freeze({
  DRAFT: 'Draft',
  PENDING_SIGNATURE: 'Pending Signature',
  COMPLETED: 'Completed',
});

export const DOC_STATUSES = Object.freeze(Object.values(DOC_STATUS));

// Allowed forward/backward moves. Completed is terminal for members;
// only a site owner can reopen a completed document (enforced in hooks).
export const DOC_STATUS_TRANSITIONS = Object.freeze({
  [DOC_STATUS.DRAFT]: [DOC_STATUS.PENDING_SIGNATURE, DOC_STATUS.COMPLETED],
  [DOC_STATUS.PENDING_SIGNATURE]: [DOC_STATUS.DRAFT, DOC_STATUS.COMPLETED],
  [DOC_STATUS.COMPLETED]: [],
});
