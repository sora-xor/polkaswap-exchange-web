import { FPNumber } from '@sora-substrate/sdk';
import { describe, expect, it } from 'vitest';

import {
  aggregateBurnStatsByAddress,
  calculateBurnCampaignStatistics,
  calculateBurnCountdowns,
  createBurnCampaigns,
  createClaimRow,
  dedupeBurnEntries,
  formatBurnAmount,
  getNexusReservedAmount,
  getReservationAmountsForBurn,
  getReservedAmount,
  getSolswapMinimumBurned,
  getSolswapSsPerXor,
  isSameSoraAddress,
  normalizeSoraAddress,
  SOLSWAP_LEGACY_START_BLOCK,
  SOLSWAP_NEXUS_START_BLOCK,
} from '@/features/misc/lib/burnCampaigns';

import type { BurnForStats } from '@/features/misc/lib/burnCampaigns';

const validSoraAddress = 'sorauﾛ1NﾗhBUd2BﾂｦﾄiﾔﾆﾂﾇKSﾃaﾘﾒﾓQﾗrﾒoﾘﾅnｳﾘbQｳQJﾆLJ5HSE';

const burn = (overrides: Partial<BurnForStats>): BurnForStats => ({
  address: 'alice',
  amount: new FPNumber(10),
  blockHeight: SOLSWAP_NEXUS_START_BLOCK,
  txHash: '0xhash',
  ...overrides,
});

