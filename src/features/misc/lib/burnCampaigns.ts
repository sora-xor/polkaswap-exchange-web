import { FPNumber } from '@sora-substrate/sdk';
import { u8aToHex } from '@polkadot/util';
import { decodeAddress } from '@polkadot/util-crypto';

import solswapMarkUrl from '@/assets/img/solswap-mark.svg?url';

import type { Asset } from '@sora-substrate/sdk/build/assets/types';
import type { Nullable } from '@/types/common';
import type { XorBurn } from '@/indexer/queries/burnXor';

export type CampaignKey = 'solswap';

/** Campaign reward assets may be local placeholders before a chain asset address is available. */
export type CampaignAsset = Asset & {
  icon?: string;
};

export type RewardTier = {
  blockRange: string;
  reward: string;
};

export type Campaign = {
  id: CampaignKey;
  title: string;
  description: string;
  rewardTiers: RewardTier[];
  disabledText?: string;
  link: string;
  receivedAsset: CampaignAsset;
  rate: string;
  max: number;
  min: number;
  requiresNexusRecipient: boolean;
  from: number;
  fromTimestamp: number;
  to: number;
  toTimestamp: number;
};

export type ClaimRow = {
  id: string;
  blockHeight: Nullable<number>;
  burned: string;
  ssReserved: string;
  nexusReserved: string;
  txHash: string;
};

export type BurnForStats = XorBurn & {
  displayBlockHeight?: Nullable<number>;
};

export type BurnReservationAmounts = {
  reserved: FPNumber;
  nexus: FPNumber;
};

export type BurnStatsByAddress = Record<
  string,
  { address: string; burned: FPNumber; reserved: FPNumber; nexus: FPNumber }
>;

export type BurnCampaignStatistics = {
  accountTotals: Record<CampaignKey, FPNumber>;
  overallTotals: Record<CampaignKey, FPNumber>;
  accountReservedTotals: Record<CampaignKey, FPNumber>;
  overallReservedTotals: Record<CampaignKey, FPNumber>;
  accountNexusReservedTotals: Record<CampaignKey, FPNumber>;
  overallNexusReservedTotals: Record<CampaignKey, FPNumber>;
  accountClaimRows: Record<CampaignKey, ClaimRow[]>;
};

export type BurnCountdownState = {
  timeLeftFormatted: Record<CampaignKey, string>;
  ended: Record<CampaignKey, boolean>;
};

export const SOLSWAP_LEGACY_START_BLOCK = 25_043_003;
export const SOLSWAP_NEXUS_START_BLOCK = 25_867_650;
export const SOLSWAP_CURRENT_RATE = '0.02';
export const SOLSWAP_LEGACY_RATE = '0.01';
export const SOLSWAP_CURRENT_SS_PER_XOR = '50';
export const SOLSWAP_LEGACY_SS_PER_XOR = '100';

const MIN_NORMALIZABLE_ADDRESS_LENGTH = 32;
const decimalDelimiter = FPNumber.DELIMITERS_CONFIG.decimal;
const escapedDecimalDelimiter = decimalDelimiter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const decimalOnlyZerosRegExp = new RegExp(`${escapedDecimalDelimiter}0+$`);
const trailingZerosRegExp = new RegExp(`(${escapedDecimalDelimiter}\\d*?[1-9])0+$`);
const danglingDecimalRegExp = new RegExp(`${escapedDecimalDelimiter}$`);

/**
 * Creates the supported burn campaign definitions in display order.
 */
export const createBurnCampaigns = (): Record<CampaignKey, Campaign> => ({
  solswap: {
    id: 'solswap',
    title: 'Burn XOR for SOLSWAP + SORA Nexus XOR',
    description:
      'Burn XOR to reserve SS. Reward rates depend on the burn block, with SORA Nexus XOR distribution starting at block 25,867,650.',
    rewardTiers: [
      {
        blockRange: 'From block 25,867,650',
        reward: '1 SORA Nexus XOR and 50 SS tokens per 1 XOR burned',
      },
      {
        blockRange: 'Blocks 25,043,003-25,867,649',
        reward: '0 SORA Nexus XOR and 100 SS tokens per 1 XOR burned',
      },
    ],
    link: 'https://t.me/solswap_io',
    receivedAsset: { symbol: 'SS', address: '', name: 'SOLSWAP', decimals: 18, icon: solswapMarkUrl } as CampaignAsset,
    rate: SOLSWAP_CURRENT_RATE,
    max: 100_000_000,
    min: 1,
    requiresNexusRecipient: true,
    from: SOLSWAP_LEGACY_START_BLOCK,
    fromTimestamp: 1717693074001,
    to: 60_000_000,
    toTimestamp: 1893456000000,
  },
});

/**
 * Creates a campaign-keyed zero FPNumber map.
 */
export const createDefaultBurned = (): Record<CampaignKey, FPNumber> => ({
  solswap: new FPNumber(0),
});

/**
 * Creates a campaign-keyed empty claim-row map.
 */
export const createDefaultClaimRows = (): Record<CampaignKey, ClaimRow[]> => ({
  solswap: [],
});

