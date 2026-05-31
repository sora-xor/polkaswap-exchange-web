import { assert, stringToU8a } from '@polkadot/util';
import { FPNumber } from '@sora-substrate/math';

import { KUSD } from '../assets/consts';
import { Messages } from '../logger';
import { Operation, TransactionStatus } from '../types';

import type { Api } from '../api';
import type { HistoryItem } from '../types';
import type { CodecString } from '@sora-substrate/math';
import type { SubmittableExtrinsic } from '@polkadot/api-base/types';
import type {
  AddLiquidityParams,
  BuyQuote,
  ClaimableInfo,
  CreateConditionParams,
  CreateConditionResult,
  CreateMarketParams,
  CreateMarketResult,
  EstimateMarketCreationFeeParams,
  FlipPositionParams,
  FlipQuote,
  LiquidityQuote,
  MarketActionResult,
  MarketCreationFeeEstimate,
  PolkamarktConditionDetailsInput,
  PolkamarktConditionInput,
  PolkamarktOutcome,
  RuntimeBytes,
  SellQuote,
  SubmitBuyTradeParams,
  SubmitSellTradeParams,
} from './types';

type DynamicTxFactory = (...params: unknown[]) => SubmittableExtrinsic<'promise'>;
type DynamicStorageQuery = () => Promise<{ toString(): string }>;
type RawRpcPrimitive = string | number | boolean | null;
type RpcCodec = {
  isSome?: boolean;
  unwrap?: () => unknown;
  toJSON?: () => unknown;
  toHuman?: () => unknown;
  toString?: () => string;
};
type RawRpcResponse = {
  id?: number;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
    data?: unknown;
  };
};
type RuntimeEventRecord = {
  phase?: {
    isApplyExtrinsic?: boolean;
    asApplyExtrinsic?: {
      toNumber?: () => number;
    };
  };
  event: {
    section: string;
    method: string;
    data: unknown;
  };
};

const RAW_RPC_TIMEOUT_MS = 10_000;
const FINALIZED_HISTORY_TIMEOUT_MS = 30_000;
const FINALIZED_HISTORY_POLL_MS = 250;
const ZERO_CODEC = '0';
let rawRpcId = 0;

/**
 * Converts UTF-8 text to the byte arrays expected by the Polkamarkt pallet.
 */
export const textBytes = (value: string): RuntimeBytes => Array.from(stringToU8a(value));

/**
 * Converts optional UTF-8 text to runtime bytes, returning an empty vector for blank values.
 */
export const optionalTextBytes = (value?: string): RuntimeBytes => (value?.trim() ? textBytes(value.trim()) : []);

/**
 * Parses runtime numeric codecs, event payloads, and GraphQL-ish strings into safe non-negative integers.
 */
export const parseRuntimeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
  }

  if (typeof value === 'bigint') {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value.replace(/,/g, ''), 10);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : undefined;
  }

  if (value && typeof value === 'object' && 'toString' in value) {
    return parseRuntimeNumber(String(value));
  }

  return undefined;
};

const readEventData = (data: unknown): unknown => {
  if (data && typeof data === 'object' && 'toHuman' in data) {
    const toHuman = (data as { toHuman?: () => unknown }).toHuman;
    if (typeof toHuman === 'function') return toHuman.call(data);
  }

  if (data && typeof data === 'object' && 'toJSON' in data) {
    const toJSON = (data as { toJSON?: () => unknown }).toJSON;
    if (typeof toJSON === 'function') return toJSON.call(data);
  }

  return data;
};

/**
 * Extracts an integer field from Polkamarkt runtime events.
 */
