import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => {
  const walletStore = {
    address: 'stash-1',
    account: {
      address: 'stash-1',
    },
  };

  const activeEraUnsubscribe = vi.fn();
  const currentEraUnsubscribe = vi.fn();
  const totalStakeUnsubscribe = vi.fn();
  const controllerUnsubscribe = vi.fn();
  const payeeUnsubscribe = vi.fn();
  const nominationsUnsubscribe = vi.fn();
  const accountLedgerUnsubscribe = vi.fn();

  const nominate = vi.fn(async () => undefined);
  const bondAndNominate = vi.fn(async () => undefined);
  const getBondAndNominateNetworkFee = vi.fn(async () => '1');
  const getNominateNetworkFee = vi.fn(async () => '2');
  const bondExtra = vi.fn(async () => undefined);
  const unbond = vi.fn(async () => undefined);
  const withdrawUnbonded = vi.fn(async () => undefined);
  const payout = vi.fn(async () => undefined);
  const getPayoutNetworkFee = vi.fn(async () => '3');
  const getMyStakingInfo = vi.fn(async () => ({
    totalStake: '10',
    activeStake: '5',
    redeemAmount: '1',
    myValidators: ['validator-1'],
  }));
  const getValidatorsInfo = vi.fn(async () => [{ address: 'validator-1', apy: '10' }]);
  const getNominatorsReward = vi.fn(async () => [{ era: 1 }]);
  const getMinNominatorBond = vi.fn(async () => 1);
  const getUnbondPeriod = vi.fn(() => 7);
  const getMaxNominations = vi.fn(() => 16);
  const getHistoryDepth = vi.fn(() => 84);
  const getActiveEraObservable = vi.fn(() => ({
    subscribe: (callback: (value: { index: number; start: number }) => void) => {
      callback({ index: 10, start: 100 });
      return { unsubscribe: activeEraUnsubscribe };
    },
  }));
  const getCurrentEraObservable = vi.fn(() => ({
    subscribe: (callback: (value: number) => void) => {
      callback(11);
      return { unsubscribe: currentEraUnsubscribe };
    },
  }));
  const getEraTotalStakeObservable = vi.fn(() => ({
    subscribe: (callback: (value: string) => void) => {
      callback('1000');
      return { unsubscribe: totalStakeUnsubscribe };
    },
  }));
  const getControllerObservable = vi.fn(() => ({
    subscribe: (callback: (value: string) => void) => {
      callback('controller-1');
      return { unsubscribe: controllerUnsubscribe };
    },
  }));
  const getPayeeObservable = vi.fn(() => ({
    subscribe: (callback: (value: string) => void) => {
      callback('payee-1');
      return { unsubscribe: payeeUnsubscribe };
    },
  }));
  const getNominationsObservable = vi.fn(() => ({
    subscribe: (callback: (value: Record<string, unknown>) => void) => {
      callback({ targets: ['validator-1'] });
      return { unsubscribe: nominationsUnsubscribe };
    },
  }));
  const getAccountLedgerObservable = vi.fn(() => ({
    subscribe: (callback: (value: Record<string, unknown>) => void) => {
      callback({ active: '5' });
      return { unsubscribe: accountLedgerUnsubscribe };
    },
  }));

  return {
    walletStore,
    activeEraUnsubscribe,
    currentEraUnsubscribe,
    totalStakeUnsubscribe,
    controllerUnsubscribe,
    payeeUnsubscribe,
    nominationsUnsubscribe,
    accountLedgerUnsubscribe,
    nominate,
    bondAndNominate,
    getBondAndNominateNetworkFee,
    getNominateNetworkFee,
    bondExtra,
    unbond,
    withdrawUnbonded,
    payout,
    getPayoutNetworkFee,
    getMyStakingInfo,
    getValidatorsInfo,
    getNominatorsReward,
    getMinNominatorBond,
    getUnbondPeriod,
    getMaxNominations,
    getHistoryDepth,
    getActiveEraObservable,
    getCurrentEraObservable,
    getEraTotalStakeObservable,
    getControllerObservable,
    getPayeeObservable,
    getNominationsObservable,
    getAccountLedgerObservable,
  };
});

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => shared.walletStore,
}));

