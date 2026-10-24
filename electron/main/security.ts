/**
 * URLs sent to the operating system must open in a browser, never a local file
 * or arbitrary protocol handler. Reject credentials to avoid misleading links.
 */
export function safeExternalUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Only the packaged document (or configured dev document) may occupy the app window. */
export function isAppNavigation(value: string, appUrl: string): boolean {
  try {
    const destination = new URL(value);
    const application = new URL(appUrl);
    destination.hash = '';
    application.hash = '';
    return destination.href === application.href;
  } catch {
    return false;
  }
}
