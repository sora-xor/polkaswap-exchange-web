import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getBrowserNotificationPermission,
  isBrowserNotificationApiAvailable,
  requestBrowserNotificationPermission,
} from '@/utils/browserNotifications';

const originalNotification = globalThis.Notification;

function installNotificationMock(permission: NotificationPermission, requestPermission = vi.fn()) {
  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    value: {
      get permission() {
        return permission;
      },
      requestPermission,
    },
  });
}

describe('browser notification utilities', () => {
  afterEach(() => {
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: originalNotification,
    });
    vi.restoreAllMocks();
  });

  it('reports unavailable notification permission safely', () => {
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: undefined,
    });

    expect(isBrowserNotificationApiAvailable()).toBe(false);
    expect(getBrowserNotificationPermission()).toBe('default');
  });

  it('does not show the prompt overlay or request again when permission is already granted', async () => {
    const requestPermission = vi.fn();
    const setPromptVisibility = vi.fn();
    installNotificationMock('granted', requestPermission);

    await expect(requestBrowserNotificationPermission(setPromptVisibility)).resolves.toBe('granted');

    expect(requestPermission).not.toHaveBeenCalled();
    expect(setPromptVisibility).not.toHaveBeenCalled();
  });

  it('shows the prompt overlay only while requesting default permission', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted');
    const setPromptVisibility = vi.fn();
    installNotificationMock('default', requestPermission);

    await expect(requestBrowserNotificationPermission(setPromptVisibility)).resolves.toBe('granted');

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(setPromptVisibility.mock.calls).toEqual([[true], [false]]);
  });
});
