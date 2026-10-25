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
  BuyQuote,
  ClaimableInfo,
  CreateConditionParams,
  CreateConditionResult,
  CreateMarketParams,
  CreateMarketResult,
  EarlyResolutionReport,
  EvidenceParams,
  EstimateMarketCreationFeeParams,
  MarketActionResult,
  MarketCreationFeeEstimate,
  MarketState,
  PolkamarktConditionDetailsInput,
  PolkamarktConditionInput,
  PolkamarktEvidenceInput,
  PolkamarktOutcome,
  ReportEarlyResolutionParams,
  RuntimeBytes,
  SellQuote,
  SubmitBuyTradeParams,
  SubmitSellTradeParams,
} from './types';

type DynamicTxFactory = (...params: unknown[]) => SubmittableExtrinsic<'promise'>;
type DynamicStorageQuery = (...params: unknown[]) => Promise<unknown>;
type RawRpcPrimitive = string | number | boolean | null;
type RawRpcInteger = {
  rawInteger: string;
};
type RawRpcParam = RawRpcPrimitive | RawRpcInteger;
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
const EARLY_REPORT_BOND_CODEC = new FPNumber('100', KUSD.decimals).toCodecString();
const RAW_RPC_INTEGER_PATTERN = /^(0|[1-9]\d*)$/;
let rawRpcId = 0;

/**
 * Converts UTF-8 text to the byte arrays expected by the Polkamarkt pallet.
 */
export const textBytes = (value: string): RuntimeBytes => Array.from(stringToU8a(value));

/**
 * Converts optional UTF-8 text to runtime bytes, returning an empty vector for blank values.
 */
export const optionalTextBytes = (value?: string): RuntimeBytes => (value?.trim() ? textBytes(value.trim()) : []);

const optionalHashBytes = (value?: string): RuntimeBytes | null => {
  const normalized = value?.trim().replace(/^0x/i, '');
  if (!normalized) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error('Evidence hash must be a 32-byte hex value.');
  }
  return normalized.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16));
};

const buildEvidenceInput = ({ uri, hash }: EvidenceParams): PolkamarktEvidenceInput => {
  const trimmedUri = uri.trim();
  if (!trimmedUri) {
    throw new Error('Evidence URI is required.');
  }

  return {
    uri: textBytes(trimmedUri),
    hash: optionalHashBytes(hash),
  };
};

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

const normalizedKey = (value: string): string => value.replace(/_/g, '').toLowerCase();

const recordValue = (record: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];

    const target = normalizedKey(key);
    const actualKey = Object.keys(record).find((candidate) => normalizedKey(candidate) === target);
    if (actualKey && record[actualKey] !== undefined && record[actualKey] !== null) return record[actualKey];
  }

  return undefined;
};

/**
 * Reads a balance-like RPC field without turning omitted legacy fields into zero.
 */
const rpcOptionalCodecString = (record: Record<string, unknown>, ...keys: string[]): CodecString | undefined => {
  const value = recordValue(record, ...keys);
  return value === undefined || value === null ? undefined : rpcCodecString({ value }, 'value');
};

const bytesValueToArray = (value: unknown): number[] => {
  const normalized = unwrapRpcOption(value);
  if (Array.isArray(normalized)) {
    return normalized.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item >= 0 && item <= 255);
  }
  if (normalized instanceof Uint8Array) {
    return Array.from(normalized);
  }
  if (typeof normalized === 'string') {
    const text = normalized.trim();
    if (/^0x[0-9a-fA-F]*$/.test(text)) {
      return (
        text
          .slice(2)
          .match(/.{1,2}/g)
          ?.map((byte) => Number.parseInt(byte, 16)) ?? []
      );
    }
    return Array.from(stringToU8a(text));
  }
  if (normalized && typeof normalized === 'object' && 'toString' in normalized) {
    return bytesValueToArray(String(normalized));
  }
  return [];
};

const bytesValueToText = (value: unknown): string | undefined => {
  const bytes = bytesValueToArray(value);
  if (!bytes.length) return undefined;
  const decoded = new TextDecoder().decode(new Uint8Array(bytes)).trim();
  return decoded && !decoded.includes('\uFFFD') ? decoded : undefined;
};

