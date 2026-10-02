import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { createBotAiClient, type BotAiClient } from './ai';
import { createDesktopAiClient, isDesktopAiSupported, type DesktopAiClient, type DesktopAiContext } from './desktop-ai';
import { CompanionRequestError, createLocalCodexCompanion, type LocalCodexCompanion } from './local-codex-companion';
import { createAutopilotDesktopLink, createAutopilotDesktopPrompt } from './codex-handoff';
import {
  AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE,
  isAutopilotErrorKey,
  isAutopilotFeeBudgetError,
  readAutopilotImpactPreflightDiagnostics,
  readAutopilotQualificationDiagnostics,
  type AutopilotImpactPreflightDiagnostics,
  type AutopilotQualificationDiagnostics,
} from './autopilot-diagnostics';
import {
  createAutopilotResearch,
  type AutopilotInput,
  type AutopilotResult,
  type AutopilotResearchOptions,
} from './autopilot';
import type { useBotTrading } from './controller';
import type { BotFundingPreview } from './live';
import type { ExperimentRunnerOptions } from './research-runner';
import type { BotDefinition, BotProvider } from './types';
import { GOAL_EXACT_XOR } from './goal-exact-ledger';
import { hasGoalExecutionMarker } from './goal-storage';
import { toCodec } from './amounts';
import { copyBotGoal } from './goals';
import {
  clearAutopilotWatchCheckpoint,
  copyAutopilotWatchFailure,
  copyAutopilotTrainingWatchDiagnostics,
  readAutopilotWatchCheckpoint,
  writeAutopilotWatchCheckpoint,
  type AutopilotWatchCheckpoint,
  type AutopilotWatchRecovery,
} from './autopilot-watch-checkpoint';
import {
  autopilotValidationExposureKey,
  createAutopilotValidationExposureStore,
  type AutopilotValidationExposureStore,
  type AutopilotValidationWindow,
} from './autopilot-exposure';

/** Beginner setup has one public budget and one session unlock; research never grants signing authority. */
export type AutopilotStage = 'welcome' | 'connect' | 'fund' | 'research' | 'watching' | 'review' | 'running';
type ResearchInput = Omit<AutopilotInput, 'assets'>;
const HOUR = 3_600_000;
const WATCH_INTERVAL = 60_000;
const AUTOMATIC_RETRY_ERRORS = new Set([
  'bots.errors.stale',
  'bots.errors.quote',
  'bots.codex.expired',
  'bots.autopilot.errors.historyUnavailable',
]);
type Trading = ReturnType<typeof useBotTrading>;
type AutopilotTrading = Pick<
  Trading,
  | 'assets'
  | 'bots'
  | 'walletConnected'
  | 'externalWallet'
  | 'connectionIdentity'
  | 'sessionActiveIds'
  | 'readConnectionIdentity'
  | 'readNetworkIdentity'
  | 'prepareLiveBot'
  | 'previewLiveFunding'
  | 'saveLiveBot'
  | 'discardLiveReview'
  | 'startBot'
  | 'pauseBot'
  | 'stopBot'
> &
  Partial<
    Pick<
      Trading,
      'exactGoalAvailable' | 'refreshGoalReview' | 'approveGoalReview' | 'discardGoalReview' | 'resumeGoalReview'
    >
  >;
interface AutopilotDependencies {
  trading: AutopilotTrading;
  loadHistory: AutopilotResearchOptions['loadHistory'];
  loadFees: ExperimentRunnerOptions['loadFees'];
  ai?: typeof createBotAiClient;
  desktopAi?: typeof createDesktopAiClient;
  desktopSupport?: typeof isDesktopAiSupported;
  companion?: typeof createLocalCodexCompanion;
  research?: typeof createAutopilotResearch;
  /** Open the existing wallet selector; the connected-wallet ref confirms completion. */
  requestWallet?: () => void | Promise<void>;
  /** Metadata-only indexed readiness; absence disables automatic opportunity watching. */
  readResearchReadiness?: (
    input: ResearchInput,
    signal: AbortSignal
  ) => Promise<{ completedThrough: number; validationFrom: number } | null>;
  /** Injectable only to isolate durable holdout exposure in offline tests. */
  validationExposureStore?: AutopilotValidationExposureStore;
}

