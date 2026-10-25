import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import DataRowSkeleton from '@/components/shared/Skeleton/DataRow.vue';

const SkeletonStub = {
  name: 'SSkeletonStub',
  props: ['loading', 'animated'],
  template: '<div class="s-skeleton-stub" :data-loading="loading"><slot /><slot name="template" /></div>',
};

const SkeletonItemStub = {
  name: 'SSkeletonItemStub',
  props: ['element'],
  template: '<div class="s-skeleton-item-stub" :data-element="element"></div>',
};

const mountComponent = (props?: Record<string, unknown>) =>
  mount(DataRowSkeleton, {
    props,
    slots: {
      default: '<div class="content-slot">Loaded</div>',
    },
    global: {
      stubs: {
        's-skeleton': SkeletonStub,
        's-skeleton-item': SkeletonItemStub,
      },
    },
  });

describe('DataRowSkeleton', () => {
  it('renders both rect and circle placeholders when enabled', () => {
    const wrapper = mountComponent({
      rect: true,
      circle: true,
    });

    const skeletonItems = wrapper.findAll('.s-skeleton-item-stub');
    const elements = skeletonItems.map((el) => el.attributes('data-element'));

    expect(elements).toContain('rect');
    expect(elements).toContain('circle');
  });

  it('hides placeholders when flags are disabled', () => {
    const wrapper = mountComponent({
      rect: false,
      circle: false,
    });

    expect(wrapper.findAll('.s-skeleton-item-stub')).toHaveLength(0);
    expect(wrapper.find('.content-slot').exists()).toBe(true);
  });
});
