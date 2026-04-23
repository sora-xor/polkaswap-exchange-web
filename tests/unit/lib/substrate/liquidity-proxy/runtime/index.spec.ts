import { describe, expect, it } from 'vitest';

import { Consts } from '@/lib/substrate/liquidity-proxy/consts';
import { getChameleonPools } from '@/lib/substrate/liquidity-proxy/runtime';

describe('liquidity proxy runtime helpers', () => {
  it('returns no chameleon pools while runtime chameleons are disabled', () => {
    expect(getChameleonPools(Consts.XOR)).toEqual([null, []]);
    expect(getChameleonPools(Consts.KXOR)).toEqual([null, []]);
  });
});
