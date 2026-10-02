import { gql } from '@urql/core';
import { XOR } from '@/lib/substrate/sdk/assets/consts';
import { getCurrentIndexer, type PolkaswapIndexer } from '@/lib/soraneo-wallet/src/services/indexer';
import { fetchIndexedBotHistoryWithEvidence } from './history';
import {
  createGoalHistoryEvidence,
  GOAL_HISTORY_STUDY_CANDLES,
  GOAL_HISTORY_WARMUP_CANDLES,
  type AutopilotHistory,
} from './goal-history';
import { readHistoryIdentity } from './playground-history';
import { parseBotPrice } from './engine';
import type { AutopilotInput, AutopilotResearchOptions } from './autopilot';
import type { BotAsset, BotHistory } from './types';

const HOUR = 3_600_000;
const HOURS = GOAL_HISTORY_STUDY_CANDLES;
const COVERAGE_HOURS = HOURS + GOAL_HISTORY_WARMUP_CANDLES;
// assetHourlyCoverage validates canonical mainnet evidence; it has no cross-chain selector.
const COVERAGE_GENESIS = '0x7e4e32d0feafd4f9c9414b0be86373f9a1efa904809b683453a9af6856d38ad5';
const HASH = /^0x[0-9a-f]{64}$/;

const HourlyReadinessQuery = gql<{ data: unknown }>`
  query BotHourlyReadiness($assetId: String!, $start: Int!, $end: Int!) {
    data: assetHourlyCoverage(assetId: $assetId, start: $start, end: $end) {
      assetId
      symbol
      start
      end
      asOf
      expectedHours
      observedHours
      verifiedHours
      poolUsableHours
      missingHours
      legacyHours
      invalidHours
      absentPoolHours
      zeroReserveHours
      unknownPoolHours
      latestCompletedAt
      latestUsableCompletedAt
      hours {
        hour
        proofStatus
        poolStatus
        completedAt
        timestamp
        blockHeight
        blockHash
        nextTimestamp
        nextBlockHeight
        nextBlockHash
        denominator
        decimals
      }
    }
  }
`;

/** Public window boundaries only; readiness never contains candles, reserves or held-out prices. */
export interface AutopilotHistoryReadiness {
  completedThrough: number;
  validationFrom: number;
}

interface AutopilotHistoryReadinessDependencies {
  identity?: typeof readHistoryIdentity;
  coverage?: (assetId: string, start: number, end: number, signal?: AbortSignal) => Promise<unknown>;
  now?: () => number;
}

/** Reject executable properties before checking untrusted coverage metadata. */
function metadataRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some((key) => typeof key !== 'string' || !('value' in descriptors[key])))
    return null;
  return value as Record<string, unknown>;
}

/** Check every completed bucket and retain only identities for comparison with the other required assets. */
function usableCoverage(
  raw: unknown,
  asset: BotAsset,
  start: number,
  end: number,
  denominator: string,
  now: number
): string[] | null {
  const coverage = metadataRecord(raw);
  if (
    !coverage ||
    coverage.assetId !== asset.address ||
    coverage.symbol !== asset.symbol ||
    coverage.start !== start ||
    coverage.end !== end ||
    !Number.isSafeInteger(coverage.asOf) ||
    (coverage.asOf as number) < end ||
    now - (coverage.asOf as number) * 1000 > 60_000 ||
    (coverage.asOf as number) * 1000 - now > 30_000 ||
    ['expectedHours', 'observedHours', 'verifiedHours', 'poolUsableHours'].some(
      (key) => coverage[key] !== COVERAGE_HOURS
    ) ||
    ['missingHours', 'legacyHours', 'invalidHours', 'absentPoolHours', 'zeroReserveHours', 'unknownPoolHours'].some(
      (key) => coverage[key] !== 0
    ) ||
    coverage.latestCompletedAt !== end ||
    coverage.latestUsableCompletedAt !== end ||
    !Array.isArray(coverage.hours) ||
    coverage.hours.length !== COVERAGE_HOURS
  )
    return null;
  const boundaries: string[] = [];
  for (let index = 0; index < COVERAGE_HOURS; index++) {
    const hour = start + index * (HOUR / 1000);
    const completedAt = hour + HOUR / 1000;
    const mark = metadataRecord(coverage.hours[index]);
    if (
      !mark ||
      mark.hour !== hour ||
      mark.completedAt !== completedAt ||
      mark.proofStatus !== 'VERIFIED' ||
      mark.poolStatus !== (asset.address === XOR.address ? 'XOR_SELF' : 'USABLE') ||
      mark.denominator !== denominator ||
      mark.decimals !== asset.decimals ||
      !Number.isSafeInteger(mark.timestamp) ||
      (mark.timestamp as number) < hour ||
      (mark.timestamp as number) >= completedAt ||
      !Number.isSafeInteger(mark.nextTimestamp) ||
      (mark.nextTimestamp as number) < completedAt ||
      (mark.nextTimestamp as number) >= completedAt + HOUR / 1000 ||
      !Number.isSafeInteger(mark.blockHeight) ||
      (mark.blockHeight as number) < 1 ||
      (mark.blockHeight as number) >= 2_147_483_647 ||
      mark.nextBlockHeight !== (mark.blockHeight as number) + 1 ||
      typeof mark.blockHash !== 'string' ||
      !HASH.test(mark.blockHash) ||
      typeof mark.nextBlockHash !== 'string' ||
      !HASH.test(mark.nextBlockHash) ||
      mark.blockHash === mark.nextBlockHash
    )
      return null;
    boundaries.push(
      JSON.stringify([
        mark.timestamp,
        mark.blockHeight,
        mark.blockHash,
        mark.nextTimestamp,
        mark.nextBlockHeight,
        mark.nextBlockHash,
      ])
    );
  }
  return boundaries;
}

