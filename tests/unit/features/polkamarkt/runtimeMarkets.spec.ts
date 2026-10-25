import { describe, expect, it, vi } from 'vitest';

vi.mock('@polkadot/api', () => ({ ApiPromise: { create: vi.fn() }, WsProvider: vi.fn() }));

import {
  fetchRuntimePolkamarktMarkets,
  mergePolkamarktMarkets,
  parseRuntimePolkamarktMarket,
} from '@/features/polkamarkt/services/runtimeMarkets';

import type { PolkamarktMarket } from '@/features/polkamarkt/types';

const UNIT = 10n ** 18n;
const runtimeEntry = { conditionId: 1, mechanism: 'DynamicPariMutuel', status: 'Open' };

/** Creates exact chain storage amounts without any external provider. */
const runtimeStorage = (yes = 0n, no = 0n) => ({
  conditions: vi.fn().mockResolvedValue({ question: 'Will the market close with a YES outcome?' }),
  marketPositionTotals: vi.fn().mockResolvedValue({ totalYesShares: yes.toString(), totalNoShares: no.toString() }),
  marketDpmCollateral: vi.fn().mockResolvedValue((50n * UNIT).toString()),
  marketVolume: vi.fn().mockResolvedValue((25n * UNIT).toString()),
});

/** Supplies the required display fields for merge-only regression cases. */
const market = (overrides: Partial<PolkamarktMarket> = {}): PolkamarktMarket => ({
  id: 'indexed-1',
  chainId: 1,
  title: 'Indexed market question',
  category: 'Crypto',
  description: 'Indexed description',
  liquidity: 100,
  volume: 50,
  mechanism: 'DynamicPariMutuel',
  ...overrides,
});

describe('Polkamarkt runtime probability', () => {
  it('starts an untraded DPM market at 50/50 using the runtime virtual depth', async () => {
    const result = await parseRuntimePolkamarktMarket(runtimeStorage(), 1, runtimeEntry);

    expect(result).toMatchObject({
      probability: 50,
      impliedYesProbabilityBps: 5000,
      impliedNoProbabilityBps: 5000,
      virtualDepth: 100,
      realYesShares: 0,
      realNoShares: 0,
    });
  });

  it('includes virtual shares and floors both basis-point ratios exactly after a one-sided trade', async () => {
    const result = await parseRuntimePolkamarktMarket(runtimeStorage(0n, UNIT), 1, runtimeEntry);

    expect(result).toMatchObject({
      probability: 49.75,
      impliedYesProbabilityBps: 4975,
      impliedNoProbabilityBps: 5024,
    });
  });

  it.each([
    { name: 'BTC', yes: 62_930_928_450_000_000_000n, no: 9_210_373_220_000_000_000n, bps: 5986 },
    { name: 'Senate', yes: 0n, no: 39_046_314_100_000_000_000n, bps: 4183 },
  ])('reproduces the live $name market quote from exact share amounts', async ({ yes, no, bps }) => {
    const result = await parseRuntimePolkamarktMarket(runtimeStorage(yes, no), 1, runtimeEntry);

    expect(result?.impliedYesProbabilityBps).toBe(bps);
    expect(result?.probability).toBe(bps / 100);
  });

  it('retains a one-base-unit difference at a basis-point flooring boundary', async () => {
    const result = await parseRuntimePolkamarktMarket(runtimeStorage(0n, 1n), 1, runtimeEntry);

    expect(result).toMatchObject({ probability: 49.99, impliedYesProbabilityBps: 4999, impliedNoProbabilityBps: 5000 });
  });

  it('preserves zero RPC shares and collateral instead of using older nonzero storage values', async () => {
    const storage = runtimeStorage(1000n * UNIT, 3n * UNIT);
    const rpc = {
      marketState: vi.fn().mockResolvedValue({ realYesShares: '0', realNoShares: UNIT.toString(), dpmCollateral: '0' }),
    };

    const result = await parseRuntimePolkamarktMarket(storage, 1, runtimeEntry, rpc);

    expect(result).toMatchObject({
      probability: 49.75,
      realYesShares: 0,
      realNoShares: 1,
      liquidity: 0,
      dpmCollateral: 0,
    });
    expect(storage.marketDpmCollateral).not.toHaveBeenCalled();
  });

  it('keeps authoritative zero RPC odds ahead of the virtual-share fallback', async () => {
    const rpc = {
      marketState: vi.fn().mockResolvedValue({ impliedYesProbabilityBps: 0, impliedNoProbabilityBps: 10_000 }),
    };

    const result = await parseRuntimePolkamarktMarket(runtimeStorage(), 1, runtimeEntry, rpc);

    expect(result).toMatchObject({ probability: 0, impliedYesProbabilityBps: 0, impliedNoProbabilityBps: 10_000 });
  });

  it('uses RPC virtual depth before the chain constant or compatibility default', async () => {
    const rpc = { marketState: vi.fn().mockResolvedValue({ virtualDepth: (2n * UNIT).toString() }) };

    const result = await parseRuntimePolkamarktMarket(runtimeStorage(0n, UNIT), 1, runtimeEntry, rpc, 20n * UNIT);

    expect(result).toMatchObject({ probability: 40, virtualDepth: 2, impliedYesProbabilityBps: 4000 });
  });

  it('reads a changed DPM virtual-share constant from the connected runtime', async () => {
    const api = {
      query: {
        polkamarkt: {
          ...runtimeStorage(0n, UNIT),
          markets: { entries: vi.fn().mockResolvedValue([[{ args: [1] }, runtimeEntry]]) },
        },
      },
      consts: { polkamarkt: { dpmVirtualShares: 20n * UNIT } },
    };

    const result = await fetchRuntimePolkamarktMarkets(
      api as unknown as Parameters<typeof fetchRuntimePolkamarktMarkets>[0]
    );

    expect(result).toMatchObject([{ probability: 48.78, virtualDepth: 20, impliedYesProbabilityBps: 4878 }]);
  });

  it('does not invent DPM probabilities when share storage is unavailable or the mechanism is legacy', async () => {
    const storage = runtimeStorage();
    storage.marketPositionTotals.mockResolvedValue({});

    const missingShares = await parseRuntimePolkamarktMarket(storage, 1, runtimeEntry);
    const legacy = await parseRuntimePolkamarktMarket(runtimeStorage(0n, UNIT), 1, {
      ...runtimeEntry,
      mechanism: 'MigratedLegacy',
    });

    expect(missingShares?.probability).toBeUndefined();
    expect(legacy?.probability).toBeUndefined();
  });
});

