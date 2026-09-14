import {
  auth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup,
} from './firebase.js';

export function watchAuth(cb) { return onAuthStateChanged(auth, cb); }
export function currentUser() { return auth.currentUser; }

export function signIn(email, password) { return signInWithEmailAndPassword(auth, email, password); }
export function signUp(email, password) { return createUserWithEmailAndPassword(auth, email, password); }
export function signInWithGoogle() { return signInWithPopup(auth, new GoogleAuthProvider()); }
export function resetPassword(email) { return sendPasswordResetEmail(auth, email); }
export function logOut() { return signOut(auth); }

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
