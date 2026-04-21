import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const shared = vi.hoisted(() => ({
  getAccountReferrer: vi.fn(async () => ''),
  subscribeOnReferrer: vi.fn(),
  subscribeOnAccountInvitedUsers: vi.fn(),
  getReferralRewards: vi.fn(async () => null),
  storageGet: vi.fn(() => ''),
  storageSet: vi.fn(),
  walletStore: {
    isLoggedIn: false,
    account: null as any,
  },
}));

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    api: {
      referralSystem: {
        getAccountReferrer: shared.getAccountReferrer,
        subscribeOnReferrer: shared.subscribeOnReferrer,
        subscribeOnAccountInvitedUsers: shared.subscribeOnAccountInvitedUsers,
      },
    },
  });
});

vi.mock('@/indexer/queries/referrals', () => ({
  getReferralRewards: shared.getReferralRewards,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => shared.walletStore,
}));

vi.mock('@/utils/storage', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => shared.storageGet(...args),
    set: (...args: unknown[]) => shared.storageSet(...args),
  },
}));

import { useReferralsStore } from '@/stores/referrals';

describe('referrals store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    shared.storageGet.mockReset();
    shared.storageGet.mockReturnValue('');
    shared.storageSet.mockReset();
    shared.getAccountReferrer.mockReset();
    shared.getAccountReferrer.mockResolvedValue('');
    shared.getReferralRewards.mockReset();
    shared.getReferralRewards.mockResolvedValue(null);
    shared.subscribeOnReferrer.mockReset();
    shared.subscribeOnAccountInvitedUsers.mockReset();
    shared.walletStore.isLoggedIn = false;
    shared.walletStore.account = null;
  });

  it('hydrates storageReferrer from persisted storage', () => {
    shared.storageGet.mockReturnValueOnce('5storage');
    const store = useReferralsStore();

    expect(store.storageReferrer).toBe('5storage');
  });

  it('updates local referral state and persists storageReferrer', () => {
    const store = useReferralsStore();

    store.approveReferrer(true);
    store.setAmount('456');
    store.setStorageReferrer('5new');

    expect(store.isReferrerApproved).toBe(true);
    expect(store.amount).toBe('456');
    expect(store.storageReferrer).toBe('5new');
    expect(shared.storageSet).toHaveBeenCalledWith('storageReferral', '5new');
  });

  it('resets local state without dropping active invited-user subscription state', () => {
    const referrerSubscription = { unsubscribe: vi.fn() };
    const invitedUsersSubscription = { unsubscribe: vi.fn() };
    const store = useReferralsStore();

    store.referrer = '5ref';
    store.referralRewards = {} as any;
    store.amount = '123';
    store.storageReferrer = '5storage';
    store.isReferrerApproved = true;
    store.referrerSubscription = referrerSubscription as any;
    store.invitedUsers = ['a', 'b'];
    store.invitedUsersSubscription = invitedUsersSubscription as any;

    store.reset();

    expect(referrerSubscription.unsubscribe).toHaveBeenCalledTimes(1);
    expect(store.referrer).toBe('');
    expect(store.referralRewards).toBeNull();
    expect(store.amount).toBe('');
    expect(store.storageReferrer).toBe('');
    expect(store.isReferrerApproved).toBe(false);
    expect(store.invitedUsers).toEqual(['a', 'b']);
    expect(store.invitedUsersSubscription).toEqual(invitedUsersSubscription);
  });

  it('fetches the current referrer and falls back to empty string on failure', async () => {
    const store = useReferralsStore();
    shared.getAccountReferrer.mockResolvedValueOnce('5ref');

    await store.getReferrer();
    expect(store.referrer).toBe('5ref');

    shared.getAccountReferrer.mockRejectedValueOnce(new Error('unavailable'));
    await store.getReferrer();
    expect(store.referrer).toBe('');
  });

  it('subscribes to referral streams only when the wallet is logged in', async () => {
    const referrerUnsubscribe = vi.fn();
    const invitedUnsubscribe = vi.fn();
    const subscribeOnReferrer = vi.fn((handler: (value: string) => void) => {
      handler('5ref');
      return { unsubscribe: referrerUnsubscribe };
    });
    const subscribeOnInvitedUsers = vi.fn((handler: (value: string[]) => void) => {
      handler(['a', 'b']);
      return { unsubscribe: invitedUnsubscribe };
    });

    shared.subscribeOnReferrer.mockReturnValueOnce({ subscribe: subscribeOnReferrer });
    shared.subscribeOnAccountInvitedUsers.mockReturnValueOnce({ subscribe: subscribeOnInvitedUsers });

    const store = useReferralsStore();
    await store.subscribeOnReferrer();
    await store.subscribeOnInvitedUsers();

    expect(shared.subscribeOnReferrer).not.toHaveBeenCalled();
    expect(shared.subscribeOnAccountInvitedUsers).not.toHaveBeenCalled();

    shared.walletStore.isLoggedIn = true;
    shared.walletStore.account = { address: '5wallet' };

    await store.subscribeOnReferrer();
    await store.subscribeOnInvitedUsers();

    expect(shared.subscribeOnReferrer).toHaveBeenCalledWith('5wallet');
    expect(shared.subscribeOnAccountInvitedUsers).toHaveBeenCalledTimes(1);
    expect(store.referrer).toBe('5ref');
    expect(store.invitedUsers).toEqual(['a', 'b']);

    store.resetReferrerSubscription();
    store.unsubscribeFromInvitedUsers();

    expect(referrerUnsubscribe).toHaveBeenCalledTimes(1);
    expect(invitedUnsubscribe).toHaveBeenCalledTimes(1);
    expect(store.invitedUsers).toEqual([]);
  });

  it('fetches referral rewards through the current wallet account', async () => {
    const rewards = { rewards: { toString: () => '1' }, invitedUserRewards: {} };
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.account = { address: '5wallet' };
    shared.getReferralRewards.mockResolvedValueOnce(rewards as any);

    const store = useReferralsStore();
    await store.getAccountReferralRewards();

    expect(shared.getReferralRewards).toHaveBeenCalledWith('5wallet');
    expect(store.referralRewards).toEqual(rewards);
  });
});
