import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import DiscoveryFinalistCompare from '@/features/bot-trading/components/DiscoveryFinalistCompare.vue';
import type { DiscoveryFinalist, DiscoveryMetrics } from '@/features/bot-trading/discovery';
import type { StrategyConfig } from '@/features/bot-trading/types';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: { count: number }) => (params?.count === undefined ? key : `${key} ${params.count}`),
  }),
}));

const pairTitle = (key: string) => `Pair ${key}`;
const strategyName = (kind: StrategyConfig['kind']) => `Strategy ${kind}`;
const strategySummary = (strategy: StrategyConfig) =>
  strategy.kind === 'sma'
    ? `Fast ${strategy.fastWindow} / Slow ${strategy.slowWindow}`
    : strategy.kind === 'threshold'
      ? `Buy below ${strategy.threshold}%`
      : `${strategy.amount} every ${strategy.intervalMs} ms`;
const identityProps = { pairTitle, strategyName, strategySummary };

function metrics(
  returnPercent: string,
  excessReturnPercent: string | null,
  trades: number,
  drawdown: string
): DiscoveryMetrics {
  return {
    returnPercent,
    excessReturnPercent,
    benchmarkReturnPercent: '1',
    drawdownPercent: drawdown,
    trades,
    coverage: 1,
    startAt: 1,
    endAt: 2,
  };
}

/** Only display evidence fields are needed to exercise the comparison surface. */
function finalist(
  id: string,
  training = metrics('8.25', '3.125', 14, '4.1'),
  holdout = metrics('-2.5', '-3.5', 6, '5.2'),
  holdoutState: 'complete' | 'sealed' | 'exposed' = 'complete'
): DiscoveryFinalist {
  return {
    id,
    pairKey: `xor>${id}`,
    callNumber: 1,
    status: 'qualified',
    holdoutState,
    strategy: {
      kind: 'dca',
      amount: '10',
      intervalMs: 3_600_000,
      threshold: '0',
      direction: 'below',
      fastWindow: 8,
      slowWindow: 20,
      prompt: '',
    },
    settings: {} as DiscoveryFinalist['settings'],
    fees: {} as DiscoveryFinalist['fees'],
    historyFingerprint: 'evidence',
    historyIdentity: {} as DiscoveryFinalist['historyIdentity'],
    research: {} as DiscoveryFinalist['research'],
    template: {
      assetIn: { address: '0xINPUT', symbol: 'XOR' },
      assetOut: { address: `0xOUTPUT-${id}`, symbol: id },
    } as DiscoveryFinalist['template'],
    training,
    holdout,
  };
}

