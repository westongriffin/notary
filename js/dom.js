// Tiny DOM + formatting helpers. No framework.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** h('td', { class: 'num' }, 'text', otherNode) */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c === undefined || c === null || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

export function fillSelect(select, values, { placeholder } = {}) {
  clear(select);
  if (placeholder) select.append(h('option', { value: '' }, placeholder));
  const entries = Array.isArray(values) ? values.map((v) => [v, v]) : Object.entries(values);
  for (const [value, label] of entries) select.append(h('option', { value }, label));
}

export function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const dateTimeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const moneyFmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' });

export const fmtDate = (v) => { const d = toDate(v); return d ? dateFmt.format(d) : ''; };
export const fmtDateTime = (v) => { const d = toDate(v); return d ? dateTimeFmt.format(d) : ''; };
export const fmtMoney = (n) => moneyFmt.format(Number(n) || 0);

/** Value for <input type="datetime-local"> in local time. */
export function toLocalInputValue(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toast(message, kind = 'info', ms = 3500) {
  const host = $('#toasts');
  const el = h('div', { class: `toast toast-${kind}`, role: 'status' }, message);
  host.append(el);
  setTimeout(() => { el.classList.add('hide'); setTimeout(() => el.remove(), 300); }, ms);
}

/** Read a <form> into a plain object (trimmed strings, '' -> undefined). */
export function formData(form) {
  const out = {};
  for (const [k, v] of new FormData(form).entries()) {
    const s = typeof v === 'string' ? v.trim() : v;
    out[k] = s === '' ? undefined : s;
  }
  return out;
}

export function setBusy(form, busy) {
  $$('button, input, select, textarea', form).forEach((el) => { el.disabled = busy; });
  form.classList.toggle('busy', busy);
}

export function confirmDialog(message) {
  return Promise.resolve(window.confirm(message));
}
