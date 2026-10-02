import { getAddress, Interface, keccak256, toUtf8Bytes, type Signer } from 'ethers';

/** Mainnet quotes plus a narrowly checked OnchainGateway -> 1inch V6 execution path. */
/** The relay forwards only validated public quote requests; it has no wallet or transaction endpoint. */
export const TONSWAP_CONVERSION_URL = 'https://mof.sora.org/api/buy-xor/quote';
export const TONSWAP_CONVERSION_UPSTREAM_URL = 'https://api.symbiosis.finance/crosschain/v2/quote';
export const TONSWAP_CONVERSION_APP_URL = 'https://app.symbiosis.finance/swap';
export const TONSWAP_CONVERSION_TTL_MS = 30_000;
export const TONSWAP_CONVERSION_SLIPPAGE_BPS = 100;
/** Twice the existing Hashi ERC-20 transfer (53k) plus approval (45k) gas baselines. */
const TONSWAP_BRIDGE_GAS_RESERVE = 196_000n;

/** Retains ETH for the later DAI approval/bridge at current fee data; future fees can still change. */
export function estimateTonswapBridgeGasReserve(gasPrice: bigint | null): bigint {
  if (typeof gasPrice !== 'bigint' || gasPrice <= 0n) throw new TonswapConversionError('INSUFFICIENT_GAS');
  return TONSWAP_BRIDGE_GAS_RESERVE * gasPrice;
}

export type TonswapConversionSource = 'eth' | 'usdt-ethereum' | 'usdt-ton';
export type TonswapConversionTarget = 'eth' | 'dai';
export type TonswapConversionErrorCode =
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'NO_ROUTE'
  | 'UNAVAILABLE'
  | 'ABORTED'
  | 'EXPIRED'
  | 'EXECUTION_UNAVAILABLE'
  | 'WALLET_MISMATCH'
  | 'INSUFFICIENT_GAS'
  | 'TRANSACTION_FAILED';

/** Stable codes allow the UI to supply translated messages without displaying provider errors. */
export class TonswapConversionError extends Error {
  constructor(public readonly code: TonswapConversionErrorCode) {
    super(code);
    this.name = 'TonswapConversionError';
  }
}

export interface TonswapConversionRequest {
  source: TonswapConversionSource;
  target: TonswapConversionTarget;
  /** Exact natural units, for example "12.50" USDT. */
  amount: string;
  fromAddress: string;
  toAddress: string;
}

interface ConversionToken {
  address: string;
  chainId: number;
  decimals: number;
  symbol: string;
  attributes?: { ton: string };
}

