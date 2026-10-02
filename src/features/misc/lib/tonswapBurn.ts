import { FPNumber } from '@sora-substrate/sdk';

import { isExcludedXorBurnAddress } from './burnEligibility';

/** First block eligible for the separate TONSWAP campaign, inclusive. */
export const TONSWAP_START_BLOCK = 27_720_478;
export const TONSWAP_XOR_CAP = '1753357';
export const TONSWAP_INITIAL_TS_PER_XOR = '50';
export const TONSWAP_FINAL_TS_PER_XOR = '5';
export const TONSWAP_MAX_TS = '48217317.5';
export const TONSWAP_REWARD_DECIMALS = 18;

export type TonswapXorBurnRemark = {
  app: 'polkaswap';
  kind: 'tonswap-xor-burn';
  version: 1;
};

/** Amounts are natural, denomination-adjusted XOR; all outputs use 18 decimals. */
export type TonswapBurnQuote = {
  requested: FPNumber;
  eligible: FPNumber;
  excess: FPNumber;
  reward: FPNumber;
  startRate: FPNumber;
  endRate: FPNumber;
};

/** A successful, finalized, marker-verified XOR burn from the complete global stream. */
export type TonswapBurn = {
  address: string;
  amount: FPNumber;
  blockHeight: number;
  extrinsicIndex: number;
  txHash: string;
};

export type TonswapBurnAllocation = TonswapBurn & TonswapBurnQuote & { burnedBefore: FPNumber };

export type TonswapBurnAllocations = {
  allocations: TonswapBurnAllocation[];
  totalBurned: FPNumber;
  totalEligible: FPNumber;
  totalReward: FPNumber;
  remaining: FPNumber;
};

const SCALE = 10n ** BigInt(TONSWAP_REWARD_DECIMALS);
const CAP_CODEC = BigInt(TONSWAP_XOR_CAP) * SCALE;
const INITIAL_RATE = BigInt(TONSWAP_INITIAL_TS_PER_XOR);
const RATE_DECREASE = INITIAL_RATE - BigInt(TONSWAP_FINAL_TS_PER_XOR);

/** Builds the public marker stored in the same atomic batch as the XOR burn. */
export function createTonswapXorBurnRemark(): string {
  const remark: TonswapXorBurnRemark = { app: 'polkaswap', kind: 'tonswap-xor-burn', version: 1 };
  return JSON.stringify(remark);
}

/** Accepts only this campaign's versioned marker, with no destination or extra fields. */
export function parseTonswapXorBurnRemark(value: string): TonswapXorBurnRemark | null {
  try {
    const remark: unknown = JSON.parse(value);
    if (!remark || typeof remark !== 'object' || Array.isArray(remark)) return null;
    const payload = remark as Record<string, unknown>;
    if (
      Object.keys(payload).length !== 3 ||
      payload.app !== 'polkaswap' ||
      payload.kind !== 'tonswap-xor-burn' ||
      payload.version !== 1
    ) {
      return null;
    }
    return { app: 'polkaswap', kind: 'tonswap-xor-burn', version: 1 };
  } catch {
    return null;
  }
}

/** Converts a finite, nonnegative natural amount without silently dropping precision. */
function toAmountCodec(value: FPNumber): bigint {
  if (!(value instanceof FPNumber) || !value.isFinity() || FPNumber.lt(value, FPNumber.ZERO)) {
    throw new Error('Invalid TONSWAP burn amount');
  }
  const normalized = new FPNumber(value.value, TONSWAP_REWARD_DECIMALS);
  if (!FPNumber.eq(value, normalized)) throw new Error('TONSWAP burn amount exceeds supported precision');
  return BigInt(normalized.toCodecString());
}

/** Restores natural units at the explicit campaign accounting precision. */
function fromAmountCodec(value: bigint): FPNumber {
  return FPNumber.fromCodecValue(value.toString(), TONSWAP_REWARD_DECIMALS);
}

/** Bounds cumulative eligible XOR by the global cap. */
function cappedCodec(value: bigint): bigint {
  return value < CAP_CODEC ? value : CAP_CODEC;
}

/** Integrates the marginal rate and floors the cumulative entitlement to one TS atom. */
function cumulativeRewardCodec(eligible: bigint): bigint {
  return (2n * INITIAL_RATE * CAP_CODEC * eligible - RATE_DECREASE * eligible * eligible) / (2n * CAP_CODEC);
}

/** Returns the marginal TS per XOR, reaching 5 at the cap; exhausted burns earn zero. */
export function getTonswapCurrentRate(totalBurned: FPNumber): FPNumber {
  const eligible = cappedCodec(toAmountCodec(totalBurned));
  return fromAmountCodec((INITIAL_RATE * SCALE * CAP_CODEC - RATE_DECREASE * SCALE * eligible) / CAP_CODEC);
}

