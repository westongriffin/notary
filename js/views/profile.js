import { $, h, clear, fillSelect, formData, setBusy, toast, fmtDate, confirmDialog } from '../dom.js';
import { store, reload, onChange } from '../store.js';
import {
  saveProfile, addCredential, removeCredential, credentialStatus,
  saveCommissionImage, removeCommissionImage,
} from '../db.js';
import { CREDENTIAL_TYPES } from '../constants.js';
import { fileToJpegDataUrl } from '../image.js';

const STATUS_LABEL = { valid: 'Valid', expiring: 'Expiring soon', expired: 'Expired' };

export function init() {
  const pf = $('#profile-form');
  pf.addEventListener('submit', onProfileSubmit);

  const cf = $('#cred-form');
  fillSelect(cf.type, CREDENTIAL_TYPES, { placeholder: 'Select…' });
  cf.uploadedAt.value = new Date().toISOString().slice(0, 10);
  cf.addEventListener('submit', onCredentialSubmit);
  cf.addEventListener('reset', () => setTimeout(() => { cf.uploadedAt.value = new Date().toISOString().slice(0, 10); }));

  $('#commission-file').addEventListener('change', onCommissionPicked);
  $('#commission-replace').addEventListener('change', onCommissionPicked);
  $('#commission-remove').addEventListener('click', onCommissionRemove);
  $('#commission-img').addEventListener('click', () => {
    if (!store.commissionImage) return;
    $('#commission-full').src = store.commissionImage.dataUrl;
    $('#commission-dialog').showModal();
  });

  onChange((keys) => { if (!$('#tab-profile').hidden) render(); });
}

function renderCommission() {
  const img = store.commissionImage;
  $('#commission-empty').hidden = Boolean(img);
  $('#commission-view').hidden = !img;
  if (img) {
    $('#commission-img').src = img.dataUrl;
    const parts = [];
    if (img.fileName) parts.push(img.fileName);
    if (img.width && img.height) parts.push(`${img.width}×${img.height}`);
    if (img.uploadedAt) parts.push(`uploaded ${fmtDate(img.uploadedAt)}`);
    $('#commission-meta').textContent = parts.join(' · ');
  }
}

function commissionStatus(msg) { const el = $('#commission-status'); el.textContent = msg; el.hidden = !msg; }

async function onCommissionPicked(e) {
  const input = e.currentTarget;
  const file = input.files && input.files[0];
  input.value = ''; // allow re-picking the same file later
  if (!file) return;
  showError('#commission-error', '');
  commissionStatus('Preparing image…');
  try {
    const prepared = await fileToJpegDataUrl(file);
    commissionStatus('Uploading…');
    await saveCommissionImage({ ...prepared, fileName: file.name });
    toast('Commission image saved.', 'success');
    await reload(['commissionImage']);
  } catch (err) {
    showError('#commission-error', err.message);
  } finally {
    commissionStatus('');
  }
}

async function onCommissionRemove() {
  if (!(await confirmDialog('Remove the commission image?'))) return;
  try {
    await removeCommissionImage();
    toast('Commission image removed.', 'success');
    await reload(['commissionImage']);
  } catch (err) {
    showError('#commission-error', err.message);
  }
}

export function render() {
  const p = store.profile || {};
  const pf = $('#profile-form');
  for (const k of ['displayName', 'businessName', 'email', 'phone', 'commissionState', 'commissionNumber']) {
    if (document.activeElement !== pf[k]) pf[k].value = p[k] || '';
  }

  renderCommission();

  const body = clear($('#cred-table tbody'));
  $('#cred-empty').hidden = store.credentials.length > 0;
  for (const c of store.credentials) {
    const s = credentialStatus(c);
    body.append(h('tr', {},
      h('td', {}, CREDENTIAL_TYPES[c.type] || c.type),
      h('td', {}, c.fileUrl ? h('a', { href: c.fileUrl, target: '_blank', rel: 'noopener' }, c.label) : c.label,
        c.notes ? h('span', { class: 'sub' }, c.notes) : null),
      h('td', {}, fmtDate(c.uploadedAt)),
      h('td', {}, fmtDate(c.expiresAt)),
      h('td', {}, h('span', { class: `badge badge-${s}` }, STATUS_LABEL[s])),
      h('td', { class: 'actions-cell' },
        h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => remove(c) }, 'Remove')),
    ));
  }
}

function showError(id, msg) { const el = $(id); el.textContent = msg; el.hidden = !msg; }

async function onProfileSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const patch = formData(form); // read before disabling: disabled fields are excluded from FormData
  showError('#profile-error', '');
  setBusy(form, true);
  try {
    await saveProfile(patch);
    toast('Profile saved.', 'success');
    await reload(['profile']);
  } catch (err) {
    showError('#profile-error', err.message);
  } finally {
    setBusy(form, false);
  }
}

async function onCredentialSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const d = formData(form);
  showError('#cred-error', '');
  setBusy(form, true);
  try {
    await addCredential({
      type: d.type,
      label: d.label,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      notes: d.notes,
      uploadedAt: d.uploadedAt ? new Date(d.uploadedAt + 'T00:00') : new Date(),
      expiresAt: d.expiresAt ? new Date(d.expiresAt + 'T23:59') : null,
    });
    toast('Credential added.', 'success');
    form.reset();
    await reload(['credentials']);
  } catch (err) {
    showError('#cred-error', err.message);
  } finally {
    setBusy(form, false);
  }
}

async function remove(c) {
  if (!(await confirmDialog(`Remove "${c.label}" from your credentials?`))) return;
  try {
    await removeCredential(c.id);
    toast('Credential removed.', 'success');
    await reload(['credentials']);
  } catch (err) {
    toast(err.message, 'error');
  }
}
