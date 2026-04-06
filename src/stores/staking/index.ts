import { defineStore } from 'pinia';

import { ZeroStringValue } from '@/consts';
import { api } from '@/shims/wallet-api';
import { emptyValidatorsFilter, ValidatorsListMode } from '@/modules/staking/sora/consts';
import type { ValidatorsFilter } from '@/modules/staking/sora/types';
import type { StakingState } from '@/stores/staking/types';
import { useWalletStore } from '@/stores/wallet';

import type { Nullable } from '@/types/common';
import type { CodecString } from '@sora-substrate/sdk';
import type {
  AccountStakingLedger,
  ActiveEra,
  MyStakingInfo,
  NominatorReward,
  Payouts,
  StashNominatorsInfo,
  ValidatorInfo,
  ValidatorInfoFull,
} from '@sora-substrate/sdk/build/staking/types';
import type { Subscription } from 'rxjs';

const buildInitialState = (): StakingState => ({
  stakeAmount: ZeroStringValue,
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
});

const unsubscribe = (subscription: Nullable<Subscription>): null => {
  subscription?.unsubscribe();
  return null;
};

const StakingApiNotReadyError = 'Staking API is not ready';

const getConnectedChainApi = (): { isReady?: unknown } | null => {
  const connectionApi = (api as { connection?: { api?: { isReady?: unknown } | null } }).connection?.api;

  if (connectionApi?.isReady) return connectionApi;

  const directApi = (api as { api?: { isReady?: unknown } | null }).api;

  if (directApi?.isReady) return directApi;

  return null;
};

const waitForStakingApiReady = async (): Promise<boolean> => {
  const chainApi = getConnectedChainApi();

  if (!chainApi?.isReady) return false;

  if (typeof (chainApi.isReady as PromiseLike<unknown>).then === 'function') {
    await chainApi.isReady;
  }

  return true;
};

const subscribeWithInitialValue = async <T>(
  observable: Nullable<{ subscribe: (handler: (value: T) => void) => Subscription }>
): Promise<{ subscription: Subscription; firstValue: T } | null> => {
  if (!observable) return null;

  let subscription!: Subscription;

  return await new Promise((resolve) => {
    subscription = observable.subscribe((value: T) => {
      resolve({ subscription, firstValue: value });
    });
  });
};

/**
 * Native Pinia store for SORA staking state and subscriptions.
 * Replaces the transitional Vuex-backed facade while preserving the public store API.
 */
