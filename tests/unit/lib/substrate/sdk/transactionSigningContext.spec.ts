import { encodeAddress } from '@polkadot/util-crypto';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@polkadot/util-crypto', async (original) => original());
vi.mock('@sora-substrate/liquidity-proxy', () => ({ getChameleonPools: () => ['', []] }));

import { ApiAccount, SoraPrefix } from '@/lib/substrate/sdk/apiAccount';
import { PoolXykModule } from '@/lib/substrate/sdk/poolXyk';
import { beginTransactionSigningContext } from '@/lib/substrate/sdk/transactionSigningContext';
import { Operation } from '@/lib/substrate/sdk/types';

import type { Api } from '@/lib/substrate/sdk/api';
import type { Asset } from '@/lib/substrate/sdk/assets/types';
import type { KeyringPair } from '@polkadot/keyring/types';

/** Exposes a controlled async boundary without timers or external services. */
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

/** Models an unlocked local pair using an invented public identity, with no signing secret. */
function createPair(id: number) {
  const pair = {
    address: encodeAddress(new Uint8Array(32).fill(id), SoraPrefix),
    isLocked: true,
    unlock: vi.fn(() => {
      pair.isLocked = false;
    }),
    lock: vi.fn(() => {
      pair.isLocked = true;
    }),
  };
  return pair;
}

/** Retains actual SDK transaction preparation, signing guards and submission; only RPC/transport is fake. */
function createFixture() {
  const owner = new ApiAccount();
  const pair = createPair(1);
  owner.setAccount({ pair: pair as unknown as KeyringPair } as Parameters<typeof owner.setAccount>[0]);
  const signAsync = vi.fn();
  const send = vi.fn().mockResolvedValue(vi.fn());
  const extrinsic = { hash: { toString: () => `0x${'ab'.repeat(32)}` }, signAsync, send };
  signAsync.mockResolvedValue(extrinsic);
  const chain = {
    genesisHash: { toString: () => `0x${'11'.repeat(32)}` },
    registry: { chainSS58: SoraPrefix },
    setSigner: vi.fn(),
    rpc: {
      tradingPair: { isPairEnabled: vi.fn().mockResolvedValue({ isTrue: false }) },
      system: { accountNextIndex: vi.fn().mockResolvedValue(7) },
      chain: { getHeader: vi.fn().mockResolvedValue({ number: { toNumber: () => 100 } }) },
    },
    tx: {
      tradingPair: { register: vi.fn(() => ({})) },
      poolXYK: { initializePool: vi.fn(() => ({})), depositLiquidity: vi.fn(() => ({})) },
      utility: { batchAll: vi.fn(() => extrinsic) },
    },
  };
  const connection = { api: chain };
  owner.setConnection(connection as unknown as Parameters<typeof owner.setConnection>[0]);
  Object.assign(owner, { assets: { addAccountAsset: vi.fn() }, defaultSlippageTolerancePercent: 0.5 });
  const pool = new PoolXykModule(owner as unknown as Api<void>);
  const params = {
    pairCreationArgs: [0, 'asset-a', 'asset-b'],
    addLiquidityArgs: [0, 'asset-a', 'asset-b', '1', '2'],
    baseAssetAmount: '1',
    targetAssetAmount: '2',
  };
  vi.spyOn(
    pool as unknown as { calcCreateTxParams: () => Promise<typeof params> },
    'calcCreateTxParams'
  ).mockResolvedValue(params);
  const first: Asset = { address: 'asset-a', symbol: 'A', name: 'Asset A', decimals: 18, isMintable: true };
  const second: Asset = { address: 'asset-b', symbol: 'B', name: 'Asset B', decimals: 18, isMintable: true };
  const create = () => pool.create(first, second, '1', '2');
  const approve = () => {
    // The operation captures identity before the existing confirmation flow unlocks it.
    const dispose = beginTransactionSigningContext(owner);
    owner.unlockPair('synthetic-password');
    return dispose;
  };
  return { owner, pair, chain, connection, extrinsic, create, approve };
}

type Fixture = ReturnType<typeof createFixture>;
const switches: Array<[string, (fixture: Fixture) => void]> = [
  ['account pair', ({ owner }) => owner.setAccount({ pair: createPair(2) } as never)],
  ['signer', ({ owner }) => owner.setSigner({ signRaw: vi.fn() })],
  ['connection', ({ owner, chain }) => owner.setConnection({ api: chain } as never)],
  [
    'connection API',
    ({ connection, chain }) => {
      connection.api = { ...chain };
    },
  ],
  [
    'genesis hash',
    ({ chain }) => {
      chain.genesisHash = { toString: () => `0x${'22'.repeat(32)}` };
    },
  ],
  [
    'same-pair address',
    ({ pair }) => {
      pair.address = createPair(2).address;
    },
  ],
  [
    'previous account pair',
    ({ owner }) => {
      owner.previousAccount = { pair: createPair(2) } as never;
    },
  ],
];

