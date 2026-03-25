import { FPNumber } from '@sora-substrate/sdk';
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => {
  const stakingStore = {
    stakingInfo: {
      totalStake: '100',
      activeStake: '50',
      redeemAmount: '5',
      myValidators: ['validator-1'],
    } as any,
    newStakeValidatorsMode: 'recommended' as any,
    minNominatorBond: 1,
    unbondPeriod: 2,
    stakeAmount: '10',
    validatorsInfo: [
      { address: 'validator-1', apy: '12' },
      { address: 'validator-2', apy: '15' },
    ] as any[],
    selectedValidators: [{ address: 'validator-2', apy: '15' }] as any[],
    activeEra: 10,
    activeEraStart: 100,
    currentEra: 11,
    currentEraTotalStake: '1000',
    maxNominations: 16,
    historyDepth: 84,
    accountLedger: {
      active: '5',
      unlocking: [{ era: 12, value: '1' }],
    } as any,
    pendingRewards: [{ sumRewards: '3', validators: [] }] as any,
    validatorsFilter: {
      hasIdentity: false,
      notSlashed: false,
      notOversubscribed: false,
      twoValidatorsPerIdentity: false,
    },
    showValidatorsFilterDialog: false,
    payee: 'Staked',
    controller: 'controller-1',
    totalNominators: 99,
    stash: 'stash-1',
    setStakeAmount: vi.fn(),
    setValidatorsFilter: vi.fn(),
    setShowValidatorsFilterDialog: vi.fn(),
    setValidatorsType: vi.fn(),
    selectValidators: vi.fn(),
    setStakingInfo: vi.fn(),
    setTotalNominators: vi.fn(),
    resetActiveEraUpdates: vi.fn(),
    resetCurrentEraUpdates: vi.fn(),
    resetCurrentEraTotalStakeUpdates: vi.fn(),
    resetControllerUpdates: vi.fn(),
    resetPayeeUpdates: vi.fn(),
    resetNominationsUpdates: vi.fn(),
    resetAccountLedgerUpdates: vi.fn(),
    nominate: vi.fn(async () => undefined),
    bondAndNominate: vi.fn(async () => undefined),
    getBondAndNominateNetworkFee: vi.fn(async () => '1'),
    getNominateNetworkFee: vi.fn(async () => '2'),
    bondExtra: vi.fn(async () => undefined),
    unbond: vi.fn(async () => undefined),
    withdraw: vi.fn(async () => undefined),
    payout: vi.fn(async () => undefined),
    getPayoutNetworkFee: vi.fn(async () => '3'),
    getPendingRewards: vi.fn(async () => undefined),
    getStakingInfo: vi.fn(async () => undefined),
    getValidatorsInfo: vi.fn(async () => undefined),
    getMinNominatorBond: vi.fn(async () => undefined),
    getUnbondPeriod: vi.fn(async () => undefined),
    getMaxNominations: vi.fn(async () => undefined),
    getHistoryDepth: vi.fn(async () => undefined),
    subscribeOnActiveEra: vi.fn(async () => undefined),
    subscribeOnCurrentEra: vi.fn(async () => undefined),
    subscribeOnController: vi.fn(async () => undefined),
    subscribeOnPayee: vi.fn(async () => undefined),
    subscribeOnNominations: vi.fn(async () => undefined),
    subscribeOnAccountLedger: vi.fn(async () => undefined),
    subscribeOnCurrentEraTotalStake: vi.fn(async () => undefined),
  };

  return { stakingStore };
});

vi.mock('@/stores/staking', () => ({
  useStakingStore: () => shared.stakingStore,
}));

vi.mock('@/composables/useFormattedAmount', () => ({
  useFormattedAmount: () => ({
    getAssetFiatPrice: () => '2',
    getFiatAmountByFPNumber: () => '10',
    formatCodecNumber: (value: string) => value,
  }),
}));

