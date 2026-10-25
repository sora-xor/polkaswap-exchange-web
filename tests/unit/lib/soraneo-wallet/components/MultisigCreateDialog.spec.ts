import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const createMST = vi.hoisted(() => vi.fn());
const switchAccount = vi.hoisted(() => vi.fn());
const navigate = vi.hoisted(() => vi.fn());
const showAppNotification = vi.hoisted(() => vi.fn());
const walletStore = vi.hoisted(() => ({
  setIsMstAddressExist: vi.fn(),
  setIsMstAccount: vi.fn(),
  syncAccountWithStorage: vi.fn(),
  afterLogin: vi.fn(async () => undefined),
  trackPendingMstTxs: vi.fn(async () => undefined),
  navigate,
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: {
    mst: {
      createMST,
      switchAccount,
    },
  },
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStore,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/composables/useNotification', () => ({
  useNotification: () => ({
    showAppNotification,
  }),
}));

import MultisigCreateDialog from '@/lib/soraneo-wallet/src/components/MST/MultisigCreateDialog.vue';
import { RouteNames } from '@/consts';

describe('Wallet MultisigCreateDialog', () => {
  it('routes back to wallet through the wallet store boundary after MST creation', async () => {
    const wrapper = mount(MultisigCreateDialog, {
      props: {
        visible: true,
        mstData: {
          addresses: ['cn1', 'cn2'],
          multisigName: 'Treasury',
          threshold: 2,
          duration: 7,
        },
      },
      global: {
        stubs: {
          DialogBase: { template: '<div><slot /></div>' },
          FormattedAddress: { template: '<div />' },
          SScrollbar: { template: '<div><slot /></div>' },
          SCard: { template: '<div><slot /></div>' },
          SDivider: { template: '<div />' },
          SButton: { template: '<button><slot /></button>' },
        },
      },
    });

    await (wrapper.vm as any).handleCreateClose();

    expect(createMST).toHaveBeenCalledWith(['cn1', 'cn2'], 2, 'Treasury', 7);
    expect(navigate).toHaveBeenCalledWith({ name: RouteNames.Wallet });
    expect(showAppNotification).toHaveBeenCalled();
  });
});
