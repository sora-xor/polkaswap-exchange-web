import { beforeEach, describe, expect, it, vi } from 'vitest';
import { encodeAddress } from '@polkadot/util-crypto';
import { effectScope } from 'vue';

vi.mock('@polkadot/util-crypto', async (importOriginal) => await importOriginal());
vi.mock('@/lib/substrate/sdk/assets/consts', () => ({
  XOR: { address: '0x0200000000000000000000000000000000000000000000000000000000000000', symbol: 'XOR', decimals: 18 },
}));

const runtime = vi.hoisted(() => ({ api: {} as Record<string, any>, getAssetBalance: vi.fn() }));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: runtime.api }));
vi.mock('@/lib/substrate/sdk/assets', () => ({ getAssetBalance: runtime.getAssetBalance }));
import { createStoreWalletAdapter, type StoreWalletHooks } from '@/features/store/walletAdapter';
import { STORE_MAINNET_GENESIS } from '@/features/store/client';
import type { PaymentRequest } from '@sora/sora-pay/core';

const payer = encodeAddress(new Uint8Array(32).fill(2), 69);
const recipient = 'cnWUWKLZmNjQXGzYAF7YuRSiW1pKTRTzu4fmcYmWQX6UMGQUZ';
let hooks: StoreWalletHooks;

/** Request amounts are native codec units, unrelated to bridge denomination conversion. */
function request(): PaymentRequest {
  return {
    version: 1,
    merchant: { id: 'store', name: 'Store' },
    chainGenesisHash: STORE_MAINNET_GENESIS,
    assetId: '0x0200000000000000000000000000000000000000000000000000000000000000',
    payer,
    recipient,
    amountCodec: '1234567000000000000',
    decimals: 18,
    denomination: '1000000',
    reference: `sp_${'a'.repeat(32)}`,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

beforeEach(() => {
  runtime.getAssetBalance.mockResolvedValue({ transferable: '9000000000000000000' });
  Object.assign(runtime.api, {
    account: { pair: { address: payer } },
    assets: { transfer: vi.fn().mockResolvedValue(undefined) },
    connection: {
      api: {
        isConnected: true,
        genesisHash: { toString: () => STORE_MAINNET_GENESIS },
        consts: { balances: { existentialDeposit: { toString: () => '1' } } },
        query: {
          denomination: { denominator: vi.fn().mockResolvedValue({ toString: () => '1000000' }) },
          assets: { assetInfosV2: vi.fn().mockResolvedValue({ precision: { toString: () => '18' } }) },
        },
        tx: {
          liquidityProxy: {
            xorlessTransfer: vi.fn().mockReturnValue({
              paymentInfo: vi.fn().mockResolvedValue({ partialFee: { toString: () => '1000000000000000' } }),
            }),
          },
        },
      },
    },
  });
  hooks = {
    address: () => payer,
    connected: () => true,
    connect: vi.fn(),
    withNotifications: async (handler) => {
      try {
        await handler();
        return { submitted: true, transaction: { txId: `0x${'b'.repeat(64)}` } as any };
      } catch (error) {
        return { submitted: false, error };
      }
    },
    beginAttempt: vi.fn().mockResolvedValue('lease'),
    cancelAttempt: vi.fn(),
    reportTransaction: vi.fn(),
    onPending: vi.fn(),
  };
});

describe('Polkaswap Sora Pay signing adapter', () => {
  it('signs the exact native amount and public random reference after securing a relay lease', async () => {
    const adapter = createStoreWalletAdapter(hooks);
    const result = await adapter.submit(request());
    expect(runtime.api.assets.transfer).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'XOR' }),
      recipient,
      '1.234567',
      { feeType: 'xor', comment: `sp_${'a'.repeat(32)}` }
    );
    expect(hooks.beginAttempt).toHaveBeenCalledOnce();
    expect(hooks.reportTransaction).toHaveBeenCalledWith(result.transactionHash, 'lease');
    expect(hooks.cancelAttempt).not.toHaveBeenCalled();
  });

  it('rechecks account after the wallet unlock and never submits for a switched account', async () => {
    hooks.withNotifications = async (handler) => {
      runtime.api.account.pair.address = recipient;
      try {
        await handler();
        return { submitted: true };
      } catch (error) {
        return { submitted: false, error };
      }
    };
    await expect(createStoreWalletAdapter(hooks).submit(request())).rejects.toThrow();
    expect(runtime.api.assets.transfer).not.toHaveBeenCalled();
    expect(hooks.cancelAttempt).toHaveBeenCalledWith('lease');
  });

  it('does not release a payment lease based on ambiguous post-invocation cancellation text', async () => {
    runtime.api.assets.transfer.mockRejectedValue(Object.assign(new Error('User rejected'), { code: 4001 }));
    await expect(createStoreWalletAdapter(hooks).submit(request())).rejects.toThrow('uncertain');
    expect(hooks.cancelAttempt).not.toHaveBeenCalled();
    expect(hooks.onPending).toHaveBeenCalledOnce();
  });

  it('blocks wrong-chain, denomination changes and insufficient fee balance before leasing', async () => {
    const adapter = createStoreWalletAdapter(hooks);
    runtime.api.connection.api.genesisHash.toString = () => `0x${'0'.repeat(64)}`;
    await expect(adapter.submit(request())).rejects.toThrow();
    runtime.api.connection.api.genesisHash.toString = () => STORE_MAINNET_GENESIS;
    runtime.api.connection.api.query.denomination.denominator.mockResolvedValue({ toString: () => '2000000' });
    await expect(adapter.submit(request())).rejects.toThrow();
    runtime.api.connection.api.query.denomination.denominator.mockResolvedValue({ toString: () => '1000000' });
    runtime.getAssetBalance.mockResolvedValue({ transferable: request().amountCodec });
    await expect(adapter.submit(request())).rejects.toThrow();
    expect(hooks.beginAttempt).not.toHaveBeenCalled();
    expect(runtime.api.assets.transfer).not.toHaveBeenCalled();
  });

  it('disposes wallet observers when the host is removed', () => {
    const scope = effectScope();
    const stop = scope.run(() => createStoreWalletAdapter(hooks).subscribe(vi.fn()))!;
    expect(() => stop()).not.toThrow();
    scope.stop();
  });
});
