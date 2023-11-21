import { defineMutations } from 'direct-vuex';

import { ValidatorsListMode } from '@/modules/staking/sora/consts';

import type { StakingState } from './types';
import type {
  MyStakingInfo,
  ValidatorInfo,
  ValidatorInfoFull,
  StashNominatorsInfo,
  AccountStakingLedger,
  NominatorReward,
} from '@sora-substrate/util/build/staking/types';
import type { Subscription } from 'rxjs';

const mutations = defineMutations<StakingState>()({
  setStakeAmount(state, amount: string): void {
    state.stakeAmount = amount;
  },

  setValidatorsType(state, validatorsType: ValidatorsListMode.RECOMMENDED | ValidatorsListMode.SELECT): void {
    state.newStakeValidatorsMode = validatorsType;
  },
  setWannabeValidators(state, wannabeValidators: ValidatorInfo[]): void {
    state.wannabeValidators = Object.freeze([...wannabeValidators]);
  },
  setValidatorsInfo(state, validatorsInfo: ValidatorInfoFull[]): void {
    state.validatorsInfo = Object.freeze([...validatorsInfo]);
  },
  selectValidators(state, validators: ValidatorInfo[]): void {
    state.selectedValidators = Object.freeze([...validators]);
  },

  setPendingRewards(state, rewards: NominatorReward): void {
    state.pendingRewards = rewards;
  },

  setMinNominatorBond(state, minNominatorBond: number): void {
    state.minNominatorBond = minNominatorBond;
  },

  setUnbondPeriod(state, unbondPeriod: number): void {
    state.unbondPeriod = unbondPeriod;
  },

  setTotalNominators(state, totalNominators: number): void {
    state.totalNominators = totalNominators;
  },

  setActiveEra(state, era: Nullable<number>): void {
    state.activeEra = era;
  },
  setActiveEraUpdates(state, updates: Subscription): void {
    state.activeEraUpdates = updates;
  },
  resetActiveEraUpdates(state): void {
    state.activeEraUpdates?.unsubscribe();
    state.activeEraUpdates = null;
  },

  setCurrentEra(state, era: number): void {
    state.currentEra = era;
  },
  setCurrentEraUpdates(state, updates: Subscription): void {
    state.currentEraUpdates = updates;
  },
  resetCurrentEraUpdates(state): void {
    state.currentEraUpdates?.unsubscribe();
    state.currentEraUpdates = null;
  },

  setCurrentEraTotalStake(state, stake: string): void {
    state.currentEraTotalStake = stake;
  },
  setCurrentEraTotalStakeUpdates(state, updates: Subscription): void {
    state.currentEraTotalStakeUpdates = updates;
  },
  resetCurrentEraTotalStakeUpdates(state): void {
    state.currentEraTotalStakeUpdates?.unsubscribe();
    state.currentEraTotalStakeUpdates = null;
  },

  setMaxNominations(state, count: number): void {
    state.maxNominations = count;
  },

  setStakingInfo(state, info: MyStakingInfo): void {
    state.stakingInfo = info;
  },

  setController(state, controller: Nullable<string>): void {
    state.controller = controller;
  },
  setControllerUpdates(state, updates: Subscription): void {
    state.controllerUpdates = updates;
  },
  resetControllerUpdates(state): void {
    state.controllerUpdates?.unsubscribe();
    state.controllerUpdates = null;
  },

  setPayee(state, payee: Nullable<string>): void {
    state.payee = payee;
  },
  setPayeeUpdates(state, updates: Subscription): void {
    state.payeeUpdates = updates;
  },
  resetPayeeUpdates(state): void {
    state.payeeUpdates?.unsubscribe();
    state.payeeUpdates = null;
  },

  setNominations(state, nominations: Nullable<StashNominatorsInfo>): void {
    state.nominations = nominations;
  },
  setNominationsUpdates(state, updates: Subscription): void {
    state.nominationsUpdates = updates;
  },
  resetNominationsUpdates(state): void {
    state.nominationsUpdates?.unsubscribe();
    state.nominationsUpdates = null;
  },

  setAccountLedger(state, nominations: Nullable<AccountStakingLedger>): void {
    state.accountLedger = nominations;
  },
  setAccountLedgerUpdates(state, updates: Subscription): void {
    state.accountLedgerUpdates = updates;
  },
  resetAccountLedgerUpdates(state): void {
    state.accountLedgerUpdates?.unsubscribe();
    state.accountLedgerUpdates = null;
  },
});

export default mutations;
