// Wix Data hooks. Wix calls these automatically on every wix-data operation
// against the named collection (from page code, web methods, the CMS UI, or
// the dashboard), unless the caller passes { suppressHooks: true }.
//
// Naming convention (required by Wix): <collectionId>_<hookName>
// Docs: wix-data hooks — beforeInsert, afterInsert, beforeUpdate, afterUpdate,
//       beforeRemove, afterRemove, beforeQuery, afterQuery, onFailure.

import wixData from 'wix-data';
import {
  COLLECTIONS,
  ACT_TYPES,
  ID_METHODS,
  DOC_STATUS,
  DOC_STATUSES,
  DOC_STATUS_TRANSITIONS,
} from 'public/constants.js';
import {
  ValidationError,
  requireString,
  optionalString,
  requireOneOf,
  requireDate,
  requireMoney,
  isSiteOwner,
} from 'backend/lib/validators.js';
import { normalizeCredentials, deriveCredentialFields } from 'backend/lib/credentials.js';

const ELEVATED = { suppressAuth: true, suppressHooks: true };

/* ───────────────────────────── UserProfile ───────────────────────────── */

export async function UserProfile_beforeInsert(item, context) {
  if (!context.userId) {
    throw new ValidationError('You must be logged in to create a profile');
  }

  // One profile per member.
  const existing = await wixData
    .query(COLLECTIONS.USER_PROFILE)
    .eq('_owner', context.userId)
    .limit(1)
    .find(ELEVATED);
  if (existing.items.length > 0) {
    throw new ValidationError('A profile already exists for this member');
  }

  applyProfileRules(item);
  return item;
}

export async function UserProfile_beforeUpdate(item, context) {
  const current = await wixData.get(COLLECTIONS.USER_PROFILE, item._id, ELEVATED);
  if (!current) throw new ValidationError('Profile not found');

  // Ownership can never be reassigned through an update.
  item._owner = current._owner;

  applyProfileRules(item);
  return item;
}

export function UserProfile_beforeRemove(itemId, context) {
  if (!isSiteOwner(context)) {
    throw new ValidationError('Profiles can only be removed by a site owner');
  }
  return itemId;
}

function applyProfileRules(item) {
  optionalString(item, 'displayName', { max: 200 });
  optionalString(item, 'businessName', { max: 200 });
  optionalString(item, 'email', { max: 254 });
  optionalString(item, 'phone', { max: 40 });
  optionalString(item, 'commissionState', { max: 60 });
  optionalString(item, 'commissionNumber', { max: 60 });

  item.credentials = normalizeCredentials(item.credentials);
  const derived = deriveCredentialFields(item.credentials);
  item.nextCredentialExpiry = derived.nextCredentialExpiry;
  item.credentialStatus = derived.credentialStatus;
}

/* ──────────────────────────── TransactionLog ─────────────────────────── */

// Only these fields may change after a journal entry is written.
const TRANSACTION_MUTABLE_FIELDS = new Set([
  'notes',
  'clientEmail',
  'clientPhone',
  'voided',
  'voidReason',
]);

export async function TransactionLog_beforeInsert(item, context) {
  if (!context.userId) {
    throw new ValidationError('You must be logged in to log a transaction');
  }

  requireDate(item, 'actDate', { allowFuture: false });
  requireOneOf(item, 'actType', ACT_TYPES);
  requireString(item, 'clientName', { max: 200 });
  requireString(item, 'clientAddress', { max: 500 });
  requireOneOf(item, 'idMethod', ID_METHODS);
  requireMoney(item, 'fee');
  optionalString(item, 'clientEmail', { max: 254 });
  optionalString(item, 'clientPhone', { max: 40 });
  optionalString(item, 'documentDescription', { max: 500 });
  optionalString(item, 'notes', { max: 4000 });

  item.voided = false;
  item.voidReason = undefined;
  item.entryNumber = await nextEntryNumber(context.userId);
  return item;
}

export async function TransactionLog_beforeUpdate(item, context) {
  const current = await wixData.get(COLLECTIONS.TRANSACTION_LOG, item._id, ELEVATED);
  if (!current) throw new ValidationError('Transaction not found');

  // Lock every field that is not explicitly mutable, including ownership
  // and the entry number. This makes the log append-only in practice.
  for (const key of Object.keys(current)) {
    if (!TRANSACTION_MUTABLE_FIELDS.has(key)) item[key] = current[key];
  }

  optionalString(item, 'notes', { max: 4000 });
  optionalString(item, 'clientEmail', { max: 254 });
  optionalString(item, 'clientPhone', { max: 40 });

  // Voiding is a one-way, reasoned action; it is how a mistaken entry is
  // corrected instead of deleting it.
  if (current.voided && item.voided === false) {
    throw new ValidationError('A voided entry cannot be un-voided');
  }
  if (item.voided === true) {
    if (!current.voided) requireString(item, 'voidReason', { max: 500 });
  } else {
    item.voided = false;
    item.voidReason = undefined;
  }

  return item;
}

