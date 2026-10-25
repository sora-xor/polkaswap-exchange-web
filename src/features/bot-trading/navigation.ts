import { PageNames } from '@/consts/navigation';
import type { LocationQuery, RouteLocationAsRelativeGeneric } from 'vue-router';

/** Public sections and harmless view state supported by the static Bots workspace. */
export type BotWorkspaceView = 'simple' | 'discover' | 'lab' | 'playground' | 'bots';
export type BotStrategyPreset = 'dca' | 'threshold' | 'sma';
export type BotChartTab = 'price' | 'equity' | 'backtest';
export interface BotNavigation {
  view: BotWorkspaceView;
  strategy: BotStrategyPreset;
  composer: boolean;
  botId: string;
  chart: BotChartTab;
}

const sections = { simple: '', discover: 'discover', lab: 'lab', playground: 'backtesting', bots: 'my-bots' } as const;

/** Read bounded view choices; draft presence opens Lab for strict receiver validation. */
export function readBotNavigation(section: unknown, query: LocationQuery): BotNavigation {
  const view =
    section === 'backtesting'
      ? 'playground'
      : section === 'my-bots'
        ? 'bots'
        : section === 'discover'
          ? 'discover'
          : section === 'lab' ||
              query.strategy ||
              query.panel === 'composer' ||
              query.rules !== undefined ||
              query.study !== undefined
            ? 'lab'
            : 'simple';
  return {
    view,
    strategy:
      view !== 'bots' && (query.strategy === 'dca' || query.strategy === 'threshold' || query.strategy === 'sma')
        ? query.strategy
        : view === 'lab' || view === 'simple'
          ? 'sma'
          : 'dca',
    composer: view === 'lab' && query.panel === 'composer',
    botId: view === 'bots' && typeof query.bot === 'string' && /^[\w-]{1,96}$/.test(query.bot) ? query.bot : '',
    chart: view === 'bots' && (query.chart === 'equity' || query.chart === 'backtest') ? query.chart : 'price',
  };
}

/** Build a shareable hash-router destination without copying credentials, account data, or execution state. */
export function botWorkspaceLocation(
  view: BotWorkspaceView,
  state: Partial<Omit<BotNavigation, 'view'>> = {}
): RouteLocationAsRelativeGeneric {
  const query: Record<string, string> = {};
  if (view === 'bots') {
    if (state.botId && /^[\w-]{1,96}$/.test(state.botId)) query.bot = state.botId;
    if (state.chart === 'equity' || state.chart === 'backtest') query.chart = state.chart;
  } else if (view !== 'simple') {
    // Include every explicit choice so changing a page's initial preset cannot alter a shared selection.
    if (state.strategy === 'dca' || state.strategy === 'threshold' || state.strategy === 'sma')
      query.strategy = state.strategy;
    if (view === 'lab' && state.composer) query.panel = 'composer';
  }
  return { name: PageNames.Bots, params: { section: sections[view] }, query };
}

/** Keep an imported public draft during harmless Lab panel navigation, including invalid values for visible rejection. */
export function botLabDraftLocation(
  state: Pick<BotNavigation, 'strategy' | 'composer'>,
  current: LocationQuery
): RouteLocationAsRelativeGeneric {
  const location = botWorkspaceLocation('lab', state);
  for (const key of ['rules', 'study'] as const) {
    if (current[key] !== undefined) location.query = { ...location.query, [key]: current[key] };
  }
  return location;
}
