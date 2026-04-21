import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

const setInvitedUser = vi.fn();
const approveReferrer = vi.fn();
const resetStorageReferrer = vi.fn();
const withNotifications = vi.fn(async (handler: () => Promise<void>) => {
  await handler();
});

vi.mock('@tests/stubs/walletRuntime', async () => {
  const { createWalletMock } = await import('@tests/stubs/createWalletMock');
  return createWalletMock({
    api: {
      referralSystem: {
        setInvitedUser,
      },
    },
    components: {
      DialogBase: {
        name: 'DialogBaseStub',
        template: '<div class="dialog-base-stub"><slot /><slot name="footer" /></div>',
      },
    },
  });
});

vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({
    loading: ref(false),
    withNotifications,
  }),
}));

const referralsStoreMock = {
  referrer: '',
  storageReferrer: '0x123',
  approveReferrer,
  resetStorageReferrer,
};

vi.mock('@/stores/referrals', () => ({
  useReferralsStore: () => referralsStoreMock,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mountComponent = (visible = true) =>
  import('@/features/referrals/components/ConfirmInviteUser.vue').then(({ default: component }) =>
    mount(component, {
      props: { visible },
      global: {
        stubs: {
          's-button': { template: '<button><slot /></button>' },
          's-icon': { template: '<i />' },
        },
      },
    })
  );

describe('ReferralsConfirmInviteUser.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    referralsStoreMock.referrer = '';
    referralsStoreMock.storageReferrer = '0x123';
    setInvitedUser.mockResolvedValue(undefined);
  });

  it('approves and confirms referral when invitation succeeds', async () => {
    const wrapper = await mountComponent();
    await (wrapper.vm as { handleConfirmInviteUser: () => Promise<void> }).handleConfirmInviteUser();
    await wrapper.vm.$nextTick();

    expect(approveReferrer).toHaveBeenNthCalledWith(1, true);
    expect(withNotifications).toHaveBeenCalledTimes(1);
    expect(setInvitedUser).toHaveBeenCalledWith('0x123');
  });

  it('rolls back approval when invitation fails', async () => {
    setInvitedUser.mockRejectedValueOnce(new Error('fail'));
    const wrapper = await mountComponent();
    await (wrapper.vm as { handleConfirmInviteUser: () => Promise<void> }).handleConfirmInviteUser();
    await wrapper.vm.$nextTick();

    expect(approveReferrer).toHaveBeenNthCalledWith(1, true);
    expect(approveReferrer).toHaveBeenNthCalledWith(2, false);
  });

  it('skips invitation request when referrer already exists', async () => {
    referralsStoreMock.referrer = '0xabc';
    const wrapper = await mountComponent();
    await (wrapper.vm as { handleConfirmInviteUser: () => Promise<void> }).handleConfirmInviteUser();
    await wrapper.vm.$nextTick();

    expect(setInvitedUser).not.toHaveBeenCalled();
  });
});
