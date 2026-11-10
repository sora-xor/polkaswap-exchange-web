import { beforeEach, describe, expect, it, vi } from 'vitest';
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto';

import {
  canShowPoints,
  fetchOwnedPointMetadata,
  fetchPointOwnership,
  parsePointOwnership,
} from '@/indexer/queries/pointOwnership';

// The shared wallet setup deliberately mocks decodeAddress with an empty value.
// Ownership admission must exercise the actual AccountId32 and SS58 codecs.
vi.mock('@polkadot/util-crypto', async (importOriginal) => await importOriginal());

const mocks = vi.hoisted(() => ({ request: vi.fn(), meta: vi.fn(), indexer: undefined as any, recovery: true }));
vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({ getCurrentIndexer: () => mocks.indexer }));
vi.mock('@/indexer/queries/pointSystem', () => ({ fetchAccountMeta: mocks.meta }));

const old = `0x${'11'.repeat(32)}`;
const owner = `0x${'22'.repeat(32)}`;
const policy = `0x${'33'.repeat(32)}`;
const checkpoint = 28_191_817;
const checkpointHash = '0x7f7c253fa72f32e7b03f32bdc9ae456fd7174fb131b689be6d876006124129f0';
const legacy = () => ({
  status: 'legacy',
  ready: true,
  accountId: owner,
  policyHash: null,
  checkpointBlock: null,
  checkpointHash: null,
  referralRewardsCodec: '0',
  sources: [{ account: owner, firstBlock: 1, lastBlock: null }],
});
const replacement = () => ({
  status: 'replacement',
  ready: true,
  accountId: owner,
  policyHash: policy,
  checkpointBlock: checkpoint,
  checkpointHash,
  referralRewardsCodec: '123000000000000000000',
  sources: [
    { account: old, firstBlock: 1, lastBlock: checkpoint },
    { account: owner, firstBlock: checkpoint + 1, lastBlock: null },
  ],
});