/** Coordinate provider credentials, automatic research and an exact, expiring live-funding review. */
export function useAutopilot(deps: AutopilotDependencies) {
  const { trading } = deps;
  const exposureStore = deps.validationExposureStore ?? createAutopilotValidationExposureStore();
  const stage = ref<AutopilotStage>('welcome');
  const busy = ref(false);
  const error = ref('');
  const diagnostics = ref<AutopilotQualificationDiagnostics | null>(null);
  const diagnosticsCompletedThrough = ref<number | null>(null);
  const progress = ref('');
  const aiLabel = ref('');
  const desktopSupported = ref(false);
  const desktopConnecting = ref(false);
  const desktopConnected = ref(false);
  const desktopConnectionId = ref('');
  const desktopContext = ref('');
  const desktopPending = ref(false);
  const desktopMode = ref(false);
  const companionConnected = ref(false);
  const companionPairing = ref(false);
  const companionError = ref('');
  const awaitingWallet = ref(false);
  const watching = computed(() => stage.value === 'watching');
  const watchNextCheckAt = ref<number | null>(null);
  const recoverableWatch = ref<AutopilotWatchCheckpoint | null>(readAutopilotWatchCheckpoint());
  const canResumeWatch = computed(() => Boolean(recoverableWatch.value && ['welcome', 'fund'].includes(stage.value)));
  const desktopPrompt = computed(() => desktopHandoff('prompt'));
  const desktopLink = computed(() => desktopHandoff('link'));
  const reviewBot = ref<BotDefinition | null>(null);
  const funding = ref<BotFundingPreview | null>(null);
  const selectedId = ref('');
  const selectedBot = computed(
    () =>
      trading.bots.value.find((bot) => bot.id === selectedId.value) ??
      (recoverableWatch.value ? null : trading.bots.value.find((bot) => bot.mode === 'live' && bot.goal)) ??
      null
  );
  let client: BotAiClient | null = null;
  let desktopBridge: DesktopAiClient | null = null;
  let companionClient: LocalCodexCompanion | null = null;
  let companionPairAbort: AbortController | null = null;
  let companionDraftAbort: AbortController | null = null;
  let companionRequestId = '';
  let lifetime: AbortController | null = null;
  let generation = 0;
  let disposed = false;
  let reviewIdentity = '';
  let savedId = '';
  let startingId = '';
  let resuming = false;
  let preparedSource: AutopilotResult | null = null;
  let desktopRegistration: Promise<void> | null = null;
  let supportTimer: ReturnType<typeof setInterval> | undefined;
  let goIntent: Omit<AutopilotInput, 'assets'> | null = null;
  let assistantKind: BotProvider | 'desktop' | null = null;
  let exactReviewId = '';
  type ResearchAttempt = {
    generation: number;
    input: Readonly<ResearchInput>;
    identity: string;
    network: string;
    pair: string;
    legacyPair: string;
    completedThrough?: number;
    validationFrom?: number;
    minimumCompletedThrough?: number;
  };
  type OpportunityWatch = ResearchAttempt & { completedThrough: number; abort: AbortController };
  type RetainedResearchRetry = { plan: OpportunityWatch; completedThrough: number; validationFrom: number };
  let attempt: ResearchAttempt | null = null;
  let opportunityWatch: OpportunityWatch | null = null;
  let watchTimer: ReturnType<typeof setTimeout> | undefined;
  let transientNodeRecovery: { identity: string; network: string; checkpoint: AutopilotWatchCheckpoint } | null = null;
  // The map retains diagnostics; IndexedDB is the authority across view lifetimes and tabs.
  const validationExposure = new Map<
    string,
    { from: number; to: number; diagnostics?: AutopilotQualificationDiagnostics }
  >();
  const validationWait = new Error('bots.errors.stale');

  /** Retain the newest durable boundary without discarding same-window diagnostics. */
  function mergeExposure(pair: string, stored: AutopilotValidationWindow | null): void {
    if (!stored) return;
    const current = validationExposure.get(pair);
    if (
      !current ||
      stored.to > current.to ||
      (stored.from === current.from && stored.to === current.to && !current.diagnostics && stored.diagnostics)
    )
      validationExposure.set(pair, stored);
  }

  /** Read shared exposure before drafting or scheduling against a possibly stale tab-local map. */
  async function refreshExposure(pair: string): Promise<void> {
    mergeExposure(pair, await exposureStore.read(pair));
  }

  /** Accept only actual completed hourly boundaries, never a wall-clock substitute for prepared history. */
  const completedHour = (value: number) =>
    Number.isSafeInteger(value) && value > 0 && value % HOUR === 0 && value <= Math.floor(Date.now() / HOUR) * HOUR;

  /** Revalidate restored public limits against today's asset metadata before offering recovery. */
  function validWatchInput(input: ResearchInput): boolean {
    try {
      const assetIn = trading.assets.value.find((asset) => asset.address === input.assetInAddress);
      const assetOut = trading.assets.value.find((asset) => asset.address === input.assetOutAddress);
      if (!assetIn || !assetOut || assetIn.address === assetOut.address) return false;
      const capital = BigInt(toCodec(input.capital, assetIn.decimals));
      const reserve = BigInt(toCodec(input.feeBudgetXor, 18));
      if (capital < 2n || reserve <= 0n || (assetIn.address === GOAL_EXACT_XOR && capital - reserve < 2n)) return false;
      copyBotGoal({
        title: input.title,
        targetReturnPercent: input.targetReturnPercent,
        maxLossPercent: input.maxLossPercent,
        durationMs: 86_400_000,
        ...(input.valuationAsset === undefined ? {} : { valuationAsset: input.valuationAsset }),
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Recovery never contains a client, signer, pending mailbox, or approval. */
  function forgetWatchCheckpoint(): void {
    recoverableWatch.value = null;
    clearAutopilotWatchCheckpoint();
  }

  /** Revalidate only the known bounded public checkpoint; never adopt a replacement or renew its expiry. */
  function readRetainedWatchCheckpoint(): AutopilotWatchCheckpoint | null {
    const checkpoint = recoverableWatch.value;
    const retained = checkpoint ? readAutopilotWatchCheckpoint() : null;
    return retained && JSON.stringify(retained) === JSON.stringify(checkpoint) ? retained : null;
  }

  /** Persist the last claimed hour before external research can begin. */
  function checkpointWatch(
    plan: OpportunityWatch,
    completedThrough = plan.completedThrough,
    failure?: { errorKey: string; completedThrough: number; preflight?: AutopilotImpactPreflightDiagnostics }
  ): boolean {
    if (!assistantKind || !completedHour(completedThrough)) {
      forgetWatchCheckpoint();
      return false;
    }
    const checkpoint: AutopilotWatchCheckpoint = {
      version: 1,
      savedAt: Date.now(),
      identity: plan.identity,
      network: plan.network,
      assistantKind,
      input: { ...plan.input },
      lastAttemptedCompletedThrough: completedThrough,
    };
    const retained = recoverableWatch.value;
    const sameIntent =
      retained !== null &&
      retained.identity === plan.identity &&
      retained.network === plan.network &&
      retained.assistantKind === assistantKind &&
      JSON.stringify(retained.input) === JSON.stringify(plan.input);
    const trainingDiagnostics =
      (diagnosticsCompletedThrough.value !== null && diagnosticsCompletedThrough.value <= completedThrough
        ? copyAutopilotTrainingWatchDiagnostics(diagnostics.value, diagnosticsCompletedThrough.value, checkpoint)
        : null) ??
      (sameIntent && retained?.trainingDiagnostics
        ? copyAutopilotTrainingWatchDiagnostics(
            retained.trainingDiagnostics,
            retained.trainingDiagnostics.completedThrough,
            checkpoint
          )
        : null);
    if (trainingDiagnostics) checkpoint.trainingDiagnostics = trainingDiagnostics;
    const lastFailure =
      (failure
        ? copyAutopilotWatchFailure(failure.errorKey, failure.completedThrough, checkpoint, failure.preflight)
        : null) ??
      (sameIntent && retained?.lastFailure
        ? copyAutopilotWatchFailure(
            retained.lastFailure.errorKey,
            retained.lastFailure.completedThrough,
            checkpoint,
            retained.lastFailure.preflight
          )
        : null);
    if (lastFailure) checkpoint.lastFailure = lastFailure;
    if (writeAutopilotWatchCheckpoint(checkpoint)) {
      recoverableWatch.value = checkpoint;
      return true;
    }
    forgetWatchCheckpoint();
    return false;
  }

  /** Wait for the node to reconnect before treating an intermediate network identity as a mismatch. */
  function networkIdentityReady(): boolean {
    let network: string;
    try {
      network = trading.readNetworkIdentity();
    } catch {
      return false;
    }
    try {
      const identity: unknown = JSON.parse(network);
      return !Array.isArray(identity) || identity[0] === true;
    } catch {
      return true;
    }
  }

  /** Recover a paused watch for the same wallet and chain after a fresh node handshake. */
  function recoveryIdentity(identity: string, network: string): { structured: boolean; key: string | null } {
    let connection: unknown;
    try {
      connection = JSON.parse(identity);
    } catch {
      const text = identity.trimStart();
      return { structured: /^(?:\[|[{"\d-]|true\b|false\b|null\b)/.test(text), key: null };
    }
    if (!Array.isArray(connection)) return { structured: true, key: null };
    try {
      const node: unknown = JSON.parse(network);
      if (
        connection.length !== 7 ||
        connection[0] !== true ||
        connection[3] !== true ||
        typeof connection[1] !== 'string' ||
        !connection[1] ||
        typeof connection[2] !== 'string' ||
        !connection[2] ||
        typeof connection[4] !== 'string' ||
        !connection[4] ||
        typeof connection[5] !== 'string' ||
        !Number.isSafeInteger(connection[6]) ||
        connection[6] <= 0 ||
        !Array.isArray(node) ||
        node.length !== 4 ||
        node[0] !== true ||
        node[1] !== connection[4] ||
        node[2] !== connection[5] ||
        node[3] !== connection[6]
      )
        return { structured: true, key: null };
      return { structured: true, key: JSON.stringify([connection[1], connection[2], connection[4]]) };
    } catch {
      return { structured: true, key: null };
    }
  }

  /** Match stable public authority while retaining full live identity for the active watch. */
  function checkpointIdentityMatches(checkpoint: AutopilotWatchCheckpoint): boolean {
    try {
      const identity = trading.readConnectionIdentity();
      const network = trading.readNetworkIdentity();
      const saved = recoveryIdentity(checkpoint.identity, checkpoint.network);
      const current = recoveryIdentity(identity, network);
      if (saved.structured || current.structured) return Boolean(saved.key && saved.key === current.key);
      return checkpoint.identity === identity && checkpoint.network === network;
    } catch {
      return false;
    }
  }

  const recoverableWatchInput = computed(() => {
    void trading.connectionIdentity.value;
    const checkpoint = recoverableWatch.value;
    if (
      !checkpoint ||
      !trading.walletConnected.value ||
      !networkIdentityReady() ||
      !checkpointIdentityMatches(checkpoint) ||
      !validWatchInput(checkpoint.input)
    )
      return null;
    return checkpoint.input;
  });

  /** Show the original unsigned plan even while another wallet is connected; resume remains identity-gated. */
  const watchRecovery = computed<AutopilotWatchRecovery | null>(() => {
    const checkpoint = recoverableWatch.value;
    if (!checkpoint) return null;
    let walletAddress = '';
    try {
      const identity: unknown = JSON.parse(checkpoint.identity);
      if (Array.isArray(identity) && recoveryIdentity(checkpoint.identity, checkpoint.network).key)
        walletAddress = identity[1];
    } catch {
      // Older opaque identities have no separately displayable public account.
    }
    return {
      input: Object.freeze({ ...checkpoint.input }),
      walletAddress,
      ...(checkpoint.trainingDiagnostics ? { trainingDiagnostics: checkpoint.trainingDiagnostics } : {}),
      ...(checkpoint.lastFailure ? { lastFailure: checkpoint.lastFailure } : {}),
    };
  });

  /** Revoke timer and metadata reads without disconnecting the retained AI client. */
  function stopWatching(): void {
    clearTimeout(watchTimer);
    watchTimer = undefined;
    opportunityWatch?.abort.abort();
    opportunityWatch = null;
    watchNextCheckAt.value = null;
  }

  /** Preserve the fixed split's full reserved span before permitting a new automatic draft. */
  function nextEligibleHour(plan: OpportunityWatch): number {
    const exposed = validationExposure.get(plan.pair);
    return Math.max(plan.completedThrough + HOUR, exposed ? exposed.to + (exposed.to - exposed.from) + HOUR : 0);
  }

  /** Schedule one check; only explicit recovery may check an already eligible hour immediately. */
  function scheduleWatch(plan: OpportunityWatch, catchUp = false): void {
    if (disposed || opportunityWatch !== plan || plan.abort.signal.aborted || stage.value !== 'watching') return;
    clearTimeout(watchTimer);
    const now = Date.now();
    const eligibleAt = nextEligibleHour(plan);
    const at = catchUp && eligibleAt <= now ? now : Math.max(now + WATCH_INTERVAL, eligibleAt);
    watchNextCheckAt.value = at;
    const timer = setTimeout(() => {
      if (watchTimer === timer) void checkOpportunity(plan);
    }, at - Date.now());
    watchTimer = timer;
  }

  /** Check an overdue unsigned watch once when a suspended page becomes active again. */
  function wakeWatch(): void {
    const plan = opportunityWatch;
    if (
      disposed ||
      document.hidden ||
      !plan ||
      plan.abort.signal.aborted ||
      stage.value !== 'watching' ||
      watchTimer === undefined ||
      watchNextCheckAt.value === null ||
      Date.now() < watchNextCheckAt.value
    )
      return;
    clearTimeout(watchTimer);
    watchTimer = undefined;
    watchNextCheckAt.value = null;
    void checkOpportunity(plan);
  }

  /** A disconnected or unreadable wallet/network identity cannot continue an unsigned watch. */
  function watchIdentityMatches(plan: OpportunityWatch): boolean {
    try {
      return Boolean(
        client &&
        trading.walletConnected.value &&
        (!desktopMode.value || desktopConnected.value) &&
        plan.identity === trading.readConnectionIdentity() &&
        plan.network === trading.readNetworkIdentity()
      );
    } catch {
      return false;
    }
  }

  /** Resolve a still-current expired desktop request; exposed validation cannot be reused by refreshing. */
  function refreshableDesktopPlan(): OpportunityWatch | null {
    const plan = opportunityWatch;
    if (
      disposed ||
      stage.value !== 'watching' ||
      busy.value ||
      !desktopMode.value ||
      !desktopConnected.value ||
      error.value !== 'bots.codex.expired' ||
      !plan ||
      plan.abort.signal.aborted ||
      !watchIdentityMatches(plan) ||
      !completedHour(plan.completedThrough) ||
      plan.validationFrom === undefined ||
      !completedHour(plan.validationFrom)
    )
      return null;
    const exposed = validationExposure.get(plan.pair);
    return exposed && plan.validationFrom <= exposed.to ? null : plan;
  }
  const canRefreshDesktopRequest = computed(() => Boolean(refreshableDesktopPlan()));

  /** Explicitly replace an expired mailbox using the retained input and fresh research, never its old response. */
  async function refreshDesktopRequest(): Promise<void> {
    // Check again on activation: connection readers need not be reactive dependencies of the visible button.
    const plan = refreshableDesktopPlan();
    if (!plan) return;
    await runResearch(
      { ...plan.input },
      {
        plan,
        completedThrough: plan.completedThrough,
        validationFrom: plan.validationFrom!,
      }
    );
  }

  /** Explicitly rearm a reloaded unsigned watch after reconnecting the same wallet and assistant. */
  async function resumeWatch(): Promise<void> {
    const checkpoint = recoverableWatch.value;
    if (!checkpoint || disposed || busy.value || !['welcome', 'fund'].includes(stage.value)) return;
    if (!readRetainedWatchCheckpoint()) {
      forgetWatchCheckpoint();
      error.value = 'bots.errors.session';
      return;
    }
    if (!trading.walletConnected.value) {
      try {
        await deps.requestWallet?.();
      } catch (value) {
        failure(value, 'bots.errors.wallet');
      }
      return;
    }
    if (!networkIdentityReady()) return;
    if (!checkpointIdentityMatches(checkpoint)) {
      error.value = 'bots.errors.session';
      return;
    }
    // Asset hydration is asynchronous; an early resume cannot erase the original account's public plan.
    if (
      ![checkpoint.input.assetInAddress, checkpoint.input.assetOutAddress].every((address) =>
        trading.assets.value.some((asset) => asset.address === address)
      )
    )
      return;
    if (!validWatchInput(checkpoint.input)) {
      forgetWatchCheckpoint();
      error.value = 'bots.errors.session';
      return;
    }
    if (!client || (checkpoint.assistantKind === 'desktop' && !desktopConnected.value)) {
      if (checkpoint.assistantKind === 'desktop') await connectDesktop();
      else stage.value = 'connect';
      return;
    }
    if (assistantKind !== checkpoint.assistantKind) {
      error.value = 'bots.autopilot.errors.connection';
      return;
    }
    const version = generation;
    busy.value = true;
    error.value = '';
    try {
      const identity = trading.readConnectionIdentity();
      const network = trading.readNetworkIdentity();
      const pair = autopilotValidationExposureKey(
        network,
        checkpoint.input.assetInAddress,
        checkpoint.input.assetOutAddress
      );
      const legacyPair = JSON.stringify([
        network,
        ...[checkpoint.input.assetInAddress, checkpoint.input.assetOutAddress].sort(),
      ]);
      await refreshExposure(pair);
      if (disposed || version !== generation || recoverableWatch.value !== checkpoint) return;
      if (!readRetainedWatchCheckpoint()) {
        forgetWatchCheckpoint();
        error.value = 'bots.errors.session';
        return;
      }
      if (identity !== trading.readConnectionIdentity() || network !== trading.readNetworkIdentity()) {
        error.value = 'bots.errors.session';
        return;
      }
      if (
        !trading.walletConnected.value ||
        !checkpointIdentityMatches(checkpoint) ||
        assistantKind !== checkpoint.assistantKind
      ) {
        error.value = 'bots.errors.session';
        return;
      }
      const exposed = validationExposure.get(pair);
      diagnostics.value = null;
      diagnosticsCompletedThrough.value = null;
      if (exposed?.to === checkpoint.lastAttemptedCompletedThrough && exposed.diagnostics) {
        diagnostics.value = exposed.diagnostics;
        diagnosticsCompletedThrough.value = exposed.to;
        error.value = 'bots.autopilot.errors.validationRejected';
      } else if (
        checkpoint.lastFailure &&
        checkpoint.lastFailure.completedThrough > (checkpoint.trainingDiagnostics?.completedThrough ?? 0)
      ) {
        // Quote/opening figures remain memory-only; the checked hour and known error survive this tab's reload.
        error.value = checkpoint.lastFailure.errorKey;
        diagnosticsCompletedThrough.value = checkpoint.lastFailure.completedThrough;
      } else if (checkpoint.trainingDiagnostics) {
        diagnostics.value = {
          stage: 'training',
          failures: checkpoint.trainingDiagnostics.failures,
          ...(checkpoint.trainingDiagnostics.screening ? { screening: checkpoint.trainingDiagnostics.screening } : {}),
        };
        diagnosticsCompletedThrough.value = checkpoint.trainingDiagnostics.completedThrough;
        error.value = checkpoint.trainingDiagnostics.failures.length
          ? 'bots.autopilot.errors.trainingRejected'
          : 'bots.autopilot.errors.screeningRejected';
      }
      // The durable claim, written before research, prevents replay without hiding unattempted indexed hours.
      const completedThrough = checkpoint.lastAttemptedCompletedThrough;
      const plan: OpportunityWatch = {
        generation: version,
        input: Object.freeze({ ...checkpoint.input }),
        identity,
        network,
        pair,
        legacyPair,
        completedThrough,
        abort: new AbortController(),
      };
      checkpointWatch(plan);
      if (!recoverableWatch.value) {
        error.value = 'bots.errors.storage';
        return;
      }
      opportunityWatch = plan;
      stage.value = 'watching';
      scheduleWatch(plan, true);
    } catch (value) {
      failure(value, 'bots.errors.storage');
    } finally {
      if (version === generation) busy.value = false;
    }
  }

  /** New indexed data can restart unsigned research; readiness never creates a review or authorizes a trade. */
  async function checkOpportunity(plan: OpportunityWatch): Promise<void> {
    watchTimer = undefined;
    if (disposed || opportunityWatch !== plan || plan.abort.signal.aborted || stage.value !== 'watching') return;
    if (!watchIdentityMatches(plan)) {
      cancel();
      return;
    }
    if (busy.value || Date.now() < nextEligibleHour(plan)) {
      scheduleWatch(plan);
      return;
    }
    watchNextCheckAt.value = null;
    try {
      await refreshExposure(plan.pair);
      if (disposed || opportunityWatch !== plan || plan.abort.signal.aborted || !watchIdentityMatches(plan)) return;
      if (Date.now() < nextEligibleHour(plan)) return;
      const ready = await deps.readResearchReadiness!({ ...plan.input }, plan.abort.signal);
      if (disposed || opportunityWatch !== plan || plan.abort.signal.aborted) return;
      if (!watchIdentityMatches(plan)) {
        cancel();
        return;
      }
      const exposed = validationExposure.get(plan.pair);
      if (
        !ready ||
        !completedHour(ready.completedThrough) ||
        !completedHour(ready.validationFrom) ||
        ready.validationFrom > ready.completedThrough ||
        ready.completedThrough <= plan.completedThrough ||
        (exposed && ready.validationFrom <= exposed.to)
      )
        return;
      // A failed tab-scoped checkpoint cannot protect this hour from replay after reload.
      if (!checkpointWatch(plan, ready.completedThrough)) throw new Error('bots.errors.storage');
      await runResearch({ ...plan.input }, { plan, ...ready });
    } catch (reason) {
      if (reason instanceof Error && reason.message === 'bots.errors.storage' && opportunityWatch === plan) {
        stopWatching();
        forgetWatchCheckpoint();
        stage.value = 'fund';
        failure(reason, 'bots.errors.storage');
      }
      // A failed read supplies no opportunity evidence. Keep the same plan and coarse polling cadence.
    } finally {
      if (opportunityWatch === plan) scheduleWatch(plan);
    }
  }
  const researcher = (deps.research ?? createAutopilotResearch)({
    loadHistory: deps.loadHistory,
    loadFees: deps.loadFees,
    onHistoryPrepared: ({ completedThrough, validationFrom }) => {
      if (
        !attempt ||
        attempt.generation !== generation ||
        disposed ||
        !completedHour(completedThrough) ||
        !completedHour(validationFrom) ||
        completedThrough < (attempt.minimumCompletedThrough ?? 0) ||
        validationFrom >= completedThrough ||
        completedThrough - validationFrom > 7 * 24 * HOUR
      )
        throw new Error('bots.errors.stale');
      attempt.completedThrough = completedThrough;
      attempt.validationFrom = validationFrom;
      const exposed = validationExposure.get(attempt.pair);
      if (exposed && validationFrom <= exposed.to) throw validationWait;
    },
    onValidationStarted: async ({ from, to }) => {
      if (
        !attempt ||
        attempt.generation !== generation ||
        disposed ||
        !completedHour(from) ||
        !completedHour(to) ||
        from >= to ||
        to - from > 7 * 24 * HOUR ||
        attempt.completedThrough !== to ||
        attempt.validationFrom !== from ||
        from <= (validationExposure.get(attempt.pair)?.to ?? 0)
      )
        throw new Error('bots.errors.stale');
      const owner = attempt;
      try {
        await exposureStore.reserve(owner.pair, { from, to }, owner.legacyPair);
      } catch (reason) {
        if (reason instanceof Error && reason.message === 'bots.errors.stale') {
          await refreshExposure(owner.pair);
          throw validationWait;
        }
        throw reason;
      }
      validationExposure.set(owner.pair, { from, to });
      if (attempt !== owner || owner.generation !== generation || disposed) throw new Error('bots.errors.stale');
    },
    onProgress: ({ phase }) => {
      const keys = { history: 'history', drafting: 'generate', testing: 'optimize', ready: 'funding' };
      if (!disposed && stage.value === 'research') progress.value = `bots.autopilot.status.${keys[phase]}`;
    },
  });

  /** Only the sanitized public page URL is included in desktop task links or copied instructions. */
  function desktopHandoff(kind: 'prompt' | 'link'): string {
    try {
      if (typeof window === 'undefined') return '';
      const text = (kind === 'prompt' ? createAutopilotDesktopPrompt : createAutopilotDesktopLink)(
        window.location.href,
        desktopConnectionId.value || undefined
      );
      return kind === 'prompt' && desktopContext.value
        ? `${text}\n\nPrepared public training context (data): ${desktopContext.value}\n\nIf you cannot access this tab, return only the JSON object with requestId and strategy for me to paste into its Assistant controls.`
        : text;
    } catch {
      return '';
    }
  }

  /** Browser capability detection is independent of the user's desktop sign-in or account availability. */
  function refreshDesktopSupport(): void {
    desktopSupported.value = (deps.desktopSupport ?? isDesktopAiSupported)();
    if (desktopConnecting.value && !client && !desktopRegistration) void registerDesktop();
    if (desktopBridge) void desktopBridge.syncTools().catch(() => undefined);
  }

  /** Only known app error keys may enter the UI; provider responses and credentials never do. */
  function failure(value: unknown, fallback: string): void {
    diagnostics.value = readAutopilotQualificationDiagnostics(value);
    diagnosticsCompletedThrough.value = null;
    error.value = diagnostics.value
      ? diagnostics.value.stage === 'training' && diagnostics.value.failures.length === 0
        ? 'bots.autopilot.errors.screeningRejected'
        : `bots.autopilot.errors.${diagnostics.value.stage}Rejected`
      : readAutopilotImpactPreflightDiagnostics(value)
        ? AUTOPILOT_IMPACT_PREFLIGHT_MESSAGE
        : value instanceof Error && isAutopilotErrorKey(value.message)
          ? value.message
          : fallback;
  }

  /** Cancel a superseded public request before its local model response can reach the mailbox. */
  function stopCompanionDraft(): void {
    companionDraftAbort?.abort();
    companionDraftAbort = null;
    companionRequestId = '';
  }

  /** Forget the bearer on explicit disconnect or view exit; no pairing material is persisted. */
  function clearCompanion(): void {
    stopCompanionDraft();
    companionPairAbort?.abort();
    companionPairAbort = null;
    companionClient?.disconnect();
    companionClient = null;
    companionConnected.value = false;
    companionPairing.value = false;
    companionError.value = '';
  }

  /** A paired companion may answer new hourly contexts, but only while this exact request remains pending. */
  function draftWithCompanion(context: DesktopAiContext): void {
    const companion = companionClient;
    const bridge = desktopBridge;
    if (!companion || !bridge || !desktopPending.value || stage.value !== 'research') return;
    const controller = new AbortController();
    const version = generation;
    const connectionId = desktopConnectionId.value;
    companionDraftAbort = controller;
    companionRequestId = context.requestId;
    companionError.value = '';
    const current = () =>
      !disposed &&
      !controller.signal.aborted &&
      version === generation &&
      companion === companionClient &&
      bridge === desktopBridge &&
      connectionId === desktopConnectionId.value &&
      companionRequestId === context.requestId &&
      desktopPending.value &&
      stage.value === 'research';
    void companion
      .draft(context, controller.signal)
      .then(async (draft) => {
        if (!current() || draft.requestId !== context.requestId) return;
        await bridge.submitDraft(draft);
      })
      .catch((reason: unknown) => {
        if (!current()) return;
        if (
          reason instanceof CompanionRequestError &&
          (reason.reason === 'unauthorized' || reason.reason === 'unavailable')
        ) {
          companion.disconnect();
          companionClient = null;
          companionConnected.value = false;
          companionError.value =
            reason.reason === 'unauthorized'
              ? 'bots.autopilot.companion.pairAgain'
              : 'bots.autopilot.companion.offline';
        } else {
          companionError.value =
            reason instanceof CompanionRequestError && reason.reason === 'usageLimit'
              ? 'bots.autopilot.companion.usageLimit'
              : 'bots.autopilot.companion.draftError';
        }
      })
      .finally(() => {
        if (companionDraftAbort === controller) companionDraftAbort = null;
      });
  }

  /** Retry a failed read-only draft for the same still-pending, unexpired page request. */
  function retryCompanionDraft(): void {
    if (
      !companionClient ||
      !desktopBridge ||
      !desktopPending.value ||
      stage.value !== 'research' ||
      companionDraftAbort
    )
      return;
    try {
      draftWithCompanion(desktopBridge.readContext());
    } catch {
      companionError.value = 'bots.autopilot.companion.draftError';
    }
  }

  /** Discard unsigned work and abort paid requests; an already authorized session remains separately stoppable. */
  function resetWork(preserveIntent = false, preserveWatchCheckpoint = false): void {
    transientNodeRecovery = null;
    stopWatching();
    stopCompanionDraft();
    // Cancel a pending reconnect without disconnecting an established assistant session.
    companionPairAbort?.abort();
    companionPairAbort = null;
    companionPairing.value = false;
    if (!preserveIntent) goIntent = null;
    if (!preserveWatchCheckpoint) forgetWatchCheckpoint();
    awaitingWallet.value = false;
    generation++;
    attempt = null;
    if (desktopConnecting.value) {
      clearCompanion();
      desktopConnecting.value = false;
      desktopConnected.value = false;
      desktopConnectionId.value = '';
      desktopMode.value = false;
      client?.disconnect();
      client = null;
      desktopBridge = null;
      aiLabel.value = '';
      assistantKind = null;
    }
    lifetime?.abort();
    lifetime = null;
    researcher.cancel();
    if (startingId) void trading.stopBot(startingId).catch(() => undefined);
    startingId = '';
    if (exactReviewId) trading.discardGoalReview?.(exactReviewId);
    else if (reviewBot.value && !resuming) {
      trading.discardLiveReview(reviewBot.value.id);
    }
    reviewBot.value = null;
    funding.value = null;
    reviewIdentity = '';
    savedId = '';
    resuming = false;
    preparedSource = null;
    exactReviewId = '';
    desktopPending.value = false;
    desktopContext.value = '';
    busy.value = false;
    error.value = '';
    diagnostics.value = null;
    diagnosticsCompletedThrough.value = null;
    stage.value = selectedBot.value ? 'running' : client ? 'fund' : 'welcome';
  }

  /** Cancel also revokes a queued GO, so a late connection cannot restart research. */
  function cancel(): void {
    resetWork();
  }

  /** Pause unsigned recovery on navigation without retaining a mailbox or approving a new goal. */
  function pauseForNavigation(): void {
    const retained = readRetainedWatchCheckpoint();
    const preserveCheckpoint = Boolean(retained);
    if (preserveCheckpoint) recoverableWatch.value = retained;
    resetWork(false, preserveCheckpoint);
    disconnectDesktopSession(preserveCheckpoint);
    if (preserveCheckpoint) stage.value = client ? 'fund' : 'welcome';
  }

  /** Continue the submitted amount and pair once prerequisites are ready; never authorize trading. */
  async function continueGo(): Promise<void> {
    if (!goIntent || busy.value || disposed) return;
    if (!trading.walletConnected.value) {
      awaitingWallet.value = true;
      stage.value = 'fund';
      return;
    }
    awaitingWallet.value = false;
    if (!client) {
      if (!desktopConnecting.value && stage.value !== 'connect') await connectDesktop();
      return;
    }
    if (desktopMode.value && !desktopConnected.value) {
      stage.value = 'connect';
      return;
    }
    const input = goIntent;
    goIntent = null;
    await research(input);
  }

  /** One public action saves the exact input budget and output objective across wallet/AI setup. */
  async function go(input: Omit<AutopilotInput, 'assets'>): Promise<void> {
    if (busy.value || disposed) return;
    await begin();
    if (busy.value || error.value || disposed) return;
    goIntent = { ...input, valuationAsset: 'output' };
    if (!trading.walletConnected.value) {
      awaitingWallet.value = true;
      stage.value = 'fund';
      const intent = goIntent;
      try {
        await deps.requestWallet?.();
      } catch (value) {
        if (goIntent === intent) failure(value, 'bots.errors.wallet');
      }
      if (goIntent !== intent) return;
    }
    // begin() can enter the legacy connection chooser; GO starts the handshake directly.
    if (!client && trading.walletConnected.value && goIntent) await connectDesktop();
    await continueGo();
  }

  /** Reuse an in-memory AI connection when setting up another goal. */
  async function begin(): Promise<void> {
    refreshDesktopSupport();
    cancel();
    const previous = selectedBot.value;
    if (previous?.goalState && previous.goalState.outcome !== 'active' && previous.status !== 'stopped') {
      busy.value = true;
      const version = generation;
      try {
        await trading.stopBot(previous.id);
        if (version !== generation) return;
      } catch (value) {
        if (version === generation) failure(value, 'bots.errors.session');
        return;
      } finally {
        if (version === generation) busy.value = false;
      }
    }
    stage.value = client ? 'fund' : 'connect';
  }

  /** Enable a same-tab mailbox; a matching tool call or visible control acknowledges agent contact. */
  async function connectDesktop(): Promise<void> {
    if (busy.value) return;
    if (!desktopConnecting.value) {
      resetWork(true, Boolean(recoverableWatch.value));
      clearCompanion();
      client?.disconnect();
      client = null;
      desktopBridge = null;
      aiLabel.value = '';
      desktopConnected.value = false;
      desktopConnectionId.value = crypto.randomUUID();
      desktopConnecting.value = true;
      desktopMode.value = true;
      assistantKind = 'desktop';
      stage.value = 'connect';
    }
    error.value = '';
    refreshDesktopSupport();
    await desktopRegistration;
  }

  /** Retry late browser-extension injection without replacing the open tab or connection ID. */
  function registerDesktop(): Promise<void> {
    if (desktopRegistration) return desktopRegistration;
    const work = registerDesktopClient();
    desktopRegistration = work;
    void work.finally(() => {
      if (desktopRegistration === work) desktopRegistration = null;
    });
    return work;
  }

  /** Tool availability and a successful agent response are deliberately separate states. */
  async function registerDesktopClient(): Promise<void> {
    const version = generation;
    busy.value = true;
    let pending: DesktopAiClient | null = null;
    let connected: BotAiClient | null = null;
    let acknowledged = false;
    const acknowledge = () => {
      acknowledged = true;
      if (disposed || version !== generation || !desktopConnecting.value || !connected || client !== connected) return;
      desktopConnected.value = true;
      desktopConnecting.value = false;
      aiLabel.value = 'Codex';
      stage.value = 'fund';
    };
    try {
      pending = await (deps.desktopAi ?? createDesktopAiClient)({
        connectionId: desktopConnectionId.value,
        portable: true,
        // Status tools follow the local workflow after the single-use draft is
        // consumed. A saved bot is not evidence of an active signing session.
        readProgress: () => {
          if (disposed || !desktopMode.value || client !== connected) return { state: 'unavailable' };
          if (stage.value === 'research') return { state: 'researching' };
          if (stage.value === 'watching')
            return {
              state: 'watching',
              ...(error.value ? { errorKey: error.value } : {}),
              ...(diagnostics.value ? { diagnostics: diagnostics.value } : {}),
            };
          if (stage.value === 'review') return { state: 'awaiting_review' };
          if (stage.value === 'running') return { state: selectedBot.value ? 'bot_available' : 'unavailable' };
          if (error.value)
            return {
              state: 'research_failed',
              errorKey: error.value,
              ...(diagnostics.value ? { diagnostics: diagnostics.value } : {}),
            };
          return { state: 'awaiting_budget' };
        },
        onAgentConnected: acknowledge,
        onContext: (value) => {
          if (!disposed && desktopMode.value && client === connected) {
            stopCompanionDraft();
            desktopContext.value = value && stage.value === 'research' ? JSON.stringify(value) : '';
            if (value && stage.value === 'research') draftWithCompanion(value);
          }
        },
        onPending: (value) => {
          if (!disposed && desktopMode.value && client === connected) {
            desktopPending.value = value && stage.value === 'research';
            if (!value) stopCompanionDraft();
          }
        },
      });
      if (disposed || version !== generation) return;
      connected = pending;
      desktopBridge = pending;
      client = pending;
      pending = null;
      desktopMode.value = true;
      if (acknowledged) acknowledge();
    } catch {
      if (version === generation) error.value = 'bots.autopilot.errors.desktopUnavailable';
    } finally {
      pending?.disconnect();
      if (version === generation) busy.value = false;
    }
  }

  /** Browser agents without WebMCP acknowledge the same expiring page session through visible controls. */
  async function acknowledgeDesktop(connectionId: string): Promise<void> {
    if (!desktopBridge || !desktopConnecting.value || busy.value) return;
    error.value = '';
    try {
      await desktopBridge.connect({ connectionId });
    } catch (value) {
      failure(value, 'bots.errors.stale');
    }
  }

  /** Bound explicit local pairing to 30 seconds, then acknowledge the same page mailbox. */
  async function pairCompanion(code: string): Promise<void> {
    const reconnecting = desktopMode.value && desktopConnected.value && !companionConnected.value;
    if (
      !desktopBridge ||
      (!desktopConnecting.value && !reconnecting) ||
      (busy.value && !reconnecting) ||
      companionPairing.value
    )
      return;
    const bridge = desktopBridge;
    const connectionId = desktopConnectionId.value;
    const version = generation;
    const controller = new AbortController();
    const candidate = (deps.companion ?? createLocalCodexCompanion)();
    let timedOut = false;
    const pairTimeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30_000);
    companionPairAbort = controller;
    companionPairing.value = true;
    companionError.value = '';
    try {
      await candidate.pair(code, controller.signal);
      clearTimeout(pairTimeout);
      if (
        disposed ||
        controller.signal.aborted ||
        version !== generation ||
        bridge !== desktopBridge ||
        connectionId !== desktopConnectionId.value ||
        (!desktopConnecting.value && !reconnecting)
      )
        return;
      companionClient = candidate;
      companionConnected.value = true;
      await bridge.connect({ connectionId });
      if (reconnecting && desktopPending.value && stage.value === 'research') {
        try {
          draftWithCompanion(bridge.readContext());
        } catch {
          // The pending request may have expired while the user entered a fresh code.
        }
      }
    } catch {
      if ((!controller.signal.aborted || timedOut) && !disposed && version === generation && bridge === desktopBridge)
        companionError.value = 'bots.autopilot.companion.pairError';
      if (companionClient === candidate) {
        companionClient = null;
        companionConnected.value = false;
      }
    } finally {
      clearTimeout(pairTimeout);
      if (companionClient !== candidate) candidate.disconnect();
      if (companionPairAbort === controller) {
        companionPairAbort = null;
        companionPairing.value = false;
      }
    }
  }

  /** A bounded JSON response follows the identical validator and single-use lifecycle as a native tool call. */
  async function submitDesktopDraft(value: string): Promise<void> {
    if (!desktopBridge || !desktopPending.value || stage.value !== 'research') return;
    error.value = '';
    try {
      if (typeof value !== 'string' || value.length > 32768) throw new Error('bots.errors.provider');
      await desktopBridge.submitDraft(JSON.parse(value));
    } catch (reason) {
      failure(reason, 'bots.errors.provider');
    }
  }

  /** Explicit desktop disconnect still discards its unsigned watch and pending setup. */
  function disconnectDesktop(): void {
    disconnectDesktopSession(false);
  }

  /** Navigation alone may keep validated public recovery; trading authority belongs to the executor. */
  function disconnectDesktopSession(preserveWatchCheckpoint: boolean): void {
    if (!desktopMode.value) return;
    clearCompanion();
    const choosingProvider = stage.value === 'connect';
    resetWork(choosingProvider, preserveWatchCheckpoint);
    desktopMode.value = false;
    desktopConnecting.value = false;
    desktopConnected.value = false;
    desktopConnectionId.value = '';
    client?.disconnect();
    client = null;
    desktopBridge = null;
    aiLabel.value = '';
    assistantKind = null;
    if (choosingProvider) stage.value = 'connect';
    else if (stage.value === 'fund') stage.value = 'welcome';
  }

  /** Discover a real available model once; keep the key only inside the client's revocable closure. */
  async function connect(value: { provider: BotProvider; apiKey: string; endpoint: string }): Promise<void> {
    if (busy.value) return;
    clearCompanion();
    resetWork(true, Boolean(recoverableWatch.value));
    stage.value = 'connect';
    const version = generation;
    busy.value = true;
    desktopMode.value = false;
    desktopConnected.value = false;
    desktopConnectionId.value = '';
    client?.disconnect();
    client = null;
    desktopBridge = null;
    aiLabel.value = '';
    assistantKind = null;
    const abort = new AbortController();
    lifetime = abort;
    let pending: BotAiClient | null = null;
    try {
      let model = value.provider === 'jev' ? 'jev-latest' : '';
      pending = (deps.ai ?? createBotAiClient)(value.provider, {
        apiKey: value.apiKey,
        endpoint: value.endpoint,
        model,
      });
      value.apiKey = '';
      if (value.provider === 'openai' || value.provider === 'claude') {
        const models = await pending.listModels(abort.signal);
        const chosen = models.find((entry) => /mini|haiku/.test(entry.id)) ?? models[0];
        if (!chosen) throw new Error('bots.errors.provider');
        model = chosen.id;
        pending.selectModel(model);
      }
      if (version !== generation || disposed || abort.signal.aborted) return;
      client = pending;
      pending = null;
      aiLabel.value = { openai: 'OpenAI', claude: 'Claude', jev: 'Jev', custom: 'AI' }[value.provider];
      assistantKind = value.provider;
      stage.value = 'fund';
    } catch (value) {
      if (version === generation) failure(value, 'bots.autopilot.errors.connection');
    } finally {
      value.apiKey = '';
      pending?.disconnect();
      if (version === generation) busy.value = false;
    }
  }

  /** Resume an existing exact v1 bot with a fresh allocation review; new GO goals use AI research. */
  async function prepareExact(resumeId: string): Promise<void> {
    cancel();
    const version = generation,
      identity = trading.readConnectionIdentity(),
      abort = new AbortController();
    lifetime = abort;
    busy.value = true;
    stage.value = 'research';
    progress.value = 'bots.autopilot.status.funding';
    try {
      const result = await trading.resumeGoalReview!(resumeId, { signal: abort.signal });
      if (disposed || version !== generation || abort.signal.aborted || identity !== trading.readConnectionIdentity()) {
        trading.discardGoalReview?.(result.bot.id);
        return;
      }
      exactReviewId = result.bot.id;
      reviewBot.value = result.bot;
      reviewIdentity = identity;
      funding.value = result.funding;
      stage.value = 'review';
    } catch (value) {
      if (version === generation) {
        stage.value = 'running';
        failure(value, 'bots.autopilot.errors.research');
      }
    } finally {
      if (version === generation) busy.value = false;
    }
  }

  /** Test and freeze a deterministic strategy, then read actual funding without saving or starting a bot. */
  async function research(input: Omit<AutopilotInput, 'assets'>): Promise<void> {
    await runResearch(input);
  }

  /** Automatic attempts and explicit expired-request refreshes retain their verified history lower bound. */
  async function runResearch(input: ResearchInput, retry?: RetainedResearchRetry): Promise<void> {
    if (busy.value || !client || (desktopMode.value && !desktopConnected.value)) return;
    if (retry && !watchIdentityMatches(retry.plan)) {
      cancel();
      return;
    }
    if (!trading.walletConnected.value) {
      error.value = 'bots.errors.wallet';
      return;
    }
    if (retry) resetWork(false, true);
    else cancel();
    const version = generation;
    const identity = trading.readConnectionIdentity();
    const network = trading.readNetworkIdentity();
    let pair: string;
    try {
      pair = autopilotValidationExposureKey(network, input.assetInAddress, input.assetOutAddress);
    } catch (value) {
      failure(value, 'bots.errors.storage');
      return;
    }
    const currentAttempt: ResearchAttempt = {
      generation: version,
      input: Object.freeze({ ...input }),
      identity,
      network,
      pair,
      legacyPair: JSON.stringify([network, ...[input.assetInAddress, input.assetOutAddress].sort()]),
      ...(retry ? { minimumCompletedThrough: retry.completedThrough } : {}),
    };
    attempt = currentAttempt;
    const abort = new AbortController();
    lifetime = abort;
    stage.value = 'research';
    busy.value = true;
    progress.value = 'bots.autopilot.status.history';
    try {
      await refreshExposure(currentAttempt.pair);
      if (disposed || version !== generation || abort.signal.aborted) return;
      const result = await researcher.run(
        { ...currentAttempt.input, assets: trading.assets.value },
        client,
        abort.signal
      );
      if (disposed || version !== generation || abort.signal.aborted) return;
      if (network !== trading.readNetworkIdentity() || identity !== trading.readConnectionIdentity())
        throw new Error('bots.errors.session');
      preparedSource = result;
      const draft = await trading.prepareLiveBot(result.bot, result.research, result.denomination);
      if (version !== generation || identity !== trading.readConnectionIdentity()) {
        trading.discardLiveReview(draft.id);
        return;
      }
      reviewBot.value = draft;
      reviewIdentity = identity;
      funding.value = await trading.previewLiveFunding(draft.id);
      if (version !== generation || identity !== trading.readConnectionIdentity()) return;
      stage.value = 'review';
      forgetWatchCheckpoint();
    } catch (value) {
      if (version === generation) {
        if (reviewBot.value) trading.discardLiveReview(reviewBot.value.id);
        reviewBot.value = null;
        funding.value = null;
        stage.value = 'fund';
        const exposed = validationExposure.get(currentAttempt.pair);
        const waitingForValidation = value === validationWait;
        const impactPreflight = readAutopilotImpactPreflightDiagnostics(value);
        if (waitingForValidation) {
          diagnostics.value = exposed?.diagnostics ?? null;
          // A reused holdout diagnosis belongs to its original exposed hour, not this retry's newer history.
          diagnosticsCompletedThrough.value =
            diagnostics.value && exposed && completedHour(exposed.to) ? exposed.to : null;
          error.value = diagnostics.value
            ? 'bots.autopilot.errors.validationRejected'
            : deps.readResearchReadiness
              ? ''
              : 'bots.autopilot.errors.research';
        } else {
          failure(value, 'bots.autopilot.errors.research');
          // Only the verified history callback can date qualification, quote or trusted fee/impact failure.
          diagnosticsCompletedThrough.value =
            currentAttempt.completedThrough !== undefined &&
            (diagnostics.value ||
              (value instanceof Error && value.message === 'bots.errors.quote') ||
              isAutopilotFeeBudgetError(value) ||
              impactPreflight)
              ? currentAttempt.completedThrough
              : null;
          if (
            diagnostics.value?.stage === 'validation' &&
            exposed &&
            exposed.from === currentAttempt.validationFrom &&
            exposed.to === currentAttempt.completedThrough
          ) {
            validationExposure.set(currentAttempt.pair, { ...exposed, diagnostics: diagnostics.value });
            // Keep the rejection attached to its atomically reserved window across view lifetimes.
            // A newer reservation makes this write stale rather than relabeling another holdout.
            try {
              await exposureStore.saveDiagnostics(
                currentAttempt.pair,
                { from: exposed.from, to: exposed.to },
                diagnostics.value
              );
            } catch {
              // The watermark remains authoritative; retain this explanation for the current view.
            }
            if (version !== generation || disposed) return;
          }
        }
        const retryableRetained = retry && value instanceof Error && AUTOMATIC_RETRY_ERRORS.has(value.message);
        const unquotable = value instanceof Error && value.message === 'bots.errors.quote';
        const feeBudgetFailure = isAutopilotFeeBudgetError(value) && currentAttempt.completedThrough !== undefined;
        const impactPreflightFailure = impactPreflight !== null && currentAttempt.completedThrough !== undefined;
        const expiredDesktop =
          desktopMode.value &&
          desktopConnected.value &&
          value instanceof Error &&
          value.message === 'bots.codex.expired';
        const attemptedThrough = retryableRetained
          ? Math.max(retry.plan.completedThrough, retry.completedThrough, currentAttempt.completedThrough ?? 0)
          : currentAttempt.completedThrough;
        if (
          (diagnostics.value ||
            waitingForValidation ||
            retryableRetained ||
            unquotable ||
            feeBudgetFailure ||
            impactPreflightFailure ||
            expiredDesktop) &&
          deps.readResearchReadiness &&
          attemptedThrough !== undefined &&
          identity === trading.readConnectionIdentity() &&
          network === trading.readNetworkIdentity() &&
          trading.walletConnected.value
        ) {
          const plan: OpportunityWatch = {
            ...currentAttempt,
            completedThrough: attemptedThrough,
            abort: new AbortController(),
          };
          opportunityWatch = plan;
          stage.value = 'watching';
          checkpointWatch(
            plan,
            attemptedThrough,
            currentAttempt.completedThrough !== undefined &&
              ((diagnostics.value?.stage === 'opening' && error.value === 'bots.autopilot.errors.openingRejected') ||
                unquotable ||
                feeBudgetFailure ||
                impactPreflightFailure)
              ? {
                  errorKey: error.value,
                  completedThrough: currentAttempt.completedThrough,
                  ...(impactPreflight ? { preflight: impactPreflight } : {}),
                }
              : undefined
          );
          scheduleWatch(plan);
        } else forgetWatchCheckpoint();
      }
    } finally {
      if (attempt === currentAttempt) attempt = null;
      if (version === generation) busy.value = false;
    }
  }

  /** Refresh a deposit's availability against the reviewed wallet and existing allocated budgets. */
  async function refreshFunding(): Promise<void> {
    if (busy.value || !reviewBot.value || resuming) return;
    const version = generation;
    const id = reviewBot.value.id;
    busy.value = true;
    error.value = '';
    funding.value = null;
    try {
      if (exactReviewId) {
        const result = await trading.refreshGoalReview!(exactReviewId, { signal: lifetime?.signal });
        if (version !== generation) {
          trading.discardGoalReview?.(result.bot.id);
          return;
        }
        reviewBot.value = result.bot;
        funding.value = result.funding;
        return;
      }
      let result: BotFundingPreview;
      try {
        result = await trading.previewLiveFunding(id);
      } catch (value) {
        if (
          !(value instanceof Error) ||
          value.message !== 'bots.errors.session' ||
          !preparedSource ||
          reviewIdentity !== trading.readConnectionIdentity() ||
          version !== generation
        )
          throw value;
        // Deposits can take longer than a review's five-minute lifetime. Renew its quote, never its authorization.
        const source = preparedSource;
        const renewed = await trading.prepareLiveBot(source.bot, source.research, source.denomination);
        if (version !== generation) {
          trading.discardLiveReview(renewed.id);
          return;
        }
        trading.discardLiveReview(id);
        reviewBot.value = renewed;
        savedId = '';
        result = await trading.previewLiveFunding(renewed.id);
      }
      if (version === generation) funding.value = result;
    } catch (value) {
      if (version === generation) failure(value, 'bots.autopilot.errors.research');
    } finally {
      if (version === generation) busy.value = false;
    }
  }

  /** Authorize this reviewed budget; built-in wallets unlock once and external wallets retain their own approvals. */
  async function start(value: { password: string }): Promise<void> {
    if (busy.value || !reviewBot.value || (!resuming && !funding.value?.sufficient)) {
      value.password = '';
      return;
    }
    const version = generation;
    const draft = reviewBot.value;
    const secret = trading.externalWallet.value ? '' : value.password;
    value.password = '';
    busy.value = true;
    error.value = '';
    try {
      if (!trading.walletConnected.value || reviewIdentity !== trading.readConnectionIdentity())
        throw new Error('bots.errors.session');
      if (exactReviewId) {
        const funded = await trading.approveGoalReview!(exactReviewId);
        if (version !== generation) return;
        if (funded.id !== draft.id) throw Error('bots.errors.session');
        savedId = funded.id;
      } else if (!resuming) {
        funding.value = await trading.previewLiveFunding(draft.id);
        if (version !== generation) return;
        if (!funding.value.sufficient) throw new Error('bots.errors.balance');
        savedId ||= await trading.saveLiveBot(draft);
        if (version !== generation) return;
      }
      startingId = draft.id;
      await trading.startBot(draft.id, {
        password: secret,
        ...(!resuming ? { expectedConnection: reviewIdentity } : {}),
      });
      if (version !== generation) {
        await trading.stopBot(draft.id);
        return;
      }
      selectedId.value = draft.id;
      if (exactReviewId) trading.discardGoalReview?.(exactReviewId);
      else trading.discardLiveReview(draft.id);
      reviewBot.value = null;
      funding.value = null;
      savedId = '';
      resuming = false;
      preparedSource = null;
      exactReviewId = '';
      stage.value = 'running';
    } catch (value) {
      if (version === generation) {
        failure(value, 'bots.errors.session');
        if (exactReviewId || (!resuming && value instanceof Error && value.message === 'bots.errors.session'))
          funding.value = null;
      }
    } finally {
      if (startingId === draft.id) startingId = '';
      if (version === generation) busy.value = false;
    }
  }

  /** Paused sessions need a fresh unlock; past research never restores a signing key after reload. */
  async function resume(id: string): Promise<void> {
    if (busy.value) return;
    const bot = trading.bots.value.find((entry) => entry.id === id);
    if (!bot || bot.mode !== 'live' || (bot.goalState && bot.goalState.outcome !== 'active')) return;
    if (hasGoalExecutionMarker(bot)) {
      if (!trading.exactGoalAvailable || !trading.resumeGoalReview) {
        error.value = 'bots.errors.research';
        return;
      }
      selectedId.value = id;
      await prepareExact(id);
      return;
    }
    cancel();
    selectedId.value = id;
    reviewBot.value = JSON.parse(JSON.stringify(bot)) as BotDefinition;
    reviewIdentity = trading.readConnectionIdentity();
    resuming = true;
    funding.value = { sufficient: true, assets: [] };
    stage.value = 'review';
  }

  /** Permit one in-memory watch recovery only when the node's connected bit alone drops. */
  function sameNodeAfterDisconnect(plan: OpportunityWatch, currentIdentity: string): boolean {
    try {
      const original: unknown = JSON.parse(plan.identity);
      const current: unknown = JSON.parse(currentIdentity);
      const originalNetwork: unknown = JSON.parse(plan.network);
      const currentNetwork: unknown = JSON.parse(trading.readNetworkIdentity());
      return Boolean(
        Array.isArray(original) &&
        original.length === 7 &&
        original[0] === true &&
        original[3] === true &&
        Array.isArray(current) &&
        JSON.stringify(current) ===
          JSON.stringify([original[0], original[1], original[2], false, ...original.slice(4)]) &&
        Array.isArray(originalNetwork) &&
        originalNetwork.length === 4 &&
        originalNetwork[0] === true &&
        Array.isArray(currentNetwork) &&
        JSON.stringify(currentNetwork) === JSON.stringify([false, ...originalNetwork.slice(1)])
      );
    } catch {
      return false;
    }
  }

  /** Revoke changed authority, but rearm a watch after an exact same-node reconnection. */
  function pauseForConnectionChange(currentIdentity: string): void {
    const recovery = transientNodeRecovery;
    if (recovery) {
      transientNodeRecovery = null;
      let sameNetwork = false;
      try {
        sameNetwork = trading.readNetworkIdentity() === recovery.network;
      } catch {
        // An unreadable node cannot rearm a watch.
      }
      if (
        !disposed &&
        recoverableWatch.value === recovery.checkpoint &&
        currentIdentity === recovery.identity &&
        sameNetwork &&
        trading.walletConnected.value
      )
        void resumeWatch();
    }
    if (!['research', 'watching', 'review'].includes(stage.value)) return;
    const plan = stage.value === 'watching' ? opportunityWatch : null;
    const checkpoint = recoverableWatch.value;
    const canRearm = Boolean(
      plan &&
      checkpoint &&
      checkpoint.identity === plan.identity &&
      checkpoint.network === plan.network &&
      trading.walletConnected.value &&
      client &&
      (!desktopMode.value || desktopConnected.value) &&
      sameNodeAfterDisconnect(plan, currentIdentity)
    );
    resetWork(false, Boolean(recoverableWatch.value && ['research', 'watching'].includes(stage.value)));
    if (canRearm && plan && checkpoint)
      transientNodeRecovery = { identity: plan.identity, network: plan.network, checkpoint };
  }

  watch(trading.connectionIdentity, pauseForConnectionChange);
  watch(trading.walletConnected, (connected) => {
    if (!connected) {
      transientNodeRecovery = null;
      if (stage.value === 'watching' || (stage.value === 'research' && recoverableWatch.value))
        pauseForConnectionChange(trading.connectionIdentity.value);
    }
  });
  watch([trading.walletConnected, desktopConnected, aiLabel, busy], () => {
    if (goIntent && !busy.value) void continueGo();
  });
  onMounted(() => {
    refreshDesktopSupport();
    window.addEventListener('focus', refreshDesktopSupport);
    window.addEventListener('focus', wakeWatch);
    window.addEventListener('pageshow', wakeWatch);
    document.addEventListener('visibilitychange', wakeWatch);
    supportTimer = setInterval(() => {
      if (desktopMode.value && !disposed) refreshDesktopSupport();
    }, 1000);
  });
  watch(
    selectedBot,
    (bot) => {
      if (bot && stage.value === 'welcome' && !recoverableWatch.value) stage.value = 'running';
    },
    { immediate: true }
  );
  onBeforeUnmount(() => {
    disposed = true;
    clearCompanion();
    // Page teardown retains only unsigned recovery; explicit Cancel, Stop or a new goal discards it.
    resetWork(false, true);
    client?.disconnect();
    client = null;
    desktopBridge = null;
    researcher.dispose();
    clearInterval(supportTimer);
    window.removeEventListener('focus', refreshDesktopSupport);
    window.removeEventListener('focus', wakeWatch);
    window.removeEventListener('pageshow', wakeWatch);
    document.removeEventListener('visibilitychange', wakeWatch);
  });
  return {
    stage,
    busy,
    error,
    diagnostics,
    diagnosticsCompletedThrough,
    progress,
    aiLabel,
    desktopSupported,
    desktopConnecting,
    desktopConnected,
    desktopConnectionId,
    desktopContext,
    desktopPending,
    desktopMode,
    companionConnected,
    companionPairing,
    companionError,
    awaitingWallet,
    watching,
    watchNextCheckAt,
    canResumeWatch,
    recoverableWatchInput,
    watchRecovery,
    canRefreshDesktopRequest,
    desktopLink,
    desktopPrompt,
    reviewBot,
    funding,
    selectedBot,
    begin,
    go,
    connect,
    connectDesktop,
    acknowledgeDesktop,
    pairCompanion,
    retryCompanionDraft,
    submitDesktopDraft,
    disconnectDesktop,
    research,
    refreshDesktopRequest,
    resumeWatch,
    refreshFunding,
    start,
    resume,
    cancel,
    pauseForNavigation,
  };
}