describe('Polkamarkt runtime quote merging', () => {
  it('replaces stale indexed quotes while preserving indexed identity, metadata, and resolution evidence', () => {
    const indexed = market({
      probability: 0,
      impliedYesProbabilityBps: 0,
      impliedNoProbabilityBps: 10_000,
      resolutionOutcome: 'Yes',
      resolutionEvidenceUri: 'https://example.test/evidence',
    });
    const runtime = market({
      id: '1',
      title: 'Chain question',
      description: 'Chain description',
      probability: 49.75,
      impliedYesProbabilityBps: 4975,
      impliedNoProbabilityBps: 5024,
      realYesShares: 0,
      realNoShares: 1,
    });

    expect(mergePolkamarktMarkets([indexed], [runtime])).toMatchObject([
      {
        id: 'indexed-1',
        title: 'Indexed market question',
        description: 'Indexed description',
        probability: 49.75,
        impliedYesProbabilityBps: 4975,
        impliedNoProbabilityBps: 5024,
        realYesShares: 0,
        realNoShares: 1,
        resolutionOutcome: 'Yes',
        resolutionEvidenceUri: 'https://example.test/evidence',
      },
    ]);
  });

  it('clears stale basis-point fields when a runtime probability replaces a prior quote', () => {
    const indexed = market({
      probability: 75,
      impliedYesProbabilityBps: 7500,
      impliedNoProbabilityBps: 2500,
      marginalYesPriceBps: 9000,
      marginalNoPriceBps: 3000,
    });
    const [merged] = mergePolkamarktMarkets([indexed], [market({ probability: 0 })]);

    expect(merged.probability).toBe(0);
    expect(merged.impliedYesProbabilityBps).toBeUndefined();
    expect(merged.impliedNoProbabilityBps).toBeUndefined();
    expect(merged.marginalYesPriceBps).toBeUndefined();
    expect(merged.marginalNoPriceBps).toBeUndefined();
  });

  it('retains the indexed quote when the runtime cannot supply one', () => {
    const indexed = market({ probability: 62, impliedYesProbabilityBps: 6200, impliedNoProbabilityBps: 3800 });
    const [merged] = mergePolkamarktMarkets([indexed], [market()]);

    expect(merged).toMatchObject({ probability: 62, impliedYesProbabilityBps: 6200, impliedNoProbabilityBps: 3800 });
  });
});