const TOKENS: Readonly<Record<TonswapConversionSource | 'dai', ConversionToken>> = {
  eth: { address: '', chainId: 1, decimals: 18, symbol: 'ETH' },
  'usdt-ethereum': {
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 1,
    decimals: 6,
    symbol: 'USDT',
  },
  'usdt-ton': {
    address: '0x9328Eb759596C38a25f59028B146Fecdc3621Dfe',
    chainId: 85918,
    decimals: 6,
    symbol: 'USDT',
    attributes: { ton: 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs' },
  },
  dai: { address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', chainId: 1, decimals: 18, symbol: 'DAI' },
};

export interface TonswapConversionFee {
  amount: string;
  decimals: number;
  symbol: string;
  address: string;
  chainId: number;
}

export type TonswapConversionTransaction =
  | { type: 'evm'; chainId: 1; to: string; data: string; value: string }
  | { type: 'ton'; validUntil: number; messages: { address: string; amount: string; payload: string }[] };

export interface TonswapConversionQuote {
  request: TonswapConversionRequest;
  inputAmount: string;
  outputAmount: string;
  minOutputAmount: string;
  outputDecimals: number;
  priceImpactPercent: string;
  fees: TonswapConversionFee[];
  /** EVM tx.value or sum of native TON message attachments; excludes wallet network fees. */
  nativeValue: string;
  /** EVM native fee above ETH input, or native TON attachment; never a total-cost estimate. */
  nativeFee: string;
  quotedAt: number;
  expiresAt: number;
  /** Structurally checked provider data, NOT authorization to sign. Never persist or reuse. */
  transaction: TonswapConversionTransaction;
  approveTo: string | null;
  executionEnabled: boolean;
  executionReason: 'CONTRACT_VERIFICATION_REQUIRED' | null;
}

export interface TonswapConversionWallets {
  /** The UI invalidates this when amount/source changes, it unmounts, or its downstream liquidity check expires. */
  canContinue?: () => boolean;
  evm?: {
    getSigner: () => Promise<Signer>;
  };
  ton?: {
    getAddress: () => Promise<string>;
    getChain: () => Promise<'-239' | '-3'>;
    sendTransaction: (transaction: Extract<TonswapConversionTransaction, { type: 'ton' }>) => Promise<string>;
  };
}

const UINT256_MAX = (1n << 256n) - 1n;
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const MAX_EVM_NATIVE_FEE = 10_000_000_000_000_000n; // 0.01 ETH ceiling, not a quoted fee.
const MAX_TON_ATTACHMENT = 1_000_000_000n; // 1 TON ceiling, not an amount the user should pay.

/** Addresses and runtime hashes verified against mainnet and verified source on 2026-09-25; see conversion-integration.md. */
export const TONSWAP_CONVERSION_CONTRACTS = {
  gateway: '0xE7e68D336F90f98D22A479253eafA5f2424aCaD8',
  executor: '0x7C84fC7b4EebdFE96339Fd89eF5eeA24cECf20b9',
  router: '0x111111125421cA6dc452d289314280a0f8842A65',
  aggregationExecutor: '0x111116053F09d34a7Eae8102887004445176CA11',
} as const;
const CONTRACT_CODE_HASHES = [
  [TONSWAP_CONVERSION_CONTRACTS.gateway, '0xa5609ff7a3eab8c2666b7b96c52e7e23313f539878fb07852345cf77e5d713b7'],
  [TONSWAP_CONVERSION_CONTRACTS.executor, '0x7160c4e2796198a25f2c8d7e459972da04307f42b4e40d34999f589ce7556695'],
  [TONSWAP_CONVERSION_CONTRACTS.router, '0xa5a286be4b80006cc547d7e899871aa01a0e0551e2a509233375405f92098c2f'],
  [
    TONSWAP_CONVERSION_CONTRACTS.aggregationExecutor,
    '0x17060e8cd05749bed98f4810852c270ee5458a4f0761f1b0a15bc4730babe18f',
  ],
] as const;
const GATEWAY_ABI = new Interface([
  'function onswap(address token,uint256 amount,address dex,address dexgateway,bytes calldata_)',
  'function fee() view returns (uint256)',
  'function onchainExecutorDontApprove() view returns (address)',
]);
const ROUTER_ABI = new Interface([
  'function swap(address executor,(address srcToken,address dstToken,address srcReceiver,address dstReceiver,uint256 amount,uint256 minReturnAmount,uint256 flags) desc,bytes data) payable returns(uint256 returnAmount,uint256 spentAmount)',
]);
const ERC20_ABI = new Interface([
  'function allowance(address owner,address spender) view returns (uint256)',
  'function approve(address spender,uint256 amount) returns (bool)',
]);
const DISABLED_EVM_PROVIDERS = 'open-ocean,kyber-swap,0x,bitget,uni-v4,uni-v2,uni-v3,izumi';
const issuedQuotes = new Set<string>();
const executingQuotes = new Set<string>();

/** Case-insensitive equality after the surrounding address fields have passed syntax validation. */
function sameAddress(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

/** Decodes both call layers and returns the actual contract-enforced minimum, or disables an unfamiliar route. */
function executableMinimum(quote: TonswapConversionQuote): string | null {
  if (quote.transaction.type !== 'evm' || quote.request.target !== 'dai' || quote.request.source === 'usdt-ton')
    return null;
  try {
    const { transaction: tx, request, inputAmount, nativeFee } = quote;
    const native = request.source === 'eth';
    if (
      !sameAddress(tx.to, TONSWAP_CONVERSION_CONTRACTS.gateway) ||
      (!native && !sameAddress(quote.approveTo ?? '', TONSWAP_CONVERSION_CONTRACTS.gateway))
    )
      return null;
    const outer = GATEWAY_ABI.decodeFunctionData('onswap', tx.data);
    if (GATEWAY_ABI.encodeFunctionData('onswap', outer).toLowerCase() !== tx.data.toLowerCase()) return null;
    if (
      !sameAddress(outer.token, native ? ZERO_ADDRESS : TOKENS['usdt-ethereum'].address) ||
      outer.amount !== (native ? BigInt(inputAmount) - BigInt(nativeFee) : BigInt(inputAmount)) ||
      !sameAddress(outer.dex, TONSWAP_CONVERSION_CONTRACTS.router) ||
      !sameAddress(outer.dexgateway, native ? ZERO_ADDRESS : TONSWAP_CONVERSION_CONTRACTS.router)
    )
      return null;
    const inner = ROUTER_ABI.decodeFunctionData('swap', outer.calldata_);
    const canonicalInner = ROUTER_ABI.encodeFunctionData('swap', inner).toLowerCase();
    // Captured Symbiosis 1inch calls append this four-byte attribution suffix after ABI data.
    if (![canonicalInner, canonicalInner + '3d2f69a4'].includes(outer.calldata_.toLowerCase())) return null;
    const desc = inner.desc;
    if (
      !sameAddress(inner.executor, TONSWAP_CONVERSION_CONTRACTS.aggregationExecutor) ||
      !sameAddress(desc.srcReceiver, TONSWAP_CONVERSION_CONTRACTS.aggregationExecutor) ||
      !sameAddress(
        desc.srcToken,
        native ? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' : TOKENS['usdt-ethereum'].address
      ) ||
      !sameAddress(desc.dstToken, TOKENS.dai.address) ||
      !sameAddress(desc.dstReceiver, request.toAddress) ||
      desc.amount !== BigInt(inputAmount) ||
      desc.flags !== 0n ||
      desc.minReturnAmount <= 0n ||
      desc.minReturnAmount > BigInt(quote.outputAmount) ||
      desc.minReturnAmount * 10_000n < BigInt(quote.outputAmount) * 9_800n
    )
      return null;
    return desc.minReturnAmount.toString();
  } catch {
    return null;
  }
}

/** Binds execution to an unmodified, freshly issued quote, including through a Vue reactive proxy. */
function quoteFingerprint(quote: TonswapConversionQuote): string {
  return keccak256(toUtf8Bytes(JSON.stringify(quote)));
}

/** Rejects non-record provider responses before field access. */
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TonswapConversionError('INVALID_RESPONSE');
  return value as Record<string, unknown>;
}

/** Parses bounded codec integers without floating-point conversion. */
function codec(value: unknown, positive = false): bigint {
  if (typeof value !== 'string' || value.length > 78 || !/^(0|[1-9]\d*)$/.test(value)) {
    throw new TonswapConversionError('INVALID_RESPONSE');
  }
  const parsed = BigInt(value);
  if (parsed > UINT256_MAX || (positive && parsed === 0n)) throw new TonswapConversionError('INVALID_RESPONSE');
  return parsed;
}

/** Converts a positive natural amount to codec units exactly and rejects excess precision. */
export function tonswapConversionAmountToCodec(amount: string, decimals: number): string {
  if (
    typeof amount !== 'string' ||
    amount.length > 98 ||
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 18 ||
    !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount)
  )
    throw new TonswapConversionError('INVALID_REQUEST');
  const [whole, fraction = ''] = amount.split('.');
  if (fraction.length > decimals) throw new TonswapConversionError('INVALID_REQUEST');
  const units = BigInt(whole + fraction.padEnd(decimals, '0'));
  if (units <= 0n || units > UINT256_MAX) throw new TonswapConversionError('INVALID_REQUEST');
  return units.toString();
}

/** Checks EVM syntax/checksum and rejects the burn address. */
function evmAddress(value: unknown, code: TonswapConversionErrorCode): string {
  try {
    if (typeof value !== 'string' || value.toLowerCase() === ZERO_ADDRESS) throw new Error();
    return getAddress(value);
  } catch {
    throw new TonswapConversionError(code);
  }
}

/** Checks friendly TON checksum/mainnet flag, or a raw basechain address supplied by TON Connect. */
function tonAddress(value: unknown, code: TonswapConversionErrorCode): string {
  if (typeof value !== 'string') throw new TonswapConversionError(code);
  if (/^0:[a-fA-F0-9]{64}$/.test(value) && !/^0:0{64}$/.test(value)) return value;
  if (!/^[A-Za-z0-9_-]{48}$/.test(value)) throw new TonswapConversionError(code);
  const bytes = Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
  if ((bytes[0] !== 0x11 && bytes[0] !== 0x51) || bytes[1] !== 0) throw new TonswapConversionError(code);
  let crc = 0;
  for (const byte of bytes.slice(0, 34)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff;
  }
  if (bytes[34] !== crc >> 8 || bytes[35] !== (crc & 0xff)) throw new TonswapConversionError(code);
  return value;
}

/** Copies only supported request fields and binds refunds to the Ethereum destination wallet. */
function validateRequest(input: TonswapConversionRequest): TonswapConversionRequest {
  if (
    !input ||
    !['eth', 'usdt-ethereum', 'usdt-ton'].includes(input.source) ||
    !['eth', 'dai'].includes(input.target) ||
    (input.source === 'eth' && input.target === 'eth')
  ) {
    throw new TonswapConversionError('INVALID_REQUEST');
  }
  tonswapConversionAmountToCodec(input.amount, TOKENS[input.source].decimals);
  return {
    source: input.source,
    target: input.target,
    amount: input.amount,
    fromAddress:
      input.source === 'usdt-ton'
        ? tonAddress(input.fromAddress, 'INVALID_REQUEST')
        : evmAddress(input.fromAddress, 'INVALID_REQUEST'),
    toAddress: evmAddress(input.toAddress, 'INVALID_REQUEST'),
  };
}

/** Checks output identity using network/address/precision, never its untrusted symbol. */
function outputAmount(value: unknown, token: ConversionToken): string {
  const item = record(value);
  if (
    item.chainId !== token.chainId ||
    item.decimals !== token.decimals ||
    typeof item.address !== 'string' ||
    item.address.toLowerCase() !== token.address.toLowerCase()
  ) {
    throw new TonswapConversionError('INVALID_RESPONSE');
  }
  return codec(item.amount, true).toString();
}

/** Keeps fee metadata bounded and exposes its network/asset identity alongside its amount. */
function parseFees(value: unknown): TonswapConversionFee[] {
  if (!Array.isArray(value) || value.length > 20) throw new TonswapConversionError('INVALID_RESPONSE');
  return value.map((entry) => {
    const fee = record(record(entry).value);
    if (
      typeof fee.decimals !== 'number' ||
      !Number.isInteger(fee.decimals) ||
      fee.decimals < 0 ||
      fee.decimals > 36 ||
      typeof fee.chainId !== 'number' ||
      !Number.isSafeInteger(fee.chainId) ||
      fee.chainId <= 0 ||
      typeof fee.symbol !== 'string' ||
      !/^[A-Za-z0-9._-]{1,16}$/.test(fee.symbol) ||
      typeof fee.address !== 'string' ||
      !/^(?:|0x[a-fA-F0-9]{40})$/.test(fee.address)
    ) {
      throw new TonswapConversionError('INVALID_RESPONSE');
    }
    return {
      amount: codec(fee.amount).toString(),
      decimals: fee.decimals,
      symbol: fee.symbol,
      address: fee.address,
      chainId: fee.chainId,
    };
  });
}

/** Structurally checks unsigned data; contract provenance and nested recipients remain unverified. */
function parseTransaction(
  value: unknown,
  request: TonswapConversionRequest,
  inputAmount: string,
  fees: TonswapConversionFee[],
  quotedAt: number
): Pick<TonswapConversionQuote, 'transaction' | 'nativeValue' | 'nativeFee'> {
  const tx = record(value);
  if (request.source === 'usdt-ton') {
    if (
      typeof tx.validUntil !== 'number' ||
      !Number.isSafeInteger(tx.validUntil) ||
      tx.validUntil * 1000 <= quotedAt ||
      !Array.isArray(tx.messages) ||
      tx.messages.length < 1 ||
      tx.messages.length > 4
    ) {
      throw new TonswapConversionError('INVALID_RESPONSE');
    }
    const messages = tx.messages.map((value) => {
      const message = record(value);
      if (
        typeof message.payload !== 'string' ||
        message.payload.length > 100_000 ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(message.payload)
      )
        throw new TonswapConversionError('INVALID_RESPONSE');
      return {
        address: tonAddress(message.address, 'INVALID_RESPONSE'),
        amount: codec(message.amount, true).toString(),
        payload: message.payload,
      };
    });
    const attachment = messages.reduce((sum, message) => sum + BigInt(message.amount), 0n);
    if (attachment > MAX_TON_ATTACHMENT) throw new TonswapConversionError('INVALID_RESPONSE');
    return {
      transaction: { type: 'ton', validUntil: tx.validUntil, messages },
      nativeValue: attachment.toString(),
      nativeFee: attachment.toString(),
    };
  }
  if (
    tx.chainId !== 1 ||
    typeof tx.data !== 'string' ||
    tx.data.length > 200_000 ||
    !/^0x[0-9a-fA-F]{8}(?:[0-9a-fA-F]{2})*$/.test(tx.data)
  )
    throw new TonswapConversionError('INVALID_RESPONSE');
  const nativeInput = request.source === 'eth' ? BigInt(inputAmount) : 0n;
  const nativeFee = fees
    .filter((fee) => fee.chainId === 1 && fee.address === '' && fee.decimals === 18)
    .reduce((sum, fee) => sum + BigInt(fee.amount), 0n);
  const valueAmount = codec(tx.value);
  if (nativeFee > MAX_EVM_NATIVE_FEE || valueAmount !== nativeInput + nativeFee) {
    throw new TonswapConversionError('INVALID_RESPONSE');
  }
  return {
    transaction: {
      type: 'evm',
      chainId: 1,
      to: evmAddress(tx.to, 'INVALID_RESPONSE'),
      data: tx.data,
      value: valueAmount.toString(),
    },
    nativeValue: valueAmount.toString(),
    nativeFee: nativeFee.toString(),
  };
}

/** Retrieves a fresh mainnet quote without creating an order, requesting approval, or invoking a wallet. */
export async function requestTonswapConversionQuote(
  input: TonswapConversionRequest,
  options: { fetch?: typeof fetch; now?: () => number; signal?: AbortSignal } = {}
): Promise<TonswapConversionQuote> {
  const request = validateRequest(input);
  const now = options.now ?? Date.now;
  const quotedAt = now();
  if (!Number.isSafeInteger(quotedAt) || quotedAt < 0) throw new TonswapConversionError('INVALID_REQUEST');
  const inputToken = TOKENS[request.source];
  const targetToken = TOKENS[request.target];
  const inputAmount = tonswapConversionAmountToCodec(request.amount, inputToken.decimals);
  let response: Response;
  try {
    response = await (options.fetch ?? fetch)(TONSWAP_CONVERSION_URL, {
      method: 'POST',
      credentials: 'omit',
      redirect: 'error',
      signal: options.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tokenAmountIn: { ...inputToken, amount: inputAmount },
        tokenOut: targetToken,
        from: request.fromAddress,
        to: request.toAddress,
        fallbackReceiver: request.toAddress,
        slippage: TONSWAP_CONVERSION_SLIPPAGE_BPS,
        ...(request.source === 'usdt-ton' ? {} : { disabledProviders: DISABLED_EVM_PROVIDERS }),
      }),
    });
  } catch {
    throw new TonswapConversionError(options.signal?.aborted ? 'ABORTED' : 'UNAVAILABLE');
  }
  if (!response.ok) throw new TonswapConversionError(response.status === 400 ? 'NO_ROUTE' : 'UNAVAILABLE');
  let raw: Record<string, unknown>;
  try {
    const body = await response.text();
    if (body.length > 250_000) throw new Error();
    raw = record(JSON.parse(body));
  } catch {
    throw new TonswapConversionError('INVALID_RESPONSE');
  }
  const receivedAt = now();
  if (
    !Number.isSafeInteger(receivedAt) ||
    receivedAt < quotedAt ||
    receivedAt >= quotedAt + TONSWAP_CONVERSION_TTL_MS
  ) {
    throw new TonswapConversionError('EXPIRED');
  }
  if (
    raw.type !== (request.source === 'usdt-ton' ? 'ton' : 'evm') ||
    raw.kind !== (request.source === 'usdt-ton' ? 'crosschain-swap' : 'onchain-swap')
  ) {
    throw new TonswapConversionError('INVALID_RESPONSE');
  }
  const output = outputAmount(raw.tokenAmountOut, targetToken);
  const minimum = outputAmount(raw.tokenAmountOutMin, targetToken);
  if (BigInt(minimum) > BigInt(output) || BigInt(minimum) * 10_000n < BigInt(output) * 9_800n) {
    throw new TonswapConversionError('INVALID_RESPONSE');
  }
  const impact = raw.priceImpact;
  if (typeof impact !== 'string' || !/^-?\d{1,3}(?:\.\d{1,18})?$/.test(impact)) {
    throw new TonswapConversionError('INVALID_RESPONSE');
  }
  const fees = parseFees(raw.fees);
  const transaction = parseTransaction(raw.tx, request, inputAmount, fees, quotedAt);
  const approveTo =
    request.source === 'usdt-ton' || request.source === 'eth' ? null : evmAddress(raw.approveTo, 'INVALID_RESPONSE');
  const quote: TonswapConversionQuote = {
    request,
    inputAmount,
    outputAmount: output,
    minOutputAmount: minimum,
    outputDecimals: targetToken.decimals,
    priceImpactPercent: impact,
    fees,
    quotedAt,
    expiresAt: Math.min(
      quotedAt + TONSWAP_CONVERSION_TTL_MS,
      transaction.transaction.type === 'ton' ? transaction.transaction.validUntil * 1000 : Infinity
    ),
    ...transaction,
    approveTo,
    executionEnabled: false,
    executionReason: 'CONTRACT_VERIFICATION_REQUIRED',
  };
  const enforcedMinimum = executableMinimum(quote);
  if (enforcedMinimum !== null) {
    quote.minOutputAmount = enforcedMinimum;
    quote.executionEnabled = true;
    quote.executionReason = null;
  }
  if (issuedQuotes.size >= 32) issuedQuotes.delete(issuedQuotes.values().next().value!);
  issuedQuotes.add(quoteFingerprint(quote));
  return quote;
}

