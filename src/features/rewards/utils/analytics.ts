import { FPNumber } from '@sora-substrate/sdk';

import { getFiatPriceByAddress, type FiatPriceObjectLike } from '@/utils/fiatPrice';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/sdk/build/rewards/types';

/**
 * Pure helpers behind the rewards dashboard: they turn the rewards store state into the numbers the charts draw.
 *
 * Token amounts always stay `FPNumber`. Plain numbers appear only for chart geometry (bar and meter fill, 0–1),
 * never for anything the user is asked to sign or sees as an amount.
 */

/** Reward sources in the fixed order that gives each one its chart color. Color follows the source, not its rank. */
export const REWARD_SOURCE_IDS = ['liquidity', 'strategic', 'crowdloan', 'external'] as const;

/** Identifier of one of the four reward sources. */
export type RewardSourceId = (typeof REWARD_SOURCE_IDS)[number];

/** Sources that unlock over time, so part of their total can still be locked. */
export const VESTING_SOURCE_IDS = ['strategic', 'crowdloan'] as const;

/** Identifier of a source that vests. */
export type VestingSourceId = (typeof VESTING_SOURCE_IDS)[number];

/** How shares are measured: converted to fiat, in token units (a single token), or not at all. */
export type ShareBasis = 'fiat' | 'amount' | 'none';

/** An amount of one reward token. */
export interface RewardAmount {
  asset: Asset;
  /** Natural (human readable) amount. */
  amount: FPNumber;
}

/** One reward source with what can be claimed now and what is still locked. */
export interface RewardSource {
  id: RewardSourceId;
  /** The source is ticked for the next claim. */
  selected: boolean;
  /** Amounts that can be claimed now, one entry per asset. */
  claimable: RewardAmount[];
  /** Amounts that are earned but still vesting, one entry per asset. */
  locked: RewardAmount[];
  /**
   * What the next claim pays from this source when only part of it is ticked. Only crowdloan rewards are ticked tag by
   * tag, so only they set it; every other source is claimed whole.
   */
  inClaim?: RewardAmount[];
}

/** Everything the rewards store knows, in the shapes the SDK returns. */
export interface RewardsSnapshot {
  internal: Nullable<RewardInfo>;
  vested: Nullable<RewardsInfo>;
  /** Asset that the vested `limit` and `total` are denominated in (PSWAP). */
  vestedAsset: Asset;
  crowdloan: Record<string, RewardInfo[]>;
  external: RewardInfo[];
  selectedInternal: boolean;
  selectedVested: boolean;
  selectedCrowdloanTags: string[];
  selectedExternal: boolean;
}

/** One source in the stacked bar: its amounts, their value and the width it gets. */
export interface BreakdownSegment {
  id: RewardSourceId;
  selected: boolean;
  amounts: RewardAmount[];
  /** Claimable value in fiat, or null when a price is missing. */
  fiat: FPNumber | null;
  /** Fraction of the bar, 0–1. Segments without a usable price get 0. */
  share: number;
}

/** The "by source" card: segments in fixed source order plus how their shares were measured. */
export interface RewardsBreakdown {
  basis: ShareBasis;
  segments: BreakdownSegment[];
  /** Total fiat value of the priced segments, or null when nothing is priced. */
  totalFiat: FPNumber | null;
  /** At least one segment could not be priced and is missing from the bar. */
  hasUnpriced: boolean;
}

/** Vesting state of one source. */
export interface VestingRow {
  id: VestingSourceId;
  claimable: RewardAmount[];
  locked: RewardAmount[];
  /** Fraction of this source that can be claimed now, 0–1. Null when its tokens cannot be compared. */
  unlocked: number | null;
}

/** The vesting card: one row per vesting source and the overall unlocked fraction. */
export interface RewardsVesting {
  rows: VestingRow[];
  /** Fraction unlocked across all rows, 0–1, or null when it cannot be measured. */
  unlocked: number | null;
  /** Vesting rewards exist and none of them is still locked. */
  fullyUnlocked: boolean;
}

/** What the hero tiles show: how much of everything earned is claimable now, and the value still locked. */
export interface RewardsUnlocked {
  /** Fraction of all earned rewards that can be claimed now, 0–1, or null when it cannot be measured. */
  share: number | null;
  /** Fiat value of everything still locked, or null when a price is missing. */
  lockedFiat: FPNumber | null;
}

interface FiatValue {
  value: FPNumber;
  /** Every non-zero amount had a price. */
  complete: boolean;
}

const VISUAL_PRECISION = 4;

const isUsableAsset = (asset: Nullable<Asset>): asset is Asset => Boolean(asset?.address);