export const useStakingStore = defineStore('staking-legacy', {
  state: (): StakingState => buildInitialState(),
  getters: {
    stash(): string {
      const walletStore = useWalletStore();
      return walletStore.account?.address ?? walletStore.address ?? '';
    },
  },
  actions: {
    setStakeAmount(value: string): void {
      this.stakeAmount = value;
    },
    setValidatorsFilter(value: ValidatorsFilter): void {
      this.validatorsFilter = { ...value };
    },
    setShowValidatorsFilterDialog(value: boolean): void {
      this.showValidatorsFilterDialog = value;
    },
    setValidatorsType(value: ValidatorsListMode): void {
      this.newStakeValidatorsMode = value;
    },
    setWannabeValidators(validators: ValidatorInfo[]): void {
      this.wannabeValidators = Object.freeze([...validators]);
    },
    setValidatorsInfo(validators: ValidatorInfoFull[]): void {
      this.$state.validatorsInfo = Object.freeze([...validators]) as readonly ValidatorInfoFull[];
    },
    selectValidators(validators: ValidatorInfoFull[]): void {
      this.$state.selectedValidators = Object.freeze([...validators]) as readonly ValidatorInfoFull[];
    },
    setPendingRewards(rewards: NominatorReward): void {
      this.pendingRewards = rewards;
    },
    setMinNominatorBond(value: number): void {
      this.minNominatorBond = value;
    },
    setUnbondPeriod(value: number): void {
      this.unbondPeriod = value;
    },
    setTotalNominators(value: number): void {
      this.totalNominators = value;
    },
    setActiveEra(era: ActiveEra): void {
      this.activeEra = era.index;
      this.activeEraStart = era.start;
    },
    resetActiveEraUpdates(): void {
      this.activeEraUpdates = unsubscribe(this.activeEraUpdates);
    },
    setCurrentEra(value: number): void {
      this.currentEra = value;
    },
    resetCurrentEraUpdates(): void {
      this.currentEraUpdates = unsubscribe(this.currentEraUpdates);
    },
    setCurrentEraTotalStake(value: string): void {
      this.currentEraTotalStake = value;
    },
    resetCurrentEraTotalStakeUpdates(): void {
      this.currentEraTotalStakeUpdates = unsubscribe(this.currentEraTotalStakeUpdates);
    },
    setMaxNominations(value: number): void {
      this.maxNominations = value;
    },
    setHistoryDepth(value: number): void {
      this.historyDepth = value;
    },
    setStakingInfo(info: MyStakingInfo): void {
      this.stakingInfo = info;
    },
    setController(value: Nullable<string>): void {
      this.controller = value;
    },
    resetControllerUpdates(): void {
      this.controllerUpdates = unsubscribe(this.controllerUpdates);
    },
    setPayee(value: Nullable<string>): void {
      this.payee = value;
    },
    resetPayeeUpdates(): void {
      this.payeeUpdates = unsubscribe(this.payeeUpdates);
    },
    setNominations(value: Nullable<StashNominatorsInfo>): void {
      this.nominations = value;
    },
    resetNominationsUpdates(): void {
      this.nominationsUpdates = unsubscribe(this.nominationsUpdates);
    },
    setAccountLedger(value: Nullable<AccountStakingLedger>): void {
      this.accountLedger = value;
    },
    resetAccountLedgerUpdates(): void {
      this.accountLedgerUpdates = unsubscribe(this.accountLedgerUpdates);
    },
    async nominate(): Promise<void> {
      if (!(await waitForStakingApiReady())) {
        throw new Error(StakingApiNotReadyError);
      }
      await api.staking.nominate({
        validators: this.selectedValidators.map((validator) => validator.address),
      });

      await this.getStakingInfo();
    },
    async getNominateNetworkFee(): Promise<CodecString> {
      if (!(await waitForStakingApiReady())) return ZeroStringValue as CodecString;

      return await api.staking.getNominateNetworkFee({
        validators: this.selectedValidators.map((validator) => validator.address),
      });
    },
    async bondAndNominate(): Promise<void> {
      if (!(await waitForStakingApiReady())) {
        throw new Error(StakingApiNotReadyError);
      }

      const controller = this.controller || this.stash;

      if (!this.payee) throw new Error('Payee is not set');

      const selectedValidators = this.selectedValidators.map((validator) => validator.address);

      await api.staking.bondAndNominate({
        controller,
        value: this.stakeAmount,
        payee: this.payee,
        validators: selectedValidators,
      });

      this.setStakingInfo({
        myValidators: selectedValidators,
        payee: this.payee,
        controller,
        redeemAmount: ZeroStringValue,
        activeStake: this.stakeAmount,
        totalStake: this.stakeAmount,
        unbond: {
          unlocking: [],
          sum: ZeroStringValue,
        },
      } as MyStakingInfo);
    },
    async getBondAndNominateNetworkFee(): Promise<CodecString> {
      if (!(await waitForStakingApiReady())) return ZeroStringValue as CodecString;

      const controller = this.controller || this.stash;

      return await api.staking.getBondAndNominateNetworkFee({
        controller,
        value: this.stakeAmount,
        payee: this.payee || this.stash,
        validators: this.selectedValidators.map((validator) => validator.address),
      });
    },
    async bondExtra(): Promise<void> {
      if (!(await waitForStakingApiReady())) {
        throw new Error(StakingApiNotReadyError);
      }
      await api.staking.bondExtra({ value: this.stakeAmount });
    },
    async unbond(): Promise<void> {
      if (!(await waitForStakingApiReady())) {
        throw new Error(StakingApiNotReadyError);
      }
      await api.staking.unbond({ value: this.stakeAmount });
    },
    async withdraw(value: number): Promise<void> {
      if (!(await waitForStakingApiReady())) {
        throw new Error(StakingApiNotReadyError);
      }
      await api.staking.withdrawUnbonded({ value });
    },
    async payout(args: { payouts: Payouts; payee?: string }): Promise<void> {
      if (!(await waitForStakingApiReady())) {
        throw new Error(StakingApiNotReadyError);
      }
      await api.staking.payout(args);
    },
    async getPayoutNetworkFee(args: { payouts: Payouts; payee?: string }): Promise<CodecString> {
      if (!(await waitForStakingApiReady())) return ZeroStringValue as CodecString;

      return await api.staking.getPayoutNetworkFee(args);
    },
    async getStakingInfo(): Promise<void> {
      if (!(await waitForStakingApiReady())) return;

      this.setStakingInfo(await api.staking.getMyStakingInfo(this.stash));
    },
    async getValidatorsInfo(): Promise<void> {
      if (!(await waitForStakingApiReady())) return;

      this.setValidatorsInfo(await api.staking.getValidatorsInfo());
    },
    async getPendingRewards(): Promise<void> {
      if (!(await waitForStakingApiReady())) return;

      this.setPendingRewards(await api.staking.getNominatorsReward(this.stash));
    },
    async getMinNominatorBond(): Promise<void> {
      if (!(await waitForStakingApiReady())) return;

      this.setMinNominatorBond(await api.staking.getMinNominatorBond());
    },
    async getUnbondPeriod(): Promise<void> {
      if (!(await waitForStakingApiReady())) return;

      this.setUnbondPeriod(api.staking.getUnbondPeriod());
    },
    async getMaxNominations(): Promise<void> {
      if (!(await waitForStakingApiReady())) return;

      this.setMaxNominations(api.staking.getMaxNominations());
    },
    async getHistoryDepth(): Promise<void> {
      if (!(await waitForStakingApiReady())) return;

      this.setHistoryDepth(api.staking.getHistoryDepth());
    },
    async subscribeOnActiveEra(): Promise<void> {
      this.resetActiveEraUpdates();

      if (!(await waitForStakingApiReady())) return;

      const payload = await subscribeWithInitialValue(api.staking.getActiveEraObservable());
      if (!payload) return;

      if (payload.firstValue) {
        this.setActiveEra(payload.firstValue);
      }

      this.activeEraUpdates = payload.subscription;
    },
    async subscribeOnCurrentEra(): Promise<void> {
      this.resetCurrentEraUpdates();

      if (!(await waitForStakingApiReady())) return;

      const payload = await subscribeWithInitialValue(api.staking.getCurrentEraObservable());
      if (!payload) return;

      this.setCurrentEra(payload.firstValue);
      this.currentEraUpdates = payload.subscription;
    },
    async subscribeOnCurrentEraTotalStake(): Promise<void> {
      this.resetCurrentEraTotalStakeUpdates();

      if (!(await waitForStakingApiReady())) return;

      if (this.currentEra === undefined || this.currentEra === null) {
        throw new Error('Current era is not set');
      }

      const payload = await subscribeWithInitialValue(api.staking.getEraTotalStakeObservable(this.currentEra));
      if (!payload) return;

      this.setCurrentEraTotalStake(payload.firstValue);
      this.currentEraTotalStakeUpdates = payload.subscription;
    },
    async subscribeOnController(): Promise<void> {
      this.resetControllerUpdates();

      if (!(await waitForStakingApiReady())) return;

      const payload = await subscribeWithInitialValue(api.staking.getControllerObservable(this.stash));
      if (!payload) return;

      this.setController(payload.firstValue);
      this.controllerUpdates = payload.subscription;
    },
    async subscribeOnPayee(): Promise<void> {
      this.resetPayeeUpdates();

      if (!(await waitForStakingApiReady())) return;

      const payload = await subscribeWithInitialValue(api.staking.getPayeeObservable(this.stash));
      if (!payload) return;

      this.setPayee(payload.firstValue);
      this.payeeUpdates = payload.subscription;
    },
    async subscribeOnNominations(): Promise<void> {
      this.resetNominationsUpdates();

      if (!(await waitForStakingApiReady())) return;

      const payload = await subscribeWithInitialValue(api.staking.getNominationsObservable(this.stash));
      if (!payload) return;

      this.setNominations(payload.firstValue);
      this.nominationsUpdates = payload.subscription;
    },
    async subscribeOnAccountLedger(): Promise<void> {
      this.resetAccountLedgerUpdates();

      if (!(await waitForStakingApiReady())) return;

      const payload = await subscribeWithInitialValue(api.staking.getAccountLedgerObservable(this.stash));
      if (!payload) return;

      this.setAccountLedger(payload.firstValue);
      this.accountLedgerUpdates = payload.subscription;
    },
  },
});

export type StakingStore = ReturnType<typeof useStakingStore>;
