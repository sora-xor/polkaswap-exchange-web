import { mount, type VueWrapper } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import RuleBuilder from '@/features/bot-trading/components/RuleBuilder.vue';
import { ruleRecipe, decodeRuleShare, RULE_RECIPE_IDS } from '@/features/bot-trading/rule-recipes';
import type { StrategyRules } from '@/features/bot-trading/strategy-rules';

vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

/** Keep animation rendering out of editor tests; its own suite exercises the live clock. */
function render(editing = true) {
  let wrapper: VueWrapper;
  wrapper = mount(RuleBuilder, {
    props: {
      modelValue: ruleRecipe('trend'),
      name: 'Trend',
      editing,
      'onUpdate:modelValue': (value: StrategyRules) => wrapper.setProps({ modelValue: value }),
      'onUpdate:name': (value: string) => wrapper.setProps({ name: value }),
    },
    slots: { default: '<div data-testid="basic-strategy-flow">Basic strategy</div>' },
    global: { stubs: { RuleFlow: true } },
  });
  return wrapper;
}

describe('manual rule editor', () => {
  it('edits the supplied rule tree when the parent owns recipe selection', async () => {
    const wrapper = render();
    await wrapper.setProps({ showRecipes: false });
    expect(wrapper.find('.rule-recipes').exists()).toBe(false);
    expect(
      wrapper.findAll('[data-testid^="rule-recipe-"]').filter((node) => node.element.tagName === 'BUTTON')
    ).toHaveLength(0);
    expect(wrapper.get('[data-testid="rule-name"]').isVisible()).toBe(true);
    expect(wrapper.getComponent({ name: 'RuleFlow' }).props('rules')).toEqual(ruleRecipe('trend'));
    expect(wrapper.get('[data-testid="rule-recipe-explanation"]').text()).toContain('bots.rules.recipes.trend.idea');
    await wrapper.get('[data-testid="rule-window-entry-0"]').setValue('36');
    expect(wrapper.props('modelValue').entry.conditions[0].window).toBe(36);
    expect(ruleRecipe('trend').entry.conditions[0].window).toBe(48);
    expect(wrapper.emitted('activate')).toBeUndefined();
    wrapper.unmount();
  });

  it('keeps editing and invalid feedback available when the parent owns the animation', async () => {
    const wrapper = render();
    expect(wrapper.findComponent({ name: 'RuleFlow' }).exists()).toBe(true);
    await wrapper.setProps({ showFlow: false });
    expect(wrapper.findComponent({ name: 'RuleFlow' }).exists()).toBe(false);
    expect(wrapper.find('[data-testid="rule-invalid"]').exists()).toBe(false);
    await wrapper.get('[data-testid="rule-window-entry-0"]').setValue('0');
    expect(wrapper.get('[data-testid="rule-invalid"]').text()).toBe('bots.rules.invalid');
    expect(wrapper.get('[data-testid="rule-share"]').attributes('disabled')).toBeDefined();
    wrapper.unmount();
  });

  it('shows every recipe and its idea without suggesting an inactive rule draft is selected', () => {
    const wrapper = render(false);
    for (const id of RULE_RECIPE_IDS) {
      const button = wrapper.get(`[data-testid="rule-recipe-${id}"]`);
      expect(button.isVisible()).toBe(true);
      expect(button.attributes('aria-pressed')).toBe('false');
      expect(button.get('.rule-recipe-idea').text()).toBe(`bots.rules.recipes.${id}.idea`);
    }
    expect(wrapper.get('[data-testid="basic-strategy-flow"]').isVisible()).toBe(true);
    expect(wrapper.find('[data-testid="rule-name"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="rule-group-entry"]').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'RuleFlow' }).exists()).toBe(false);
    expect(wrapper.find('[data-testid="rule-recipe-explanation"]').exists()).toBe(false);
    expect(wrapper.emitted('activate')).toBeUndefined();
    expect(wrapper.emitted('run')).toBeUndefined();
    wrapper.unmount();
  });

  it('loads a detached discovery recipe and requests its activation without running or saving', async () => {
    const wrapper = render(false);
    const original = wrapper.props('modelValue');
    await wrapper.get('[data-testid="rule-recipe-spring"]').trigger('click');
    expect(wrapper.props('modelValue')).toEqual(ruleRecipe('spring'));
    expect(wrapper.props('modelValue')).not.toBe(original);
    expect(wrapper.props('name')).toBe('bots.rules.recipes.spring.name');
    expect(wrapper.emitted('activate')).toEqual([[]]);
    expect(wrapper.emitted('run')).toBeUndefined();
    expect(wrapper.emitted('save')).toBeUndefined();
    expect(wrapper.get('[data-testid="rule-recipe-spring"]').attributes('aria-pressed')).toBe('false');
    await wrapper.setProps({ editing: true });
    expect(wrapper.get('[data-testid="rule-recipe-spring"]').attributes('aria-pressed')).toBe('true');
    expect(wrapper.find('[data-testid="basic-strategy-flow"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="rule-group-entry"]').isVisible()).toBe(true);
    await wrapper.get('[data-testid="rule-window-entry-0"]').setValue('36');
    expect(ruleRecipe('spring').entry.conditions[0].window).toBe(48);
    expect(original).toEqual(ruleRecipe('trend'));
    wrapper.unmount();
  });

  it('keeps the selected recipe idea, limitations and methodology visible without disclosures', () => {
    const wrapper = render();
    const explanation = wrapper.get('[data-testid="rule-recipe-explanation"]');
    expect(explanation.isVisible()).toBe(true);
    expect(explanation.text()).toContain('bots.rules.recipes.trend.idea');
    expect(explanation.text()).toContain('bots.rules.recipes.trend.risk');
    expect(explanation.element.closest('details')).toBeNull();
    expect(wrapper.get('.rule-method').text()).not.toContain('bots.rules.recipes.trend.risk');
    expect(wrapper.find('details, summary').exists()).toBe(false);
    expect(wrapper.get('.rule-method').element.tagName).toBe('SECTION');
    expect(wrapper.get('.rule-method h3').text()).toBe('bots.rules.why');
    expect(wrapper.get('.rule-method p').isVisible()).toBe(true);
    expect(wrapper.get('.rule-method a').isVisible()).toBe(true);
    wrapper.unmount();
  });

  it.each(['spring', 'persistent', 'range', 'rebound', 'expansion'] as const)(
    'loads and independently edits the %s recipe',
    async (id) => {
      const wrapper = render();
      expect(wrapper.findAll('.rule-recipes button')).toHaveLength(RULE_RECIPE_IDS.length);
      await wrapper.get(`[data-testid="rule-recipe-${id}"]`).trigger('click');
      expect(wrapper.props('modelValue')).toEqual(ruleRecipe(id));
      expect(wrapper.get(`[data-testid="rule-recipe-${id}"]`).attributes('aria-pressed')).toBe('true');
      await wrapper.get('[data-testid="rule-window-entry-0"]').setValue('36');
      expect(wrapper.props('modelValue').entry.conditions[0].window).toBe(36);
      expect(wrapper.get(`[data-testid="rule-recipe-${id}"]`).attributes('aria-pressed')).toBe('false');
      expect(ruleRecipe(id).entry.conditions[0].window).not.toBe(36);
      expect(wrapper.emitted('run')).toBeUndefined();
      wrapper.unmount();
    }
  );
  it('mixes spring strength, efficiency, RSI and drawdown and validates their boundaries', async () => {
    const wrapper = render();
    await wrapper.get('[data-testid="rule-kind-entry-0"]').setValue('return-quantile');
    for (const kind of ['restoring', 'efficiency', 'rsi', 'drawdown']) {
      await wrapper.get('[data-testid="rule-kind-entry-0"]').setValue(kind);
      expect(wrapper.props('modelValue').entry.conditions[0].kind).toBe(kind);
      expect(wrapper.props('modelValue').entry.conditions[0]).not.toHaveProperty('percentile');
      await wrapper.get('[data-testid="rule-threshold-entry-0"]').setValue('101');
      expect(wrapper.find('[data-testid="rule-invalid"]').exists()).toBe(true);
      expect(wrapper.get('[data-testid="rule-share"]').attributes('disabled')).toBeDefined();
      await wrapper.get('[data-testid="rule-threshold-entry-0"]').setValue(kind === 'drawdown' ? '-2' : '40');
      expect(wrapper.find('[data-testid="rule-invalid"]').exists()).toBe(false);
    }
    wrapper.unmount();
  });
  it('loads recipes and changes explicit AND/OR semantics without running anything', async () => {
    const wrapper = render();
    await wrapper.get('[data-testid="rule-recipe-dip"]').trigger('click');
    expect(wrapper.props('modelValue')).toEqual(ruleRecipe('dip'));
    await wrapper.get('[data-testid="rule-operator-entry"]').setValue('any');
    expect(wrapper.props('modelValue').entry.operator).toBe('any');
    expect(wrapper.emitted('run')).toBeUndefined();
    expect(wrapper.emitted('save')).toBeUndefined();
  });
  it('replaces stale ingredient parameters and bounds additions/removals', async () => {
    const wrapper = render();
    await wrapper.get('[data-testid="rule-kind-entry-0"]').setValue('return-quantile');
    expect(wrapper.props('modelValue').entry.conditions[0]).toEqual({
      kind: 'return-quantile',
      direction: 'below',
      window: 48,
      percentile: 20,
    });
    await wrapper.get('[data-testid="rule-kind-entry-0"]').setValue('trend');
    expect(wrapper.props('modelValue').entry.conditions[0]).not.toHaveProperty('percentile');
    await wrapper.get('[data-testid="rule-add-entry"]').trigger('click');
    await wrapper.get('[data-testid="rule-add-entry"]').trigger('click');
    expect(wrapper.get('[data-testid="rule-add-entry"]').attributes('disabled')).toBeDefined();
    for (let i = 0; i < 3; i++) await wrapper.get('[data-testid="rule-remove-entry-0"]').trigger('click');
    expect(wrapper.props('modelValue').entry.conditions).toHaveLength(1);
    expect(wrapper.get('[data-testid="rule-remove-entry-0"]').attributes('disabled')).toBeDefined();
  });
  it('keeps invalid numeric drafts visible and excludes them from sharing or the lesson', async () => {
    const wrapper = render();
    await wrapper.get('[data-testid="rule-window-entry-0"]').setValue('201');
    expect(wrapper.find('[data-testid="rule-invalid"]').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'RuleFlow' }).exists()).toBe(false);
    expect(wrapper.get('[data-testid="rule-share"]').attributes('disabled')).toBeDefined();
    await wrapper.get('[data-testid="rule-window-entry-0"]').setValue('24');
    expect(wrapper.find('[data-testid="rule-invalid"]').exists()).toBe(false);
  });
  it('represents an intentionally absent exit instead of an empty expression', async () => {
    const wrapper = render();
    await wrapper.get('[data-testid="rule-toggle-exit"]').trigger('click');
    expect(wrapper.props('modelValue').exit).toBeNull();
    expect(wrapper.text()).toContain('bots.rules.noExit');
    await wrapper.get('[data-testid="rule-toggle-exit"]').trigger('click');
    expect(wrapper.props('modelValue').exit.conditions).toHaveLength(1);
  });
  it('offers a valid selectable public URL when clipboard access is unavailable', async () => {
    const wrapper = render();
    await wrapper.get('[data-testid="rule-share"]').trigger('click');
    const field = wrapper.get('[data-testid="rule-share-fallback"]').element as HTMLInputElement;
    const encoded = new URLSearchParams(new URL(field.value).hash.split('?')[1]).get('rules');
    expect(decodeRuleShare(encoded)).toEqual(ruleRecipe('trend'));
    expect(field.value).not.toContain('account');
  });
});
