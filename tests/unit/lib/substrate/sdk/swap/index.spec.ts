import { describe, expect, it, vi } from 'vitest';

import { getBestResult, SwapModule } from '@/lib/substrate/sdk/swap';

describe('swap getBestResult', () => {
  it('selects the best result when DexId.XOR is absent from the candidate set', () => {
    const result = getBestResult(false, {
      1: { amount: '100', amountWithoutImpact: '100', fee: [], rewards: [], route: [] },
      2: { amount: '200', amountWithoutImpact: '200', fee: [], rewards: [], route: [] },
    } as never);

    expect(result.dexId).toBe(2);
    expect(result.result.amount).toBe('200');
  });
});

describe('SwapModule execution history', () => {
  it('uses a caller-provided history id for direct transaction tracking', async () => {
    const pair = { address: 'signer-address' };
    const submitExtrinsic = vi.fn().mockResolvedValue(undefined);
    const swapExtrinsic = { kind: 'swap' };
    const swapTx = vi.fn(() => swapExtrinsic);
    const swap = new SwapModule({
      account: { pair },
      api: { tx: { liquidityProxy: { swap: swapTx } } },
      assets: { addAccountAsset: vi.fn() },
      submitExtrinsic,
    } as never);
    vi.spyOn(swap as any, 'calcTxParams').mockReturnValue({ args: ['encoded-call'] });
    const assetA = { address: 'asset-a', symbol: 'A', decimals: 18 };
    const assetB = { address: 'asset-b', symbol: 'B', decimals: 18 };

    await swap.execute(assetA as never, assetB as never, '1', '2', '0.5', false, undefined, undefined, 'intent-1');

    expect(submitExtrinsic).toHaveBeenCalledWith(
      swapExtrinsic,
      pair,
      expect.objectContaining({ id: 'intent-1', type: expect.anything() })
    );
  });
});
