import { flushPromises } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { botRunsHint } from '@/features/bot-trading/run-hint';
import { BOT_RUNS_CHECK_MS, createBotRuns, runReturnPercent } from '@/features/bot-trading/runs';
import type { BotDefinition } from '@/features/bot-trading/types';
import { botFixture } from './fixtures';

vi.mock('@/features/bot-trading/controller', () => ({ useBotTrading: vi.fn() }));

const NOW = 1_000_000;
const HOUR = 3_600_000;

function saved(overrides: Partial<BotDefinition>): BotDefinition {
  return { ...botFixture(), sessionExpiresAt: NOW + HOUR, ...overrides };
}
const closed = { id: 'closed', kind: 'status' as const, timestamp: 1, message: 'bots.events.sessionPaused' };

function trading(bots: BotDefinition[] = []) {
  return {
    bots: ref(bots),
    busy: ref(false),
    sessionActiveIds: ref<string[]>([]),
    walletConnected: ref(true),
    walletAddress: ref('account'),
    externalWallet: ref(false),
    connectionIdentity: ref('identity-1'),
    initialize: vi.fn(async () => undefined),
    reload: vi.fn(async () => undefined),
    continueRuns: vi.fn(async (_elsewhere?: ReadonlySet<string>) => [] as string[]),
    startBot: vi.fn(async (_id: string, _options?: object) => undefined),
    pauseBot: vi.fn(async (_id: string) => undefined),
    stopBot: vi.fn(async (_id: string) => undefined),
  };
}

function host(state = trading(), hidden = false) {
  const target = new EventTarget() as EventTarget & Window;
  const doc = Object.assign(new EventTarget(), { hidden }) as unknown as Document;
  const readElsewhere = vi.fn(async () => new Set<string>());
  const add = vi.spyOn(target, 'addEventListener');
  const remove = vi.spyOn(target, 'removeEventListener');
  const runs = createBotRuns(state as never, { now: () => NOW, readElsewhere, target, document: doc });
  hosts.push(runs);
  return { runs, state, target, doc, readElsewhere, add, remove };
}
let hosts: ReturnType<typeof createBotRuns>[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  botRunsHint.value = false;
  localStorage.clear();
});
afterEach(() => {
  hosts.forEach((runs) => runs.dispose());
  hosts = [];
  vi.useRealTimers();
});