/**
 * Calculates display countdown state for every active burn campaign.
 */
export const calculateBurnCountdowns = (
  campaigns: readonly Campaign[],
  currentBlock: number,
  blockDurationMs: number,
  formatDuration: (milliseconds: number) => string
): BurnCountdownState => {
  const timeLeftFormatted = {} as Record<CampaignKey, string>;
  const ended = {} as Record<CampaignKey, boolean>;

  for (const campaign of campaigns) {
    const msLeft = (campaign.to - currentBlock) * blockDurationMs;

    if (msLeft <= 0) {
      timeLeftFormatted[campaign.id] = '0D 0H 0M';
      ended[campaign.id] = true;
      continue;
    }

    timeLeftFormatted[campaign.id] = formatDuration(msLeft);
    ended[campaign.id] = false;
  }

  return { timeLeftFormatted, ended };
};

/**
 * Removes trailing decimal zeroes from locale-formatted FPNumber output.
 */
export const trimBurnTrailingZeros = (value: string): string => {
  return value
    .replace(decimalOnlyZerosRegExp, '')
    .replace(trailingZerosRegExp, '$1')
    .replace(danglingDecimalRegExp, '');
};

/**
 * Formats a burn amount without noisy trailing decimal zeroes.
 */
export const formatBurnAmount = (value: FPNumber, precision?: number): string => {
  const formatted = precision === undefined ? value.toLocaleString() : value.toLocaleString(precision);
  return trimBurnTrailingZeros(formatted);
};

/**
 * Formats one qualifying burn into the claim row users need for Minamoto claims.
 */
export const createClaimRow = (
  blockHeight: number,
  burned: FPNumber,
  ssReserved: FPNumber,
  nexusReserved: FPNumber,
  txHash: string,
  displayBlockHeight: Nullable<number> = blockHeight
): ClaimRow => ({
  id: `${txHash}:${blockHeight}`,
  blockHeight: displayBlockHeight,
  burned: formatBurnAmount(burned, 3),
  ssReserved: formatBurnAmount(ssReserved, 3),
  nexusReserved: formatBurnAmount(nexusReserved, 3),
  txHash,
});

/**
 * Returns a stable hexadecimal key for valid SORA addresses when possible.
 */
export const normalizeSoraAddress = (address: string): string => {
  if (address.length < MIN_NORMALIZABLE_ADDRESS_LENGTH) return address;

  try {
    const decoded = decodeAddress(address);
    return decoded.length === 32 ? u8aToHex(decoded) : address;
  } catch {
    return address;
  }
};

/**
 * Compares SORA addresses across display and canonical encodings.
 */
export const isSameSoraAddress = (left: string, right: string): boolean => {
  return left === right || normalizeSoraAddress(left) === normalizeSoraAddress(right);
};

/**
 * Deduplicates indexed and optimistic local burns by transaction hash or deterministic burn tuple.
 */
export const dedupeBurnEntries = (items: BurnForStats[]): BurnForStats[] => {
  const seen = new Map<string, BurnForStats>();
  const result: BurnForStats[] = [];

  for (const item of items) {
    const key = item.txHash ? `tx:${item.txHash}` : `${item.address}:${item.blockHeight}:${item.amount.toString()}`;
    const existing = seen.get(key);

    if (existing) {
      existing.nexusRecipient ??= item.nexusRecipient;
      continue;
    }

    seen.set(key, item);
    result.push(item);
  }

  return result;
};

/**
 * Returns the minimum XOR burn accepted by the SOLSWAP UI for the reward tier active at a block.
 */
export const getSolswapMinimumBurned = (blockHeight: number, minReservedSs: number): FPNumber => {
  const rate = blockHeight >= SOLSWAP_NEXUS_START_BLOCK ? SOLSWAP_CURRENT_RATE : SOLSWAP_LEGACY_RATE;
  return new FPNumber(rate).mul(minReservedSs);
};

/**
 * Returns the SS reservation multiplier for a historical SOLSWAP XOR burn block.
 */
export const getSolswapSsPerXor = (blockHeight: number): FPNumber => {
  const ssPerXor = blockHeight >= SOLSWAP_NEXUS_START_BLOCK ? SOLSWAP_CURRENT_SS_PER_XOR : SOLSWAP_LEGACY_SS_PER_XOR;
  return new FPNumber(ssPerXor);
};

/**
 * Returns the minimum XOR amount that qualifies a burn for the campaign total calculations.
 */
export const getMinimumBurnedForBlock = (campaign: Campaign, blockHeight: number): FPNumber => {
  if (campaign.id === 'solswap') {
    return getSolswapMinimumBurned(blockHeight, campaign.min);
  }

  return new FPNumber(campaign.rate).mul(campaign.min);
};

/**
 * Converts a historical XOR burn into reserved campaign tokens according to the block's reward tier.
 */
export const getReservedAmount = (campaign: Campaign, blockHeight: number, amount: FPNumber): FPNumber => {
  if (campaign.id === 'solswap') {
    return amount.mul(getSolswapSsPerXor(blockHeight));
  }

  return amount.div(campaign.rate);
};

/**
 * Converts a historical XOR burn into reserved SORA Nexus XOR for the active tier.
 */
