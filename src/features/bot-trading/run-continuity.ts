/**
 * What a saved bot's run looks like right now, and whether it may continue on its own.
 *
 * A run ends at `sessionExpiresAt`. Closing or reloading the tab, browser sleep and going
 * offline only interrupt it; continuing keeps that end time, so it never lengthens a run.
 * - Paper bots continue on their own: they hold no signing authority.
 * - Live bots signed by an external wallet continue on their own once the same account is
 *   connected, because that wallet asks the user to approve every swap.
 * - Live bots signed by the built-in wallet need the wallet password again. Polkaswap never
 *   stores it, so these wait for the user.
 * - A bot the user paused stays paused, and an error always waits for the user.
 *
 * The rules are pure so the controller, the app-wide run host and the UI agree.
 */
import { sameBotAccount } from './account-identity';
import { hasGoalExecutionMarker } from './goal-storage';
import type { BotDefinition } from './types';

/** With less time than this left, a run counts as ended: there is nothing useful left to continue. */
export const RUN_CONTINUE_MIN_MS = 60_000;

/** Status event the controller writes when the user pauses a bot. */
const MANUAL_PAUSE_EVENT = 'bots.events.paused';

export type BotRunState =
  /** Running in this tab. */
  | 'running'
  /** Running in another tab of this browser. */
  | 'elsewhere'
  /** Interrupted; continues on its own as soon as this tab can run it. */
  | 'continuing'
  /** Interrupted live bot of the built-in wallet; needs the wallet password. */
  | 'password'
  /** Interrupted live bot whose account is not connected. */
  | 'wallet'
  /** Interrupted bot that must be continued from its page (AI connection, goal or campaign). */
  | 'open'
  /** Paused by the user; resuming keeps the original end time. */
  | 'paused'
  /** Stopped by an error; the activity log explains why. */
  | 'attention'
  /** The run reached its end time. */
  | 'ended'
  /** Saved but never started. */
  | 'idle'
  /** Stopped by the user. */
  | 'stopped';

export interface BotRunContext {
  now: number;
  /** Bots whose session runs in this tab. */
  active: ReadonlySet<string>;
  /** Bots another tab of this browser is running. */
  elsewhere: ReadonlySet<string>;
  wallet: { connected: boolean; address: string; external: boolean };
}

/** States worth showing in the top bar: the bot runs, will run, or waits for the user. */
export const LISTED_RUN_STATES: ReadonlySet<BotRunState> = new Set([
  'running',
  'elsewhere',
  'continuing',
  'password',
  'wallet',
  'open',
  'paused',
  'attention',
]);

/** True when the run has at least {@link RUN_CONTINUE_MIN_MS} left. */
export function runHasTimeLeft(bot: Pick<BotDefinition, 'sessionExpiresAt'>, now: number): boolean {
  return Number.isSafeInteger(bot.sessionExpiresAt) && bot.sessionExpiresAt - now >= RUN_CONTINUE_MIN_MS;
}

/** The user paused it: the newest status event is the manual pause. */
export function pausedByUser(bot: Pick<BotDefinition, 'status' | 'activity'>): boolean {
  return (
    bot.status === 'paused' && bot.activity.find((event) => event.kind === 'status')?.message === MANUAL_PAUSE_EVENT
  );
}

/**
 * The run stopped without the user asking: the tab closed, the browser slept or went offline.
 * A `running` record that no tab runs is also interrupted (the tab closed before it saved).
 */
export function runWasInterrupted(bot: Pick<BotDefinition, 'status' | 'activity'>): boolean {
  return bot.status === 'running' || (bot.status === 'paused' && !pausedByUser(bot));
}

/** Exact-goal, campaign and AI bots continue only from their page (goal runtime, campaign grant, AI key). */
function needsItsPage(bot: BotDefinition): boolean {
  return hasGoalExecutionMarker(bot) || Boolean(bot.discoveryCampaignId) || bot.strategy.kind === 'ai';
}

/** Classify one saved bot for the run list, the top bar and automatic continuation. */
export function botRunState(bot: BotDefinition, context: BotRunContext): BotRunState {
  if (context.active.has(bot.id)) return 'running';
  if (bot.status === 'stopped' || bot.status === 'idle' || bot.status === 'attention') return bot.status;
  if (context.elsewhere.has(bot.id)) return 'elsewhere';
  // A goal that reached its target, loss limit or deadline has finished its run.
  if (!runHasTimeLeft(bot, context.now) || (bot.goalState && bot.goalState.outcome !== 'active')) return 'ended';
  if (!runWasInterrupted(bot)) return 'paused';
  if (needsItsPage(bot)) return 'open';
  if (bot.mode === 'paper') return 'continuing';
  if (!context.wallet.connected || !sameBotAccount(bot.account, context.wallet.address)) return 'wallet';
  return context.wallet.external ? 'continuing' : 'password';
}

/** Only paper bots and external-wallet live bots continue without the user; see the module notes. */
export function continuesOnItsOwn(bot: BotDefinition, context: BotRunContext): boolean {
  return botRunState(bot, context) === 'continuing';
}
