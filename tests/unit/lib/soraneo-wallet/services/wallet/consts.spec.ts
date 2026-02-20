import { describe, expect, it } from 'vitest';

import { KnownWallets } from '@/lib/soraneo-wallet/src/services/wallet/consts';

describe('wallet logo sources', () => {
  it('keeps wallet logos as URL strings for <img src>', () => {
    Object.values(KnownWallets).forEach((wallet) => {
      expect(typeof wallet.logo.src).toBe('string');
      expect(wallet.logo.src).not.toBe('[object Object]');
      expect(wallet.logo.src.length).toBeGreaterThan(0);
    });
  });
});
