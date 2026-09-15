// "Request client info" panel inside the journal form. Creates an intake
// link, offers to text/share/copy it, listens for the client's submission,
// and fills the journal form (including the signature) when it arrives.
import { $, h, clear, toast, fmtDateTime } from '../dom.js';
import { store } from '../store.js';
import { createIntake, watchIntake, setIntakeStatus, intakeUrl } from '../db.js';
import { canShare, share } from '../native.js';

const KEY = 'notary.activeIntake';
let form = null;
let pad = null;
let active = null;      // { id, url }
let unsubscribe = null;
let received = null;    // last submitted intake data

export function initIntakePanel({ form: f, signaturePad }) {
  form = f;
  pad = signaturePad;
  $('#intake-open').addEventListener('click', openRequest);
  $('#intake-cancel').addEventListener('click', cancelRequest);
  $('#intake-copy').addEventListener('click', copyLink);
  $('#intake-share').addEventListener('click', shareLink);
  $('#intake-phone').addEventListener('input', updateSmsLink);
  $('#intake-dismiss').addEventListener('click', () => setState('idle'));
  if (!canShare()) $('#intake-share').hidden = true;

  // Resume a request that was open before a reload.
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && saved.id) { active = { id: saved.id, url: intakeUrl(saved.id) }; subscribe(); setState('waiting'); }
  } catch { /* ignore */ }
}

/** Called by the journal view after an entry is saved or the form is cleared. */
export function currentIntakeId() { return received ? received.id : null; }
export async function finishIntake() {
  if (received) { try { await setIntakeStatus(received.id, 'used'); } catch { /* best effort */ } }
  stop();
  setState('idle');
}
export function resetIntake() { if (active && !received) return; stop(); setState('idle'); }

function setState(state) {
  $('#intake-idle').hidden = state !== 'idle';
  $('#intake-waiting').hidden = state !== 'waiting';
  $('#intake-received').hidden = state !== 'received';
}

async function openRequest() {
  const btn = $('#intake-open');
  btn.disabled = true;
  try {
    const p = store.profile || {};
    const notaryName = p.businessName || p.displayName || undefined;
    active = await createIntake({ notaryName });
    received = null;
    try { localStorage.setItem(KEY, JSON.stringify({ id: active.id })); } catch { /* ignore */ }
    $('#intake-phone').value = form.clientPhone.value || '';
    $('#intake-url').textContent = active.url;
    updateSmsLink();
    subscribe();
    setState('waiting');
  } catch (err) {
    toast(`Could not create link: ${err.message}`, 'error');
  } finally {
    btn.disabled = false;
  }
}

function subscribe() {
  stopListening();
  $('#intake-url').textContent = active.url;
  updateSmsLink();
  unsubscribe = watchIntake(active.id, (data, err) => {
    if (err) { toast(`Lost connection to the request: ${err.message}`, 'error'); return; }
    if (!data) { toast('The request was removed.', 'error'); stop(); setState('idle'); return; }
    if (data.status === 'submitted' && !received) onReceived(data);
    else if (data.status === 'cancelled' || data.status === 'used') { stop(); setState('idle'); }
  });
}

async function onReceived(data) {
  received = data;
  form.clientName.value = data.clientName || '';
  form.clientAddress.value = data.clientAddress || '';
  form.documentDescription.value = data.documentDescription || '';
  form.clientEmail.value = data.clientEmail || '';
  form.clientPhone.value = data.clientPhone || '';
  if (data.signature) {
    try { await pad.setImage(data.signature); } catch { toast('Signature image could not be shown.', 'error'); }
  }
  const when = data.submittedAt ? fmtDateTime(data.submittedAt) : 'just now';
  $('#intake-received-text').textContent = `${data.clientName || 'The client'} sent their details ${when}. Fill in the rest and add the entry.`;
  setState('received');
  toast('Client details received.', 'success');
  form.actType.focus();
}

function stopListening() { if (unsubscribe) { unsubscribe(); unsubscribe = null; } }
function stop() {
  stopListening();
  active = null;
  received = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

async function cancelRequest() {
  if (!active) return setState('idle');
  const id = active.id;
  stop();
  setState('idle');
  try { await setIntakeStatus(id, 'cancelled'); } catch { /* best effort */ }
}

function updateSmsLink() {
  if (!active) return;
  const phone = $('#intake-phone').value.replace(/[^\d+]/g, '');
  const notary = (store.profile && (store.profile.businessName || store.profile.displayName)) || 'your notary';
  const body = `Hi, this is ${notary}. Please fill in your details and sign for the notarization here: ${active.url}`;
  $('#intake-sms').href = `sms:${phone}?&body=${encodeURIComponent(body)}`;
}

async function copyLink() {
  if (!active) return;
  try { await navigator.clipboard.writeText(active.url); toast('Link copied.', 'success'); }
  catch { toast('Copy failed. Long-press the link to copy it.', 'error'); }
}

async function shareLink() {
  if (!active || !canShare()) return;
  try { await share({ title: 'Notary Book', text: 'Please fill in your details and sign for the notarization.', url: active.url }); }
  catch { /* user dismissed */ }
}