/** Checks local freshness; provider TON validUntil can be days away and cannot replace the 30-second limit. */
export function isTonswapConversionQuoteFresh(quote: TonswapConversionQuote, now = Date.now()): boolean {
  return (
    Number.isSafeInteger(now) &&
    Number.isSafeInteger(quote.quotedAt) &&
    Number.isSafeInteger(quote.expiresAt) &&
    now >= quote.quotedAt &&
    now < quote.expiresAt &&
    quote.expiresAt <= quote.quotedAt + TONSWAP_CONVERSION_TTL_MS
  );
}

/** Verifies the current execution path for a read-only funding review; never obtains a signer or sends. */
export async function verifyTonswapConversionReadiness(
  quote: TonswapConversionQuote,
  provider: Pick<NonNullable<Signer['provider']>, 'getNetwork' | 'getCode' | 'call'>,
  isCurrent: () => boolean = () => true,
  now: () => number = Date.now
): Promise<void> {
  const fingerprint = quoteFingerprint(quote);
  const valid = () =>
    isCurrent() &&
    isTonswapConversionQuoteFresh(quote, now()) &&
    issuedQuotes.has(fingerprint) &&
    quoteFingerprint(quote) === fingerprint &&
    quote.executionEnabled &&
    quote.transaction.type === 'evm' &&
    executableMinimum(quote) === quote.minOutputAmount;
  if (!valid()) throw new TonswapConversionError('EXECUTION_UNAVAILABLE');
  const [network, codes, fee, executor] = await Promise.all([
    provider.getNetwork(),
    Promise.all(
      CONTRACT_CODE_HASHES.map(async ([address, hash]) => keccak256(await provider.getCode(address)) === hash)
    ),
    provider.call({ to: TONSWAP_CONVERSION_CONTRACTS.gateway, data: GATEWAY_ABI.encodeFunctionData('fee') }),
    provider.call({
      to: TONSWAP_CONVERSION_CONTRACTS.gateway,
      data: GATEWAY_ABI.encodeFunctionData('onchainExecutorDontApprove'),
    }),
  ]);
  if (
    !valid() ||
    network.chainId !== 1n ||
    codes.some((matches) => !matches) ||
    GATEWAY_ABI.decodeFunctionResult('fee', fee)[0] !== BigInt(quote.nativeFee) ||
    !sameAddress(
      GATEWAY_ABI.decodeFunctionResult('onchainExecutorDontApprove', executor)[0],
      TONSWAP_CONVERSION_CONTRACTS.executor
    )
  )
    throw new TonswapConversionError('EXECUTION_UNAVAILABLE');
}

