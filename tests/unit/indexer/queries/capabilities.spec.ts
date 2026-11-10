import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APPROVED_RECOVERY_POLICY,
  RECOVERY_MAINNET_GENESIS,
  parseEntitlementCapabilities,
  requireEntitlements,
  requireEndpointEntitlements,
} from '@/indexer/queries/capabilities';
const mocks = vi.hoisted(() => ({ request: vi.fn(), capture: vi.fn(), indexer: null as any }));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: { connection: null } }));
vi.mock('@/lib/soraneo-wallet/src/services/indexer', () => ({ getCurrentIndexer: () => mocks.indexer }));
const admitted = () => ({
  schemaVersion: 1,
  mode: 'full-recovery',
  genesisHash: RECOVERY_MAINNET_GENESIS,
  policyHash: APPROVED_RECOVERY_POLICY,
  statsReady: true,
  historyReady: true,
  currentViewsReady: true,
  entitlementsReady: true,
  indexedBlock: 28194043,
  indexedBlockHash: '0x' + '11'.repeat(32),
  reason: null,
});
beforeEach(() => {
  vi.resetAllMocks();
  mocks.indexer = { services: { explorer: { captureNetworkOnly: mocks.capture } } };
  mocks.capture.mockReturnValue({ request: mocks.request });
});
describe('fresh entitlement capabilities', () => {
  it('admits only an explicit certified full-recovery fixture on mainnet', () =>
    expect(parseEntitlementCapabilities(admitted())).toMatchObject({ entitlementsReady: true }));
  it.each([
    null,
    {},
    { ...admitted(), entitlementsReady: false },
    { ...admitted(), mode: 'canonical-stats-history' },
    { ...admitted(), mode: 'legacy', policyHash: null },
    { ...admitted(), policyHash: '0x' + '22'.repeat(32) },
    { ...admitted(), genesisHash: '0x' + '22'.repeat(32) },
    { ...admitted(), indexedBlock: null, indexedBlockHash: null },
    { ...admitted(), indexedBlock: 28194042 },
    { ...admitted(), statsReady: undefined },
    { ...admitted(), reason: {} },
    { ...admitted(), indexedBlockHash: undefined },
    { ...admitted(), indexedBlockHash: '0x' + '00'.repeat(32) },
  ])('rejects blocked, unknown or malformed capability %j', (value) =>
    expect(() => parseEntitlementCapabilities(value)).toThrow()
  );
  it('allows explicit legacy testnet only when its connected genesis matches', () => {
    const genesis = '0x' + '33'.repeat(32);
    const row = { ...admitted(), mode: 'legacy', genesisHash: genesis, policyHash: null, indexedBlock: 100 };
    expect(parseEntitlementCapabilities(row, genesis).mode).toBe('legacy');
    expect(() => parseEntitlementCapabilities(row)).toThrow();
  });
  it('rechecks network capability instead of reusing an earlier positive answer', async () => {
    mocks.request
      .mockResolvedValueOnce({ indexerCapabilities: admitted() })
      .mockResolvedValueOnce({ indexerCapabilities: { ...admitted(), entitlementsReady: false } });
    await expect(requireEntitlements()).resolves.toHaveProperty('indexer.services.explorer');
    await expect(requireEntitlements()).rejects.toThrow();
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });
  it('uses exactly the captured explorer for the protected operation', async () => {
    mocks.request.mockResolvedValue({ indexerCapabilities: admitted() });
    const result = await requireEntitlements();
    expect(result.indexer.services.explorer.request).toBe(mocks.request);
    expect(mocks.capture).toHaveBeenCalledOnce();
  });
  it('fails when the client cannot capture a network-only session', async () => {
    mocks.capture.mockImplementation(() => {
      throw Error('changed');
    });
    await expect(requireEntitlements()).rejects.toThrow();
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it('HTTP partial errors never authorize a snapshot despite positive data', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { indexerCapabilities: admitted() }, errors: [{ message: 'partial' }] }),
    });
    vi.stubGlobal('fetch', fetch);
    await expect(requireEndpointEntitlements('https://approved.test/graphql')).rejects.toThrow();
    expect(fetch).toHaveBeenCalledWith(
      'https://approved.test/graphql',
      expect.objectContaining({ cache: 'no-store', credentials: 'omit' })
    );
    vi.unstubAllGlobals();
  });
});
