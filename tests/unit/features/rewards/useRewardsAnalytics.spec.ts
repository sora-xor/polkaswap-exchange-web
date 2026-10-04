import { FPNumber } from '@sora-substrate/sdk';
import { KnownAssets, KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computed, effectScope, nextTick, reactive, ref } from 'vue';

const shared = vi.hoisted(() => ({
  rewards: {} as Record<string, any>,
  wallet: {} as Record<string, any>,
}));

vi.mock('@/stores/rewards', () => ({ useRewardsStore: () => shared.rewards }));
vi.mock('@/stores/wallet', () => ({ useWalletStore: () => shared.wallet }));

import { useRewardsAnalytics } from '@/features/rewards/composables/useRewardsAnalytics';

const PSWAP = KnownAssets.get(KnownSymbols.PSWAP);
const VAL = KnownAssets.get(KnownSymbols.VAL);
const XOR = KnownAssets.get(KnownSymbols.XOR);
const codec = (value: number | string, decimals = 18): string => new FPNumber(value, decimals).toCodecString();

const resetStores = () => {
  const internal = { type: ['Provision', 'LiquidityProvision'], asset: PSWAP, amount: codec(60, PSWAP.decimals) };
  const vested = { limit: codec(20, PSWAP.decimals), total: codec(80, PSWAP.decimals), rewards: [] };
  const external = [{ type: ['External', 'XorErc20'], asset: VAL, amount: codec(10, VAL.decimals) }];

  shared.rewards = reactive({
    internalRewards: internal,
    vestedRewards: vested,
    crowdloanRewards: {},
    externalRewards: external,
    selectedInternal: internal,
    selectedVested: vested,
    selectedCrowdloan: {},
    selectedExternal: external,
    internalRewardsAvailable: true,
    vestedRewardsAvailable: true,
    fee: codec('0.0007', XOR.decimals),
  });
  shared.wallet = reactive({
    fiatPriceObject: {
      [PSWAP.address]: codec(1),
      [VAL.address]: codec(2),
      [XOR.address]: codec(1),
    },
  });
};

const run = (items: Array<{ asset: unknown; amount: string }>) => {
  const scope = effectScope();
  const selected = ref(items);
  const analytics = scope.run(() => useRewardsAnalytics(selected as never))!;

  return { analytics, selected, scope };
};

beforeEach(resetStores);

describe('useRewardsAnalytics', () => {
  it('builds the four sources from the store in their fixed order', () => {
    const { analytics, scope } = run([]);

    expect(analytics.sources.value.map(({ id }) => id)).toEqual(['liquidity', 'strategic', 'external']);
    expect(analytics.breakdown.value.segments.map(({ id, share }) => [id, share])).toEqual([
      ['liquidity', 0.6],
      ['strategic', 0.2],
      ['external', 0.2],
    ]);

    scope.stop();
  });

  it('reflects which sources are ticked for the claim', async () => {
    const { analytics, scope } = run([]);

    expect(analytics.sources.value.map(({ selected }) => selected)).toEqual([true, true, true]);

    shared.rewards.selectedInternal = null;
    shared.rewards.selectedExternal = [];
    await nextTick();

    expect(analytics.sources.value.map(({ selected }) => selected)).toEqual([false, true, false]);

    scope.stop();
  });

  it('measures the unlocked share and what is still locked', () => {
    const { analytics, scope } = run([]);

    // Claimable: 60 + 20 PSWAP and 10 VAL (20 USD) = 100 USD. Locked: 60 PSWAP = 60 USD.
    expect(analytics.unlocked.value.share).toBeCloseTo(100 / 160, 3);
    expect(analytics.unlocked.value.lockedFiat?.toString()).toBe('60');
    expect(analytics.vesting.value.rows.map(({ id }) => id)).toEqual(['strategic']);

    scope.stop();
  });

  it('ranks the tokens of the selected rewards by value', () => {
    const { analytics, scope } = run([
      { asset: PSWAP, amount: '10' },
      { asset: VAL, amount: '100' },
    ]);

    expect(analytics.rankedAssets.value.map((asset) => asset.symbol)).toEqual(['VAL', 'PSWAP']);

    scope.stop();
  });

  it('values the selected claim in fiat only when every token has a price', async () => {
    const { analytics, selected, scope } = run([
      { asset: PSWAP, amount: '10' },
      { asset: VAL, amount: '5' },
    ]);

    expect(analytics.claimFiat.value?.toString()).toBe('20');

    delete (shared.wallet.fiatPriceObject as Record<string, string>)[VAL.address];
    await nextTick();
    expect(analytics.claimFiat.value).toBeNull();

    selected.value = [];
    expect(analytics.claimFiat.value).toBeNull();

    scope.stop();
  });

  it('does not value a claim whose token is not resolved yet', () => {
    // A total that silently leaves one amount out would overstate the fee share.
    const { analytics, scope } = run([
      { asset: PSWAP, amount: '10' },
      { asset: undefined, amount: '5' },
    ]);

    expect(analytics.claimFiat.value).toBeNull();
    expect(analytics.feePercent.value).toBeNull();

    scope.stop();
  });

  it('skips empty amounts when valuing the claim', () => {
    const { analytics, scope } = run([
      { asset: PSWAP, amount: '10' },
      { asset: undefined, amount: '0' },
      { asset: undefined, amount: '' },
    ]);

    expect(analytics.claimFiat.value?.toString()).toBe('10');

    scope.stop();
  });

  it('shows only the ticked crowdloan tags in the claim breakdown', async () => {
    const tag = (name: string, value: number) => ({
      type: ['Crowdloan', name],
      asset: PSWAP,
      amount: codec(value, PSWAP.decimals),
      total: codec(value, PSWAP.decimals),
    });

    shared.rewards.crowdloanRewards = { A: [tag('A', 30)], B: [tag('B', 70)] };
    shared.rewards.selectedCrowdloan = { A: [tag('A', 30)] };

    const { analytics, scope } = run([]);
    const crowdloan = () => analytics.breakdown.value.segments.find(({ id }) => id === 'crowdloan');

    expect(crowdloan()?.amounts[0].amount.toString()).toBe('30');

    shared.rewards.selectedCrowdloan = {};
    await nextTick();
    expect(crowdloan()?.selected).toBe(false);
    expect(crowdloan()?.amounts[0].amount.toString()).toBe('100');

    scope.stop();
  });

  it('compares the network fee with the selected claim', () => {
    const { analytics, scope } = run([{ asset: PSWAP, amount: '70' }]);

    // 0.0007 XOR at 1 USD against a 70 USD claim.
    expect(analytics.feePercent.value?.toString()).toBe('0.001');

    scope.stop();
  });

  it('has no fee share without a fee or a priced claim', async () => {
    const { analytics, scope } = run([{ asset: PSWAP, amount: '70' }]);

    shared.rewards.fee = '';
    await nextTick();
    expect(analytics.feePercent.value).toBeNull();

    scope.stop();
  });

  it('is empty for an account without rewards', async () => {
    Object.assign(shared.rewards, {
      internalRewards: null,
      vestedRewards: null,
      externalRewards: [],
      selectedInternal: null,
      selectedVested: null,
      selectedExternal: [],
    });

    const { analytics, scope } = run([]);

    expect(analytics.sources.value).toEqual([]);
    expect(analytics.breakdown.value.segments).toEqual([]);
    expect(analytics.vesting.value.rows).toEqual([]);
    expect(analytics.unlocked.value).toEqual({ share: null, lockedFiat: null });
    expect(computed(() => analytics.rankedAssets.value).value).toEqual([]);

    scope.stop();
  });
});
