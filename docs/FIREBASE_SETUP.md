# Firebase setup for project `notary-wes-griffin`

Console: https://console.firebase.google.com/project/notary-wes-griffin

## One-time console settings

1. **Authentication → Sign-in method**
   - Enable **Email/Password**.
   - Enable **Google** (optional, powers the "Continue with Google" button).
2. **Authentication → Settings → Authorized domains**
   - Add `notary.wes-griffin.com`.
   - `localhost` and `notary-wes-griffin.firebaseapp.com` are there by default.
3. **Firestore Database** — already created in `nam5` (US multi-region).

## Deploying the rules

The rules in `firestore.rules` are the server-side guard for every write.
Deploy them whenever they change:

```bash
firebase deploy --only firestore --project notary-wes-griffin
```

### Optional: let CI deploy rules on every push to `main`

1. Google Cloud Console → IAM → Service Accounts → create one named
   `github-rules-deploy` with the role **Firebase Rules Admin**
   (and **Cloud Datastore Index Admin** if you add indexes).
2. Create a JSON key for it.
3. GitHub repo → Settings → Secrets and variables → Actions → new secret
   `FIREBASE_SERVICE_ACCOUNT` with the JSON contents.

`.github/workflows/ci.yml` skips the deploy job when the secret is absent.

## Testing the rules locally (optional)

```bash
firebase emulators:start --only firestore,auth
```

Then serve the site and point `js/firebase.js` at the emulators with
`connectAuthEmulator` / `connectFirestoreEmulator` while testing.
