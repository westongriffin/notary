import {
  auth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup,
  EmailAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, deleteUser,
} from './firebase.js';

export function watchAuth(cb) { return onAuthStateChanged(auth, cb); }
export function currentUser() { return auth.currentUser; }

export function signIn(email, password) { return signInWithEmailAndPassword(auth, email, password); }
export function signUp(email, password) { return createUserWithEmailAndPassword(auth, email, password); }
export function signInWithGoogle() { return signInWithPopup(auth, new GoogleAuthProvider()); }
export function resetPassword(email) { return sendPasswordResetEmail(auth, email); }
export function logOut() { return signOut(auth); }

/** Which sign-in method the current user used: 'password' or 'google.com'. */
export function signInMethod() {
  const u = auth.currentUser;
  const p = u && u.providerData && u.providerData[0];
  return p ? p.providerId : 'password';
}

/** Firebase requires a fresh sign-in before destructive account actions. */
export async function reauthenticate(password) {
  const u = auth.currentUser;
  if (!u) throw new Error('Not signed in');
  if (signInMethod() === 'password') {
    if (!password) throw new Error('Enter your password to confirm.');
    return reauthenticateWithCredential(u, EmailAuthProvider.credential(u.email, password));
  }
  return reauthenticateWithPopup(u, new GoogleAuthProvider());
}

export function deleteCurrentUser() { return deleteUser(auth.currentUser); }

const MESSAGES = {
  'auth/invalid-email': 'That email address is not valid.',
  'auth/user-not-found': 'No account with that email.',
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/email-already-in-use': 'An account already exists for that email.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Try again in a few minutes.',
  'auth/popup-closed-by-user': 'Sign-in window was closed.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for the project yet.',
  'auth/unauthorized-domain': 'This domain is not authorized for sign-in. Add it in Firebase Auth settings.',
};

export function authErrorMessage(err) {
  return MESSAGES[err?.code] || err?.message || 'Sign-in failed.';
}