/**
 * Called only after an explicit user action. Checks fresh quote, connected account/mainnet,
 * all four runtime hashes, gateway fee, exact USDT allowance and both calldata layers before sending.
 * TON remains unavailable until its jetton message semantics have an equivalent verifier.
 */
export async function executeTonswapConversionQuote(
  quote: TonswapConversionQuote,
  wallets: TonswapConversionWallets,
  clock: (() => number) | number = Date.now
): Promise<string> {
  const now = typeof clock === 'function' ? clock : () => clock;
  const fingerprint = quoteFingerprint(quote);
  if (!isTonswapConversionQuoteFresh(quote, now())) throw new TonswapConversionError('EXPIRED');
  if (
    !issuedQuotes.has(fingerprint) ||
    executingQuotes.has(fingerprint) ||
    !quote.executionEnabled ||
    executableMinimum(quote) !== quote.minOutputAmount ||
    !wallets.evm ||
    quote.transaction.type !== 'evm'
  ) {
    throw new TonswapConversionError('EXECUTION_UNAVAILABLE');
  }
  executingQuotes.add(fingerprint);
  try {
    let signer = await wallets.evm.getSigner();
    const provider = signer.provider;
    if (!provider) throw new TonswapConversionError('WALLET_MISMATCH');
    /** Rechecks wallet state and freshness around every asynchronous approval boundary. */
    const checkWallet = async () => {
      if (wallets.canContinue && !wallets.canContinue()) throw new TonswapConversionError('EXPIRED');
      if (!isTonswapConversionQuoteFresh(quote, now())) throw new TonswapConversionError('EXPIRED');
      const currentSigner = await wallets.evm!.getSigner();
      if (!currentSigner.provider) throw new TonswapConversionError('WALLET_MISMATCH');
      const [address, network] = await Promise.all([currentSigner.getAddress(), currentSigner.provider.getNetwork()]);
      if (!isTonswapConversionQuoteFresh(quote, now())) throw new TonswapConversionError('EXPIRED');
      if (wallets.canContinue && !wallets.canContinue()) throw new TonswapConversionError('EXPIRED');
      if (quoteFingerprint(quote) !== fingerprint) throw new TonswapConversionError('EXECUTION_UNAVAILABLE');
      if (!sameAddress(address, quote.request.fromAddress) || network.chainId !== 1n) {
        throw new TonswapConversionError('WALLET_MISMATCH');
      }
      signer = currentSigner;
    };
    await checkWallet();
    const codes = await Promise.all(
      CONTRACT_CODE_HASHES.map(async ([address, hash]) => keccak256(await provider.getCode(address)) === hash)
    );
    if (codes.some((matches) => !matches)) throw new TonswapConversionError('EXECUTION_UNAVAILABLE');
    /** A mutable fee is read again before sending so it cannot silently reduce native input. */
    const checkGateway = async () => {
      const [fee, executor] = await Promise.all([
        provider.call({ to: TONSWAP_CONVERSION_CONTRACTS.gateway, data: GATEWAY_ABI.encodeFunctionData('fee') }),
        provider.call({
          to: TONSWAP_CONVERSION_CONTRACTS.gateway,
          data: GATEWAY_ABI.encodeFunctionData('onchainExecutorDontApprove'),
        }),
      ]);
      if (
        GATEWAY_ABI.decodeFunctionResult('fee', fee)[0] !== BigInt(quote.nativeFee) ||
        !sameAddress(
          GATEWAY_ABI.decodeFunctionResult('onchainExecutorDontApprove', executor)[0],
          TONSWAP_CONVERSION_CONTRACTS.executor
        )
      )
        throw new TonswapConversionError('EXECUTION_UNAVAILABLE');
    };
    await checkGateway();
    if (quote.request.source === 'usdt-ethereum') {
      const token = TOKENS['usdt-ethereum'].address;
      const allowanceData = ERC20_ABI.encodeFunctionData('allowance', [quote.request.fromAddress, quote.approveTo]);
      const allowance = ERC20_ABI.decodeFunctionResult(
        'allowance',
        await provider.call({ to: token, data: allowanceData })
      )[0];
      if (allowance !== BigInt(quote.inputAmount)) {
        const amounts = allowance === 0n ? [BigInt(quote.inputAmount)] : [0n, BigInt(quote.inputAmount)];
        for (const amount of amounts) {
          await checkWallet();
          const approval = await signer.sendTransaction({
            chainId: 1,
            to: token,
            value: 0n,
            data: ERC20_ABI.encodeFunctionData('approve', [quote.approveTo, amount]),
          });
          const receipt = await approval.wait(1);
          if (!receipt || receipt.status !== 1) throw new TonswapConversionError('TRANSACTION_FAILED');
          await checkWallet();
        }
      }
      const confirmedAllowance = ERC20_ABI.decodeFunctionResult(
        'allowance',
        await provider.call({ to: token, data: allowanceData })
      )[0];
      if (confirmedAllowance !== BigInt(quote.inputAmount)) throw new TonswapConversionError('TRANSACTION_FAILED');
    }
    await checkGateway();
    await checkWallet();
    if (quoteFingerprint(quote) !== fingerprint) throw new TonswapConversionError('EXECUTION_UNAVAILABLE');
    const tx = quote.transaction;
    const transaction = { chainId: 1, to: tx.to, data: tx.data, value: BigInt(tx.value) };
    const [gas, feeData, balance] = await Promise.all([
      signer.estimateGas(transaction),
      provider.getFeeData(),
      provider.getBalance(quote.request.fromAddress),
    ]);
    const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
    const bridgeReserve = estimateTonswapBridgeGasReserve(gasPrice);
    // Round the conversion's 25% estimation margin upward and preserve the later bridge reserve.
    const conversionGas = (gas * 125n + 99n) / 100n;
    if (gas <= 0n || balance < transaction.value + conversionGas * gasPrice + bridgeReserve) {
      throw new TonswapConversionError('INSUFFICIENT_GAS');
    }
    await checkWallet();
    issuedQuotes.delete(fingerprint);
    const sent = await signer.sendTransaction(transaction);
    return sent.hash;
  } catch (error) {
    if (error instanceof TonswapConversionError) throw error;
    if (error && typeof error === 'object' && 'code' in error && error.code === 'INSUFFICIENT_FUNDS') {
      throw new TonswapConversionError('INSUFFICIENT_GAS');
    }
    throw new TonswapConversionError('TRANSACTION_FAILED');
  } finally {
    executingQuotes.delete(fingerprint);
  }
}
