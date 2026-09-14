// All Firestore access. Every path is scoped under users/{uid}; firestore.rules
// enforces ownership and validation on the server no matter what happens here.
import {
  db, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, runTransaction, serverTimestamp, Timestamp,
} from './firebase.js';
import { currentUser } from './auth.js';
import {
  CREDENTIAL_STATUS, CREDENTIAL_EXPIRING_WINDOW_DAYS, DOC_STATUS, DOC_STATUS_TRANSITIONS,
} from './constants.js';
import { validateTransaction, validateCredential, validateDocument } from './validators.js';

const uid = () => {
  const u = currentUser();
  if (!u) throw new Error('Not signed in');
  return u.uid;
};
const profileRef = () => doc(db, 'users', uid());
const col = (name) => collection(db, 'users', uid(), name);
const ts = (d) => Timestamp.fromDate(d);
const strip = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
const withId = (snap) => ({ id: snap.id, ...snap.data() });

/* ───────────────────────────── profile ───────────────────────────── */

/** Creates the profile document on first sign-in. Safe to call every load. */
export async function ensureProfile(user) {
  const snap = await getDoc(profileRef());
  if (snap.exists()) return withId(snap);
  const data = strip({
    displayName: user.displayName || undefined,
    email: user.email || undefined,
    nextEntryNumber: 1,
    createdAt: serverTimestamp(),
  });
  await setDoc(profileRef(), data);
  return withId(await getDoc(profileRef()));
}

export async function getProfile() {
  const snap = await getDoc(profileRef());
  return snap.exists() ? withId(snap) : null;
}

export async function saveProfile(patch) {
  const allowed = ['displayName', 'businessName', 'email', 'phone', 'commissionState', 'commissionNumber'];
  const data = {};
  for (const k of allowed) data[k] = patch[k] === undefined ? null : String(patch[k]).trim();
  data.updatedAt = serverTimestamp();
  await updateDoc(profileRef(), data);
}

/* ─────────────────────────── credentials ─────────────────────────── */

export async function listCredentials() {
  const snap = await getDocs(query(col('credentials'), orderBy('expiresAt', 'asc')));
  return snap.docs.map(withId);
}

export async function addCredential(input) {
  const c = validateCredential({
    type: input.type,
    label: input.label,
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    notes: input.notes,
    uploadedAt: input.uploadedAt || new Date(),
    expiresAt: input.expiresAt,
  });
  await addDoc(col('credentials'), strip({
    type: c.type,
    label: c.label,
    fileUrl: c.fileUrl,
    fileName: c.fileName,
    notes: c.notes,
    uploadedAt: ts(c.uploadedAt),
    expiresAt: ts(c.expiresAt),
    createdAt: serverTimestamp(),
  }));
}

export function removeCredential(id) { return deleteDoc(doc(col('credentials'), id)); }

export function credentialStatus(cred, now = new Date()) {
  const exp = cred.expiresAt?.toDate ? cred.expiresAt.toDate() : new Date(cred.expiresAt);
  if (exp.getTime() <= now.getTime()) return CREDENTIAL_STATUS.EXPIRED;
  const window = new Date(now.getTime() + CREDENTIAL_EXPIRING_WINDOW_DAYS * 86400000);
  return exp.getTime() <= window.getTime() ? CREDENTIAL_STATUS.EXPIRING : CREDENTIAL_STATUS.VALID;
}

/** Overall status = the worst status among all credentials. */
export function summarizeCredentials(creds, now = new Date()) {
  if (!creds.length) return { status: CREDENTIAL_STATUS.NONE, nextExpiry: null };
  const rank = { [CREDENTIAL_STATUS.VALID]: 0, [CREDENTIAL_STATUS.EXPIRING]: 1, [CREDENTIAL_STATUS.EXPIRED]: 2 };
  let worst = CREDENTIAL_STATUS.VALID;
  let nextExpiry = null;
  for (const c of creds) {
    const s = credentialStatus(c, now);
    if (rank[s] > rank[worst]) worst = s;
    const exp = c.expiresAt.toDate();
    if (!nextExpiry || exp < nextExpiry) nextExpiry = exp;
  }
  return { status: worst, nextExpiry };
}

/* ─────────────────────────── transactions ────────────────────────── */

