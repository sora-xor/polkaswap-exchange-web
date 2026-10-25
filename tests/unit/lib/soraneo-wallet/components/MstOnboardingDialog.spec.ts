import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

const navigateWallet = vi.hoisted(() => vi.fn());
const settingsStore = vi.hoisted(() => ({
  isMSTAvailable: false,
}));

vi.mock('@/platform/wallet/navigation', () => ({
  navigateWallet,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStore,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import MstOnboardingDialog from '@/lib/soraneo-wallet/src/components/MST/MstOnboardingDialog.vue';
import { RouteNames } from '@/consts';

describe('Wallet MstOnboardingDialog', () => {
  it('routes to wallet connection through the wallet navigation boundary when MST is unavailable', async () => {
    settingsStore.isMSTAvailable = false;
    const wrapper = mount(MstOnboardingDialog, {
      props: { visible: true },
      global: {
        stubs: {
          DialogBase: { template: '<div><slot /></div>' },
          CreateMstWalletDialog: { template: '<div />' },
          SCard: { template: '<div><slot /></div>' },
          SButton: { template: '<button><slot /></button>' },
        },
      },
    });

    await (wrapper.vm as any).connectFearlessOrCreateMST();

    expect(navigateWallet).toHaveBeenCalledWith({ name: RouteNames.WalletConnection });
  });
});
