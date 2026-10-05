import { defineStore } from 'pinia';

import { api } from '@/lib/soraneo-wallet/src/api';
import { useWalletStore } from '@/stores/wallet';
import storage from '@/utils/storage';

import type { Subscription } from 'rxjs';
import type { ReferrerRewards } from '@/indexer/queries/referrals';

type ReferralsQueriesModule = typeof import('@/indexer/queries/referrals');

let referralsQueriesModulePromise: Promise<ReferralsQueriesModule> | null = null;
const referrerGenerations = new WeakMap<object, number>();
const referrerRequestGenerations = new WeakMap<object, number>();
const rewardsGenerations = new WeakMap<object, number>();
const invitedUsersGenerations = new WeakMap<object, number>();

/** Invalidates prior requests or callbacks before replacing account-specific data. */
const nextGeneration = (generations: WeakMap<object, number>, store: object): number => {
  const generation = (generations.get(store) ?? 0) + 1;
  generations.set(store, generation);
  return generation;
};

/** Captures wallet identity so a late response cannot populate a different account. */
const isCurrentAccount = (): (() => boolean) => {
  const walletStore = useWalletStore();
  const address = walletStore.address || walletStore.account?.address;
  const source = walletStore.accountSource;
  return () =>
    Boolean(
      address &&
      walletStore.isLoggedIn &&
      address === (walletStore.address || walletStore.account?.address) &&
      source === walletStore.accountSource
    );
};

/**
 * Loads indexer-backed referral reward queries only when rewards are requested.
 */
const loadReferralsQueries = (): Promise<ReferralsQueriesModule> => {
  referralsQueriesModulePromise ??= import('@/indexer/queries/referrals');
  return referralsQueriesModulePromise;
};

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
    /** Invalidates pending referrer requests and tears down the previous stream. */
    resetReferrerSubscription(): void {
      nextGeneration(referrerGenerations, this);
      nextGeneration(referrerRequestGenerations, this);
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
    /** Clears all account referral data and invalidates pending asynchronous work. */
    reset(): void {
      const next = buildInitialState();

      this.referrer = next.referrer;
      this.resetReferrerSubscription();
      this.unsubscribeFromInvitedUsers();
      nextGeneration(rewardsGenerations, this);
      this.referralRewards = next.referralRewards;
      this.amount = next.amount;
      this.storageReferrer = next.storageReferrer;
      this.isReferrerApproved = next.isReferrerApproved;
    },
    /** Revokes invited-user callback ownership before unsubscribing. */
    unsubscribeFromInvitedUsers(clearUsers = true): void {
      nextGeneration(invitedUsersGenerations, this);
      this.invitedUsersSubscription?.unsubscribe();
      this.invitedUsersSubscription = null;
      if (clearUsers) {
        this.invitedUsers = [];
      }
    },
    /** Fetches the selected account referrer without committing superseded responses. */
    async getReferrer(): Promise<void> {
      this.referrer = '';
      const generation = nextGeneration(referrerRequestGenerations, this);
      const accountIsCurrent = isCurrentAccount();
      const isCurrent = (): boolean => accountIsCurrent() && generation === referrerRequestGenerations.get(this);
      if (!accountIsCurrent()) return;

      try {
        const referrer = await api.referralSystem.getAccountReferrer();
        if (isCurrent()) this.referrer = referrer;
      } catch {
        if (isCurrent()) this.referrer = '';
      }
    },
    /** Subscribes invited users for the selected account only. */
    async subscribeOnInvitedUsers(): Promise<void> {
      this.unsubscribeFromInvitedUsers(false);

      const accountIsCurrent = isCurrentAccount();
      const generation = invitedUsersGenerations.get(this);
      if (!accountIsCurrent()) {
        this.invitedUsers = [];
        return;
      }

      try {
        this.invitedUsersSubscription = api.referralSystem.subscribeOnAccountInvitedUsers().subscribe((users) => {
          if (accountIsCurrent() && generation === invitedUsersGenerations.get(this)) this.invitedUsers = users;
        });
      } catch {
        this.invitedUsersSubscription = null;
      }
    },
    /** Loads rewards only while the initiating account and request remain current. */
    async getAccountReferralRewards(): Promise<void> {
      this.referralRewards = null;
      this.invitedUsers = [];
      const generation = nextGeneration(rewardsGenerations, this);
      const accountIsCurrent = isCurrentAccount();
      const isCurrent = (): boolean => accountIsCurrent() && generation === rewardsGenerations.get(this);

      const walletStore = useWalletStore();
      const address = walletStore.address || walletStore.account?.address;
      if (!walletStore.isLoggedIn || !address) return;

      const { getReferralRewards } = await loadReferralsQueries();
      if (!isCurrent()) return;
      const data = await getReferralRewards(address);

      if (data && isCurrent()) {
        this.referralRewards = data;
        this.invitedUsers = Object.keys(data.invitedUserRewards);
      }
    },
    /** Tracks the selected account referrer, including removal of a referrer. */
    async subscribeOnReferrer(): Promise<void> {
      this.resetReferrerSubscription();
      this.referrer = '';
      const generation = referrerGenerations.get(this);
      const accountIsCurrent = isCurrentAccount();

      const walletStore = useWalletStore();
      const address = walletStore.address || walletStore.account?.address;
      if (!walletStore.isLoggedIn || !address) return;

      try {
        this.referrerSubscription = api.referralSystem.subscribeOnReferrer(address).subscribe((referrer) => {
          if (accountIsCurrent() && generation === referrerGenerations.get(this)) this.referrer = referrer || '';
        });
      } catch {
        this.referrerSubscription = null;
      }
    },
  },
});

export type ReferralsStore = ReturnType<typeof useReferralsStore>;
