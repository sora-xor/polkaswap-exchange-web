import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { XOR } from '@sora-substrate/sdk/build/assets/consts';

import { fetchTonswapBurnSnapshot, TONSWAP_MAINNET_GENESIS } from '@/indexer/queries/tonswapBurn';
import { APPROVED_RECOVERY_POLICY } from '@/indexer/queries/capabilities';
import { TONSWAP_START_BLOCK } from '@/features/misc/lib/tonswapBurn';

const indexerMocks = vi.hoisted(() => ({
  endpoint: 'https://mof.sora.org/graphql' as string | undefined,
  unavailable: false,
}));

vi.mock('@/plugins/pinia', () => ({ resolveGlobalPinia: () => undefined }));
vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => {
    if (indexerMocks.unavailable) throw new Error('Wallet store unavailable');
    return { indexers: { polkaswap: { endpoint: indexerMocks.endpoint } } };
  },
}));

vi.mock('@polkadot/util-crypto', () => ({
  decodeAddress: (value: string) => {
    if (!/^0x[0-9a-f]{64}$/.test(value)) throw new Error('Invalid account');
    return new Uint8Array(32);
  },
}));

const address = `0x${'11'.repeat(32)}`;
const txHash = `0x${'22'.repeat(32)}`;
const burn = (overrides: Record<string, unknown> = {}) => ({
  address,
  txHash,
  amount: '1.000000000000000001',
  assetId: XOR.address,
  blockHeight: TONSWAP_START_BLOCK,
  extrinsicIndex: 1,
  campaign: 'tonswap',
  recoveryPolicyHash: APPROVED_RECOVERY_POLICY,
  blockHash: `0x${'44'.repeat(32)}`,
  eventIndex: 0,
  receiptId: `0x${'44'.repeat(32)}:0`,
  claimOwner: address,
  originalAddress: address,
  claimStatus: 'reserved',
  ...overrides,
});
const page = (overrides: Record<string, unknown> = {}) => ({
  genesisHash: TONSWAP_MAINNET_GENESIS,
  startBlock: TONSWAP_START_BLOCK,
  indexedThroughBlock: TONSWAP_START_BLOCK + 2,
  checkpointBlock: 28_194_043,
  recoveryPolicyHash: APPROVED_RECOVERY_POLICY,
  postForkAnchorBlock: 28_194_043,
  postForkAnchorHash: '0xe7c02d6f6990bc6c0f6356833db98ccdf3ed07fb628631e45236935470774e7c',
  checkpointTimestamp: Math.floor(Date.now() / 1_000),
  fresh: true,
  nodes: [burn()],
  pageInfo: { hasNextPage: false, endCursor: 'last' },
  ...overrides,
});
const response = (value: unknown) => ({ ok: true, json: async () => ({ data: { tonswapBurnSnapshot: value } }) });

beforeEach(() => {
  indexerMocks.endpoint = 'https://mof.sora.org/graphql';
  indexerMocks.unavailable = false;
  capabilityFixture.allowed = true;
});

afterEach(() => vi.unstubAllGlobals());

