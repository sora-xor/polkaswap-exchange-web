import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { Operation } from '@sora-substrate/sdk';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import {
  emptyGetTsPlan,
  getTsPlanProtection,
  parseGetTsPlan,
  parseGetTsCardDraft,
  patchGetTsPlan,
  normalizeGetTsAmount,
  isGetTsTransactionReference,
  readGetTsPlan,
  writeGetTsPlan,
  clearGetTsPlan,
  getTsBurnPrefill,
  GET_TS_PLAN_STORAGE_KEY,
} from '@/features/misc/lib/getTsPlan';
import { useGetTsPlan } from '@/features/misc/composables/useGetTsPlan';
const hash = `0x${'1'.repeat(64)}`;
const row: EthHistory = {
  id: 'unsigned-row',
  type: Operation.EthBridgeIncoming,
  externalNetwork: 1,
  assetAddress: DAI.address,
  amount: '5',
  from: `0x${'3'.repeat(64)}`,
  to: `0x${'2'.repeat(40)}`,
  payload: { tonswapFunding: 'ethereum-dai-v1' },
};
const context = { soraAddress: row.from!, evmAddress: row.to!, mainnet: true };
describe('Get TS purchase draft', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useGetTsPlan().clearPlan();
    useGetTsPlan('xor').clearPlan();
  });
  it('accepts only bounded ETH inputs in a card resume hint, without account or success fields', () => {
    const hint = { deliveredEth: '0.0200', conversionEth: '0.0170' };
    expect(parseGetTsCardDraft(hint)).toEqual({ deliveredEth: '0.02', conversionEth: '0.017' });
    for (const value of [
      null,
      [],
      {},
      { ...hint, completed: true },
      { ...hint, address: 'wallet' },
      { ...hint, conversionEth: '0.021' },
      { ...hint, deliveredEth: '0' },
      { ...hint, conversionEth: 0.017 },
      { ...hint, conversionEth: '0.0000000000000000001' },
    ])
      expect(parseGetTsCardDraft(value)).toBeNull();
    const plan = { ...emptyGetTsPlan(), paymentAsset: 'card' as const, paymentAmount: '25', cardDraft: hint };
    expect(parseGetTsPlan(plan)?.cardDraft).toEqual({ deliveredEth: '0.02', conversionEth: '0.017' });
    expect(parseGetTsPlan({ ...plan, paymentAsset: 'eth' })).toBeNull();
    expect(parseGetTsPlan({ ...plan, paymentAmount: '' })).toBeNull();
  });
  it.each(['ts', 'xor'] as const)('round-trips a %s card hint without trusting or locking its payment', (purpose) => {
    const purchase = useGetTsPlan(purpose);
    purchase.updatePlan({ paymentAsset: 'card', paymentAmount: '25' });
    expect(purchase.rememberCardDraft({ deliveredEth: '0.02', conversionEth: '0.017' })).toBe(true);
    const saved = readGetTsPlan(undefined, purpose)!;
    expect(saved.cardDraft).toEqual({ deliveredEth: '0.02', conversionEth: '0.017' });
    expect(saved.references).toEqual({});
    expect(getTsPlanProtection(saved)).toBeNull();
    expect(readGetTsPlan(undefined, purpose === 'ts' ? 'xor' : 'ts')).toBeNull();
    purchase.updatePlan({ paymentAmount: '25.00' });
    expect(purchase.plan.value.cardDraft).toEqual(saved.cardDraft);
    purchase.updatePlan({ paymentAmount: '30' });
    expect(purchase.plan.value.cardDraft).toBeUndefined();
    purchase.rememberCardDraft(saved.cardDraft!);
    purchase.updatePlan({ paymentAsset: 'eth', paymentAmount: '0.01' });
    expect(purchase.plan.value.cardDraft).toBeUndefined();
    expect(purchase.rememberCardDraft(saved.cardDraft!)).toBe(false);
  });
  it('replaces a card navigation hint with a submitted conversion reference and clears only the hint explicitly', () => {
    const purchase = useGetTsPlan();
    purchase.updatePlan({ paymentAsset: 'card', paymentAmount: '25' });
    const draft = { deliveredEth: '0.02', conversionEth: '0.017' };
    purchase.rememberCardDraft(draft);
    expect(purchase.trackTransaction('conversion', hash)).toBe(true);
    expect(purchase.plan.value.cardDraft).toBeUndefined();
    purchase.rememberCardDraft(draft);
    purchase.forgetCardDraft();
    expect(purchase.plan.value.cardDraft).toBeUndefined();
    expect(purchase.plan.value.references.conversion).toBe(hash);
    expect(purchase.plan.value.paymentAmount).toBe('25');
  });
  it('protects every unresolved funding reference, including missing, unrelated and disconnected evidence', () => {
    const plan = {
      ...emptyGetTsPlan(),
      paymentAsset: 'card' as const,
      paymentAmount: '20',
      references: { conversion: hash },
    };
    for (const state of ['idle', 'pending', 'unavailable'])
      expect(getTsPlanProtection(plan, { conversion: { state, reference: hash } })).toEqual({
        source: 'card',
        step: 'fund',
      });
    expect(getTsPlanProtection(plan)).toEqual({ source: 'card', step: 'fund' });
    expect(
      getTsPlanProtection(plan, { conversion: { state: 'received', reference: `0x${'2'.repeat(64)}` } })
    ).not.toBeNull();
    expect(getTsPlanProtection(plan, { conversion: { state: 'received' } })).not.toBeNull();
    expect(getTsPlanProtection(plan, { conversion: { state: 'received', reference: hash } })).toBeNull();
    expect(getTsPlanProtection(plan, { conversion: { state: 'failed', reference: hash } })).toBeNull();
  });
  it('requires all funding stages to resolve, retains bridge recovery, and leaves burn receipts independent', () => {
    const plan = {
      ...emptyGetTsPlan(),
      paymentAsset: 'eth' as const,
      references: { conversion: hash, bridge: hash, swap: hash, burn: hash },
    };
    const received = { state: 'received', reference: hash };
    expect(getTsPlanProtection(plan, { conversion: received, bridge: received, swap: received })).toBeNull();
    expect(
      getTsPlanProtection(plan, { conversion: received, bridge: { ...received, state: 'failed' }, swap: received })
    ).not.toBeNull();
    expect(getTsPlanProtection(plan, { bridge: received, swap: received })).not.toBeNull();
    expect(getTsPlanProtection({ ...emptyGetTsPlan(), references: { burn: hash } })).toBeNull();
    expect(
      getTsPlanProtection({ ...plan, references: { swap: hash } }, { swap: { ...received, state: 'failed' } })
    ).toBeNull();
  });
  it('protects exact draft and pre-hash submission stages without treating them as submitted', () => {
    const plan = { ...emptyGetTsPlan(), paymentAsset: 'dai-sora' as const };
    expect(getTsPlanProtection(plan)).toBeNull();
    expect(getTsPlanProtection(plan, {}, 'swap')).toEqual({ source: 'sora', step: 'swap' });
    expect(getTsPlanProtection({ ...plan, paymentAsset: 'usdt-ton' }, {}, 'conversion')).toEqual({
      source: 'ton',
      step: 'fund',
    });
    const draft = { id: 'draft', amount: '5', contextHash: hash };
    expect(getTsPlanProtection({ ...plan, swapDraft: draft })).toEqual({ source: 'sora', step: 'swap' });
    expect(getTsPlanProtection({ ...plan, paymentAsset: 'dai-ethereum', bridgeDraft: draft })).toEqual({
      source: 'ethereum',
      step: 'bridge',
    });
  });
  it('accepts exact decimals and rejects rounding, non-positive values, overflow and malformed values', () => {
    expect(normalizeGetTsAmount('1.230000')).toBe('1.23');
    expect(normalizeGetTsAmount('0.000000000000000001')).toBe('0.000000000000000001');
    for (const value of ['0', '-1', '+1', '01', '1e3', ' 1', '.1', '1.', '0.0000000000000000001', '9'.repeat(79), 1])
      expect(normalizeGetTsAmount(value)).toBeNull();
    expect(normalizeGetTsAmount('1.0000001', 6)).toBeNull();
  });
  it('rejects extended saved fields, malformed references and unsupported assets', () => {
    const draft = {
      ...emptyGetTsPlan(),
      paymentAsset: 'usdt-ton',
      paymentAmount: '10.00',
      references: { conversion: hash },
    };
    expect(parseGetTsPlan(draft)?.paymentAmount).toBe('10');
    expect(
      parseGetTsPlan({ ...draft, paymentAsset: 'dai-ethereum', paymentAmount: '1.000000000000000001' })?.paymentAsset
    ).toBe('dai-ethereum');
    for (const value of [
      null,
      [],
      { ...draft, secret: 'x' },
      { ...draft, completed: true },
      { ...draft, version: 2 },
      { ...draft, paymentAsset: 'XOR' },
      { ...draft, paymentAmount: '1.0000001' },
      { ...draft, references: { quote: hash } },
      { ...draft, references: { bridge: 'unsigned-uuid' } },
    ])
      expect(parseGetTsPlan(value)).toBeNull();
    expect(isGetTsTransactionReference(`0x${'0'.repeat(64)}`)).toBe(false);
    expect(isGetTsTransactionReference(hash)).toBe(true);
  });
  it('invalidates downstream associations only when the canonical spending plan changes', () => {
    const draft = {
      ...emptyGetTsPlan(),
      paymentAsset: 'eth' as const,
      paymentAmount: '1',
      daiAmount: '100',
      xorAmount: '10',
      references: { bridge: hash },
    };
    expect(patchGetTsPlan(draft, { paymentAmount: '1.0' })).toEqual(draft);
    expect(patchGetTsPlan(draft, { paymentAmount: '2', daiAmount: '200' })).toEqual({
      ...draft,
      paymentAmount: '2',
      daiAmount: '',
      xorAmount: '',
      references: {},
    });
    expect(patchGetTsPlan(draft, { xorAmount: '9' })).toEqual({ ...draft, xorAmount: '9' });
    expect(patchGetTsPlan(draft, { paymentAmount: 'invalid' })).toBeNull();
  });
  it('round-trips a bounded draft and tolerates blocked/corrupt storage', () => {
    const draft = emptyGetTsPlan();
    expect(writeGetTsPlan(draft)).toBe(true);
    expect(readGetTsPlan()).toEqual(draft);
    sessionStorage.setItem(GET_TS_PLAN_STORAGE_KEY, 'x'.repeat(1537));
    expect(readGetTsPlan()).toBeNull();
    sessionStorage.setItem(GET_TS_PLAN_STORAGE_KEY, '{');
    expect(readGetTsPlan()).toBeNull();
    const fail = () => {
      throw new Error('blocked');
    };
    const storage = { getItem: fail, setItem: fail, removeItem: fail };
    expect(readGetTsPlan(storage)).toBeNull();
    expect(writeGetTsPlan(draft, storage)).toBe(false);
    expect(clearGetTsPlan(storage)).toBe(false);
    sessionStorage.setItem('other', 'keep');
    expect(clearGetTsPlan()).toBe(true);
    expect(sessionStorage.getItem('other')).toBe('keep');
  });
  it('shares draft changes and tracks only the reviewed bridge after a real hash appears', () => {
    const first = useGetTsPlan();
    const second = useGetTsPlan();
    expect(first.updatePlan({ paymentAsset: 'eth', paymentAmount: '1' })).toBe(true);
    expect(second.plan.value.paymentAmount).toBe('1');
    expect(first.updatePlan({ daiAmount: '5' })).toBe(true);
    expect(first.rememberBridgeDraft(row)).toBe(true);
    expect(second.trackBridgeSubmission({ ...row, id: 'other-row', externalHash: hash }, context)).toBe(false);
    expect(second.trackBridgeSubmission({ ...row, externalHash: 'unsigned-row' }, context)).toBe(false);
    expect(second.trackBridgeSubmission({ ...row, externalHash: hash }, context)).toBe(true);
    expect(first.plan.value.bridgeDraft).toBeUndefined();
    expect(first.plan.value.references.bridge).toBe(hash);
    first.updatePlan({ paymentAmount: '2' });
    expect(second.trackBridgeSubmission({ ...row, externalHash: hash }, context)).toBe(false);
    expect(second.plan.value.references).toEqual({});
    expect(first.trackTransaction('swap', hash)).toBe(true);
    expect(first.updatePlan({ xorAmount: '-1' })).toBe(false);
    second.clearPlan();
    expect(first.plan.value).toEqual(emptyGetTsPlan());
  });
  it('restores only a bounded reviewed row context and never stores wallet addresses or success', async () => {
    const purchase = useGetTsPlan();
    purchase.updatePlan({ paymentAsset: 'eth', paymentAmount: '1' });
    purchase.updatePlan({ daiAmount: '5' });
    expect(purchase.rememberBridgeDraft(row)).toBe(true);
    const saved = sessionStorage.getItem(GET_TS_PLAN_STORAGE_KEY)!;
    expect(saved).not.toContain(row.from);
    expect(saved).not.toContain(row.to);
    const restored = readGetTsPlan()!;
    expect(restored.bridgeDraft).toMatchObject({ id: row.id, amount: '5' });
    expect(restored.references).toEqual({});
    for (const bridgeDraft of [
      { ...restored.bridgeDraft, id: 'x'.repeat(257) },
      { ...restored.bridgeDraft, id: '<script>' },
      { ...restored.bridgeDraft, amount: '0' },
      { ...restored.bridgeDraft, amount: '6' },
      { ...restored.bridgeDraft, contextHash: 'local-id' },
      { ...restored.bridgeDraft, address: row.from },
      null,
    ])
      expect(parseGetTsPlan({ ...restored, bridgeDraft })).toBeNull();
    expect(parseGetTsPlan({ ...restored, references: { bridge: hash } })).toBeNull();
    vi.resetModules();
    const reloaded = (await import('@/features/misc/composables/useGetTsPlan')).useGetTsPlan();
    expect(reloaded.plan.value).toEqual(restored);
    expect(reloaded.trackBridgeSubmission({ ...row, externalHash: hash }, context)).toBe(true);
    expect(reloaded.plan.value.references.bridge).toBe(hash);
    expect(readGetTsPlan()?.bridgeDraft).toBeUndefined();
  });
  it('rejects changed reviewed fields or connected wallets and invalidates edited amounts', () => {
    const purchase = useGetTsPlan();
    purchase.updatePlan({ paymentAsset: 'eth', paymentAmount: '1' });
    purchase.updatePlan({ daiAmount: '5' });
    expect(purchase.rememberBridgeDraft({ ...row, amount: '6' })).toBe(false);
    expect(purchase.rememberBridgeDraft(row)).toBe(true);
    for (const patch of [
      { amount: '6' },
      { id: 'other' },
      { from: `0x${'4'.repeat(64)}` },
      { to: `0x${'4'.repeat(40)}` },
      { externalNetwork: 56 },
      { assetAddress: 'wrong' },
      { type: Operation.EthBridgeOutgoing },
      { payload: { buyXorFunding: 'ethereum-dai-v1' } },
    ])
      expect(purchase.trackBridgeSubmission({ ...row, ...patch, externalHash: hash }, context)).toBe(false);
    for (const patch of [{ mainnet: false }, { soraAddress: '' }, { evmAddress: `0x${'4'.repeat(40)}` }])
      expect(purchase.trackBridgeSubmission({ ...row, externalHash: hash }, { ...context, ...patch })).toBe(false);
    purchase.updatePlan({ daiAmount: '5.0' });
    expect(purchase.plan.value.bridgeDraft).toBeDefined();
    purchase.updatePlan({ daiAmount: '6' });
    expect(purchase.plan.value.bridgeDraft).toBeUndefined();
    purchase.updatePlan({ daiAmount: '5' });
    purchase.rememberBridgeDraft(row);
    purchase.updatePlan({ paymentAmount: '2' });
    expect(purchase.plan.value.bridgeDraft).toBeUndefined();
    purchase.updatePlan({ daiAmount: '5' });
    purchase.rememberBridgeDraft(row);
    purchase.trackTransaction('conversion', hash);
    expect(purchase.plan.value.bridgeDraft).toBeUndefined();
  });
  it('caps burn suggestions exactly after a known positive fee and fails closed on missing funds', () => {
    expect(getTsBurnPrefill('10', '2000000000000000000', '1')).toBe('1.999999999999999999');
    expect(getTsBurnPrefill('1', '2000000000000000000', '1')).toBe('1');
    for (const [balance, fee] of [
      [undefined, '1'],
      ['10', undefined],
      ['10', '0'],
      ['10', '10'],
      ['10', '-1'],
    ])
      expect(getTsBurnPrefill('1', balance, fee)).toBe('');
    expect(getTsBurnPrefill('invalid', '100', '1')).toBe('');
  });
  it('invalidates downstream receipts on a replacement transaction but keeps duplicate notifications idempotent', () => {
    const draft = useGetTsPlan();
    const bridge = `0x${'2'.repeat(64)}`;
    const swap = `0x${'3'.repeat(64)}`;
    draft.updatePlan({ paymentAsset: 'eth', paymentAmount: '1' });
    draft.trackTransaction('conversion', hash);
    draft.updatePlan({ daiAmount: '100' });
    draft.trackTransaction('bridge', bridge);
    draft.updatePlan({ xorAmount: '20' });
    draft.trackTransaction('swap', swap);
    draft.trackTransaction('burn', hash);
    const completed = JSON.parse(JSON.stringify(draft.plan.value));
    expect(draft.trackTransaction('conversion', hash)).toBe(true);
    expect(draft.plan.value).toEqual(completed);
    draft.trackTransaction('bridge', swap);
    expect(draft.plan.value).toMatchObject({
      daiAmount: '100',
      xorAmount: '',
      references: { conversion: hash, bridge: swap },
    });
    expect(draft.plan.value.references).not.toHaveProperty('swap');
    expect(draft.plan.value.references).not.toHaveProperty('burn');
    draft.trackTransaction('conversion', bridge);
    expect(draft.plan.value).toMatchObject({ daiAmount: '', xorAmount: '', references: { conversion: bridge } });
    expect(readGetTsPlan()).toEqual(draft.plan.value);
  });
  it('isolates generic amounts, references and bridge bindings and rejects burn tracking', () => {
    const ts = useGetTsPlan();
    const xor = useGetTsPlan('xor');
    ts.updatePlan({ paymentAsset: 'eth', paymentAmount: '1' });
    xor.updatePlan({ paymentAsset: 'dai-ethereum', paymentAmount: '2' });
    ts.updatePlan({ daiAmount: '5' });
    xor.updatePlan({ daiAmount: '5' });
    expect(ts.rememberBridgeDraft(row)).toBe(true);
    const generic = { ...row, id: 'xor-row', payload: { buyXorFunding: 'ethereum-dai-v1' } };
    expect(xor.rememberBridgeDraft(generic)).toBe(true);
    expect(xor.trackBridgeSubmission({ ...row, externalHash: hash }, context)).toBe(false);
    expect(xor.trackBridgeSubmission({ ...generic, externalHash: hash }, context)).toBe(true);
    expect(ts.plan.value.references).toEqual({});
    expect(xor.trackTransaction('burn', hash)).toBe(false);
    expect(readGetTsPlan(undefined, 'xor')).toEqual(xor.plan.value);
    expect(readGetTsPlan()?.paymentAmount).toBe('1');
    expect(parseGetTsPlan({ ...emptyGetTsPlan(), references: { burn: hash } }, 'xor')).toBeNull();
    const selected = ref<GetTsPurpose>('xor');
    const changing = useGetTsPlan(selected);
    expect(changing.plan.value.paymentAmount).toBe('2');
    selected.value = 'ts';
    expect(changing.plan.value.paymentAmount).toBe('1');
    changing.updatePlan({ daiAmount: '9' });
    expect(xor.plan.value.daiAmount).toBe('5');
    xor.clearPlan();
    expect(readGetTsPlan(undefined, 'xor')).toBeNull();
    expect(ts.plan.value.paymentAmount).toBe('1');
  });
});
