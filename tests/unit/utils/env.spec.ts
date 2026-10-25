import { describe, expect, it } from 'vitest';

import { shouldRenderOfflineShell } from '@/utils/env';

describe('utils/env', () => {
  const withWindow = (windowValue: Partial<Window> & Record<string, unknown>, callback: () => void) => {
    const originalWindow = (globalThis as Record<string, unknown>).window;
    (globalThis as Record<string, unknown>).window = windowValue as Window;

    try {
      callback();
    } finally {
      if (originalWindow) {
        (globalThis as Record<string, unknown>).window = originalWindow;
      } else {
        delete (globalThis as Record<string, unknown>).window;
      }
    }
  };

  const overrideNavigator = (patch: Partial<Navigator>) => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      writable: true,
      value: { ...(descriptor?.value as Navigator), ...patch },
    });
    return () => {
      if (descriptor) {
        Object.defineProperty(globalThis, 'navigator', descriptor);
      } else {
        delete (globalThis as any).navigator;
      }
    };
  };

  it('returns false when browser globals are unavailable', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    try {
      delete (globalThis as any).window;
      delete (globalThis as any).navigator;

      expect(shouldRenderOfflineShell()).toBe(false);
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, 'window', originalWindow);
      }
      if (originalNavigator) {
        Object.defineProperty(globalThis, 'navigator', originalNavigator);
      }
    }
  });

  it('returns false when the force-online runtime flag is present', () => {
    const restore = overrideNavigator({ onLine: false } as Partial<Navigator>);
    try {
      withWindow(
        {
          __PS_FORCE_ONLINE__: true,
          __PS_IPFS_CHECK__: true,
          location: { search: '?ipfs-check=1', href: 'https://example.org/?ipfs-check=1' } as Location,
        },
        () => {
          expect(shouldRenderOfflineShell()).toBe(false);
        }
      );
    } finally {
      restore();
    }
  });

  it('returns true when the explicit IPFS check runtime flag is present', () => {
    withWindow({ __PS_IPFS_CHECK__: true }, () => {
      expect(shouldRenderOfflineShell()).toBe(true);
    });
  });

  it('ignores non-string location values', () => {
    const restore = overrideNavigator({ onLine: true } as Partial<Navigator>);
    try {
      withWindow({ location: { search: 42, href: null } as unknown as Location }, () => {
        expect(shouldRenderOfflineShell()).toBe(false);
      });
    } finally {
      restore();
    }
  });

  it('returns true when navigator reports offline', () => {
    const restore = overrideNavigator({ onLine: false } as Partial<Navigator>);
    try {
      expect(shouldRenderOfflineShell()).toBe(true);
    } finally {
      restore();
    }
  });

  it('returns true when ipfs-check query flag present', () => {
    withWindow({ location: { search: '?ipfs-check=1' } as Location }, () => {
      expect(shouldRenderOfflineShell()).toBe(true);
    });
  });

  it('returns false for headless/electron user agents', () => {
    const restore = overrideNavigator({ onLine: true, userAgent: 'Mozilla/5.0 Electron/28.0.0' } as Partial<Navigator>);
    try {
      expect(shouldRenderOfflineShell()).toBe(false);
    } finally {
      restore();
    }
  });

  it('returns false when webdriver automation flag is present', () => {
    const restore = overrideNavigator({
      onLine: true,
      userAgent: 'Mozilla/5.0 Chrome/123.0.0',
      webdriver: true,
    } as Partial<Navigator>);
    try {
      expect(shouldRenderOfflineShell()).toBe(false);
    } finally {
      restore();
    }
  });

  it('returns false for regular online browsers', () => {
    const restore = overrideNavigator({ onLine: true, userAgent: 'Mozilla/5.0 Chrome/123.0.0' } as Partial<Navigator>);
    try {
      expect(shouldRenderOfflineShell()).toBe(false);
    } finally {
      restore();
    }
  });
});
