import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import {
  buildBreakdown,
  buildRewardSources,
  buildUnlocked,
  buildVesting,
  formatPercent,
  formatShare,
  getFeePercent,
  getFiatValue,
  sumByAsset,
  toWholePercent,
  type RewardAmount,
  type RewardsSnapshot,
} from '@/features/rewards/utils/analytics';

const PSWAP = { address: '0xpswap', symbol: 'PSWAP', decimals: 18 } as never;
const VAL = { address: '0xval', symbol: 'VAL', decimals: 18 } as never;
const XOR = { address: '0xxor', symbol: 'XOR', decimals: 18 } as never;

const codec = (value: number | string): string => new FPNumber(value).toCodecString();
const amount = (asset: unknown, value: number | string): RewardAmount => ({
  asset: asset as never,
  amount: new FPNumber(value),
});
const price = (value: number | string): string => codec(value);

const emptySnapshot = (): RewardsSnapshot => ({
  internal: null,
  vested: null,
  vestedAsset: PSWAP,
  crowdloan: {},
  external: [],
  selectedInternal: false,
  selectedVested: false,
  selectedCrowdloanTags: [],
  selectedExternal: false,
});

describe('sumByAsset', () => {
  it('adds amounts of the same asset, keeps first-seen order and drops zeros', () => {
    const result = sumByAsset([amount(PSWAP, 1.5), amount(VAL, 0), amount(PSWAP, '2.25'), amount(XOR, 3)]);

    expect(result.map(({ asset, amount }) => [(asset as { symbol: string }).symbol, amount.toString()])).toEqual([
      ['PSWAP', '3.75'],
      ['XOR', '3'],
    ]);
  });

  it('ignores entries whose asset could not be resolved', () => {
    expect(sumByAsset([{ asset: {} as never, amount: new FPNumber(5) }])).toEqual([]);
  });
});

describe('getFiatValue', () => {
  it('multiplies amounts by their price with exact fixed-point math', () => {
    const result = getFiatValue([amount(PSWAP, '0.1'), amount(PSWAP, '0.2')], { '0xpswap': price('0.5') });

    expect(result.complete).toBe(true);
    expect(result.value.toString()).toBe('0.15');
  });

  it('marks the result incomplete when a price is missing', () => {
    const result = getFiatValue([amount(PSWAP, 10), amount(VAL, 4)], { '0xpswap': price(2) });

    expect(result.complete).toBe(false);
    expect(result.value.toString()).toBe('20');
  });

  it('treats an empty list as a complete zero', () => {
    const result = getFiatValue([], {});

    expect(result.complete).toBe(true);
    expect(result.value.isZero()).toBe(true);
  });
});

describe('buildRewardSources', () => {
  it('maps every store source and keeps the fixed color order', () => {
    const sources = buildRewardSources({
      internal: { type: ['Provision', 'LiquidityProvision'], asset: PSWAP, amount: codec(10) } as never,
      vested: { limit: codec(30), total: codec(100), rewards: [] },
      vestedAsset: PSWAP,
      crowdloan: {
        Tag: [{ type: ['Crowdloan', 'Tag'], asset: VAL, amount: codec(4), total: codec(10) } as never],
      },
      external: [{ type: ['External', 'XorErc20'], asset: VAL, amount: codec(2) } as never],
      selectedInternal: true,
      selectedVested: false,
      selectedCrowdloanTags: ['Tag'],
      selectedExternal: true,
    });

    expect(sources.map(({ id }) => id)).toEqual(['liquidity', 'strategic', 'crowdloan', 'external']);

    const strategic = sources.find(({ id }) => id === 'strategic');
    expect(strategic?.claimable[0].amount.toString()).toBe('30');
    expect(strategic?.locked[0].amount.toString()).toBe('70');
    expect(strategic?.selected).toBe(false);

    const crowdloan = sources.find(({ id }) => id === 'crowdloan');
    expect(crowdloan?.claimable[0].amount.toString()).toBe('4');
    expect(crowdloan?.locked[0].amount.toString()).toBe('6');
    expect(crowdloan?.selected).toBe(true);
  });

  it('leaves out sources with nothing earned', () => {
    const sources = buildRewardSources({
      ...emptySnapshot(),
      internal: { type: ['Provision', 'LiquidityProvision'], asset: PSWAP, amount: codec(0) } as never,
      vested: { limit: codec(0), total: codec(0), rewards: [] },
    });

    expect(sources).toEqual([]);
  });

  it('never reports negative locked amounts when the total is below the limit', () => {
    const [strategic] = buildRewardSources({
      ...emptySnapshot(),
      vested: { limit: codec(8), total: codec(5), rewards: [] },
    });

    expect(strategic.claimable[0].amount.toString()).toBe('8');
    expect(strategic.locked).toEqual([]);
  });

  it('skips crowdloan items whose asset is unknown', () => {
    const sources = buildRewardSources({
      ...emptySnapshot(),
      crowdloan: { Tag: [{ type: ['Crowdloan', 'Tag'], asset: {}, amount: codec(4), total: codec(10) } as never] },
    });

    expect(sources).toEqual([]);
  });
});

