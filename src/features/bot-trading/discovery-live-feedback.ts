import { FPNumber } from '@/lib/substrate/math';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { codec, fromCodec } from './amounts';
import { sameBotAccount } from './account-identity';
import { validateDiscoveryCampaign, type DiscoveryCampaign } from './campaign';
import { decimalRatio } from './engine';
import type { DiscoveryLiveFeedback } from './discovery';
import type { BotDefinition, BotOrder } from './types';

const HOUR = 3_600_000;
const HASH = /^0x[0-9a-f]{64}$/i;
const fp = (value: bigint) => new FPNumber(value.toString(), 36);

/** Express one exact output-token difference as a percentage of the opening marked allocation. */
function percentOfOpening(change: bigint, opening: bigint): string {
  return decimalRatio(fp(change), fp(opening)).mul(new FPNumber('100', 36)).toString();
}

/**
 * Derive the only live fields AI discovery may receive from canonical campaign progress.
 * An unresolved or unproved order makes the aggregate unavailable; no account, balance,
 * block, order or transaction identifier crosses this boundary.
 */
export function summarizeDiscoveryLiveFeedback(
  campaign: DiscoveryCampaign,
  bots: readonly BotDefinition[],
  orders: readonly BotOrder[],
  botId: string
): DiscoveryLiveFeedback | null {
  try {
    validateDiscoveryCampaign(campaign, bots);
    const bot = bots.find((item) => item.id === botId);
    const progress = campaign.progress[botId];
    if (
      !bot || !progress || !campaign.botIds.includes(botId) ||
      progress.lastBlockNumber === undefined || progress.lastBlockNumber <= campaign.openingBlockNumber ||
      !progress.lastBlockHash || !HASH.test(progress.lastBlockHash) ||
      progress.lastTimestampMs === undefined || progress.lastTimestampMs <= campaign.openingTimestampMs ||
      !Number.isSafeInteger(progress.activeMs) || progress.activeMs < 0 ||
      !Array.isArray(orders)
    ) return null;
    const opened = codec(progress.openedOutputCodec);
    const latest = codec(progress.latestOutputCodec);
    const benchmark = codec(progress.benchmarkOutputCodec);
    const peak = codec(progress.peakOutputCodec);
    if (opened <= 0n || latest <= 0n || benchmark <= 0n || peak < opened || peak < latest) return null;

    const settled = orders.filter((order) => order.botId === botId);
    const receipts = new Set<string>();
    const hashes = new Set<string>();
    let paid = 0n;
    let successfulSwaps = 0;
    for (const order of settled) {
      if (
        !sameBotAccount(order.account, campaign.account) || order.network !== campaign.network ||
        order.createdAt < campaign.createdAt || order.feeAsset !== XOR.address ||
        !['confirmed', 'failed'].includes(order.status) || !order.finalized ||
        !order.txHash || !HASH.test(order.txHash) || order.actualFeeCodec === undefined ||
        !HASH.test(order.finalized.blockHash) ||
        !Number.isSafeInteger(order.finalized.blockNumber) ||
        !Number.isSafeInteger(order.finalized.extrinsicIndex) ||
        order.finalized.blockNumber <= campaign.openingBlockNumber ||
        order.finalized.blockNumber > progress.lastBlockNumber ||
        order.createdAt > progress.lastTimestampMs ||
        order.finalized.extrinsicIndex < 0
      ) return null;
      const receipt = `${order.finalized.blockHash}:${order.finalized.extrinsicIndex}`;
      if (receipts.has(receipt) || hashes.has(order.txHash)) return null;
      receipts.add(receipt);
      hashes.add(order.txHash);
      paid += codec(order.actualFeeCodec);
      if (order.status === 'confirmed') {
        if (!order.outputCodec || codec(order.outputCodec) <= 0n) return null;
        successfulSwaps++;
      }
    }
    if (
      successfulSwaps < 1 || successfulSwaps !== progress.successfulSwaps ||
      successfulSwaps !== bot.portfolio.trades || paid !== codec(bot.portfolio.feesPaidCodec)
    ) return null;
    return {
      pairKey: `${bot.assetIn.address}>${bot.assetOut.address}`,
      activeHours: Math.floor(progress.activeMs / HOUR),
      successfulSwaps,
      netReturnPercent: percentOfOpening(latest - opened, opened),
      excessReturnPercent: percentOfOpening(latest - benchmark, opened),
      drawdownPercent: percentOfOpening(peak - latest, peak),
      feesPaidXor: fromCodec(paid.toString(), XOR.decimals),
    };
  } catch {
    return null;
  }
}
