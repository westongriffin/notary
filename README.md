# Notary Records

Private record-keeping dashboard for a notary business, served at
**https://notary.wes-griffin.com**.

| Layer | Where | Notes |
| --- | --- | --- |
| Site (HTML/CSS/JS) | This repo → **GitHub Pages** | Static, no build step |
| Auth + database | **Firebase** project `notary-wes-griffin` | Firebase Auth, Cloud Firestore |
| Database hooks | [`firestore.rules`](firestore.rules) | Server-side validation and immutability |
| DNS only | **Wix** (registrar for wes-griffin.com) | One CNAME record; nothing else on Wix |

## Repository layout

```
.
├── index.html                # Single-page app shell (sign-in + 4 tabs)
├── css/styles.css
├── js/
│   ├── app.js                # Boot, auth state, tab routing
│   ├── firebase.js           # SDK init (CDN, modular v10) + re-exports
│   ├── firebase-config.js    # Public web config for the Firebase project
│   ├── auth.js               # Sign in / up / out, Google, password reset
│   ├── db.js                 # All Firestore reads/writes
│   ├── store.js              # In-memory cache + change notifications
│   ├── constants.js          # Act types, ID methods, statuses, transitions
│   ├── validators.js         # Client-side mirror of the rules
│   ├── csv.js                # Journal export
│   ├── dom.js                # Tiny DOM/format helpers
│   └── views/                # overview, journal, documents, profile
├── firestore.rules           # Security rules = database hooks
├── firestore.indexes.json
├── firebase.json / .firebaserc
├── CNAME                     # notary.wes-griffin.com (GitHub Pages custom domain)
├── .nojekyll                 # Serve files as-is
├── robots.txt                # Disallow indexing (private tool)
├── .github/workflows/ci.yml  # Syntax checks; optional rules deploy
└── docs/
    ├── DNS_SETUP.md          # The one Wix step
    └── FIREBASE_SETUP.md     # Auth providers, authorized domains, rules deploy
```

## Data model (Firestore)

Everything lives under `users/{uid}`, so a signed-in user can only ever read
or write their own records. Field validation lives in `firestore.rules`.

### `users/{uid}` — profile

| Field | Type | Notes |
| --- | --- | --- |
| `displayName`, `businessName`, `email`, `phone` | string | |
| `commissionState`, `commissionNumber` | string | |
| `nextEntryNumber` | int | Journal counter; rules allow it to advance by exactly 1 |
| `createdAt`, `updatedAt` | timestamp | |

### `users/{uid}/credentials/{id}` — credential document metadata

| Field | Type | Notes |
| --- | --- | --- |
| `type` | `commission` / `bond` / `insurance` / `training` / `other` | |
| `label` | string | Required |
| `uploadedAt`, `expiresAt` | timestamp | `expiresAt` must be after `uploadedAt` |
| `fileUrl`, `fileName`, `notes` | string | Optional; the file itself is not stored |

Status (`valid` / `expiring` within 60 days / `expired`) is derived on read.

### `users/{uid}/transactions/{id}` — append-only journal

| Field | Type | Notes |
| --- | --- | --- |
| `entryNumber` | int | Sequential per user, assigned in a Firestore transaction |
| `actDate` | timestamp | Not in the future |
| `actType` | enum | See `js/constants.js` |
| `clientName`, `clientAddress` | string | Required |
| `idMethod` | enum | |
| `fee` | number | 0 – 100,000 |
| `clientEmail`, `clientPhone`, `documentDescription`, `notes` | string | |
| `voided`, `voidReason` | bool, string | Void is one-way and needs a reason |

After creation only notes, contact details, and the void flag can change.
Deletes are refused by the rules.

### `users/{uid}/documents/{id}` — Draft → Pending Signature → Completed

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string | Required |
| `status` | enum | Transitions enforced in rules and UI |
| `transactionId` | string | Optional link to a journal entry |
| `statusHistory` | array of `{status, at}` | Exactly one entry appended per change |
| `lastStatusChange`, `completedAt` | timestamp | |
| `clientName`, `fileUrl`, `fileName`, `notes` | string | |

Completed documents are frozen: no edits, no reopening, no deletion.

## Local development

Any static server works. For example:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080. Sign-in works locally because `localhost`
is an authorized domain in Firebase Auth by default.

## Deploying

- **Site**: push to `main`. GitHub Pages serves the repo root.
- **Rules**: `firebase deploy --only firestore` (or configure the secret described in `docs/FIREBASE_SETUP.md` so CI does it).
- **DNS**: one-time, see `docs/DNS_SETUP.md`.