describe('buildBreakdown', () => {
  const sources = (): ReturnType<typeof buildRewardSources> =>
    buildRewardSources({
      ...emptySnapshot(),
      internal: { type: ['Provision', 'LiquidityProvision'], asset: PSWAP, amount: codec(75) } as never,
      external: [{ type: ['External', 'XorErc20'], asset: VAL, amount: codec(25) } as never],
      selectedInternal: true,
    });

  it('uses fiat shares when every token has a price', () => {
    const breakdown = buildBreakdown(sources(), { '0xpswap': price(1), '0xval': price(1) });

    expect(breakdown.basis).toBe('fiat');
    expect(breakdown.segments.map(({ id, share }) => [id, share])).toEqual([
      ['liquidity', 0.75],
      ['external', 0.25],
    ]);
    expect(breakdown.totalFiat?.toString()).toBe('100');
    expect(breakdown.hasUnpriced).toBe(false);
    expect(breakdown.segments[0].selected).toBe(true);
    expect(breakdown.segments[1].selected).toBe(false);
  });

  it('weighs different tokens by value, not by token count', () => {
    const breakdown = buildBreakdown(sources(), { '0xpswap': price(1), '0xval': price(9) });

    expect(breakdown.segments.map(({ share }) => share)).toEqual([0.25, 0.75]);
  });

  it('falls back to token units when only one token is involved and prices are missing', () => {
    const onlyPswap = buildRewardSources({
      ...emptySnapshot(),
      internal: { type: ['Provision', 'LiquidityProvision'], asset: PSWAP, amount: codec(30) } as never,
      vested: { limit: codec(10), total: codec(10), rewards: [] },
    });
    const breakdown = buildBreakdown(onlyPswap, {});

    expect(breakdown.basis).toBe('amount');
    expect(breakdown.totalFiat).toBeNull();
    expect(breakdown.segments.map(({ share }) => share)).toEqual([0.75, 0.25]);
  });

  it('keeps unpriced segments out of the bar and reports them', () => {
    const breakdown = buildBreakdown(sources(), { '0xpswap': price(2) });

    expect(breakdown.basis).toBe('fiat');
    expect(breakdown.segments.map(({ id, share }) => [id, share])).toEqual([
      ['liquidity', 1],
      ['external', 0],
    ]);
    expect(breakdown.hasUnpriced).toBe(true);
    expect(breakdown.segments[1].fiat).toBeNull();
  });

  it('has nothing to draw when no mix of tokens can be priced', () => {
    const breakdown = buildBreakdown(sources(), {});

    expect(breakdown.basis).toBe('none');
    expect(breakdown.segments.every(({ share }) => share === 0)).toBe(true);
    expect(breakdown.totalFiat).toBeNull();
  });

  it('is empty without rewards', () => {
    expect(buildBreakdown([], {})).toEqual({ basis: 'none', segments: [], totalFiat: null, hasUnpriced: false });
  });
});

