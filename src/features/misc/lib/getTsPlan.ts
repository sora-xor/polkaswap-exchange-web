import { FPNumber } from '@sora-substrate/sdk';
import type { GetTsPurpose, GetTsSource, GetTsStep } from './getTsFlow';

/** A draft and submitted transaction references, never a quote or evidence of completion. */
export const GET_TS_PLAN_STORAGE_KEY = 'polkaswap:get-ts:plan:v1';
export const BUY_XOR_PLAN_STORAGE_KEY = 'polkaswap:buy-xor:plan:v1';
export const GET_TS_PAYMENT_ASSETS = [
  'eth',
  'usdt-ethereum',
  'dai-ethereum',
  'usdt-ton',
  'ton',
  'card',
  'dai-sora',
  'xor-sora',
] as const;
export type GetTsPaymentAsset = (typeof GET_TS_PAYMENT_ASSETS)[number];
export type GetTsTransactionStage = 'conversion' | 'bridge' | 'swap' | 'burn';
/** Resume inputs after opening card checkout; neither amount proves payment or delivery. */
export interface GetTsCardDraft {
  deliveredEth: string;
  conversionEth: string;
}
export interface GetTsBridgeDraft {
  id: string;
  amount: string;
  /** Digest of the reviewed purpose, asset, accounts, network and amount; never completion evidence. */
  contextHash: string;
}
export interface GetTsSwapDraft {
  id: string;
  amount: string;
  /** Public-context digest only; the local draft ID is never a submitted transaction hash. */
  contextHash: string;
}
export interface GetTsPlan {
  version: 1;
  paymentAsset: GetTsPaymentAsset | null;
  paymentAmount: string;
  daiAmount: string;
  xorAmount: string;
  references: Partial<Record<GetTsTransactionStage, string>>;
  cardDraft?: GetTsCardDraft;
  bridgeDraft?: GetTsBridgeDraft;
  swapDraft?: GetTsSwapDraft;
}
export type GetTsPlanPatch = Partial<Pick<GetTsPlan, 'paymentAsset' | 'paymentAmount' | 'daiAmount' | 'xorAmount'>>;
/** Current verified-reader results only; never load these fields from saved browser state. */
export type GetTsPlanProgress = Partial<Record<GetTsTransactionStage, { state: string; reference?: string }>>;
type PlanStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
const stages = ['conversion', 'bridge', 'swap', 'burn'];
const maxCodec = FPNumber.fromCodecValue(
  '115792089237316195423570985008687907853269984665640564039457584007913129639935'
);

/** Returns a fresh empty draft without a connected-account identity. */
export function emptyGetTsPlan(): GetTsPlan {
  return { version: 1, paymentAsset: null, paymentAmount: '', daiAmount: '', xorAmount: '', references: {} };
}

/**
 * Protects a purchase until every tracked action is conclusively resolved for its exact hash.
 * A failed bridge can still require claiming/recovery. Burn keeps its separate receipt lifecycle.
 * Drafts, missing evidence, disconnections and unrelated receipts never authorize discarding it.
 */
export function getTsPlanProtection(
  plan: GetTsPlan,
  progress: GetTsPlanProgress = {},
  preparing?: 'conversion' | 'swap'
): { source: GetTsSource | null; step: GetTsStep } | null {
  const unresolved =
    !!preparing ||
    !!plan.bridgeDraft ||
    !!plan.swapDraft ||
    Object.entries(plan.references).some(([stage, reference]) => {
      if (stage === 'burn') return false;
      const evidence = progress[stage as GetTsTransactionStage];
      return (
        evidence?.reference?.toLowerCase() !== reference.toLowerCase() ||
        !(evidence?.state === 'received' || (evidence?.state === 'failed' && stage !== 'bridge'))
      );
    });
  if (!unresolved) return null;
  const source: GetTsSource | null =
    plan.paymentAsset === 'card'
      ? 'card'
      : plan.paymentAsset === 'dai-sora'
        ? 'sora'
        : plan.paymentAsset === 'xor-sora'
          ? 'xor'
          : plan.paymentAsset === 'ton' || plan.paymentAsset === 'usdt-ton'
            ? 'ton'
            : plan.paymentAsset
              ? 'ethereum'
              : null;
  const step: GetTsStep = preparing
    ? preparing === 'swap'
      ? 'swap'
      : 'fund'
    : plan.swapDraft || plan.references.swap
      ? 'swap'
      : plan.bridgeDraft || plan.references.bridge
        ? 'bridge'
        : 'fund';
  return { source, step };
}

