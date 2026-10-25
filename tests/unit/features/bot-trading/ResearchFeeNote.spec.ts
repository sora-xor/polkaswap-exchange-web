import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import ResearchFeeNote from '@/features/bot-trading/components/ResearchFeeNote.vue';
import type { ResearchFeeSnapshot } from '@/features/bot-trading/research-fees';
import observation from '../../../fixtures/bot-trading/mainnetFees20260914.json';

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) => `${key} ${JSON.stringify(values ?? {})}`,
  }),
}));

describe('ResearchFeeNote', () => {
  const finalizedAt = Date.UTC(2026, 8, 15, 13, 15, 54);
  // Impact values below are synthetic display inputs, not part of the archived fee observation.
  const fees = (lag: number): ResearchFeeSnapshot => ({
    ...observation,
    priceImpactPercent: '1.378020032171570988',
    sellPriceImpactPercent: '2.1',
    finalizedAt,
    queriedAt: finalizedAt + lag,
  });

  it('shows the actual finalized UTC observation and delayed finality beside historical results', () => {
    const wrapper = mount(ResearchFeeNote, { props: { fees: fees(80 * 60_000) } });
    expect(wrapper.get('[data-testid="research-fee-note"]').text()).toContain('2026-09-15 13:15:54 UTC');
    expect(wrapper.text()).toContain(String(observation.blockNumber));
    expect(wrapper.get('[data-testid="research-fee-delay"]').isVisible()).toBe(true);
    expect(wrapper.find('details, summary').exists()).toBe(false);
  });

  it('does not label a fresh finalized observation as delayed', () => {
    const wrapper = mount(ResearchFeeNote, { props: { fees: fees(300_000) } });
    expect(wrapper.get('[data-testid="research-fee-note"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="research-fee-delay"]').exists()).toBe(false);
  });

  it('shows the separate directional impact assumptions beside their observation time', () => {
    const wrapper = mount(ResearchFeeNote, { props: { fees: fees(0) } });
    const impact = wrapper.get('[data-testid="research-price-impact"]').text();
    expect(impact).toContain('bots.playground.tradeBuy {} 1.38%');
    expect(impact).toContain('bots.playground.tradeSell {} 2.10%');
  });

  it('does not invent impact for a legacy saved fee observation', () => {
    const legacy = { ...observation, finalizedAt } as ResearchFeeSnapshot;
    const wrapper = mount(ResearchFeeNote, { props: { fees: legacy } });
    expect(wrapper.find('[data-testid="research-price-impact"]').exists()).toBe(false);
  });

  it('does not invent a block time for older saved results without that evidence', () => {
    const wrapper = mount(ResearchFeeNote, { props: { fees: observation } });
    expect(wrapper.find('[data-testid="research-fee-note"]').exists()).toBe(false);
  });
});