describe('bot run host', () => {
  it('lists bots that run, continue or wait, with their end and result in their own token', async () => {
    const running = saved({
      id: 'running',
      status: 'running',
      equity: [
        { timestamp: 1, value: '10' },
        { timestamp: 2, value: '10.5' },
      ],
    });
    const state = trading([
      running,
      saved({ id: 'paper', status: 'running' }),
      saved({ id: 'live', mode: 'live', activity: [closed], status: 'paused' }),
      saved({ id: 'idle', status: 'idle' }),
      saved({ id: 'stopped', status: 'stopped' }),
      saved({ id: 'ended', status: 'paused', activity: [closed], sessionExpiresAt: NOW }),
    ]);
    state.sessionActiveIds.value = ['running'];
    const { runs } = host(state);
    expect(runs.items.value.map((item) => [item.id, item.state])).toEqual([
      ['running', 'running'],
      ['paper', 'continuing'],
      ['live', 'password'],
    ]);
    expect(runs.items.value[0]).toMatchObject({ endsAt: NOW + HOUR, returnPercent: '5.00', assetIn: 'IN' });
    expect(runs.items.value[2]).toMatchObject({ needsPassword: true, account: 'account' });
    expect(runs.runningCount.value).toBe(2);
    expect(runs.waitingCount.value).toBe(1);
    expect(runs.stateOf(saved({ id: 'idle', status: 'idle' }))).toBe('idle');
  });

  it('computes results exactly and only from two valuations', () => {
    expect(runReturnPercent({ equity: [] })).toBeNull();
    expect(
      runReturnPercent({
        equity: [
          { timestamp: 1, value: '0' },
          { timestamp: 2, value: '1' },
        ],
      })
    ).toBeNull();
    expect(
      runReturnPercent({
        equity: [
          { timestamp: 1, value: '3' },
          { timestamp: 2, value: '2.9' },
        ],
      })
      // Rounded like the bot page's net return, so both places show the same number.
    ).toBe('-3.34');
  });

  it('continues interrupted runs once loaded and whenever this tab becomes visible again', async () => {
    const { runs, state, doc, readElsewhere } = host(trading([saved({ status: 'running' })]), true);
    await runs.initializing;
    expect(readElsewhere).toHaveBeenCalled();
    expect(state.reload).toHaveBeenCalled();
    // A hidden tab only refreshes; starting needs a visible tab.
    expect(state.continueRuns).not.toHaveBeenCalled();
    (doc as { hidden: boolean }).hidden = false;
    doc.dispatchEvent(new Event('visibilitychange'));
    await flushPromises();
    expect(state.continueRuns).toHaveBeenCalledTimes(1);
  });

  it('tries again after a wallet change settles, after reconnecting and on a slow timer', async () => {
    const { runs, state, target } = host();
    await runs.initializing;
    state.continueRuns.mockClear();
    state.connectionIdentity.value = 'identity-2';
    await nextTick();
    vi.advanceTimersByTime(1_499);
    expect(state.continueRuns).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(state.continueRuns).toHaveBeenCalledTimes(1);
    target.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(state.continueRuns).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(BOT_RUNS_CHECK_MS);
    expect(state.continueRuns).toHaveBeenCalledTimes(3);
  });

  it('asks before the tab closes only while a bot runs in it', async () => {
    const state = trading();
    const { add, remove, target } = host(state);
    expect(add).not.toHaveBeenCalledWith('beforeunload', expect.any(Function));
    state.sessionActiveIds.value = ['bot-1'];
    await nextTick();
    expect(add).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent;
    target.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    state.sessionActiveIds.value = [];
    await nextTick();
    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });

  it('keeps the top-bar hint in step once the saved bots are known', async () => {
    const state = trading([saved({ status: 'running' })]);
    let finish!: () => void;
    state.initialize.mockReturnValue(new Promise<undefined>((resolve) => (finish = () => resolve(undefined))));
    const { runs } = host(state);
    await nextTick();
    expect(botRunsHint.value).toBe(false);
    finish();
    await runs.initializing;
    await nextTick();
    expect(botRunsHint.value).toBe(true);
    expect(localStorage.getItem('polkaswap-bots-runs-v1')).toBe('1');
    state.bots.value = [saved({ status: 'stopped' })];
    await nextTick();
    expect(botRunsHint.value).toBe(false);
  });

  it('resumes until the saved end, refuses an ended run and keeps each failure on its row', async () => {
    const state = trading([
      saved({ id: 'live', mode: 'live', status: 'paused' }),
      saved({ id: 'old', sessionExpiresAt: NOW }),
    ]);
    const { runs } = host(state);
    expect(await runs.resume('live', 'secret')).toBe(true);
    expect(state.startBot).toHaveBeenCalledWith('live', { continueRun: true, password: 'secret' });
    expect(await runs.resume('old')).toBe(false);
    expect(runs.failure.value).toEqual({ id: 'old', message: 'bots.errors.runEnded' });
    state.pauseBot.mockRejectedValueOnce(new Error('bots.errors.busy'));
    expect(await runs.pause('live')).toBe(false);
    expect(runs.failure.value).toEqual({ id: 'live', message: 'bots.errors.busy' });
    state.stopBot.mockRejectedValueOnce(new Error('provider said <b>no</b>'));
    expect(await runs.stop('live')).toBe(false);
    expect(runs.failure.value).toEqual({ id: 'live', message: 'bots.errors.action' });
    expect(await runs.stop('live')).toBe(true);
    expect(runs.failure.value).toBeNull();
  });

  it('stops listening when disposed', async () => {
    const state = trading();
    const { runs, remove } = host(state);
    await runs.initializing;
    runs.dispose();
    expect(remove).toHaveBeenCalledWith('online', expect.any(Function));
    state.continueRuns.mockClear();
    await vi.advanceTimersByTimeAsync(BOT_RUNS_CHECK_MS * 2);
    expect(state.continueRuns).not.toHaveBeenCalled();
  });
});
