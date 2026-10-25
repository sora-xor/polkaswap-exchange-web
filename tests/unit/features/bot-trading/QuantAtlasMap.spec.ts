import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import QuantAtlasMap from '@/features/bot-trading/components/quant/QuantAtlasMap.vue';
import { decodeStudioLink } from '@/features/bot-trading/quant-studio';
import type { QuantAtlasMarket } from '@/features/bot-trading/quant-loop';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key} ${JSON.stringify(values)}` : key),
  }),
}));

const ParallelStub = defineComponent({
  name: 'QuantParallel',
  props: [
    'axes',
    'data',
    'columns',
    'rows',
    'colorKey',
    'current',
    'strong',
    'ariaLabel',
    'help',
    'clearLabel',
    'countLabel',
    'paused',
  ],
  emits: ['select', 'hover'],
  setup:
    (_props, { slots }) =>
    () =>
      h('div', { 'data-testid': 'parallel' }, slots.tooltip?.({ row: 1 })),
});
const LinkStub = defineComponent({
  name: 'RouterLink',
  props: ['to'],
  setup:
    (props, { slots }) =>
    () =>
      h('a', { 'data-to': JSON.stringify(props.to) }, slots.default?.()),
});

const ATLAS: QuantAtlasMarket = {
  market: 'PSWAP',
  splitAt: Date.UTC(2026, 5, 10, 2),
  entries: [
    {
      id: 'reversion:48/15/10:3',
      family: 'reversion',
      amount: '3',
      first: 46.65,
      second: 21.48,
      drop: 49.18,
      holding: 87.26,
      trades: 38,
      robust: true,
      selected: true,
    },
    {
      id: 'guarded:168/40/-5/-15:2',
      family: 'guarded',
      amount: '2',
      first: 0,
      second: 0,
      drop: 0,
      holding: 0,
      trades: 0,
      robust: false,
      selected: false,
    },
  ],
};

function render(atlas: QuantAtlasMarket | null = ATLAS) {
  return mount(QuantAtlasMap, {
    props: { atlas, ariaLabel: 'Strategies tested', locale: 'en-US' },
    global: { stubs: { QuantParallel: ParallelStub, RouterLink: LinkStub } },
  });
}

describe('QuantAtlasMap', () => {
  it('packs every tested strategy into seven dimensions and marks robust and used ones', () => {
    const wrapper = render();
    const parallel = wrapper.getComponent(ParallelStub);
    expect(parallel.props('columns')).toEqual(['family', 'amount', 'trades', 'holding', 'maxDrop', 'first', 'second']);
    expect(parallel.props('rows')).toBe(2);
    const data = parallel.props('data') as Float32Array;
    expect(Array.from(data.slice(0, 7))).toEqual(
      [0, 3, 38, 0.8726, 0.4918, 0.4665, 0.2148].map((value) => Math.fround(value))
    );
    expect(Array.from(parallel.props('strong') as Uint8Array)).toEqual([1, 0]);
    expect(parallel.props('current')).toBe(0);
    const axes = parallel.props('axes') as { key: string; categories?: { label: string }[]; invert?: boolean }[];
    expect(axes.map((axis) => axis.key)).toEqual([
      'family',
      'amount',
      'trades',
      'holding',
      'maxDrop',
      'first',
      'second',
    ]);
    expect(axes[0].categories?.map((category) => category.label)).toContain('bots.quant.families.guarded');
    expect(axes.find((axis) => axis.key === 'maxDrop')?.invert).toBe(true);
    expect(render(null).getComponent(ParallelStub).props('rows')).toBe(0);
  });

  it('explains a hovered line with its rules in words and whether it passed', () => {
    const wrapper = render();
    const tip = wrapper.get('[data-testid="parallel"]').text();
    expect(tip).toContain('bots.quant.families.guarded');
    expect(tip).toContain('bots.quant.rule.deviationBelow {"window":168,"value":"-40"}');
    expect(tip).toContain('bots.quant.rule.momentumAbove {"window":168,"value":"-15"}');
    expect(tip).toContain('bots.quant.atlas.rejected');
  });

  it("links to the Strategy Studio starting from the bot's own strategy", () => {
    const to = JSON.parse(render().get('[data-testid="quant-atlas-builder"]').attributes('data-to')!);
    expect(to.params).toEqual({ section: 'discover' });
    expect(decodeStudioLink(to.query.studio)?.state).toEqual({
      recipe: 'dip',
      values: { window: 48, buy: 15, sell: 10, amount: 3 },
    });
    expect(render(null).find('[data-testid="quant-atlas-builder"]').exists()).toBe(false);
  });

  it('pins a clicked line, links it to the Strategy Studio and unpins on a second click or market change', async () => {
    const wrapper = render();
    expect(wrapper.text()).toContain('bots.quant.atlas.pick');
    const parallel = wrapper.getComponent(ParallelStub);
    parallel.vm.$emit('select', 0);
    await wrapper.vm.$nextTick();
    const pinned = wrapper.get('[data-testid="quant-atlas-pinned"]');
    expect(pinned.text()).toContain('bots.quant.atlas.used');
    expect(pinned.text()).toContain('bots.quant.rule.deviationAbove {"window":48,"value":"+10"}');
    const to = JSON.parse(wrapper.get('[data-testid="quant-atlas-studio"]').attributes('data-to')!);
    expect(to.params).toEqual({ section: 'discover' });
    expect(decodeStudioLink(to.query.studio)).toEqual({
      market: 'PSWAP',
      state: { recipe: 'dip', values: { window: 48, buy: 15, sell: 10, amount: 3 } },
    });
    parallel.vm.$emit('select', 0);
    await wrapper.vm.$nextTick();
    expect(wrapper.find('[data-testid="quant-atlas-pinned"]').exists()).toBe(false);
    parallel.vm.$emit('select', 1);
    await wrapper.setProps({ atlas: { ...ATLAS, market: 'DAI' } });
    expect(wrapper.find('[data-testid="quant-atlas-pinned"]').exists()).toBe(false);
  });
});
