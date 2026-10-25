import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import Component from '@/features/misc/components/burn/TonswapJourneyNotice.vue';
import { clearGetTsView, readGetTsView, writeGetTsView } from '@/features/misc/lib/getTsFlow';
import {
  clearTonswapIntent,
  createTonswapIntent,
  readTonswapIntent,
  writeTonswapIntent,
} from '@/features/misc/lib/tonswapOnboarding';

const mocks = vi.hoisted(() => ({
  route: { path: '/swap', fullPath: '/swap', hash: '', query: {} as Record<string, string> },
  replace: vi.fn(),
}));
vi.mock('vue-router', async () => {
  const { reactive } = await import('vue');
  mocks.route = reactive(mocks.route);
  return { useRoute: () => mocks.route, useRouter: () => ({ replace: mocks.replace }) };
});
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('TONSWAP funding return guide', () => {
  beforeEach(() => {
    clearTonswapIntent();
    clearGetTsView();
    clearGetTsView(undefined, 'xor');
    mocks.route.path = '/swap';
    mocks.route.fullPath = '/swap';
    mocks.route.query = {};
    mocks.route.hash = '';
    mocks.replace.mockReset();
  });

  it('keeps the saved campaign reachable while funding, and removes the guide on dismissal', async () => {
    writeTonswapIntent(createTonswapIntent('sora', '12.5')!);
    const wrapper = mount(Component, {
      global: { stubs: { RouterLink: { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' } } },
    });
    expect(wrapper.find('aside').exists()).toBe(true);
    expect(wrapper.getComponent({ name: 'RouterLink' }).props('to')).toEqual({
      path: '/burn',
      query: { campaign: 'tonswap' },
    });
    await wrapper.get('button').trigger('click');
    expect(wrapper.find('aside').exists()).toBe(false);
    expect(readTonswapIntent()).toBeNull();
    wrapper.unmount();
  });

  it('supports direct campaign links without storage and leaves unrelated query fields intact', async () => {
    mocks.route.query = { campaign: 'tonswap', acquire: 'XOR', other: 'kept' };
    const wrapper = mount(Component, { global: { stubs: { RouterLink: true } } });
    await wrapper.get('button').trigger('click');
    expect(mocks.replace).toHaveBeenCalledWith({ path: '/swap', hash: '', query: { other: 'kept' } });
    wrapper.unmount();
  });

  it('does not show campaign guidance on unrelated pages or ordinary swaps', () => {
    const ordinary = mount(Component, { global: { stubs: { RouterLink: true } } });
    expect(ordinary.find('aside').exists()).toBe(false);
    ordinary.unmount();
    writeTonswapIntent(createTonswapIntent('sora')!);
    mocks.route.path = '/pool';
    const unrelated = mount(Component, { global: { stubs: { RouterLink: true } } });
    expect(unrelated.find('aside').exists()).toBe(false);
    unrelated.unmount();
  });

  it('returns a saved Get TS view to the wizard without showing an older burn amount', () => {
    writeGetTsView({ version: 1, source: 'ethereum', step: 'bridge' });
    writeTonswapIntent(createTonswapIntent('sora', '12.5')!);
    mocks.route.path = '/bridge';
    const wrapper = mount(Component, {
      global: { stubs: { RouterLink: { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' } } },
    });
    expect(wrapper.getComponent({ name: 'RouterLink' }).props('to')).toEqual({ path: '/get-ts' });
    expect(wrapper.text()).toContain('getTs.resumeTitle');
    expect(wrapper.text()).not.toContain('burnPage.tonswap.journey.savedAmount');
    wrapper.unmount();
  });

  it('supports a direct Get TS link and dismisses both guides without removing unrelated navigation', async () => {
    mocks.route.query = { campaign: 'tonswap', getTs: '1', asset: 'DAI', other: 'kept' };
    mocks.route.hash = '#details';
    const wrapper = mount(Component, { global: { stubs: { RouterLink: true } } });
    expect(wrapper.text()).toContain('getTs.resumeTitle');
    writeGetTsView({ version: 1, source: 'ton', step: 'bridge' });
    writeTonswapIntent(createTonswapIntent('sora')!);
    await wrapper.get('button').trigger('click');
    expect(wrapper.find('aside').exists()).toBe(false);
    expect(readGetTsView()).toBeNull();
    expect(readTonswapIntent()).toBeNull();
    expect(mocks.replace).toHaveBeenCalledWith({ path: '/swap', hash: '#details', query: { other: 'kept' } });
    wrapper.unmount();
  });

  it('accepts only the exact Get TS flag and preserves an unrelated campaign on dismissal', async () => {
    mocks.route.query = { campaign: 'unrelated', getTs: 'true' };
    const unrelated = mount(Component, { global: { stubs: { RouterLink: true } } });
    expect(unrelated.find('aside').exists()).toBe(false);
    unrelated.unmount();
    mocks.route.query = { campaign: 'unrelated', getTs: '1', asset: 'DAI' };
    const wrapper = mount(Component, { global: { stubs: { RouterLink: true } } });
    await wrapper.get('button').trigger('click');
    expect(mocks.replace).toHaveBeenCalledWith({
      path: '/swap',
      hash: '',
      query: { campaign: 'unrelated', asset: 'DAI' },
    });
    wrapper.unmount();
  });

  it('refreshes saved wizard state when the shared shell moves to a funding screen', async () => {
    mocks.route.path = '/get-ts';
    mocks.route.fullPath = '/get-ts';
    const wrapper = mount(Component, {
      global: { stubs: { RouterLink: { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' } } },
    });
    expect(wrapper.find('aside').exists()).toBe(false);
    writeGetTsView({ version: 1, source: 'ton', step: 'bridge' });
    mocks.route.path = '/bridge/history';
    mocks.route.fullPath = '/bridge/history';
    await nextTick();
    expect(wrapper.find('aside').exists()).toBe(true);
    expect(wrapper.getComponent({ name: 'RouterLink' }).props('to')).toEqual({ path: '/get-ts' });
    wrapper.unmount();
  });
  it('returns a generic funding route to Buy XOR and dismisses only its own saved view', async () => {
    const ts = { version: 1, source: 'ethereum', step: 'bridge' } as const;
    writeGetTsView(ts);
    writeGetTsView(ts, undefined, 'xor');
    mocks.route.query = { buyXor: '1', asset: 'DAI', other: 'kept' };
    const wrapper = mount(Component, {
      global: { stubs: { RouterLink: { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' } } },
    });
    expect(wrapper.getComponent({ name: 'RouterLink' }).props('to')).toEqual({ path: '/buy-xor' });
    expect(wrapper.text()).toContain('buyXor.resumeTitle');
    expect(wrapper.text()).not.toContain('getTs.resumeTitle');
    await wrapper.get('button').trigger('click');
    expect(readGetTsView()).toEqual(ts);
    expect(readGetTsView(undefined, 'xor')).toBeNull();
    expect(mocks.replace).toHaveBeenCalledWith({ path: '/swap', hash: '', query: { other: 'kept' } });
    wrapper.unmount();
  });
  it('does not choose between two saved purchase purposes without an explicit route', () => {
    const view = { version: 1, source: 'ethereum', step: 'bridge' } as const;
    writeGetTsView(view);
    writeGetTsView(view, undefined, 'xor');
    const wrapper = mount(Component, { global: { stubs: { RouterLink: true } } });
    expect(wrapper.find('aside').exists()).toBe(false);
    wrapper.unmount();
  });
  it('cannot turn conflicting generic funding flags into a burn return link', () => {
    mocks.route.query = { buyXor: '1', campaign: 'tonswap', getTs: '1' };
    const wrapper = mount(Component, { global: { stubs: { RouterLink: true } } });
    expect(wrapper.find('aside').exists()).toBe(false);
    wrapper.unmount();
  });
});