/** Returns XOR still eligible for a TS reward, never a negative amount. */
export function getTonswapRemaining(totalBurned: FPNumber): FPNumber {
  return fromAmountCodec(CAP_CODEC - cappedCodec(toAmountCodec(totalBurned)));
}

/**
 * Quotes the curve interval after all earlier global burns. Only the portion
 * below the cap earns TS; the entire requested amount is still burned.
 * Subtracting rounded cumulative entitlements makes adjacent splits exactly
 * additive at 18 decimals, including the final allocation at the cap.
 */
export function quoteTonswapBurn(totalBurned: FPNumber, requested: FPNumber): TonswapBurnQuote {
  const before = cappedCodec(toAmountCodec(totalBurned));
  const amount = toAmountCodec(requested);
  const after = cappedCodec(before + amount);
  const eligible = after - before;
  return {
    requested: fromAmountCodec(amount),
    eligible: fromAmountCodec(eligible),
    excess: fromAmountCodec(amount - eligible),
    reward: fromAmountCodec(cumulativeRewardCodec(after) - cumulativeRewardCodec(before)),
    startRate: getTonswapCurrentRate(fromAmountCodec(before)),
    endRate: getTonswapCurrentRate(fromAmountCodec(after)),
  };
}

/** Confirms duplicate rows describe the same finalized transaction. */
function isSameBurn(left: TonswapBurn, right: TonswapBurn): boolean {
  return (
    left.address === right.address &&
    left.blockHeight === right.blockHeight &&
    left.extrinsicIndex === right.extrinsicIndex &&
    left.txHash.toLowerCase() === right.txHash.toLowerCase() &&
    FPNumber.eq(left.amount, right.amount)
  );
}

/**
 * Allocates the complete finalized campaign stream in block/extrinsic order.
 * Identical duplicate rows are counted once. Missing ordering, zero/invalid
 * amounts, or contradictory transaction identities fail the entire result.
 * Callers must establish stream completeness and marker/burn atomicity before
 * invoking this pure allocator; optimistic account history cannot substitute.
 * Excluded SORA Trust burns never consume the cap, advance the rate, contribute
 * to totals, or create claim allocations. Evidence is still validated first.
 */
export function allocateTonswapBurns(burns: readonly TonswapBurn[]): TonswapBurnAllocations {
  const byHash = new Map<string, TonswapBurn>();
  const byPosition = new Map<string, TonswapBurn>();
  for (const burn of burns) {
    if (!Number.isSafeInteger(burn.blockHeight) || burn.blockHeight < 0) {
      throw new Error('Invalid TONSWAP burn block');
    }
    if (burn.blockHeight < TONSWAP_START_BLOCK) continue;
    if (!Number.isSafeInteger(burn.extrinsicIndex) || burn.extrinsicIndex < 0) {
      throw new Error('Missing or invalid TONSWAP burn ordering');
    }
    if (!burn.address?.trim() || !burn.txHash?.trim()) throw new Error('Missing TONSWAP burn identity');
    if (toAmountCodec(burn.amount) === 0n) throw new Error('Invalid TONSWAP zero burn');
    const hash = burn.txHash.toLowerCase();
    const position = `${burn.blockHeight}:${burn.extrinsicIndex}`;
    const duplicate = byHash.get(hash) ?? byPosition.get(position);
    if (duplicate && !isSameBurn(duplicate, burn)) throw new Error('Conflicting TONSWAP burn identity');
    byHash.set(hash, burn);
    byPosition.set(position, burn);
  }

  const ordered = Array.from(byHash.values())
    .filter((burn) => !isExcludedXorBurnAddress(burn.address))
    .sort((left, right) => left.blockHeight - right.blockHeight || left.extrinsicIndex - right.extrinsicIndex);
  let totalBurnedCodec = 0n;
  const allocations = ordered.map((burn): TonswapBurnAllocation => {
    const burnedBefore = fromAmountCodec(totalBurnedCodec);
    const quote = quoteTonswapBurn(burnedBefore, burn.amount);
    totalBurnedCodec += toAmountCodec(burn.amount);
    return { ...burn, ...quote, burnedBefore };
  });
  const totalEligibleCodec = cappedCodec(totalBurnedCodec);
  return {
    allocations,
    totalBurned: fromAmountCodec(totalBurnedCodec),
    totalEligible: fromAmountCodec(totalEligibleCodec),
    totalReward: fromAmountCodec(cumulativeRewardCodec(totalEligibleCodec)),
    remaining: fromAmountCodec(CAP_CODEC - totalEligibleCodec),
  };
}
