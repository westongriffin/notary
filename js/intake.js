// Client-facing intake page (intake.html#<token>). No sign-in. The token in
// the URL fragment is the only credential; firestore.rules lets its holder
// read that one request and submit it once while it is still pending.
import { db, doc, getDoc, updateDoc, serverTimestamp } from './firebase.js';
import { $, formData, setBusy } from './dom.js';
import { SignaturePad } from './signature-pad.js';
import { SIGNATURE_RE, SIGNATURE_MAX } from './validators.js';

const token = (location.hash || '').replace(/^#/, '').trim();
const ref = /^[a-f0-9]{40}$/.test(token) ? doc(db, 'intakes', token) : null;
let pad = null;

function show(id) {
  for (const s of ['intake-loading', 'intake-form-view', 'intake-done', 'intake-invalid']) $(`#${s}`).hidden = s !== id;
}
function invalid(reason) { $('#intake-invalid-reason').textContent = reason; show('intake-invalid'); }
function showError(msg) { const el = $('#intake-error'); el.textContent = msg; el.hidden = !msg; }

async function load() {
  if (!ref) return invalid('The link is incomplete. Ask your notary to send it again.');
  let snap;
  try { snap = await getDoc(ref); } catch (e) { return invalid('Could not load the form. Check your connection and try again.'); }
  if (!snap.exists()) return invalid('The link is not valid. Ask your notary to send a new one.');
  const data = snap.data();
  if (data.status === 'submitted' || data.status === 'used') return invalid('These details were already sent. Nothing more to do.');
  if (data.status !== 'pending') return invalid('This request was closed by your notary.');
  const expires = data.expiresAt?.toDate ? data.expiresAt.toDate() : null;
  if (expires && expires.getTime() < Date.now()) return invalid('This link has expired. Ask your notary to send a new one.');

  $('#intake-intro').textContent = data.notaryName
    ? `${data.notaryName} asked for the details below to prepare your notarization.`
    : 'Your notary asked for the details below to prepare your notarization.';
  show('intake-form-view');
  pad = new SignaturePad($('#intake-signature'));
  $('#intake-sig-clear').addEventListener('click', () => pad.clear());
  $('#intake-form').addEventListener('submit', submit);
}

async function submit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const d = formData(form); // read before disabling
  showError('');
  if (!d.clientName) return showError('Enter your full legal name.');
  if (!d.clientAddress) return showError('Enter your address.');
  const signature = pad.toDataURL();
  if (!signature) return showError('Please sign in the box above.');
  if (!SIGNATURE_RE.test(signature) || signature.length > SIGNATURE_MAX) return showError('Signature could not be captured. Clear it and try again.');

  setBusy(form, true);
  try {
    await updateDoc(ref, {
      status: 'submitted',
      submittedAt: serverTimestamp(),
      clientName: d.clientName,
      clientAddress: d.clientAddress,
      documentDescription: d.documentDescription ?? null,
      clientEmail: d.clientEmail ?? null,
      clientPhone: d.clientPhone ?? null,
      signature,
    });
    $('#intake-done-name').textContent = d.clientName.split(' ')[0];
    show('intake-done');
  } catch (err) {
    const denied = /permission|insufficient/i.test(String(err?.message || err));
    showError(denied
      ? 'This link is no longer open. It may have expired or already been used.'
      : `Could not send: ${err.message || err}`);
    setBusy(form, false);
  }
}

load();
