import { reactive } from 'vue';

export const XOR = { address: 'xor', symbol: 'XOR', decimals: 18 };
export const VAL = { address: 'val', symbol: 'VAL', decimals: 18 };
export const assets = [VAL, XOR];
export const events: Array<{ type: string; data?: unknown }> = [];
export const DISCOVERY_GOAL_ACTIVE_MS = 14 * 24 * 60 * 60_000;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const WINDOW_START = Date.UTC(2026, 5, 25);
const WINDOW_HOLDOUT = WINDOW_START + 76 * DAY_MS;
const WINDOW_END = WINDOW_START + 90 * DAY_MS - HOUR_MS;
export const campaigns = reactive<Record<string, unknown>[]>([]);
export const campaignBots = reactive<Record<string, unknown>[]>([]);

type Session = ReturnType<typeof sessionFixture>;
type EngineOptions = { assets: typeof assets; onUpdate: (session: Session) => void };

/** The mounted view uses its real translation call sites with stable test labels. */
export function useTranslation() {
  return { t: (key: string, values?: { count?: number }) => `${key}${values?.count ?? ''}` };
}

/** Exact codec formatting needed by the review and campaign controls. */
export function codec(value: string): bigint {
  if (!/^(0|[1-9]\d*)$/.test(value)) throw new Error('bots.errors.amount');
  return BigInt(value);
}

/** Decimal-to-codec conversion for the read-only progress panel in this browser fixture. */
export function toCodec(value: string, decimals: number): string {
  if (!/^(0|[1-9]\d*)(?:\.\d+)?$/.test(value) || !Number.isInteger(decimals) || decimals < 0 || decimals > 36)
    throw new Error('bots.errors.amount');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new Error('bots.errors.amount');
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0')).toString();
}

/** Exact decimal formatting keeps browser assertions independent of chain math. */
export function fromCodec(value: string, decimals: number): string {
  codec(value);
  const padded = value.padStart(decimals + 1, '0');
  const fraction = padded.slice(-decimals).replace(/0+$/, '');
  return decimals ? `${padded.slice(0, -decimals)}${fraction ? `.${fraction}` : ''}` : value;
}

/** Minimal exact comparator for candidate gate copy in the inert browser fixture. */
export class FPNumber {
  readonly codec: bigint;

  constructor(value: string, decimals: number) {
    const negative = value.startsWith('-');
    this.codec = (negative ? -1n : 1n) * BigInt(toCodec(negative ? value.slice(1) : value, decimals));
  }

  gt(other: FPNumber): boolean {
    return this.codec > other.codec;
  }
}

/** Feedback is outside these browser flows; no live orders are ever supplied. */
export function summarizeDiscoveryLiveFeedback(): null {
  return null;
}

export function rankDiscoveryCandidates<T>(candidates: T[]): T[] {
  return [...candidates];
}

/** Keep browser preflight dates stable while exercising the real view decision flow. */
export function createDiscoveryWindow() {
  return {
    startAt: WINDOW_START,
    trainingEndAt: WINDOW_HOLDOUT - HOUR_MS,
    holdoutStartAt: WINDOW_HOLDOUT,
    endAt: WINDOW_END,
  };
}

/** The harness has no queued AI work; this import only renders the progress hint. */
export function discoveryNextRequestAt(): null {
  return null;
}

/** Seed an already exposed holdout without issuing an AI request. */
export async function seedHoldoutOverlap(): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('holds', 'readwrite');
      transaction.objectStore('holds').put({ startAt: WINDOW_HOLDOUT, endAt: WINDOW_END }, 'prior-run');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

/** Reset advisory preflight evidence between independent browser tests. */
export async function clearHoldoutOverlaps(): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('holds', 'readwrite');
      transaction.objectStore('holds').clear();
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

/** No adapter in this harness sends requests or reads credentials. */
export function createDiscoveryProvider(kind: string) {
  events.push({ type: 'provider-connect', data: kind });
  return {
    pair: async () => undefined,
    suggest: async () => {
      events.push({ type: 'unexpected-ai-call' });
      throw new Error('bots.errors.provider');
    },
    listModels: async () => [{ id: 'offline-model', name: 'Offline model', createdAt: 1 }],
    selectModel: () => undefined,
    disconnect: () => events.push({ type: 'provider-disconnect' }),
  };
}