export function TransactionLog_beforeRemove(itemId, context) {
  if (!isSiteOwner(context)) {
    throw new ValidationError('Journal entries cannot be deleted. Void the entry instead.');
  }
  return itemId;
}

async function nextEntryNumber(ownerId) {
  // Per-member sequential number. Adequate for a single notary; a
  // high-concurrency site would move this to a counter collection.
  const last = await wixData
    .query(COLLECTIONS.TRANSACTION_LOG)
    .eq('_owner', ownerId)
    .descending('entryNumber')
    .limit(1)
    .find(ELEVATED);
  const lastNumber = last.items[0] && Number(last.items[0].entryNumber);
  return Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
}

/* ──────────────────────────── DocumentStatus ─────────────────────────── */

export async function DocumentStatus_beforeInsert(item, context) {
  if (!context.userId) {
    throw new ValidationError('You must be logged in to create a document');
  }

  requireString(item, 'title', { max: 300 });
  optionalString(item, 'clientName', { max: 200 });
  optionalString(item, 'fileName', { max: 255 });
  optionalString(item, 'notes', { max: 4000 });
  optionalString(item, 'fileUrl', { max: 2000 });

  if (item.status === undefined || item.status === null || item.status === '') {
    item.status = DOC_STATUS.DRAFT;
  }
  requireOneOf(item, 'status', DOC_STATUSES);

  await assertTransactionOwnedBy(item.transaction, context);

  const now = new Date();
  item.statusHistory = [historyEntry(item.status, now, context.userId)];
  item.lastStatusChange = now;
  item.completedAt = item.status === DOC_STATUS.COMPLETED ? now : undefined;
  return item;
}

export async function DocumentStatus_beforeUpdate(item, context) {
  const current = await wixData.get(COLLECTIONS.DOCUMENT_STATUS, item._id, ELEVATED);
  if (!current) throw new ValidationError('Document not found');

  item._owner = current._owner;
  // History fields are hook-owned; ignore whatever the caller sent.
  item.statusHistory = Array.isArray(current.statusHistory) ? current.statusHistory : [];
  item.lastStatusChange = current.lastStatusChange;
  item.completedAt = current.completedAt;

  requireString(item, 'title', { max: 300 });
  optionalString(item, 'clientName', { max: 200 });
  optionalString(item, 'fileName', { max: 255 });
  optionalString(item, 'notes', { max: 4000 });
  optionalString(item, 'fileUrl', { max: 2000 });

  const from = current.status || DOC_STATUS.DRAFT;
  const to = item.status || from;
  requireOneOf(item, 'status', DOC_STATUSES);

  if (from === DOC_STATUS.COMPLETED && !isSiteOwner(context)) {
    // Completed documents are frozen for members: no field edits, no reopening.
    throw new ValidationError('Completed documents cannot be modified');
  }

  if (to !== from) {
    const allowed = DOC_STATUS_TRANSITIONS[from] || [];
    if (!allowed.includes(to) && !isSiteOwner(context)) {
      throw new ValidationError(`Cannot move a document from "${from}" to "${to}"`);
    }
    const now = new Date();
    item.statusHistory = [...item.statusHistory, historyEntry(to, now, context.userId)];
    item.lastStatusChange = now;
    item.completedAt = to === DOC_STATUS.COMPLETED ? now : undefined;
  }

  if (item.transaction !== current.transaction) {
    await assertTransactionOwnedBy(item.transaction, context);
  }

  return item;
}

export async function DocumentStatus_beforeRemove(itemId, context) {
  const current = await wixData.get(COLLECTIONS.DOCUMENT_STATUS, itemId, ELEVATED);
  if (current && current.status === DOC_STATUS.COMPLETED && !isSiteOwner(context)) {
    throw new ValidationError('Completed documents cannot be deleted');
  }
  return itemId;
}

async function assertTransactionOwnedBy(transactionRef, context) {
  if (!transactionRef) return;
  const id = typeof transactionRef === 'string' ? transactionRef : transactionRef._id;
  if (!id) throw new ValidationError('transaction reference is malformed', 'transaction');

  const tx = await wixData.get(COLLECTIONS.TRANSACTION_LOG, id, ELEVATED);
  if (!tx) throw new ValidationError('Linked transaction does not exist', 'transaction');
  if (tx._owner !== context.userId && !isSiteOwner(context)) {
    throw new ValidationError('Linked transaction belongs to another member', 'transaction');
  }
}

function historyEntry(status, at, by) {
  return { status, at, by: by || null };
}

/* ─────────────────────────────── Failures ────────────────────────────── */

export function UserProfile_onFailure(error, context) { logFailure(error, context); }
export function TransactionLog_onFailure(error, context) { logFailure(error, context); }
export function DocumentStatus_onFailure(error, context) { logFailure(error, context); }

function logFailure(error, context) {
  // ValidationErrors are expected user-facing rejections; everything else is
  // worth investigating in Site Monitoring / Logs.
  if (error && error.name === 'ValidationError') return;
  console.error(`[data-hook] ${context.collectionName} failed for user ${context.userId}:`, error);
}
