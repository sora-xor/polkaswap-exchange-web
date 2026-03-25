import { defineStore } from 'pinia';

import { KnownAssets, KnownSymbols } from '@sora-substrate/sdk/build/assets/consts';
import { ethers } from 'ethers';

import type { RewardsAmountHeaderItem, SelectedRewards } from '@/types/rewards';
import { api } from '@/shims/wallet-api';
import { groupRewardsByAssetsList } from '@/shims/wallet-util';
import { asZeroValue, waitForAccountPair } from '@/utils';
import { useWalletStore } from '@/stores/wallet';
import { useWeb3Store } from '@/stores/web3';
import { initialState } from '@/stores/rewards/state';
import type { ClaimRewardsParams, RewardsState } from '@/stores/rewards/types';
import ethersUtil from '@/utils/ethers-util';

import type { CodecString } from '@sora-substrate/sdk';
import type { RewardInfo, RewardsInfo } from '@sora-substrate/sdk/build/rewards/types';
import type { Subscription } from 'rxjs';

type RewardsStoreLike = RewardsState & {
  crowdloanRewardsAvailable: string[];
  internalRewardsAvailable: boolean;
  vestedRewardsAvailable: boolean;
  setSelectedRewards: (value: SelectedRewards) => Promise<void>;
};

const createRewardsStoreShape = () => ({
  ...initialState(),
});

const getInitialSelection = (store: RewardsStoreLike): Record<string, RewardInfo[]> => {
  return store.crowdloanRewardsAvailable.reduce<Record<string, RewardInfo[]>>((buffer, tag) => {
    buffer[tag] = store.crowdloanRewards[tag];
    return buffer;
  }, {});
};

const pruneSelectedCrowdloanRewards = (store: RewardsStoreLike): Record<string, RewardInfo[]> => {
  return Object.entries(store.selectedCrowdloan).reduce<Record<string, RewardInfo[]>>((buffer, [tag, rewards]) => {
    if (store.crowdloanRewardsAvailable.includes(tag)) {
      buffer[tag] = rewards;
    }

    return buffer;
  }, {});
};

const resolveLiquidityProvisionRewardsSubscription = async (store: RewardsStoreLike): Promise<Subscription> => {
  let subscription!: Subscription;

  await new Promise<void>((resolve) => {
    subscription = api.rewards.getLiquidityProvisionRewardsSubscription().subscribe((internalRewards) => {
      store.internalRewards = internalRewards;

      if (!store.liquidityProvisionRewardsSubscription && store.internalRewardsAvailable) {
        void store.setSelectedRewards({ selectedInternal: internalRewards });
      }

      if (store.selectedInternal && !store.internalRewardsAvailable) {
        void store.setSelectedRewards({ selectedInternal: null });
      }

      resolve();
    });
  });

  return subscription;
};

const resolveVestedRewardsSubscription = async (store: RewardsStoreLike): Promise<Subscription> => {
  let subscription!: Subscription;

  await new Promise<void>((resolve) => {
    subscription = api.rewards.getVestedRewardsSubscription().subscribe((vestedRewards) => {
      store.vestedRewards = vestedRewards;

      if (!store.vestedRewardsSubscription && store.vestedRewardsAvailable) {
        void store.setSelectedRewards({ selectedVested: vestedRewards });
      }

      if (store.selectedVested && !store.vestedRewardsAvailable) {
        void store.setSelectedRewards({ selectedVested: null });
      }

      resolve();
    });
  });

  return subscription;
};

const resolveCrowdloanRewardsSubscription = async (store: RewardsStoreLike): Promise<Subscription> => {
  const observable = await api.rewards.getCrowdloanRewardsSubscription();

  let subscription!: Subscription;

  await new Promise<void>((resolve) => {
    subscription = observable.subscribe((crowdloanRewards) => {
      store.crowdloanRewards = crowdloanRewards;

      if (!store.crowdloanRewardsSubscription && store.crowdloanRewardsAvailable.length) {
        void store.setSelectedRewards({ selectedCrowdloan: getInitialSelection(store) });
      }

      if (Object.keys(store.selectedCrowdloan).length) {
        void store.setSelectedRewards({ selectedCrowdloan: pruneSelectedCrowdloanRewards(store) });
      }

      resolve();
    });
  });

  return subscription;
};

