import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import RewardsClaimSteps from '@/features/rewards/components/rewards/RewardsClaimSteps.vue';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ TranslationConsts: { Ethereum: 'Ethereum', Sora: 'SORA' } }),
}));

const mountSteps = (props: Record<string, unknown> = {}) => mount(RewardsClaimSteps, { props });

const states = (wrapper: ReturnType<typeof mountSteps>) =>
  wrapper.findAll('.rw-step').map((step) => step.classes().find((name) => name.startsWith('is-')));

describe('RewardsClaimSteps.vue', () => {
  it('shows a single SORA step when only one signature is needed', () => {
    const wrapper = mountSteps({ total: 1, current: 1 });

    expect(wrapper.findAll('.rw-step__name').map((name) => name.text())).toEqual(['SORA']);
    expect(states(wrapper)).toEqual(['is-active']);
  });

  it('puts the Ethereum wallet first when two signatures are needed', () => {
    const wrapper = mountSteps({ total: 2, current: 1 });

    expect(wrapper.findAll('.rw-step__name').map((name) => name.text())).toEqual(['Ethereum', 'SORA']);
    expect(states(wrapper)).toEqual(['is-active', 'is-idle']);
  });

  it('marks earlier steps done and the running step active', () => {
    const wrapper = mountSteps({ total: 2, current: 2, label: 'Sign and claim' });

    expect(states(wrapper)).toEqual(['is-done', 'is-active']);
    expect(wrapper.findAll('.rw-step')[1].attributes('aria-current')).toBe('step');
    expect(wrapper.findAll('.rw-step')[0].attributes('aria-current')).toBeUndefined();
    expect(wrapper.find('ol').attributes('aria-label')).toBe('Sign and claim');
  });

  it('draws a check on done steps and the step number on the others', () => {
    const wrapper = mountSteps({ total: 2, current: 2 });
    const nodes = wrapper.findAll('.rw-step__node');

    expect(nodes[0].find('svg path').attributes('d')).toBe('M3.5 8.5l3 3 6-7');
    expect(nodes[1].find('svg').exists()).toBe(false);
    expect(nodes[1].text()).toBe('2');
  });

  it('marks the failed step with a cross and keeps later steps idle', () => {
    const wrapper = mountSteps({ total: 3, current: 2, status: 'error' });

    expect(states(wrapper)).toEqual(['is-done', 'is-error', 'is-idle']);
    expect(wrapper.findAll('.rw-step')[1].attributes('aria-current')).toBeUndefined();
    expect(wrapper.findAll('.rw-step__node')[1].find('svg path').attributes('d')).toBe('M4.5 4.5l7 7M11.5 4.5l-7 7');
  });

  it('finishes every step once the claim is done', () => {
    const wrapper = mountSteps({ total: 2, current: 1, status: 'done' });

    expect(states(wrapper)).toEqual(['is-done', 'is-done']);
    expect(wrapper.find('.rw-steps').classes()).toContain('rw-steps--done');
  });
});
