export type BrowserNotificationPromptVisibility = (visible: boolean) => void;

/**
 * Returns whether the current runtime exposes the browser Notification API.
 */
export function isBrowserNotificationApiAvailable(): boolean {
  return typeof Notification !== 'undefined';
}

/**
 * Reads the live browser notification permission with a safe default for
 * runtimes that do not expose the Notification API.
 */
export function getBrowserNotificationPermission(available = isBrowserNotificationApiAvailable()): NotificationPermission {
  if (!available || !isBrowserNotificationApiAvailable()) return 'default';

  const permission = Notification.permission;

  return permission === 'granted' || permission === 'denied' || permission === 'default' ? permission : 'default';
}

/**
 * Requests browser notification permission only when the browser can still
 * show a native prompt. Already granted or denied states return immediately,
 * which prevents stale "press Allow" overlays after the user has allowed.
 */
export async function requestBrowserNotificationPermission(
  setPromptVisibility?: BrowserNotificationPromptVisibility
): Promise<NotificationPermission> {
  if (!isBrowserNotificationApiAvailable()) {
    return 'default';
  }

  const currentPermission = getBrowserNotificationPermission(true);

  if (currentPermission !== 'default') {
    return currentPermission;
  }

  setPromptVisibility?.(true);

  try {
    return (await Notification.requestPermission()) ?? getBrowserNotificationPermission(true);
  } finally {
    setPromptVisibility?.(false);
  }
}
