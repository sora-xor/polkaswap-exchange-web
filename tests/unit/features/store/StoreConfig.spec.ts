// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';

import { parseStoreConfig } from '@/features/store/client';

import publishedConfig from '../../../../public/community-store.json';

vi.mock('@polkadot/util-crypto', async (importOriginal) => await importOriginal());

describe('published Community Store configuration', () => {
  it('pins the merchant identity and recipient expected by the merchant relay', () => {
    expect(parseStoreConfig(publishedConfig)).toEqual({
      version: 1,
      merchantId: 'polkaswap-community-store',
      recipient: 'cnWUWKLZmNjQXGzYAF7YuRSiW1pKTRTzu4fmcYmWQX6UMGQUZ',
      relayUrl: 'https://mof.sora.org/sora-pay',
    });
  });
});