export async function listTransactions({ max = 500 } = {}) {
  const snap = await getDocs(query(col('transactions'), orderBy('actDate', 'desc'), limit(max)));
  return snap.docs.map(withId);
}

/** Inserts a journal entry with the next sequential entry number, atomically. */
export async function logTransaction(input) {
  const t = validateTransaction({
    actDate: input.actDate,
    actType: input.actType,
    clientName: input.clientName,
    clientAddress: input.clientAddress,
    clientEmail: input.clientEmail,
    clientPhone: input.clientPhone,
    idMethod: input.idMethod,
    fee: input.fee,
    documentDescription: input.documentDescription,
    notes: input.notes,
  });

  const txRef = doc(col('transactions'));
  const entryNumber = await runTransaction(db, async (tx) => {
    const prof = await tx.get(profileRef());
    if (!prof.exists()) throw new Error('Profile missing. Reload and try again.');
    const n = prof.data().nextEntryNumber || 1;
    tx.update(profileRef(), { nextEntryNumber: n + 1 });
    tx.set(txRef, strip({
      entryNumber: n,
      actDate: ts(t.actDate),
      actType: t.actType,
      clientName: t.clientName,
      clientAddress: t.clientAddress,
      clientEmail: t.clientEmail,
      clientPhone: t.clientPhone,
      idMethod: t.idMethod,
      fee: t.fee,
      documentDescription: t.documentDescription,
      notes: t.notes,
      voided: false,
      createdAt: serverTimestamp(),
    }));
    return n;
  });
  return { id: txRef.id, entryNumber };
}

export async function updateTransactionNotes(id, { notes, clientEmail, clientPhone }) {
  await updateDoc(doc(col('transactions'), id), {
    notes: notes ?? null,
    clientEmail: clientEmail ?? null,
    clientPhone: clientPhone ?? null,
    updatedAt: serverTimestamp(),
  });
}

export async function voidTransaction(id, reason) {
  const r = String(reason || '').trim();
  if (!r) throw new Error('A reason is required to void an entry.');
  await updateDoc(doc(col('transactions'), id), { voided: true, voidReason: r, updatedAt: serverTimestamp() });
}

/* ───────────────────────────── documents ─────────────────────────── */

export async function listDocuments() {
  const snap = await getDocs(query(col('documents'), orderBy('lastStatusChange', 'desc'), limit(500)));
  return snap.docs.map(withId);
}

export async function createDocument(input) {
  const d = validateDocument({ title: input.title, status: input.status || DOC_STATUS.DRAFT });
  const now = Timestamp.now();
  await addDoc(col('documents'), strip({
    title: d.title,
    status: d.status,
    transactionId: input.transactionId,
    clientName: input.clientName,
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    notes: input.notes,
    statusHistory: [{ status: d.status, at: now }],
    lastStatusChange: now,
    completedAt: d.status === DOC_STATUS.COMPLETED ? now : undefined,
    createdAt: serverTimestamp(),
  }));
}

export function allowedTransitions(fromStatus) { return DOC_STATUS_TRANSITIONS[fromStatus] || []; }

export async function setDocumentStatus(docItem, to) {
  if (docItem.status === to) return;
  if (!allowedTransitions(docItem.status).includes(to)) {
    throw new Error(`Cannot move a document from "${docItem.status}" to "${to}".`);
  }
  const now = Timestamp.now();
  await updateDoc(doc(col('documents'), docItem.id), {
    status: to,
    statusHistory: [...(docItem.statusHistory || []), { status: to, at: now }],
    lastStatusChange: now,
    completedAt: to === DOC_STATUS.COMPLETED ? now : null,
    updatedAt: serverTimestamp(),
  });
}

export async function updateDocument(id, patch) {
  const data = {};
  for (const k of ['title', 'transactionId', 'clientName', 'fileUrl', 'fileName', 'notes']) {
    if (k in patch) data[k] = patch[k] === undefined ? null : patch[k];
  }
  if (data.title !== undefined) validateDocument({ title: data.title, status: DOC_STATUS.DRAFT });
  data.updatedAt = serverTimestamp();
  await updateDoc(doc(col('documents'), id), data);
}

export function deleteDocument(id) { return deleteDoc(doc(col('documents'), id)); }
