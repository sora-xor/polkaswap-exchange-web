import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { SSkeleton, SSkeletonItem } from '@/lib/soramitsu-ui/components/Skeleton';

describe('SSkeleton', () => {
  it('renders the loading template with live skeleton classes by default', () => {
    const wrapper = mount(SSkeleton, {
      attrs: {
        class: 'charts-container',
      },
      slots: {
        template: '<span class="skeleton-template">Loading</span>',
        default: '<span class="skeleton-content">Loaded</span>',
      },
    });

    expect(wrapper.classes()).toContain('s-skeleton');
    expect(wrapper.classes()).toContain('ps-skeleton');
    expect(wrapper.classes()).toContain('charts-container');
    expect(wrapper.classes()).not.toContain('ps-skeleton--animated');
    expect(wrapper.find('.el-skeleton').classes()).not.toContain('is-animated');
    expect(wrapper.find('.skeleton-template').text()).toBe('Loading');
    expect(wrapper.find('.skeleton-content').exists()).toBe(false);
  });

  it('adds animation classes when animated is enabled', () => {
    const wrapper = mount(SSkeleton, {
      props: {
        animated: true,
      },
      slots: {
        template: '<span class="skeleton-template">Loading</span>',
      },
    });

    expect(wrapper.classes()).toContain('ps-skeleton--animated');
    expect(wrapper.find('.el-skeleton').classes()).toContain('is-animated');
  });

  it('renders default content and omits animation classes when loading is false', () => {
    const wrapper = mount(SSkeleton, {
      props: {
        animated: false,
        loading: false,
      },
      slots: {
        template: '<span class="skeleton-template">Loading</span>',
        default: '<span class="skeleton-content">Loaded</span>',
      },
    });

    expect(wrapper.classes()).toContain('ps-skeleton');
    expect(wrapper.classes()).not.toContain('ps-skeleton--animated');
    expect(wrapper.find('.el-skeleton').exists()).toBe(false);
    expect(wrapper.find('.skeleton-content').text()).toBe('Loaded');
    expect(wrapper.find('.skeleton-template').exists()).toBe(false);
  });
});

describe('SSkeletonItem', () => {
  it('renders Element and legacy classes with normalized size styles', () => {
    const wrapper = mount(SSkeletonItem, {
      attrs: {
        class: 'charts-skeleton-price',
      },
      props: {
        element: 'circle',
        width: 120,
        height: '2rem',
      },
    });

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        'el-skeleton__item',
        'el-skeleton__circle',
        'ps-skeleton__item',
        'ps-skeleton__item--circle',
        'charts-skeleton-price',
      ])
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

  it('falls back to text classes for unsupported element names', () => {
    const wrapper = mount(SSkeletonItem, {
      props: {
        element: 'unsupported',
        variant: 'unsupported',
      },
    });

    expect(wrapper.classes()).toContain('el-skeleton__text');
    expect(wrapper.classes()).toContain('ps-skeleton__item--text');
    expect(wrapper.classes()).not.toContain('el-skeleton__unsupported');
  });
});
