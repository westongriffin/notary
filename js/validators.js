// Client-side validation that mirrors firestore.rules so users get readable
// errors before a write is attempted. The rules remain the authority.
import { ACT_TYPES, ID_METHODS, CREDENTIAL_TYPES, DOC_STATUSES } from './constants.js';

export class ValidationError extends Error {
  constructor(message, field) { super(message); this.name = 'ValidationError'; this.field = field; }
}

const need = (cond, msg, field) => { if (!cond) throw new ValidationError(msg, field); };

export function validateTransaction(t) {
  need(t.actDate instanceof Date && !Number.isNaN(t.actDate.getTime()), 'Enter a valid date and time.', 'actDate');
  need(t.actDate.getTime() <= Date.now() + 5 * 60 * 1000, 'The act date cannot be in the future.', 'actDate');
  need(ACT_TYPES.includes(t.actType), 'Choose an act type.', 'actType');
  need(typeof t.clientName === 'string' && t.clientName.length > 0 && t.clientName.length <= 200, 'Client name is required.', 'clientName');
  need(typeof t.clientAddress === 'string' && t.clientAddress.length > 0 && t.clientAddress.length <= 500, 'Client address is required.', 'clientAddress');
  need(ID_METHODS.includes(t.idMethod), 'Choose how the signer was identified.', 'idMethod');
  need(typeof t.fee === 'number' && Number.isFinite(t.fee) && t.fee >= 0 && t.fee <= 100000, 'Fee must be a number between 0 and 100,000.', 'fee');
  return t;
}

export function validateCredential(c) {
  need(Object.keys(CREDENTIAL_TYPES).includes(c.type), 'Choose a credential type.', 'type');
  need(typeof c.label === 'string' && c.label.length > 0 && c.label.length <= 200, 'Give the credential a label.', 'label');
  need(c.uploadedAt instanceof Date, 'Upload date is invalid.', 'uploadedAt');
  need(c.expiresAt instanceof Date && !Number.isNaN(c.expiresAt.getTime()), 'Enter a valid expiration date.', 'expiresAt');
  need(c.expiresAt.getTime() > c.uploadedAt.getTime(), 'Expiration must be after the upload date.', 'expiresAt');
  return c;
}

export function validateDocument(d) {
  need(typeof d.title === 'string' && d.title.length > 0 && d.title.length <= 300, 'Document title is required.', 'title');
  need(DOC_STATUSES.includes(d.status), 'Unknown status.', 'status');
  return d;
}

export function money(value) {
  const n = typeof value === 'string' ? Number(value.replace(/[$,\s]/g, '')) : Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}