describe('burn campaign helpers', () => {
  it('creates the SOLSWAP campaign definition with current reward metadata', () => {
    const campaigns = createBurnCampaigns();

    expect(campaigns.solswap.from).toBe(SOLSWAP_LEGACY_START_BLOCK);
    expect(campaigns.solswap.receivedAsset.symbol).toBe('SS');
    expect(campaigns.solswap.receivedAsset.icon).toContain('solswap-mark');
    expect(campaigns.solswap.rate).toBe('0.02');
    expect(campaigns.solswap.requiresNexusRecipient).toBe(true);
    expect(campaigns.solswap.rewardTiers).toHaveLength(2);
  });

  it('formats burn amounts without noisy trailing zeroes', () => {
    expect(formatBurnAmount(new FPNumber('10.000'), 3)).toBe('10');
    expect(formatBurnAmount(new FPNumber('10.120'), 3)).toBe('10.12');
    expect(formatBurnAmount(new FPNumber('10.125'), 3)).toBe('10.125');
  });

  it('formats claim rows from qualifying burn reservation amounts', () => {
    expect(
      createClaimRow(123, new FPNumber('10.000'), new FPNumber('500.000'), new FPNumber('10.000'), '0xtx', null)
    ).toEqual({
      id: '0xtx:123',
      blockHeight: null,
      burned: '10',
      ssReserved: '500',
      nexusReserved: '10',
      txHash: '0xtx',
    });
  });

  it('calculates countdown display state for active and ended campaigns', () => {
    const campaigns = createBurnCampaigns();
    const active = calculateBurnCountdowns([campaigns.solswap], campaigns.solswap.to - 10, 6_000, (msLeft) => {
      return `${msLeft / 1000}s`;
    });
    const ended = calculateBurnCountdowns([campaigns.solswap], campaigns.solswap.to, 6_000, () => 'unused');

    expect(active).toEqual({
      timeLeftFormatted: {
        solswap: '60s',
      },
      ended: {
        solswap: false,
      },
    });
    expect(ended).toEqual({
      timeLeftFormatted: {
        solswap: '0D 0H 0M',
      },
      ended: {
        solswap: true,
      },
    });
  });

  it('deduplicates burns by transaction hash and preserves Nexus recipients from duplicates', () => {
    const deduped = dedupeBurnEntries([
      burn({ txHash: '0x1', nexusRecipient: undefined }),
      burn({ txHash: '0x1', nexusRecipient: validSoraAddress }),
      burn({ txHash: '0x2' }),
    ]);

    expect(deduped).toHaveLength(2);
    expect(deduped[0]?.nexusRecipient).toBe(validSoraAddress);
  });

  it('calculates historical SOLSWAP reward tiers by burn block', () => {
    const campaigns = createBurnCampaigns();
    const legacyBlock = SOLSWAP_NEXUS_START_BLOCK - 1;
    const currentBlock = SOLSWAP_NEXUS_START_BLOCK;

    expect(getSolswapMinimumBurned(legacyBlock, 1).toString()).toBe('0.01');
    expect(getSolswapMinimumBurned(currentBlock, 1).toString()).toBe('0.02');
    expect(getSolswapSsPerXor(legacyBlock).toString()).toBe('100');
    expect(getSolswapSsPerXor(currentBlock).toString()).toBe('50');
    expect(getReservedAmount(campaigns.solswap, legacyBlock, new FPNumber(2)).toString()).toBe('200');
    expect(getReservedAmount(campaigns.solswap, currentBlock, new FPNumber(2)).toString()).toBe('100');
  });

  it('reserves SORA Nexus XOR only for current-tier burns with a Nexus recipient', () => {
    const campaigns = createBurnCampaigns();
    const currentBurn = burn({ amount: new FPNumber(2), nexusRecipient: validSoraAddress });
    const noRecipientBurn = burn({ amount: new FPNumber(2), nexusRecipient: undefined });
    const legacyBurn = burn({
      amount: new FPNumber(2),
      blockHeight: SOLSWAP_NEXUS_START_BLOCK - 1,
      nexusRecipient: validSoraAddress,
    });

    expect(getNexusReservedAmount(campaigns.solswap, currentBurn).toString()).toBe('2');
    expect(getNexusReservedAmount(campaigns.solswap, noRecipientBurn).toString()).toBe('0');
    expect(getNexusReservedAmount(campaigns.solswap, legacyBurn).toString()).toBe('0');
  });

  it('filters burns below the campaign minimum and aggregates qualifying burns by address', () => {
    const campaigns = createBurnCampaigns();
    const tooSmall = burn({ amount: new FPNumber('0.01') });
    const qualifying = burn({ amount: new FPNumber(2), nexusRecipient: validSoraAddress });

    expect(getReservationAmountsForBurn(campaigns.solswap, tooSmall)).toBeNull();

    const reservation = getReservationAmountsForBurn(campaigns.solswap, qualifying);
    expect(reservation?.reserved.toString()).toBe('100');
    expect(reservation?.nexus.toString()).toBe('2');

    const stats = aggregateBurnStatsByAddress(campaigns.solswap, [
      qualifying,
      burn({ amount: new FPNumber(3), txHash: '0xsecond', nexusRecipient: undefined }),
    ]);
    const [aliceStats] = Object.values(stats);

    expect(aliceStats?.burned.toString()).toBe('5');
    expect(aliceStats?.reserved.toString()).toBe('250');
    expect(aliceStats?.nexus.toString()).toBe('2');
  });

  it('calculates campaign totals and sorted claim rows from global and account burns', () => {
    const campaigns = createBurnCampaigns();
    const olderAccountBurn = burn({
      amount: new FPNumber(2),
      blockHeight: SOLSWAP_NEXUS_START_BLOCK,
      txHash: '0xolder',
      nexusRecipient: validSoraAddress,
    });
    const newerAccountBurn = burn({
      amount: new FPNumber(3),
      blockHeight: SOLSWAP_NEXUS_START_BLOCK + 1,
      txHash: '0xnewer',
    });
    const otherAccountBurn = burn({
      address: 'bob',
      amount: new FPNumber(5),
      blockHeight: SOLSWAP_NEXUS_START_BLOCK,
      txHash: '0xbob',
      nexusRecipient: validSoraAddress,
    });

    const statistics = calculateBurnCampaignStatistics({
      campaigns: [campaigns.solswap],
      accountAddress: 'alice',
      globalBurns: [olderAccountBurn, newerAccountBurn, otherAccountBurn],
      accountBurns: [olderAccountBurn, newerAccountBurn, otherAccountBurn],
    });

    expect(statistics.overallTotals.solswap.toString()).toBe('10');
    expect(statistics.overallReservedTotals.solswap.toString()).toBe('500');
    expect(statistics.overallNexusReservedTotals.solswap.toString()).toBe('7');
    expect(statistics.accountTotals.solswap.toString()).toBe('5');
    expect(statistics.accountReservedTotals.solswap.toString()).toBe('250');
    expect(statistics.accountNexusReservedTotals.solswap.toString()).toBe('2');
    expect(statistics.accountClaimRows.solswap.map((row) => row.txHash)).toEqual(['0xnewer', '0xolder']);
  });

  it('normalizes comparable SORA addresses and leaves invalid addresses stable', () => {
    const hexAddress = `0x${'11'.repeat(32)}`;

    expect(normalizeSoraAddress('alice')).toBe('alice');
    expect(normalizeSoraAddress(validSoraAddress)).toBe(validSoraAddress);
    expect(normalizeSoraAddress(hexAddress)).toBe(hexAddress);
    expect(isSameSoraAddress(hexAddress, normalizeSoraAddress(hexAddress))).toBe(true);
  });
});
