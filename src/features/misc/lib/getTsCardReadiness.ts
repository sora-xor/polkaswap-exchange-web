import { FPNumber } from '@sora-substrate/sdk';
import { decodeAddress } from '@polkadot/util-crypto';
import { getAddress, Interface, type BrowserProvider } from 'ethers';
import type { GetTsPurpose } from './getTsFlow';
import {
  requestGetTsCardQuote,
  requestGetTsPlanPreview,
  isGetTsPlanAmount,
  type GetTsCardQuote,
  type GetTsPlanDependencies,
  type GetTsPlanPreviewResult,
} from './getTsPlanQuote';
import {
  estimateTonswapBridgeGasReserve,
  isTonswapConversionQuoteFresh,
  requestTonswapConversionQuote,
  verifyTonswapConversionReadiness,
  TONSWAP_CONVERSION_CONTRACTS,
  type TonswapConversionQuote,
  type TonswapConversionRequest,
} from './tonswapConversion';
import { isSwapPriceImpactAllowed } from '@/features/swap/services/priceImpactLimit';

export const GET_TS_CARD_REVIEW_TTL_MS = 30_000;
export const GET_TS_HASHI_DAI_BRIDGE = '0x313416870a4da6f12505a550b67bb73c8e21d5d3';
export const GET_TS_CARD_DAI = '0x6b175474e89094c44da98b954eedeac495271d0f';
/** Read-only simulation endpoint; it never receives keys, signatures, card details or provider orders. */
const SIMULATION_RPC = 'https://ethereum-rpc.publicnode.com';
const bridgeAbi = new Interface(['function sendERC20ToSidechain(bytes32 to,uint256 amount,address tokenAddress)']);
const tokenAbi = new Interface(['function approve(address spender,uint256 amount) returns(bool)']);
const gatewayAbi = new Interface(['function fee() view returns (uint256)']);
type ReadProvider = Pick<BrowserProvider, 'send' | 'getNetwork' | 'getFeeData' | 'getBalance' | 'getCode' | 'call'>;
export type GetTsCardReadinessReason =
  | 'wallet'
  | 'budget'
  | 'provider'
  | 'gas'
  | 'simulation'
  | 'bridge'
  | 'conversion'
  | 'liquidity'
  | 'expired';
/** Ephemeral estimates only: no address, calldata, quote or completion flag belongs in saved plans. */
export interface GetTsCardReadiness {
  allowed: boolean;
  amount: string;
  expiresAt: number;
  reason?: GetTsCardReadinessReason;
  deliveredEth?: string;
  existingEth?: string;
  conversionEth?: string;
  conversionGasReserve?: string;
  bridgeGasReserve?: string;
  ethereumGasReserve?: string;
  conversionProviderFee?: string;
  bridgeDaiFee?: string;
  daiAmount?: string;
  nativeFeeReserve?: string;
  spendableXor?: string;
  burnableXor?: string;
  estimatedTs?: string;
  priceImpact?: string;
  providerFeeUsd?: string;
  bridgeEstimate?: 'simulated' | 'reserve';
}
export interface GetTsCardReadinessRequest {
  amount: string;
  account: string;
  soraAccount: string;
  purpose?: GetTsPurpose;
  publicKey: string;
}
export interface GetTsCardReadinessDependencies {
  provider: ReadProvider;
  isCurrent: () => boolean;
  /** Checks current SORA mainnet, initialized Hashi, canonical DAI registry and exact bridge address. */
  bridgeReady: () => Promise<boolean>;
  plan: GetTsPlanDependencies;
  signal?: AbortSignal;
  now?: () => number;
  cardQuote?: typeof requestGetTsCardQuote;
  conversionQuote?: (request: TonswapConversionRequest, signal?: AbortSignal) => Promise<TonswapConversionQuote>;
  verifyConversion?: typeof verifyTonswapConversionReadiness;
  estimateConversion?: (quote: TonswapConversionQuote, fundedBalance: bigint) => Promise<bigint>;
  estimateBridge?: (
    quote: TonswapConversionQuote,
    fundedBalance: bigint,
    soraAccount: string
  ) => Promise<bigint | null>;
  preview?: typeof requestGetTsPlanPreview;
}
/** RPC quantities are bounded unsigned integers; unknown/zero gas is never a free transaction. */
function quantity(value: unknown): bigint {
  if (typeof value !== 'string' || !/^0x[0-9a-f]{1,64}$/i.test(value)) throw new Error('Invalid quantity');
  return BigInt(value);
}
const hex = (value: bigint): string => `0x${value.toString(16)}`;
const natural = (value: bigint): string => FPNumber.fromCodecValue(value.toString(), 18).toString();
/** Rounds the simulation upward before doubling, avoiding repeated input changes for a few calldata gas units. */
function gasReserve(gas: bigint, gasPrice: bigint): bigint {
  return ((gas + 9_999n) / 10_000n) * 10_000n * 2n * gasPrice;
}

