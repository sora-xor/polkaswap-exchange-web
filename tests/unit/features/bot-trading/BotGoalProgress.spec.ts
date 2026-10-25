import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import BotGoalProgress from '@/features/bot-trading/components/BotGoalProgress.vue';
import BotExactGoalProgress from '@/features/bot-trading/components/BotExactGoalProgress.vue';
import { projectExactGoalProgress } from '@/features/bot-trading/goal-progress';
import { markGoalExactLedger } from '@/features/bot-trading/goal-exact-ledger';
import type { BotDefinition } from '@/features/bot-trading/types';
import { executionBot } from './execution-fixtures';
import {
  goalStorageBot,
  goalStorageOrder,
  goalTestCodec,
  goalTestMark,
  GOAL_TEST_START,
} from './goal-storage-fixtures';

vi.mock('@polkadot/util-crypto', async (original) => ({
  ...(await original<typeof import('@polkadot/util-crypto')>()),
  decodeAddress: () => new Uint8Array(),
  cryptoWaitReady: async () => true,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      `${key}${values ? ` ${Object.values(values).join(' ')}` : ''}`,
    language: ref('en'),
  }),
}));

const wrappers: VueWrapper[] = [];
const startAt = Date.UTC(2026, 8, 18, 8);

/** A saved paper goal has no observations until its first explicit start. */
function goalBot(): BotDefinition {
  return {
    ...executionBot(),
    mode: 'paper',
    status: 'idle',
    goal: { title: 'Grow my capital', targetReturnPercent: '5', maxLossPercent: '3', durationMs: 86_400_000 },
  };
}

/** Mount the observed-state presentation without creating a trading controller. */
function render(bot = goalBot()) {
  const wrapper = mount(BotGoalProgress, { props: { bot } });
  wrappers.push(wrapper);
  return wrapper;
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  vi.useRealTimers();
});