export const useRewardsStore = defineStore('rewards', {
  state: (): RewardsState => createRewardsStoreShape(),
  getters: {
    claimableRewards(state): Array<RewardInfo | RewardsInfo> {
      const selectedCrowdloan = state.selectedCrowdloan ? Object.values(state.selectedCrowdloan).flat(1) : [];
      const buffer: Array<RewardInfo | RewardsInfo> = [...state.selectedExternal, ...selectedCrowdloan];

      if (state.selectedInternal) {
        buffer.push(state.selectedInternal);
      }

      if (state.selectedVested) {
        buffer.push(state.selectedVested);
      }

      return buffer;
    },
    rewardsAvailable(): boolean {
      return this.claimableRewards.length !== 0;
    },
    internalRewardsAvailable(state): boolean {
      return !asZeroValue(state.internalRewards?.amount);
    },
    vestedRewardsAvailable(state): boolean {
      return !asZeroValue(state.vestedRewards?.limit);
    },
    externalRewardsAvailable(state): boolean {
      return Array.isArray(state.externalRewards) && state.externalRewards.length !== 0;
    },
    crowdloanRewardsAvailable(state): string[] {
      return Object.entries(state.crowdloanRewards ?? {}).reduce<string[]>((buffer, [tag, rewards]) => {
        if (rewards.some((reward) => !asZeroValue(reward.amount))) {
          buffer.push(tag);
        }

        return buffer;
      }, []);
    },
    externalRewardsSelected(state): boolean {
      return Array.isArray(state.selectedExternal) && state.selectedExternal.length !== 0;
    },
    rewardsByAssetsList(): RewardsAmountHeaderItem[] {
      if (!this.rewardsAvailable) {
        return [
          {
            asset: KnownAssets.get(KnownSymbols.PSWAP),
            symbol: KnownSymbols.PSWAP,
            amount: '',
          } as RewardsAmountHeaderItem,
        ];
      }

      return groupRewardsByAssetsList([...this.claimableRewards]);
    },
  },
  actions: {
    reset(): void {
      const {
        liquidityProvisionRewardsSubscription,
        vestedRewardsSubscription,
        crowdloanRewardsSubscription,
        ...nextState
      } = initialState();

      this.$patch(nextState);
    },
    async subscribeOnRewards(): Promise<void> {
      const walletStore = useWalletStore();

      this.unsubscribeFromRewards();

      if (!walletStore.isLoggedIn) return;

      await waitForAccountPair(async () => {
        const [liquidityProvisionRewardsSubscription, vestedRewardsSubscription, crowdloanRewardsSubscription] =
          await Promise.all([
            resolveLiquidityProvisionRewardsSubscription(this),
            resolveVestedRewardsSubscription(this),
            resolveCrowdloanRewardsSubscription(this),
          ]);

        this.liquidityProvisionRewardsSubscription = liquidityProvisionRewardsSubscription;
        this.vestedRewardsSubscription = vestedRewardsSubscription;
        this.crowdloanRewardsSubscription = crowdloanRewardsSubscription;
      });
    },
    unsubscribeFromRewards(): void {
      this.liquidityProvisionRewardsSubscription?.unsubscribe();
      this.vestedRewardsSubscription?.unsubscribe();
      this.crowdloanRewardsSubscription?.unsubscribe();

      this.liquidityProvisionRewardsSubscription = null;
      this.vestedRewardsSubscription = null;
      this.crowdloanRewardsSubscription = null;
      this.internalRewards = null;
      this.vestedRewards = null;
      this.crowdloanRewards = {};
    },
    async getNetworkFee(): Promise<void> {
      this.feeFetching = true;

      try {
        this.fee = await api.rewards.getNetworkFee(this.claimableRewards as RewardInfo[]);
      } catch (error) {
        console.error(error);
      } finally {
        this.feeFetching = false;
      }
    },
    async setSelectedRewards(value: SelectedRewards): Promise<void> {
      this.$patch(value);
      await this.getNetworkFee();
    },
    async getExternalRewards(address: string): Promise<void> {
      try {
        this.externalRewards = address ? await api.rewards.checkForExternalAccount(address) : [];
        await this.setSelectedRewards({ selectedExternal: this.externalRewards });
      } catch (error) {
        console.error(error);
        this.externalRewards = [];
      }
    },
    async claimRewards({ internalAddress = '', externalAddress = '' }: ClaimRewardsParams = {}): Promise<void> {
      const web3Store = useWeb3Store();

      if (!internalAddress) return;

      try {
        const rewardsListToReceive = [...this.rewardsByAssetsList];

        if (this.externalRewardsSelected && !externalAddress) return;

        this.rewardsClaiming = true;
        this.transactionError = false;

        if (this.externalRewardsSelected && this.transactionStep === 1) {
          const internalAddressHex = ethersUtil.accountAddressToHex(internalAddress);
          const keccakHex = ethers.keccak256(internalAddressHex);
          const message = ethers.getBytes(keccakHex);
          const signer = await ethersUtil.getSigner();
          const signature = await signer.signMessage(message);

          this.signature = signature;
          this.transactionStep = 2;
        }

        if (!this.externalRewardsSelected || (this.transactionStep === 2 && this.signature)) {
          await api.rewards.claim(
            this.claimableRewards as Array<RewardInfo | RewardsInfo>,
            this.signature,
            this.fee,
            externalAddress
          );

          if (web3Store.evmAddress === externalAddress) {
            this.transactionStep = 1;
            this.receivedRewards = rewardsListToReceive;
            this.rewardsClaiming = false;
          }
        }
      } catch (error) {
        this.transactionError = true;
        this.rewardsClaiming = false;
        throw error;
      }
    },
  },
});

export type RewardsStore = ReturnType<typeof useRewardsStore>;
