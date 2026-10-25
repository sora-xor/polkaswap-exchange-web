import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string>) =>
      key === 'bridge.connectNetworkWallet' ? `Connect ${values?.network} wallet` : key,
  }),
}));
vi.mock('@/lib/soraneo-wallet/src/components/Account/WalletAvatar.vue', () => ({
  default: { template: '<span />' },
}));
vi.mock('@/lib/soraneo-wallet/src/components/shared/FormattedAddress.vue', () => ({
  default: { template: '<span />' },
}));

import AccountPanel from '@/features/bridge/components/AccountPanel.vue';

describe('Bridge account panel', () => {
  it('names the selected network and keeps its connection action', async () => {
    const wrapper = mount(AccountPanel, { props: { networkName: 'SORA' } });
    expect(wrapper.get('button').text()).toBe('Connect SORA wallet');
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('connect')).toHaveLength(1);
    await wrapper.setProps({ networkName: 'Ethereum' });
    expect(wrapper.get('button').text()).toBe('Connect Ethereum wallet');
    await wrapper.setProps({ networkName: 'SORA Polkadot' });
    expect(wrapper.get('button').text()).toBe('Connect SORA Polkadot wallet');
  });

  it('retains the generic action label when no network name is supplied', () => {
    const wrapper = mount(AccountPanel);
    expect(wrapper.get('button').text()).toBe('connectWalletText');
  });
});