/** Bounded public reads validate the selected provider's canonical block before simulating any calldata. */
async function simulationRpc(
  provider: ReadProvider,
  signal: AbortSignal
): Promise<(method: string, params: unknown[]) => Promise<unknown>> {
  const rpc = async (method: string, params: unknown[]): Promise<unknown> => {
    const response = await fetch(SIMULATION_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      redirect: 'error',
      signal,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    if (!response.ok) throw new Error('Simulation unavailable');
    const text = await response.text();
    if (text.length > 1_000_000) throw new Error('Oversized simulation');
    const body = JSON.parse(text);
    if (body.error) throw Object.assign(new Error('Simulation unavailable'), { code: body.error.code });
    if (body.jsonrpc !== '2.0' || body.id !== 1 || !Object.prototype.hasOwnProperty.call(body, 'result'))
      throw new Error('Invalid simulation');
    return body.result;
  };
  const [network, block] = await Promise.all([rpc('eth_chainId', []), rpc('eth_getBlockByNumber', ['latest', false])]);
  if (network !== '0x1' || !block || typeof block !== 'object') throw new Error('Simulation network');
  const head = block as { number?: unknown; hash?: unknown; timestamp?: unknown };
  quantity(head.number);
  if (typeof head.hash !== 'string' || !/^0x[0-9a-f]{64}$/i.test(head.hash)) throw new Error('Simulation block');
  const timestamp = quantity(head.timestamp);
  const seconds = BigInt(Math.floor(Date.now() / 1000));
  if (timestamp > seconds + 60n || timestamp < seconds - 180n) throw new Error('Stale simulation');
  const canonical = await provider.send('eth_getBlockByNumber', [head.number, false]);
  if (canonical?.hash?.toLowerCase() !== head.hash.toLowerCase()) throw new Error('Simulation fork');
  return (method, params) =>
    rpc(method, method === 'eth_estimateGas' ? [params[0], head.number, params[1]] : [...params, head.number]);
}

/** Exact current ETH→DAI calldata with only an ephemeral sender ETH balance override. */
export async function estimateGetTsCardConversionGas(
  provider: ReadProvider,
  quote: TonswapConversionQuote,
  fundedBalance: bigint,
  signal: AbortSignal
): Promise<bigint> {
  if (quote.transaction.type !== 'evm') throw new Error('Unsupported simulation');
  const tx = quote.transaction;
  const transaction = { from: quote.request.fromAddress, to: tx.to, data: tx.data, value: hex(BigInt(tx.value)) };
  const overrides = { [quote.request.fromAddress]: { balance: hex(fundedBalance) } };
  let value: unknown;
  try {
    value = await provider.send('eth_estimateGas', [transaction, 'latest', overrides]);
  } catch {
    // Some wallets do not forward state overrides. This narrow public read is checked against that wallet's chain.
    const read = await simulationRpc(provider, signal);
    value = await read('eth_estimateGas', [transaction, overrides]);
  }
  const gas = quantity(value);
  if (gas < 21_000n || gas > 2_000_000n) throw new Error('Invalid conversion gas');
  return gas;
}

/** Exact ordered conversion, DAI approval and Hashi transfer; never overwrites token storage or sends transactions. */
export async function estimateGetTsCardBridgeGas(
  provider: ReadProvider,
  quote: TonswapConversionQuote,
  fundedBalance: bigint,
  soraAccount: string,
  signal: AbortSignal
): Promise<bigint | null> {
  if (quote.transaction.type !== 'evm') throw new Error('Unsupported simulation');
  const recipient = decodeAddress(soraAccount);
  if (recipient.length !== 32) throw new Error('Invalid recipient');
  const to = `0x${Array.from(recipient, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
  const amount = BigInt(quote.minOutputAmount);
  const from = quote.request.fromAddress;
  const calls = [
    { from, to: quote.transaction.to, data: quote.transaction.data, value: hex(BigInt(quote.transaction.value)) },
    {
      from,
      to: GET_TS_CARD_DAI,
      data: tokenAbi.encodeFunctionData('approve', [GET_TS_HASHI_DAI_BRIDGE, amount]),
      value: '0x0',
    },
    {
      from,
      to: GET_TS_HASHI_DAI_BRIDGE,
      data: bridgeAbi.encodeFunctionData('sendERC20ToSidechain', [to, amount, GET_TS_CARD_DAI]),
      value: '0x0',
    },
  ];
  const read = await simulationRpc(provider, signal);
  try {
    const result = await read('eth_simulateV1', [
      { blockStateCalls: [{ stateOverrides: { [from]: { balance: hex(fundedBalance) } }, calls }], validation: false },
    ]);
    const receipts = (
      result as Array<{ calls?: Array<{ status?: unknown; gasUsed?: unknown; maxUsedGas?: unknown }> }>
    )?.[0]?.calls;
    if (!Array.isArray(receipts) || receipts.length !== 3 || receipts.some((receipt) => receipt.status !== '0x1'))
      throw new Error('Bridge simulation failed');
    const gas =
      quantity(receipts[1].maxUsedGas ?? receipts[1].gasUsed) + quantity(receipts[2].maxUsedGas ?? receipts[2].gasUsed);
    if (gas < 42_000n || gas > 1_000_000n) throw new Error('Invalid bridge gas');
    return gas;
  } catch (error) {
    // Only an explicitly unsupported method permits the already shipped conservative Hashi reserve.
    if (error && typeof error === 'object' && 'code' in error && [-32601, 4200].includes(Number(error.code)))
      return null;
    throw error;
  }
}

/** Full-route pre-payment estimate, funded entirely from the quoted card delivery, with short-lived evidence. */
export async function requestGetTsCardReadiness(
  request: GetTsCardReadinessRequest,
  dependencies: GetTsCardReadinessDependencies
): Promise<GetTsCardReadiness> {
  const now = dependencies.now ?? Date.now;
  const startedAt = now();
  const controller = new AbortController();
  const abort = () => controller.abort();
  dependencies.signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, GET_TS_CARD_REVIEW_TTL_MS);
  let reason: GetTsCardReadinessReason = 'wallet';
  const result: GetTsCardReadiness = { allowed: false, amount: request.amount, expiresAt: 0 };
  const current = () => !dependencies.signal?.aborted && !controller.signal.aborted && dependencies.isCurrent();
  const read = async <T>(work: Promise<T>): Promise<T> => {
    let cancel!: () => void;
    try {
      if (!current()) throw new Error('Changed context');
      const value = await Promise.race([
        work,
        new Promise<never>((_, reject) => {
          cancel = () => reject(new Error('Cancelled read'));
          controller.signal.addEventListener('abort', cancel, { once: true });
        }),
      ]);
      if (!current()) throw new Error('Changed context');
      return value;
    } finally {
      controller.signal.removeEventListener('abort', cancel);
    }
  };
  const checkWallet = async () => {
    const [network, accounts] = await read(
      Promise.all([dependencies.provider.send('eth_chainId', []), dependencies.provider.send('eth_accounts', [])])
    );
    if (
      network !== '0x1' ||
      !Array.isArray(accounts) ||
      typeof accounts[0] !== 'string' ||
      accounts[0].toLowerCase() !== request.account.toLowerCase()
    )
      throw new Error('Changed wallet');
  };
  try {
    if (
      !isGetTsPlanAmount(request.amount, 'USD') ||
      !getAddress(request.account) ||
      decodeAddress(request.soraAccount).length !== 32
    )
      throw new Error('Invalid request');
    await checkWallet();
    reason = 'bridge';
    if (!(await read(dependencies.bridgeReady()))) throw new Error('Bridge unavailable');
    reason = 'provider';
    const card: GetTsCardQuote = await read(
      (dependencies.cardQuote ?? requestGetTsCardQuote)(request.amount, request.publicKey, controller.signal)
    );
    if (!new FPNumber(card.totalUsd).eq(new FPNumber(request.amount)) || !isGetTsPlanAmount(card.ethAmount, 'ETH'))
      throw new Error('Changed card budget');
    const funded = BigInt(new FPNumber(card.ethAmount).toCodecString());
    result.deliveredEth = card.ethAmount;
    result.providerFeeUsd = card.fees.reduce((sum, fee) => sum.add(new FPNumber(fee.amount)), FPNumber.ZERO).toString();
    reason = 'gas';
    const [feeData, balance, gatewayFeeData] = await read(
      Promise.all([
        dependencies.provider.getFeeData(),
        dependencies.provider.getBalance(request.account),
        dependencies.provider.call({
          to: TONSWAP_CONVERSION_CONTRACTS.gateway,
          data: gatewayAbi.encodeFunctionData('fee'),
        }),
      ])
    );
    const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
    if (
      typeof gasPrice !== 'bigint' ||
      gasPrice <= 0n ||
      gasPrice > 1_000_000_000_000n ||
      typeof balance !== 'bigint' ||
      balance < 0n
    )
      throw new Error('Unknown gas');
    result.existingEth = natural(balance);
    let bridgeReserve = estimateTonswapBridgeGasReserve(gasPrice);
    const gatewayFee = gatewayAbi.decodeFunctionResult('fee', gatewayFeeData)[0] as bigint;
    // Start near the actual spend instead of halving small budgets below a provider's conversion minimum.
    // This seed is replaced by the exact calldata simulation; it cannot itself authorize checkout.
    let input = funded - bridgeReserve - 600_000n * gasPrice - gatewayFee;
    let quote: TonswapConversionQuote | undefined;
    let conversionReserve = 0n;
    let settled = false;
    for (let iteration = 0; iteration < 3; iteration++) {
      reason = 'budget';
      if (input <= 0n) throw new Error('Budget cannot cover fees');
      reason = 'conversion';
      quote = await read(
        (dependencies.conversionQuote ?? ((value, signal) => requestTonswapConversionQuote(value, { signal })))(
          {
            source: 'eth',
            target: 'dai',
            amount: natural(input),
            fromAddress: request.account,
            toAddress: request.account,
          },
          controller.signal
        )
      );
      await read(
        (dependencies.verifyConversion ?? verifyTonswapConversionReadiness)(quote, dependencies.provider, current, now)
      );
      if (
        quote.request.fromAddress.toLowerCase() !== request.account.toLowerCase() ||
        quote.request.toAddress.toLowerCase() !== request.account.toLowerCase() ||
        quote.request.source !== 'eth' ||
        quote.request.target !== 'dai' ||
        BigInt(quote.inputAmount) !== input ||
        quote.transaction.type !== 'evm' ||
        BigInt(quote.transaction.value) !== input + BigInt(quote.nativeFee)
      )
        throw new Error('Changed conversion');
      reason = 'simulation';
      const gas = await read(
        dependencies.estimateConversion
          ? dependencies.estimateConversion(quote, funded)
          : estimateGetTsCardConversionGas(dependencies.provider, quote, funded, controller.signal)
      );
      if (gas < 21_000n || gas > 2_000_000n) throw new Error('Invalid conversion gas');
      conversionReserve = gasReserve(gas, gasPrice);
      const available = funded - conversionReserve - bridgeReserve - BigInt(quote.nativeFee);
      reason = 'budget';
      if (available <= 0n) throw new Error('Budget cannot cover fees');
      if (iteration === 0 || input > available) {
        input = available;
        continue;
      }
      reason = 'bridge';
      const bridgeGas = await read(
        dependencies.estimateBridge
          ? dependencies.estimateBridge(quote, funded, request.soraAccount)
          : estimateGetTsCardBridgeGas(dependencies.provider, quote, funded, request.soraAccount, controller.signal)
      );
      if (bridgeGas !== null && (bridgeGas < 42_000n || bridgeGas > 1_000_000n)) throw new Error('Invalid bridge gas');
      result.bridgeEstimate = bridgeGas === null ? 'reserve' : 'simulated';
      if (bridgeGas !== null && gasReserve(bridgeGas, gasPrice) > bridgeReserve)
        bridgeReserve = gasReserve(bridgeGas, gasPrice);
      const finalAvailable = funded - conversionReserve - bridgeReserve - BigInt(quote.nativeFee);
      if (input > finalAvailable) {
        input = finalAvailable;
        continue;
      }
      settled = true;
      break;
    }
    if (!settled || !quote) throw new Error('Unstable fees');
    reason = 'conversion';
    if (!isSwapPriceImpactAllowed(quote.priceImpactPercent, '5') || !isTonswapConversionQuoteFresh(quote, now()))
      throw new Error('Conversion unavailable');
    result.conversionEth = natural(input);
    result.conversionGasReserve = natural(conversionReserve);
    result.bridgeGasReserve = natural(bridgeReserve);
    result.ethereumGasReserve = natural(conversionReserve + bridgeReserve);
    result.conversionProviderFee = natural(BigInt(quote.nativeFee));
    result.bridgeDaiFee = '0';
    result.daiAmount = FPNumber.fromCodecValue(quote.minOutputAmount, 18).toString();
    reason = 'liquidity';
    const preview: GetTsPlanPreviewResult = await read(
      (dependencies.preview ?? requestGetTsPlanPreview)(
        { source: 'sora', paymentAsset: 'DAI', amount: result.daiAmount, purpose: request.purpose ?? 'ts' },
        { ...dependencies.plan, now, signal: controller.signal }
      )
    );
    result.priceImpact = preview.priceImpact;
    if (!preview.feasible || preview.state !== 'ready') throw new Error('Downstream route unavailable');
    result.nativeFeeReserve = preview.feeComponents
      .filter((fee) => fee.symbol === 'XOR')
      .reduce((sum, fee) => sum.add(new FPNumber(fee.amount)), FPNumber.ZERO)
      .toString();
    result.spendableXor = preview.spendableXor;
    result.burnableXor = preview.burnableXor;
    result.estimatedTs = preview.estimatedTs;
    reason = 'wallet';
    await checkWallet();
    reason = 'bridge';
    if (!(await read(dependencies.bridgeReady()))) throw new Error('Changed bridge');
    reason = 'expired';
    const expiresAt = Math.min(
      startedAt + GET_TS_CARD_REVIEW_TTL_MS,
      card.expiresAt,
      quote.expiresAt,
      preview.expiresAt ?? 0
    );
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= now() || now() < startedAt)
      throw new Error('Expired evidence');
    return { ...result, allowed: true, expiresAt };
  } catch {
    return { ...result, allowed: false, expiresAt: 0, reason: controller.signal.aborted ? 'expired' : reason };
  } finally {
    clearTimeout(timeout);
    dependencies.signal?.removeEventListener('abort', abort);
    controller.abort();
  }
}
