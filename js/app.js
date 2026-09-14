import { $, $$, toast } from './dom.js';
import { watchAuth, signIn, signUp, signInWithGoogle, resetPassword, logOut, authErrorMessage } from './auth.js';
import { ensureProfile } from './db.js';
import { reload, reset } from './store.js';
import * as overview from './views/overview.js';
import * as journal from './views/journal.js';
import * as documents from './views/documents.js';
import * as profile from './views/profile.js';

const views = { overview, journal, documents, profile };
let mode = 'signin'; // or 'signup'
let booted = false;

/* ───────────────────────────── auth UI ───────────────────────────── */

function setAuthMode(next) {
  mode = next;
  $('#auth-title').textContent = next === 'signup' ? 'Create account' : 'Sign in';
  $('#auth-submit').textContent = next === 'signup' ? 'Create account' : 'Sign in';
  $('#auth-toggle').textContent = next === 'signup' ? 'Have an account? Sign in' : 'Create an account';
  $('#auth-form input[name=password]').autocomplete = next === 'signup' ? 'new-password' : 'current-password';
  showAuthError('');
}

function showAuthError(msg) {
  const el = $('#auth-error');
  el.textContent = msg;
  el.hidden = !msg;
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const email = form.email.value.trim();
  const password = form.password.value;
  if (!email || !password) return showAuthError('Enter your email and password.');
  form.classList.add('busy');
  try {
    if (mode === 'signup') await signUp(email, password);
    else await signIn(email, password);
  } catch (err) {
    showAuthError(authErrorMessage(err));
  } finally {
    form.classList.remove('busy');
  }
}

async function handleGoogle() {
  showAuthError('');
  try { await signInWithGoogle(); } catch (err) { showAuthError(authErrorMessage(err)); }
}

async function handleReset(e) {
  e.preventDefault();
  const email = $('#auth-form input[name=email]').value.trim();
  if (!email) return showAuthError('Enter your email above, then click "Forgot password?" again.');
  try {
    await resetPassword(email);
    toast('Password reset email sent.', 'success');
  } catch (err) {
    showAuthError(authErrorMessage(err));
  }
}

/* ───────────────────────────── tabs ─────────────────────────────── */

function showTab(name) {
  $$('.tabs [role=tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  $$('.tab-panel').forEach((p) => { p.hidden = p.id !== `tab-${name}`; });
  try { localStorage.setItem('notary.tab', name); } catch { /* ignore */ }
  views[name]?.render?.();
}

/* ───────────────────────────── boot ─────────────────────────────── */

function bindOnce() {
  if (booted) return;
  booted = true;
  $('#auth-form').addEventListener('submit', handleAuthSubmit);
  $('#google-btn').addEventListener('click', handleGoogle);
  $('#auth-toggle').addEventListener('click', (e) => { e.preventDefault(); setAuthMode(mode === 'signup' ? 'signin' : 'signup'); });
  $('#auth-reset').addEventListener('click', handleReset);
  $('#signout-btn').addEventListener('click', () => logOut());
  $$('.tabs [role=tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  $$('dialog [data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close('cancel')));
  for (const v of Object.values(views)) v.init();
}

async function enterApp(user) {
  $('#user-email').textContent = user.email || user.displayName || '';
  $('#user-menu').hidden = false;
  $('#auth-view').hidden = true;
  $('#loading').hidden = false;
  try {
    await ensureProfile(user);
    await reload();
    $('#app-view').hidden = false;
    let tab = 'overview';
    try { tab = localStorage.getItem('notary.tab') || tab; } catch { /* ignore */ }
    showTab(views[tab] ? tab : 'overview');
  } catch (err) {
    console.error(err);
    toast(`Could not load your records: ${err.message}`, 'error', 8000);
  } finally {
    $('#loading').hidden = true;
  }
}

function leaveApp() {
  reset();
  $('#user-menu').hidden = true;
  $('#app-view').hidden = true;
  $('#loading').hidden = true;
  $('#auth-view').hidden = false;
  $('#auth-form').reset();
  setAuthMode('signin');
}

bindOnce();
watchAuth((user) => (user ? enterApp(user) : leaveApp()));
