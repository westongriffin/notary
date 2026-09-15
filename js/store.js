// In-memory cache of the signed-in user's data. Views render from here and
// call reload() after a write. Small datasets, so full reloads are fine.
import * as dbApi from './db.js';

export const store = {
  profile: null,
  commissionImage: null,
  credentials: [],
  transactions: [],
};

const loaders = {
  profile: async () => { store.profile = await dbApi.getProfile(); },
  commissionImage: async () => { store.commissionImage = await dbApi.getCommissionImage(); },
  credentials: async () => { store.credentials = await dbApi.listCredentials(); },
  transactions: async () => { store.transactions = await dbApi.listTransactions(); },
};

const listeners = new Set();
export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export async function reload(keys = Object.keys(loaders)) {
  await Promise.all(keys.map((k) => loaders[k]()));
  for (const fn of listeners) fn(keys);
}

export function reset() {
  store.profile = null;
  store.commissionImage = null;
  store.credentials = [];
  store.transactions = [];
}
