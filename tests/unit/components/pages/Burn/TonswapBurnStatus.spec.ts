import { mount, type VueWrapper } from '@vue/test-utils';
import { FPNumber } from '@sora-substrate/sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import TonswapBurnStatus from '@/features/misc/components/burn/TonswapBurnStatus.vue';
import statusSource from '@/features/misc/components/burn/TonswapBurnStatus.vue?raw';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params?.xor ? `${key}: ${params.xor}` : key),
  }),
}));

let reduced = false;
let wrapper: VueWrapper | undefined;

function mountStatus(props: Record<string, unknown>): VueWrapper {
  wrapper = mount(TonswapBurnStatus, {
    props: { phase: 'waiting', amount: '250', message: 'status message', ...props },
    global: {
      stubs: {
        's-icon': { props: ['name'], template: '<i :data-icon="name" />' },
        's-button': {
          props: ['disabled'],
          emits: ['click'],
          template: '<button :disabled="disabled" @click="$emit(\'click\', $event)"><slot/></button>',
        },
      },
    },
  });
  return wrapper;
}

const steps = (status: VueWrapper) =>
  status
    .findAll('.burn-status__step')
    .map((step) => `${step.attributes('data-step')}:${step.attributes('data-state')}`);

beforeEach(() => {
  reduced = false;
  vi.useFakeTimers();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: reduced, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  );
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('TonswapBurnStatus', () => {
  it('shows the burned XOR, the progress sentence and the step in progress while a burn is on its way', () => {
    const status = mountStatus({ phase: 'included', reward: new FPNumber('12424.818') });

    expect(status.get('.burn-status__message').text()).toBe('status message');
    expect(status.get('.burn-status__message').attributes('role')).toBe('status');
    expect(status.get('.burn-status__figure').text()).toBe('250XOR');
    expect(steps(status)).toEqual(['sent:done', 'included:done', 'final:active', 'reserved:todo']);
    expect(status.get('[aria-current="step"]').text()).toBe('burnPage.tonswap.steps.final');
    expect(status.findAll('[aria-current="step"]')).toHaveLength(1);
    expect(status.attributes('data-phase')).toBe('included');
    expect(status.attributes('data-settled')).toBe('false');
    expect(status.get('[data-icon]').attributes('data-icon')).toBe('basic-flame-24');
  });

  it('labels the number as an estimate until the reservation is indexed', () => {
    const status = mountStatus({ phase: 'confirmed', reward: new FPNumber('12424.818') });

    expect(status.get('.burn-status__note').text()).toBe('burnPage.tonswap.journey.estimated: ≈ 12,424.818 TS');
    // The headline stays the burned XOR: an estimate is never presented as earned TS.
    expect(status.get('.burn-status__value').text()).toBe('250');
    expect(status.text()).not.toContain('+12,424.818');
  });

  it('shows no TS number at all while there is no campaign data to estimate from', () => {
    const status = mountStatus({ phase: 'waiting', reward: null });

    expect(status.find('.burn-status__note').exists()).toBe(false);
    expect(status.text()).not.toContain('≈');
  });

  it('shows the reserved TS, the claim notice and a way back to the form once the burn is indexed', async () => {
    const status = mountStatus({ phase: 'confirmed', reward: new FPNumber('99.999948669894379752') });
    expect(status.find('.burn-status__dismiss').exists()).toBe(false);

    await status.setProps({ phase: 'updated' });

    expect(status.get('.burn-status__value').text()).toBe('+99.9999');
    expect(status.get('.burn-status__figure').attributes('title')).toBe('99.999948669894379752 TS');
    expect(status.get('.burn-status__note').text()).toBe('burnPage.tonswap.pendingBurnAmount: 250');
    expect(status.get('.burn-status__claim').text()).toBe('burnPage.tonswap.claimNotice');
    expect(steps(status)).toEqual(['sent:done', 'included:done', 'final:done', 'reserved:done']);
    expect(status.attributes('data-settled')).toBe('true');
    expect(status.get('[data-icon]').attributes('data-icon')).toBe('basic-check-mark-24');

    await status.get('.burn-status__dismiss').trigger('click');
    expect(status.emitted('dismiss')).toHaveLength(1);
  });

  it('plays one burst of sparks when the reservation arrives and removes it afterwards', async () => {
    const status = mountStatus({ phase: 'confirmed', reward: new FPNumber('10') });
    expect(status.find('.burn-status__embers--burst').exists()).toBe(false);

    await status.setProps({ phase: 'updated' });
    expect(status.classes()).toContain('burn-status--burst');
    expect(status.findAll('.burn-status__embers--burst i')).toHaveLength(30);
    expect(status.get('.burn-status__embers--burst').attributes('aria-hidden')).toBe('true');

    await vi.advanceTimersByTimeAsync(2_600);
    expect(status.find('.burn-status__embers--burst').exists()).toBe(false);
    expect(status.classes()).not.toContain('burn-status--burst');
  });

  it('stays calm when it mounts already finished, for a source without TS, and for reduced motion', async () => {
    const finished = mountStatus({ phase: 'updated', reward: new FPNumber('10') });
    expect(finished.find('.burn-status__embers--burst').exists()).toBe(false);
    expect(finished.find('.burn-status__embers').exists()).toBe(false);
    finished.unmount();

    const excluded = mountStatus({ phase: 'included', excluded: true });
    await excluded.setProps({ phase: 'updated' });
    expect(excluded.find('.burn-status__embers--burst').exists()).toBe(false);
    excluded.unmount();

    reduced = true;
    const calm = mountStatus({ phase: 'confirmed', reward: new FPNumber('10') });
    expect(calm.find('.burn-status__embers').exists()).toBe(false);
    await calm.setProps({ phase: 'updated' });
    expect(calm.find('.burn-status__embers--burst').exists()).toBe(false);
    expect(calm.get('.burn-status__value').text()).toBe('+10');
  });

  it('finishes a burn from an excluded source at finality with zero TS and no reservation step', () => {
    const status = mountStatus({ phase: 'confirmed', excluded: true, reward: new FPNumber('10') });

    expect(steps(status)).toEqual(['sent:done', 'included:done', 'final:done']);
    expect(status.get('.burn-status__note').text()).toBe('0 TS · burnPage.tonswap.excludedAccount');
    expect(status.get('.burn-status__value').text()).toBe('250');
    expect(status.text()).not.toContain('burnPage.tonswap.claimNotice');
    expect(status.attributes('data-settled')).toBe('true');
    expect(status.find('.burn-status__dismiss').exists()).toBe(true);
  });

  it('reports a failed burn without a TS number and lets the user go back to the form', () => {
    const status = mountStatus({ phase: 'failed', reward: new FPNumber('10') });

    expect(steps(status)).toEqual(['sent:done', 'included:failed', 'final:todo', 'reserved:todo']);
    expect(status.find('.burn-status__note').exists()).toBe(false);
    expect(status.text()).not.toContain('≈');
    expect(status.text()).not.toContain('burnPage.tonswap.claimNotice');
    expect(status.get('[data-icon]').attributes('data-icon')).toBe('basic-flame-24');
    expect(status.find('.burn-status__dismiss').exists()).toBe(true);
  });

  it('offers a status refresh only when confirmation is slow, and holds it while a refresh runs', async () => {
    const status = mountStatus({ phase: 'confirmed' });
    expect(status.find('.burn-status__refresh').exists()).toBe(false);

    await status.setProps({ delayed: true });
    expect(status.text()).toContain('burnPage.tonswap.indexingDelayed');
    await status.get('.burn-status__refresh').trigger('click');
    expect(status.emitted('retry')).toHaveLength(1);

    await status.setProps({ busy: true });
    expect(status.get('.burn-status__refresh').attributes('disabled')).toBeDefined();

    await status.setProps({ phase: 'updated', busy: false });
    expect(status.find('.burn-status__refresh').exists()).toBe(false);
    expect(status.text()).not.toContain('burnPage.tonswap.indexingDelayed');
  });

  it('keeps its own dark surface, stops motion on request and escapes grid minmax() from the global Sass helper', () => {
    expect(statusSource).toMatch(/\.burn-status \{[\s\S]*?linear-gradient\(135deg, #15173a/);
    // Every looping or entrance animation is declared only for users who have not asked for less motion.
    const beforeMotionQuery = statusSource.slice(
      statusSource.indexOf('<style'),
      statusSource.indexOf('@media (prefers-reduced-motion: no-preference)')
    );
    expect(beforeMotionQuery).not.toMatch(/animation: burn-status-(?:flicker|pulse|pop|in)\b/);
    expect(statusSource).toMatch(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?burn-status-flicker/);
    const sass = statusSource.slice(statusSource.indexOf('<style')).replace(/#\{'[^']*'\}/g, '');
    expect(sass).not.toContain('minmax(');
    expect(statusSource).toMatch(/grid-auto-columns: #\{'minmax\(0, 1fr\)'\}/);
  });
});
