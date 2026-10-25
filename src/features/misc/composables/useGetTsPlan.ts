import { computed, readonly, shallowRef, toValue, type MaybeRefOrGetter } from 'vue';
import type { GetTsPurpose } from '@/features/misc/lib/getTsFlow';
import type { EthHistory } from '@sora-substrate/sdk/build/bridgeProxy/eth/types';
import type { HistoryItem } from '@sora-substrate/sdk';
import { createGetTsSwapDraft, matchGetTsSwapDraft } from '@/features/misc/lib/getTsSwapDraft';
import {
  createGetTsBridgeDraft,
  matchGetTsBridgeDraft,
  type GetTsBridgeContext,
} from '@/features/misc/lib/getTsBridgeProgress';
import {
  clearGetTsPlan,
  emptyGetTsPlan,
  isGetTsTransactionReference,
  patchGetTsPlan,
  parseGetTsPlan,
  readGetTsPlan,
  writeGetTsPlan,
  type GetTsPlan,
  type GetTsCardDraft,
  type GetTsPlanPatch,
  type GetTsTransactionStage,
} from '@/features/misc/lib/getTsPlan';

const plans = { ts: shallowRef<GetTsPlan>(), xor: shallowRef<GetTsPlan>() };

/** Shares one tab's validated draft across conversion, bridge, swap and burn components. */
export function useGetTsPlan(purpose: MaybeRefOrGetter<GetTsPurpose> = 'ts') {
  const selected = computed(() => (toValue(purpose) === 'xor' ? 'xor' : 'ts'));
  const current = computed<GetTsPlan>({
    get: () => {
      const slot = plans[selected.value];
      slot.value ??= readGetTsPlan(undefined, selected.value) ?? emptyGetTsPlan();
      return slot.value;
    },
    set: (value) => {
      plans[selected.value].value = value;
    },
  });
  /** Returns false for invalid input; storage denial does not stop a valid in-memory update. */
  function updatePlan(patch: GetTsPlanPatch): boolean {
    const next = patchGetTsPlan(current.value, patch, selected.value);
    if (!next) return false;
    current.value = next;
    writeGetTsPlan(next, undefined, selected.value);
    return true;
  }
  /** Saves a navigation hint before provider handoff, never provider status or a trusted quote. */
  function rememberCardDraft(draft: GetTsCardDraft): boolean {
    const next = parseGetTsPlan({ ...current.value, cardDraft: draft }, selected.value);
    if (!next) return false;
    current.value = next;
    writeGetTsPlan(next, undefined, selected.value);
    return true;
  }
  /** An explicit fresh card review may clear its hint without changing any tracked chain transaction. */
  function forgetCardDraft(): void {
    if (!current.value.cardDraft) return;
    const next = { ...current.value };
    delete next.cardDraft;
    current.value = next;
    writeGetTsPlan(next, undefined, selected.value);
  }
  /** Called only with a hash returned by an actual submitted transaction, never a quote or local draft ID. */
  function trackTransaction(stage: GetTsTransactionStage, reference: string): boolean {
    if (
      (selected.value === 'xor' && stage === 'burn') ||
      !['conversion', 'bridge', 'swap', 'burn'].includes(stage) ||
      !isGetTsTransactionReference(reference)
    )
      return false;
    const hash = reference.toLowerCase();
    if (current.value.references[stage] === hash) return true;
    const stages: GetTsTransactionStage[] = ['conversion', 'bridge', 'swap', 'burn'];
    const references = { ...current.value.references, [stage]: hash };
    // A replacement transaction starts a new downstream journey; old receipts cannot complete it.
    for (const downstream of stages.slice(stages.indexOf(stage) + 1)) delete references[downstream];
    const next = {
      ...current.value,
      references,
      ...(stage === 'conversion' ? { daiAmount: '', xorAmount: '' } : {}),
      ...(stage === 'bridge' ? { xorAmount: '' } : {}),
    };
    if (stage === 'conversion' || stage === 'bridge') delete next.bridgeDraft;
    if (stage === 'conversion') delete next.cardDraft;
    if (stage !== 'burn') delete next.swapDraft;
    current.value = next;
    writeGetTsPlan(current.value, undefined, selected.value);
    return true;
  }
  /** Persists the exact reviewed row across reloads, without storing wallet addresses or success. */
  function rememberBridgeDraft(row: EthHistory): boolean {
    const draft = createGetTsBridgeDraft(row, selected.value);
    if (!draft || draft.amount !== current.value.daiAmount) return false;
    const references = { ...current.value.references };
    delete references.bridge;
    delete references.swap;
    delete references.burn;
    const next = { ...current.value, bridgeDraft: draft, references, xorAmount: '' };
    delete next.swapDraft;
    current.value = next;
    writeGetTsPlan(current.value, undefined, selected.value);
    return true;
  }
  /** Only the saved reviewed row under the same purpose/accounts may supply its actual submitted hash. */
  function trackBridgeSubmission(row: EthHistory, context: Omit<GetTsBridgeContext, 'reference' | 'purpose'>): boolean {
    const draft = current.value.bridgeDraft;
    if (
      !draft ||
      !isGetTsTransactionReference(row.externalHash) ||
      !matchGetTsBridgeDraft(row, draft, { ...context, purpose: selected.value })
    )
      return false;
    const amount = draft.amount;
    if (!trackTransaction('bridge', row.externalHash)) return false;
    updatePlan({ daiAmount: amount });
    return true;
  }
  /** Requires durable correlation before purchase signing so a reload cannot invite a duplicate swap. */
  function rememberSwapDraft(row: HistoryItem, genesis: string): boolean {
    if (current.value.swapDraft || current.value.bridgeDraft) return false;
    const draft = createGetTsSwapDraft(row, genesis, selected.value);
    if (!draft) return false;
    const references = { ...current.value.references };
    delete references.swap;
    delete references.burn;
    const next = { ...current.value, swapDraft: draft, daiAmount: draft.amount, references, xorAmount: '' };
    if (!writeGetTsPlan(next, undefined, selected.value)) return false;
    current.value = next;
    return true;
  }
  /** Adopts only the exact reviewed row's signed hash under the currently connected mainnet account. */
  function trackSwapSubmission(row: HistoryItem, account: string, genesis: string): boolean {
    const draft = current.value.swapDraft;
    return (
      !!draft &&
      isGetTsTransactionReference(row.txId) &&
      matchGetTsSwapDraft(row, draft, account, genesis, selected.value) &&
      trackTransaction('swap', row.txId)
    );
  }
  /** Used only after definite wallet rejection, never for a timeout or ambiguous send failure. */
  function abandonSwapDraft(id: string): void {
    if (current.value.swapDraft?.id !== id) return;
    const next = { ...current.value };
    delete next.swapDraft;
    current.value = next;
    writeGetTsPlan(next, undefined, selected.value);
  }
  /** Starts a new draft while preserving independent wallet and chain history. */
  function clearPlan(): void {
    current.value = emptyGetTsPlan();
    clearGetTsPlan(undefined, selected.value);
  }
  return {
    plan: readonly(current),
    updatePlan,
    rememberCardDraft,
    forgetCardDraft,
    trackTransaction,
    rememberBridgeDraft,
    trackBridgeSubmission,
    rememberSwapDraft,
    trackSwapSubmission,
    abandonSwapDraft,
    clearPlan,
  };
}
