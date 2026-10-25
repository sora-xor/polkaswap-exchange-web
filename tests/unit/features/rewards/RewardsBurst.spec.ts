import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import RewardsBurst from '@/features/rewards/components/rewards/RewardsBurst.vue';

const stubMotion = (reduced: boolean) => {
  const query = { matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() };

  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => query)
  );
  window.matchMedia = globalThis.matchMedia;
};

beforeEach(() => {
  vi.useFakeTimers();
  stubMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('RewardsBurst.vue', () => {
  it('renders nothing until a claim succeeds', () => {
    const wrapper = mount(RewardsBurst);

    expect(wrapper.find('.rw-burst').exists()).toBe(false);
  });

  it('plays when it becomes active and removes itself afterwards', async () => {
    const wrapper = mount(RewardsBurst, { props: { duration: 1500 } });

    await wrapper.setProps({ active: true });

    expect(wrapper.find('.rw-burst').attributes('aria-hidden')).toBe('true');
    expect(wrapper.findAll('.rw-burst__ring')).toHaveLength(2);
    expect(wrapper.findAll('.rw-burst__particle')).toHaveLength(28);

    vi.advanceTimersByTime(1499);
    await nextTick();
    expect(wrapper.find('.rw-burst').exists()).toBe(true);

    vi.advanceTimersByTime(2);
    await nextTick();
    expect(wrapper.find('.rw-burst').exists()).toBe(false);
  });

  it('limits the spray to the requested number of particles', async () => {
    const wrapper = mount(RewardsBurst, { props: { count: 5 } });

    await wrapper.setProps({ active: true });

    expect(wrapper.findAll('.rw-burst__particle')).toHaveLength(5);
  });

  it('gives every particle the same flight on every run', async () => {
    const first = mount(RewardsBurst);
    const second = mount(RewardsBurst);

    await first.setProps({ active: true });
    await second.setProps({ active: true });

    expect(first.findAll('.rw-burst__particle').map((particle) => particle.attributes('style'))).toEqual(
      second.findAll('.rw-burst__particle').map((particle) => particle.attributes('style'))
    );
  });

  it('restarts cleanly when it is switched off and on again', async () => {
    const wrapper = mount(RewardsBurst, { props: { duration: 1000 } });

    await wrapper.setProps({ active: true });
    vi.advanceTimersByTime(600);
    await wrapper.setProps({ active: false });
    expect(wrapper.find('.rw-burst').exists()).toBe(false);

    await wrapper.setProps({ active: true });
    vi.advanceTimersByTime(600);
    await nextTick();

    // 600 ms into the second run: the first run's timer must not have cut it short.
    expect(wrapper.find('.rw-burst').exists()).toBe(true);
  });

  it('does not play for users who prefer reduced motion', async () => {
    stubMotion(true);

    const wrapper = mount(RewardsBurst);

    await wrapper.setProps({ active: true });

    expect(wrapper.find('.rw-burst').exists()).toBe(false);
  });

  it('cancels its timer when it is removed', async () => {
    const wrapper = mount(RewardsBurst);

    await wrapper.setProps({ active: true });
    wrapper.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
