import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import Progress from '@/features/misc/components/burn/GetTsPurchaseProgress.vue';
import type { GetTsJourneyItem } from '@/features/misc/lib/getTsJourney';
vi.mock('@/composables/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
function render(items: GetTsJourneyItem[], purpose: 'xor' | 'ts' = 'xor') {
  return mount(Progress, {
    props: { items, purpose, reviewable: ['conversion', 'bridge', 'swap'], refreshing: false, refreshFailed: false },
    global: { stubs: { RouterLink: { props: ['to'], template: '<a :data-route="JSON.stringify(to)"><slot /></a>' } } },
  });
}
describe('unified purchase status', () => {
  it('offers read-only refresh and recovery links together without opening a transaction', async () => {
    const hash = `0x${'1'.repeat(64)}`;
    const w = render([
      { id: 'card', step: 'fund', status: 'check' },
      { id: 'conversion', step: 'fund', status: 'pending', reference: hash },
      { id: 'bridge', step: 'bridge', status: 'check' },
      { id: 'swap', step: 'swap', status: 'next' },
    ]);
    expect(w.get('a[target="_blank"]').attributes('href')).toBe(`https://etherscan.io/tx/${hash}`);
    expect(w.text()).toContain('getTs.journey.cardHistory');
    expect(w.text()).toContain('getTs.journey.bridgeHistory');
    expect(w.findAll('a').some((a) => a.attributes('data-route')?.includes('buyXor'))).toBe(true);
    await w
      .findAll('button')
      .find((b) => b.text() === 'getTs.journey.checkAll')!
      .trigger('click');
    expect(w.emitted('refresh')).toHaveLength(1);
    expect(w.emitted('review')).toBeUndefined();
    w.unmount();
  });
  it('rejects malformed external transaction links and preserves TS history purpose', () => {
    const w = render(
      [
        { id: 'conversion', step: 'fund', status: 'unavailable', reference: 'javascript:alert(1)' },
        { id: 'bridge', step: 'bridge', status: 'unavailable', reference: '0x1' },
      ],
      'ts'
    );
    expect(w.find('a[target="_blank"]').exists()).toBe(false);
    expect(w.findAll('a').some((a) => a.attributes('data-route')?.includes('tonswap'))).toBe(true);
    w.unmount();
  });
  it('keeps action locks and refresh failures visible', async () => {
    const w = render([{ id: 'swap', step: 'swap', status: 'unavailable', reference: '0x1' }]);
    await w.setProps({ refreshing: true, refreshFailed: true, reviewable: [] });
    expect(w.get('button').attributes('disabled')).toBeDefined();
    expect(w.text()).toContain('getTs.journey.checkFailed');
    expect(w.text()).not.toContain('getTs.journey.review');
    w.unmount();
  });
});