export const eventNumber = (
  events: RuntimeEventRecord[] | undefined,
  method: string,
  fieldName: string
): number | undefined => {
  const targetMethod = method.replace(/_/g, '').toLowerCase();
  const targetField = fieldName.toLowerCase();

  for (const record of events ?? []) {
    const { event } = record;
    const eventMethod = event.method.replace(/_/g, '').toLowerCase();
    if (event.section.toLowerCase() !== 'polkamarkt' || eventMethod !== targetMethod) {
      continue;
    }

    const data = readEventData(event.data);
    if (Array.isArray(data)) {
      const parsed = parseRuntimeNumber(data[0]);
      if (parsed !== undefined) return parsed;
      continue;
    }

    if (data && typeof data === 'object') {
      const recordData = data as Record<string, unknown>;
      const key = Object.keys(recordData).find(
        (candidate) =>
          candidate.toLowerCase() === targetField ||
          candidate.replace(/_/g, '').toLowerCase() === targetField.replace(/_/g, '')
      );
      const parsed = parseRuntimeNumber(key ? recordData[key] : undefined);
      if (parsed !== undefined) return parsed;
    }
  }

  return undefined;
};

const unwrapRpcOption = (value: unknown): unknown => {
  const codec = value as RpcCodec | null | undefined;
  if (!codec) return null;
  if (typeof codec.isSome === 'boolean') {
    if (!codec.isSome) return null;
    return typeof codec.unwrap === 'function' ? codec.unwrap() : value;
  }
  return value;
};

export const rpcRecord = (value: unknown): Record<string, unknown> => {
  const unwrapped = unwrapRpcOption(value);
  if (!unwrapped || typeof unwrapped !== 'object') return {};

  const codec = unwrapped as RpcCodec;
  const json =
    typeof codec.toJSON === 'function'
      ? codec.toJSON()
      : typeof codec.toHuman === 'function'
        ? codec.toHuman()
        : unwrapped;

  return json && typeof json === 'object' && !Array.isArray(json) ? (json as Record<string, unknown>) : {};
};

const rpcCodecString = (record: Record<string, unknown>, key: string): CodecString => {
  const value = record[key];
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') return String(Math.trunc(value));
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();
    return normalized || ZERO_CODEC;
  }
  if (value && typeof value === 'object' && 'toString' in value) {
    return rpcCodecString({ value: String(value) }, 'value');
  }
  return ZERO_CODEC;
};

const rpcNumber = (record: Record<string, unknown>, key: string): number => parseRuntimeNumber(record[key]) ?? 0;

const rpcOutcome = (value: unknown): PolkamarktOutcome => {
  const normalized = String(value ?? '').toLowerCase();
  return normalized === 'no' ? 'No' : 'Yes';
};

const rpcOptionalOutcome = (value: unknown): PolkamarktOutcome | undefined =>
  value === null || value === undefined ? undefined : rpcOutcome(value);

const rawRpcParamJson = (value: RawRpcPrimitive): string => {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('RPC numeric parameters must be finite.');
    return String(value);
  }
  return JSON.stringify(value);
};

const rawRpcPayload = (id: number, method: string, params: RawRpcPrimitive[]): string =>
  `{"jsonrpc":"2.0","id":${id},"method":${JSON.stringify(method)},"params":[${params.map(rawRpcParamJson).join(',')}]}`;

const rawRpcError = (method: string, error: RawRpcResponse['error']): Error => {
  const message = error?.message ?? 'RPC error';
  const data = error?.data === undefined ? '' : `: ${String(error.data)}`;
  return new Error(`${method} failed: ${message}${data}`);
};

