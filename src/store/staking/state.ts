import { emptyValidatorsFilter } from '@/modules/staking/sora/consts';

import type { StakingState } from './types';

function initialState(): StakingState {
  return {
    stakeAmount: '0',
    newStakeValidatorsMode: null,

    validatorsFilter: { ...emptyValidatorsFilter },
    showValidatorsFilterDialog: false,

    wannabeValidators: [],
    validatorsInfo: [],
    selectedValidators: [],

    pendingRewards: null,

    minNominatorBond: null,
    unbondPeriod: null,
    maxNominations: null,
    historyDepth: null,

    totalNominators: null,

    activeEra: null,
    activeEraUpdates: null,

    activeEraStart: null,

    currentEra: null,
    currentEraUpdates: null,

    currentEraTotalStake: null,
    currentEraTotalStakeUpdates: null,

    stakingInfo: null,

    controller: null,
    controllerUpdates: null,

    payee: null,
    payeeUpdates: null,

    nominations: null,
    nominationsUpdates: null,

    accountLedger: null,
    accountLedgerUpdates: null,
  };
}

const state = initialState();

export default state;
