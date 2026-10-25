import { XOR } from '@sora-substrate/sdk/build/assets/consts';
import { describe, expect, it } from 'vitest';

import { getTonswapAcquisitionPair } from '@/features/swap/services/tonswapFunding';

describe('XOR acquisition entry', () => {
  it.each([{ campaign: 'tonswap', acquire: 'XOR' }, { acquire: 'XOR' }])(
    'receives XOR and leaves the funding asset unselected for %j',
    (query) => {
      expect(getTonswapAcquisitionPair(query)).toEqual({
        firstAddress: '',
        secondAddress: XOR.address,
      });
    }
  );

  it('does not override an explicit pair or an unrelated or malformed query', () => {
    expect(getTonswapAcquisitionPair({ campaign: 'tonswap', acquire: 'XOR' }, 'dai', XOR.address)).toBeNull();
    for (const query of [
      undefined,
      {},
      { acquire: ['XOR'] },
      { acquire: 'xor' },
      { campaign: 'tonswap', acquire: 'ETH' },
    ]) {
      expect(getTonswapAcquisitionPair(query)).toBeNull();
    }
  });
});
