import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import GetTsRouteRequirements from '@/features/misc/components/burn/GetTsRouteRequirements.vue';
import copy from '@/features/misc/getTsOnboarding.en.json';
import type { GetTsPurpose, GetTsSource } from '@/features/misc/lib/getTsFlow';

vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

function setup(source: GetTsSource, purpose: GetTsPurpose = 'xor', disabled = false) {
  return mount(GetTsRouteRequirements, { props: { source, purpose, disabled } });
}

describe('purchase route requirements', () => {
  it.each([
    ['card', 'twoWallets'],
    ['ethereum', 'twoWallets'],
    ['ton', 'threeWallets'],
    ['sora', 'oneWallet'],
    ['xor', 'oneWallet'],
  ] as const)('discloses exact %s wallet requirements and only its actual route', (source, countKey) => {
    const wrapper = setup(source);
    expect(wrapper.text()).toContain(`getTs.onboarding.${countKey}`);
    expect(wrapper.text()).toContain(`getTs.onboarding.${source}Route`);
    expect(wrapper.text()).not.toContain('getTs.onboarding.burnStep');
    expect(wrapper.emitted()).toEqual({});
    wrapper.unmount();
  });

  it('includes a future TS burn only for the TS purpose', async () => {
    const wrapper = setup('ethereum', 'ts');
    expect(wrapper.text()).toContain('getTs.onboarding.burnStep');
    await wrapper.setProps({ purpose: 'xor' });
    expect(wrapper.text()).not.toContain('getTs.onboarding.burnStep');
    expect(wrapper.findAll('button')).toHaveLength(0);
    wrapper.unmount();
  });

  it('emits only explicit alternative source intentions from the TON route', async () => {
    const wrapper = setup('ton');
    expect(wrapper.emitted('selectSource')).toBeUndefined();
    const buttons = wrapper.findAll('button');
    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    expect(wrapper.emitted('selectSource')).toEqual([['card'], ['ethereum']]);
    await wrapper.setProps({ source: 'card' });
    expect(wrapper.findAll('button')).toHaveLength(0);
    expect(wrapper.text()).toContain('getTs.onboarding.cardCheckout');
    wrapper.unmount();
  });

  it('cannot request a new source while its parent has locked the plan', async () => {
    const wrapper = setup('ton', 'xor', true);
    for (const button of wrapper.findAll('button')) {
      expect(button.attributes('disabled')).toBeDefined();
      await button.trigger('click');
      // Also exercise the handler guard if a synthetic click bypasses native disabled behavior.
      button.element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    expect(wrapper.emitted('selectSource')).toBeUndefined();
    wrapper.unmount();
  });

  it('makes the requirements readable without promising a native card delivery or separate installed apps', () => {
    expect(copy.getTs.onboarding.twoWallets).toBe('2 wallets: Ethereum and SORA');
    expect(copy.getTs.onboarding.threeWallets).toBe('3 wallets: TON, Ethereum and SORA');
    expect(copy.getTs.onboarding.cardRoute).toContain('receive ETH');
    expect(copy.getTs.onboarding.ethereumRoute).toContain('if needed');
    expect(copy.getTs.onboarding.googleCreate).toContain('recovery phrase, password and backup');
    expect(copy.getTs.onboarding.googleRecovery).toContain('Google sign-in does not replace them');
  });
});
