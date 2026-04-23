import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { SSkeleton, SSkeletonItem } from '@/lib/soramitsu-ui/components/Skeleton';

describe('SSkeleton', () => {
  it('renders an animated skeleton wrapper with slot content by default', () => {
    const wrapper = mount(SSkeleton, {
      slots: {
        default: '<span class="skeleton-slot">Loading</span>',
      },
    });

    expect(wrapper.classes()).toContain('ps-skeleton');
    expect(wrapper.classes()).toContain('ps-skeleton--animated');
    expect(wrapper.find('.skeleton-slot').text()).toBe('Loading');
  });

  it('omits the animated class when animation is disabled', () => {
    const wrapper = mount(SSkeleton, {
      props: {
        animated: false,
      },
    });

    expect(wrapper.classes()).toContain('ps-skeleton');
    expect(wrapper.classes()).not.toContain('ps-skeleton--animated');
  });
});

describe('SSkeletonItem', () => {
  it('renders variant, circle, and normalized size styles', () => {
    const wrapper = mount(SSkeletonItem, {
      props: {
        variant: 'rect',
        width: 120,
        height: '2rem',
        circle: true,
      },
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining(['ps-skeleton__item', 'ps-skeleton__item--rect', 'ps-skeleton__item--circle'])
    );
    expect(wrapper.element.style.width).toBe('120px');
    expect(wrapper.element.style.height).toBe('2rem');
  });

  it('uses text variant by default and ignores empty dimensions', () => {
    const wrapper = mount(SSkeletonItem, {
      props: {
        width: '',
        height: '',
      },
    });

    expect(wrapper.classes()).toContain('ps-skeleton__item--text');
    expect(wrapper.classes()).not.toContain('ps-skeleton__item--circle');
    expect(wrapper.element.style.width).toBe('');
    expect(wrapper.element.style.height).toBe('');
  });
});
