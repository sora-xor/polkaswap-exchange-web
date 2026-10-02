import { describe, expect, it } from 'vitest';
import { emptyGetTsPlan } from '@/features/misc/lib/getTsPlan';
import { getTsJourney, type GetTsJourneyInput } from '@/features/misc/lib/getTsJourney';

const reference = `0x${'1'.repeat(64)}`;
/** A connected draft without receipt evidence must never contain a confirmed milestone. */
function context(patch: Partial<GetTsJourneyInput> = {}): GetTsJourneyInput {
  return {
    source: 'card',
    purpose: 'xor',
    activeStep: 'fund',
    contextReady: { card: true, conversion: true, bridge: true, swap: true },
    plan: { ...emptyGetTsPlan(), paymentAsset: 'card', paymentAmount: '25' },
    cardConversion: false,
    cardReported: false,
    tonOnEthereum: false,
    conversion: { state: 'idle' },
    bridge: { state: 'idle' },
    swap: { state: 'idle' },
    ...patch,
  };
}
describe('purchase journey evidence', () => {
  it('shows every card purchase stage without a premature complete milestone', () => {
    expect(getTsJourney(context()).map(({ id, status }) => [id, status])).toEqual([
      ['card', 'current'],
      ['conversion', 'next'],
      ['bridge', 'next'],
      ['swap', 'next'],
    ]);
  });
  it('keeps an opened checkout unverified after a reload', () => {
    const input = context({ cardConversion: true });
    input.plan.cardDraft = { deliveredEth: '0.02', conversionEth: '0.017' };
    expect(getTsJourney(input)[0].status).toBe('check');
    expect(getTsJourney(input)[1].status).toBe('current');
    expect(getTsJourney({ ...input, cardReported: true })[0].status).toBe('reported');
    expect(
      getTsJourney({
        ...input,
        cardReported: true,
        contextReady: { card: false, conversion: false, bridge: false, swap: false },
      })[0].status
    ).toBe('check');
  });
  it('does not infer card success from a later conversion reference', () => {
    const input = context();
    input.plan.references.conversion = reference;
    expect(getTsJourney(input)[0].status).toBe('check');
  });
  it.each(['conversion', 'bridge', 'swap'] as const)(
    'confirms %s only for the exact reference in the current account context',
    (stage) => {
      const input = context();
      input.plan.references[stage] = reference;
      input[stage] = { state: 'received', reference };
      const status = (value: GetTsJourneyInput) => getTsJourney(value).find(({ id }) => id === stage)?.status;
      expect(status(input)).toBe('confirmed');
      expect(status({ ...input, contextReady: { card: false, conversion: false, bridge: false, swap: false } })).toBe(
        'unavailable'
      );
      expect(status({ ...input, [stage]: { state: 'received', reference: 'other' } })).toBe('unavailable');
      expect(status({ ...input, [stage]: { state: 'failed', reference } })).toBe('failed');
      expect(status({ ...input, [stage]: { state: 'pending', reference } })).toBe('pending');
    }
  );
  it('keeps unsigned or uncertain drafts distinct from submitted transactions', () => {
    const input = context();
    input.plan.bridgeDraft = { id: 'draft', amount: '1', contextHash: 'digest' };
    input.plan.swapDraft = { id: 'draft', amount: '1', contextHash: 'digest' };
    expect(
      getTsJourney(input)
        .filter(({ status }) => status === 'check')
        .map(({ id }) => id)
    ).toEqual(['card', 'bridge', 'swap']);
  });
  it('preserves a verified SORA swap when upstream wallets disconnect', () => {
    const input = context({ contextReady: { card: false, conversion: false, bridge: false, swap: true } });
    input.plan.references.swap = reference;
    input.swap = { state: 'received', reference };
    expect(getTsJourney(input).find(({ id }) => id === 'swap')?.status).toBe('confirmed');
  });
  it('omits conversion for existing Ethereum DAI and card for existing Ethereum funds', () => {
    const input = context({ source: 'ethereum' });
    input.plan.paymentAsset = 'dai-ethereum';
    expect(getTsJourney(input).map(({ id }) => id)).toEqual(['bridge', 'swap']);
    expect(getTsJourney(context({ source: 'sora' })).map(({ id }) => id)).toEqual(['swap']);
  });
  it('labels an explicit existing-ETH shortcut without calling the card purchase complete', () => {
    expect(getTsJourney(context({ cardConversion: true }))[0].status).toBe('existing');
  });
  it('never presents TON provider handoff as a verified transfer', () => {
    expect(getTsJourney(context({ source: 'ton', tonOnEthereum: true }))[0].status).toBe('check');
  });
  it('never presents a submitted burn reference as TS received', () => {
    const input = context({ source: 'xor', purpose: 'ts', activeStep: 'burn' });
    input.plan.references.burn = reference;
    expect(getTsJourney(input)).toEqual([{ id: 'burn', step: 'burn', status: 'check', reference }]);
    expect(getTsJourney({ ...input, purpose: 'xor' })).toEqual([]);
  });
});
