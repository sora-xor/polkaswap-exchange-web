import { FPNumber, Operation } from '@sora-substrate/sdk';
import { DAI } from '@sora-substrate/sdk/build/assets/consts';
import type { GetTsPurpose } from './getTsFlow';
import {
  evaluateTonswapLiquidity,
  isTonswapFundingAmount,
  type TonswapFeeEvidence,
  SORA_FUNDING_MAINNET_GENESIS,
} from './tonswapLiquidity';

export const TONSWAP_BRIDGE_FUNDING_TAG = 'ethereum-dai-v1';
export const BUY_XOR_BRIDGE_FUNDING_TAG = 'ethereum-dai-v1';
const INVALID_CONTEXT = 'GET_TS_BRIDGE_CONTEXT_CHANGED';
const QUOTE_REQUIRED = 'GET_TS_BRIDGE_QUOTE_REQUIRED';

export interface TonswapBridgeTransaction {
  type?: unknown;
  amount?: string;
  assetAddress?: string;
  externalNetwork?: unknown;
  from?: string;
  to?: string;
  payload?: unknown;
}

/** A present but malformed tag must fail closed rather than silently become an ordinary transfer. */
export function hasTonswapBridgeFundingTag(transaction: TonswapBridgeTransaction): boolean {
  return (
    !!transaction.payload &&
    typeof transaction.payload === 'object' &&
    (Object.prototype.hasOwnProperty.call(transaction.payload, 'tonswapFunding') ||
      Object.prototype.hasOwnProperty.call(transaction.payload, 'buyXorFunding'))
  );
}

/** A purpose belongs to one explicit history tag; conflicting or malformed tags never downgrade policy. */
export function getTonswapBridgeFundingPurpose(transaction: TonswapBridgeTransaction): GetTsPurpose | null {
  const payload = transaction.payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const value = payload as Record<string, unknown>;
  if (
    value.buyXorFunding === BUY_XOR_BRIDGE_FUNDING_TAG &&
    !Object.prototype.hasOwnProperty.call(value, 'tonswapFunding')
  )
    return 'xor';
  if (
    value.tonswapFunding === TONSWAP_BRIDGE_FUNDING_TAG &&
    !Object.prototype.hasOwnProperty.call(value, 'buyXorFunding')
  )
    return 'ts';
  return null;
}

/** The reviewed row retains its independent purchase purpose across query changes and history recovery. */
export function getTonswapBridgeFundingPayload(purpose: GetTsPurpose): Record<string, string> {
  return purpose === 'xor'
    ? { buyXorFunding: BUY_XOR_BRIDGE_FUNDING_TAG }
    : { tonswapFunding: TONSWAP_BRIDGE_FUNDING_TAG };
}

/** Captures only immutable signing inputs; mutable tracking status and approval receipts are excluded. */
export function tonswapBridgeSigningIdentity(transaction: TonswapBridgeTransaction): string {
  return JSON.stringify([
    transaction.type,
    transaction.amount,
    transaction.assetAddress,
    transaction.externalNetwork,
    transaction.from,
    transaction.to,
    (transaction.payload as Record<string, unknown> | undefined)?.tonswapFunding,
    (transaction.payload as Record<string, unknown> | undefined)?.buyXorFunding,
  ]);
}

/** Maps fixed stored errors to existing translated recovery messages without persisting translated text. */
export function tonswapBridgeFailureTranslation(message: unknown, purpose: GetTsPurpose = 'ts'): string | null {
  if (message === INVALID_CONTEXT)
    return purpose === 'xor' ? 'buyXor.bridgePreparationError' : 'getTs.bridgePreparationError';
  if (message === QUOTE_REQUIRED) return 'getTs.liquidity.unavailable';
  return null;
}

/**
 * Re-quotes the exact guided transfer before an irreversible wallet action.
 * The caller supplies its connected API and live fee state; ordinary transfers are untouched.
 */
export async function assertTonswapBridgeQuote(
  transaction: TonswapBridgeTransaction,
  dependencies: {
    readState: () => { connected: boolean; genesis: string; fees: TonswapFeeEvidence };
    quote: (amountCodec: string) => Promise<{ amount: string; amountWithoutImpact: string }>;
  }
): Promise<number | null> {
  if (!hasTonswapBridgeFundingTag(transaction)) return null;
  const identity = tonswapBridgeSigningIdentity(transaction);
  const purpose = getTonswapBridgeFundingPurpose(transaction);
  if (
    !purpose ||
    transaction.type !== Operation.EthBridgeIncoming ||
    transaction.assetAddress !== DAI.address ||
    transaction.externalNetwork !== 1 ||
    !transaction.from ||
    !transaction.to ||
    !transaction.amount ||
    !isTonswapFundingAmount(transaction.amount)
  )
    throw new Error(INVALID_CONTEXT);
  const amount = transaction.amount;
  const startedAt = Date.now();
  try {
    const before = dependencies.readState();
    if (!before.connected || before.genesis.toLowerCase() !== SORA_FUNDING_MAINNET_GENESIS)
      throw new Error(QUOTE_REQUIRED);
    const quote = await dependencies.quote(new FPNumber(amount).toCodecString());
    const after = dependencies.readState();
    if (
      !after.connected ||
      after.genesis.toLowerCase() !== SORA_FUNDING_MAINNET_GENESIS ||
      tonswapBridgeSigningIdentity(transaction) !== identity
    )
      throw new Error(QUOTE_REQUIRED);
    const checked = evaluateTonswapLiquidity(
      amount,
      quote.amount,
      quote.amountWithoutImpact,
      after.fees,
      startedAt,
      purpose
    );
    if (!checked.allowed || checked.expiresAt <= Date.now()) throw new Error(QUOTE_REQUIRED);
    return checked.expiresAt;
  } catch {
    throw new Error(QUOTE_REQUIRED);
  }
}