describe('DiscoveryFinalistCompare', () => {
  it('renders nothing before finalists are selected', () => {
    const wrapper = mount(DiscoveryFinalistCompare, { props: { finalists: [], ...identityProps } });
    expect(wrapper.find('[data-testid="discovery-finalist-compare"]').exists()).toBe(false);
    wrapper.unmount();
  });

  it('compares exact directed pairs, completed period metrics, and a shared return scale', () => {
    const wrapper = mount(DiscoveryFinalistCompare, {
      props: {
        finalists: [
          finalist('VAL'),
          finalist('PSWAP', metrics('-12', '-13', 10, '8'), metrics('3.75', '2.75', 5, '3')),
        ],
        ...identityProps,
      },
    });
    const cards = wrapper.findAll('[data-testid="discovery-finalist-card"]');
    expect(cards).toHaveLength(2);
    expect(cards[0].text()).toContain('Pair xor>VAL');
    expect(cards[0].text()).toContain('0xINPUT');
    expect(cards[0].text()).toContain('0xOUTPUT-VAL');
    expect(cards[0].text()).toContain('8.25%');
    expect(cards[0].text()).toContain('-2.50%');
    expect(cards[0].text()).toContain('3.13%');
    expect(cards[0].text()).toContain('-3.50%');
    expect(cards[0].findAll('tbody tr')[1].text()).toContain('14');
    expect(cards[0].findAll('tbody tr')[1].text()).toContain('6');
    expect(cards[0].findAll('tbody tr')[2].text()).toContain('4.10%');
    expect(cards[0].findAll('tbody tr')[2].text()).toContain('5.20%');
    expect(cards[0].get('.compare-scale').text()).toContain('12.00%');
    expect(cards[0].findAll('tbody tr')[0].findAll('td')[0].attributes('title')).toBe('3.125%');
    expect(cards[1].get('[data-period="training"]').attributes('style')).toContain('100%');
    expect(cards[1].get('[data-period="training"]').element.parentElement?.classList).toContain('negative');
    expect(cards[1].get('[data-period="holdout"]').element.parentElement?.classList).toContain('positive');
    expect(wrapper.find('button').exists()).toBe(false);
    wrapper.unmount();
  });

  it('withholds incomplete holdout evidence from both the table and the visual domain', () => {
    const wrapper = mount(DiscoveryFinalistCompare, {
      props: {
        finalists: [finalist('VAL', metrics('5', '4', 11, '2'), metrics('99', '98', 20, '50'), 'sealed')],
        ...identityProps,
      },
    });
    const card = wrapper.get('[data-testid="discovery-finalist-card"]');
    expect(card.get('.compare-scale').text()).toContain('5.00%');
    expect(card.find('[data-period="holdout"]').exists()).toBe(false);
    expect(card.get('[data-testid="discovery-finalist-returns"]').text()).not.toContain('99%');
    expect(card.findAll('tbody tr').map((row) => row.findAll('td')[1].text())).toEqual(['—', '—', '—']);
    wrapper.unmount();
  });

  it('retains selection order and caps the rendered comparison at three finalists', () => {
    const wrapper = mount(DiscoveryFinalistCompare, {
      props: { finalists: ['A', 'B', 'C', 'D'].map((id) => finalist(id)), ...identityProps },
    });
    const cards = wrapper.findAll('[data-testid="discovery-finalist-card"]');
    expect(cards.map((card) => card.attributes('data-finalist-id'))).toEqual(['A', 'B', 'C']);
    expect(wrapper.get('[data-testid="discovery-finalist-compare"]').attributes('aria-label')).toBe(
      'bots.discovery.selectedCount 3'
    );
    wrapper.unmount();
  });

  it('keeps bars finite for extreme but valid percentages', () => {
    const wrapper = mount(DiscoveryFinalistCompare, {
      props: {
        finalists: [finalist('VAL', metrics('999999999999999999', null, 10, '3'), metrics('0', null, 5, '1'))],
        ...identityProps,
      },
    });
    const bar = wrapper.get('[data-period="training"]');
    expect(bar.attributes('style')).toContain('width: 100%');
    expect(wrapper.get('[data-testid="discovery-finalist-card"]').text()).toContain('999999999999999999.00%');
    expect(wrapper.get('tbody tr').text()).toContain('—');
    wrapper.unmount();
  });

  it('keeps the sign and shared scale for tiny returns at research metric precision', () => {
    const negative = `-0.${'0'.repeat(35)}1`;
    const positive = `0.${'0'.repeat(35)}2`;
    const wrapper = mount(DiscoveryFinalistCompare, {
      props: {
        finalists: [finalist('VAL', metrics(negative, null, 10, '0'), metrics(positive, null, 5, '0'))],
        ...identityProps,
      },
    });
    const card = wrapper.get('[data-testid="discovery-finalist-card"]');
    const training = card.get('[data-period="training"]');
    const holdout = card.get('[data-period="holdout"]');
    expect(card.get('.compare-scale').text()).toContain('<0.01%');
    expect(card.get('.compare-scale').attributes('title')).toBe(`${positive}%`);
    expect(training.attributes('style')).toContain('width: 50%');
    expect(training.element.parentElement?.classList).toContain('negative');
    expect(card.findAll('.compare-return-row strong')[0].classes()).toContain('is-negative');
    expect(holdout.attributes('style')).toContain('width: 100%');
    expect(holdout.element.parentElement?.classList).toContain('positive');
    wrapper.unmount();
  });

  it('identifies two selected strategies for the same directed pair', () => {
    const sma = finalist('SMA');
    sma.pairKey = 'xor>val';
    sma.callNumber = 4;
    sma.strategy.kind = 'sma';
    sma.strategy.fastWindow = 12;
    sma.strategy.slowWindow = 36;
    const threshold = finalist('THRESHOLD');
    threshold.pairKey = 'xor>val';
    threshold.callNumber = 9;
    threshold.strategy.kind = 'threshold';
    threshold.strategy.threshold = '2.5';
    threshold.template.assetOut = { ...sma.template.assetOut };
    const wrapper = mount(DiscoveryFinalistCompare, {
      props: { finalists: [sma, threshold], ...identityProps },
    });
    const cards = wrapper.findAll('[data-testid="discovery-finalist-card"]');
    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.get('.compare-item-heading strong').text())).toEqual([
      'Pair xor>val',
      'Pair xor>val',
    ]);
    expect(cards[0].get('.compare-addresses').text()).toBe(cards[1].get('.compare-addresses').text());
    expect(cards[0].get('.compare-request').text()).toBe('bots.discovery.requestNumber 4');
    expect(cards[1].get('.compare-request').text()).toBe('bots.discovery.requestNumber 9');
    expect(cards[0].get('[data-testid="discovery-finalist-strategy"]').text()).toContain('Strategy sma');
    expect(cards[0].get('[data-testid="discovery-finalist-strategy"]').text()).toContain('Fast 12 / Slow 36');
    expect(cards[1].get('[data-testid="discovery-finalist-strategy"]').text()).toContain('Strategy threshold');
    expect(cards[1].get('[data-testid="discovery-finalist-strategy"]').text()).toContain('Buy below 2.5%');
    wrapper.unmount();
  });
});
