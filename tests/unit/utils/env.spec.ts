import { describe, expect, it } from 'vitest';

import { shouldRenderOfflineShell } from '@/utils/env';

describe('utils/env', () => {
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

  it('returns true when navigator reports offline', () => {
    const restore = overrideNavigator({ onLine: false } as Partial<Navigator>);
    try {
      expect(shouldRenderOfflineShell()).toBe(true);
    } finally {
      restore();
    }
  });

  it('returns true when ipfs-check query flag present', () => {
    const originalWindow = (globalThis as Record<string, unknown>).window;
    (globalThis as Record<string, unknown>).window = {
      location: { search: '?ipfs-check=1' },
    } as Window;

    try {
      expect(shouldRenderOfflineShell()).toBe(true);
    } finally {
      if (originalWindow) {
        (globalThis as Record<string, unknown>).window = originalWindow;
      } else {
        delete (globalThis as Record<string, unknown>).window;
      }
    }
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
