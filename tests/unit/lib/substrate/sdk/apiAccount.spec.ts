import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import type { ISubmittableResult } from '@polkadot/types/types';

const cryptoWaitReadyMock = vi.hoisted(() => vi.fn());
const loadAllMock = vi.hoisted(() => vi.fn());

vi.mock('@polkadot/util-crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@polkadot/util-crypto')>();

  return {
    ...actual,
    cryptoWaitReady: cryptoWaitReadyMock,
  };
});

vi.mock('@polkadot/ui-keyring', () => ({
  Keyring: class {
    public loadAll = loadAllMock;

    public getAccounts = vi.fn(() => []);
  },
}));

import { ApiAccount, KeyringType, SoraPrefix, WithKeyring } from '@/lib/substrate/sdk/apiAccount';
import { Operation, TransactionStatus } from '@/lib/substrate/sdk/types';

describe('WithKeyring.initKeyring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes keyring when wasm crypto is ready', async () => {
    cryptoWaitReadyMock.mockResolvedValue(true);
    const account = new WithKeyring();

    await expect(account.initKeyring()).resolves.toBeUndefined();

    expect(cryptoWaitReadyMock).toHaveBeenCalledTimes(1);
    expect(loadAllMock).toHaveBeenCalledWith({ type: KeyringType });
  });

  it('falls back to JS crypto when wasm init fails', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    cryptoWaitReadyMock.mockRejectedValueOnce(new Error('blocked by csp'));
    const account = new WithKeyring();

    await expect(account.initKeyring()).resolves.toBeUndefined();

    expect(loadAllMock).toHaveBeenCalledWith({ type: KeyringType });
    expect(warnSpy).toHaveBeenCalledWith(
      '[wallet] WASM crypto initialization failed. Falling back to JS crypto.',
      expect.any(Error)
    );

    warnSpy.mockRestore();
  });
});

describe('WithKeyring signer lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defers signer attachment until a connection api exists', () => {
    const account = new WithKeyring();
    const signer = { signRaw: vi.fn() } as any;

    expect(() => account.setSigner(signer)).not.toThrow();
    expect(account.signer).toBe(signer);
  });

  it('replays a cached signer when the connection becomes available later', () => {
    const account = new WithKeyring();
    const signer = { signRaw: vi.fn() } as any;
    const setSignerSpy = vi.fn();

    account.setSigner(signer);
    account.setConnection({ api: { setSigner: setSignerSpy } } as any);

    expect(setSignerSpy).toHaveBeenCalledTimes(1);
    expect(setSignerSpy).toHaveBeenCalledWith(signer);
  });
});

describe('WithKeyring chain metadata', () => {
  it('formats with the SORA prefix while the connection registry is unavailable', () => {
    const account = new WithKeyring();
    const publicKey = new Uint8Array(32).fill(1);
    const address = encodeAddress(publicKey, SoraPrefix);
    const expectedAddress = encodeAddress(decodeAddress(address, false), SoraPrefix);

    expect(account.connected).toBe(false);
    expect(account.chainSymbol).toBeUndefined();
    expect(account.chainDecimals).toBeUndefined();
    expect(account.chainSS58).toBeUndefined();
    expect(account.formatAddress(address)).toBe(expectedAddress);

    account.setConnection({ api: { isConnected: true } } as any);

    expect(account.connected).toBe(true);
    expect(account.chainSymbol).toBeUndefined();
    expect(account.chainDecimals).toBeUndefined();
    expect(account.chainSS58).toBeUndefined();
    expect(account.formatAddress(address)).toBe(expectedAddress);
  });

  it('uses chain-provided metadata when the connection registry is ready', () => {
    const account = new WithKeyring();
    const publicKey = new Uint8Array(32).fill(2);
    const address = encodeAddress(publicKey, SoraPrefix);

    account.setConnection({
      api: {
        isConnected: true,
        registry: {
          chainTokens: ['LLD'],
          chainDecimals: [12],
          chainSS58: 42,
        },
      },
    } as any);

    expect(account.connected).toBe(true);
    expect(account.chainSymbol).toBe('LLD');
    expect(account.chainDecimals).toBe(12);
    expect(account.chainSS58).toBe(42);
    expect(account.formatAddress(address)).toBe(encodeAddress(decodeAddress(address, false), 42));
  });
});

