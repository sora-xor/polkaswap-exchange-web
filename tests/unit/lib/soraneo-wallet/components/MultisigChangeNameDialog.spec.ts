import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const updateMultisigName = vi.hoisted(() => vi.fn());
const getMSTName = vi.hoisted(() => vi.fn(() => 'Old name'));
const getMstAddress = vi.hoisted(() => vi.fn(() => 'mst-address'));
const navigate = vi.hoisted(() => vi.fn());
const walletStore = vi.hoisted(() => ({
  account: { address: 'cnUser' },
  isMstAccount: true,
  setIsMstAccount: vi.fn(),
  syncAccountWithStorage: vi.fn(),
  afterLogin: vi.fn(async () => undefined),
  renameAccount: vi.fn(async () => undefined),
  navigate,
}));

vi.mock('@/api', () => ({
  api: {
    mst: {
      updateMultisigName,
      getMSTName,
      getMstAddress,
      switchAccount: vi.fn(),
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

import MultisigChangeNameDialog from '@/lib/soraneo-wallet/src/components/MST/MultisigChangeNameDialog.vue';
import { RouteNames } from '@/consts';

describe('Wallet MultisigChangeNameDialog', () => {
  it('routes back to wallet through the wallet store boundary after updating the MST name', async () => {
    const wrapper = mount(MultisigChangeNameDialog, {
      props: { visible: true },
      global: {
        stubs: {
          DialogBase: { template: '<div><slot /></div>' },
          MstForgetDialog: { template: '<div />' },
          SCard: { template: '<div><slot /></div>' },
          SInput: { template: '<input />' },
          SButton: { template: '<button><slot /></button>' },
          SSwitch: { template: '<div />' },
        },
      },
    });

    (wrapper.vm as any).multisigNewName = 'Treasury';
    await (wrapper.vm as any).updateName();

    expect(updateMultisigName).toHaveBeenCalledWith('Treasury');
    expect(walletStore.renameAccount).toHaveBeenCalledWith({ address: 'mst-address', name: 'Treasury' });
    expect(navigate).toHaveBeenCalledWith({ name: RouteNames.Wallet });
  });
});
