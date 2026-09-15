// All Firestore access. Every path is scoped under users/{uid}; firestore.rules
// enforces ownership and validation on the server no matter what happens here.
import {
  db, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, limit, runTransaction, serverTimestamp, Timestamp,
} from './firebase.js';
import { currentUser } from './auth.js';
import { CREDENTIAL_STATUS, CREDENTIAL_EXPIRING_WINDOW_DAYS } from './constants.js';
import { validateTransaction, validateCredential } from './validators.js';

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

/* ───────────────────────── commission image ──────────────────────── */

const COMMISSION_DOC = 'commission';
const mediaRef = () => doc(col('media'), COMMISSION_DOC);

export async function getCommissionImage() {
  const snap = await getDoc(mediaRef());
  return snap.exists() ? withId(snap) : null;
}

/** Stores the prepared JPEG data URL (see js/image.js). Replaces any existing image. */
export async function saveCommissionImage({ dataUrl, width, height, fileName }) {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/jpeg;base64,')) {
    throw new Error('Image must be a JPEG data URL.');
  }
  await setDoc(mediaRef(), strip({
    dataUrl,
    width,
    height,
    fileName: fileName ? String(fileName).slice(0, 255) : undefined,
    contentType: 'image/jpeg',
    uploadedAt: serverTimestamp(),
  }));
}

export function removeCommissionImage() { return deleteDoc(mediaRef()); }

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
    signature: input.signature || undefined,
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
      signature: t.signature,
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