vi.mock('@/stores/assets', () => ({
  useAssetsStore: () => ({
    xor: { symbol: 'XOR', decimals: 18, balance: { transferable: '100' } },
    assetDataByAddress: (address?: string) => {
      if (!address) return null;
      return {
        address,
        symbol: address === 'reward' ? 'REWARD' : 'ASSET',
        decimals: 18,
        balance: { transferable: '10' },
      };
    },
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => ({
    networkFees: {
      StakingBond: '1',
    },
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    fiatPriceObject: {
      xor: '1',
    },
  }),
}));

vi.mock('@/utils', async () => {
  const actual = await vi.importActual<typeof import('@/utils')>('@/utils');

  return {
    __esModule: true,
    ...actual,
    getAssetBalance: () => '10',
    hasInsufficientXorForFee: () => false,
    formatDecimalPlaces: () => '10',
  };
});

import { useSoraStaking } from '@/modules/staking/sora/composables/useSoraStaking';

describe('useSoraStaking', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    Object.values(shared.stakingStore).forEach((value) => {
      if (typeof value === 'function' && 'mockClear' in value) {
        value.mockClear();
      }
    });
  });

  it('reads staking data and derived values through the staking store facade', () => {
    const staking = useSoraStaking();

    expect(staking.stash.value).toBe('stash-1');
    expect(staking.stakeAmount.value).toBe('10');
    expect(staking.validators.value).toHaveLength(2);
    expect(staking.selectedValidators.value).toEqual([{ address: 'validator-2', apy: '15' }]);
    expect(staking.maxApy.value).toBe(15);
    expect(staking.unbondPeriodHours.value).toBe(48);
    expect(staking.nextWithdrawalEra.value).toBe(12);
    expect(staking.stakingInitialized.value).toBe(true);
  });

  it('proxies mutations and actions to the staking store facade', async () => {
    const staking = useSoraStaking();
    const validators = [{ address: 'validator-3', apy: '17' }] as any;

    staking.setStakeAmount('20');
    staking.setValidatorsFilter({
      hasIdentity: true,
      notSlashed: true,
      notOversubscribed: false,
      twoValidatorsPerIdentity: true,
    });
    staking.setShowValidatorsFilterDialog(true);
    staking.setValidatorsType('recommended' as any);
    staking.selectValidators(validators);
    staking.setStakingInfo({ totalStake: '20' } as any);
    staking.setTotalNominators(111);
    await staking.getBondAndNominateNetworkFee();
    await staking.getNominateNetworkFee();
    await staking.nominate();
    await staking.subscribeOnCurrentEraTotalStake();
    staking.resetCurrentEraTotalStakeUpdates();

    expect(shared.stakingStore.setStakeAmount).toHaveBeenCalledWith('20');
    expect(shared.stakingStore.setValidatorsFilter).toHaveBeenCalledTimes(1);
    expect(shared.stakingStore.setShowValidatorsFilterDialog).toHaveBeenCalledWith(true);
    expect(shared.stakingStore.setValidatorsType).toHaveBeenCalledWith('recommended');
    expect(shared.stakingStore.selectValidators).toHaveBeenCalledWith(validators);
    expect(shared.stakingStore.setStakingInfo).toHaveBeenCalled();
    expect(shared.stakingStore.setTotalNominators).toHaveBeenCalledWith(111);
    expect(shared.stakingStore.getBondAndNominateNetworkFee).toHaveBeenCalledTimes(1);
    expect(shared.stakingStore.getNominateNetworkFee).toHaveBeenCalledTimes(1);
    expect(shared.stakingStore.nominate).toHaveBeenCalledTimes(1);
    expect(shared.stakingStore.subscribeOnCurrentEraTotalStake).toHaveBeenCalledTimes(1);
    expect(shared.stakingStore.resetCurrentEraTotalStakeUpdates).toHaveBeenCalledTimes(1);
  });
});