describe('buildBreakdown with a partly ticked crowdloan', () => {
  // Crowdloan rewards are ticked tag by tag, so a claim can pay only part of the source.
  const crowdloan = {
    A: [{ type: ['Crowdloan', 'A'], asset: PSWAP, amount: codec(30), total: codec(30) } as never],
    B: [{ type: ['Crowdloan', 'B'], asset: PSWAP, amount: codec(70), total: codec(70) } as never],
  };
  const prices = { '0xpswap': price(1) };
  const sourcesFor = (selectedCrowdloanTags: string[]) =>
    buildRewardSources({ ...emptySnapshot(), crowdloan, selectedCrowdloanTags });

  it('shows what the claim pays: only the ticked tags', () => {
    const [segment] = buildBreakdown(sourcesFor(['A']), prices).segments;

    expect(segment.selected).toBe(true);
    expect(segment.amounts[0].amount.toString()).toBe('30');
    expect(segment.fiat?.toString()).toBe('30');
  });

  it('shows everything when every tag is ticked', () => {
    const [segment] = buildBreakdown(sourcesFor(['A', 'B']), prices).segments;

    expect(segment.selected).toBe(true);
    expect(segment.amounts[0].amount.toString()).toBe('100');
  });

  it('keeps the full value, flagged as skipped, when no tag is ticked', () => {
    const [segment] = buildBreakdown(sourcesFor([]), prices).segments;

    expect(segment.selected).toBe(false);
    expect(segment.amounts[0].amount.toString()).toBe('100');
    expect(segment.fiat?.toString()).toBe('100');
  });

  it('ignores a tag that is no longer in the rewards', () => {
    const [source] = sourcesFor(['Gone']);

    expect(source.selected).toBe(false);
  });

  it('does not let the ticks change what is claimable or locked', () => {
    const [partly] = sourcesFor(['A']);
    const [none] = sourcesFor([]);

    expect(partly.claimable[0].amount.toString()).toBe('100');
    expect(none.claimable[0].amount.toString()).toBe('100');
  });
});

describe('buildVesting and buildUnlocked', () => {
  const snapshot = (): RewardsSnapshot => ({
    ...emptySnapshot(),
    internal: { type: ['Provision', 'LiquidityProvision'], asset: PSWAP, amount: codec(100) } as never,
    vested: { limit: codec(25), total: codec(100), rewards: [] },
    crowdloan: {
      Tag: [{ type: ['Crowdloan', 'Tag'], asset: VAL, amount: codec(10), total: codec(10) } as never],
    },
  });

  it('reports the unlocked fraction per vesting source and overall', () => {
    const vesting = buildVesting(buildRewardSources(snapshot()), { '0xpswap': price(1), '0xval': price(1) });

    expect(vesting.rows.map(({ id, unlocked }) => [id, unlocked])).toEqual([
      ['strategic', 0.25],
      ['crowdloan', 1],
    ]);
    expect(vesting.unlocked).toBeCloseTo(35 / 110, 3);
    expect(vesting.fullyUnlocked).toBe(false);
  });

  it('does not count liquidity or external rewards as vesting', () => {
    const vesting = buildVesting(
      buildRewardSources({
        ...emptySnapshot(),
        internal: { type: ['Provision', 'LiquidityProvision'], asset: PSWAP, amount: codec(5) } as never,
      }),
      {}
    );

    expect(vesting).toEqual({ rows: [], unlocked: null, fullyUnlocked: false });
  });

  it('recognises vesting rewards that are fully unlocked', () => {
    const vesting = buildVesting(
      buildRewardSources({ ...emptySnapshot(), vested: { limit: codec(7), total: codec(7), rewards: [] } }),
      {}
    );

    expect(vesting.fullyUnlocked).toBe(true);
    expect(vesting.unlocked).toBe(1);
  });

  it('leaves the fraction empty when different tokens cannot be priced', () => {
    const vesting = buildVesting(buildRewardSources(snapshot()), { '0xpswap': price(1) });

    expect(vesting.rows[0].unlocked).toBe(0.25);
    expect(vesting.rows[1].unlocked).toBe(1);
    expect(vesting.unlocked).toBeNull();
  });

  it('measures the share of everything earned that can be claimed now', () => {
    const unlocked = buildUnlocked(buildRewardSources(snapshot()), { '0xpswap': price(2), '0xval': price(2) });

    // claimable 100 + 25 + 10 = 135, locked 75
    expect(unlocked.share).toBeCloseTo(135 / 210, 3);
    expect(unlocked.lockedFiat?.toString()).toBe('150');
  });

  it('has no locked value when a locked token has no price', () => {
    const unlocked = buildUnlocked(buildRewardSources(snapshot()), {});

    expect(unlocked.lockedFiat).toBeNull();
  });

  it('is empty without sources', () => {
    expect(buildUnlocked([], {})).toEqual({ share: null, lockedFiat: null });
  });

  it('is 100% when nothing is locked, whether or not every token has a price', () => {
    const sources = buildRewardSources({
      ...emptySnapshot(),
      vested: { limit: codec(5), total: codec(5), rewards: [] },
      crowdloan: {
        Tag: [{ type: ['Crowdloan', 'Tag'], asset: VAL, amount: codec(2), total: codec(2) } as never],
      },
    });

    // Only PSWAP has a price, but with nothing locked no price is needed to know everything can be claimed.
    expect(buildUnlocked(sources, { '0xpswap': price(1) }).share).toBe(1);
    expect(buildVesting(sources, { '0xpswap': price(1) }).unlocked).toBe(1);
    expect(buildVesting(sources, { '0xpswap': price(1) }).rows.map(({ unlocked }) => unlocked)).toEqual([1, 1]);
  });

  it('is 0% when everything is still locked', () => {
    const sources = buildRewardSources({
      ...emptySnapshot(),
      vested: { limit: codec(0), total: codec(40), rewards: [] },
    });

    expect(buildUnlocked(sources, {}).share).toBe(0);
    expect(buildVesting(sources, {}).rows[0].unlocked).toBe(0);
  });
});

