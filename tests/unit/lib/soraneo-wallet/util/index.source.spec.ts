import { describe, expect, it } from 'vitest';

import utilSource from '@/lib/soraneo-wallet/src/util/index.ts?raw';

describe('wallet util whitelist source', () => {
  it('loads bundled whitelist assets instead of external hosts', () => {
    expect(utilSource).toContain("export const WHITE_LIST_URL = 'whitelist.json';");
    expect(utilSource).toContain("export const NFT_BLACK_LIST_URL = 'blacklist.json';");
    expect(utilSource).not.toContain('whitelist.polkaswap2.io');
  });
});
