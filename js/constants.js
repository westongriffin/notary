// Single source of truth for allowed values. firestore.rules repeats these
// lists server-side; keep the two in sync when editing.

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

export const CREDENTIAL_TYPES = Object.freeze({
  commission: 'Commission certificate',
  bond: 'Surety bond',
  insurance: 'E&O insurance',
  training: 'Training / course',
  other: 'Other',
});

export const CREDENTIAL_EXPIRING_WINDOW_DAYS = 60;

export const CREDENTIAL_STATUS = Object.freeze({
  NONE: 'none',
  VALID: 'valid',
  EXPIRING: 'expiring',
  EXPIRED: 'expired',
});

export const DOC_STATUS = Object.freeze({
  DRAFT: 'Draft',
  PENDING: 'Pending Signature',
  COMPLETED: 'Completed',
});

export const DOC_STATUSES = Object.freeze(Object.values(DOC_STATUS));

// Completed is terminal (enforced in firestore.rules as well).
export const DOC_STATUS_TRANSITIONS = Object.freeze({
  [DOC_STATUS.DRAFT]: [DOC_STATUS.PENDING, DOC_STATUS.COMPLETED],
  [DOC_STATUS.PENDING]: [DOC_STATUS.DRAFT, DOC_STATUS.COMPLETED],
  [DOC_STATUS.COMPLETED]: [],
});
