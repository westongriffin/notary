import { $, h, clear, fmtDate, fmtDateTime, fmtMoney } from '../dom.js';
import { store, onChange } from '../store.js';
import { summarizeCredentials } from '../db.js';

const STATUS_LABEL = { none: 'No credentials', valid: 'Valid', expiring: 'Expiring soon', expired: 'Expired' };

export function init() { onChange(() => { if (!$('#tab-overview').hidden) render(); }); }

export function render() {
  const tiles = clear($('#ov-tiles'));
  const live = store.transactions.filter((t) => !t.voided);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const feesYtd = live
    .filter((t) => t.actDate.toDate() >= yearStart)
    .reduce((sum, t) => sum + (Number(t.fee) || 0), 0);
  const cred = summarizeCredentials(store.credentials);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const thisMonth = live.filter((t) => t.actDate.toDate() >= monthStart);
  const feesMonth = thisMonth.reduce((sum, t) => sum + (Number(t.fee) || 0), 0);
  const withSignature = live.filter((t) => t.signature).length;

  tiles.append(
    tile('Credentials', h('span', { class: `badge badge-${cred.status}` }, STATUS_LABEL[cred.status]),
      cred.nextExpiry ? `Next expiry ${fmtDate(cred.nextExpiry)}` : 'Add credentials in Profile'),
    tile('Journal entries', live.length, `${store.transactions.length - live.length} voided`),
    tile('Fees this year', fmtMoney(feesYtd), `${live.filter((t) => t.actDate.toDate() >= yearStart).length} acts`),
    tile('This month', thisMonth.length, `${fmtMoney(feesMonth)} in fees`),
    tile('Signatures on file', withSignature, `of ${live.length} entries`),
  );

  const body = clear($('#ov-recent tbody'));
  for (const t of store.transactions.slice(0, 8)) {
    body.append(h('tr', { class: t.voided ? 'voided' : '' },
      cell('Entry', `#${t.entryNumber}`, 'lead'),
      cell('Date', fmtDateTime(t.actDate)),
      cell('Act', t.actType),
      cell('Client', t.clientName),
      cell('Fee', fmtMoney(t.fee), 'num'),
    ));
  }
  if (!store.transactions.length) {
    body.append(h('tr', {}, h('td', { colspan: 5, class: 'empty' }, 'No entries yet. Add one in the Journal tab.')));
  }
}

function cell(label, content, cls) {
  return h('td', { class: cls || '', dataset: { label } }, h('span', { class: 'cell' }, content));
}

function tile(label, value, sub) {
  return h('div', { class: 'tile' },
    h('div', { class: 'label' }, label),
    h('div', { class: 'value' }, value),
    sub ? h('div', { class: 'sub' }, sub) : null,
  );
}
