import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import DiscoveryReviewExpiry from '@/features/bot-trading/components/DiscoveryReviewExpiry.vue';

const labels = {
  label: 'Finalized funding check expires in',
  expiredLabel: 'Funding check expired',
  refreshLabel: 'Refresh finalized check',
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-24T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DiscoveryReviewExpiry', () => {
  it('counts down from the absolute deadline and announces only meaningful thresholds', async () => {
    const wrapper = mount(DiscoveryReviewExpiry, { props: { ...labels, expiresAt: Date.now() + 60_000 } });
    const timer = () => wrapper.get('[data-testid="discovery-review-timer"]');
    const announcement = () => wrapper.get('[role="status"]');

    expect(timer().text()).toBe('01:00');
    expect(timer().attributes('aria-live')).toBe('off');
    expect(timer().attributes('aria-label')).toContain('01:00');
    expect(announcement().text()).toBe('');

    await vi.advanceTimersByTimeAsync(1_000);
    await nextTick();
    expect(timer().text()).toBe('00:59');
    expect(announcement().text()).toBe('');

    await vi.advanceTimersByTimeAsync(29_000);
    await nextTick();
    expect(timer().text()).toBe('00:30');
    expect(announcement().text()).toBe('Finalized funding check expires in: 00:30');

    await vi.advanceTimersByTimeAsync(1_000);
    await nextTick();
    expect(timer().text()).toBe('00:29');
    expect(announcement().text()).toBe('Finalized funding check expires in: 00:30');

    await vi.advanceTimersByTimeAsync(19_000);
    await nextTick();
    expect(timer().text()).toBe('00:10');
    expect(announcement().text()).toBe('Finalized funding check expires in: 00:10');

    await vi.advanceTimersByTimeAsync(10_000);
    await nextTick();
    expect(wrapper.find('[role="timer"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="discovery-review-expired"]').text()).toBe('Funding check expired');
    expect(announcement().text()).toBe('Funding check expired');
    wrapper.unmount();
  });

  it('keeps refresh explicit and allows the parent to replace an expired deadline', async () => {
    const wrapper = mount(DiscoveryReviewExpiry, { props: { ...labels, expiresAt: Date.now() - 1 } });
    await nextTick();
    expect(wrapper.get('[data-testid="discovery-review-expired"]').text()).toBe('Funding check expired');
    expect(wrapper.get('[role="status"]').text()).toBe('Funding check expired');
    expect(wrapper.emitted('refresh')).toBeUndefined();

    await wrapper.get('[data-testid="discovery-review-refresh"]').trigger('click');
    expect(wrapper.emitted('refresh')).toHaveLength(1);

    await wrapper.setProps({ expiresAt: Date.now() + 60_000 });
    expect(wrapper.get('[data-testid="discovery-review-timer"]').text()).toBe('01:00');
    await vi.advanceTimersByTimeAsync(1_000);
    await nextTick();
    expect(wrapper.get('[data-testid="discovery-review-timer"]').text()).toBe('00:59');
    wrapper.unmount();
  });

  it('disables refresh while the parent is checking finalized evidence', async () => {
    const wrapper = mount(DiscoveryReviewExpiry, {
      props: { ...labels, expiresAt: Date.now() + 60_000, disabled: true },
    });
    const refresh = wrapper.get('[data-testid="discovery-review-refresh"]');
    expect(refresh.attributes('disabled')).toBeDefined();
    await refresh.trigger('click');
    expect(wrapper.emitted('refresh')).toBeUndefined();
    wrapper.unmount();
  });
});