describe('Soratopia ownership admission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recovery = true;
    mocks.indexer = { services: { explorer: { request: mocks.request } } };
  });

  it('uses the real address codec and rejects non-AccountId32 keys', () => {
    expect(decodeAddress(encodeAddress(owner, 69))).toHaveLength(32);
    expect(() => parsePointOwnership(legacy(), `0x${'22'.repeat(20)}`)).toThrow();
    expect(() => parsePointOwnership(legacy(), 'invalid-address')).toThrow();
  });

  it('preserves a valid legacy account and allows existing V1/V2 formulas', () => {
    const value = parsePointOwnership(legacy(), owner);
    expect(canShowPoints(value, 1)).toBe(true);
    expect(canShowPoints(value, 2)).toBe(true);
  });

  it('retains observed aliases and exact old≤checkpoint/new>checkpoint separation', () => {
    const value = replacement();
    value.sources[0].account = encodeAddress(old, 69);
    value.sources[1].account = encodeAddress(owner, 69);
    const parsed = parsePointOwnership(value, encodeAddress(owner, 42));
    expect(parsed.sources).toEqual(value.sources);
    expect(canShowPoints(parsed, 1)).toBe(false);
    expect(canShowPoints(parsed, 2)).toBe(true);
  });

  it('allows the same active alias only in the two disjoint windows', () => {
    const value = replacement();
    value.status = 'active';
    value.sources[0].account = owner;
    expect(parsePointOwnership(value, owner).sources).toHaveLength(2);
    value.sources.push(value.sources[0]);
    expect(() => parsePointOwnership(value, owner)).toThrow();
  });

  it.each(['retired', 'extinguished'])('blocks %s even when the indexer is fully ready', (status) => {
    const parsed = parsePointOwnership({ ...replacement(), status, sources: [], referralRewardsCodec: '0' }, owner);
    expect(canShowPoints(parsed, 1)).toBe(false);
    expect(canShowPoints(parsed, 2)).toBe(false);
    expect(() => parsePointOwnership({ ...replacement(), status }, owner)).toThrow();
  });

  it('never enables incomplete ownership or missing endpoint data', async () => {
    const parsed = parsePointOwnership({ ...replacement(), ready: false, sources: [] }, owner);
    expect(canShowPoints(parsed, 2)).toBe(false);
    mocks.request.mockRejectedValueOnce(new Error('incomplete projection'));
    await expect(fetchPointOwnership(owner)).resolves.toBeNull();
    mocks.request.mockResolvedValueOnce(undefined);
    await expect(fetchPointOwnership(owner)).resolves.toBeNull();
  });

  it.each([
    'identity',
    'fork',
    'policy',
    'ready-type',
    'old-boundary',
    'new-boundary',
    'destination-history',
    'duplicate',
    'bound',
  ])('rejects contradictory %s evidence', (kind) => {
    const value: any = replacement();
    if (kind === 'identity') value.accountId = old;
    if (kind === 'fork') value.checkpointHash = policy;
    if (kind === 'policy') value.policyHash = 'asserted';
    if (kind === 'ready-type') value.ready = 'true';
    if (kind === 'old-boundary') value.sources[0].lastBlock += 1;
    if (kind === 'new-boundary') value.sources[1].firstBlock -= 1;
    if (kind === 'destination-history') value.sources[0].account = owner;
    if (kind === 'duplicate') value.sources.push(value.sources[0]);
    if (kind === 'bound') value.sources = Array.from({ length: 17 }, () => value.sources[0]);
    expect(() => parsePointOwnership(value, owner)).toThrow();
  });

  it('binds projected V2 metadata to the same explorer, account and recovery policy', async () => {
    const metadata = {
      accountId: owner,
      recoveryPolicyHash: policy,
      createdAt: { timestamp: 1234, block: 567 },
      points: [],
    };
    const captured = mocks.indexer;
    mocks.request.mockImplementation(async () => {
      mocks.indexer = { services: { explorer: { request: vi.fn() } } };
      return { data: replacement() };
    });
    mocks.meta.mockResolvedValue(metadata);
    const result = await fetchOwnedPointMetadata(owner);
    expect(result).toMatchObject(metadata);
    expect(result?.recoveryReferralRewards?.toString()).toBe('123');
    expect(mocks.meta).toHaveBeenCalledWith(owner, captured);
  });

  it.each(['retired', 'extinguished', 'incomplete', 'missing'])(
    'does not fetch metadata for %s ownership',
    async (kind) => {
      mocks.request.mockResolvedValue({
        data:
          kind === 'missing'
            ? null
            : {
                ...replacement(),
                status: kind === 'incomplete' ? 'replacement' : kind,
                ready: kind !== 'incomplete',
                sources: [],
                referralRewardsCodec: '0',
              },
      });
      await expect(fetchOwnedPointMetadata(owner)).resolves.toBeNull();
      expect(mocks.meta).not.toHaveBeenCalled();
    }
  );

  it.each(['policy', 'owner', 'missing-policy', 'missing-meta'])(
    'rejects %s in projected metadata without legacy fallback',
    async (kind) => {
      mocks.request.mockResolvedValue({ data: replacement() });
      const metadata: any = {
        accountId: owner,
        recoveryPolicyHash: policy,
        createdAt: { timestamp: 123, block: 1 },
        points: [],
      };
      if (kind === 'policy') metadata.recoveryPolicyHash = `0x${'44'.repeat(32)}`;
      if (kind === 'owner') metadata.accountId = old;
      if (kind === 'missing-policy') delete metadata.recoveryPolicyHash;
      mocks.meta.mockResolvedValue(kind === 'missing-meta' ? null : metadata);
      await expect(fetchOwnedPointMetadata(owner)).resolves.toBeNull();
      expect(mocks.meta).toHaveBeenCalledTimes(1);
    }
  );
  it.each([undefined, null, '-1', '1.5', '01', '1e18', '9'.repeat(81)])(
    'rejects missing/noncanonical referral basis %j',
    (amount) => {
      expect(() => parsePointOwnership({ ...replacement(), referralRewardsCodec: amount }, owner)).toThrow();
    }
  );

  it('leaves legacy referral scoring on its existing query path', async () => {
    mocks.recovery = false;
    mocks.request.mockResolvedValue({ data: legacy() });
    const metadata = { accountId: owner, recoveryPolicyHash: null, createdAt: { timestamp: 1, block: 1 }, points: [] };
    mocks.meta.mockResolvedValue(metadata);
    await expect(fetchOwnedPointMetadata(owner)).resolves.toBe(metadata);
    expect(metadata).not.toHaveProperty('recoveryReferralRewards');
  });
});

vi.mock('@/indexer/queries/capabilities', () => ({
  requireEntitlements: async (indexer = mocks.indexer) => ({
    indexer,
    capabilities: mocks.recovery ? { mode: 'full-recovery', policyHash: policy } : { mode: 'legacy', policyHash: null },
  }),
}));
