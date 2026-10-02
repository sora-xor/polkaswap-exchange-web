import { FPNumber } from '@sora-substrate/sdk';
import { DAI, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { api } from '@/lib/soraneo-wallet/src/api';
import type { TonswapBurnSnapshot } from '@/indexer/queries/tonswapBurn';
import { evaluateTonswapLiquidity, SORA_FUNDING_MAINNET_GENESIS, type TonswapFeeEvidence } from './tonswapLiquidity';
import {
  requestTonswapConversionQuote,
  type TonswapConversionQuote,
  type TonswapConversionSource,
  type TonswapConversionTarget,
} from './tonswapConversion';
import { isSwapPriceImpactAllowed } from '@/features/swap/services/priceImpactLimit';
import type { GetTsPurpose, GetTsSource } from './getTsFlow';

export type GetTsPaymentAsset = 'USD' | 'ETH' | 'USDT' | 'TON' | 'DAI' | 'XOR';
export type GetTsPlanState = 'idle' | 'loading' | 'ready' | 'blocked' | 'unavailable';
export type GetTsPlanReason =
  | 'invalid-amount'
  | 'unsupported-asset'
  | 'card-provider'
  | 'card-minimum'
  | 'native-ton'
  | 'mainnet'
  | 'fees-unavailable'
  | 'fees-insufficient'
  | 'conversion-unavailable'
  | 'conversion-impact'
  | 'liquidity-unavailable'
  | 'price-impact'
  | 'campaign-unavailable'
  | 'cap-exceeded'
  | 'expired';
export type GetTsPlanLimitation =
  | 'indicative'
  | 'ethereum-gas'
  | 'ton-gas'
  | 'provider-handoff'
  | 'card-provider'
  | 'native-ton';
export interface GetTsPlanFee {
  stage: 'provider' | 'swap' | 'burn';
  amount: string;
  symbol: string;
  included: boolean;
}
export interface GetTsPlanRequest {
  /** Existing callers retain TS campaign behavior; generic XOR never reads campaign data. */
  purpose?: GetTsPurpose;
  source: GetTsSource;
  paymentAsset: GetTsPaymentAsset;
  amount: string;
}
/** Display-only results. No transaction, address, calldata, or authorization can be carried to execution. */
export interface GetTsPlanPreviewResult extends GetTsPlanRequest {
  state: GetTsPlanState;
  feasible: boolean | null;
  feeComponents: GetTsPlanFee[];
  limitations: GetTsPlanLimitation[];
  costCoverage: 'complete' | 'partial' | 'unavailable';
  burnableXor?: string;
  spendableXor?: string;
  estimatedTs?: string;
  paymentEthAmount?: string;
  providerMinimumUsd?: string;
  daiAmount?: string;
  daiIntent?: string;
  eligibleXor?: string;
  excessXor?: string;
  indexedThroughBlock?: number;
  priceImpact?: string;
  expiresAt?: number;
  reason?: GetTsPlanReason;
}
type PreviewConversion = Pick<
  TonswapConversionQuote,
  'outputAmount' | 'minOutputAmount' | 'outputDecimals' | 'priceImpactPercent' | 'fees' | 'expiresAt'
>;
export interface GetTsPlanDependencies {
  fees: TonswapFeeEvidence;
  moonpayPublicKey?: string;
  cardQuote?: (amount: string, publicKey: string, signal?: AbortSignal) => Promise<GetTsCardQuote>;
  checkMainnet?: () => boolean;
  snapshot?: () => Promise<TonswapBurnSnapshot>;
  quoteDai?: (amount: string) => Promise<{ amount: string; amountWithoutImpact: string }>;
  conversion?: (
    source: TonswapConversionSource,
    target: TonswapConversionTarget,
    amount: string,
    signal?: AbortSignal
  ) => Promise<PreviewConversion>;
  now?: () => number;
  signal?: AbortSignal;
}
export const GET_TS_PLAN_TTL_MS = 30_000;
/** Public dummy recipients are used only for provider price discovery; their calldata is discarded. */
const PREVIEW_EVM_ACCOUNT = '0x1111111111111111111111111111111111111111';
const PREVIEW_TON_ACCOUNT = 'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ';

/** The source determines exact supported asset/network combinations. */
export function getTsPlanAssets(source: GetTsSource): GetTsPaymentAsset[] {
  switch (source) {
    case 'card':
      return ['USD'];
    case 'ethereum':
      return ['ETH', 'USDT', 'DAI'];
    case 'ton':
      return ['USDT', 'TON'];
    case 'xor':
      return ['XOR'];
    case 'sora':
      return ['DAI'];
    default:
      return [];
  }
}
/** Bounded natural input; fiat and token decimal limits are explicit. */
export function isGetTsPlanAmount(amount: string, asset: GetTsPaymentAsset): boolean {
  const decimals = asset === 'USD' ? 2 : asset === 'USDT' ? 6 : asset === 'TON' ? 9 : 18;
  return (
    typeof amount === 'string' &&
    amount.length <= 60 &&
    new RegExp(`^(?:0|[1-9]\\d*)(?:\\.\\d{1,${decimals}})?$`).test(amount) &&
    new FPNumber(amount).gt(FPNumber.ZERO)
  );
}
/** Creates an empty state without pretending that unquoted costs are zero. */
export function emptyGetTsPlan(request: GetTsPlanRequest, state: GetTsPlanState = 'idle'): GetTsPlanPreviewResult {
  return {
    ...request,
    state,
    feasible: null,
    feeComponents: [],
    limitations: ['indicative'],
    costCoverage: 'unavailable',
  };
}
/** Requires the configured SDK connection to prove the production SORA genesis. */
function isMainnet(): boolean {
  const chain = api.connection?.api;
  return !!chain?.isConnected && chain.genesisHash?.toString().toLowerCase() === SORA_FUNDING_MAINNET_GENESIS;
}
/** Requests a read-only SMART DAI/XOR quote from the verified SORA connection. */
async function quoteDai(amount: string): Promise<{ amount: string; amountWithoutImpact: string }> {
  const chain = api.connection?.api;
  if (!isMainnet() || !chain) throw new Error('Mainnet unavailable');
  const quote = await chain.rpc.liquidityProxy.quote(
    0,
    DAI.address,
    XOR.address,
    new FPNumber(amount).toCodecString(),
    'WithDesiredInput',
    ['XYKPool', 'OrderBook'],
    'AllowSelected'
  );
  if (!isMainnet() || api.connection?.api !== chain) throw new Error('Changed network');
  const output = quote.unwrap();
  return { amount: output.amount.toString(), amountWithoutImpact: output.amountWithoutImpact.toString() };
}
/** Uses the existing strict quote validator and never exposes its transaction to the parent page. */
async function conversion(
  source: TonswapConversionSource,
  target: TonswapConversionTarget,
  amount: string,
  signal?: AbortSignal
): Promise<PreviewConversion> {
  const quote = await requestTonswapConversionQuote(
    {
      source,
      target,
      amount,
      fromAddress: source === 'usdt-ton' ? PREVIEW_TON_ACCOUNT : PREVIEW_EVM_ACCOUNT,
      toAddress: PREVIEW_EVM_ACCOUNT,
    },
    { signal }
  );
  return {
    outputAmount: quote.outputAmount,
    minOutputAmount: quote.minOutputAmount,
    outputDecimals: quote.outputDecimals,
    priceImpactPercent: quote.priceImpactPercent,
    fees: quote.fees,
    expiresAt: quote.expiresAt,
  };
}
/** RPC and indexer display work is bounded and may be abandoned without touching wallet state. */
async function bounded<T>(work: Promise<T>, signal?: AbortSignal): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort: (() => void) | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Preview timed out')), 15_000);
        onAbort = () => reject(new Error('Preview cancelled'));
        if (signal?.aborted) onAbort();
        else signal?.addEventListener('abort', onAbort, { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (onAbort) signal?.removeEventListener('abort', onAbort);
  }
}
/** A zero SDK fee is an unavailable sentinel, never a free transaction. */
function knownFee(codec: unknown): FPNumber | null {
  return typeof codec === 'string' && codec.length <= 78 && /^[1-9]\d*$/.test(codec)
    ? FPNumber.fromCodecValue(codec, 18)
    : null;
}
/** Computes a conservative, short-lived plan without connecting or inspecting a user's wallet. */
export async function requestGetTsPlanPreview(
  request: GetTsPlanRequest,
  dependencies: GetTsPlanDependencies
): Promise<GetTsPlanPreviewResult> {
  const result = emptyGetTsPlan(request, 'loading');
  const purpose = request.purpose ?? 'ts';
  const now = dependencies.now ?? Date.now;
  const startedAt = now();
  const stop = (reason: GetTsPlanReason, blocked = false): GetTsPlanPreviewResult => ({
    ...result,
    state: blocked ? 'blocked' : 'unavailable',
    feasible: blocked ? false : null,
    reason,
  });
  if (!getTsPlanAssets(request.source).includes(request.paymentAsset)) return stop('unsupported-asset', true);
  if (!request.amount) return emptyGetTsPlan(request);
  if (!isGetTsPlanAmount(request.amount, request.paymentAsset)) return stop('invalid-amount', true);
  if (request.source === 'ton' && request.paymentAsset === 'TON') {
    result.limitations.push('native-ton');
    return stop('native-ton');
  }
  const mainnet = dependencies.checkMainnet ?? isMainnet;
  if (!mainnet()) return stop('mainnet');
  const burnFee = purpose === 'xor' ? FPNumber.ZERO : knownFee(dependencies.fees.burnFeeCodec);
  const swapFee = knownFee(dependencies.fees.swapFeeCodec);
  if (!burnFee || (request.source !== 'xor' && !swapFee)) return stop('fees-unavailable');
  if (purpose === 'ts')
    result.feeComponents.push({ stage: 'burn', amount: burnFee.toString(), symbol: 'XOR', included: true });
  result.expiresAt = startedAt + GET_TS_PLAN_TTL_MS;
  result.costCoverage = request.source === 'xor' || request.source === 'sora' ? 'complete' : 'partial';
  if (request.source === 'ethereum' || request.source === 'ton' || request.source === 'card')
    result.limitations.push('ethereum-gas');
  if (request.source === 'ton') result.limitations.push('ton-gas', 'provider-handoff');
  let burnable: FPNumber;
  if (request.source === 'xor') {
    burnable = new FPNumber(request.amount).sub(burnFee).dp(18, 3);
    if (!burnable.gt(FPNumber.ZERO)) return stop('fees-insufficient', true);
  } else {
    result.feeComponents.push({
      stage: 'swap',
      amount: (swapFee as FPNumber).toString(),
      symbol: 'XOR',
      included: true,
    });
    let daiAmount = request.amount;
    let daiIntent = request.amount;
    let conversionAmount = request.amount;
    if (request.source === 'card') {
      result.limitations.push('card-provider');
      try {
        const card = await bounded(
          (dependencies.cardQuote ?? requestGetTsCardQuote)(
            request.amount,
            dependencies.moonpayPublicKey ?? '',
            dependencies.signal
          ),
          dependencies.signal
        );
        if (new FPNumber(card.totalUsd).gt(new FPNumber(request.amount))) {
          result.providerMinimumUsd = card.totalUsd;
          return stop('card-minimum', true);
        }
        result.paymentEthAmount = card.ethAmount;
        result.feeComponents.push(...card.fees);
        conversionAmount = card.ethAmount;
        result.expiresAt = Math.min(result.expiresAt as number, card.expiresAt);
      } catch {
        return stop('card-provider');
      }
    }
    if (request.paymentAsset !== 'DAI') {
      try {
        const readConversion = dependencies.conversion ?? conversion;
        const consume = (quote: PreviewConversion): string => {
          if (!isSwapPriceImpactAllowed(quote.priceImpactPercent, '5')) throw new Error('conversion-impact');
          if (!Number.isSafeInteger(quote.expiresAt) || quote.expiresAt <= now() || quote.outputDecimals !== 18)
            throw new Error('conversion-unavailable');
          for (const value of [quote.outputAmount, quote.minOutputAmount])
            if (!/^[1-9]\d{0,77}$/.test(value)) throw new Error('conversion-unavailable');
          if (BigInt(quote.minOutputAmount) > BigInt(quote.outputAmount)) throw new Error('conversion-unavailable');
          result.expiresAt = Math.min(result.expiresAt as number, quote.expiresAt);
          for (const fee of quote.fees)
            result.feeComponents.push({
              stage: 'provider',
              amount: FPNumber.fromCodecValue(fee.amount, fee.decimals).toString(),
              symbol: fee.symbol,
              included: false,
            });
          daiIntent = FPNumber.fromCodecValue(quote.minOutputAmount, 18).toString();
          return FPNumber.fromCodecValue(quote.outputAmount, 18).toString();
        };
        if (request.source === 'ton') {
          const tonQuote = await bounded(
            readConversion('usdt-ton', 'eth', request.amount, dependencies.signal),
            dependencies.signal
          );
          consume(tonQuote);
          const ethMinimum = FPNumber.fromCodecValue(tonQuote.minOutputAmount, 18).toString();
          daiAmount = consume(
            await bounded(readConversion('eth', 'dai', ethMinimum, dependencies.signal), dependencies.signal)
          );
        } else {
          daiAmount = consume(
            await bounded(
              readConversion(
                request.paymentAsset === 'ETH' || request.source === 'card' ? 'eth' : 'usdt-ethereum',
                'dai',
                conversionAmount,
                dependencies.signal
              ),
              dependencies.signal
            )
          );
        }
      } catch (error) {
        return stop(
          error instanceof Error && error.message === 'conversion-impact'
            ? 'conversion-impact'
            : 'conversion-unavailable',
          error instanceof Error && error.message === 'conversion-impact'
        );
      }
    }
    result.daiAmount = daiAmount;
    result.daiIntent = daiIntent;
    try {
      const quote = await bounded((dependencies.quoteDai ?? quoteDai)(daiAmount), dependencies.signal);
      const checked = evaluateTonswapLiquidity(
        daiAmount,
        quote.amount,
        quote.amountWithoutImpact,
        dependencies.fees,
        startedAt,
        purpose
      );
      result.priceImpact = checked.impact;
      if (purpose === 'xor') result.spendableXor = checked.spendableXor;
      else result.burnableXor = checked.burnableXor;
      if (!checked.allowed)
        return stop(checked.reason ?? 'liquidity-unavailable', checked.reason !== 'fees-unavailable');
      burnable = new FPNumber((purpose === 'xor' ? checked.spendableXor : checked.burnableXor) as string);
    } catch {
      return stop('liquidity-unavailable');
    }
  }
  if (purpose === 'xor') {
    result.spendableXor = burnable.toString();
    if (!mainnet() || dependencies.signal?.aborted) return stop('mainnet');
    if ((result.expiresAt as number) <= now()) return stop('expired');
    return { ...result, state: 'ready', feasible: true };
  }
  result.burnableXor = burnable.toString();
  try {
    const { allocateTonswapBurns, quoteTonswapBurn } = await import('./tonswapBurn');
    const snapshot = await bounded(
      dependencies.snapshot
        ? dependencies.snapshot()
        : import('@/indexer/queries/tonswapBurn').then(({ fetchTonswapBurnSnapshot }) =>
            fetchTonswapBurnSnapshot({ requireFresh: true })
          ),
      dependencies.signal
    );
    if (!snapshot.fresh) return stop('campaign-unavailable');
    const allocation = allocateTonswapBurns(snapshot.burns);
    const burn = quoteTonswapBurn(allocation.totalBurned, burnable);
    result.estimatedTs = burn.reward.toString();
    result.eligibleXor = burn.eligible.toString();
    result.excessXor = burn.excess.toString();
    result.indexedThroughBlock = snapshot.indexedThroughBlock;
    if (!mainnet() || dependencies.signal?.aborted) return stop('mainnet');
    if ((result.expiresAt as number) <= now()) return stop('expired');
    if (burn.excess.gt(FPNumber.ZERO)) return stop('cap-exceeded', true);
    return { ...result, state: 'ready', feasible: true };
  } catch {
    return stop('campaign-unavailable');
  }
}

/** A public MoonPay quote contains no customer identity and is never authorization to buy. */
export interface GetTsCardQuote {
  ethAmount: string;
  totalUsd: string;
  fees: GetTsPlanFee[];
  expiresAt: number;
}

/** Preserve JSON number lexemes as strings before parsing so token values never cross IEEE-754. */
export function parseGetTsQuoteJson(text: string): unknown {
  if (text.length > 100_000) throw new Error('Oversized quote');
  let encoded = '';
  for (let index = 0; index < text.length; ) {
    if (text[index] === '"') {
      const start = index++;
      while (index < text.length) {
        if (text[index] === '\\') {
          index += 2;
          continue;
        }
        if (text[index++] === '"') break;
      }
      encoded += text.slice(start, index);
    } else if (text[index] === '-' || /[0-9]/.test(text[index])) {
      const match = text.slice(index).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if (!match) throw new Error('Invalid quote JSON');
      encoded += JSON.stringify(match[0]);
      index += match[0].length;
    } else {
      encoded += text[index++];
    }
  }
  return JSON.parse(encoded);
}

/** Official public buy_quote API: exact USD budget including provider fees, native Ethereum only. */
export async function requestGetTsCardQuote(
  amount: string,
  publicKey: string,
  signal?: AbortSignal
): Promise<GetTsCardQuote> {
  if (!isGetTsPlanAmount(amount, 'USD') || !/^pk_live_[a-zA-Z0-9]+$/.test(publicKey))
    throw new Error('Card quote unavailable');
  const url = new URL('https://api.moonpay.com/v3/currencies/eth/buy_quote');
  Object.entries({
    apiKey: publicKey,
    baseCurrencyCode: 'usd',
    baseCurrencyAmount: amount,
    areFeesIncluded: 'true',
    paymentMethod: 'credit_debit_card',
  }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { credentials: 'omit', redirect: 'error', signal });
  if (!response.ok) throw new Error('Card quote unavailable');
  const value = parseGetTsQuoteJson(await response.text()) as Record<string, unknown>;
  const crypto = value?.quoteCurrency as
    | { code?: string; metadata?: { chainId?: string; networkCode?: string; contractAddress?: string } }
    | undefined;
  if (
    value?.baseCurrencyCode !== 'usd' ||
    value?.quoteCurrencyCode !== 'eth' ||
    value?.paymentMethod !== 'credit_debit_card' ||
    crypto?.code !== 'eth' ||
    crypto.metadata?.chainId !== '1' ||
    crypto.metadata?.networkCode !== 'ethereum' ||
    crypto.metadata?.contractAddress !== '0x0000000000000000000000000000000000000000'
  )
    throw new Error('Unexpected card asset');
  const natural = (field: string): string => {
    const exact = value[field];
    if (typeof exact !== 'string' || exact.length > 60 || !/^(?:0|[1-9]\d*)(?:\.\d{1,18})?$/.test(exact))
      throw new Error('Invalid card amount');
    return exact;
  };
  const ethAmount = natural('quoteCurrencyAmount');
  const totalUsd = natural('totalAmount');
  if (!new FPNumber(ethAmount).gt(FPNumber.ZERO) || !new FPNumber(totalUsd).gt(FPNumber.ZERO))
    throw new Error('Empty card quote');
  const fees = ['feeAmount', 'extraFeeAmount', 'networkFeeAmount'].map(
    (field): GetTsPlanFee => ({ stage: 'provider', amount: natural(field), symbol: 'USD', included: true })
  );
  const sum = fees.reduce(
    (total, fee) => total.add(new FPNumber(fee.amount)),
    new FPNumber(natural('baseCurrencyAmount'))
  );
  if (!sum.eq(new FPNumber(totalUsd))) throw new Error('Inconsistent card fees');
  const expiresAt = typeof value.expiresAt === 'string' ? Date.parse(value.expiresAt) : Date.now() + GET_TS_PLAN_TTL_MS;
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error('Expired card quote');
  return { ethAmount, totalUsd, fees, expiresAt: Math.min(expiresAt, Date.now() + GET_TS_PLAN_TTL_MS) };
}