const fromCodec = (value: Nullable<string>, asset: Asset): FPNumber =>
  FPNumber.fromCodecValue(value || '0', asset.decimals);

/** Adds up amounts of the same asset and drops zero entries, keeping first-seen order. */
export function sumByAsset(items: readonly RewardAmount[]): RewardAmount[] {
  const buffer = new Map<string, RewardAmount>();

  for (const { asset, amount } of items) {
    if (!isUsableAsset(asset)) continue;

    const previous = buffer.get(asset.address);
    buffer.set(asset.address, { asset, amount: previous ? previous.amount.add(amount) : amount });
  }

  return [...buffer.values()].filter(({ amount }) => amount.isGtZero());
}

/** Reads the fiat price of an asset from the wallet's price table. */
export function getAssetPrice(prices: Nullable<FiatPriceObjectLike>, asset: Nullable<Asset>): FPNumber | null {
  const raw = getFiatPriceByAddress(prices, asset?.address);

  if (!raw) return null;

  const price = FPNumber.fromCodecValue(raw);

  return price.isGtZero() ? price : null;
}

/** Converts amounts to fiat. Assets without a price add nothing and mark the result as incomplete. */
export function getFiatValue(amounts: readonly RewardAmount[], prices: Nullable<FiatPriceObjectLike>): FiatValue {
  let value = FPNumber.ZERO;
  let complete = true;

  for (const { asset, amount } of amounts) {
    if (!amount.isGtZero()) continue;

    const price = getAssetPrice(prices, asset);

    if (!price) {
      complete = false;
      continue;
    }

    value = value.add(amount.mul(price));
  }

  return { value, complete };
}

const sumAmounts = (amounts: readonly RewardAmount[]): FPNumber =>
  amounts.reduce((total, { amount }) => total.add(amount), FPNumber.ZERO);

const getAssetAddresses = (groups: ReadonlyArray<readonly RewardAmount[]>): Set<string> =>
  new Set(groups.flatMap((amounts) => amounts.map(({ asset }) => asset.address)));

/**
 * Picks the unit shares are measured in and returns one weight per group.
 * Fiat is preferred; a single token can be compared in its own units; groups that cannot be priced get a null weight.
 */
function resolveWeights(
  groups: ReadonlyArray<readonly RewardAmount[]>,
  prices: Nullable<FiatPriceObjectLike>
): { basis: ShareBasis; weights: Array<FPNumber | null> } {
  const fiat = groups.map((amounts) => getFiatValue(amounts, prices));

  if (fiat.every(({ complete }) => complete)) {
    return { basis: 'fiat', weights: fiat.map(({ value }) => value) };
  }

  if (getAssetAddresses(groups).size === 1) {
    return { basis: 'amount', weights: groups.map(sumAmounts) };
  }

  if (fiat.some(({ complete }) => complete)) {
    return { basis: 'fiat', weights: fiat.map(({ value, complete }) => (complete ? value : null)) };
  }

  return { basis: 'none', weights: groups.map(() => null) };
}

/** Divides two weights into a 0–1 fraction for drawing. Returns null when the whole is empty. */
function toFraction(part: FPNumber, whole: FPNumber): number | null {
  if (!whole.isGtZero()) return null;

  return Math.min(1, Math.max(0, part.div(whole).toNumber(VISUAL_PRECISION)));
}

const hasValue = (amounts: readonly RewardAmount[]): boolean => amounts.some(({ amount }) => amount.isGtZero());

/**
 * How much of `claimable + locked` can be claimed now, 0–1. When one side is empty the answer is 1 or 0 whatever the
 * tokens cost; otherwise both sides need a common unit. Null when that is not possible or nothing is there.
 */
function getUnlockedFraction(
  claimable: readonly RewardAmount[],
  locked: readonly RewardAmount[],
  prices: Nullable<FiatPriceObjectLike>
): number | null {
  const hasClaimable = hasValue(claimable);

  if (!hasValue(locked)) return hasClaimable ? 1 : null;
  if (!hasClaimable) return 0;

  const { basis, weights } = resolveWeights([claimable, locked], prices);
  const [claimableWeight, lockedWeight] = weights;

  if (basis === 'none' || !claimableWeight || !lockedWeight) return null;

  return toFraction(claimableWeight, claimableWeight.add(lockedWeight));
}