/** Validates precision and magnitude before canonicalizing an exact positive natural amount. */
export function normalizeGetTsAmount(value: unknown, decimals = 18): string | null {
  if (typeof value !== 'string' || value.length > 98 || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return null;
  if ((value.split('.')[1]?.length ?? 0) > decimals) return null;
  const amount = new FPNumber(value, decimals);
  if (!amount.isFinity() || !amount.gt(FPNumber.ZERO) || amount.gt(maxCodec)) return null;
  return amount.toString();
}

/** A card resume hint carries only exact positive ETH draft amounts within its estimated budget. */
export function parseGetTsCardDraft(value: unknown): GetTsCardDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 2 || !['deliveredEth', 'conversionEth'].every((key) => key in record)) return null;
  const deliveredEth = normalizeGetTsAmount(record.deliveredEth);
  const conversionEth = normalizeGetTsAmount(record.conversionEth);
  if (!deliveredEth || !conversionEth || new FPNumber(conversionEth).gt(new FPNumber(deliveredEth))) return null;
  return { deliveredEth, conversionEth };
}

/** Only submitted chain hashes may be persisted; local unsigned history IDs are excluded. */
export function isGetTsTransactionReference(value: unknown): value is string {
  return typeof value === 'string' && /^0x[0-9a-f]{64}$/i.test(value) && !/^0x0+$/i.test(value);
}

/** SDK history IDs are opaque local references, bounded and never treated as transaction hashes. */
export function isGetTsBridgeDraftId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256 && /^[A-Za-z0-9_+/=:.-]+$/.test(value);
}

/** A saved bridge draft contains only its exact reviewed row pointer, amount and public-context digest. */
export function parseGetTsBridgeDraft(value: unknown): GetTsBridgeDraft | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Object.keys(record).length !== 3 || !['id', 'amount', 'contextHash'].every((key) => key in record)) return null;
  const amount = normalizeGetTsAmount(record.amount);
  if (!isGetTsBridgeDraftId(record.id) || !amount || !isGetTsTransactionReference(record.contextHash)) return null;
  return { id: record.id, amount, contextHash: record.contextHash.toLowerCase() };
}

/** Purchase swap IDs are purpose-scoped UUIDs, distinct from all actual chain hashes. */
export function parseGetTsSwapDraft(value: unknown, purpose: GetTsPurpose): GetTsSwapDraft | null {
  const draft = parseGetTsBridgeDraft(value);
  return draft &&
    new RegExp(`^purchase-swap:${purpose}:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`).test(draft.id)
    ? draft
    : null;
}

/** Strict schemas prevent saved browser state from injecting balances, wallet data, or success flags. */
export function parseGetTsPlan(value: unknown, purpose: GetTsPurpose = 'ts'): GetTsPlan | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = ['version', 'paymentAsset', 'paymentAmount', 'daiAmount', 'xorAmount', 'references'];
  if (
    !keys.every((key) => key in record) ||
    Object.keys(record).some((key) => ![...keys, 'cardDraft', 'bridgeDraft', 'swapDraft'].includes(key))
  )
    return null;
  const bridgeDraft = 'bridgeDraft' in record ? parseGetTsBridgeDraft(record.bridgeDraft) : undefined;
  if (bridgeDraft === null) return null;
  const swapDraft = 'swapDraft' in record ? parseGetTsSwapDraft(record.swapDraft, purpose) : undefined;
  if (swapDraft === null) return null;
  const cardDraft = 'cardDraft' in record ? parseGetTsCardDraft(record.cardDraft) : undefined;
  if (cardDraft === null || (cardDraft && record.paymentAsset !== 'card')) return null;
  if (
    record.version !== 1 ||
    (record.paymentAsset !== null && !GET_TS_PAYMENT_ASSETS.includes(record.paymentAsset as GetTsPaymentAsset))
  )
    return null;
  if (!record.references || typeof record.references !== 'object' || Array.isArray(record.references)) return null;
  const references = record.references as Record<string, unknown>;
  if (Object.keys(references).some((key) => !stages.includes(key) || !isGetTsTransactionReference(references[key])))
    return null;
  if (purpose === 'xor' && 'burn' in references) return null;
  const decimals =
    record.paymentAsset === 'card'
      ? 2
      : record.paymentAsset === 'ton'
        ? 9
        : String(record.paymentAsset).startsWith('usdt-')
          ? 6
          : 18;
  const paymentAmount = record.paymentAmount === '' ? '' : normalizeGetTsAmount(record.paymentAmount, decimals);
  const daiAmount = record.daiAmount === '' ? '' : normalizeGetTsAmount(record.daiAmount);
  const xorAmount = record.xorAmount === '' ? '' : normalizeGetTsAmount(record.xorAmount);
  if (paymentAmount === null || daiAmount === null || xorAmount === null || (!record.paymentAsset && paymentAmount))
    return null;
  if (cardDraft && !paymentAmount) return null;
  if (bridgeDraft && (bridgeDraft.amount !== daiAmount || references.bridge)) return null;
  if (swapDraft && (swapDraft.amount !== daiAmount || references.swap || bridgeDraft)) return null;
  return {
    version: 1,
    paymentAsset: record.paymentAsset as GetTsPaymentAsset | null,
    paymentAmount,
    daiAmount,
    xorAmount,
    references: Object.fromEntries(
      Object.entries(references).map(([key, hash]) => [key, (hash as string).toLowerCase()])
    ),
    ...(cardDraft ? { cardDraft } : {}),
    ...(bridgeDraft ? { bridgeDraft } : {}),
    ...(swapDraft ? { swapDraft } : {}),
  };
}

