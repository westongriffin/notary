import { $, h, clear, fillSelect, formData, setBusy, toast, fmtDateTime, confirmDialog } from '../dom.js';
import { store, reload, onChange } from '../store.js';
import { createDocument, setDocumentStatus, deleteDocument, allowedTransitions } from '../db.js';
import { DOC_STATUS, DOC_STATUSES } from '../constants.js';

const BADGE = { [DOC_STATUS.DRAFT]: 'draft', [DOC_STATUS.PENDING]: 'pending', [DOC_STATUS.COMPLETED]: 'completed' };

export function init() {
  const form = $('#doc-form');
  fillSelect(form.status, DOC_STATUSES);
  form.addEventListener('submit', onSubmit);
  form.addEventListener('reset', () => showError(''));
  const filter = $('#doc-filter');
  for (const s of DOC_STATUSES) filter.append(h('option', { value: s }, s));
  filter.addEventListener('change', render);
  $('#doc-search').addEventListener('input', render);
  onChange((keys) => {
    if (keys.includes('transactions')) fillTransactionSelect();
    if (!$('#tab-documents').hidden) render();
  });
}

function showError(msg) { const el = $('#doc-error'); el.textContent = msg; el.hidden = !msg; }

function fillTransactionSelect() {
  const sel = $('#doc-form').transactionId;
  const current = sel.value;
  clear(sel);
  sel.append(h('option', { value: '' }, 'None'));
  for (const t of store.transactions.filter((t) => !t.voided).slice(0, 100)) {
    sel.append(h('option', { value: t.id }, `#${t.entryNumber} · ${t.clientName} · ${t.actType}`));
  }
  sel.value = current;
}

async function onSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const d = formData(form);
  showError('');
  setBusy(form, true);
  try {
    await createDocument(d);
    toast('Document created.', 'success');
    form.reset();
    await reload(['documents']);
  } catch (err) {
    showError(err.message);
  } finally {
    setBusy(form, false);
  }
}

export function render() {
  fillTransactionSelect();
  const status = $('#doc-filter').value;
  const q = $('#doc-search').value.trim().toLowerCase();
  const list = clear($('#doc-list'));
  const txById = new Map(store.transactions.map((t) => [t.id, t]));
  const rows = store.documents.filter((d) =>
    (!status || d.status === status)
    && (!q || `${d.title} ${d.clientName || ''}`.toLowerCase().includes(q)));
  $('#doc-empty').hidden = store.documents.length > 0;

  for (const d of rows) {
    const tx = d.transactionId ? txById.get(d.transactionId) : null;
    const actions = h('div', { class: 'actions' });
    for (const to of allowedTransitions(d.status)) {
      actions.append(h('button', {
        class: `btn btn-sm ${to === DOC_STATUS.COMPLETED ? 'btn-primary' : ''}`, type: 'button',
        onclick: () => move(d, to),
      }, to === DOC_STATUS.DRAFT ? 'Back to Draft' : `Mark ${to}`));
    }
    if (d.status !== DOC_STATUS.COMPLETED) {
      actions.append(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => remove(d) }, 'Delete'));
    }
    list.append(h('div', { class: 'doc' },
      h('div', { class: 'card-head' },
        h('span', { class: 'title' }, d.title),
        h('span', { class: `badge badge-${BADGE[d.status]}` }, d.status)),
      d.clientName ? h('div', { class: 'meta' }, `Client: ${d.clientName}`) : null,
      tx ? h('div', { class: 'meta' }, `Journal #${tx.entryNumber} · ${tx.actType}`) : null,
      d.fileUrl ? h('div', { class: 'meta' }, h('a', { href: d.fileUrl, target: '_blank', rel: 'noopener' }, d.fileName || 'Open file')) : null,
      d.notes ? h('div', { class: 'meta' }, d.notes) : null,
      h('div', { class: 'meta' }, `Updated ${fmtDateTime(d.lastStatusChange)}`,
        d.completedAt ? ` · Completed ${fmtDateTime(d.completedAt)}` : ''),
      actions,
    ));
  }
  if (store.documents.length && !rows.length) {
    list.append(h('p', { class: 'muted center' }, 'No documents match the current filters.'));
  }
}

async function move(d, to) {
  if (to === DOC_STATUS.COMPLETED && !(await confirmDialog(`Mark "${d.title}" as Completed? Completed documents are locked.`))) return;
  try {
    await setDocumentStatus(d, to);
    toast(`Moved to ${to}.`, 'success');
    await reload(['documents']);
  } catch (err) {
    toast(err.message, 'error');
  }
}

async function remove(d) {
  if (!(await confirmDialog(`Delete "${d.title}"? This cannot be undone.`))) return;
  try {
    await deleteDocument(d.id);
    toast('Document deleted.', 'success');
    await reload(['documents']);
  } catch (err) {
    toast(err.message, 'error');
  }
}
