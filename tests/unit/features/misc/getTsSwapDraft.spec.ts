import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Operation, type HistoryItem } from '@sora-substrate/sdk';
import { DAI, XOR } from '@sora-substrate/sdk/build/assets/consts';
import {
  createGetTsSwapDraft,
  matchGetTsSwapDraft,
  isDefiniteGetTsSwapRejection,
} from '@/features/misc/lib/getTsSwapDraft';
import { parseGetTsPlan, readGetTsPlan, emptyGetTsPlan } from '@/features/misc/lib/getTsPlan';
import { useGetTsPlan } from '@/features/misc/composables/useGetTsPlan';
import { SORA_FUNDING_MAINNET_GENESIS as genesis } from '@/features/misc/lib/tonswapLiquidity';
vi.unmock('@polkadot/util-crypto');
const id = 'purchase-swap:xor:11111111-2222-3333-4444-555555555555';
const account = `0x${'1'.repeat(64)}`;
const hash = `0x${'2'.repeat(64)}`;
const row: HistoryItem = {
  id,
  from: account,
  type: Operation.Swap,
  amount: '5',
  assetAddress: DAI.address,
  asset2Address: XOR.address,
};
beforeEach(() => {
  sessionStorage.clear();
  useGetTsPlan().clearPlan();
  useGetTsPlan('xor').clearPlan();
});
describe('purchase swap deterministic draft', () => {
  it('binds exact purpose, chain, account, pair and amount without storing raw account fields', () => {
    const draft = createGetTsSwapDraft(row, genesis, 'xor')!;
    expect(draft).toMatchObject({ id, amount: '5' });
    expect(JSON.stringify(draft)).not.toContain(account);
    expect(matchGetTsSwapDraft(row, draft, account, genesis, 'xor')).toBe(true);
    for (const patch of [
      { id: `${id}a` },
      { from: hash },
      { amount: '6' },
      { assetAddress: XOR.address },
      { asset2Address: DAI.address },
      { type: Operation.Transfer },
    ])
      expect(matchGetTsSwapDraft({ ...row, ...patch }, draft, account, genesis, 'xor')).toBe(false);
    expect(matchGetTsSwapDraft(row, draft, hash, genesis, 'xor')).toBe(false);
    expect(matchGetTsSwapDraft(row, draft, account, hash, 'xor')).toBe(false);
    expect(createGetTsSwapDraft(row, genesis, 'ts')).toBeNull();
    expect(createGetTsSwapDraft({ ...row, from: 'bad address' }, genesis, 'xor')).toBeNull();
  });
  it('persists a draft before signing and adopts only its exact eventual txId, never the local ID', () => {
    const purchase = useGetTsPlan('xor');
    purchase.updatePlan({ paymentAsset: 'dai-sora', paymentAmount: '5' });
    expect(purchase.rememberSwapDraft(row, genesis)).toBe(true);
    expect(readGetTsPlan(undefined, 'xor')?.swapDraft?.id).toBe(id);
    expect(purchase.trackSwapSubmission(row, account, genesis)).toBe(false);
    expect(purchase.trackSwapSubmission({ ...row, id: 'another', txId: hash }, account, genesis)).toBe(false);
    expect(purchase.trackSwapSubmission({ ...row, txId: hash }, account, genesis)).toBe(true);
    expect(purchase.plan.value.references.swap).toBe(hash);
    expect(purchase.plan.value.swapDraft).toBeUndefined();
    // A deliberate reviewed retry may replace the old finalized-failed hash, but cannot replace a pending draft.
    expect(purchase.rememberSwapDraft(row, genesis)).toBe(true);
    expect(purchase.plan.value.references.swap).toBeUndefined();
    expect(purchase.rememberSwapDraft({ ...row, id: id.replace('11111111', 'aaaaaaaa') }, genesis)).toBe(false);
    purchase.abandonSwapDraft('another');
    expect(purchase.plan.value.swapDraft).toBeDefined();
    purchase.abandonSwapDraft(id);
    expect(purchase.plan.value.swapDraft).toBeUndefined();
  });
  it('rejects extended/cross-purpose schemas and invalidates drafts after budget or earlier transaction changes', () => {
    const swapDraft = createGetTsSwapDraft(row, genesis, 'xor')!;
    const saved = { ...emptyGetTsPlan(), daiAmount: '5', swapDraft };
    expect(parseGetTsPlan(saved, 'xor')?.swapDraft).toEqual(swapDraft);
    expect(parseGetTsPlan(saved, 'ts')).toBeNull();
    expect(parseGetTsPlan({ ...saved, swapDraft: { ...swapDraft, status: 'received' } }, 'xor')).toBeNull();
    expect(parseGetTsPlan({ ...saved, daiAmount: '6' }, 'xor')).toBeNull();
    const purchase = useGetTsPlan('xor');
    purchase.rememberSwapDraft(row, genesis);
    purchase.trackTransaction('conversion', hash);
    expect(purchase.plan.value.swapDraft).toBeUndefined();
    purchase.rememberSwapDraft(row, genesis);
    purchase.updatePlan({ paymentAsset: 'dai-sora', paymentAmount: '6' });
    expect(purchase.plan.value.swapDraft).toBeUndefined();
  });
  it('blocks signing correlation when session persistence is denied', () => {
    const spy = vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(useGetTsPlan('xor').rememberSwapDraft(row, genesis)).toBe(false);
    expect(useGetTsPlan('xor').plan.value.swapDraft).toBeUndefined();
    spy.mockRestore();
  });
  it('allows draft disposal only for explicit wallet refusal, never an RPC timeout', () => {
    expect(isDefiniteGetTsSwapRejection(new Error('User rejected'))).toBe(true);
    expect(isDefiniteGetTsSwapRejection({ code: 4001 })).toBe(true);
    expect(isDefiniteGetTsSwapRejection(new Error('Cancelled'))).toBe(true);
    for (const error of [new Error('RPC timeout'), new Error('connection dropped'), undefined, 'User rejected'])
      expect(isDefiniteGetTsSwapRejection(error)).toBe(false);
  });
});
