// Runtime detection for the Capacitor (iOS) shell. The same code runs on
// the web; these helpers only change behavior when a native bridge exists.
const cap = typeof window !== 'undefined' ? window.Capacitor : undefined;

export const isNative = Boolean(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
export const platform = isNative && typeof cap.getPlatform === 'function' ? cap.getPlatform() : 'web';

function plugin(name) { return isNative && cap.Plugins && cap.Plugins[name] ? cap.Plugins[name] : null; }

/** True when some share sheet is available (native plugin or Web Share API). */
export function canShare() { return Boolean(plugin('Share') || navigator.share); }

export async function share({ title, text, url }) {
  const p = plugin('Share');
  if (p) return p.share({ title, text, url, dialogTitle: title });
  if (navigator.share) return navigator.share({ title, text, url });
  throw new Error('Sharing is not available on this device');
}

/** Tell the native splash screen it can go away once the app has rendered. */
export function hideSplash() {
  const p = plugin('SplashScreen');
  if (p && p.hide) p.hide().catch(() => {});
}
