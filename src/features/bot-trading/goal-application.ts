/** Fixed browser application composition. Pinned evidence, allocation approval and signing remain distinct. */
import { api as walletApi } from '@/lib/soraneo-wallet/src/api';
import { prepareOwnedGoalSwap } from '@/features/agent-trading/goal-preparation';
import type { PolkaswapAgentApi } from '@/features/agent-trading/types';
import { loadGoalQualificationRelease } from './goal-release';
import { createGoalFundingService, type GoalFundingPreview, type GoalFundingRequest } from './goal-funding';
import { createGoalLiveExecutor, type GoalFundingPreview as GoalAllocationPreview } from './goal-live';
import { createGoalRuntime, type GoalRuntimeDependencies } from './goal-runtime';
import { createBotLiveDependencies } from './live';
import { fetchIndexedBotHistoryWithEvidence } from './history';
import { requiredStrategyCandles, validateStrategy } from './engine';
import { GOAL_EXACT_POLICY } from './goal-exact-ledger';
import { goalConsentIdentity } from './goal-policy';
import {
  assertGoalQualificationRuntime,
  assertGoalQualificationVerification,
  readGoalQualificationBinding,
  goalQualificationDigest,
  type GoalQualificationBinding,
} from './goal-qualification';
import { readGoalExecutionBot } from './goal-storage';
import type { GoalExecutionBot } from './goal-execution-types';
import type { GoalEnabledBotStorage } from './storage';