const rawJsonRpc = async (endpoint: string, method: string, params: RawRpcPrimitive[]): Promise<unknown> => {
  if (!endpoint) throw new Error('SORA RPC endpoint is unavailable.');

  const id = ++rawRpcId;
  const payload = rawRpcPayload(id, method, params);

  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: payload,
    });
    const json = (await response.json()) as RawRpcResponse;
    if (json.error) throw rawRpcError(method, json.error);
    return json.result;
  }

  return new Promise<unknown>((resolve, reject) => {
    const WebSocketCtor = globalThis.WebSocket;
    if (!WebSocketCtor) {
      reject(new Error('Browser WebSocket support is required for SORA RPC.'));
      return;
    }

    const socket = new WebSocketCtor(endpoint);
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      socket.close();
      reject(new Error(`Timed out after ${RAW_RPC_TIMEOUT_MS}ms (${method})`));
    }, RAW_RPC_TIMEOUT_MS);

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.close(1000, 'rpc complete');
      callback();
    };

    socket.onopen = () => socket.send(payload);
    socket.onerror = () => finish(() => reject(new Error(`${method} websocket request failed.`)));
    socket.onmessage = (event) => {
      if (typeof event.data !== 'string') return;

      let json: RawRpcResponse;
      try {
        json = JSON.parse(event.data) as RawRpcResponse;
      } catch {
        finish(() => reject(new Error(`${method} returned invalid JSON.`)));
        return;
      }

      if (json.id !== id) return;
      if (json.error) {
        finish(() => reject(rawRpcError(method, json.error)));
        return;
      }
      finish(() => resolve(json.result));
    };
  });
};

const codecToNatural = (value: CodecString, decimals = KUSD.decimals): string =>
  FPNumber.fromCodecValue(value || ZERO_CODEC, decimals).toString();