const bytesValueToHex = (value: unknown): string | undefined => {
  const bytes = bytesValueToArray(value);
  return bytes.length ? `0x${bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')}` : undefined;
};

const rawRpcInteger = (value: CodecString): RawRpcInteger => {
  const normalized = String(value ?? '').trim();
  if (!RAW_RPC_INTEGER_PATTERN.test(normalized)) {
    throw new Error('RPC integer parameters must be non-negative integer codec strings.');
  }
  return { rawInteger: normalized };
};

const isRawRpcInteger = (value: RawRpcParam): value is RawRpcInteger =>
  Boolean(value) && typeof value === 'object' && 'rawInteger' in value;

const rawRpcParamJson = (value: RawRpcParam): string => {
  if (isRawRpcInteger(value)) return value.rawInteger;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('RPC numeric parameters must be finite.');
    return String(value);
  }
  return JSON.stringify(value);
};

const rawRpcPayload = (id: number, method: string, params: RawRpcParam[]): string =>
  `{"jsonrpc":"2.0","id":${id},"method":${JSON.stringify(method)},"params":[${params.map(rawRpcParamJson).join(',')}]}`;

const rawRpcError = (method: string, error: RawRpcResponse['error']): Error => {
  const message = error?.message ?? 'RPC error';
  const data = error?.data === undefined ? '' : `: ${String(error.data)}`;
  return new Error(`${method} failed: ${message}${data}`);
};

