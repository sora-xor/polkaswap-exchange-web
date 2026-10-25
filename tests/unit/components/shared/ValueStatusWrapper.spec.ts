import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import ValueStatusWrapper from '@/components/shared/ValueStatusWrapper.vue';
import { DifferenceStatus } from '@/utils/swap';

const IconStub = {
  name: 'SIconStub',
  props: ['name', 'size'],
  template: '<i class="s-icon-stub" :data-name="name" :data-size="size"></i>',
};

const mountComponent = (props?: Record<string, unknown>) =>
  mount(ValueStatusWrapper, {
    slots: {
      default: '<span class="slot-content">content</span>',
    },
    props,
    global: {
      stubs: {
        's-icon': IconStub,
      },
    },
  });

describe('ValueStatusWrapper', () => {
  it('computes status through provided callback', () => {
    const wrapper = mountComponent({
      value: '10',
      getStatus: (value: number) => (value > 0 ? DifferenceStatus.Success : DifferenceStatus.Warning),
    });

    expect(wrapper.classes()).toContain(DifferenceStatus.Success);
  });

  it('shows error icon only when badge and error status are active', () => {
    const wrapper = mountComponent({
      badge: true,
      value: -5,
      getStatus: () => DifferenceStatus.Error,
      errorIconSize: 24,
    });

    expect(wrapper.find('.s-icon-stub').exists()).toBe(true);
    expect(wrapper.find('.s-icon-stub').attributes('data-size')).toBe('24');
  });

  it('omits icon when no badge is provided even on error', () => {
    const wrapper = mountComponent({
      badge: false,
      value: -5,
      getStatus: () => DifferenceStatus.Error,
    });

    expect(wrapper.find('.s-icon-stub').exists()).toBe(false);
  });
});