/** Turns the store snapshot into the four reward sources. Sources with nothing earned are left out. */
export function buildRewardSources(snapshot: RewardsSnapshot): RewardSource[] {
  const sources: RewardSource[] = [];

  const { internal } = snapshot;

  if (isUsableAsset(internal?.asset)) {
    const claimable = sumByAsset([{ asset: internal.asset, amount: fromCodec(internal.amount, internal.asset) }]);

    if (claimable.length) {
      sources.push({ id: 'liquidity', selected: snapshot.selectedInternal, claimable, locked: [] });
    }
  }

  const { vested, vestedAsset } = snapshot;

  if (vested && isUsableAsset(vestedAsset)) {
    const limit = fromCodec(vested.limit, vestedAsset);
    const total = fromCodec(vested.total, vestedAsset);
    const claimable = sumByAsset([{ asset: vestedAsset, amount: limit }]);
    const locked = sumByAsset([
      { asset: vestedAsset, amount: FPNumber.gt(total, limit) ? total.sub(limit) : FPNumber.ZERO },
    ]);

    if (claimable.length || locked.length) {
      sources.push({ id: 'strategic', selected: snapshot.selectedVested, claimable, locked });
    }
  }

  const selectedTags = new Set(snapshot.selectedCrowdloanTags);
  const crowdloanClaimable: RewardAmount[] = [];
  const crowdloanLocked: RewardAmount[] = [];
  const crowdloanInClaim: RewardAmount[] = [];
  let crowdloanSelected = false;

  for (const [tag, items] of Object.entries(snapshot.crowdloan ?? {})) {
    const ticked = selectedTags.has(tag);

    crowdloanSelected ||= ticked;

    for (const item of items ?? []) {
      if (!isUsableAsset(item?.asset)) continue;

      const amount = fromCodec(item.amount, item.asset);
      const total = fromCodec(item.total ?? item.amount, item.asset);

      crowdloanClaimable.push({ asset: item.asset, amount });
      crowdloanLocked.push({
        asset: item.asset,
        amount: FPNumber.gt(total, amount) ? total.sub(amount) : FPNumber.ZERO,
      });

      if (ticked) crowdloanInClaim.push({ asset: item.asset, amount });
    }
  }

  const claimableByAsset = sumByAsset(crowdloanClaimable);
  const lockedByAsset = sumByAsset(crowdloanLocked);

  if (claimableByAsset.length || lockedByAsset.length) {
    sources.push({
      id: 'crowdloan',
      selected: crowdloanSelected,
      claimable: claimableByAsset,
      locked: lockedByAsset,
      inClaim: sumByAsset(crowdloanInClaim),
    });
  }

  const externalAmounts: RewardAmount[] = [];

  for (const item of snapshot.external ?? []) {
    if (isUsableAsset(item?.asset)) {
      externalAmounts.push({ asset: item.asset, amount: fromCodec(item.amount, item.asset) });
    }
  }

  const external = sumByAsset(externalAmounts);

  if (external.length) {
    sources.push({ id: 'external', selected: snapshot.selectedExternal, claimable: external, locked: [] });
  }

  return REWARD_SOURCE_IDS.flatMap((id) => sources.filter((source) => source.id === id));
}

/**
 * Splits the claimable rewards into per-source shares for the stacked bar.
 *
 * A source that is part of the claim shows what the claim pays (for crowdloan rewards only the ticked tags); a source
 * that is not part of it keeps its full value, so the user can see what skipping it leaves behind.
 */
export function buildBreakdown(
  sources: readonly RewardSource[],
  prices: Nullable<FiatPriceObjectLike>
): RewardsBreakdown {
  const claimableSources = sources.filter(({ claimable }) => claimable.length > 0);

  if (!claimableSources.length) {
    return { basis: 'none', segments: [], totalFiat: null, hasUnpriced: false };
  }

  const shown = claimableSources.map((source) =>
    source.selected && source.inClaim?.length ? source.inClaim : source.claimable
  );
  const { basis, weights } = resolveWeights(shown, prices);
  const total = weights.reduce<FPNumber>((sum, weight) => (weight ? sum.add(weight) : sum), FPNumber.ZERO);
  const pricedFiat = shown.map((amounts) => getFiatValue(amounts, prices));

  const segments = claimableSources.map<BreakdownSegment>((source, index) => {
    const weight = weights[index];
    const fiat = pricedFiat[index];

    return {
      id: source.id,
      selected: source.selected,
      amounts: shown[index],
      fiat: fiat.complete ? fiat.value : null,
      share: weight ? (toFraction(weight, total) ?? 0) : 0,
    };
  });

  return {
    basis,
    segments,
    totalFiat: basis === 'fiat' ? total : null,
    hasUnpriced: segments.some((segment) => segment.share === 0 && segment.amounts.length > 0 && segment.fiat === null),
  };
}

