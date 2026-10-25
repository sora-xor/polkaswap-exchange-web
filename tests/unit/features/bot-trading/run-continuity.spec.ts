import { describe, expect, it } from 'vitest';
import {
  botRunState,
  continuesOnItsOwn,
  LISTED_RUN_STATES,
  pausedByUser,
  runHasTimeLeft,
  runWasInterrupted,
  RUN_CONTINUE_MIN_MS,
  type BotRunContext,
} from '@/features/bot-trading/run-continuity';
import type { BotDefinition } from '@/features/bot-trading/types';
import { botFixture } from './fixtures';

const NOW = 1_000_000;
const HOUR = 3_600_000;

function context(overrides: Partial<BotRunContext> = {}): BotRunContext {
  return {
    now: NOW,
    active: new Set(),
    elsewhere: new Set(),
    wallet: { connected: true, address: 'account', external: false },
    ...overrides,
  };
}

/** A run the tab closed: paused by the pagehide handler with time left. */
function interrupted(overrides: Partial<BotDefinition> = {}): BotDefinition {
  return {
    ...botFixture(),
    status: 'paused',
    sessionExpiresAt: NOW + HOUR,
    activity: [{ id: 'closed', kind: 'status', timestamp: 1, message: 'bots.events.sessionPaused' }],
    ...overrides,
  };
}

const manual = { id: 'pause', kind: 'status' as const, timestamp: 2, message: 'bots.events.paused' };

describe('bot run continuity', () => {
  it('shows a bot as running only while this tab or another tab runs it', () => {
    expect(botRunState(interrupted(), context({ active: new Set(['bot-1']) }))).toBe('running');
    expect(botRunState(interrupted({ status: 'running' }), context({ elsewhere: new Set(['bot-1']) }))).toBe(
      'elsewhere'
    );
  });

  it('passes through idle, stopped and attention, and never continues them', () => {
    for (const status of ['idle', 'stopped', 'attention'] as const) {
      const bot = interrupted({ status });
      expect(botRunState(bot, context())).toBe(status);
      expect(continuesOnItsOwn(bot, context())).toBe(false);
    }
  });

  it('treats a run with less than a minute left, or a finished goal, as ended', () => {
    expect(runHasTimeLeft({ sessionExpiresAt: NOW + RUN_CONTINUE_MIN_MS }, NOW)).toBe(true);
    expect(runHasTimeLeft({ sessionExpiresAt: NOW + RUN_CONTINUE_MIN_MS - 1 }, NOW)).toBe(false);
    expect(runHasTimeLeft({ sessionExpiresAt: Number.NaN }, NOW)).toBe(false);
    expect(botRunState(interrupted({ sessionExpiresAt: NOW + 30_000 }), context())).toBe('ended');
    expect(botRunState(interrupted({ sessionExpiresAt: 0 }), context())).toBe('ended');
    const finished = interrupted({
      goalState: { startedAt: 1, baselineValue: '1', returnPercent: '10', outcome: 'target', completedAt: 2 },
    } as Partial<BotDefinition>);
    expect(botRunState(finished, context())).toBe('ended');
  });

  it('keeps a manual pause paused, and treats closing the tab or a stale running record as an interruption', () => {
    const paused = interrupted({ activity: [manual] });
    expect(pausedByUser(paused)).toBe(true);
    expect(runWasInterrupted(paused)).toBe(false);
    expect(botRunState(paused, context())).toBe('paused');
    expect(runWasInterrupted(interrupted())).toBe(true);
    // The pagehide write may not land: the record still says running, with an old manual pause event.
    expect(runWasInterrupted(interrupted({ status: 'running', activity: [manual] }))).toBe(true);
  });

  it('continues interrupted paper bots on their own', () => {
    expect(botRunState(interrupted(), context())).toBe('continuing');
    expect(
      continuesOnItsOwn(
        interrupted({ status: 'running' }),
        context({ wallet: { connected: false, address: '', external: false } })
      )
    ).toBe(true);
  });

  it('continues live bots only with the same account, and only on their own for external wallets', () => {
    const live = interrupted({ mode: 'live' });
    expect(botRunState(live, context({ wallet: { connected: false, address: '', external: true } }))).toBe('wallet');
    expect(botRunState(live, context({ wallet: { connected: true, address: 'other', external: true } }))).toBe(
      'wallet'
    );
    expect(botRunState(live, context({ wallet: { connected: true, address: 'account', external: true } }))).toBe(
      'continuing'
    );
    // The built-in wallet password is never stored, so the user enters it again.
    expect(botRunState(live, context())).toBe('password');
    expect(continuesOnItsOwn(live, context())).toBe(false);
  });

  it('sends AI, campaign and exact-goal bots back to their page to continue', () => {
    const ai = interrupted();
    ai.strategy = { ...ai.strategy, kind: 'ai' };
    expect(botRunState(ai, context())).toBe('open');
    expect(botRunState(interrupted({ discoveryCampaignId: 'campaign' }), context())).toBe('open');
    expect(botRunState({ ...interrupted(), goalExecution: {} } as unknown as BotDefinition, context())).toBe('open');
  });

  it('lists only states that run, will run or wait for the user', () => {
    expect([...LISTED_RUN_STATES].sort()).toEqual(
      ['attention', 'continuing', 'elsewhere', 'open', 'password', 'paused', 'running', 'wallet'].sort()
    );
  });
});