vi.mock('@wallet', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');

  return createWalletMock({
    api: {
      staking: {
        nominate: shared.nominate,
        bondAndNominate: shared.bondAndNominate,
        getBondAndNominateNetworkFee: shared.getBondAndNominateNetworkFee,
        getNominateNetworkFee: shared.getNominateNetworkFee,
        bondExtra: shared.bondExtra,
        unbond: shared.unbond,
        withdrawUnbonded: shared.withdrawUnbonded,
        payout: shared.payout,
        getPayoutNetworkFee: shared.getPayoutNetworkFee,
        getMyStakingInfo: shared.getMyStakingInfo,
        getValidatorsInfo: shared.getValidatorsInfo,
        getNominatorsReward: shared.getNominatorsReward,
        getMinNominatorBond: shared.getMinNominatorBond,
        getUnbondPeriod: shared.getUnbondPeriod,
        getMaxNominations: shared.getMaxNominations,
        getHistoryDepth: shared.getHistoryDepth,
        getActiveEraObservable: shared.getActiveEraObservable,
        getCurrentEraObservable: shared.getCurrentEraObservable,
        getEraTotalStakeObservable: shared.getEraTotalStakeObservable,
        getControllerObservable: shared.getControllerObservable,
        getPayeeObservable: shared.getPayeeObservable,
        getNominationsObservable: shared.getNominationsObservable,
        getAccountLedgerObservable: shared.getAccountLedgerObservable,
      },
    },
  });
});

import { useStakingStore } from '@/stores/staking';