/** Measures how much of the vesting sources (strategic and crowdloan) can be claimed now. */
export function buildVesting(sources: readonly RewardSource[], prices: Nullable<FiatPriceObjectLike>): RewardsVesting {
  const vestingSources = sources.filter(
    (source) =>
      (VESTING_SOURCE_IDS as readonly string[]).includes(source.id) && (source.claimable.length || source.locked.length)
  );

  if (!vestingSources.length) {
    return { rows: [], unlocked: null, fullyUnlocked: false };
  }

  const rows = vestingSources.map<VestingRow>((source) => ({
    id: source.id as VestingSourceId,
    claimable: source.claimable,
    locked: source.locked,
    unlocked: getUnlockedFraction(source.claimable, source.locked, prices),
  }));

  const overall = buildUnlocked(vestingSources, prices);

  return {
    rows,
    unlocked: overall.share,
    fullyUnlocked: vestingSources.every((source) => source.locked.length === 0),
  };
}

/** Measures how much of everything earned (all sources) can be claimed now, and what is still locked in fiat. */
export function buildUnlocked(
  sources: readonly RewardSource[],
  prices: Nullable<FiatPriceObjectLike>
): RewardsUnlocked {
  if (!sources.length) return { share: null, lockedFiat: null };

  const claimable = sources.flatMap((source) => source.claimable);
  const locked = sources.flatMap((source) => source.locked);
  const lockedFiat = getFiatValue(locked, prices);

  return {
    share: getUnlockedFraction(claimable, locked, prices),
    lockedFiat: lockedFiat.complete ? lockedFiat.value : null,
  };
}

/** Parses a natural decimal string. Anything that is not a finite number gives null. */
export function parseAmount(value: Nullable<string>): FPNumber | null {
  const text = value?.trim();

  if (!text) return null;

  try {
    const number = new FPNumber(text);

    return number.isFinity() && !number.isNaN() ? number : null;
  } catch {
    return null;
  }
}

/**
 * Orders the distinct assets of a reward list by claimable value, largest first. Assets that cannot be priced follow
 * in their original order, so the result is stable while prices are still loading.
 */
export function rankAssetsByValue(
  items: ReadonlyArray<{ asset: Nullable<Asset>; amount: Nullable<string> }>,
  prices: Nullable<FiatPriceObjectLike>
): Asset[] {
  const seen = new Set<string>();
  const ranked: Array<{ asset: Asset; order: number; value: FPNumber | null }> = [];

  items.forEach((item, order) => {
    if (!isUsableAsset(item.asset) || seen.has(item.asset.address)) return;

    seen.add(item.asset.address);

    const amount = parseAmount(item.amount);
    const price = getAssetPrice(prices, item.asset);

    ranked.push({ asset: item.asset, order, value: amount && price ? amount.mul(price) : null });
  });

  return ranked
    .sort((a, b) => {
      if (a.value && b.value && !FPNumber.eq(a.value, b.value)) return FPNumber.gt(a.value, b.value) ? -1 : 1;
      if (a.value && !b.value) return -1;
      if (!a.value && b.value) return 1;

      return a.order - b.order;
    })
    .map(({ asset }) => asset);
}

/**
 * Network fee as a percentage of the claim value. Both sides are converted to fiat first because the fee is paid in
 * XOR and rewards are mostly PSWAP or VAL. Returns null when either value or a price is missing.
 */
export function getFeePercent(
  feeCodec: Nullable<string>,
  feeAsset: Nullable<Asset>,
  claimFiat: Nullable<FPNumber>,
  prices: Nullable<FiatPriceObjectLike>
): FPNumber | null {
  if (!feeCodec || !feeAsset || !claimFiat?.isGtZero()) return null;

  const price = getAssetPrice(prices, feeAsset);

  if (!price) return null;

  const feeFiat = fromCodec(feeCodec, feeAsset).mul(price);

  if (!feeFiat.isGtZero()) return null;

  return feeFiat.div(claimFiat).mul(FPNumber.HUNDRED);
}

/** Rounds a 0–1 share to a whole percent. Anything short of 1 stays at 99, so "100%" always means everything. */
export function toWholePercent(share: number): number {
  const percent = Math.round(Math.min(1, Math.max(0, share)) * 100);

  return share < 1 ? Math.min(percent, 99) : percent;
}

/** Formats a 0–1 share as a whole percent. Anything that rounds to zero reads "<1%". */
export function formatShare(share: Nullable<number>): string {
  if (share === null || share === undefined || !Number.isFinite(share)) return '–';
  if (share <= 0) return '0%';
  if (share < 0.01) return '<1%';

  return `${toWholePercent(share)}%`;
}

/** Formats a percentage FPNumber with two decimals. Anything below 0.01 reads "<0.01%". */
export function formatPercent(value: FPNumber): string {
  if (!value.isGtZero()) return '0%';
  if (FPNumber.lt(value, new FPNumber(0.01))) return '<0.01%';

  return `${value.toLocaleString(2)}%`;
}
