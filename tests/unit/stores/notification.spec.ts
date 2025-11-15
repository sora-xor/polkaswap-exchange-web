import { createPinia, setActivePinia } from 'pinia';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useNotificationStore } from '@/stores/notification';

const { localStorageMock } = vi.hoisted(() => {
  const storage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };

  vi.stubGlobal('localStorage', storage);

  return { localStorageMock: storage };
});

describe('notification store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it('deduplicates error mappings and resolves matches', () => {
    const store = useNotificationStore();
    store.replaceErrorMappings([]);

    store.registerErrorMapping({ pattern: 'InsufficientBalance', translationKey: 'errors.balance' });
    store.registerErrorMapping({ pattern: 'InsufficientBalance', translationKey: 'errors.balance.duplicate' });

    expect(store.errorMappings).toHaveLength(1);
    expect(store.resolveErrorMapping('InsufficientBalance occurred')?.translationKey).toBe('errors.balance');
    expect(store.resolveErrorMapping('Another error')).toBeUndefined();
  });

  it('updates the default translation key', () => {
    const store = useNotificationStore();
    store.setDefaultErrorTranslationKey('custom.error');

    expect(store.defaultErrorTranslationKey).toBe('custom.error');
  });
});
