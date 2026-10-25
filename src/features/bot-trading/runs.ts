/**
 * App-wide host for saved bot runs, shared by the top bar and the Bots page.
 *
 * It loads with the bot controller, so the top bar imports it lazily (see `run-hint.ts`). It:
 * - lists bots that run, will continue or wait for the user, classified by `run-continuity.ts`;
 * - continues interrupted runs that need no secret whenever this tab can run them: once loaded,
 *   when the tab becomes visible, after the browser or wallet reconnects, and twice a minute;
 * - asks the browser to confirm closing the tab while a bot runs in it;
 * - keeps the startup hint in step, so the next visit knows to load it.
 *
 * Usage: `const runs = useBotRuns();` then render `runs.items` and call `pause`, `resume` or `stop`.
 */
import { computed, ref, watch, type Ref } from 'vue';
import { FPNumber } from '@/lib/substrate/math';
import { useBotTrading } from './controller';
import { botRunState, LISTED_RUN_STATES, runHasTimeLeft, type BotRunContext, type BotRunState } from './run-continuity';
import { setBotRunsHint } from './run-hint';
import { readRunsElsewhere } from './run-lock';
import type { BotDefinition } from './types';

/** How often run states, other tabs and interrupted runs are checked. */
export const BOT_RUNS_CHECK_MS = 30_000;

/** One row of the run list. */
export interface BotRunItem {
  id: string;
  name: string;
  mode: BotDefinition['mode'];
  assetIn: string;
  assetOut: string;
  state: BotRunState;
  /** Saved end of the current run; `null` when it has none. */
  endsAt: number | null;
  /** Change in bot value since its first valuation, measured in `assetIn`; `null` before two valuations. */
  returnPercent: string | null;
  /** Account a live bot signs with; shown when that account must be connected. */
  account: string;
  /** A live bot of the built-in wallet: resuming it asks for the wallet password. */
  needsPassword: boolean;
}

type Trading = Pick<
  ReturnType<typeof useBotTrading>,
  | 'bots'
  | 'busy'
  | 'sessionActiveIds'
  | 'walletConnected'
  | 'walletAddress'
  | 'externalWallet'
  | 'connectionIdentity'
  | 'initialize'
  | 'reload'
  | 'continueRuns'
  | 'startBot'
  | 'pauseBot'
  | 'stopBot'
>;

export interface BotRunsOptions {
  now?: () => number;
  readElsewhere?: () => Promise<Set<string>>;
  target?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
  document?: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>;
}

/** Change in value from the first to the latest equity point, exact to two decimals. */
export function runReturnPercent(bot: Pick<BotDefinition, 'equity'>): string | null {
  const points = bot.equity;
  if (points.length < 2) return null;
  const first = new FPNumber(points[0].value);
  if (first.isZero() || first.isNaN()) return null;
  return new FPNumber(points[points.length - 1].value).sub(first).div(first).mul(FPNumber.HUNDRED).toFixed(2);
}

