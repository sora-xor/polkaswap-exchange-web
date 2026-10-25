import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SNotificationBodyTimeline from '@/lib/soramitsu-ui/components/Notifications/SNotificationBodyTimeline.vue';

describe('SNotificationBodyTimeline', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('mounts without setup reference errors', () => {
    expect(() =>
      mount(SNotificationBodyTimeline, {
        props: {
          timeout: 0,
        },
      })
    ).not.toThrow();
  });

  it('emits timeout when timer elapses', async () => {
    vi.useFakeTimers();

    const wrapper = mount(SNotificationBodyTimeline, {
      props: {
        timeout: 20,
      },
    });

    await vi.advanceTimersByTimeAsync(25);

    expect(wrapper.emitted('timeout')).toHaveLength(1);
  });
});
