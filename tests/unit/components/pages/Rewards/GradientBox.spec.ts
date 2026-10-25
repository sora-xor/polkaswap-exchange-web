import { shallowMount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import RewardsGradientBox from '@/features/rewards/components/rewards/GradientBox.vue';

const resolveComponentOptions = (component: unknown) =>
  (component as { __vccOpts?: Record<string, unknown> }).__vccOpts ?? component;

describe('RewardsGradientBox.vue', () => {
  it('applies the lowercased symbol as a modifier class', () => {
    const wrapper = shallowMount(RewardsGradientBox, {
      props: {
        symbol: 'PSWAP',
      },
      slots: {
        default: '<p>content</p>',
      },
    });

    expect(wrapper.classes()).toContain('gradient-box');
    expect(wrapper.classes()).toContain('gradient-box--pswap');
  });

  it('falls back to the base class when no symbol is provided', () => {
    const wrapper = shallowMount(RewardsGradientBox);

    expect(wrapper.classes()).toEqual(['gradient-box']);
  });

  it('adds a state modifier when the page reports one', () => {
    const wrapper = shallowMount(RewardsGradientBox, { props: { symbol: 'VAL', state: 'ready' } });

    expect(wrapper.classes()).toEqual(['gradient-box', 'gradient-box--val', 'gradient-box--ready']);
  });

  it('renders the slot in a content layer above a decorative layer hidden from assistive tech', () => {
    const wrapper = shallowMount(RewardsGradientBox, { slots: { default: '<p class="slotted">content</p>' } });

    expect(wrapper.find('.gradient-box__content .slotted').exists()).toBe(true);
    expect(wrapper.find('.gradient-box__decor').attributes('aria-hidden')).toBe('true');
    expect(wrapper.find('.gradient-box__decor .slotted').exists()).toBe(false);
  });

  it('draws the same sparks on every render', () => {
    const first = shallowMount(RewardsGradientBox).findAll('.gradient-box__spark');
    const second = shallowMount(RewardsGradientBox).findAll('.gradient-box__spark');

    expect(first).toHaveLength(14);
    expect(first.map((spark) => spark.attributes('style'))).toEqual(second.map((spark) => spark.attributes('style')));
  });

  it('does not rely on compat-only component config', () => {
    expect(resolveComponentOptions(RewardsGradientBox)).not.toHaveProperty('compatConfig');
  });
});