/** Create a run host. Production code uses the shared {@link useBotRuns}; tests inject a controller. */
export function createBotRuns(trading: Trading, options: BotRunsOptions = {}) {
  const now = options.now ?? Date.now;
  const target = options.target ?? window;
  const doc = options.document ?? document;
  const readElsewhere = options.readElsewhere ?? readRunsElsewhere;

  const ready = ref(false);
  const clock = ref(now());
  const elsewhere: Ref<Set<string>> = ref(new Set());
  const failure = ref<{ id: string; message: string } | null>(null);

  const context = computed<BotRunContext>(() => ({
    now: clock.value,
    active: new Set(trading.sessionActiveIds.value),
    elsewhere: elsewhere.value,
    wallet: {
      connected: trading.walletConnected.value,
      address: trading.walletAddress.value,
      external: trading.externalWallet.value,
    },
  }));

  const items = computed<BotRunItem[]>(() =>
    trading.bots.value
      .map((bot) => ({ bot, state: botRunState(bot, context.value) }))
      .filter(({ state }) => LISTED_RUN_STATES.has(state))
      .map(({ bot, state }) => ({
        id: bot.id,
        name: bot.name,
        mode: bot.mode,
        assetIn: bot.assetIn.symbol,
        assetOut: bot.assetOut.symbol,
        state,
        endsAt: bot.sessionExpiresAt > 0 ? bot.sessionExpiresAt : null,
        returnPercent: runReturnPercent(bot),
        account: bot.mode === 'live' ? bot.account : '',
        needsPassword: bot.mode === 'live' && !trading.externalWallet.value,
      }))
  );

  const runningCount = computed(
    () => items.value.filter((item) => ['running', 'elsewhere', 'continuing'].includes(item.state)).length
  );
  const waitingCount = computed(
    () => items.value.filter((item) => ['password', 'wallet', 'open', 'attention'].includes(item.state)).length
  );
  const runningHere = computed(() => trading.sessionActiveIds.value.length > 0);

  let checking = false;
  /** Refresh other-tab locks and saved records, then continue what may continue on its own. */
  async function check(): Promise<void> {
    if (!ready.value || checking) return;
    checking = true;
    try {
      clock.value = now();
      elsewhere.value = await readElsewhere();
      await trading.reload();
      if (!doc.hidden) await trading.continueRuns(elsewhere.value);
    } catch {
      /* Each trigger tries again; nothing here is shown as a page error. */
    } finally {
      checking = false;
    }
  }

  /** Browsers show their own "Leave site?" prompt; custom text is ignored. */
  const confirmLeave = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    event.returnValue = '';
  };
  watch(
    runningHere,
    (running) => {
      if (running) target.addEventListener('beforeunload', confirmLeave);
      else target.removeEventListener('beforeunload', confirmLeave);
    },
    { immediate: true }
  );

  // Only a loaded list may clear the hint; before that the bots are simply unknown.
  watch([ready, items], () => {
    if (ready.value) setBotRunsHint(items.value.length > 0);
  });

  const onVisible = () => {
    if (!doc.hidden) void check();
  };
  const onOnline = () => void check();
  doc.addEventListener('visibilitychange', onVisible);
  target.addEventListener('online', onOnline);
  let identityTimer: ReturnType<typeof setTimeout> | undefined;
  // A wallet or node change can make a waiting live bot continuable; wait for the change to settle.
  watch(trading.connectionIdentity, () => {
    clearTimeout(identityTimer);
    identityTimer = setTimeout(() => void check(), 1_500);
  });
  const interval = setInterval(() => void check(), BOT_RUNS_CHECK_MS);

  const initializing = trading.initialize().then(() => {
    ready.value = true;
    return check();
  });

  /** Run a user action; a failure is kept for the row that caused it. */
  async function act(id: string, action: () => Promise<void>): Promise<boolean> {
    failure.value = null;
    try {
      await action();
      return true;
    } catch (reason) {
      const message =
        reason instanceof Error && /^bots\.[\w.]+$/.test(reason.message) ? reason.message : 'bots.errors.action';
      failure.value = { id, message };
      return false;
    }
  }

  return {
    ready,
    items,
    runningCount,
    waitingCount,
    runningHere,
    busy: trading.busy,
    failure,
    initializing,
    check,
    /** Run state of any saved bot in this tab's context, including bots the list leaves out. */
    stateOf: (bot: BotDefinition): BotRunState => botRunState(bot, context.value),
    pause: (id: string) => act(id, () => trading.pauseBot(id)),
    stop: (id: string) => act(id, () => trading.stopBot(id)),
    /**
     * Resume a paused or interrupted run until its saved end. Live bots of the built-in wallet need
     * the wallet password; it goes straight to the controller and is never stored here.
     */
    resume: (id: string, password?: string) =>
      act(id, async () => {
        const bot = trading.bots.value.find((item) => item.id === id);
        if (!bot || !runHasTimeLeft(bot, now())) throw new Error('bots.errors.runEnded');
        await trading.startBot(id, { continueRun: true, ...(password ? { password } : {}) });
      }),
    dispose() {
      clearInterval(interval);
      clearTimeout(identityTimer);
      doc.removeEventListener('visibilitychange', onVisible);
      target.removeEventListener('online', onOnline);
      target.removeEventListener('beforeunload', confirmLeave);
    },
  };
}

export type BotRuns = ReturnType<typeof createBotRuns>;

let shared: BotRuns | undefined;
/** The one run host of this tab. */
export function useBotRuns(): BotRuns {
  shared ??= createBotRuns(useBotTrading());
  return shared;
}
