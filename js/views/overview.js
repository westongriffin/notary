import { $, h, clear, fmtDate, fmtDateTime, fmtMoney } from '../dom.js';
import { store, onChange } from '../store.js';
import { summarizeCredentials } from '../db.js';
import { DOC_STATUS } from '../constants.js';

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
  const count = (s) => store.documents.filter((d) => d.status === s).length;

  tiles.append(
    tile('Credentials', h('span', { class: `badge badge-${cred.status}` }, STATUS_LABEL[cred.status]),
      cred.nextExpiry ? `Next expiry ${fmtDate(cred.nextExpiry)}` : 'Add credentials in Profile'),
    tile('Journal entries', live.length, `${store.transactions.length - live.length} voided`),
    tile('Fees this year', fmtMoney(feesYtd), `${live.filter((t) => t.actDate.toDate() >= yearStart).length} acts`),
    tile('Draft', count(DOC_STATUS.DRAFT), 'documents'),
    tile('Pending signature', count(DOC_STATUS.PENDING), 'documents'),
    tile('Completed', count(DOC_STATUS.COMPLETED), 'documents'),
  );

  const body = clear($('#ov-recent tbody'));
  for (const t of store.transactions.slice(0, 8)) {
    body.append(h('tr', { class: t.voided ? 'voided' : '' },
      h('td', {}, t.entryNumber),
      h('td', {}, fmtDateTime(t.actDate)),
      h('td', {}, t.actType),
      h('td', {}, t.clientName),
      h('td', { class: 'num' }, fmtMoney(t.fee)),
    ));
  }
  if (!store.transactions.length) {
    body.append(h('tr', {}, h('td', { colspan: 5, class: 'muted center' }, 'No entries yet. Add one in the Journal tab.')));
  }
}

function tile(label, value, sub) {
  return h('div', { class: 'tile' },
    h('div', { class: 'label' }, label),
    h('div', { class: 'value' }, value),
    sub ? h('div', { class: 'sub' }, sub) : null,
  );
}