describe('finalized TONSWAP burn snapshots', () => {
  it('preserves exact amounts and freezes a complete multi-page global snapshot', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(page({ nodes: [], pageInfo: { hasNextPage: true, endCursor: 'one' } })))
      .mockResolvedValueOnce(response(page()));
    vi.stubGlobal('fetch', fetchMock);
    const result = await fetchTonswapBurnSnapshot();
    expect(result.indexedThroughBlock).toBe(TONSWAP_START_BLOCK + 2);
    expect(result.burns[0].amount.toString()).toBe('1.000000000000000001');
    expect(result.burns[0]).toMatchObject({ address, txHash, extrinsicIndex: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://mof.sora.org/graphql',
      expect.objectContaining({
        credentials: 'omit',
        cache: 'no-store',
        method: 'POST',
      })
    );
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).variables).toEqual({
      after: 'one',
      atBlock: TONSWAP_START_BLOCK + 2,
      allowStale: true,
    });
  });

  it.each(['https://mof.sora.org/graphql', 'https://custom-indexer.example/graphql'])(
    'uses the configured transport without a fallback host: %s',
    async (endpoint) => {
      indexerMocks.endpoint = endpoint;
      const fetchMock = vi.fn().mockResolvedValue(response(page()));
      vi.stubGlobal('fetch', fetchMock);
      await fetchTonswapBurnSnapshot();
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([endpoint]);
    }
  );

  it.each([undefined, '', '   '])('rejects missing configuration before making a request: %s', async (endpoint) => {
    indexerMocks.endpoint = endpoint;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow('TONSWAP burn indexer is unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an unavailable wallet configuration before making a request', async () => {
    indexerMocks.unavailable = true;
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow('TONSWAP burn indexer is unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps the initial configured transport across pagination when configuration changes', async () => {
    const endpoint = 'https://custom-indexer.example/graphql';
    indexerMocks.endpoint = endpoint;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async () => {
        indexerMocks.endpoint = 'https://mof.sora.org/graphql';
        return response(page({ nodes: [], pageInfo: { hasNextPage: true, endCursor: 'one' } }));
      })
      .mockResolvedValueOnce(response(page()));
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow('context changed');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([endpoint, endpoint]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).variables.atBlock).toBe(TONSWAP_START_BLOCK + 2);
  });

  it('accepts a genuinely empty complete snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(page({ nodes: [] }))));
    await expect(fetchTonswapBurnSnapshot()).resolves.toEqual({
      burns: [],
      indexedThroughBlock: TONSWAP_START_BLOCK + 2,
      fresh: true,
    });
  });

  it.each([
    { genesisHash: 'wrong-chain' },
    { startBlock: TONSWAP_START_BLOCK + 1 },
    { checkpointTimestamp: 1 },
    { fresh: undefined },
    { checkpointTimestamp: Math.floor(Date.now() / 1_000) + 60 },
    { checkpointBlock: TONSWAP_START_BLOCK - 1 },
    { indexedThroughBlock: undefined },
    { pageInfo: {} },
  ])('rejects missing, wrong-chain or stale coverage: %j', async (override) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(page(override))));
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow();
  });

  it('returns certified older finalized history for display without permitting it as a signing quote', async () => {
    const value = page({ fresh: false, checkpointTimestamp: Math.floor(Date.now() / 1_000) - 3_600 });
    const fetchMock = vi.fn().mockResolvedValue(response(value));
    vi.stubGlobal('fetch', fetchMock);
    const snapshot = await fetchTonswapBurnSnapshot();
    expect(snapshot.fresh).toBe(false);
    expect(snapshot.burns[0].amount.toString()).toBe('1.000000000000000001');
    await expect(fetchTonswapBurnSnapshot({ requireFresh: true })).rejects.toThrow('Fresh');
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).variables.allowStale).toBe(false);
  });

  it('marks the entire paginated snapshot stale if any page loses freshness', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response(page({ nodes: [], pageInfo: { hasNextPage: true, endCursor: 'one' } })))
        .mockResolvedValueOnce(response(page({ fresh: false })))
    );
    expect((await fetchTonswapBurnSnapshot()).fresh).toBe(false);
  });

  it('never accepts malformed evidence or a future timestamp in display-only stale mode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(
          page({
            fresh: false,
            checkpointTimestamp: Math.floor(Date.now() / 1_000) - 3_600,
            nodes: [burn({ amount: '-1' })],
          })
        )
      )
    );
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(
          page({
            fresh: false,
            checkpointTimestamp: Math.floor(Date.now() / 1_000) + 60,
          })
        )
      )
    );
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow();
  });

  it.each([
    { campaign: undefined },
    { extrinsicIndex: undefined },
    { extrinsicIndex: -1 },
    { blockHeight: TONSWAP_START_BLOCK - 1 },
    { blockHeight: TONSWAP_START_BLOCK + 3 },
    { amount: '1e9' },
    { amount: '0' },
    { amount: '-1' },
    { amount: '0.0000000000000000001' },
    { txHash: 'bad-hash' },
    { address: 'not-an-account' },
    { assetId: 'another-asset' },
  ])('rejects unverifiable evidence: %j', async (override) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(page({ nodes: [burn(override)] }))));
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow();
  });

  it('rejects transport errors and partial GraphQL data instead of treating them as zero', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ errors: [{ message: 'partial' }], data: { tonswapBurnSnapshot: page() } }),
      });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow();
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow();
  });

  it('rejects repeating cursors and snapshot drift', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response(page({ pageInfo: { hasNextPage: true, endCursor: 'same' } })))
    );
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow('pagination');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(response(page({ pageInfo: { hasNextPage: true, endCursor: 'first' } })))
        .mockResolvedValueOnce(response(page({ indexedThroughBlock: TONSWAP_START_BLOCK + 1 })))
    );
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow();
  });

  it('rejects two transactions claiming the same finalized execution position', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        response(
          page({
            nodes: [burn(), burn({ txHash: `0x${'33'.repeat(32)}` })],
          })
        )
      )
    );
    await expect(fetchTonswapBurnSnapshot()).rejects.toThrow();
  });
});

// Snapshot arithmetic fixtures explicitly supply affirmative capability; negative real-gate tests are separate.
const capabilityFixture = vi.hoisted(() => ({ allowed: true }));
vi.mock('@/indexer/queries/capabilities', async (importOriginal) => {
  const { allowedFullCapabilities } = await import('@tests/fixtures/entitlementCapabilities');
  return {
    ...(await importOriginal()),
    requireEndpointEntitlements: vi.fn(async () => {
      if (!capabilityFixture.allowed) throw Error('revoked');
      return allowedFullCapabilities;
    }),
  };
});

it.each([
  { recoveryPolicyHash: '0x' + '99'.repeat(32) },
  { recoveryPolicyHash: null },
  { postForkAnchorBlock: 28_194_044 },
  { postForkAnchorHash: '0x' + '99'.repeat(32) },
])('rejects mismatched recovery snapshot identity %j', async (override) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(page(override))));
  await expect(fetchTonswapBurnSnapshot()).rejects.toThrow();
});
it.each([
  { receiptId: null },
  { claimOwner: null },
  { originalAddress: null },
  { recoveryPolicyHash: null },
  { eventIndex: -1 },
  { blockHash: '0x' + '00'.repeat(32) },
])('rejects missing recovery receipt evidence %j', async (override) => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(page({ nodes: [burn(override)] }))));
  await expect(fetchTonswapBurnSnapshot()).rejects.toThrow();
});
it('rejects capability revoked after snapshot fetch before publishing or scoring', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      capabilityFixture.allowed = false;
      return response(page());
    })
  );
  await expect(fetchTonswapBurnSnapshot()).rejects.toThrow('revoked');
});