/**
 * Poll uncached, price-free indexer coverage before another GO attempt. Return null
 * while the seven-day study or its preceding signal warmup is incomplete, stale
 * or cancelled. Warmup coverage never changes the funded study boundaries.
 * A ready result is only a retry trigger: normal research still validates its
 * independently loaded candles. The caller decides whether this window is new.
 */
export function createAutopilotHistoryReadinessReader(deps: AutopilotHistoryReadinessDependencies = {}) {
  const identityReader = deps.identity ?? readHistoryIdentity;
  const now = deps.now ?? Date.now;
  return async (
    input: Pick<AutopilotInput, 'assets' | 'assetInAddress' | 'assetOutAddress'>,
    signal?: AbortSignal
  ): Promise<AutopilotHistoryReadiness | null> => {
    if (signal?.aborted) return null;
    const controller = new AbortController();
    let abort: (() => void) | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const cancelled = new Promise<null>((resolve) => {
      abort = () => {
        stopped = true;
        controller.abort();
        resolve(null);
      };
      signal?.addEventListener('abort', abort, { once: true });
      // Cancel this poll's HTTP transport without disconnecting shared SDK clients.
      timer = setTimeout(abort, 15_000);
    });
    const work = async (): Promise<AutopilotHistoryReadiness | null> => {
      const selected = [input.assetInAddress, input.assetOutAddress];
      if (selected[0] === selected[1]) return null;
      const assets: BotAsset[] = [];
      for (const address of selected) {
        const matches = input.assets.filter((asset) => asset.address === address);
        if (matches.length !== 1) return null;
        const { symbol, decimals } = matches[0];
        if (
          !HASH.test(address) ||
          !symbol ||
          typeof symbol !== 'string' ||
          symbol.length > 128 ||
          !Number.isSafeInteger(decimals) ||
          decimals < 0 ||
          decimals > 36 ||
          (address === XOR.address && (symbol !== XOR.symbol || decimals !== XOR.decimals))
        )
          return null;
        assets.push({ address, symbol, decimals });
      }
      if (!assets.some((asset) => asset.address === XOR.address))
        assets.push({ address: XOR.address, symbol: XOR.symbol, decimals: XOR.decimals });
      const at = now();
      const end = Math.floor(at / HOUR) * HOUR;
      const studyStart = end - HOURS * HOUR;
      const start = studyStart - GOAL_HISTORY_WARMUP_CANDLES * HOUR;
      if (!Number.isSafeInteger(at) || start < 0) return null;
      const identity = await identityReader();
      identity.assertCurrent();
      if (
        stopped ||
        identity.genesisHash !== COVERAGE_GENESIS ||
        !identity.currentDenominator ||
        !/^[1-9]\d{0,38}$/.test(identity.currentDenominator) ||
        BigInt(identity.currentDenominator) >= 1n << 128n
      )
        return null;
      assertFreshFinality(identity, end, now());
      const indexer = deps.coverage ? undefined : (getCurrentIndexer() as PolkaswapIndexer | null);
      const explorer = indexer?.services?.explorer;
      if (!deps.coverage && !explorer?.initClient()) return null;
      const client = explorer?.client;
      if (!deps.coverage && !client) return null;
      // Descriptors are recreated on lookup; the service and initialized client
      // identify the source across every required asset and the final identity wait.
      const currentTransport = () => {
        if (deps.coverage) return true;
        const current = getCurrentIndexer();
        return (
          current?.type === indexer?.type && current?.services?.explorer === explorer && explorer?.client === client
        );
      };
      const coverage =
        deps.coverage ??
        (async (assetId: string, from: number, to: number) => {
          if (!client || !currentTransport()) return null;
          const result = await client
            .query(
              HourlyReadinessQuery,
              { assetId, start: from, end: to },
              { requestPolicy: 'network-only', fetchOptions: { signal: controller.signal, cache: 'no-store' } }
            )
            .toPromise();
          return currentTransport() && !result.error ? result.data?.data : null;
        });
      let expected: string[] | undefined;
      let oldestAsOf = Infinity;
      for (const asset of assets) {
        if (stopped) return null;
        const raw = await coverage(asset.address, start / 1000, end / 1000, controller.signal);
        identity.assertCurrent();
        if (stopped) return null;
        const boundaries = usableCoverage(raw, asset, start / 1000, end / 1000, identity.currentDenominator, now());
        if (!boundaries || (expected && boundaries.some((value, index) => value !== expected![index]))) return null;
        expected = boundaries;
        oldestAsOf = Math.min(oldestAsOf, metadataRecord(raw)!.asOf as number);
      }
      const after = await identityReader();
      identity.assertCurrent();
      after.assertCurrent();
      if (
        stopped ||
        !currentTransport() ||
        after.key !== identity.key ||
        after.genesisHash !== identity.genesisHash ||
        after.currentDenominator !== identity.currentDenominator ||
        Math.floor(now() / HOUR) * HOUR !== end ||
        now() - oldestAsOf * 1000 > 60_000
      )
        return null;
      assertFreshFinality(after, end, now());
      // Candles close at start+(index+1) hours: 117 training, index117 embargo, index118 validation.
      return { completedThrough: end, validationFrom: studyStart + (Math.floor((HOURS * 70) / 100) + 2) * HOUR };
    };
    try {
      return await Promise.race([work().catch(() => null), cancelled]);
    } finally {
      if (timer !== undefined) clearTimeout(timer);
      if (abort) signal?.removeEventListener('abort', abort);
      controller.abort();
    }
  };
}

