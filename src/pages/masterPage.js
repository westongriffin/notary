// Runs on every page. Keep global behavior here (e.g. redirect logged-out
// visitors away from the dashboard). Page-specific code lives in files Wix
// generates as src/pages/<Page Name>.<pageId>.js once the page exists.

import wixLocation from 'wix-location';
import { currentMember } from 'wix-members-frontend';

const PROTECTED_PREFIXES = ['/dashboard'];

$w.onReady(async () => {
  const path = '/' + (wixLocation.path[0] || '');
  const isProtected = PROTECTED_PREFIXES.some((p) => path.startsWith(p));
  if (!isProtected) return;

  const member = await currentMember.getMember();
  if (!member) {
    wixLocation.to('/');
  }
});
