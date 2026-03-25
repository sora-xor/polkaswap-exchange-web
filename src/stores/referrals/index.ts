import { defineStore } from 'pinia';

import { getReferralRewards, type ReferrerRewards } from '@/indexer/queries/referrals';
import { api } from '@/shims/wallet-api';
import { useWalletStore } from '@/stores/wallet';
import storage from '@/utils/storage';

import type { Subscription } from 'rxjs';

type ReferralsState = {
  referrer: string;
  referrerSubscription: Nullable<Subscription>;
  referralRewards: Nullable<ReferrerRewards>;
  invitedUsers: string[];
  invitedUsersSubscription: Nullable<Subscription>;
  amount: string;
  storageReferrer: string;
  isReferrerApproved: boolean;
};

const buildInitialState = (): ReferralsState => ({
  referrer: '',
  referrerSubscription: null,
  referralRewards: null,
  invitedUsers: [],
  invitedUsersSubscription: null,
  amount: '',
  storageReferrer: storage.get('storageReferral') || '',
  isReferrerApproved: false,
});

export const useReferralsStore = defineStore('referrals-legacy', {
  state: (): ReferralsState => buildInitialState(),
  actions: {
    resetReferrerSubscription(): void {
      this.referrerSubscription?.unsubscribe();
      this.referrerSubscription = null;
    },
    approveReferrer(flag: boolean): void {
      this.isReferrerApproved = flag;
    },
    setAmount(value: string): void {
      this.amount = value;
    },
    resetAmount(): void {
      this.amount = '';
    },
    setStorageReferrer(value: string): void {
      this.storageReferrer = value;
      storage.set('storageReferral', value);
    },
    resetStorageReferrer(): void {
      this.storageReferrer = '';
      storage.set('storageReferral', '');
    },
    reset(): void {
      const next = buildInitialState();

      this.referrer = next.referrer;
      this.referrerSubscription?.unsubscribe();
      this.referrerSubscription = null;
      this.referralRewards = next.referralRewards;
      this.amount = next.amount;
      this.storageReferrer = next.storageReferrer;
      this.isReferrerApproved = next.isReferrerApproved;
    },
    unsubscribeFromInvitedUsers(): void {
      this.invitedUsersSubscription?.unsubscribe();
      this.invitedUsersSubscription = null;
      this.invitedUsers = [];
    },
    async getReferrer(): Promise<void> {
      this.referrer = '';

      try {
        this.referrer = await api.referralSystem.getAccountReferrer();
      } catch {
        this.referrer = '';
      }
    },
    async subscribeOnInvitedUsers(): Promise<void> {
      this.unsubscribeFromInvitedUsers();

      const walletStore = useWalletStore();
      if (!walletStore.isLoggedIn) return;

      this.invitedUsersSubscription = api.referralSystem.subscribeOnAccountInvitedUsers().subscribe((users) => {
        this.invitedUsers = users;
      });
    },
    async getAccountReferralRewards(): Promise<void> {
      this.referralRewards = null;

      const walletStore = useWalletStore();
      const address = walletStore.account?.address;
      if (!walletStore.isLoggedIn || !address) return;

      const data = await getReferralRewards(address);

      if (data) {
        this.referralRewards = data;
      }
    },
    async subscribeOnReferrer(): Promise<void> {
      this.resetReferrerSubscription();

      const walletStore = useWalletStore();
      const address = walletStore.account?.address;
      if (!walletStore.isLoggedIn || !address) return;

      this.referrerSubscription = api.referralSystem.subscribeOnReferrer(address).subscribe((referrer) => {
        if (referrer) {
          this.referrer = referrer;
        }
      });
    },
  },
});

export type ReferralsStore = ReturnType<typeof useReferralsStore>;