/** Changing the original budget invalidates all downstream draft amounts and transaction associations. */
export function patchGetTsPlan(
  current: GetTsPlan,
  patch: GetTsPlanPatch,
  purpose: GetTsPurpose = 'ts'
): GetTsPlan | null {
  if (Object.keys(patch).some((key) => !['paymentAsset', 'paymentAmount', 'daiAmount', 'xorAmount'].includes(key)))
    return null;
  const candidate = { ...current, ...patch };
  if (
    current.cardDraft &&
    (candidate.paymentAsset !== current.paymentAsset ||
      normalizeGetTsAmount(candidate.paymentAmount, 2) !== current.paymentAmount)
  )
    delete candidate.cardDraft;
  if ('daiAmount' in patch && normalizeGetTsAmount(patch.daiAmount) !== current.daiAmount) {
    delete candidate.bridgeDraft;
    delete candidate.swapDraft;
  }
  const next = parseGetTsPlan(candidate, purpose);
  if (!next) return null;
  if (next.paymentAsset !== current.paymentAsset || next.paymentAmount !== current.paymentAmount) {
    next.daiAmount = '';
    next.xorAmount = '';
    next.references = {};
    delete next.bridgeDraft;
    delete next.swapDraft;
  }
  return next;
}

/** Private browsing may deny storage; the reactive in-memory draft remains usable. */
export function getTsPlanStorage(): PlanStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

/** Restores only a bounded draft and public transaction pointers from this tab. */
export function readGetTsPlan(storage = getTsPlanStorage(), purpose: GetTsPurpose = 'ts'): GetTsPlan | null {
  try {
    const raw = storage?.getItem(purpose === 'xor' ? BUY_XOR_PLAN_STORAGE_KEY : GET_TS_PLAN_STORAGE_KEY);
    return raw && raw.length <= 1_536 ? parseGetTsPlan(JSON.parse(raw), purpose) : null;
  } catch {
    return null;
  }
}

/** Writes canonical fields only; all statuses must be re-read from chain or current history. */
export function writeGetTsPlan(value: GetTsPlan, storage = getTsPlanStorage(), purpose: GetTsPurpose = 'ts'): boolean {
  const parsed = parseGetTsPlan(value, purpose);
  if (!parsed || !storage) return false;
  try {
    storage.setItem(purpose === 'xor' ? BUY_XOR_PLAN_STORAGE_KEY : GET_TS_PLAN_STORAGE_KEY, JSON.stringify(parsed));
    return true;
  } catch {
    return false;
  }
}

/** Clears only the purchase draft, leaving wallets, navigation and transaction history intact. */
export function clearGetTsPlan(storage = getTsPlanStorage(), purpose: GetTsPurpose = 'ts'): boolean {
  try {
    if (!storage) return false;
    storage.removeItem(purpose === 'xor' ? BUY_XOR_PLAN_STORAGE_KEY : GET_TS_PLAN_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** A suggested burn never exceeds the connected wallet's known balance minus its positive fee. */
export function getTsBurnPrefill(value: unknown, balanceCodec: unknown, feeCodec: unknown): string {
  const amount = normalizeGetTsAmount(value);
  if (
    !amount ||
    typeof balanceCodec !== 'string' ||
    typeof feeCodec !== 'string' ||
    !/^\d{1,78}$/.test(balanceCodec) ||
    !/^\d{1,78}$/.test(feeCodec)
  )
    return '';
  const balance = FPNumber.fromCodecValue(balanceCodec);
  const fee = FPNumber.fromCodecValue(feeCodec);
  const available = balance.sub(fee);
  if (!fee.gt(FPNumber.ZERO) || !available.gt(FPNumber.ZERO)) return '';
  return FPNumber.min(new FPNumber(amount), available).toString();
}
