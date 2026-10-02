import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BotGoalSetup from '@/features/bot-trading/components/BotGoalSetup.vue';
import type { BotAsset } from '@/features/bot-trading/types';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      key === 'bots.goals.defaultTitle'
        ? 'Grow my capital'
        : `${key}${values ? ` ${Object.values(values).join(' ')}` : ''}`,
  }),
}));

const assets: BotAsset[] = [
  { address: 'capital', symbol: 'CAPITAL', decimals: 6 },
  { address: 'trade', symbol: 'TRADE', decimals: 18 },
  { address: 'third', symbol: 'THIRD', decimals: 18 },
];
const wrappers: VueWrapper[] = [];

/** Render only the form; no account, provider, or market service is invoked. */
function render(catalog = assets) {
  const wrapper = mount(BotGoalSetup, { props: { assets: catalog, busy: false } });
  wrappers.push(wrapper);
  return wrapper;
}

afterEach(() => wrappers.splice(0).forEach((wrapper) => wrapper.unmount()));

describe('BotGoalSetup', () => {
  it('starts with an editable paper goal and emits exact decimal strings only on submit', async () => {
    const wrapper = render();
    expect(wrapper.get('[data-testid="goal-title"]').element).toHaveProperty('value', 'Grow my capital');
    expect(wrapper.find('input[type="password"]').exists()).toBe(false);
    expect(wrapper.emitted('create')).toBeUndefined();
    await wrapper.get('[data-testid="goal-title"]').setValue('  My first goal  ');
    await wrapper.get('[data-testid="goal-allocation"]').setValue('123.000001');
    await wrapper.get('[data-testid="goal-target"]').setValue('2.125');
    await wrapper.get('[data-testid="goal-loss"]').setValue('3.50');
    await wrapper.get('[data-testid="goal-duration"]').setValue(86_400_000);
    await wrapper.get('[data-testid="goal-fee-budget"]').setValue('0.000000000000000001');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('create')).toEqual([
      [
        {
          name: 'My first goal',
          title: 'My first goal',
          assetInAddress: 'capital',
          assetOutAddress: 'trade',
          allocation: '123.000001',
          feeBudget: '0.000000000000000001',
          targetReturnPercent: '2.125',
          maxLossPercent: '3.50',
          durationMs: 86_400_000,
        },
      ],
    ]);
  });

  it('requires a title and two eligible tokens before creating', async () => {
    const wrapper = render([]);
    expect(wrapper.get('[data-testid="goal-create"]').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('create')).toBeUndefined();
    await wrapper.setProps({ assets });
    expect(wrapper.get('[data-testid="goal-create"]').attributes('disabled')).toBeUndefined();
    await wrapper.get('[data-testid="goal-title"]').setValue('   ');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('create')).toBeUndefined();
    expect(wrapper.get('[data-testid="goal-validation"]').text()).toBe('bots.goals.errors.name');
  });

  it('keeps the pair distinct when its capital token changes and retains selections on catalog refresh', async () => {
    const wrapper = render();
    await wrapper.get('[data-testid="goal-asset-in"]').setValue('trade');
    expect(wrapper.get('[data-testid="goal-asset-out"]').element).toHaveProperty('value', 'capital');
    await wrapper.get('[data-testid="goal-asset-out"]').setValue('third');
    await wrapper.setProps({ assets: assets.map((asset) => ({ ...asset })) });
    expect(wrapper.get('[data-testid="goal-asset-in"]').element).toHaveProperty('value', 'trade');
    expect(wrapper.get('[data-testid="goal-asset-out"]').element).toHaveProperty('value', 'third');
    await wrapper.setProps({ assets: [assets[1]] });
    expect(wrapper.get('[data-testid="goal-create"]').attributes('disabled')).toBeDefined();
  });

  it.each(['0', '-1', '1e6', '0.0000001', 'NaN'])(
    'rejects unsupported capital %s without silent rounding',
    async (amount) => {
      const wrapper = render();
      await wrapper.get('[data-testid="goal-allocation"]').setValue(amount);
      await wrapper.get('form').trigger('submit');
      expect(wrapper.emitted('create')).toBeUndefined();
      expect(wrapper.get('[data-testid="goal-validation"]').text()).toBe('bots.goals.errors.capital');
    }
  );

  it.each([
    ['goal-target', '0'],
    ['goal-target', '10001'],
    ['goal-loss', '0'],
    ['goal-loss', '100.01'],
    ['goal-loss', '-5'],
  ])('refuses invalid goal percentages at %s=%s', async (field, amount) => {
    const wrapper = render();
    await wrapper.get(`[data-testid="${field}"]`).setValue(amount);
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('create')).toBeUndefined();
    expect(wrapper.get('[data-testid="goal-validation"]').text()).toBe('bots.goals.errors.percent');
  });

  it('requires a positive fee allowance and blocks duplicate submissions while busy', async () => {
    const wrapper = render();
    await wrapper.get('[data-testid="goal-fee-budget"]').setValue('0');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('create')).toBeUndefined();
    expect(wrapper.get('[data-testid="goal-validation"]').text()).toBe('bots.goals.errors.fee');
    await wrapper.get('[data-testid="goal-fee-budget"]').setValue('1');
    await wrapper.setProps({ busy: true });
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    expect(wrapper.emitted('create')).toBeUndefined();
  });

  it('keeps paper mode and pause behavior visible without introductory copy', async () => {
    const wrapper = render();
    expect(wrapper.text()).toContain('bots.goals.paperLabel');
    expect(wrapper.text()).toContain('bots.goals.pauseHelp');
    expect(wrapper.text()).not.toContain('bots.goals.setupNote');
    expect(wrapper.text()).not.toContain('bots.goals.setupHelp');
    expect(wrapper.get('details').attributes('open')).toBeUndefined();
    await wrapper.get('.goal-cancel').trigger('click');
    expect(wrapper.emitted('cancel')).toEqual([[]]);
  });
});
