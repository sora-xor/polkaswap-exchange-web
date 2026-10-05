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

  it('ignores old account referrer responses after switching accounts', async () => {
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.account = { address: '5old' };
    let resolveOld!: (value: string) => void;
    shared.getAccountReferrer.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        })
    );
    const store = useReferralsStore();
    const oldRequest = store.getReferrer();
    shared.walletStore.account = { address: '5new' };
    shared.getAccountReferrer.mockResolvedValueOnce('new-referrer');
    await store.getReferrer();
    resolveOld('old-referrer');
    await oldRequest;
    expect(store.referrer).toBe('new-referrer');
  });

  it('invalidates reward responses when reset interrupts their request', async () => {
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.account = { address: '5wallet' };
    let resolveRewards!: (value: unknown) => void;
    shared.getReferralRewards.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRewards = resolve;
        })
    );
    const store = useReferralsStore();
    const request = store.getAccountReferralRewards();
    await vi.waitFor(() => expect(shared.getReferralRewards).toHaveBeenCalledTimes(1));
    store.reset();
    resolveRewards({ invitedUserRewards: { 'old-user': {} } });
    await request;
    expect(store.referralRewards).toBeNull();
    expect(store.invitedUsers).toEqual([]);
  });

  it('clears a removed referrer and rejects old account subscription emissions', async () => {
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.account = { address: '5wallet' };
    let emitReferrer!: (value: string) => void;
    let emitUsers!: (value: string[]) => void;
    shared.subscribeOnReferrer.mockReturnValue({
      subscribe: (handler: typeof emitReferrer) => {
        emitReferrer = handler;
        return { unsubscribe: vi.fn() };
      },
    });
    shared.subscribeOnAccountInvitedUsers.mockReturnValue({
      subscribe: (handler: typeof emitUsers) => {
        emitUsers = handler;
        return { unsubscribe: vi.fn() };
      },
    });
    const store = useReferralsStore();
    await store.subscribeOnReferrer();
    await store.subscribeOnInvitedUsers();
    emitReferrer('referrer');
    emitReferrer('');
    expect(store.referrer).toBe('');
    shared.walletStore.account = { address: '5new' };
    emitReferrer('old-referrer');
    emitUsers(['old-user']);
    expect(store.referrer).toBe('');
    expect(store.invitedUsers).toEqual([]);
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

  it('resets account state and unsubscribes invited-user streams', () => {
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
    expect(store.invitedUsers).toEqual([]);
    expect(store.invitedUsersSubscription).toBeNull();
    expect(invitedUsersSubscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('fetches the current referrer and falls back to empty string on failure', async () => {
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.account = { address: '5wallet' };
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

  it('fetches referral rewards through the current wallet account and seeds invited users from the indexer', async () => {
    const rewards = {
      rewards: { toString: () => '1' },
      invitedUserRewards: {
        alice: { toString: () => '0.4' },
        bob: { toString: () => '0.6' },
      },
    };
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.account = { address: '5wallet' };
    shared.getReferralRewards.mockResolvedValueOnce(rewards as any);

    const store = useReferralsStore();
    await store.getAccountReferralRewards();

    expect(shared.getReferralRewards).toHaveBeenCalledWith('5wallet');
    expect(store.referralRewards).toEqual(rewards);
    expect(store.invitedUsers).toEqual(['alice', 'bob']);
  });

  it('keeps indexer-loaded invited users visible while replacing the live subscription', async () => {
    const invitedUnsubscribe = vi.fn();
    const subscribeOnInvitedUsers = vi.fn(() => ({ unsubscribe: invitedUnsubscribe }));

    shared.walletStore.isLoggedIn = true;
    shared.walletStore.account = { address: '5wallet' };
    shared.subscribeOnAccountInvitedUsers.mockReturnValue({ subscribe: subscribeOnInvitedUsers });

    const store = useReferralsStore();
    store.invitedUsers = ['indexed-user'];
    store.invitedUsersSubscription = { unsubscribe: invitedUnsubscribe } as any;

    await store.subscribeOnInvitedUsers();

    expect(invitedUnsubscribe).toHaveBeenCalledTimes(1);
    expect(shared.subscribeOnAccountInvitedUsers).toHaveBeenCalledTimes(1);
    expect(store.invitedUsers).toEqual(['indexed-user']);
  });

  it('keeps indexer-loaded invited users when the live wallet subscription is unavailable', async () => {
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.account = { address: '5wallet' };
    shared.subscribeOnAccountInvitedUsers.mockImplementationOnce(() => {
      throw new Error('wallet api is not ready');
    });

    const store = useReferralsStore();
    store.invitedUsers = ['indexed-user'];

    await expect(store.subscribeOnInvitedUsers()).resolves.toBeUndefined();

    expect(store.invitedUsers).toEqual(['indexed-user']);
    expect(store.invitedUsersSubscription).toBeNull();
  });

  it('does not fail referral loading when the live referrer subscription is unavailable', async () => {
    shared.walletStore.isLoggedIn = true;
    shared.walletStore.account = { address: '5wallet' };
    shared.subscribeOnReferrer.mockImplementationOnce(() => {
      throw new Error('apiRx is not ready');
    });

    const store = useReferralsStore();

    await expect(store.subscribeOnReferrer()).resolves.toBeUndefined();

    expect(store.referrerSubscription).toBeNull();
  });
});
