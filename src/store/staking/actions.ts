import { api } from '@soramitsu/soraneo-wallet-web';
import { defineActions } from 'direct-vuex';

import { stakingActionContext } from '@/store/staking';

import type { ValidatorInfo } from '@sora-substrate/util/build/staking/types';
import type { Subscription } from 'rxjs';

const actions = defineActions({
  async bond(context): Promise<void> {
    const { state, getters } = stakingActionContext(context);

    const controller = state.controller || getters.stash;

    if (!state.payee) throw new Error('Payee is not set');

    await api.staking.bond({ controller, value: state.stakeAmount, payee: state.payee });
  },

  async nominate(context, validators: ValidatorInfo[]): Promise<void> {
    const { state } = stakingActionContext(context);

    await api.staking.nominate({ validators: state.selectedValidators.map((v) => v.address) });
  },

  async bondExtra(context): Promise<void> {
    const { state } = stakingActionContext(context);

    await api.staking.bondExtra({ value: state.stakeAmount });
  },

  async unbond(context): Promise<void> {
    const { state } = stakingActionContext(context);

    await api.staking.unbond({ value: state.stakeAmount });
  },

  async withdraw(context, amount: number): Promise<void> {
    await api.staking.withdrawUnbonded({ value: amount });
  },

  async payoutAll(context): Promise<void> {
    const { state } = stakingActionContext(context);

    if (!state.pendingRewards) throw new Error('Pending rewards are not set');

    await api.staking.payout({
      payouts: state.pendingRewards.map((r) => ({ era: r.era, validators: r.validators.map((v) => v.address) })),
    });
  },

  async chill(context): Promise<void> {
    await api.staking.chill();
  },

  async getStakingInfo(context): Promise<void> {
    const { getters, commit } = stakingActionContext(context);

    const stakingInfo = await api.staking.getMyStakingInfo(getters.stash);

    commit.setStakingInfo(stakingInfo);
  },

  async getWannabeValidators(context): Promise<void> {
    const { commit } = stakingActionContext(context);

    const validators = await api.staking.getWannabeValidators();

    commit.setWannabeValidators(validators);
  },

  async getValidatorsInfo(context): Promise<void> {
    const { commit } = stakingActionContext(context);

    const validators = await api.staking.getValidatorsInfo();

    commit.setValidatorsInfo(validators);
  },

  async getPendingRewards(context): Promise<void> {
    const { commit, getters } = stakingActionContext(context);

    const rewards = await api.staking.getNominatorsReward(getters.stash);

    commit.setPendingRewards(rewards);
  },

  async getMinNominatorBond(context): Promise<void> {
    const { commit } = stakingActionContext(context);

    const minNominatorBond = await api.staking.getMinNominatorBond();

    commit.setMinNominatorBond(minNominatorBond);
  },

  async getUnbondPeriod(context): Promise<void> {
    const { commit } = stakingActionContext(context);

    const unbondPeriod = await api.staking.getUnbondPeriod();

    commit.setUnbondPeriod(unbondPeriod);
  },

  async getMaxNominations(context): Promise<void> {
    const { commit } = stakingActionContext(context);

    const maxNominations = await api.staking.getMaxNominations();

    commit.setMaxNominations(maxNominations);
  },

  async subscribeOnActiveEra(context): Promise<void> {
    const { commit } = stakingActionContext(context);

    commit.resetActiveEraUpdates();

    const observable = await api.staking.getActiveEraObservable();

    if (!observable) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = observable.subscribe((era) => {
        commit.setActiveEra(era?.index);
        resolve();
      });
    });

    commit.setActiveEraUpdates(subscription);
  },

  async subscribeOnCurrentEra(context): Promise<void> {
    const { commit } = stakingActionContext(context);

    commit.resetCurrentEraUpdates();

    const observable = await api.staking.getCurrentEraObservable();

    if (!observable) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = observable.subscribe((era) => {
        commit.setCurrentEra(era);
        resolve();
      });
    });

    commit.setCurrentEraUpdates(subscription);
  },

  async subscribeOnCurrentEraTotalStake(context): Promise<void> {
    const { state, commit } = stakingActionContext(context);

    commit.resetCurrentEraTotalStakeUpdates();

    if (!state.currentEra) throw new Error('Current era is not set');

    const observable = await api.staking.getEraTotalStakeObservable(state.currentEra);

    if (!observable) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = observable.subscribe((stake) => {
        commit.setCurrentEraTotalStake(stake);
        resolve();
      });
    });

    commit.setCurrentEraTotalStakeUpdates(subscription);
  },

  async subscribeOnController(context): Promise<void> {
    const { commit, getters } = stakingActionContext(context);

    commit.resetControllerUpdates();

    const observable = await api.staking.getControllerObservable(getters.stash);

    if (!observable) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = observable.subscribe((controller) => {
        commit.setController(controller);
        resolve();
      });
    });

    commit.setControllerUpdates(subscription);
  },

  async subscribeOnPayee(context): Promise<void> {
    const { commit, getters } = stakingActionContext(context);

    commit.resetPayeeUpdates();

    const observable = await api.staking.getPayeeObservable(getters.stash);

    if (!observable) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = observable.subscribe((payee) => {
        commit.setPayee(payee);
        resolve();
      });
    });

    commit.setPayeeUpdates(subscription);
  },

  async subscribeOnNominations(context): Promise<void> {
    const { getters, commit } = stakingActionContext(context);

    commit.resetNominationsUpdates();

    const observable = await api.staking.getNominationsObservable(getters.stash);

    if (!observable) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = observable.subscribe((nominations) => {
        commit.setNominations(nominations);
        resolve();
      });
    });

    commit.setNominationsUpdates(subscription);
  },

  async subscribeOnAccountLedger(context): Promise<void> {
    const { getters, commit } = stakingActionContext(context);

    commit.resetAccountLedgerUpdates();

    const observable = await api.staking.getAccountLedgerObservable(getters.stash);

    if (!observable) return;

    let subscription!: Subscription;

    await new Promise<void>((resolve) => {
      subscription = observable.subscribe((ledger) => {
        commit.setAccountLedger(ledger);
        resolve();
      });
    });

    commit.setAccountLedgerUpdates(subscription);
  },
});

export default actions;
