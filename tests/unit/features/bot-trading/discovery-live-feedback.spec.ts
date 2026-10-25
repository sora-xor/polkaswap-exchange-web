import { describe, expect, it } from 'vitest';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { createDiscoveryCampaign, type DiscoveryCampaignMark } from '@/features/bot-trading/campaign';
import { summarizeDiscoveryLiveFeedback } from '@/features/bot-trading/discovery-live-feedback';
import { executionBot, executionOrder } from './execution-fixtures';
import type { BotOrder } from '@/features/bot-trading/types';

const NETWORK = `0x${'c'.repeat(64)}`;
const BLOCK_A = `0x${'a'.repeat(64)}`;
const BLOCK_B = `0x${'b'.repeat(64)}`;
const TX = `0x${'d'.repeat(64)}`;

function fixture() {
  const bot = executionBot();
  bot.network = NETWORK;
  bot.status = 'paused';
  bot.discoveryCampaignId = 'campaign-feedback';
  const mark: DiscoveryCampaignMark = {
    network: NETWORK, blockHash: BLOCK_A, blockNumber: 100, timestampMs: 1_000_000,
    denominator: '1000000000000000000',
    values: { [bot.id]: {
      currentOutputCodec: '10000000000000000000',
      holdOutputCodec: '10000000000000000000',
      capitalXorCodec: '11000000000000000000',
    } },
  };
  const campaign = createDiscoveryCampaign('campaign-feedback', [bot], mark, '12000000000000000000', {
    [bot.id]: '5',
  }, 1_000_001);
  const progress = campaign.progress[bot.id];
  progress.latestOutputCodec = '12000000000000000000';
  progress.benchmarkOutputCodec = '11000000000000000000';
  progress.peakOutputCodec = '12500000000000000000';
  progress.activeMs = 2 * 3_600_000 + 1_800_000;
  progress.successfulSwaps = 1;
  progress.lastBlockHash = BLOCK_B;
  progress.lastBlockNumber = 101;
  progress.lastTimestampMs = 1_006_000;
  bot.portfolio.trades = 1;
  bot.portfolio.feesPaidCodec = '125000000000000000';
  const order: BotOrder = {
    ...executionOrder(), account: bot.account, network: NETWORK, createdAt: 1_006_000,
    status: 'confirmed', feeAsset: XOR.address, outputCodec: '2000000000000000000',
    actualFeeCodec: '125000000000000000', txHash: TX,
    finalized: { blockHash: BLOCK_B, blockNumber: 101, extrinsicIndex: 0 },
  };
  return { bot, campaign, order };
}

describe('sanitized discovery live feedback', () => {
  it('returns only aggregate exact marked metrics and actual finalized XOR fees', () => {
    const { bot, campaign, order } = fixture();
    const result = summarizeDiscoveryLiveFeedback(campaign, [bot], [order], bot.id);
    expect(result).toEqual({
      pairKey: `${bot.assetIn.address}>${bot.assetOut.address}`,
      activeHours: 2,
      successfulSwaps: 1,
      netReturnPercent: '20',
      excessReturnPercent: '10',
      drawdownPercent: '4',
      feesPaidXor: '0.125',
    });
    expect(JSON.stringify(result)).not.toMatch(/cn-account|txHash|blockHash|wallet|holdings|privateKey/);
  });

  it('includes finalized failed-swap fees without counting a failed swap', () => {
    const { bot, campaign, order } = fixture();
    const failed: BotOrder = {
      ...order, id: 'failed-2', intentId: 'failed-2', status: 'failed', outputCodec: '0',
      actualFeeCodec: '25000000000000000', txHash: `0x${'e'.repeat(64)}`,
      finalized: { blockHash: BLOCK_B, blockNumber: 101, extrinsicIndex: 1 },
    };
    bot.portfolio.feesPaidCodec = '150000000000000000';
    expect(summarizeDiscoveryLiveFeedback(campaign, [bot], [order, failed], bot.id)?.feesPaidXor).toBe('0.15');
    expect(summarizeDiscoveryLiveFeedback(campaign, [bot], [order, failed], bot.id)?.successfulSwaps).toBe(1);
  });

  it('withholds feedback when a receipt, ledger total, or finalized mark is missing', () => {
    const { bot, campaign, order } = fixture();
    expect(summarizeDiscoveryLiveFeedback(campaign, [bot], [{ ...order, status: 'submitted' }], bot.id)).toBeNull();
    expect(summarizeDiscoveryLiveFeedback(campaign, [bot], [{ ...order, finalized: undefined }], bot.id)).toBeNull();
    bot.portfolio.feesPaidCodec = '124999999999999999';
    expect(summarizeDiscoveryLiveFeedback(campaign, [bot], [order], bot.id)).toBeNull();
    bot.portfolio.feesPaidCodec = '125000000000000000';
    delete campaign.progress[bot.id].lastBlockHash;
    expect(summarizeDiscoveryLiveFeedback(campaign, [bot], [order], bot.id)).toBeNull();
  });
});