describe('transaction signing context across SDK preparation', () => {
  it.each(switches)('rejects a changed %s after approval while pool RPC is pending', async (_, change) => {
    const fixture = createFixture();
    const entered = deferred<void>();
    const release = deferred<{ isTrue: boolean }>();
    fixture.chain.rpc.tradingPair.isPairEnabled.mockImplementationOnce(() => {
      entered.resolve();
      return release.promise;
    });
    const dispose = fixture.approve();
    try {
      const pending = fixture.create();
      const rejected = expect(pending).rejects.toThrow('Signing context changed');
      await entered.promise;
      change(fixture);
      release.resolve({ isTrue: false });
      await rejected;
      expect(fixture.extrinsic.signAsync).not.toHaveBeenCalled();
      expect(fixture.extrinsic.send).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it('rejects an account change during the nonce RPC before invoking the signer', async () => {
    const fixture = createFixture();
    const entered = deferred<void>();
    const release = deferred<number>();
    fixture.chain.rpc.system.accountNextIndex.mockImplementationOnce(() => {
      entered.resolve();
      return release.promise;
    });
    const dispose = fixture.approve();
    try {
      const pending = fixture.create();
      const rejected = expect(pending).rejects.toThrow('Signing context changed');
      await entered.promise;
      fixture.owner.setAccount({ pair: createPair(2) } as never);
      release.resolve(7);
      await rejected;
      expect(fixture.extrinsic.signAsync).not.toHaveBeenCalled();
      expect(fixture.extrinsic.send).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it('rejects a context change while extension signing is pending before broadcasting', async () => {
    const fixture = createFixture();
    fixture.owner.setSigner({ signRaw: vi.fn() });
    const entered = deferred<void>();
    const release = deferred<typeof fixture.extrinsic>();
    fixture.extrinsic.signAsync.mockImplementationOnce(() => {
      entered.resolve();
      return release.promise;
    });
    const dispose = beginTransactionSigningContext(fixture.owner);
    try {
      const pending = fixture.create();
      const rejected = expect(pending).rejects.toThrow('Signing context changed');
      await entered.promise;
      fixture.owner.setSigner({ signRaw: vi.fn() });
      release.resolve(fixture.extrinsic);
      await rejected;
      expect(fixture.extrinsic.signAsync).toHaveBeenCalledTimes(1);
      expect(fixture.extrinsic.send).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it('rejects a network change while the signed incoming-transfer start block is pending', async () => {
    const fixture = createFixture();
    const entered = deferred<void>();
    const release = deferred<{ number: { toNumber: () => number } }>();
    fixture.chain.rpc.chain.getHeader.mockImplementationOnce(() => {
      entered.resolve();
      return release.promise;
    });
    const dispose = fixture.approve();
    try {
      const pending = fixture.owner.submitApiExtrinsic(
        fixture.chain as never,
        fixture.extrinsic as never,
        fixture.pair as unknown as KeyringPair,
        undefined,
        { type: Operation.SubstrateIncoming }
      );
      const rejected = expect(pending).rejects.toThrow('Signing context changed');
      await entered.promise;
      fixture.owner.setConnection({ api: fixture.chain } as never);
      release.resolve({ number: { toNumber: () => 100 } });
      await rejected;
      expect(fixture.extrinsic.signAsync).toHaveBeenCalledTimes(1);
      expect(fixture.extrinsic.send).not.toHaveBeenCalled();
    } finally {
      dispose();
    }
  });

  it('signs and submits a pool creation when the approved identity stays unchanged', async () => {
    const fixture = createFixture();
    const dispose = fixture.approve();
    try {
      await expect(fixture.create()).resolves.toBeUndefined();
      expect(fixture.extrinsic.signAsync).toHaveBeenCalledWith(fixture.pair, { signer: undefined, nonce: 7 });
      expect(fixture.extrinsic.send).toHaveBeenCalledTimes(1);
    } finally {
      dispose();
    }
  });

  it('allows a newly approved account after the previous operation disposes its guard', async () => {
    const fixture = createFixture();
    const disposeFirst = fixture.approve();
    await fixture.create();
    disposeFirst();
    const second = createPair(2);
    fixture.owner.setAccount({ pair: second } as never);
    const disposeSecond = fixture.approve();
    try {
      await expect(fixture.create()).resolves.toBeUndefined();
      expect(fixture.extrinsic.signAsync).toHaveBeenLastCalledWith(second, { signer: undefined, nonce: 7 });
      expect(fixture.extrinsic.send).toHaveBeenCalledTimes(2);
    } finally {
      disposeSecond();
    }
  });

  it('keeps an older pending guard when a new confirmation captures the changed account', async () => {
    const fixture = createFixture();
    const entered = deferred<void>();
    const release = deferred<{ isTrue: boolean }>();
    fixture.chain.rpc.tradingPair.isPairEnabled.mockImplementationOnce(() => {
      entered.resolve();
      return release.promise;
    });
    const disposeFirst = fixture.approve();
    let disposeSecond: () => void = () => undefined;
    try {
      const pending = fixture.create();
      const rejected = expect(pending).rejects.toThrow('Signing context changed');
      await entered.promise;
      const second = createPair(2);
      fixture.owner.setAccount({ pair: second } as never);
      disposeSecond = fixture.approve();
      release.resolve({ isTrue: false });
      await rejected;
      expect(fixture.extrinsic.signAsync).not.toHaveBeenCalled();
      expect(fixture.extrinsic.send).not.toHaveBeenCalled();
      disposeFirst();
      // Repeated disposal of the old scope must not remove the newer scope.
      disposeFirst();
      await expect(fixture.create()).resolves.toBeUndefined();
      expect(fixture.extrinsic.signAsync).toHaveBeenCalledWith(second, { signer: undefined, nonce: 7 });
      expect(fixture.extrinsic.send).toHaveBeenCalledTimes(1);
      fixture.owner.setAccount({ pair: createPair(3) } as never);
      await expect(fixture.create()).rejects.toThrow('Signing context changed');
      expect(fixture.extrinsic.signAsync).toHaveBeenCalledTimes(1);
      expect(fixture.extrinsic.send).toHaveBeenCalledTimes(1);
    } finally {
      disposeFirst();
      disposeSecond();
    }
  });
});