const rawJsonRpc = async (endpoint: string, method: string, params: RawRpcParam[]): Promise<unknown> => {
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

  private buildConditionCreationTx(params: CreateConditionParams): SubmittableExtrinsic<'promise'> {
    const createConditionWithDetails =
      this.txApi.create_condition_with_details ?? this.txApi.createConditionWithDetails;
    const createCondition = this.txApi.create_condition ?? this.txApi.createCondition;
    if (!(createConditionWithDetails || createCondition)) {
      throw new Error('Connected runtime does not expose polkamarkt.create_condition.');
    }

    const conditionInput = this.buildConditionInput(params);
    const conditionDetails = this.buildConditionDetailsInput(params.category);

    return createConditionWithDetails
      ? createConditionWithDetails(conditionInput, conditionDetails)
      : createCondition!(conditionInput);
  }

  private async buildMarketCreationFeeEstimateTxs(params: CreateMarketParams): Promise<{
    conditionTx: SubmittableExtrinsic<'promise'>;
    marketTx: SubmittableExtrinsic<'promise'>;
  }> {
    const conditionId = await this.readNextConditionId();
    if (conditionId === undefined) {
      throw new Error('Unable to read next Polkamarkt condition id before estimating market creation fees.');
    }

    const conditionTx = this.buildConditionCreationTx(params);
    const marketTx = this.getTxFactory('create_market', 'createMarket')(conditionId, params.closeBlock);

    return { conditionTx, marketTx };
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

  private async submitCreationAndReadEvents(
    tx: SubmittableExtrinsic<'promise'>,
    historyData: HistoryItem
  ): Promise<RuntimeEventRecord[]> {
    const historyId = uniqueHistoryId(historyData.type as Operation);

    await this.root.submitExtrinsic(tx, this.root.account!.pair, { ...historyData, id: historyId });

    const history = await this.waitForFinalizedHistory(historyId);
    return this.finalizedExtrinsicEvents(history);
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
    const events = await this.submitCreationAndReadEvents(tx, historyData);
    const eventId = eventNumber(events, eventMethod, eventField);
    if (eventId === undefined) {
      throw new Error(`Finalized Polkamarkt transaction did not emit ${eventMethod}.${eventField}.`);
    }

    return eventId;
  }

  /**
   * Reads the next condition id from runtime storage.
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
   * Estimates network fees for creating a condition and its DPM market.
   */
  public async estimateMarketCreationFee(params: EstimateMarketCreationFeeParams): Promise<MarketCreationFeeEstimate> {
    assert(Number.isSafeInteger(params.closeBlock) && params.closeBlock > 0, 'Close block must be a positive integer.');

    const { conditionTx, marketTx } = await this.buildMarketCreationFeeEstimateTxs(params);
    const conditionFee = await this.root.getTransactionFee(conditionTx);
    const marketFee = await this.root.getTransactionFee(marketTx);
    const totalFee = (BigInt(conditionFee) + BigInt(marketFee)).toString();

    return {
      conditionFee,
      marketFee,
      totalFee,
    };
  }

  /**
   * Creates a Polkamarkt condition. If detailed condition creation is available,
   * category metadata is stored on-chain with the condition.
   */
  public async createCondition(params: CreateConditionParams): Promise<CreateConditionResult> {
    assert(this.root.account, Messages.connectWallet);

    const conditionId = await this.submitCreationAndReadEventId(
      this.buildConditionCreationTx(params),
      { type: Operation.PolkamarktCreateCondition },
      'ConditionCreated',
      'conditionId'
    );

    return { conditionId };
  }

  /**
   * Creates a condition and then creates its DPM market with the finalized condition id.
   */
  public async createMarket(params: CreateMarketParams): Promise<CreateMarketResult> {
    assert(this.root.account, Messages.connectWallet);
    assert(Number.isSafeInteger(params.closeBlock) && params.closeBlock > 0, 'Close block must be a positive integer.');

    const conditionId = await this.submitCreationAndReadEventId(
      this.buildConditionCreationTx(params),
      { type: Operation.PolkamarktCreateCondition },
      'ConditionCreated',
      'conditionId'
    );
    const marketTx = this.getTxFactory('create_market', 'createMarket')(conditionId, params.closeBlock);
    const events = await this.submitCreationAndReadEvents(marketTx, {
      type: Operation.PolkamarktCreateMarket,
      amount: ZERO_CODEC,
      symbol: KUSD.symbol,
      assetAddress: KUSD.address,
      decimals: KUSD.decimals,
    });

    const marketId = eventNumber(events, 'MarketCreated', 'marketId');
    if (marketId === undefined) {
      throw new Error('Finalized Polkamarkt transaction did not emit MarketCreated.marketId.');
    }

    return {
      conditionId,
      marketId,
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

  private earlyReportTx(params: ReportEarlyResolutionParams): SubmittableExtrinsic<'promise'> {
    return this.getTxFactory('report_early_resolution', 'reportEarlyResolution')(
      params.marketId,
      params.outcome,
      buildEvidenceInput(params.evidence)
    );
  }

  public estimateReportEarlyResolutionNetworkFee(params: ReportEarlyResolutionParams): Promise<CodecString> {
    return this.root.getTransactionFee(this.earlyReportTx(params));
  }

  public reportEarlyResolution(params: ReportEarlyResolutionParams): Promise<T> {
    assert(this.root.account, Messages.connectWallet);

    return this.root.submitExtrinsic(this.earlyReportTx(params), this.root.account.pair, {
      type: Operation.PolkamarktReportEarlyResolution,
      amount: codecToNatural(EARLY_REPORT_BOND_CODEC),
      symbol: KUSD.symbol,
      assetAddress: KUSD.address,
      decimals: KUSD.decimals,
      payload: {
        marketId: params.marketId,
        outcome: params.outcome,
        evidenceUri: params.evidence.uri.trim(),
      },
    } as HistoryItem);
  }

  public async quoteBuyTrade(params: Pick<SubmitBuyTradeParams, 'marketId' | 'outcome' | 'collateralIn'>) {
    const rpc = this.rpcApi.quoteBuy;
    let response: unknown;

    if (this.endpoint) {
      try {
        response = await rawJsonRpc(this.endpoint, 'polkamarkt_quoteBuy', [
          params.marketId,
          params.outcome,
          rawRpcInteger(params.collateralIn),
        ]);
      } catch (error) {
        if (!rpc) throw error;
        response = await rpc(params.marketId, params.outcome, params.collateralIn);
      }
    } else if (rpc) {
      response = await rpc(params.marketId, params.outcome, params.collateralIn);
    } else {
      response = await rawJsonRpc(this.endpoint, 'polkamarkt_quoteBuy', [
        params.marketId,
        params.outcome,
        rawRpcInteger(params.collateralIn),
      ]);
    }

    const record = rpcRecord(response);
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
    let response: unknown;

    if (this.endpoint) {
      try {
        response = await rawJsonRpc(this.endpoint, 'polkamarkt_quoteSell', [
          params.marketId,
          params.outcome,
          rawRpcInteger(params.sharesIn),
        ]);
      } catch (error) {
        if (!rpc) throw error;
        response = await rpc(params.marketId, params.outcome, params.sharesIn);
      }
    } else if (rpc) {
      response = await rpc(params.marketId, params.outcome, params.sharesIn);
    } else {
      response = await rawJsonRpc(this.endpoint, 'polkamarkt_quoteSell', [
        params.marketId,
        params.outcome,
        rawRpcInteger(params.sharesIn),
      ]);
    }

    const record = rpcRecord(response);
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

  public async getMarketState(marketId: number): Promise<MarketState | null> {
    const rpc = this.rpcApi.marketState;
    const record = rpcRecord(
      rpc ? await rpc(marketId) : await rawJsonRpc(this.endpoint, 'polkamarkt_marketState', [marketId])
    );
    if (!Object.keys(record).length) return null;
    return {
      marketId: rpcNumber(record, 'marketId'),
      mechanism: String(record.mechanism ?? ''),
      virtualDepth: rpcCodecString(record, 'virtualDepth'),
      realYesShares: rpcCodecString(record, 'realYesShares'),
      realNoShares: rpcCodecString(record, 'realNoShares'),
      dpmCollateral: rpcCodecString(record, 'dpmCollateral'),
      marginalYesPriceBps: rpcNumber(record, 'marginalYesPriceBps'),
      marginalNoPriceBps: rpcNumber(record, 'marginalNoPriceBps'),
      impliedYesProbabilityBps: rpcNumber(record, 'impliedYesProbabilityBps'),
      impliedNoProbabilityBps: rpcNumber(record, 'impliedNoProbabilityBps'),
    };
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
      claimablePayout: rpcOptionalCodecString(record, 'claimablePayout', 'claimable_payout'),
      creatorFees: rpcCodecString(record, 'creatorFees'),
      isCreator: Boolean(record.isCreator),
    } satisfies ClaimableInfo;
  }

  public async getEarlyResolutionReport(marketId: number): Promise<EarlyResolutionReport | null> {
    const storage = (this.root.api.query.polkamarkt ?? {}) as Record<string, DynamicStorageQuery | undefined>;
    const query = storage.earlyResolutionReports ?? storage.early_resolution_reports;
    if (!query) return null;

    const record = rpcRecord(await query(marketId));
    if (!Object.keys(record).length) return null;

    const evidenceValue = recordValue(record, 'evidence');
    const evidence =
      evidenceValue && typeof evidenceValue === 'object' && !Array.isArray(evidenceValue)
        ? (evidenceValue as Record<string, unknown>)
        : {};

    return {
      marketId,
      reporter: String(recordValue(record, 'reporter') ?? ''),
      outcome: rpcOutcome(recordValue(record, 'outcome')),
      bond: rpcCodecString(record, 'bond'),
      evidenceUri: bytesValueToText(recordValue(evidence, 'uri')),
      evidenceHash: bytesValueToHex(recordValue(evidence, 'hash')),
      evidenceBlock: parseRuntimeNumber(recordValue(evidence, 'atBlock', 'at_block')),
    };
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

  private marketActionTx(
    marketId: number,
    action: 'claim_market' | 'claim_creator_fees'
  ): SubmittableExtrinsic<'promise'> {
    const camelCaseAction = action === 'claim_market' ? 'claimMarket' : 'claimCreatorFees';
    const txFactory = this.getTxFactory(action, camelCaseAction);
    return txFactory(marketId);
  }

  public estimateClaimMarketNetworkFee(marketId: number): Promise<CodecString> {
    return this.root.getTransactionFee(this.marketActionTx(marketId, 'claim_market'));
  }

  public estimateClaimCreatorFeesNetworkFee(marketId: number): Promise<CodecString> {
    return this.root.getTransactionFee(this.marketActionTx(marketId, 'claim_creator_fees'));
  }

  private submitMarketAction(
    marketId: number,
    action: 'claim_market' | 'claim_creator_fees',
    operation: Operation
  ): Promise<T> {
    assert(this.root.account, Messages.connectWallet);
    return this.root.submitExtrinsic(this.marketActionTx(marketId, action), this.root.account.pair, {
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
}

export * from './types';
