import { describe, expect, it, vi } from 'vitest';
vi.unmock('@polkadot/util-crypto');
import { encodeAddress } from '@polkadot/util-crypto';
import {
  advanceDiscoveryCampaign,
  assertDiscoveryMarkLedger,
  closeDiscoveryCampaign,
  createDiscoveryCampaign,
  DISCOVERY_GOAL_ACTIVE_MS,
  grantDiscoveryCampaign,
  type DiscoveryCampaignMark,
} from '@/features/bot-trading/campaign';
import { cancelLocallyUnbroadcastSubmittedOrder, settleOrder } from '@/features/bot-trading/storage';
import { executionBot, executionOrder } from './execution-fixtures';
import type { BotDefinition } from '@/features/bot-trading/types';

const HASH_A = `0x${'a'.repeat(64)}`;
const HASH_B = `0x${'b'.repeat(64)}`;
const NETWORK = `0x${'c'.repeat(64)}`;
function fixture(account?: string) {
  const bot: BotDefinition = executionBot();
  if (account) bot.account = account;
  bot.network = NETWORK;
  bot.status = 'paused';
  bot.discoveryCampaignId = 'campaign-1';
  bot.policy.sessionDurationMs = DISCOVERY_GOAL_ACTIVE_MS;
  const mark: DiscoveryCampaignMark = {
    network: NETWORK,
    blockHash: HASH_A,
    blockNumber: 100,
    timestampMs: 1_000_000,
    denominator: '1000000000000000000',
    values: {
      [bot.id]: {
        currentOutputCodec: '10000000000000000000',
        holdOutputCodec: '10000000000000000000',
        capitalXorCodec: '11000000000000000000',
      },
    },
  };
  const campaign = createDiscoveryCampaign(
    'campaign-1',
    [bot],
    mark,
    '12000000000000000000',
    {
      [bot.id]: '5',
    },
    1_000_001
  );
  return { bot, mark, campaign };
}

