// Firebase bootstrap. The modular SDK (v10.14.1) is vendored in js/vendor so
// the site needs no build step, works offline-first, and loads inside the
// native iOS shell where cross-origin module imports are blocked.
import { initializeApp } from './vendor/firebase-app.js';
import {
  getAuth, initializeAuth, indexedDBLocalPersistence,
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, sendPasswordResetEmail,
  GoogleAuthProvider, signInWithPopup, updateProfile,
  EmailAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, deleteUser,
} from './vendor/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, runTransaction, serverTimestamp, Timestamp, onSnapshot, writeBatch,
} from './vendor/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';

export const app = initializeApp(firebaseConfig);

// Inside the Capacitor iOS shell the page origin is capacitor://localhost,
// where getAuth()'s default popup/redirect resolver (a hidden auth iframe)
// cannot run and auth state never resolves. Initialize without it there.
const nativeShell = Boolean(globalThis.Capacitor && typeof globalThis.Capacitor.isNativePlatform === 'function' && globalThis.Capacitor.isNativePlatform());
export const auth = nativeShell
  ? initializeAuth(app, { persistence: indexedDBLocalPersistence })
  : getAuth(app);
export const db = getFirestore(app);

export {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, updateProfile,
  EmailAuthProvider, reauthenticateWithCredential, reauthenticateWithPopup, deleteUser,
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, runTransaction, serverTimestamp, Timestamp, onSnapshot, writeBatch,
};
