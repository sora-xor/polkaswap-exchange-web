import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/substrate/sdk/api', () => ({
  api: {},
}));

import { MstModule } from '@/lib/substrate/sdk/mst';

describe('MstModule.getMstAccount', () => {
  it('returns the matching multisig account without debug logging', () => {
    const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const multisigAccount = {
      address: 'SORA-MST',
      meta: {
        isMultisig: true,
        name: 'Treasury',
      },
    };
    const root = {
      formatAddress: vi.fn((address: string) => address.toLowerCase()),
      keyring: {
        getAddresses: vi.fn(() => [
          { address: 'SORA-USER', meta: { isMultisig: false, name: 'Signer' } },
          multisigAccount,
        ]),
      },
    };
    const mstModule = new MstModule(root as never);

    try {
      expect(mstModule.getMstAccount('sora-mst')).toBe(multisigAccount);
      expect(root.keyring.getAddresses).toHaveBeenCalledTimes(1);
      expect(root.formatAddress).toHaveBeenCalledWith('SORA-MST', false);
      expect(root.formatAddress).toHaveBeenCalledWith('sora-mst', false);
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    } finally {
      consoleInfoSpy.mockRestore();
    }
  });

  it('returns undefined when the keyring address API is not ready', () => {
    const root = {
      formatAddress: vi.fn((address: string) => address.toLowerCase()),
      keyring: undefined,
    };
    const mstModule = new MstModule(root as never);

    expect(mstModule.getMstAccount('sora-mst')).toBeUndefined();
    expect(root.formatAddress).not.toHaveBeenCalled();
  });
});

describe('MstModule pending transaction ownership', () => {
  it('disposes a subscription that finishes setup after it was stopped', async () => {
    let completeSetup!: (unsubscribe: () => void) => void;
    const unsubscribe = vi.fn();
    const root = {
      account: { pair: { address: 'first' } },
      api: {
        rpc: {
          chain: {
            subscribeNewHeads: vi.fn(
              () =>
                new Promise<() => void>((resolve) => {
                  completeSetup = resolve;
                })
            ),
          },
        },
      },
    };
    const mst = new MstModule(root as never);
    const setup = mst.startPendingTxsSubscription('mst-first');

    mst.stopPendingTxsSubscription();
    completeSetup(unsubscribe);
    await setup;

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('discards delayed reads from a replaced account subscription', async () => {
    const callbacks: Array<() => Promise<void>> = [];
    const unsubscribe = vi.fn();
    const root = {
      account: { pair: { address: 'first' } },
      api: {
        rpc: {
          chain: {
            subscribeNewHeads: vi.fn(async (callback: () => Promise<void>) => {
              callbacks.push(callback);
              return unsubscribe;
            }),
          },
        },
      },
    };
    const mst = new MstModule(root as never);
    let finishRead!: (transactions: never) => void;
    const read = vi
      .spyOn(mst, 'subscribeOnPendingTxs')
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishRead = resolve;
          })
      )
      .mockResolvedValueOnce([{ id: 'current' }] as never);
    const updates = vi.fn();
    const subscription = mst.pendingTxsUpdated.subscribe(updates);
    await mst.startPendingTxsSubscription('mst-first');
    const staleRead = callbacks[0]();

    root.account.pair.address = 'second';
    await mst.startPendingTxsSubscription('mst-second');
    finishRead([{ id: 'stale' }] as never);
    await staleRead;
    await callbacks[0]();
    expect(updates).not.toHaveBeenCalled();
    expect(read).toHaveBeenCalledTimes(1);

    await callbacks[1]();
    expect(updates).toHaveBeenCalledWith([{ id: 'current' }]);
    subscription.unsubscribe();
    mst.stopPendingTxsSubscription();
  });
});
