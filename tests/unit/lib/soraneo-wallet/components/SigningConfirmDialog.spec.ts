import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { beginTransactionSignRequest } from '@/lib/soraneo-wallet/src/util/transactionSignRequest';
import ConfirmDialog from '@/lib/soraneo-wallet/src/components/ConfirmDialog.vue';

const mocks = vi.hoisted(() => ({
  delay: vi.fn(),
  error: vi.fn(),
  resetPassword: vi.fn(),
}));
vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({
    isSignTxDialogDisabled: false,
    getPassword: () => null,
    resetAccountPassphrase: mocks.resetPassword,
    setAccountPassphrase: vi.fn(),
  }),
}));
vi.mock('@/lib/soraneo-wallet/src/composables/useLoading', () => ({
  useLoading: () => ({ loading: false, withLoading: (handler: () => Promise<void>) => handler() }),
}));
vi.mock('@/lib/soraneo-wallet/src/composables/useNotification', () => ({
  useNotification: () => ({
    t: (key: string) => key,
    withAppNotification: async (handler: () => Promise<void>) => {
      try {
        await handler();
      } catch (error) {
        mocks.error(error);
      }
    },
  }),
}));
vi.mock('@/lib/soraneo-wallet/src/util', () => ({ delay: mocks.delay }));
vi.mock('@/lib/soraneo-wallet/src/components/Account/ConfirmDialog.vue', () => ({
  default: { name: 'AccountConfirmDialog', emits: ['confirm'], template: '<div />' },
}));

/** Mounts the production confirmation handler with a controllable rendering delay. */
function setupDialog() {
  const pair = {
    isLocked: true,
    lock: vi.fn(() => {
      pair.isLocked = true;
    }),
  };
  const api = {
    address: 'alice',
    accountPair: pair,
    unlockPair: vi.fn(() => {
      pair.isLocked = false;
    }),
  };
  const request = beginTransactionSignRequest(api as never);
  let release!: () => void;
  mocks.delay.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      })
  );
  const setVisibility = vi.fn();
  const wrapper = mount(ConfirmDialog, {
    props: { chainApi: api as never, account: { address: 'alice' } as never, visibility: true, setVisibility },
  });
  return { api, request, wrapper, setVisibility, release: () => release() };
}

describe('transaction confirmation click identity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('acknowledges a current explicit click and closes the dialog', async () => {
    const { api, request, wrapper, setVisibility, release } = setupDialog();
    wrapper.getComponent({ name: 'AccountConfirmDialog' }).vm.$emit('confirm', 'test-password');
    await flushPromises();
    release();
    await flushPromises();
    expect(api.unlockPair).toHaveBeenCalledExactlyOnceWith('test-password');
    expect(() => request.assertConfirmed()).not.toThrow();
    expect(setVisibility).toHaveBeenCalledWith(false);
    request.finish(true);
    wrapper.unmount();
  });

  it('rejects a delayed click from a closed prompt even after a new prompt opens', async () => {
    const { api, request, wrapper, release } = setupDialog();
    wrapper.getComponent({ name: 'AccountConfirmDialog' }).vm.$emit('confirm', 'test-password');
    await flushPromises();
    await wrapper.setProps({ visibility: false });
    request.finish(false);
    const replacement = beginTransactionSignRequest(api as never);
    await wrapper.setProps({ visibility: true });
    release();
    await flushPromises();
    expect(api.unlockPair).not.toHaveBeenCalled();
    expect(mocks.error).toHaveBeenCalledOnce();
    expect(() => replacement.assertConfirmed()).toThrow('Cancelled');
    replacement.finish(false);
    wrapper.unmount();
  });
});
