// Scheduled job (see backend/jobs.config). Hooks compute credentialStatus at
// write time, but a profile that is never edited would otherwise stay "valid"
// forever. This job refreshes the derived fields for every profile.

import wixData from 'wix-data';
import { COLLECTIONS } from 'public/constants.js';
import { deriveCredentialFields } from 'backend/lib/credentials.js';

const ELEVATED = { suppressAuth: true, suppressHooks: true };
const PAGE = 100;

export async function refreshCredentialStatus() {
  let skip = 0;
  let updated = 0;

  for (;;) {
    const page = await wixData
      .query(COLLECTIONS.USER_PROFILE)
      .limit(PAGE)
      .skip(skip)
      .find(ELEVATED);

    for (const profile of page.items) {
      const derived = deriveCredentialFields(profile.credentials || []);
      const changed =
        derived.credentialStatus !== profile.credentialStatus ||
        String(derived.nextCredentialExpiry || '') !== String(profile.nextCredentialExpiry || '');
      if (changed) {
        await wixData.update(COLLECTIONS.USER_PROFILE, { ...profile, ...derived }, ELEVATED);
        updated += 1;
      }
    }

    if (!page.hasNext()) break;
    skip += PAGE;
  }

  console.log(`[credentialExpiry] refreshed ${updated} profile(s)`);
  return { updated };
}
