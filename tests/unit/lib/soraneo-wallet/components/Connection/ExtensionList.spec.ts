import { describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('@/lib/soraneo-wallet/src/composables/useWalletTranslation', () => ({
  useWalletTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import ExtensionListStep from '@/lib/soraneo-wallet/src/components/Connection/Step/ExtensionList.vue';
import ExtensionList from '@/lib/soraneo-wallet/src/components/Connection/List/Extension.vue';
import { walletDescriptionKey } from '@/lib/soraneo-wallet/src/components/Connection/walletDescription';
import type { Wallet } from '@/lib/soraneo-wallet/src/services/wallet/types';

describe('Wallet ExtensionListStep', () => {
  it.each([
    ['google-drive', 'googleDescription'],
    ['sora', 'localDescription'],
    ['walletconnect', 'walletConnectDescription'],
    ['walletconnect-Fearless', 'walletConnectDescription'],
    ['fearless-wallet', 'extensionDescription'],
    ['unknown-extension', 'extensionDescription'],
  ])('explains %s at the point of selection', (source, expected) => {
    expect(walletDescriptionKey(source)).toBe(`connection.wallet.${expected}`);
  });

  it('renders provider guidance while keeping selection and disconnect actions intact', async () => {
    const wallet = {
      extensionName: 'walletconnect-Fearless',
      title: 'Fearless Wallet',
      installed: true,
      logo: {},
      provider: { isConnected: true },
    } as Wallet;
    const wrapper = mount(ExtensionList, {
      props: { wallets: [wallet] },
      global: {
        stubs: {
          ConnectionItems: { template: '<div><slot /></div>' },
          AccountCard: {
            template: '<div class="provider-card"><slot name="name" /><slot name="description" /><slot /></div>',
          },
        },
      },
    });

    expect(wrapper.get('.extension-description').text()).toBe('connection.wallet.walletConnectDescription');
    await wrapper.get('.provider-card').trigger('click');
    expect(wrapper.emitted('select')).toEqual([[wallet]]);
    await wrapper.get('.connection-state').trigger('click');
    expect(wrapper.emitted('disconnect')).toEqual([[wallet]]);
    expect(wrapper.emitted('select')).toHaveLength(1);
  });

  it('re-emits wallet selection and disconnection events', () => {
    const emit = vi.fn();
    const wallet = { extensionName: 'sora' };
    const state = (ExtensionListStep as any).setup({}, { attrs: {}, emit, expose: vi.fn(), slots: {} });

    state.handleSelectWallet(wallet);
    state.handleDisconnectWallet(wallet);

    expect(emit).toHaveBeenNthCalledWith(1, 'select', wallet);
    expect(emit).toHaveBeenNthCalledWith(2, 'disconnect', wallet);
  });
});
