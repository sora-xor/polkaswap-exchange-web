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
  it.each([
    { side: false, from: '1', to: '100', bound: '99876544', key: 'WithDesiredInput', field: 'minAmountOut' },
    { side: true, from: '100', to: '1', bound: '100123456', key: 'WithDesiredOutput', field: 'maxAmountIn' },
  ])(
    'encodes the exact quoted low-decimal bound for output-side=$side',
    async ({ side, from, to, bound, key, field }) => {
      const swapTx = vi.fn((..._args: unknown[]) => ({ kind: 'swap' }));
      const swap = new SwapModule({
        account: { pair: { address: 'signer-address' } },
        api: { tx: { liquidityProxy: { swap: swapTx } } },
        assets: { addAccountAsset: vi.fn() },
        submitExtrinsic: vi.fn().mockResolvedValue(undefined),
      } as never);
      const assetA = { address: 'asset-a', symbol: 'A', decimals: side ? 6 : 18 };
      const assetB = { address: 'asset-b', symbol: 'B', decimals: side ? 18 : 6 };
      expect(swap.getMinMaxValue(assetA as never, assetB as never, from, to, side, '0.123456')).toBe(bound);
      await swap.execute(assetA as never, assetB as never, from, to, '0.123456', side);
      expect(swapTx.mock.calls[0][3]).toMatchObject({ [key]: { [field]: bound } });
    }
  );

  it('keeps large exact input codecs when calculating the shared slippage bound', async () => {
    const swapTx = vi.fn((..._args: unknown[]) => ({ kind: 'swap' }));
    const swap = new SwapModule({
      account: { pair: { address: 'signer-address' } },
      api: { tx: { liquidityProxy: { swap: swapTx } } },
      assets: { addAccountAsset: vi.fn() },
      submitExtrinsic: vi.fn().mockResolvedValue(undefined),
    } as never);
    const asset = { address: 'asset-a', symbol: 'A', decimals: 18 };
    await swap.execute(
      asset as never,
      { ...asset, address: 'asset-b' } as never,
      '9007199254740993.000000000000000001',
      '2.000000000000000002',
      '0.5'
    );
    expect(swapTx.mock.calls[0][3]).toEqual({
      WithDesiredInput: {
        desiredAmountIn: '9007199254740993000000000000000001',
        minAmountOut: '1990000000000000002',
      },
    });
  });

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