describe('getFeePercent', () => {
  it('compares the fee to the claim in fiat', () => {
    const percent = getFeePercent(codec('0.0007'), XOR, new FPNumber(70), { '0xxor': price(1) });

    expect(percent?.toString()).toBe('0.001');
  });

  it('returns null when a value or price is missing', () => {
    expect(getFeePercent('', XOR, new FPNumber(1), { '0xxor': price(1) })).toBeNull();
    expect(getFeePercent(codec(1), XOR, new FPNumber(0), { '0xxor': price(1) })).toBeNull();
    expect(getFeePercent(codec(1), XOR, null, { '0xxor': price(1) })).toBeNull();
    expect(getFeePercent(codec(1), XOR, new FPNumber(1), {})).toBeNull();
    expect(getFeePercent(codec(1), null, new FPNumber(1), { '0xxor': price(1) })).toBeNull();
  });
});

describe('formatting', () => {
  it('formats shares as whole percents', () => {
    expect(formatShare(0.5)).toBe('50%');
    expect(formatShare(1)).toBe('100%');
    // Short of everything never reads 100%.
    expect(formatShare(0.996)).toBe('99%');
    expect(formatShare(0.9999)).toBe('99%');
    expect(formatShare(0.004)).toBe('<1%');
    expect(formatShare(0)).toBe('0%');
    expect(formatShare(null)).toBe('–');
    expect(formatShare(Number.NaN)).toBe('–');
  });

  it('rounds a share to a whole percent without claiming 100 early', () => {
    expect(toWholePercent(0.5)).toBe(50);
    expect(toWholePercent(0.004)).toBe(0);
    expect(toWholePercent(0.995)).toBe(99);
    expect(toWholePercent(1)).toBe(100);
    expect(toWholePercent(1.5)).toBe(100);
    expect(toWholePercent(-1)).toBe(0);
  });

  it('formats fee percentages with two decimals and a floor', () => {
    expect(formatPercent(new FPNumber('0.5'))).toBe('0.5%');
    expect(formatPercent(new FPNumber('0.004'))).toBe('<0.01%');
    expect(formatPercent(new FPNumber(0))).toBe('0%');
  });
});
