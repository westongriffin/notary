import { $, h, clear, fillSelect, formData, setBusy, toast, fmtDateTime, fmtMoney, toLocalInputValue } from '../dom.js';
import { store, reload, onChange } from '../store.js';
import { logTransaction, voidTransaction, updateTransactionNotes } from '../db.js';
import { ACT_TYPES, ID_METHODS } from '../constants.js';
import { money } from '../validators.js';
import { transactionsToCsv, downloadText } from '../csv.js';
import { SignaturePad } from '../signature-pad.js';

let pendingVoidId = null;
let pendingNotesId = null;
let signaturePad = null;

export function init() {
  const form = $('#tx-form');
  fillSelect(form.actType, ACT_TYPES, { placeholder: 'Select…' });
  fillSelect(form.idMethod, ID_METHODS, { placeholder: 'Select…' });
  form.actDate.value = toLocalInputValue();
  form.addEventListener('submit', onSubmit);
  form.addEventListener('reset', () => setTimeout(() => { form.actDate.value = toLocalInputValue(); showError(''); signaturePad?.clear(); }));
  signaturePad = new SignaturePad($('#tx-signature'));
  $('#tx-sig-clear').addEventListener('click', () => signaturePad.clear());

  ['#tx-from', '#tx-to', '#tx-search', '#tx-include-voided'].forEach((sel) => $(sel).addEventListener('input', render));
  $('#tx-export').addEventListener('click', exportCsv);

  $('#void-form').addEventListener('submit', onVoidConfirm);
  $('#notes-form').addEventListener('submit', onNotesConfirm);
  onChange((keys) => { if (keys.includes('transactions') && !$('#tab-journal').hidden) render(); });
}

function showError(msg) { const el = $('#tx-error'); el.textContent = msg; el.hidden = !msg; }

async function onSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const d = formData(form);
  showError('');
  setBusy(form, true);
  try {
    const { entryNumber } = await logTransaction({
      actDate: d.actDate ? new Date(d.actDate) : null,
      actType: d.actType,
      clientName: d.clientName,
      clientAddress: d.clientAddress,
      clientEmail: d.clientEmail,
      clientPhone: d.clientPhone,
      idMethod: d.idMethod,
      fee: money(d.fee ?? 0),
      documentDescription: d.documentDescription,
      notes: d.notes,
      signature: signaturePad.toDataURL(),
    });
    toast(`Entry #${entryNumber} added.`, 'success');
    form.reset();
    await reload(['transactions', 'profile']);
  } catch (err) {
    showError(err.message);
  } finally {
    setBusy(form, false);
  }
}

function filtered() {
  const from = $('#tx-from').value ? new Date($('#tx-from').value + 'T00:00') : null;
  const to = $('#tx-to').value ? new Date($('#tx-to').value + 'T23:59:59') : null;
  const q = $('#tx-search').value.trim().toLowerCase();
  const includeVoided = $('#tx-include-voided').checked;
  return store.transactions.filter((t) => {
    if (!includeVoided && t.voided) return false;
    const d = t.actDate.toDate();
    if (from && d < from) return false;
    if (to && d > to) return false;
    if (q) {
      const hay = [t.clientName, t.actType, t.idMethod, t.documentDescription, t.notes, t.clientAddress, String(t.entryNumber)]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function render() {
  const rows = filtered();
  const body = clear($('#tx-table tbody'));
  $('#tx-empty').hidden = store.transactions.length > 0;
  const total = rows.filter((t) => !t.voided).reduce((s, t) => s + (Number(t.fee) || 0), 0);
  $('#tx-summary').textContent = rows.length
    ? `${rows.length} entr${rows.length === 1 ? 'y' : 'ies'} · ${fmtMoney(total)} in fees`
    : (store.transactions.length ? 'No entries match the current filters.' : '');

  for (const t of rows) {
    const actions = h('td', { class: 'actions-cell' });
    if (!t.voided) {
      actions.append(
        h('button', { class: 'btn btn-sm', type: 'button', onclick: () => openNotes(t) }, 'Edit notes'),
        h('button', { class: 'btn btn-sm', type: 'button', onclick: () => openVoid(t) }, 'Void'),
      );
    } else {
      actions.append(h('span', { class: 'badge badge-voided', title: t.voidReason || '' }, `Voided${t.voidReason ? ` · ${t.voidReason}` : ''}`));
    }
    body.append(h('tr', { class: t.voided ? 'voided' : '' },
      cell('Entry', `#${t.entryNumber}`, 'lead'),
      cell('Date', fmtDateTime(t.actDate)),
      cell('Act', [t.actType, t.documentDescription ? h('span', { class: 'sub' }, t.documentDescription) : null]),
      cell('Client', [t.clientName, h('span', { class: 'sub' }, t.clientAddress)]),
      cell('ID method', t.idMethod),
      cell('Fee', fmtMoney(t.fee), 'num'),
      cell('Signature', t.signature
        ? h('img', { class: 'sig-thumb', src: t.signature, alt: 'Signature', title: 'View signature', onclick: () => openSignature(t) })
        : h('span', { class: 'muted' }, 'None')),
      actions,
    ));
  }
}

function cell(label, content, cls) {
  return h('td', { class: cls || '', dataset: { label } }, h('span', { class: 'cell' }, content));
}

function openSignature(t) {
  $('#sig-entry').textContent = `#${t.entryNumber}`;
  $('#sig-image').src = t.signature;
  $('#sig-dialog').showModal();
}

function openVoid(t) {
  pendingVoidId = t.id;
  $('#void-entry').textContent = `#${t.entryNumber}`;
  $('#void-form').reset();
  $('#void-dialog').showModal();
}

async function onVoidConfirm(e) {
  e.preventDefault();
  const reason = $('#void-form').reason.value.trim();
  if (!reason) return;
  try {
    await voidTransaction(pendingVoidId, reason);
    $('#void-dialog').close();
    toast('Entry voided.', 'success');
    await reload(['transactions']);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function openNotes(t) {
  pendingNotesId = t.id;
  const f = $('#notes-form');
  $('#notes-entry').textContent = `#${t.entryNumber}`;
  f.clientEmail.value = t.clientEmail || '';
  f.clientPhone.value = t.clientPhone || '';
  f.notes.value = t.notes || '';
  $('#notes-dialog').showModal();
}

async function onNotesConfirm(e) {
  e.preventDefault();
  const d = formData($('#notes-form'));
  try {
    await updateTransactionNotes(pendingNotesId, d);
    $('#notes-dialog').close();
    toast('Entry updated.', 'success');
    await reload(['transactions']);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function exportCsv() {
  const rows = filtered().slice().sort((a, b) => a.entryNumber - b.entryNumber);
  if (!rows.length) return toast('Nothing to export.', 'info');
  const stamp = new Date().toISOString().slice(0, 10);
  downloadText(`notary-book-journal-${stamp}.csv`, transactionsToCsv(rows));
}