describe('BotGoalProgress', () => {
  it('labels the deadline snapshot separately from subsequent settled fees and trade counts', () => {
    const baseline = projectExactGoalProgress(goalStorageBot(), { now: GOAL_TEST_START, orders: [] });
    if (baseline.kind !== 'exact') throw Error('Invalid synthetic display baseline');
    // The presentation accepts already-validated projection props; terminal integration is tested against actual storage.
    const wrapper = mount(BotExactGoalProgress, {
      props: {
        progress: {
          ...baseline,
          terminal: true,
          status: 'expired',
          postDeadline: { fees: '0.02', trades: 1, failures: 1 },
        },
      },
    });
    wrappers.push(wrapper);
    expect(wrapper.get('[data-testid="goal-net-value"]').element.previousElementSibling?.textContent).toContain(
      'bots.goals.exact.finalValue'
    );
    expect(wrapper.get('[data-testid="goal-return"]').element.previousElementSibling?.textContent).toContain(
      'bots.goals.deadline'
    );
    expect(wrapper.get('[data-testid="goal-after-deadline"]').text()).toContain('bots.goals.exact.afterDeadline');
    expect(wrapper.get('[data-testid="goal-later-fees"]').text()).toBe('0.02 XOR');
    expect(wrapper.get('[data-testid="goal-later-trades"]').text()).toBe('1');
    expect(wrapper.get('[data-testid="goal-net-value"]').text()).toBe('11XOR');
    expect(wrapper.get('[data-testid="goal-return"]').text()).toBe('0.00%');
  });

  it('shows only an existing exact funded ledger without manufacturing legacy progress', async () => {
    const bot = goalStorageBot();
    const wrapper = render(bot);
    await wrapper.setProps({ orders: [], now: GOAL_TEST_START });
    expect(wrapper.get('[data-testid="exact-goal-progress"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.status.paused');
    expect(wrapper.get('[data-testid="goal-return"]').text()).toBe('0.00%');
    expect(wrapper.get('[data-testid="goal-budget"]').text()).toBe('10KUSD');
    expect(wrapper.get('[data-testid="goal-reserve"]').text()).toBe('1 XOR');
    expect(wrapper.get('[data-testid="goal-net-value"]').text()).toBe('11XOR');
    expect(wrapper.get('details').attributes('open')).toBeUndefined();
    expect(wrapper.get('[data-testid="goal-deadline"]').attributes('datetime')).toBe(
      new Date(bot.exactGoalState.episode.endedAtMs).toISOString()
    );
    expect(bot).not.toHaveProperty('goalState');
    expect(wrapper.emitted()).toEqual({});
  });

  it('labels a passive exact v1 target as a value threshold with no verified trading gain', async () => {
    const bot = goalStorageBot();
    bot.exactGoalState = markGoalExactLedger(bot.exactGoalState, {
      expectedRevision: 0,
      accountingAtMs: GOAL_TEST_START + 6000,
      mark: { ...goalTestMark(101, GOAL_TEST_START + 6000), xorReserveCodec: goalTestCodec(200) },
    });
    const wrapper = render(bot);
    await wrapper.setProps({ orders: [], now: GOAL_TEST_START + 6000 });
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.exact.valueThreshold');
    expect(wrapper.get('[data-testid="goal-exact-idle-note"]').text()).toBe('bots.goals.exact.noTradingGain');
    expect(wrapper.get('[data-testid="goal-return"]').text()).toBe('+90.91%');

    const marked = projectExactGoalProgress(bot, { now: GOAL_TEST_START + 6000, orders: [] });
    if (marked.kind !== 'exact') throw Error('Invalid synthetic display projection');
    const afterSettlement = mount(BotExactGoalProgress, {
      props: { progress: { ...marked, postDeadline: { fees: '0.1', trades: 1, failures: 0 } } },
    });
    wrappers.push(afterSettlement);
    expect(afterSettlement.find('[data-testid="goal-exact-idle-note"]').exists()).toBe(false);
  });

  it('withholds unsettled financial totals while keeping the approved maximum visible', async () => {
    const bot = goalStorageBot();
    const wrapper = render(bot);
    await wrapper.setProps({ orders: [goalStorageOrder(bot)], now: GOAL_TEST_START });
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.exact.pending');
    for (const key of ['goal-return', 'goal-net-value', 'goal-spent', 'goal-reserve', 'goal-fees', 'goal-holdings'])
      expect(wrapper.get(`[data-testid="${key}"]`).text()).toBe('—');
    expect(wrapper.get('[data-testid="goal-budget"]').text()).toBe('10KUSD');
    await wrapper.setProps({ orders: null });
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.status.attention');
    await wrapper.setProps({ orders: undefined });
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.exact.checking');
  });

  it('updates once at the original deadline and cleans its display timer on unmount', async () => {
    vi.useFakeTimers();
    const bot = goalStorageBot();
    const deadline = bot.exactGoalState.episode.endedAtMs;
    vi.setSystemTime(deadline - 1000);
    const wrapper = mount(BotGoalProgress, { props: { bot, orders: [], runtimeStatus: 'running' } });
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.status.active');
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(1001);
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.exact.finalizing');
    expect(wrapper.get('[data-testid="goal-deadline"]').attributes('datetime')).toBe(new Date(deadline).toISOString());
    expect(bot.exactGoalState.episode.endedAtMs).toBe(deadline);
    wrapper.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reports corrupt exact state instead of rendering an invented legacy return', () => {
    const bot = goalStorageBot();
    const wrapper = render({ ...bot, exactGoalState: {} } as BotDefinition);
    expect(wrapper.get('[data-testid="goal-progress-invalid"]').text()).toBe('bots.errors.storage');
    expect(wrapper.find('[data-testid="goal-return"]').exists()).toBe(false);
  });

  it('identifies peak-relative loss without changing the displayed return from opening capital', () => {
    const bot = goalBot();
    bot.goal = { ...bot.goal!, lossMetric: 'drawdown', targetReturnPercent: '20', maxLossPercent: '5' };
    bot.goalState = {
      startedAt: startAt,
      baselineValue: '100',
      peakValue: '110',
      lastValue: '103.4',
      returnPercent: '3.4',
      outcome: 'loss',
      completedAt: startAt + 1000,
    };
    const wrapper = render(bot);
    expect(wrapper.text()).toContain('bots.goals.pauseBelowPeak');
    expect(wrapper.text()).not.toContain('bots.goals.pauseAt');
    expect(wrapper.get('[data-testid="goal-return"]').text()).toBe('+3.40%');
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.status.loss');
    expect(wrapper.get('[data-testid="goal-outcome-note"]').text()).toBe('bots.goals.completionNote');
  });

  it('does not invent a zero return, start date, or completed goal before first start', () => {
    const wrapper = render();
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.status.awaitingStart');
    expect(wrapper.get('[data-testid="goal-return"]').text()).toBe('—');
    expect(wrapper.find('[data-testid="goal-deadline"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="goal-awaiting-start"]').text()).toBe('bots.goals.beginsOnStart');
    expect(wrapper.get('[data-testid="goal-target-value"]').text()).toBe('+5%');
    expect(wrapper.get('[data-testid="goal-loss-value"]').text()).toBe('−3%');
    expect(wrapper.find('[data-testid="goal-outcome-note"]').exists()).toBe(false);
  });

  it('waits for a price snapshot after start instead of showing fabricated performance', () => {
    const bot = goalBot();
    bot.status = 'running';
    const wrapper = render(bot);
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.status.starting');
    expect(wrapper.get('[data-testid="goal-return"]').text()).toBe('—');
  });

  it('shows durable observed progress and the original deadline independently of chart history', async () => {
    const bot = goalBot();
    bot.status = 'running';
    bot.goalState = {
      startedAt: startAt,
      baselineValue: '100',
      lastValue: '102.125',
      returnPercent: '2.125',
      outcome: 'active',
    };
    bot.equity = [{ timestamp: startAt + 10000, value: '999', benchmark: '999' }];
    const wrapper = render(bot);
    expect(wrapper.get('[data-testid="goal-return"]').text()).toBe('+2.13%');
    expect(wrapper.get('[data-testid="goal-return"]').attributes('title')).toBe('2.125');
    expect(wrapper.get('[data-testid="goal-deadline"]').attributes('datetime')).toBe('2026-09-19T08:00:00.000Z');
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.status.active');
    expect(wrapper.text()).toContain('bots.goals.paperReturn');
    expect(wrapper.get('[data-testid="goal-valuation-note"]').text()).toContain('IN');
    await wrapper.setProps({ bot: { ...bot, status: 'paused' } });
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.status.paused');
    expect(wrapper.get('[data-testid="goal-return"]').text()).toBe('+2.13%');
  });

  it.each(['target', 'loss', 'expired'] as const)(
    'reports %s only after the domain records that outcome',
    (outcome) => {
      const bot = goalBot();
      bot.status = 'paused';
      bot.goalState = {
        startedAt: startAt,
        baselineValue: '100',
        lastValue: outcome === 'loss' ? '96' : '105',
        returnPercent: outcome === 'loss' ? '-4' : '5',
        outcome,
        completedAt: startAt + 86_400_000,
      };
      const wrapper = render(bot);
      expect(wrapper.get('[data-testid="goal-status"]').text()).toBe(`bots.goals.status.${outcome}`);
      expect(wrapper.get('[data-testid="goal-outcome-note"]').text()).toBe('bots.goals.completionNote');
    }
  );

  it('uses actual runtime authority after reload instead of a saved running flag', async () => {
    const bot = goalBot();
    bot.status = 'running';
    bot.goalState = {
      startedAt: startAt,
      baselineValue: '100',
      lastValue: '101',
      returnPercent: '1',
      outcome: 'active',
    };
    const wrapper = render(bot);
    await wrapper.setProps({ runtimeStatus: 'paused' });
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.status.paused');
    expect(wrapper.get('[data-testid="goal-return"]').text()).toBe('+1.00%');
    await wrapper.setProps({ runtimeStatus: 'running' });
    expect(wrapper.get('[data-testid="goal-status"]').text()).toBe('bots.goals.status.active');
  });

  it('labels an output-token goal with its actual valuation asset', () => {
    const bot = goalBot();
    bot.goal!.valuationAsset = 'output';
    expect(render(bot).get('[data-testid="goal-valuation-note"]').text()).toBe('bots.goals.valuationNote OUT');
  });

  it.each([
    ['0.000000000000000001', '+<0.01%'],
    ['-0.000000000000000001', '−<0.01%'],
    ['0', '0.00%'],
  ])('keeps tiny returns visible without floating-point conversion: %s', (value, expected) => {
    const bot = goalBot();
    bot.goalState = {
      startedAt: startAt,
      baselineValue: '100',
      lastValue: '100',
      returnPercent: value,
      outcome: 'active',
    };
    const wrapper = render(bot);
    expect(wrapper.get('[data-testid="goal-return"]').text()).toBe(expected);
  });

  it('omits the panel for ordinary bots and labels live observed returns separately', () => {
    const bot = goalBot();
    delete bot.goal;
    expect(render(bot).find('[data-testid="goal-progress"]').exists()).toBe(false);
    expect(render({ ...goalBot(), mode: 'live' }).text()).toContain('bots.goals.currentReturn');
  });
});