export const getNexusReservedAmount = (campaign: Campaign, burn: BurnForStats): FPNumber => {
  if (campaign.id !== 'solswap' || burn.blockHeight < SOLSWAP_NEXUS_START_BLOCK || !burn.nexusRecipient) {
    return new FPNumber(0);
  }

  return burn.amount;
};

/**
 * Returns campaign reservation amounts for one qualifying XOR burn.
 */
export const getReservationAmountsForBurn = (
  campaign: Campaign,
  burn: BurnForStats
): Nullable<BurnReservationAmounts> => {
  const { amount, blockHeight } = burn;

  if (!amount.gte(getMinimumBurnedForBlock(campaign, blockHeight))) return null;

  return {
    reserved: getReservedAmount(campaign, blockHeight, amount),
    nexus: getNexusReservedAmount(campaign, burn),
  };
};

/**
 * Aggregates qualifying campaign burns by burner address.
 */
export const aggregateBurnStatsByAddress = (campaign: Campaign, burns: BurnForStats[]): BurnStatsByAddress => {
  return burns.reduce<BurnStatsByAddress>((acc, burn) => {
    const { address: burnAddress, amount } = burn;
    const reservationAmounts = getReservationAmountsForBurn(campaign, burn);

    if (!reservationAmounts) return acc;

    const burnAddressKey = normalizeSoraAddress(burnAddress);
    const current = acc[burnAddressKey] ?? {
      address: burnAddress,
      burned: new FPNumber(0),
      reserved: new FPNumber(0),
      nexus: new FPNumber(0),
    };

    current.burned = current.burned.add(amount);
    current.reserved = current.reserved.add(reservationAmounts.reserved);
    current.nexus = current.nexus.add(reservationAmounts.nexus);
    acc[burnAddressKey] = current;

    return acc;
  }, {});
};

/**
 * Calculates campaign totals and per-account claim rows from indexed and local burn entries.
 */
export const calculateBurnCampaignStatistics = ({
  campaigns,
  accountAddress,
  globalBurns,
  accountBurns,
}: {
  campaigns: Campaign[];
  accountAddress: Nullable<string>;
  globalBurns: BurnForStats[];
  accountBurns: BurnForStats[];
}): BurnCampaignStatistics => {
  const accountTotals = createDefaultBurned();
  const overallTotals = createDefaultBurned();
  const accountReservedTotals = createDefaultBurned();
  const overallReservedTotals = createDefaultBurned();
  const accountNexusReservedTotals = createDefaultBurned();
  const overallNexusReservedTotals = createDefaultBurned();
  const accountClaimRows = createDefaultClaimRows();

  for (const campaign of campaigns) {
    const campaignGlobalBurns = globalBurns.filter(
      ({ blockHeight }) => blockHeight >= campaign.from && blockHeight <= campaign.to
    );
    const campaignAccountBurns = accountBurns.filter(
      ({ blockHeight }) => blockHeight >= campaign.from && blockHeight <= campaign.to
    );
    const overallStats = aggregateBurnStatsByAddress(campaign, campaignGlobalBurns);
    const accountStats = aggregateBurnStatsByAddress(campaign, campaignAccountBurns);

    Object.values(overallStats).forEach((totals) => {
      overallTotals[campaign.id] = overallTotals[campaign.id].add(totals.burned);
      overallReservedTotals[campaign.id] = overallReservedTotals[campaign.id].add(totals.reserved);
      overallNexusReservedTotals[campaign.id] = overallNexusReservedTotals[campaign.id].add(totals.nexus);
    });

    Object.values(accountStats).forEach((totals) => {
      if (accountAddress && isSameSoraAddress(totals.address, accountAddress)) {
        accountTotals[campaign.id] = accountTotals[campaign.id].add(totals.burned);
        accountReservedTotals[campaign.id] = accountReservedTotals[campaign.id].add(totals.reserved);
        accountNexusReservedTotals[campaign.id] = accountNexusReservedTotals[campaign.id].add(totals.nexus);
      }
    });

    if (!accountAddress) continue;

    campaignAccountBurns.forEach((burn) => {
      const { address: burnAddress, amount, blockHeight, txHash } = burn;
      const reservationAmounts = getReservationAmountsForBurn(campaign, burn);

      if (!txHash || !reservationAmounts || !isSameSoraAddress(burnAddress, accountAddress)) return;

      accountClaimRows[campaign.id].push(
        createClaimRow(
          blockHeight,
          amount,
          reservationAmounts.reserved,
          reservationAmounts.nexus,
          txHash,
          'displayBlockHeight' in burn ? burn.displayBlockHeight : blockHeight
        )
      );
    });

    accountClaimRows[campaign.id].sort(
      (a, b) => (b.blockHeight ?? Number.MAX_SAFE_INTEGER) - (a.blockHeight ?? Number.MAX_SAFE_INTEGER)
    );
  }

  return {
    accountTotals,
    overallTotals,
    accountReservedTotals,
    overallReservedTotals,
    accountNexusReservedTotals,
    overallNexusReservedTotals,
    accountClaimRows,
  };
};
