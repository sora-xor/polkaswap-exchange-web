import { describe, expect, it, vi } from 'vitest';

import { Operation } from '@/lib/substrate/sdk';
import { AssetsModule } from '@/lib/substrate/sdk/assets';

const asset = {
  address: '0xasset',
  symbol: 'TOK',
  name: 'Token',
  decimals: 0,
};

const createRoot = () => {
  const burnTx = { type: 'burn' };
  const remarkTx = { type: 'remark' };
  const batchTx = { type: 'batch' };

  return {
    burnTx,
    remarkTx,
    batchTx,
    root: {
      account: { pair: { address: 'cnSigner' } },
      api: {
        tx: {
          assets: {
            burn: vi.fn(() => burnTx),
          },
          system: {
            remark: vi.fn(() => remarkTx),
          },
          utility: {
            batchAll: vi.fn(() => batchTx),
          },
        },
      },
      submitExtrinsic: vi.fn(async () => 'submitted'),
    },
  };
};

describe('AssetsModule.burnWithRemark', () => {
  it('submits a plain burn when the remark is empty', async () => {
    const { root, burnTx } = createRoot();
    const assets = new AssetsModule(root as any);

    await assets.burnWithRemark(asset as any, '2', '   ');

    expect(root.api.tx.assets.burn).toHaveBeenCalledWith('0xasset', '2');
    expect(root.api.tx.utility.batchAll).not.toHaveBeenCalled();
    expect(root.submitExtrinsic).toHaveBeenCalledWith(burnTx, root.account.pair, {
      type: Operation.Burn,
      amount: '2',
      assetAddress: '0xasset',
      symbol: 'TOK',
    });
  });

  it('submits an atomic burn and system remark batch', async () => {
    const { root, burnTx, remarkTx, batchTx } = createRoot();
    const assets = new AssetsModule(root as any);

    await assets.burnWithRemark(asset as any, '2', ' public recipient ');

    expect(root.api.tx.assets.burn).toHaveBeenCalledWith('0xasset', '2');
    expect(Array.from(root.api.tx.system.remark.mock.calls[0][0])).toEqual(Array.from(Buffer.from('public recipient')));
    expect(root.api.tx.utility.batchAll).toHaveBeenCalledWith([burnTx, remarkTx]);
    expect(root.submitExtrinsic).toHaveBeenCalledWith(batchTx, root.account.pair, {
      type: Operation.Burn,
      amount: '2',
      assetAddress: '0xasset',
      symbol: 'TOK',
      comment: 'public recipient',
    });
  });
});
