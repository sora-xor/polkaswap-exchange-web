import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import TonswapOnboarding from '@/features/misc/components/burn/TonswapOnboarding.vue';
import { createTonswapIntent, readTonswapIntent, writeTonswapIntent } from '@/features/misc/lib/tonswapOnboarding';

const push = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const trackStep = vi.hoisted(() => vi.fn());
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/features/misc/lib/tonswapTelemetry', () => ({ trackTonswapStep: trackStep }));

/** Mounts the presentation component without loading wallet, signing or payment services. */
function setup(props: { isLoggedIn?: boolean; googleWalletAvailable?: boolean; amount?: string } = {}) {
  return mount(TonswapOnboarding, {
    props,
    global: {
      stubs: {
        's-button': { template: '<button type="button"><slot /></button>' },
      },
    },
  });
}

describe('TonswapOnboarding', () => {
  beforeEach(() => {
    sessionStorage.clear();
    push.mockClear();
    trackStep.mockClear();
  });

  it('offers four real starting points without navigating or connecting on selection', async () => {
    const wrapper = setup({ amount: '2.000000000000000001' });
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(4);
    expect(wrapper.find('button').exists()).toBe(false);
    await wrapper.get('input[value="sora"]').setValue(true);
    expect(wrapper.text()).toContain('burnPage.tonswap.onboarding.guidance.sora');
    expect(readTonswapIntent()).toMatchObject({ startingPoint: 'sora', amount: '2.000000000000000001' });
    expect(push).not.toHaveBeenCalled();
    expect(wrapper.emitted('connect')).toBeUndefined();
    expect(trackStep).not.toHaveBeenCalled();
  });

  it('connects first and asks for an explicit next action after the wallet changes', async () => {
    const wrapper = setup();
    await wrapper.get('input[value="xor"]').setValue(true);
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('connect')).toHaveLength(1);
    expect(wrapper.emitted('review')).toBeUndefined();
    await wrapper.setProps({ isLoggedIn: true });
    expect(wrapper.emitted('review')).toBeUndefined();
    await wrapper.get('button').trigger('click');
    expect(wrapper.emitted('review')).toHaveLength(1);
    expect(push).not.toHaveBeenCalled();
  });

  it('navigates supported funding routes while preserving the latest valid preview amount', async () => {
    const wrapper = setup({ isLoggedIn: true, amount: '1' });
    await wrapper.get('input[value="sora"]').setValue(true);
    await wrapper.setProps({ amount: '2.5' });
    await wrapper.get('button').trigger('click');
    expect(push).toHaveBeenLastCalledWith({ path: '/swap', query: { campaign: 'tonswap', acquire: 'XOR' } });
    expect(trackStep).toHaveBeenLastCalledWith('funding_started', 'swap');
    expect(readTonswapIntent()?.amount).toBe('2.5');
    await wrapper.get('input[value="exchange"]').setValue(true);
    await wrapper.get('button').trigger('click');
    expect(push).toHaveBeenLastCalledWith({ path: '/deposit/transfer-from-cex', query: { campaign: 'tonswap' } });
    expect(trackStep).toHaveBeenLastCalledWith('funding_started', 'deposit');
    await wrapper.get('input[value="newWallet"]').setValue(true);
    await wrapper.get('button').trigger('click');
    expect(push).toHaveBeenLastCalledWith({ path: '/deposit', query: { campaign: 'tonswap' } });
    await wrapper.setProps({ amount: 'not an amount' });
    expect(readTonswapIntent()?.amount).toBeUndefined();
  });

  it('shows extension-free Google guidance only when that wallet is available', async () => {
    const wrapper = setup();
    await wrapper.get('input[value="newWallet"]').setValue(true);
    expect(wrapper.text()).toContain('burnPage.tonswap.onboarding.backup');
    expect(wrapper.text()).not.toContain('burnPage.tonswap.onboarding.googleAvailable');
    await wrapper.setProps({ googleWalletAvailable: true });
    expect(wrapper.text()).toContain('burnPage.tonswap.onboarding.googleAvailable');
    await wrapper.get('input[value="sora"]').setValue(true);
    expect(wrapper.text()).not.toContain('burnPage.tonswap.onboarding.googleAvailable');
  });

  it('restores a recent choice without automatically purchasing or opening a wallet', async () => {
    writeTonswapIntent(createTonswapIntent('exchange', '1')!);
    const wrapper = setup();
    await nextTick();
    expect((wrapper.get('input[value="exchange"]').element as HTMLInputElement).checked).toBe(true);
    expect(push).not.toHaveBeenCalled();
    expect(wrapper.emitted('connect')).toBeUndefined();
    expect(wrapper.emitted('review')).toBeUndefined();
  });
});