/** Public checkpoint persistence uses the real browser IndexedDB across reloads. */
async function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('polkaswap-discovery-browser-harness', 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('research')) request.result.createObjectStore('research');
      if (!request.result.objectStoreNames.contains('holds')) request.result.createObjectStore('holds');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Save one public session without provider keys or signing authority. */
export async function saveDiscoverySession(session: Session): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('research', 'readwrite');
      transaction.objectStore('research').put(JSON.parse(JSON.stringify(session)), 'current');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

/** Load exactly the checkpoint the component asks for on mount. */
export async function loadDiscoverySession(): Promise<Session | null> {
  const database = await openDatabase();
  try {
    return await new Promise<Session | null>((resolve, reject) => {
      const request = database.transaction('research', 'readonly').objectStore('research').get('current');
      request.onsuccess = () => resolve((request.result as Session | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}

/** Clear only the harness's IndexedDB record. */
export function createIndexedDbDiscoveryStore() {
  return {
    async findHoldoutOverlaps(startAt: number, endAt: number) {
      events.push({ type: 'holdout-overlap-check', data: { startAt, endAt } });
      const database = await openDatabase();
      try {
        const ranges = await new Promise<Array<{ startAt: number; endAt: number }>>((resolve, reject) => {
          const request = database.transaction('holds', 'readonly').objectStore('holds').getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        return ranges.filter((range) => range.startAt <= endAt && range.endAt >= startAt);
      } finally {
        database.close();
      }
    },
    async clear(): Promise<void> {
      events.push({ type: 'checkpoint-clear' });
      const database = await openDatabase();
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = database.transaction('research', 'readwrite');
          transaction.objectStore('research').delete('current');
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
      } finally {
        database.close();
      }
    },
  };
}

/** This engine fixture keeps a round pending until Pause, so the real button flow is exercised. */
export function createDiscoveryEngine(options: EngineOptions) {
  let current: Session | null = null;
  let finishRun: ((session: Session) => void) | null = null;
  return {
    async start(input: {
      idea: string;
      capital: string;
      callCap: number;
      feeBudgetXor: string;
      maxDrawdownPercent: string;
      provider: { kind: string; model?: string };
    }) {
      events.push({ type: 'research-start', data: { callCap: input.callCap, provider: input.provider } });
      current = sessionFixture('researching', options.assets, input);
      await saveDiscoverySession(current);
      options.onUpdate(current);
      return current;
    },
    async resume(session: Session, provider: { kind: string; model?: string }) {
      events.push({ type: 'research-resume', data: provider });
      current = JSON.parse(JSON.stringify(session)) as Session;
      current.status = 'researching';
      current.provider = provider;
      await saveDiscoverySession(current);
      options.onUpdate(current);
      return current;
    },
    async run(): Promise<Session> {
      if (!current) throw new Error('bots.errors.stale');
      return new Promise((resolve) => {
        finishRun = resolve;
      });
    },
    async pause(): Promise<Session> {
      if (!current) throw new Error('bots.errors.stale');
      events.push({ type: 'research-pause' });
      current.status = 'paused';
      await saveDiscoverySession(current);
      options.onUpdate(current);
      finishRun?.(current);
      finishRun = null;
      return current;
    },
    async revokeLiveFeedback() {
      if (!current) throw new Error('bots.errors.stale');
      return current;
    },
    async dispose() {
      finishRun = null;
    },
  };
}

/** Complete public fixture has one qualified finalist but no actual transaction. */
export function sessionFixture(
  status: 'researching' | 'paused' | 'complete' = 'complete',
  eligibleAssets = assets,
  input: {
    idea: string;
    capital: string;
    callCap: number;
    feeBudgetXor: string;
    maxDrawdownPercent: string;
    provider?: { kind: string; model?: string };
  } = { idea: 'Completed-hour strategy', capital: '10', callCap: 12, feeBudgetXor: '0.1', maxDrawdownPercent: '5' }
) {
  const metrics = {
    returnPercent: '3',
    excessReturnPercent: '1',
    benchmarkReturnPercent: '2',
    drawdownPercent: '2',
    trades: 12,
    coverage: 1,
    startAt: WINDOW_START,
    endAt: WINDOW_HOLDOUT - HOUR_MS,
  };
  const bot = {
    id: 'bot-1',
    assetIn: VAL,
    assetOut: XOR,
    strategy: {
      kind: 'dca',
      amount: '1',
      intervalMs: 86_400_000,
      threshold: '0',
      direction: 'below',
      fastWindow: 5,
      slowWindow: 20,
      prompt: '',
      signalTiming: null,
      rules: null,
    },
    policy: {
      feeBudgetCodec: '100000000000000000',
      maxTradeCodec: { [VAL.address]: '1000000000000000000', [XOR.address]: '1000000000000000000' },
    },
    portfolio: {
      initial: { [VAL.address]: '10000000000000000000' },
      holdings: { [VAL.address]: '10000000000000000000' },
    },
  };
  const finalist = {
    id: 'candidate-1',
    pairKey: `${VAL.address}>${XOR.address}`,
    callNumber: 1,
    status: 'qualified',
    strategy: bot.strategy,
    training: metrics,
    holdout: { ...metrics, startAt: WINDOW_HOLDOUT, endAt: WINDOW_END },
    holdoutState: 'complete',
    template: bot,
  };
  return {
    version: 1,
    id: 'browser-checkpoint',
    createdAt: 1,
    updatedAt: 2,
    status,
    phase: status === 'complete' ? 'complete' : 'researching',
    idea: input.idea,
    provider: input.provider ?? { kind: 'custom' },
    callCap: input.callCap,
    callsUsed: status === 'complete' ? 2 : 0,
    capital: input.capital,
    feeBudgetXor: input.feeBudgetXor,
    maxDrawdownPercent: input.maxDrawdownPercent,
    window: {
      startAt: WINDOW_START,
      trainingEndAt: WINDOW_HOLDOUT - HOUR_MS,
      holdoutStartAt: WINDOW_HOLDOUT,
      endAt: WINDOW_END,
    },
    assets: eligibleAssets,
    pairs: [
      {
        key: `${VAL.address}>${XOR.address}`,
        assetInAddress: VAL.address,
        assetOutAddress: XOR.address,
        status: 'ready',
      },
    ],
    candidates: status === 'complete' ? [finalist] : [],
    finalists: status === 'complete' ? [finalist] : [],
    selectedIds: [],
    failedCalls: 0,
    feedbackExploratory: false,
  };
}

/** Crowded measured evidence exercises chart inspection and same-pair finalist identity. */
export function richSessionFixture(): Session {
  const base = sessionFixture();
  const first = base.finalists[0];
  const second = structuredClone(first);
  second.id = 'candidate-2';
  second.callNumber = 2;
  second.strategy.kind = 'threshold';
  second.strategy.threshold = '1.2';
  second.training = { ...first.training, returnPercent: '3.00001', drawdownPercent: '2.00001' };
  second.holdout = { ...first.holdout, returnPercent: '1.5', drawdownPercent: '4' };
  second.template.id = 'bot-2';
  second.template.strategy = second.strategy;

  const third = structuredClone(first);
  third.id = 'candidate-3';
  third.callNumber = 3;
  third.strategy.kind = 'sma';
  third.strategy.fastWindow = 3;
  third.strategy.slowWindow = 12;
  third.training = { ...first.training, returnPercent: '6', drawdownPercent: '4' };
  third.holdout = { ...first.holdout, returnPercent: '2', drawdownPercent: '3' };
  third.template.id = 'bot-3';
  third.template.strategy = third.strategy;

  const interrupted = structuredClone(first);
  interrupted.id = 'candidate-4';
  interrupted.callNumber = 4;
  interrupted.status = 'rejected';
  interrupted.training = { ...first.training, returnPercent: '-0.00001', drawdownPercent: '1' };
  interrupted.holdout = { ...first.holdout, returnPercent: '17.123456789012345678' };
  interrupted.holdoutState = 'exposed';

  base.candidates = [first, second, third, interrupted];
  base.finalists = [first, second, third];
  base.callsUsed = 4;
  return base;
}
