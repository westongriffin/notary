# Notary Book

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
├── index.html                # Single-page app shell (sign-in + 3 tabs)
├── intake.html               # Client intake page, opened from a texted link
├── css/styles.css
├── js/
│   ├── app.js                # Boot, auth state, tab routing
│   ├── firebase.js           # SDK init (CDN, modular v10) + re-exports
│   ├── firebase-config.js    # Public web config for the Firebase project
│   ├── auth.js               # Sign in / up / out, Google, password reset
│   ├── db.js                 # All Firestore reads/writes
│   ├── store.js              # In-memory cache + change notifications
│   ├── constants.js          # Act types, ID methods, credential types
│   ├── validators.js         # Client-side mirror of the rules
│   ├── csv.js                # Journal export
│   ├── dom.js                # Tiny DOM/format helpers
│   ├── signature-pad.js      # Canvas signature capture
│   ├── image.js              # Shrinks uploaded images to JPEG data URLs
│   ├── intake.js             # Client-facing intake page logic (no sign-in)
│   └── views/                # overview, journal, profile, intake-panel
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

### `users/{uid}/media/commission` — commission certificate image

| Field | Type | Notes |
| --- | --- | --- |
| `dataUrl` | string | JPEG data URL, shrunk client-side to ≤ 900k chars (Firebase Storage needs the Blaze plan) |
| `width`, `height` | int | Stored dimensions |
| `fileName`, `contentType`, `uploadedAt` | string, string, timestamp | |

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
| `signature` | string | Optional signer signature as a PNG data URL from the on-screen pad; immutable |
| `voided`, `voidReason` | bool, string | Void is one-way and needs a reason |

After creation only notes, contact details, and the void flag can change.
Deletes are refused by the rules.

## Client intake links

From the Journal form, **Request client info** creates a one-time link
(`intake.html#<40-hex token>`) and offers to text, share, or copy it. The
client opens it on their phone with no sign-in, enters name, address,
document, email, phone, and signs. The notary's form is listening via a
Firestore snapshot and fills itself the moment the client submits; the notary
adds act type, ID method, fee, and saves. Saving marks the request `used`.

| Field on `intakes/{token}` | Set by | Notes |
| --- | --- | --- |
| `ownerUid`, `notaryName`, `status: pending`, `createdAt`, `expiresAt` | notary | Expires after 7 days |
| `clientName`, `clientAddress`, `documentDescription`, `clientEmail`, `clientPhone`, `signature`, `submittedAt`, `status: submitted` | client | Exactly one submit while pending and unexpired |
| `status: used` / `cancelled` | notary | Closes the link |

The token is the only credential: the rules allow `get` by exact id, never a
list, and the client can only change the fields above on a pending record.

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
