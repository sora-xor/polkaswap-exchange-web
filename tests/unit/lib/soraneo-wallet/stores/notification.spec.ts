import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';

import { useNotificationStore } from '@/lib/soraneo-wallet/src/stores/notification';

describe('wallet notification store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts with the expected defaults and resolves matching errors', () => {
    const store = useNotificationStore();

    expect(store.defaultErrorTranslationKey).toBe('unknownErrorText');
    expect(store.errorMappings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pattern: 'Invalid decoded address', translationKey: 'walletSend.errorAddress' }),
        expect.objectContaining({
          pattern: 'Invalid bip39 mnemonic specified',
          translationKey: 'desktop.errorMessages.mnemonic',
        }),
      ])
    );
    expect(store.resolveErrorMapping('boom: Invalid decoded address')).toEqual({
      pattern: 'Invalid decoded address',
      translationKey: 'walletSend.errorAddress',
    });
    expect(store.resolveErrorMapping('no match here')).toBeUndefined();
  });

  it('updates the default key, deduplicates new mappings, and can replace the full mapping list', () => {
    const store = useNotificationStore();

    store.setDefaultErrorTranslationKey('wallet.errors.default');
    expect(store.defaultErrorTranslationKey).toBe('wallet.errors.default');

    const initialLength = store.errorMappings.length;

    store.registerErrorMapping({ pattern: 'Balance too low', translationKey: 'wallet.errors.balance' });
    store.registerErrorMapping({ pattern: 'Balance too low', translationKey: 'wallet.errors.balance' });

    expect(store.errorMappings).toHaveLength(initialLength + 1);
    expect(store.resolveErrorMapping('Balance too low for transfer')).toEqual({
      pattern: 'Balance too low',
      translationKey: 'wallet.errors.balance',
    });

    store.replaceErrorMappings([{ pattern: 'Only this', translationKey: 'wallet.errors.onlyThis' }]);

    expect(store.errorMappings).toEqual([{ pattern: 'Only this', translationKey: 'wallet.errors.onlyThis' }]);
    expect(store.resolveErrorMapping('Only this case')).toEqual({
      pattern: 'Only this',
      translationKey: 'wallet.errors.onlyThis',
    });
    expect(store.resolveErrorMapping('Invalid decoded address')).toBeUndefined();
  });
});