describe('staking store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    shared.walletStore.address = 'stash-1';
    shared.walletStore.account = { address: 'stash-1' };
    shared.activeEraUnsubscribe.mockClear();
    shared.currentEraUnsubscribe.mockClear();
    shared.totalStakeUnsubscribe.mockClear();
    shared.controllerUnsubscribe.mockClear();
    shared.payeeUnsubscribe.mockClear();
    shared.nominationsUnsubscribe.mockClear();
    shared.accountLedgerUnsubscribe.mockClear();
    shared.nominate.mockClear();
    shared.bondAndNominate.mockClear();
    shared.getBondAndNominateNetworkFee.mockClear();
    shared.getNominateNetworkFee.mockClear();
    shared.bondExtra.mockClear();
    shared.unbond.mockClear();
    shared.withdrawUnbonded.mockClear();
    shared.payout.mockClear();
    shared.getPayoutNetworkFee.mockClear();
    shared.getMyStakingInfo.mockClear();
    shared.getValidatorsInfo.mockClear();
    shared.getNominatorsReward.mockClear();
    shared.getMinNominatorBond.mockClear();
    shared.getUnbondPeriod.mockClear();
    shared.getMaxNominations.mockClear();
    shared.getHistoryDepth.mockClear();
    shared.getActiveEraObservable.mockClear();
    shared.getCurrentEraObservable.mockClear();
    shared.getEraTotalStakeObservable.mockClear();
    shared.getControllerObservable.mockClear();
    shared.getPayeeObservable.mockClear();
    shared.getNominationsObservable.mockClear();
    shared.getAccountLedgerObservable.mockClear();
  });

  it('reads local staking state and stash through Pinia', () => {
    const store = useStakingStore();

    store.setStakeAmount('15');
    store.setValidatorsFilter({
      hasIdentity: true,
      notSlashed: false,
      notOversubscribed: true,
      twoValidatorsPerIdentity: false,
    });
    store.setShowValidatorsFilterDialog(true);
    store.setValidatorsType('select' as any);
    store.setValidatorsInfo([{ address: 'validator-1', apy: '10' }] as any);
    store.selectValidators([{ address: 'validator-2', apy: '11' }] as any);
    store.setStakingInfo({ totalStake: '10' } as any);
    store.setTotalNominators(99);
    store.setMinNominatorBond(1);
    store.setUnbondPeriod(7);
    store.setMaxNominations(16);
    store.setHistoryDepth(84);
    store.setActiveEra({ index: 10, start: 100 } as any);
    store.setCurrentEra(11);
    store.setCurrentEraTotalStake('1000');
    store.setPendingRewards([{ era: 1 }] as any);
    store.setPayee('payee-1');
    store.setController('controller-1');
    store.setNominations({ targets: ['validator-1'] } as any);
    store.setAccountLedger({ active: '5' } as any);

    expect(store.stash).toBe('stash-1');
    expect(store.stakeAmount).toBe('15');
    expect(store.validatorsFilter).toEqual({
      hasIdentity: true,
      notSlashed: false,
      notOversubscribed: true,
      twoValidatorsPerIdentity: false,
    });
    expect(store.showValidatorsFilterDialog).toBe(true);
    expect(store.newStakeValidatorsMode).toBe('select');
    expect(store.validatorsInfo).toEqual([{ address: 'validator-1', apy: '10' }]);
    expect(store.selectedValidators).toEqual([{ address: 'validator-2', apy: '11' }]);
    expect(store.stakingInfo).toEqual({ totalStake: '10' });
    expect(store.totalNominators).toBe(99);
    expect(store.minNominatorBond).toBe(1);
    expect(store.unbondPeriod).toBe(7);
    expect(store.maxNominations).toBe(16);
    expect(store.historyDepth).toBe(84);
    expect(store.activeEra).toBe(10);
    expect(store.activeEraStart).toBe(100);
    expect(store.currentEra).toBe(11);
    expect(store.currentEraTotalStake).toBe('1000');
    expect(store.pendingRewards).toEqual([{ era: 1 }]);
    expect(store.payee).toBe('payee-1');
    expect(store.controller).toBe('controller-1');
    expect(store.nominations).toEqual({ targets: ['validator-1'] });
    expect(store.accountLedger).toEqual({ active: '5' });
  });

  it('routes staking api actions through the native store', async () => {
    const store = useStakingStore();
    store.selectValidators([{ address: 'validator-3', apy: '12' }] as any);
    store.setStakeAmount('20');
    store.setPayee('payee-1');
    store.setController('controller-1');
    const payouts = [{ era: 1, validators: ['validator-1'] }] as any;

    await store.nominate();
    await store.bondAndNominate();
    expect(store.stakingInfo).toEqual({
      myValidators: ['validator-3'],
      payee: 'payee-1',
      controller: 'controller-1',
      redeemAmount: '0',
      activeStake: '20',
      totalStake: '20',
      unbond: { unlocking: [], sum: '0' },
    });
    await expect(store.getBondAndNominateNetworkFee()).resolves.toBe('1');
    await expect(store.getNominateNetworkFee()).resolves.toBe('2');
    await store.bondExtra();
    await store.unbond();
    await store.withdraw(2);
    await store.payout({ payouts, payee: 'payee-1' });
    await expect(store.getPayoutNetworkFee({ payouts, payee: 'payee-1' })).resolves.toBe('3');

    expect(shared.nominate).toHaveBeenCalledWith({ validators: ['validator-3'] });
    expect(shared.getMyStakingInfo).toHaveBeenCalledWith('stash-1');
    expect(shared.bondAndNominate).toHaveBeenCalledWith({
      controller: 'controller-1',
      value: '20',
      payee: 'payee-1',
      validators: ['validator-3'],
    });
    expect(shared.getBondAndNominateNetworkFee).toHaveBeenCalledTimes(1);
    expect(shared.getNominateNetworkFee).toHaveBeenCalledTimes(1);
    expect(shared.bondExtra).toHaveBeenCalledWith({ value: '20' });
    expect(shared.unbond).toHaveBeenCalledWith({ value: '20' });
    expect(shared.withdrawUnbonded).toHaveBeenCalledWith({ value: 2 });
    expect(shared.payout).toHaveBeenCalledWith({ payouts, payee: 'payee-1' });
    expect(shared.getPayoutNetworkFee).toHaveBeenCalledWith({ payouts, payee: 'payee-1' });
  });

  it('loads staking snapshots and manages live subscriptions locally', async () => {
    const store = useStakingStore();

    store.activeEraUpdates = { unsubscribe: shared.activeEraUnsubscribe } as any;
    store.currentEraUpdates = { unsubscribe: shared.currentEraUnsubscribe } as any;
    store.currentEraTotalStakeUpdates = { unsubscribe: shared.totalStakeUnsubscribe } as any;
    store.controllerUpdates = { unsubscribe: shared.controllerUnsubscribe } as any;
    store.payeeUpdates = { unsubscribe: shared.payeeUnsubscribe } as any;
    store.nominationsUpdates = { unsubscribe: shared.nominationsUnsubscribe } as any;
    store.accountLedgerUpdates = { unsubscribe: shared.accountLedgerUnsubscribe } as any;

    await store.getStakingInfo();
    await store.getValidatorsInfo();
    await store.getPendingRewards();
    await store.getMinNominatorBond();
    await store.getUnbondPeriod();
    await store.getMaxNominations();
    await store.getHistoryDepth();
    await store.subscribeOnActiveEra();
    await store.subscribeOnCurrentEra();
    await store.subscribeOnCurrentEraTotalStake();
    await store.subscribeOnController();
    await store.subscribeOnPayee();
    await store.subscribeOnNominations();
    await store.subscribeOnAccountLedger();

    expect(store.stakingInfo).toEqual({
      totalStake: '10',
      activeStake: '5',
      redeemAmount: '1',
      myValidators: ['validator-1'],
    });
    expect(store.validatorsInfo).toEqual([{ address: 'validator-1', apy: '10' }]);
    expect(store.pendingRewards).toEqual([{ era: 1 }]);
    expect(store.minNominatorBond).toBe(1);
    expect(store.unbondPeriod).toBe(7);
    expect(store.maxNominations).toBe(16);
    expect(store.historyDepth).toBe(84);
    expect(store.activeEra).toBe(10);
    expect(store.activeEraStart).toBe(100);
    expect(store.currentEra).toBe(11);
    expect(store.currentEraTotalStake).toBe('1000');
    expect(store.controller).toBe('controller-1');
    expect(store.payee).toBe('payee-1');
    expect(store.nominations).toEqual({ targets: ['validator-1'] });
    expect(store.accountLedger).toEqual({ active: '5' });
    expect(shared.activeEraUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.currentEraUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.totalStakeUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.controllerUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.payeeUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.nominationsUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.accountLedgerUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