export interface GoalApplicationRelease {
  id: string;
  url: string;
  sha256: string;
  bundleIndexSha256: string;
  certificateSha256: string;
}
export interface GoalApplicationInput {
  storage: GoalEnabledBotStorage;
  agent: PolkaswapAgentApi;
  /** Trusted shipped application configuration only. Empty until a real qualified bundle is published. */
  releases: readonly GoalApplicationRelease[];
  onChange?: GoalRuntimeDependencies['onChange'];
}
export interface GoalApplicationQualification {
  readonly bundleId: string;
  readonly qualificationDigest: string;
  readonly policyDigest: string;
  readonly initialKusdCodec: string;
  readonly feeReserveCodec: string;
  readonly maxTradeKusdCodec: string;
  readonly maxTradeXorCodec: string;
  readonly binding: Readonly<GoalQualificationBinding>;
  readonly policy: Readonly<{
    targetReturnPercent: string;
    maxLossPercent: string;
    durationMs: number;
    slippagePercent: string;
    maxPriceImpactPercent: string;
    feeReserveCodec: string;
  }>;
}
export interface GoalApplicationDraft {
  bundleId: string;
  draftId: string;
  account: string;
  source: string;
}
export interface GoalApplicationReview extends Readonly<GoalApplicationDraft> {
  readonly kind: 'goal-application-funding-review-v1';
  readonly funding: Readonly<GoalFundingPreview>;
}
export interface GoalApplicationExistingRequest {
  botId: string;
  account: string;
  source: string;
}
/** Existing allocation consent has no draft ID and cannot initialize a funding epoch. */
export interface GoalApplicationExistingReview extends Readonly<GoalApplicationExistingRequest> {
  readonly kind: 'goal-application-existing-review-v1';
  readonly bundleId: string;
  readonly bot: Readonly<GoalExecutionBot>;
  readonly funding: Readonly<GoalAllocationPreview>;
}
type Verified = Awaited<ReturnType<typeof loadGoalQualificationRelease>>;
const HOUR = 3600000;
const fail = (reason = 'research'): never => {
  throw Error(`bots.errors.${reason}`);
};
function check(value: unknown, reason?: string): asserts value {
  if (!value) fail(reason);
}
function own(raw: unknown, fields: readonly string[]): Record<string, unknown> {
  check(raw && typeof raw === 'object' && Object.getPrototypeOf(raw) === Object.prototype);
  const entries = Object.getOwnPropertyDescriptors(raw);
  check(
    Reflect.ownKeys(entries).length === fields.length &&
      fields.every((key) => entries[key]?.enumerable && 'value' in entries[key])
  );
  return Object.fromEntries(fields.map((key) => [key, entries[key].value]));
}
function freeze<T>(value: T): T {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
/**
 * Compose only existing production adapters. No callback can replace qualification, funding, live execution
 * or runtime evaluation. Actions accept configured IDs and owned reviews, never caller-supplied certificates.
 */
export function createGoalApplication(raw: GoalApplicationInput) {
  const input = own(raw, ['storage', 'agent', 'releases', ...(Object.hasOwn(raw, 'onChange') ? ['onChange'] : [])]);
  check(Array.isArray(input.releases) && input.releases.length <= 16);
  const bundles = new Map<string, Readonly<GoalApplicationRelease>>();
  for (const entry of input.releases) {
    const b = own(entry, ['id', 'url', 'sha256', 'bundleIndexSha256', 'certificateSha256']);
    check(typeof b.id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(b.id) && !bundles.has(b.id));
    check(
      ['sha256', 'bundleIndexSha256', 'certificateSha256'].every(
        (key) => typeof b[key] === 'string' && /^[0-9a-f]{64}$/.test(b[key] as string)
      )
    );
    check(typeof b.url === 'string' && b.url.length <= 2048);
    const url = new URL(b.url as string);
    check(
      url.protocol === 'https:' &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        url.pathname.endsWith('/manifest.json')
    );
    bundles.set(
      b.id,
      Object.freeze({
        id: b.id,
        url: url.href,
        sha256: b.sha256 as string,
        bundleIndexSha256: b.bundleIndexSha256 as string,
        certificateSha256: b.certificateSha256 as string,
      })
    );
  }
  const storage = input.storage as GoalEnabledBotStorage,
    agent = input.agent as PolkaswapAgentApi;
  check(storage?.goals && typeof storage.goals.initialize === 'function', 'storage');
  check(agent && typeof agent.status === 'function' && typeof agent.subscribeStatus === 'function', 'session');
  check(input.onChange === undefined || typeof input.onChange === 'function');
  const adapters = createBotLiveDependencies(storage, agent),
    lifetime = new AbortController(),
    verified = new Map<string, Verified>(),
    loading = new Map<string, Promise<GoalApplicationQualification>>(),
    approvals = new Map<
      string,
      {
        identity: string;
        account: string;
        source: string;
        network: string;
        connectionIdentity: string;
        client: ReturnType<GoalRuntimeDependencies['client']>;
      }
    >(),
    versions = new Map<string, number>();
  let disposed = false,
    identityEpoch = 0;
  const active = () => check(!disposed, 'session');
  const client = () => {
    active();
    return walletApi.api;
  };
  const status = () => {
    active();
    return agent.status();
  };
  const identity = () => {
    const s = status();
    return JSON.stringify([
      s.wallet.connected,
      s.wallet.address,
      s.wallet.source,
      s.node.connected,
      s.node.genesisHash,
      s.node.endpoint,
    ]);
  };
  let currentIdentity = identity();
  const qualification = (bot: GoalExecutionBot) => {
    active();
    const result = [...verified.values()].find(
      (item) => item.verification.certificateSha256 === bot.goalExecution.qualificationDigest
    );
    check(result);
    assertGoalQualificationVerification(result.verification, bot);
    return result.verification;
  };
  const live = createGoalLiveExecutor(storage, {
    qualification,
    client,
    prepare: (request) => prepareOwnedGoalSwap(agent, request),
    signer: adapters.signer,
    build: adapters.build,
    balances: adapters.balances,
    acquire: adapters.acquire,
    now: adapters.now,
    status,
  });
  const runtime = createGoalRuntime({
    storage,
    live,
    qualification,
    client,
    now: adapters.now,
    isCurrent: (bot) => {
      if (disposed) return false;
      const permission = approvals.get(bot.id),
        s = agent.status();
      return (
        !!permission &&
        permission.client === walletApi.api &&
        permission.connectionIdentity === identity() &&
        permission.identity === goalConsentIdentity(bot) &&
        permission.account === bot.account &&
        permission.network === bot.network &&
        s.wallet.connected &&
        s.wallet.address === permission.account &&
        s.wallet.source === permission.source &&
        s.node.connected &&
        s.node.genesisHash === permission.network
      );
    },
    history: (bot, signal) => {
      active();
      validateStrategy(bot);
      // Retain a complete indicator tail when the newest completed hour is still awaiting publication.
      const hours = requiredStrategyCandles(bot.strategy) + 1;
      const endAt = Math.floor(adapters.now() / HOUR) * HOUR;
      return fetchIndexedBotHistoryWithEvidence(bot, { startAt: endAt - hours * HOUR, endAt, signal });
    },
    subscribeFinalizedHeads: async (captured, callback) => {
      const current = client();
      check(captured === current && current.isConnected, 'session');
      return current.rpc.chain.subscribeFinalizedHeads(callback);
    },
    ...(input.onChange ? { onChange: input.onChange as GoalRuntimeDependencies['onChange'] } : {}),
  });
  const observeIdentity = () => {
    if (disposed) return;
    const next = identity();
    if (next === currentIdentity) return;
    currentIdentity = next;
    identityEpoch++;
    for (const id of approvals.keys()) void runtime.stop(id).catch(() => undefined);
    approvals.clear();
  };
  const unsubscribe = agent.subscribeStatus({ pollMs: 1000, emitImmediately: false }, observeIdentity);
  interface ReviewScope {
    bundleId: string;
    epoch: number;
    client: ReturnType<typeof client>;
    identity: string;
    key: string;
    version: number;
    createdAt: number;
    used: boolean;
  }
  interface FundingReviewState extends ReviewScope {
    kind: 'funding';
    request: GoalFundingRequest;
  }
  interface ExistingReviewState extends ReviewScope {
    kind: 'existing';
    request: GoalApplicationExistingRequest;
    snapshot: string;
    bot: GoalExecutionBot;
  }
  type ReviewState = FundingReviewState | ExistingReviewState;
  const reviews = new WeakMap<object, ReviewState>();
  const assertScope = (r: ReviewState) => {
    active();
    observeIdentity();
    check(
      r.epoch === identityEpoch &&
        r.client === client() &&
        r.identity === identity() &&
        versions.get(r.key) === r.version &&
        adapters.now() >= r.createdAt &&
        adapters.now() - r.createdAt < 30000,
      'stale'
    );
    const q = verified.get(r.bundleId)?.verification;
    check(q);
    if (r.kind === 'funding') check(q === r.request.qualification);
    else assertGoalQualificationVerification(q, r.bot);
  };
  const requireReview = (review: GoalApplicationReview | GoalApplicationExistingReview) => {
    const r = review && reviews.get(review);
    check(r && !r.used, 'stale');
    assertScope(r);
    return r;
  };
  const fundingFor = (r: FundingReviewState) =>
    createGoalFundingService(storage, {
      client: () => {
        assertScope(r);
        return client();
      },
      status: () => {
        assertScope(r);
        return status();
      },
      balances: adapters.balances,
      acquire: adapters.acquire,
      now: adapters.now,
    });
  const existingBot = async (request: GoalApplicationExistingRequest) => {
    const bot = readGoalExecutionBot((await storage.listBots()).find((b) => b.id === request.botId));
    check(bot.account === request.account, 'wallet');
    check(bot.status === 'paused', 'busy');
    check(
      bot.exactGoalState.outcome === 'active' &&
        !bot.goalTerminal &&
        adapters.now() < bot.exactGoalState.episode.endedAtMs,
      'goalComplete'
    );
    return bot;
  };
  const existingCurrent = async (r: ExistingReviewState) => {
    assertScope(r);
    const bot = await existingBot(r.request);
    assertScope(r);
    check(goalQualificationDigest(bot) === r.snapshot, 'stale');
    check(
      r.client.isConnected &&
        r.client.genesisHash.toHex() === bot.network &&
        status().node.connected &&
        status().node.genesisHash === bot.network,
      'session'
    );
    qualification(bot);
    return bot;
  };
  const rememberApproval = (bot: GoalExecutionBot, r: ReviewState) => {
    approvals.set(bot.id, {
      identity: goalConsentIdentity(bot),
      account: r.request.account,
      source: r.request.source,
      network: bot.network,
      connectionIdentity: r.identity,
      client: r.client,
    });
  };
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    identityEpoch++;
    lifetime.abort();
    // Every owned resource is attempted even if a subscription adapter's cleanup throws.
    for (const cleanup of [
      () => runtime.dispose(),
      () => live.dispose(),
      unsubscribe,
      ...[...verified.values()].map((r) => () => r.dispose()),
    ]) {
      try {
        cleanup();
      } catch {
        /* Locally revoked regardless of external cleanup. */
      }
    }
    verified.clear();
    approvals.clear();
    versions.clear();
  };
  const application = Object.freeze({
    bundleIds: Object.freeze([...bundles.keys()]),
    /** Read-only loading of one shipped, release-verified certificate pin; the original verification never leaves this registry. */
    prepareQualification(id: string): Promise<GoalApplicationQualification> {
      active();
      const bundle = bundles.get(id);
      check(bundle);
      const prior = loading.get(id);
      if (prior) return prior;
      const work = (async () => {
        let result = verified.get(id);
        if (!result) {
          result = await loadGoalQualificationRelease(
            {
              url: bundle.url,
              sha256: bundle.sha256,
              bundleIndexSha256: bundle.bundleIndexSha256,
              certificateSha256: bundle.certificateSha256,
            },
            { fetch: globalThis.fetch.bind(globalThis), signal: lifetime.signal }
          );
          if (disposed) {
            result.dispose();
            return fail('session');
          }
          try {
            const q = result.verification;
            assertGoalQualificationRuntime(q, q.runtimeProfiles[0]);
            const binding = readGoalQualificationBinding(q.binding);
            check(
              binding.genesisHash === GOAL_EXACT_POLICY.genesisHash &&
                binding.initialKusdCodec === GOAL_EXACT_POLICY.maximumInitialKusdCodec
            );
            verified.set(id, result);
          } catch (error) {
            result.dispose();
            throw error;
          }
        }
        const q = result.verification;
        return Object.freeze({
          bundleId: id,
          qualificationDigest: q.certificateSha256,
          policyDigest: q.policySha256,
          initialKusdCodec: q.binding.initialKusdCodec,
          feeReserveCodec: GOAL_EXACT_POLICY.initialFeeReserveCodec,
          maxTradeKusdCodec: q.binding.maxTradeKusdCodec,
          maxTradeXorCodec: q.binding.maxTradeXorCodec,
          binding: freeze(readGoalQualificationBinding(q.binding)),
          policy: Object.freeze({
            targetReturnPercent: GOAL_EXACT_POLICY.targetPercent,
            maxLossPercent: GOAL_EXACT_POLICY.maximumDrawdownPercent,
            durationMs: GOAL_EXACT_POLICY.durationMs,
            slippagePercent: '0.5',
            maxPriceImpactPercent: '1',
            feeReserveCodec: GOAL_EXACT_POLICY.initialFeeReserveCodec,
          }),
        });
      })();
      loading.set(id, work);
      void work
        .finally(() => {
          if (loading.get(id) === work) loading.delete(id);
        })
        .catch(() => undefined);
      return work;
    },
    /** Read-only fresh balance/context preview. A new review supersedes the same draft's prior review. */
    async preview(rawDraft: GoalApplicationDraft): Promise<GoalApplicationReview> {
      active();
      observeIdentity();
      const draft = own(rawDraft, ['bundleId', 'draftId', 'account', 'source']) as unknown as GoalApplicationDraft;
      check([draft.bundleId, draft.draftId, draft.account, draft.source].every((value) => typeof value === 'string'));
      check(/^[A-Za-z0-9_.:-]{1,128}$/.test(draft.draftId));
      check(
        draft.account.length > 0 &&
          draft.account.length <= 128 &&
          draft.source.length > 0 &&
          draft.source.length <= 128,
        'wallet'
      );
      const result = verified.get(draft.bundleId);
      check(result);
      const s = status();
      check(s.wallet.connected && s.wallet.address === draft.account && s.wallet.source === draft.source, 'session');
      const key = JSON.stringify([draft.account, draft.draftId]),
        version = (versions.get(key) ?? 0) + 1;
      versions.set(key, version);
      const r: FundingReviewState = {
        kind: 'funding',
        request: {
          draftId: draft.draftId,
          account: draft.account,
          source: draft.source,
          qualification: result.verification,
        },
        bundleId: draft.bundleId,
        epoch: identityEpoch,
        client: client(),
        identity: identity(),
        key,
        version,
        createdAt: adapters.now(),
        used: false,
      };
      const output = await fundingFor(r).preview(r.request);
      const review = freeze({ kind: 'goal-application-funding-review-v1' as const, ...draft, funding: output });
      reviews.set(review, r);
      requireReview(review);
      return review;
    },
    /** Explicit allocation consent only; leaves the exact goal paused and never unlocks or starts a signer. */
    async approveFunding(review: GoalApplicationReview): Promise<GoalExecutionBot> {
      const r = requireReview(review);
      check(r.kind === 'funding', 'stale');
      check(review.funding.kind === 'funded' || review.funding.sufficient, 'balance');
      r.used = true;
      const bot = readGoalExecutionBot(await fundingFor(r).approve(r.request));
      active();
      observeIdentity();
      check(
        r.epoch === identityEpoch &&
          r.client === client() &&
          r.identity === identity() &&
          versions.get(r.key) === r.version,
        'session'
      );
      check(bot.status === 'paused', 'busy');
      qualification(bot);
      rememberApproval(bot, r);
      return bot;
    },
    /** Reload-safe read-only review of the actual allocation, selected only by its pinned release digest. */
    async previewExisting(rawRequest: GoalApplicationExistingRequest): Promise<{
      qualification: GoalApplicationQualification;
      review: GoalApplicationExistingReview;
    }> {
      active();
      observeIdentity();
      const request = own(rawRequest, ['botId', 'account', 'source']) as unknown as GoalApplicationExistingRequest;
      check(Object.values(request).every((v) => typeof v === 'string' && v.length > 0 && v.length <= 128));
      const original = identity(),
        epoch = identityEpoch,
        captured = client();
      const current = () => {
        active();
        observeIdentity();
        const s = status();
        check(
          epoch === identityEpoch &&
            original === identity() &&
            captured === client() &&
            captured.isConnected &&
            s.node.connected &&
            s.wallet.connected &&
            s.wallet.address === request.account &&
            s.wallet.source === request.source,
          'session'
        );
      };
      current();
      const bot = await existingBot(request);
      current();
      const bundle = [...bundles.values()].find((b) => b.certificateSha256 === bot.goalExecution.qualificationDigest);
      check(bundle);
      const summary = await application.prepareQualification(bundle.id);
      current();
      qualification(bot);
      const key = JSON.stringify(['existing', request.account, request.botId]),
        version = (versions.get(key) ?? 0) + 1;
      versions.set(key, version);
      const r: ExistingReviewState = {
        kind: 'existing',
        request,
        bundleId: bundle.id,
        epoch,
        client: captured,
        identity: original,
        key,
        version,
        createdAt: adapters.now(),
        used: false,
        bot,
        snapshot: goalQualificationDigest(bot),
      };
      const funding = await live.previewAllocation(bot);
      await existingCurrent(r);
      const review = freeze({
        kind: 'goal-application-existing-review-v1' as const,
        ...request,
        bundleId: bundle.id,
        bot,
        funding,
      });
      reviews.set(review, r);
      requireReview(review);
      return { qualification: summary, review };
    },
    /** Approve the unchanged existing epoch under the execution account lease; never persist, unlock or start. */
    async approveExisting(review: GoalApplicationExistingReview): Promise<GoalExecutionBot> {
      const r = requireReview(review);
      check(r.kind === 'existing', 'stale');
      check(review.funding.sufficient, 'balance');
      r.used = true;
      let release: (() => void) | undefined,
        finished = false;
      let rejectWait!: (reason: Error) => void;
      const expiry = new Promise<never>((_resolve, reject) => {
        rejectWait = reject;
      });
      const abort = () => rejectWait(Error('bots.errors.session'));
      const timer = setTimeout(
        () => rejectWait(Error('bots.errors.stale')),
        Math.max(0, 30000 - (adapters.now() - r.createdAt))
      );
      lifetime.signal.addEventListener('abort', abort, { once: true });
      const wait = <T>(work: Promise<T>) => Promise.race([work, expiry]);
      try {
        const acquiring = adapters.acquire(`${r.bot.network}:${r.bot.account}`);
        void acquiring
          .then((remove) => {
            if (finished) remove();
            else release = remove;
          })
          .catch(() => undefined);
        await wait(acquiring);
        const bot = await wait(existingCurrent(r));
        const funding = await wait(live.previewAllocation(bot));
        check(funding.sufficient, 'balance');
        const fresh = await wait(existingCurrent(r));
        const remove = release;
        release = undefined;
        remove?.();
        assertScope(r);
        rememberApproval(fresh, r);
        return fresh;
      } finally {
        finished = true;
        clearTimeout(timer);
        lifetime.signal.removeEventListener('abort', abort);
        release?.();
      }
    },
    /** Cancel this review only; qualification and already approved runtime sessions remain owned. */
    discardReview(review: GoalApplicationReview | GoalApplicationExistingReview): void {
      const r = review && reviews.get(review);
      check(r, 'stale');
      r.used = true;
      if (versions.get(r.key) === r.version) versions.delete(r.key);
    },
    /** Wire into the controller's existing explicit Start approval; funding never calls this itself. */
    runtime: Object.freeze({
      start: (bot: GoalExecutionBot, password?: string) => {
        active();
        observeIdentity();
        return runtime.start(bot, password);
      },
      stop: (id: string) => runtime.stop(id),
      close: (id: string) => {
        active();
        observeIdentity();
        return runtime.close(id);
      },
      active: (id: string) => !disposed && runtime.active(id),
      dispose,
    }),
    dispose,
  });
  return application;
}