describe('fixed discovery campaign accounting', () => {
  it('keeps an alternate-prefix pending account order in the campaign lock and close checks', () => {
    const key = new Uint8Array(32).fill(17);
    const { bot, campaign, mark } = fixture(encodeAddress(key, 69));
    const pending = {
      ...executionOrder(),
      account: encodeAddress(key, 42),
      network: campaign.network,
      botId: 'other-bot',
      status: 'submitted' as const,
    };
    expect(() => closeDiscoveryCampaign(campaign, [bot], [pending])).toThrow('bots.errors.pending');
    expect(() => assertDiscoveryMarkLedger(campaign, [bot], [pending], mark, { [bot.id]: bot.portfolio })).toThrow(
      'bots.errors.pending'
    );
    expect(campaign.status).toBe('paused');
  });
  it('rejects a shared XOR cap below the finalized value including the fee reserve', () => {
    const { bot, mark } = fixture();
    expect(() =>
      createDiscoveryCampaign(
        'campaign-1',
        [bot],
        mark,
        '10999999999999999999',
        {
          [bot.id]: '5',
        },
        1_000_001
      )
    ).toThrow('bots.errors.policy');
  });

  it('counts only finalized same-grant intervals and pauses on a scheduler gap', () => {
    const { bot, mark, campaign } = fixture();
    grantDiscoveryCampaign(campaign, [bot], 1_000_001);
    bot.status = 'running';
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_B,
        blockNumber: 101,
        timestampMs: 1_006_000,
      },
      []
    );
    expect(campaign.progress[bot.id].activeMs).toBe(0);
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_A,
        blockNumber: 102,
        timestampMs: 1_012_000,
      },
      []
    );
    expect(campaign.progress[bot.id].activeMs).toBe(6_000);
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_B,
        blockNumber: 103,
        timestampMs: 1_073_000,
      },
      []
    );
    expect(campaign.status).toBe('paused');
    expect(campaign.progress[bot.id].activeMs).toBe(6_000);
    expect(bot.status).toBe('paused');
  });

  it('never counts a finalized block from before the signing grant', () => {
    const { bot, mark, campaign } = fixture();
    grantDiscoveryCampaign(campaign, [bot], 1_010_000);
    bot.status = 'running';
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_B,
        blockNumber: 101,
        timestampMs: 1_006_000,
      },
      []
    );
    expect(campaign.progress[bot.id].lastTimestampMs).toBeUndefined();
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_A,
        blockNumber: 102,
        timestampMs: 1_012_000,
      },
      []
    );
    expect(campaign.progress[bot.id].activeMs).toBe(0);
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_B,
        blockNumber: 103,
        timestampMs: 1_018_000,
      },
      []
    );
    expect(campaign.progress[bot.id].activeMs).toBe(6_000);
  });

  it('needs fourteen active days, ten proved swaps, positive marked gain, and a hold beat', () => {
    const { bot, mark, campaign } = fixture();
    grantDiscoveryCampaign(campaign, [bot], 1_000_001);
    bot.status = 'running';
    const progress = campaign.progress[bot.id];
    progress.activeMs = DISCOVERY_GOAL_ACTIVE_MS - 6_000;
    progress.lastGrantId = campaign.grant!.id;
    progress.lastBlockHash = HASH_A;
    progress.lastBlockNumber = 101;
    progress.lastTimestampMs = 1_006_000;
    const orders = Array.from({ length: 10 }, (_, i) => ({
      ...executionOrder(),
      id: `order-${i}`,
      botId: bot.id,
      status: 'confirmed' as const,
      txHash: `0x${i.toString(16).padStart(64, '0')}`,
      signedEnvelopeDigest: 'a'.repeat(64),
      finalized: { blockHash: HASH_A, blockNumber: 101, extrinsicIndex: i },
    }));
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_B,
        blockNumber: 102,
        timestampMs: 1_012_000,
        values: {
          [bot.id]: {
            currentOutputCodec: '10100000000000000000',
            holdOutputCodec: '10100000000000000000',
            capitalXorCodec: '11000000000000000000',
          },
        },
      },
      orders
    );
    expect(progress.activeMs).toBe(DISCOVERY_GOAL_ACTIVE_MS);
    expect(progress.outcome).toBe('active');
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_A,
        blockNumber: 103,
        timestampMs: 1_018_000,
        values: {
          [bot.id]: {
            currentOutputCodec: '10200000000000000000',
            holdOutputCodec: '10100000000000000000',
            capitalXorCodec: '11000000000000000000',
          },
        },
      },
      orders
    );
    expect(progress.outcome).toBe('target');
    expect(campaign.status).toBe('completed');
    expect(bot.status).toBe('paused');
  });

  it('pauses a bot at its exact drawdown threshold even before the activity goal', () => {
    const { bot, mark, campaign } = fixture();
    grantDiscoveryCampaign(campaign, [bot], 1_000_001);
    bot.status = 'running';
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_B,
        blockNumber: 101,
        timestampMs: 1_006_000,
        values: {
          [bot.id]: {
            currentOutputCodec: '9500000000000000000',
            holdOutputCodec: '10000000000000000000',
            capitalXorCodec: '11000000000000000000',
          },
        },
      },
      []
    );
    expect(campaign.progress[bot.id].outcome).toBe('loss');
    expect(bot.status).toBe('paused');
  });

  it('allows a zero drawdown limit and pauses on the first measured decline', () => {
    const { bot, mark } = fixture();
    const campaign = createDiscoveryCampaign(
      'campaign-1',
      [bot],
      mark,
      '12000000000000000000',
      {
        [bot.id]: '0',
      },
      1_000_001
    );
    grantDiscoveryCampaign(campaign, [bot], 1_000_001);
    bot.status = 'running';
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_B,
        blockNumber: 101,
        timestampMs: 1_006_000,
      },
      []
    );
    expect(campaign.progress[bot.id].outcome).toBe('active');
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_A,
        blockNumber: 102,
        timestampMs: 1_012_000,
        values: {
          [bot.id]: {
            currentOutputCodec: '9999999999999999999',
            holdOutputCodec: '10000000000000000000',
            capitalXorCodec: '11000000000000000000',
          },
        },
      },
      []
    );
    expect(campaign.progress[bot.id].outcome).toBe('loss');
    expect(bot.status).toBe('paused');
  });

  it('deduplicates canonical receipts and ignores unproved successful orders', () => {
    const { bot, mark, campaign } = fixture();
    grantDiscoveryCampaign(campaign, [bot], 1_000_001);
    bot.status = 'running';
    const proven = {
      ...executionOrder(),
      id: 'proved',
      botId: bot.id,
      status: 'confirmed' as const,
      txHash: HASH_A,
      signedEnvelopeDigest: 'a'.repeat(64),
      finalized: { blockHash: HASH_B, blockNumber: 101, extrinsicIndex: 0 },
    };
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_B,
        blockNumber: 101,
        timestampMs: 1_006_000,
      },
      [
        proven,
        { ...proven, id: 'duplicate' },
        { ...proven, id: 'unproved', txHash: HASH_B, signedEnvelopeDigest: undefined },
      ]
    );
    expect(campaign.progress[bot.id].successfulSwaps).toBe(1);
  });

  it('rejects a mark when its portfolio snapshot, pending state, or receipt height changes', () => {
    const { bot, mark, campaign } = fixture();
    const snapshot = { [bot.id]: structuredClone(bot.portfolio) };
    const next = { ...mark, blockHash: HASH_B, blockNumber: 101, timestampMs: 1_006_000 };
    expect(() => assertDiscoveryMarkLedger(campaign, [bot], [], next, snapshot)).not.toThrow();
    const pending = { ...executionOrder(), network: NETWORK, status: 'submitted' as const };
    expect(() => assertDiscoveryMarkLedger(campaign, [bot], [pending], next, snapshot)).toThrow('bots.errors.pending');
    const newer = {
      ...pending,
      status: 'confirmed' as const,
      finalized: { blockHash: HASH_A, blockNumber: 102, extrinsicIndex: 0 },
    };
    expect(() => assertDiscoveryMarkLedger(campaign, [bot], [newer], next, snapshot)).toThrow('bots.errors.stale');
    bot.portfolio.holdings[bot.assetIn.address] = '1';
    expect(() => assertDiscoveryMarkLedger(campaign, [bot], [], next, snapshot)).toThrow('bots.errors.stale');
  });

  it('permits only the explicitly signed, unbroadcast order during a final admission mark', () => {
    const { bot, mark, campaign } = fixture();
    const snapshot = { [bot.id]: structuredClone(bot.portfolio) };
    const next = { ...mark, blockHash: HASH_B, blockNumber: 101, timestampMs: 1_006_000 };
    const signed = {
      ...executionOrder(),
      network: NETWORK,
      status: 'signed' as const,
      txHash: HASH_A,
      signedEnvelopeDigest: 'a'.repeat(64),
    };
    expect(() => assertDiscoveryMarkLedger(campaign, [bot], [signed], next, snapshot, signed.id)).not.toThrow();
    expect(() => assertDiscoveryMarkLedger(campaign, [bot], [signed], next, snapshot)).toThrow('bots.errors.pending');
    expect(() =>
      assertDiscoveryMarkLedger(
        campaign,
        [bot],
        [
          signed,
          {
            ...signed,
            id: 'other',
            status: 'reserved',
            txHash: undefined,
          },
        ],
        next,
        snapshot,
        signed.id
      )
    ).toThrow('bots.errors.pending');
    expect(() =>
      assertDiscoveryMarkLedger(campaign, [bot], [{ ...signed, status: 'submitted' }], next, snapshot, signed.id)
    ).toThrow('bots.errors.pending');
  });

  it('does not count a canonical receipt newer than the finalized price mark', () => {
    const { bot, mark, campaign } = fixture();
    grantDiscoveryCampaign(campaign, [bot], 1_000_001);
    bot.status = 'running';
    const future = {
      ...executionOrder(),
      botId: bot.id,
      status: 'confirmed' as const,
      txHash: HASH_A,
      signedEnvelopeDigest: 'a'.repeat(64),
      finalized: { blockHash: HASH_B, blockNumber: 102, extrinsicIndex: 0 },
    };
    expect(() =>
      advanceDiscoveryCampaign(
        campaign,
        [bot],
        {
          ...mark,
          blockHash: HASH_B,
          blockNumber: 101,
          timestampMs: 1_006_000,
        },
        [future]
      )
    ).toThrow('bots.errors.stale');
    expect(campaign.progress[bot.id].successfulSwaps).toBe(0);
  });

  it('records a total marked loss as a bot loss instead of losing the campaign mark', () => {
    const { bot, mark, campaign } = fixture();
    grantDiscoveryCampaign(campaign, [bot], 1_000_001);
    bot.status = 'running';
    advanceDiscoveryCampaign(
      campaign,
      [bot],
      {
        ...mark,
        blockHash: HASH_B,
        blockNumber: 101,
        timestampMs: 1_006_000,
        values: {
          [bot.id]: {
            currentOutputCodec: '0',
            holdOutputCodec: '10000000000000000000',
            capitalXorCodec: '0',
          },
        },
      },
      []
    );
    expect(campaign.progress[bot.id].outcome).toBe('loss');
    expect(bot.status).toBe('paused');
  });

  it('keeps an uncertain submitted order pending until matching finalized evidence arrives', () => {
    const bot = executionBot();
    const order = executionOrder();
    order.status = 'submitted';
    order.txHash = HASH_A;
    order.signedEnvelopeDigest = 'a'.repeat(64);
    const ledger = { bots: [bot], orders: [order] };
    expect(() => settleOrder(ledger, order.id, { success: false, outputCodec: '0', actualFeeCodec: '0' })).toThrow(
      'bots.errors.receipt'
    );
    expect(() =>
      settleOrder(ledger, order.id, {
        success: false,
        outputCodec: '0',
        actualFeeCodec: '0',
        unbroadcast: true,
      })
    ).toThrow('bots.errors.receipt');
    expect(order.status).toBe('submitted');
    settleOrder(ledger, order.id, {
      success: false,
      outputCodec: '0',
      actualFeeCodec: '100',
      finalized: {
        blockHash: HASH_B,
        blockNumber: 101,
        extrinsicIndex: 0,
        txHash: HASH_A,
        signedEnvelopeDigest: 'a'.repeat(64),
      },
    });
    expect(order.status).toBe('failed');
    expect(order.actualFeeCodec).toBe('100');
  });

  it('releases a locally proven submitted reservation before send without claiming a chain failure', () => {
    const bot = executionBot();
    const order = executionOrder();
    order.status = 'submitted';
    order.txHash = HASH_A;
    order.signedEnvelopeDigest = 'a'.repeat(64);
    const ledger = { bots: [bot], orders: [order] };
    cancelLocallyUnbroadcastSubmittedOrder(ledger, order.id);
    expect(order.status).toBe('failed');
    expect(order.unbroadcast).toBe(true);
    expect(order.actualFeeCodec).toBe('0');
    expect(order.finalized).toBeUndefined();
  });

  it('releases every member allocation only after all account orders settle', () => {
    const { bot, campaign } = fixture();
    const second = {
      ...executionBot(),
      id: 'bot-2',
      network: NETWORK,
      status: 'paused' as const,
      discoveryCampaignId: campaign.id,
    };
    second.policy.sessionDurationMs = DISCOVERY_GOAL_ACTIVE_MS;
    // The fixed set may be expanded only before its first grant.
    const both = createDiscoveryCampaign(
      campaign.id,
      [bot, second],
      {
        network: NETWORK,
        blockHash: HASH_A,
        blockNumber: 100,
        timestampMs: 1_000_000,
        denominator: '1000000000000000000',
        values: Object.fromEntries(
          [bot.id, second.id].map((id) => [
            id,
            {
              currentOutputCodec: '10000000000000000000',
              holdOutputCodec: '10000000000000000000',
              capitalXorCodec: '11000000000000000000',
            },
          ])
        ),
      },
      '22000000000000000000',
      { [bot.id]: '5', [second.id]: '5' },
      1_000_001
    );
    const pending = { ...executionOrder(), account: both.account, network: both.network, status: 'submitted' as const };
    expect(() => closeDiscoveryCampaign(both, [bot, second], [pending])).toThrow('bots.errors.pending');
    expect(both.status).toBe('paused');
    closeDiscoveryCampaign(both, [bot, second], []);
    expect(both.status).toBe('closed');
    expect([bot.status, second.status]).toEqual(['stopped', 'stopped']);
    expect([bot.sessionExpiresAt, second.sessionExpiresAt]).toEqual([0, 0]);
  });
});
