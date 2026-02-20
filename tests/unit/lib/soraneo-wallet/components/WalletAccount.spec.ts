import { shallowMount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import WalletAccount from '@/lib/soraneo-wallet/src/components/Account/WalletAccount.vue';

const getMstAddressMock = vi.hoisted(() => vi.fn(() => ''));
const getMstAccountMock = vi.hoisted(() => vi.fn(() => null));
const getLegacyStoreMock = vi.hoisted(() => vi.fn(() => null));

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
  formatAccountAddress: (address: string) => address,
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
});
