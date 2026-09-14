// Web methods called from page code:
//   import { logTransaction } from 'backend/dashboard.web';
//
// Every method requires a logged-in site member. Calls go through wix-data
// WITHOUT suppressAuth, so collection permissions (SITE_MEMBER_AUTHOR) and the
// hooks in backend/data.js both apply. Members only ever see their own rows.

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { currentMember } from 'wix-members-backend';
import { COLLECTIONS, DOC_STATUS, DOC_STATUSES } from 'public/constants.js';

const MAX_PAGE = 100;

async function requireMemberId() {
  const member = await currentMember.getMember({ fieldsets: ['PUBLIC'] });
  if (!member || !member._id) throw new Error('Not logged in');
  return member._id;
}

function clampLimit(limit, fallback = 50) {
  const n = Number(limit);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(Math.floor(n), MAX_PAGE);
}

/* ─────────────────────────────── Profile ─────────────────────────────── */

export const getMyProfile = webMethod(Permissions.SiteMember, async () => {
  const memberId = await requireMemberId();
  const res = await wixData
    .query(COLLECTIONS.USER_PROFILE)
    .eq('_owner', memberId)
    .limit(1)
    .find();
  return res.items[0] || null;
});

/** Creates the profile on first save, updates it afterwards. */
export const saveMyProfile = webMethod(Permissions.SiteMember, async (patch) => {
  const existing = await getMyProfile();
  const safePatch = pick(patch, [
    'displayName', 'businessName', 'email', 'phone', 'commissionState', 'commissionNumber',
  ]);
  if (existing) {
    return wixData.update(COLLECTIONS.USER_PROFILE, { ...existing, ...safePatch });
  }
  return wixData.insert(COLLECTIONS.USER_PROFILE, { ...safePatch, credentials: [] });
});

/**
 * Adds a credential document's metadata. `fileUrl` is the wix:document URL
 * returned by $w('#uploadButton').uploadFiles() in page code.
 */
export const addCredential = webMethod(Permissions.SiteMember, async (credential) => {
  const profile = (await getMyProfile()) || (await saveMyProfile({}));
  const credentials = [...(profile.credentials || []), {
    ...pick(credential, ['type', 'label', 'fileUrl', 'fileName', 'expiresAt']),
    uploadedAt: new Date(),
  }];
  return wixData.update(COLLECTIONS.USER_PROFILE, { ...profile, credentials });
});

export const removeCredential = webMethod(Permissions.SiteMember, async (credentialId) => {
  const profile = await getMyProfile();
  if (!profile) throw new Error('No profile');
  const credentials = (profile.credentials || []).filter((c) => c.id !== credentialId);
  return wixData.update(COLLECTIONS.USER_PROFILE, { ...profile, credentials });
});

/* ──────────────────────────── Transaction log ────────────────────────── */

export const logTransaction = webMethod(Permissions.SiteMember, async (entry) => {
  const safe = pick(entry, [
    'actDate', 'actType', 'clientName', 'clientAddress', 'clientEmail', 'clientPhone',
    'idMethod', 'fee', 'documentDescription', 'notes',
  ]);
  return wixData.insert(COLLECTIONS.TRANSACTION_LOG, safe);
});

export const updateTransactionNotes = webMethod(Permissions.SiteMember, async (id, patch) => {
  const current = await wixData.get(COLLECTIONS.TRANSACTION_LOG, id);
  if (!current) throw new Error('Transaction not found');
  const safe = pick(patch, ['notes', 'clientEmail', 'clientPhone']);
  return wixData.update(COLLECTIONS.TRANSACTION_LOG, { ...current, ...safe });
});

export const voidTransaction = webMethod(Permissions.SiteMember, async (id, reason) => {
  const current = await wixData.get(COLLECTIONS.TRANSACTION_LOG, id);
  if (!current) throw new Error('Transaction not found');
  return wixData.update(COLLECTIONS.TRANSACTION_LOG, { ...current, voided: true, voidReason: reason });
});

/**
 * @param {{ from?: Date|string, to?: Date|string, includeVoided?: boolean,
 *           limit?: number, skip?: number }} opts
 */
export const listTransactions = webMethod(Permissions.SiteMember, async (opts = {}) => {
  let q = wixData.query(COLLECTIONS.TRANSACTION_LOG).descending('actDate');
  if (opts.from) q = q.ge('actDate', new Date(opts.from));
  if (opts.to) q = q.le('actDate', new Date(opts.to));
  if (!opts.includeVoided) q = q.ne('voided', true);
  const res = await q.limit(clampLimit(opts.limit)).skip(Number(opts.skip) || 0).find();
  return { items: res.items, totalCount: res.totalCount, hasNext: res.hasNext() };
});

/* ─────────────────────────────── Documents ───────────────────────────── */

export const createDocument = webMethod(Permissions.SiteMember, async (doc) => {
  const safe = pick(doc, ['title', 'status', 'transaction', 'fileUrl', 'fileName', 'clientName', 'notes']);
  return wixData.insert(COLLECTIONS.DOCUMENT_STATUS, safe);
});

export const setDocumentStatus = webMethod(Permissions.SiteMember, async (id, status) => {
  if (!DOC_STATUSES.includes(status)) throw new Error(`Unknown status "${status}"`);
  const current = await wixData.get(COLLECTIONS.DOCUMENT_STATUS, id);
  if (!current) throw new Error('Document not found');
  return wixData.update(COLLECTIONS.DOCUMENT_STATUS, { ...current, status });
});

export const updateDocument = webMethod(Permissions.SiteMember, async (id, patch) => {
  const current = await wixData.get(COLLECTIONS.DOCUMENT_STATUS, id);
  if (!current) throw new Error('Document not found');
  const safe = pick(patch, ['title', 'transaction', 'fileUrl', 'fileName', 'clientName', 'notes']);
  return wixData.update(COLLECTIONS.DOCUMENT_STATUS, { ...current, ...safe });
});

export const listDocuments = webMethod(Permissions.SiteMember, async (opts = {}) => {
  let q = wixData.query(COLLECTIONS.DOCUMENT_STATUS).descending('lastStatusChange');
  if (opts.status) q = q.eq('status', opts.status);
  const res = await q.limit(clampLimit(opts.limit)).skip(Number(opts.skip) || 0).find();
  return { items: res.items, totalCount: res.totalCount, hasNext: res.hasNext() };
});

/* ─────────────────────────────── Summary ─────────────────────────────── */

export const getDashboardSummary = webMethod(Permissions.SiteMember, async () => {
  const [profile, txCount, draft, pending, completed] = await Promise.all([
    getMyProfile(),
    wixData.query(COLLECTIONS.TRANSACTION_LOG).ne('voided', true).count(),
    wixData.query(COLLECTIONS.DOCUMENT_STATUS).eq('status', DOC_STATUS.DRAFT).count(),
    wixData.query(COLLECTIONS.DOCUMENT_STATUS).eq('status', DOC_STATUS.PENDING_SIGNATURE).count(),
    wixData.query(COLLECTIONS.DOCUMENT_STATUS).eq('status', DOC_STATUS.COMPLETED).count(),
  ]);
  return {
    credentialStatus: profile ? profile.credentialStatus : 'none',
    nextCredentialExpiry: profile ? profile.nextCredentialExpiry : null,
    transactions: txCount,
    documents: { draft, pending, completed },
  };
});

/* ─────────────────────────────── Helpers ─────────────────────────────── */

function pick(source, keys) {
  const out = {};
  if (!source || typeof source !== 'object') return out;
  for (const k of keys) if (source[k] !== undefined) out[k] = source[k];
  return out;
}