/** Report waiting for finalized data before treating an unfinished current hour as a historical gap. */
function assertFreshFinality(
  identity: Awaited<ReturnType<typeof readHistoryIdentity>>,
  end: number,
  now: number
): void {
  const at = identity.finalizedAt;
  if (
    !Number.isSafeInteger(now) ||
    at === undefined ||
    !Number.isSafeInteger(at) ||
    at <= 0 ||
    at < end ||
    now - at > 300_000 ||
    at - now > 30_000
  )
    throw new Error('bots.errors.stale');
}

interface AutopilotHistoryDependencies {
  identity: typeof readHistoryIdentity;
  indexed: typeof fetchIndexedBotHistoryWithEvidence;
  now: () => number;
}

/** Check the whole fixed window before using a source; missing hours are never filled with repeated prices. */
function complete(history: BotHistory, start: number): boolean {
  if (!history.denominationVerified || history.missing !== 0 || history.candles.length !== COVERAGE_HOURS) return false;
  return history.candles.every((candle, index) => {
    if (candle.timestamp !== start + (index + 1) * HOUR) return false;
    try {
      parseBotPrice(candle.close);
      parseBotPrice(candle.feeClose ?? '');
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * GO uses one indexed XOR-pool snapshot for its fixed study and preceding signal
 * warmup. Warmup observations remain separate from funded study candles. Missing pair
 * evidence remains unavailable; USD-derived or archive prices cannot substitute
 * for the tested execution basis. Chain and denomination identity stay bound.
 */
export function createAutopilotHistoryLoader(
  deps: AutopilotHistoryDependencies = {
    identity: readHistoryIdentity,
    indexed: fetchIndexedBotHistoryWithEvidence,
    now: Date.now,
  }
): { load: AutopilotResearchOptions['loadHistory']; clear(): void } {
  const cache = new Map<string, { at: number; history: AutopilotHistory; source: ReturnType<typeof source> }>();
  /** Source descriptors are recreated; the initialized service/client identify an indexed snapshot. */
  function source() {
    const indexer = getCurrentIndexer();
    const explorer = indexer?.services?.explorer;
    return { type: indexer?.type, explorer, client: explorer?.client };
  }
  /** A cached observation is usable only while its exact indexed source remains selected. */
  function sameSource(left: ReturnType<typeof source>, right: ReturnType<typeof source>): boolean {
    return left.type === right.type && left.explorer === right.explorer && left.client === right.client;
  }
  let generation = 0;
  return {
    async load(bot, settings, signal, options) {
      const version = generation;
      const requestedBot = {
        ...bot,
        assetIn: { ...bot.assetIn },
        assetOut: { ...bot.assetOut },
        policy: { ...bot.policy, feeAsset: { ...bot.policy.feeAsset } },
      };
      const assetIdentity = JSON.stringify([requestedBot.assetIn, requestedBot.assetOut, requestedBot.policy.feeAsset]);
      const identity = await deps.identity();
      getCurrentIndexer()?.services?.explorer?.initClient();
      const originalSource = source();
      const check = () => {
        identity.assertCurrent();
        if (
          signal?.aborted ||
          version !== generation ||
          !sameSource(originalSource, source()) ||
          assetIdentity !== JSON.stringify([bot.assetIn, bot.assetOut, bot.policy.feeAsset])
        )
          throw new Error('bots.errors.stale');
      };
      check();
      const start = settings.historyStartAt;
      const end = settings.historyEndAt;
      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start! - GOAL_HISTORY_WARMUP_CANDLES * HOUR < 0 ||
        start! % HOUR ||
        end! % HOUR ||
        end! - start! !== HOURS * HOUR ||
        end! > Math.floor(deps.now() / HOUR) * HOUR ||
        deps.now() - end! > 2 * HOUR ||
        !identity.genesisHash ||
        !identity.currentDenominator
      )
        throw new Error('bots.autopilot.errors.historyUnavailable');
      // This is the same freshness horizon as live fee preparation. Preserve
      // the requested window; never shift it backwards to make it pass.
      assertFreshFinality(identity, end!, deps.now());
      const key = JSON.stringify([
        identity.key,
        identity.genesisHash,
        identity.currentDenominator,
        assetIdentity,
        start,
        end,
      ]);
      // Review must re-observe both the study and its prefix. A failed fresh read
      // also invalidates the old entry so it cannot mask a newly detected gap.
      if (options?.fresh) cache.delete(key);
      const cached = cache.get(key);
      if (
        cached &&
        sameSource(cached.source, originalSource) &&
        deps.now() >= cached.at &&
        deps.now() - cached.at < 60_000
      ) {
        return structuredClone(cached.history);
      }
      let combined: Awaited<ReturnType<typeof fetchIndexedBotHistoryWithEvidence>>;
      const warmupStart = start! - GOAL_HISTORY_WARMUP_CANDLES * HOUR;
      try {
        combined = await deps.indexed(requestedBot, { startAt: warmupStart, endAt: end, signal });
      } catch {
        check();
        throw new Error('bots.autopilot.errors.historyUnavailable');
      }
      check();
      const after = await deps.identity();
      check();
      after.assertCurrent();
      if (
        after.key !== identity.key ||
        after.genesisHash !== identity.genesisHash ||
        after.currentDenominator !== identity.currentDenominator
      )
        throw new Error('bots.errors.stale');
      assertFreshFinality(after, end!, deps.now());
      if (
        !complete(combined.history, warmupStart) ||
        combined.history.identity?.genesisHash !== identity.genesisHash ||
        combined.history.identity?.denominator !== identity.currentDenominator
      )
        throw new Error('bots.autopilot.errors.historyIncomplete');
      let history: AutopilotHistory;
      try {
        history = {
          ...combined.history,
          candles: combined.history.candles.slice(GOAL_HISTORY_WARMUP_CANDLES),
          goalHistory: createGoalHistoryEvidence(requestedBot, combined, start!, end!),
        };
      } catch {
        throw new Error('bots.autopilot.errors.historyIncomplete');
      }
      if (cache.size >= 3) cache.delete(cache.keys().next().value!);
      cache.set(key, { at: deps.now(), history: structuredClone(history), source: originalSource });
      return structuredClone(history);
    },
    /** Revoke late responses and all page-local research observations. */
    clear() {
      generation++;
      cache.clear();
    },
  };
}
