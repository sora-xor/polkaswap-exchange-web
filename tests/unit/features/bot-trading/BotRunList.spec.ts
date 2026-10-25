import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BotRunList from '@/features/bot-trading/components/BotRunList.vue';
import type { BotRunItem } from '@/features/bot-trading/runs';
import { FPNumber } from '@/lib/substrate/math';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
  }),
}));

function item(overrides: Partial<BotRunItem> = {}): BotRunItem {
  return {
    id: 'bot-1',
    name: 'PSWAP bot',
    mode: 'paper',
    assetIn: 'XOR',
    assetOut: 'PSWAP',
    state: 'running',
    endsAt: Date.UTC(2026, 9, 11, 14, 25),
    returnPercent: '1.2',
    account: '',
    needsPassword: false,
    ...overrides,
  };
}

function render(items: BotRunItem[], props: Record<string, unknown> = {}) {
  return mount(BotRunList, { props: { items, ...props }, attachTo: document.body });
}

afterEach(() => {
  FPNumber.DELIMITERS_CONFIG = { thousand: ',', decimal: '.' };
  document.body.innerHTML = '';
});

describe('BotRunList', () => {
  it('names each bot with its mode, pair, state and result in its own token', () => {
    const wrapper = render([item(), item({ id: 'bot-2', state: 'continuing', returnPercent: '-0.5' })]);
    const first = wrapper.get('[data-testid="bot-run-bot-1"]');
    expect(first.text()).toContain('PSWAP bot');
    expect(first.text()).toContain('bots.modes.paper');
    expect(first.text()).toContain('XOR / PSWAP');
    expect(wrapper.get('[data-testid="bot-run-status-bot-1"]').text()).toContain('bots.status.running');
    expect(wrapper.get('[data-testid="bot-run-status-bot-1"]').text()).toContain('bots.runs.detail.until');
    const result = wrapper.get('[data-testid="bot-run-result-bot-1"]');
    expect(result.text()).toContain('bots.runs.result {"symbol":"XOR"}');
    expect(result.get('bdi').text()).toBe('+1.20%');
    expect(result.get('bdi').classes()).toContain('up');
    expect(wrapper.get('[data-testid="bot-run-result-bot-2"] bdi').text()).toBe('-0.50%');
    expect(wrapper.get('[data-testid="bot-run-status-bot-2"]').text()).toContain('bots.runs.state.continuing');
  });

  it('uses the app language decimal mark for results', () => {
    FPNumber.DELIMITERS_CONFIG = { thousand: '.', decimal: ',' };
    expect(render([item()]).get('[data-testid="bot-run-result-bot-1"] bdi').text()).toBe('+1,20%');
  });

  it('offers the controls each state allows', () => {
    const wrapper = render([
      item({ id: 'running' }),
      item({ id: 'paused', state: 'paused' }),
      item({
        id: 'wallet',
        state: 'wallet',
        mode: 'live',
        account: 'cnVkoGs3rEMqLqY27c2nfVXJRGdzNJk2ns78DcqtppaSRe8qm',
      }),
      item({ id: 'open', state: 'open' }),
      item({ id: 'attention', state: 'attention', returnPercent: null }),
    ]);
    const buttons = (id: string) =>
      wrapper
        .findAll(`[data-testid="bot-run-${id}"] .bot-run-actions button`)
        .map((button) => button.attributes('data-testid'));
    expect(buttons('running')).toEqual(['bot-run-pause-running', 'bot-run-stop-running']);
    expect(buttons('paused')).toEqual(['bot-run-resume-paused', 'bot-run-stop-paused']);
    expect(buttons('wallet')).toEqual(['bot-run-connect-wallet', 'bot-run-stop-wallet']);
    expect(buttons('open')).toEqual(['bot-run-open-open', 'bot-run-stop-open']);
    expect(buttons('attention')).toEqual(['bot-run-open-attention', 'bot-run-stop-attention']);
    expect(wrapper.get('[data-testid="bot-run-status-wallet"]').text()).toContain('"account":"cnVkoG…e8qm"');
    expect(wrapper.find('[data-testid="bot-run-result-attention"]').exists()).toBe(false);
  });

  it('emits the chosen action for the row', async () => {
    const wrapper = render([item(), item({ id: 'paused', state: 'paused' }), item({ id: 'open', state: 'open' })]);
    await wrapper.get('[data-testid="bot-run-pause-bot-1"]').trigger('click');
    await wrapper.get('[data-testid="bot-run-stop-bot-1"]').trigger('click');
    await wrapper.get('[data-testid="bot-run-resume-paused"]').trigger('click');
    await wrapper.get('[data-testid="bot-run-open-open"]').trigger('click');
    expect(wrapper.emitted('pause')).toEqual([['bot-1']]);
    expect(wrapper.emitted('stop')).toEqual([['bot-1']]);
    expect(wrapper.emitted('resume')).toEqual([['paused']]);
    expect(wrapper.emitted('open')).toEqual([['open']]);
  });

  it('asks a built-in wallet bot for the password once, then clears the field', async () => {
    const wrapper = render([item({ state: 'password', mode: 'live', needsPassword: true })]);
    const resume = wrapper.get('[data-testid="bot-run-resume-bot-1"]');
    expect(resume.text()).toBe('bots.runs.continue');
    await resume.trigger('click');
    const form = wrapper.get('[data-testid="bot-run-password-bot-1"]');
    const input = form.get<HTMLInputElement>('input[type="password"]');
    expect(document.activeElement).toBe(input.element);
    // An empty submit does nothing.
    await form.trigger('submit');
    expect(wrapper.emitted('resume')).toBeUndefined();
    await input.setValue('secret');
    await form.trigger('submit');
    expect(wrapper.emitted('resume')).toEqual([['bot-1', 'secret']]);
    expect(input.element.value).toBe('');
    expect(wrapper.find('[data-testid="bot-run-password-bot-1"]').exists()).toBe(false);
  });

  it('can cancel the password step and shows a row error as an alert', async () => {
    const wrapper = render([item({ state: 'paused', mode: 'live', needsPassword: true })], {
      failure: { id: 'bot-1', message: 'bots.errors.wallet' },
    });
    await wrapper.get('[data-testid="bot-run-resume-bot-1"]').trigger('click');
    await wrapper.get('[data-testid="bot-run-password-bot-1"] button[type="button"]').trigger('click');
    expect(wrapper.find('[data-testid="bot-run-password-bot-1"]').exists()).toBe(false);
    expect(wrapper.get('[role="alert"]').text()).toBe('bots.errors.wallet');
  });
});