const addCodecStrings = (...values: CodecString[]): CodecString =>
  values.reduce((sum, value) => (BigInt(sum || ZERO_CODEC) + BigInt(value || ZERO_CODEC)).toString(), ZERO_CODEC);

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const uniqueHistoryId = (operation: Operation): string =>
  `${operation}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const readHistoryError = (history: HistoryItem): string | undefined => {
  const errorMessage = (history as { errorMessage?: unknown }).errorMessage;
  if (!errorMessage) return undefined;
  if (typeof errorMessage === 'string') return errorMessage;
  if (typeof errorMessage === 'object') {
    const record = errorMessage as Record<string, unknown>;
    const section = typeof record.section === 'string' ? record.section : '';
    const name = typeof record.name === 'string' ? record.name : '';
    return section && name ? `${section}.${name}` : JSON.stringify(record);
  }
  return String(errorMessage);
};

const eventPhaseIndex = (record: RuntimeEventRecord): number | undefined => {
  const phase = record.phase;
  if (!phase?.isApplyExtrinsic) return undefined;
  const value = phase.asApplyExtrinsic?.toNumber?.();
  return Number.isSafeInteger(value) && value >= 0 ? value : undefined;
};

export class PolkamarktModule<T> {
  constructor(private readonly root: Api<T>) {}

  private get txApi(): Record<string, DynamicTxFactory | undefined> {
    return ((this.root.api.tx as unknown as Record<string, unknown>).polkamarkt ?? {}) as Record<
      string,
      DynamicTxFactory | undefined
    >;
  }

  private get rpcApi(): Record<string, ((...args: unknown[]) => Promise<unknown>) | undefined> {
    return ((this.root.api.rpc as unknown as Record<string, unknown>).polkamarkt ?? {}) as Record<
      string,
      ((...args: unknown[]) => Promise<unknown>) | undefined
    >;
  }

  private get endpoint(): string {
    return this.root.connection?.endpoint ?? '';
  }

  private getTxFactory(snakeCaseName: string, camelCaseName?: string): DynamicTxFactory {
    const txFactory = this.txApi[snakeCaseName] ?? (camelCaseName ? this.txApi[camelCaseName] : undefined);
    if (!txFactory) {
      throw new Error(`Connected runtime does not expose polkamarkt.${snakeCaseName}.`);
    }
    return txFactory;
  }

  private buildConditionInput({ question, oracle, resolutionSource }: CreateConditionParams): PolkamarktConditionInput {
    return {
      question: textBytes(question),
      oracle: textBytes(oracle),
      resolutionSource: textBytes(resolutionSource),
    };
  }

  private buildConditionDetailsInput(category?: string): PolkamarktConditionDetailsInput {
    return {
      category: optionalTextBytes(category),
      tags: [],
      metadataUri: [],
      metadataHash: null,
      rulesUri: [],
    };
  }

  /**
   * Waits for the known creation history row to be finalized before reading its finalized block events.
   */
  private async waitForFinalizedHistory(historyId: string): Promise<HistoryItem> {
    const startedAt = Date.now();

    while (Date.now() - startedAt < FINALIZED_HISTORY_TIMEOUT_MS) {
      const history = this.root.getHistory(historyId);
      if (history?.status === TransactionStatus.Finalized) return history;
      if (history?.status === TransactionStatus.Error) {
        throw new Error(readHistoryError(history) ?? 'Polkamarkt creation transaction failed.');
      }
      await delay(FINALIZED_HISTORY_POLL_MS);
    }

    throw new Error('Timed out waiting for finalized Polkamarkt creation transaction.');
  }

  /**
   * Reads events belonging to the finalized extrinsic recorded in transaction history.
   */
  private async finalizedExtrinsicEvents(history: HistoryItem): Promise<RuntimeEventRecord[]> {
    if (!history.blockId || !history.txId) {
      throw new Error('Finalized Polkamarkt creation history is missing block or transaction hash.');
    }

    const extrinsics = await this.root.system.getExtrinsicsFromBlock(history.blockId);
    const txIndex = extrinsics.findIndex((extrinsic) => extrinsic.hash.toString() === history.txId);
    if (txIndex < 0) {
      throw new Error('Finalized Polkamarkt creation extrinsic was not found in its block.');
    }

    const events = (await this.root.system.getBlockEvents(history.blockId)) as RuntimeEventRecord[];
    return events.filter((record) => eventPhaseIndex(record) === txIndex);
  }

  /**
   * Submits a creation transaction and derives the runtime id from its finalized Polkamarkt event.
   */
  private async submitCreationAndReadEventId(
    tx: SubmittableExtrinsic<'promise'>,
    historyData: HistoryItem,
    eventMethod: string,
    eventField: string
  ): Promise<number> {
    const historyId = uniqueHistoryId(historyData.type as Operation);

    await this.root.submitExtrinsic(tx, this.root.account!.pair, { ...historyData, id: historyId });

    const history = await this.waitForFinalizedHistory(historyId);
    const events = await this.finalizedExtrinsicEvents(history);
    const eventId = eventNumber(events, eventMethod, eventField);
    if (eventId === undefined) {
      throw new Error(`Finalized Polkamarkt transaction did not emit ${eventMethod}.${eventField}.`);
    }

    return eventId;
  }

  /**
   * Reads the next condition id before submitting a condition creation transaction.
   */
  public async readNextConditionId(): Promise<number | undefined> {
    const query = this.root.api.query.polkamarkt?.nextConditionId as DynamicStorageQuery | undefined;
    if (!query) return undefined;

    try {
      const value = await query();
      return parseRuntimeNumber(value);
    } catch {
      return undefined;
    }
  }

  /**
   * Reads the next market id before submitting a market creation transaction.
   */
  public async readNextMarketId(): Promise<number | undefined> {
    const query = this.root.api.query.polkamarkt?.nextMarketId as DynamicStorageQuery | undefined;
    if (!query) return undefined;

    try {
      const value = await query();
      return parseRuntimeNumber(value);
    } catch {
      return undefined;
    }
  }

  /**
   * Estimates network fees for the two Polkamarkt market-creation transactions.
   */
  public async estimateMarketCreationFee(params: EstimateMarketCreationFeeParams): Promise<MarketCreationFeeEstimate> {
    assert(Number.isSafeInteger(params.closeBlock) && params.closeBlock > 0, 'Close block must be a positive integer.');
    assert(BigInt(params.seedLiquidity || ZERO_CODEC) > 0n, 'Seed liquidity must be greater than zero.');

    const createConditionWithDetails =
      this.txApi.create_condition_with_details ?? this.txApi.createConditionWithDetails;
    const createCondition = this.txApi.create_condition ?? this.txApi.createCondition;
    if (!(createConditionWithDetails || createCondition)) {
      throw new Error('Connected runtime does not expose polkamarkt.create_condition.');
    }

    const conditionId = (await this.readNextConditionId()) ?? 0;
    const conditionInput = this.buildConditionInput(params);
    const conditionDetails = this.buildConditionDetailsInput(params.category);
    const conditionTx = createConditionWithDetails
      ? createConditionWithDetails(conditionInput, conditionDetails)
      : createCondition!(conditionInput);
    const marketTx = this.getTxFactory('create_market', 'createMarket')(
      conditionId,
      params.closeBlock,
      params.seedLiquidity
    );

    const [conditionFee, marketFee] = await Promise.all([
      this.root.getTransactionFee(conditionTx),
      this.root.getTransactionFee(marketTx),
    ]);

    return {
      conditionFee,
      marketFee,
      totalFee: addCodecStrings(conditionFee, marketFee),
    };
  }

  /**
   * Creates a Polkamarkt condition. If detailed condition creation is available,
   * category metadata is stored on-chain with the condition.
   */
  public async createCondition(params: CreateConditionParams): Promise<CreateConditionResult> {
    assert(this.root.account, Messages.connectWallet);

    const createConditionWithDetails =
      this.txApi.create_condition_with_details ?? this.txApi.createConditionWithDetails;
    const createCondition = this.txApi.create_condition ?? this.txApi.createCondition;
    if (!(createConditionWithDetails || createCondition)) {
      throw new Error('Connected runtime does not expose polkamarkt.create_condition.');
    }

    const conditionInput = this.buildConditionInput(params);
    const conditionDetails = this.buildConditionDetailsInput(params.category);
    const tx = createConditionWithDetails
      ? createConditionWithDetails(conditionInput, conditionDetails)
      : createCondition!(conditionInput);

    const conditionId = await this.submitCreationAndReadEventId(
      tx,
      { type: Operation.PolkamarktCreateCondition },
      'ConditionCreated',
      'conditionId'
    );

    return { conditionId };
  }

  /**
   * Creates a tradable Polkamarkt market for an existing condition.
   */
  public async createMarket(params: CreateMarketParams): Promise<CreateMarketResult> {
    assert(this.root.account, Messages.connectWallet);
    assert(Number.isSafeInteger(params.conditionId) && params.conditionId >= 0, 'Condition ID must be non-negative.');
    assert(Number.isSafeInteger(params.closeBlock) && params.closeBlock > 0, 'Close block must be a positive integer.');
    assert(BigInt(params.seedLiquidity || ZERO_CODEC) > 0n, 'Seed liquidity must be greater than zero.');

    const tx = this.getTxFactory('create_market', 'createMarket')(
      params.conditionId,
      params.closeBlock,
      params.seedLiquidity
    );

    const marketId = await this.submitCreationAndReadEventId(
      tx,
      {
        type: Operation.PolkamarktCreateMarket,
        amount: codecToNatural(params.seedLiquidity),
        symbol: KUSD.symbol,
        assetAddress: KUSD.address,
        decimals: KUSD.decimals,
      },
      'MarketCreated',
      'marketId'
    );

    return {
      conditionId: params.conditionId,
      marketId,
      seedLiquidity: params.seedLiquidity,
    };
  }

  public submitBuyTrade(params: SubmitBuyTradeParams): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    assert(BigInt(params.collateralIn || ZERO_CODEC) > 0n, 'Collateral must be greater than zero.');

    return this.root.submitExtrinsic(
      this.getTxFactory('buy')(params.marketId, params.outcome, params.collateralIn, params.minSharesOut),
      this.root.account.pair,
      {
        type: Operation.PolkamarktBuy,
        amount: codecToNatural(params.collateralIn),
        symbol: KUSD.symbol,
        assetAddress: KUSD.address,
        decimals: KUSD.decimals,
        payload: { marketId: params.marketId, outcome: params.outcome },
      } as HistoryItem
    );
  }

  public submitSellTrade(params: SubmitSellTradeParams): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    assert(BigInt(params.sharesIn || ZERO_CODEC) > 0n, 'Shares to sell must be greater than zero.');

    return this.root.submitExtrinsic(
      this.getTxFactory('sell')(params.marketId, params.outcome, params.sharesIn, params.minCollateralOut),
      this.root.account.pair,
      {
        type: Operation.PolkamarktSell,
        amount: codecToNatural(params.sharesIn),
        symbol: 'shares',
        decimals: KUSD.decimals,
        payload: { marketId: params.marketId, outcome: params.outcome },
      } as HistoryItem
    );
  }

  public flipPosition(params: FlipPositionParams): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    assert(BigInt(params.sharesIn || ZERO_CODEC) > 0n, 'Shares to flip must be greater than zero.');

    return this.root.submitExtrinsic(
      this.getTxFactory('flip_position', 'flipPosition')(
        params.marketId,
        params.fromOutcome,
        params.sharesIn,
        params.minCollateralOut,
        params.minSharesOut
      ),
      this.root.account.pair,
      {
        type: Operation.PolkamarktFlip,
        amount: codecToNatural(params.sharesIn),
        symbol: 'shares',
        decimals: KUSD.decimals,
        payload: { marketId: params.marketId, outcome: params.fromOutcome },
      } as HistoryItem
    );
  }

  public addLiquidity(params: AddLiquidityParams): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    assert(BigInt(params.collateralAmount || ZERO_CODEC) > 0n, 'Liquidity amount must be greater than zero.');

    return this.root.submitExtrinsic(
      this.getTxFactory('add_liquidity', 'addLiquidity')(params.marketId, params.collateralAmount, params.minLpShares),
      this.root.account.pair,
      {
        type: Operation.PolkamarktAddLiquidity,
        amount: codecToNatural(params.collateralAmount),
        symbol: KUSD.symbol,
        assetAddress: KUSD.address,
        decimals: KUSD.decimals,
        payload: { marketId: params.marketId },
      } as HistoryItem
    );
  }

  public async quoteBuyTrade(params: Pick<SubmitBuyTradeParams, 'marketId' | 'outcome' | 'collateralIn'>) {
    const rpc = this.rpcApi.quoteBuy;
    const record = rpcRecord(
      rpc
        ? await rpc(params.marketId, params.outcome, params.collateralIn)
        : await rawJsonRpc(this.endpoint, 'polkamarkt_quoteBuy', [params.marketId, params.outcome, params.collateralIn])
    );
    if (!Object.keys(record).length) return null;
    return {
      marketId: rpcNumber(record, 'marketId'),
      outcome: rpcOutcome(record.outcome),
      collateralIn: rpcCodecString(record, 'collateralIn'),
      feeAmount: rpcCodecString(record, 'feeAmount'),
      pricingCollateral: rpcCodecString(record, 'pricingCollateral'),
      sharesOut: rpcCodecString(record, 'sharesOut'),
    } satisfies BuyQuote;
  }

  public async quoteSellTrade(params: Pick<SubmitSellTradeParams, 'marketId' | 'outcome' | 'sharesIn'>) {
    const rpc = this.rpcApi.quoteSell;
    const record = rpcRecord(
      rpc
        ? await rpc(params.marketId, params.outcome, params.sharesIn)
        : await rawJsonRpc(this.endpoint, 'polkamarkt_quoteSell', [params.marketId, params.outcome, params.sharesIn])
    );
    if (!Object.keys(record).length) return null;
    return {
      marketId: rpcNumber(record, 'marketId'),
      outcome: rpcOutcome(record.outcome),
      sharesIn: rpcCodecString(record, 'sharesIn'),
      grossCollateralOut: rpcCodecString(record, 'grossCollateralOut'),
      feeAmount: rpcCodecString(record, 'feeAmount'),
      collateralOut: rpcCodecString(record, 'collateralOut'),
    } satisfies SellQuote;
  }

  public async quoteAddLiquidity(params: Pick<AddLiquidityParams, 'marketId' | 'collateralAmount'>) {
    const rpc = this.rpcApi.quoteAddLiquidity;
    const record = rpcRecord(
      rpc
        ? await rpc(params.marketId, params.collateralAmount)
        : await rawJsonRpc(this.endpoint, 'polkamarkt_quoteAddLiquidity', [params.marketId, params.collateralAmount])
    );
    if (!Object.keys(record).length) return null;
    return {
      marketId: rpcNumber(record, 'marketId'),
      collateralIn: rpcCodecString(record, 'collateralIn'),
      lpSharesOut: rpcCodecString(record, 'lpSharesOut'),
      poolCollateral: rpcCodecString(record, 'poolCollateral'),
      totalLpShares: rpcCodecString(record, 'totalLpShares'),
    } satisfies LiquidityQuote;
  }

  public async quoteFlipPosition(params: Pick<FlipPositionParams, 'marketId' | 'fromOutcome' | 'sharesIn'>) {
    const rpc = this.rpcApi.quoteFlipPosition;
    const record = rpcRecord(
      rpc
        ? await rpc(params.marketId, params.fromOutcome, params.sharesIn)
        : await rawJsonRpc(this.endpoint, 'polkamarkt_quoteFlipPosition', [
            params.marketId,
            params.fromOutcome,
            params.sharesIn,
          ])
    );
    if (!Object.keys(record).length) return null;
    return {
      marketId: rpcNumber(record, 'marketId'),
      fromOutcome: rpcOutcome(record.fromOutcome),
      toOutcome: rpcOutcome(record.toOutcome),
      sharesIn: rpcCodecString(record, 'sharesIn'),
      grossCollateralOut: rpcCodecString(record, 'grossCollateralOut'),
      sellFeeAmount: rpcCodecString(record, 'sellFeeAmount'),
      collateralReinvested: rpcCodecString(record, 'collateralReinvested'),
      buyFeeAmount: rpcCodecString(record, 'buyFeeAmount'),
      pricingCollateral: rpcCodecString(record, 'pricingCollateral'),
      sharesOut: rpcCodecString(record, 'sharesOut'),
    } satisfies FlipQuote;
  }

  public async getClaimableInfo(account: string, marketId: number) {
    const rpc = this.rpcApi.claimable;
    const record = rpcRecord(
      rpc ? await rpc(account, marketId) : await rawJsonRpc(this.endpoint, 'polkamarkt_claimable', [account, marketId])
    );
    if (!Object.keys(record).length) return null;
    return {
      marketId: rpcNumber(record, 'marketId'),
      account: String(record.account ?? account),
      status: String(record.status ?? ''),
      resolutionOutcome: rpcOptionalOutcome(record.resolutionOutcome),
      yesShares: rpcCodecString(record, 'yesShares'),
      noShares: rpcCodecString(record, 'noShares'),
      netCollateralPaid: rpcCodecString(record, 'netCollateralPaid'),
      traderPayout: rpcCodecString(record, 'traderPayout'),
      creatorFees: rpcCodecString(record, 'creatorFees'),
      creatorLiquidity: rpcCodecString(record, 'creatorLiquidity'),
      isCreator: Boolean(record.isCreator),
    } satisfies ClaimableInfo;
  }

  public estimateBuyTradeNetworkFee(params: SubmitBuyTradeParams): Promise<CodecString> {
    return this.root.getTransactionFee(
      this.getTxFactory('buy')(params.marketId, params.outcome, params.collateralIn, params.minSharesOut)
    );
  }

  public estimateSellTradeNetworkFee(params: SubmitSellTradeParams): Promise<CodecString> {
    return this.root.getTransactionFee(
      this.getTxFactory('sell')(params.marketId, params.outcome, params.sharesIn, params.minCollateralOut)
    );
  }

  public estimateFlipNetworkFee(params: FlipPositionParams): Promise<CodecString> {
    return this.root.getTransactionFee(
      this.getTxFactory('flip_position', 'flipPosition')(
        params.marketId,
        params.fromOutcome,
        params.sharesIn,
        params.minCollateralOut,
        params.minSharesOut
      )
    );
  }

  public estimateAddLiquidityNetworkFee(params: AddLiquidityParams): Promise<CodecString> {
    return this.root.getTransactionFee(
      this.getTxFactory('add_liquidity', 'addLiquidity')(params.marketId, params.collateralAmount, params.minLpShares)
    );
  }

  private marketActionTx(
    marketId: number,
    action: 'claim_market' | 'claim_creator_fees' | 'claim_creator_liquidity' | 'claim_liquidity',
    lpShares: CodecString = ZERO_CODEC
  ): SubmittableExtrinsic<'promise'> {
    const camelCaseAction =
      action === 'claim_market'
        ? 'claimMarket'
        : action === 'claim_creator_fees'
          ? 'claimCreatorFees'
          : action === 'claim_creator_liquidity'
            ? 'claimCreatorLiquidity'
            : 'claimLiquidity';
    const txFactory = this.getTxFactory(action, camelCaseAction);
    return action === 'claim_liquidity' ? txFactory(marketId, lpShares) : txFactory(marketId);
  }

  public estimateClaimMarketNetworkFee(marketId: number): Promise<CodecString> {
    return this.root.getTransactionFee(this.marketActionTx(marketId, 'claim_market'));
  }

  public estimateClaimCreatorFeesNetworkFee(marketId: number): Promise<CodecString> {
    return this.root.getTransactionFee(this.marketActionTx(marketId, 'claim_creator_fees'));
  }

  public estimateClaimCreatorLiquidityNetworkFee(marketId: number): Promise<CodecString> {
    return this.root.getTransactionFee(this.marketActionTx(marketId, 'claim_creator_liquidity'));
  }

  public estimateClaimLiquidityNetworkFee(marketId: number, lpShares: CodecString = ZERO_CODEC): Promise<CodecString> {
    return this.root.getTransactionFee(this.marketActionTx(marketId, 'claim_liquidity', lpShares));
  }

  private submitMarketAction(
    marketId: number,
    action: 'claim_market' | 'claim_creator_fees' | 'claim_creator_liquidity' | 'claim_liquidity',
    operation: Operation,
    lpShares: CodecString = ZERO_CODEC
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    return this.root.submitExtrinsic(this.marketActionTx(marketId, action, lpShares), this.root.account.pair, {
      type: operation,
      payload: { marketId },
    } as HistoryItem);
  }

  public claimMarket(marketId: number): Promise<T> {
    return this.submitMarketAction(marketId, 'claim_market', Operation.PolkamarktClaimMarket);
  }

  public async claimMarkets(marketIds: number[]): Promise<Array<MarketActionResult> | T> {
    const uniqueIds = [...new Set(marketIds)].filter((marketId) => Number.isSafeInteger(marketId) && marketId >= 0);
    if (!uniqueIds.length) return [];

    const txFactory = this.txApi.claim_markets ?? this.txApi.claimMarkets;
    if (!txFactory) {
      const results: MarketActionResult[] = [];
      for (const marketId of uniqueIds) {
        await this.claimMarket(marketId);
        results.push({ marketId, action: 'claim_market' });
      }
      return results;
    }

    assert(this.root.account, Messages.connectWallet);
    return this.root.submitExtrinsic(txFactory(uniqueIds), this.root.account.pair, {
      type: Operation.PolkamarktClaimMarkets,
      payload: { marketIds: uniqueIds },
    } as HistoryItem);
  }

  public claimCreatorFees(marketId: number): Promise<T> {
    return this.submitMarketAction(marketId, 'claim_creator_fees', Operation.PolkamarktClaimCreatorFees);
  }

  public claimCreatorLiquidity(marketId: number): Promise<T> {
    return this.submitMarketAction(marketId, 'claim_creator_liquidity', Operation.PolkamarktClaimCreatorLiquidity);
  }

  public claimLiquidity(marketId: number, lpShares: CodecString = ZERO_CODEC): Promise<T> {
    return this.submitMarketAction(marketId, 'claim_liquidity', Operation.PolkamarktClaimLiquidity, lpShares);
  }
}

export * from './types';
