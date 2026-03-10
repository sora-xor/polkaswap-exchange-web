import { shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import WalletAccount from '@/lib/soraneo-wallet/src/components/Account/WalletAccount.vue';

const getMstAddressMock = vi.hoisted(() => vi.fn(() => ''));
const getMstAccountMock = vi.hoisted(() => vi.fn(() => null));
const getLegacyStoreMock = vi.hoisted(() => vi.fn(() => null));
const formatAccountAddressMock = vi.hoisted(() => vi.fn((address: string) => address));

vi.mock('@/api', () => ({
  api: {
    mst: {
      getMstAddress: getMstAddressMock,
      getMstAccount: getMstAccountMock,
    },
  },
}));

vi.mock('@/composables/useLoading', () => ({
  useLoading: () => ({
    withApi: async (handler: () => Promise<void>) => await handler(),
  }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/utils/legacy-store', () => ({
  getLegacyStore: getLegacyStoreMock,
}));

vi.mock('@/util', () => ({
  formatAccountAddress: formatAccountAddressMock,
  getAccountIdentity: vi.fn(),
}));

describe('WalletAccount', () => {
  const storeFallback = {
    state: {
      wallet: {
        settings: {
          isWalletLoaded: false,
        },
      },
    },
    getters: {
      'wallet/account/account': null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    formatAccountAddressMock.mockImplementation((address: string) => address);
    (globalThis as Record<string, unknown>).__PS_APP_STORE__ = storeFallback;
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__PS_APP_STORE__;
  });

  it('mounts with legacy-store fallback without runtime reference errors', () => {
    const wrapper = shallowMount(WalletAccount, {
      global: {
        stubs: {
          AccountCard: {
            template:
              '<div><slot name="avatar"></slot><slot name="name"></slot><slot name="description"></slot><slot></slot></div>',
          },
          WalletAvatar: true,
          Identity: true,
          FormattedAddress: true,
        },
      },
    });

    expect(wrapper.vm.name).toBe('<unknown>');
    expect(getMstAddressMock).toHaveBeenCalled();
  });

  it('falls back to raw account address when formatter returns empty string', () => {
    const accountAddress = 'cnRXua6zs8TaE87BQFL6uWVbT2g6GXsUjwk6PTvL6UHcHDCvo';
    (globalThis as Record<string, unknown>).__PS_APP_STORE__ = {
      ...storeFallback,
      getters: {
        'wallet/account/account': {
          address: accountAddress,
          name: 'E2E Wallet',
          source: 'polkadot-js',
        },
      },
    };
    formatAccountAddressMock.mockReturnValueOnce('');

    const wrapper = shallowMount(WalletAccount, {
      global: {
        stubs: {
          AccountCard: {
            template:
              '<div><slot name="avatar"></slot><slot name="name"></slot><slot name="description"></slot><slot></slot></div>',
          },
          WalletAvatar: true,
          Identity: true,
          FormattedAddress: true,
        },
      },
    });

    expect(wrapper.vm.address).toBe(accountAddress);
    expect(formatAccountAddressMock).toHaveBeenCalledWith(accountAddress, true, expect.any(Object));
  });
});
