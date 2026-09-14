// Journal export. Produces a CSV the user can archive or open in a spreadsheet.
import { fmtDateTime } from './dom.js';

const COLUMNS = [
  ['entryNumber', 'Entry #'],
  ['actDate', 'Date / Time'],
  ['actType', 'Act Type'],
  ['clientName', 'Client Name'],
  ['clientAddress', 'Address'],
  ['idMethod', 'ID Method'],
  ['fee', 'Fee'],
  ['documentDescription', 'Document'],
  ['notes', 'Notes'],
  ['voided', 'Voided'],
  ['voidReason', 'Void Reason'],
];

function cell(v) {
  if (v === undefined || v === null) return '';
  const s = typeof v === 'boolean' ? (v ? 'yes' : 'no') : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCsv(rows) {
  const header = COLUMNS.map(([, label]) => cell(label)).join(',');
  const lines = rows.map((r) => COLUMNS.map(([key]) => {
    if (key === 'actDate') return cell(fmtDateTime(r.actDate));
    if (key === 'fee') return cell(Number(r.fee).toFixed(2));
    return cell(r[key]);
  }).join(','));
  return [header, ...lines].join('\r\n');
}

export function downloadText(filename, text, type = 'text/csv') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