describe('ApiAccount extrinsic history', () => {
  it('preserves signed incoming bridge evidence after an ambiguous send error', async () => {
    const account = new ApiAccount();
    const sender = encodeAddress(new Uint8Array(32).fill(3), SoraPrefix);
    const txHash = `0x${'ab'.repeat(32)}`;
    const extrinsic = {
      hash: { toString: () => txHash },
      send: vi.fn().mockRejectedValue(new Error('RPC: connection closed')),
    };
    const getHeader = vi.fn().mockResolvedValue({ number: { toNumber: () => 123_456 } });

    vi.spyOn(account, 'signExtrinsic').mockResolvedValue(extrinsic as any);

    await expect(
      account.submitApiExtrinsic(
        { rpc: { chain: { getHeader } } } as any,
        extrinsic as unknown as SubmittableExtrinsic<'promise'>,
        { address: sender } as any,
        undefined,
        {
          id: 'liberland-incoming-1',
          from: sender,
          type: Operation.SubstrateIncoming,
          payload: { bridgeNetwork: 'Liberland' },
        }
      )
    ).rejects.toThrow('connection closed');

    expect(getHeader).toHaveBeenCalledTimes(1);
    expect(account.getHistory('liberland-incoming-1')).toEqual(
      expect.objectContaining({
        txId: txHash,
        status: TransactionStatus.Error,
        payload: {
          bridgeNetwork: 'Liberland',
          startBlock: 123_456,
          submissionState: 'unknown',
        },
      })
    );
  });

  it('preserves a signed Ethereum bridge hash after an ambiguous send error', async () => {
    const account = new ApiAccount();
    const sender = encodeAddress(new Uint8Array(32).fill(4), SoraPrefix);
    const txHash = `0x${'cd'.repeat(32)}`;
    const extrinsic = {
      hash: { toString: () => txHash },
      send: vi.fn().mockRejectedValue(new Error('RPC: response lost')),
    };

    vi.spyOn(account, 'signExtrinsic').mockResolvedValue(extrinsic as any);

    await expect(
      account.submitApiExtrinsic(
        { rpc: { chain: { getHeader: vi.fn() } } } as any,
        extrinsic as unknown as SubmittableExtrinsic<'promise'>,
        { address: sender } as any,
        undefined,
        {
          id: 'ethereum-outgoing-1',
          from: sender,
          type: Operation.EthBridgeOutgoing,
        }
      )
    ).rejects.toThrow('response lost');

    expect(account.getHistory('ethereum-outgoing-1')).toEqual(
      expect.objectContaining({
        txId: txHash,
        status: TransactionStatus.Error,
      })
    );
  });

  it.each([
    ['purchase-swap:ts:11111111-2222-3333-4444-555555555555', true],
    ['purchase-swap:xor:11111111-2222-3333-4444-555555555555', true],
    ['ordinary-swap', false],
    ['purchase-swap:xor:invalid', false],
    ['purchase-swap:other:11111111-2222-3333-4444-555555555555', false],
  ])('retains only reviewed purchase swap hashes after response loss: %s', async (id, preservesHash) => {
    const account = new ApiAccount();
    const sender = encodeAddress(new Uint8Array(32).fill(4), SoraPrefix);
    const txHash = `0x${'de'.repeat(32)}`;
    const extrinsic = {
      hash: { toString: () => txHash },
      send: vi.fn().mockRejectedValue(new Error('RPC: response lost')),
    };
    vi.spyOn(account, 'signExtrinsic').mockResolvedValue(extrinsic as any);

    await expect(
      account.submitApiExtrinsic(
        { rpc: { chain: { getHeader: vi.fn() } } } as any,
        extrinsic as unknown as SubmittableExtrinsic<'promise'>,
        { address: sender } as any,
        undefined,
        { id, from: sender, type: Operation.Swap }
      )
    ).rejects.toThrow('response lost');

    const history = account.getHistory(id);
    expect(history?.txId).toBe(preservesHash ? txHash : undefined);
    expect(history?.status).toBe(TransactionStatus.Error);
    expect(history?.blockId).toBeUndefined();
  });

  it('persists the finalized block hash when no in-block status was observed', async () => {
    const account = new ApiAccount();
    const unsubscribe = vi.fn();
    let statusCallback!: (result: ISubmittableResult) => void;
    const extrinsic = {
      send: vi.fn(async (callback: typeof statusCallback) => {
        statusCallback = callback;
        return unsubscribe;
      }),
    };
    const saveHistorySpy = vi.spyOn(account, 'saveHistory').mockImplementation(() => undefined);

    await account.sendExtrinsic(extrinsic as unknown as SubmittableExtrinsic<'promise'>, {
      id: 'tx-1',
      from: 'sender',
      type: Operation.SubstrateIncoming,
    });

    statusCallback({
      events: [],
      status: {
        asFinalized: { toString: () => '0xfinalized-block' },
        isFinalized: true,
        isInBlock: false,
        toJSON: () => ({ finalized: '0xfinalized-block' }),
      },
      txIndex: 0,
    } as unknown as ISubmittableResult);

    expect(saveHistorySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        blockId: '0xfinalized-block',
        id: 'tx-1',
        status: TransactionStatus.Finalized,
      })
    );
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
