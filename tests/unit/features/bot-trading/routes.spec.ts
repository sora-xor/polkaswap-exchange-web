import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import { createMemoryHistory, createRouter, createWebHashHistory } from 'vue-router';
import { botTradingRoutes } from '@/features/bot-trading/routes';
import { botWorkspaceLocation, readBotNavigation } from '@/features/bot-trading/navigation';
import { PageNames } from '@/consts/navigation';

const inertPage = defineComponent({ template: '<div />' });

describe('Bots deep links', () => {
  it('opens a new Lab with a two-way signal while preserving every explicit shared preset', () => {
    expect(readBotNavigation('lab', {}).strategy).toBe('sma');
    expect(readBotNavigation(undefined, {}).strategy).toBe('sma');
    expect(readBotNavigation('lab', { strategy: ['dca', 'sma'] }).strategy).toBe('sma');
    expect(readBotNavigation('backtesting', {}).strategy).toBe('dca');
    for (const strategy of ['dca', 'sma', 'threshold'] as const) {
      const destination = botWorkspaceLocation('lab', { strategy });
      expect(destination).toMatchObject({ query: { strategy } });
      expect(readBotNavigation('lab', { strategy }).strategy).toBe(strategy);
    }
  });

  it.each([
    ['/bots', 'simple'],
    ['/bots/discover', 'discover'],
    ['/bots/lab', 'lab'],
    ['/bots/backtesting', 'playground'],
    ['/bots/my-bots', 'bots'],
  ] as const)('restores %s without loading another application page', async (url, view) => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: botTradingRoutes.map((route) => ({ ...route, component: inertPage })),
    });
    await router.push(url);
    expect(router.currentRoute.value.name).toBe(PageNames.Bots);
    expect(readBotNavigation(router.currentRoute.value.params.section, router.currentRoute.value.query).view).toBe(
      view
    );
  });

  it('keeps every link inside an IPFS hash without requiring server routes', () => {
    const history = createWebHashHistory('/ipfs/bafy-test/');
    const router = createRouter({ history, routes: botTradingRoutes });
    expect(router.resolve(botWorkspaceLocation('playground', { strategy: 'sma' })).href).toBe(
      '#/bots/backtesting?strategy=sma'
    );
    expect(router.resolve(botWorkspaceLocation('discover')).href).toBe('#/bots/discover');
    history.destroy();
  });

  it('restores safe public detail choices and rejects ambiguous or unbounded input', () => {
    expect(readBotNavigation('lab', { strategy: 'threshold', panel: 'composer' })).toMatchObject({
      strategy: 'threshold',
      composer: true,
    });
    expect(readBotNavigation('my-bots', { bot: 'bot-1', chart: 'equity' })).toMatchObject({
      botId: 'bot-1',
      chart: 'equity',
    });
    expect(
      readBotNavigation('backtesting', { strategy: ['sma', 'threshold'], panel: 'composer', bot: 'bot-1' })
    ).toMatchObject({ strategy: 'dca', composer: false, botId: '' });
    expect(readBotNavigation('my-bots', { bot: '../private', chart: 'unknown' })).toMatchObject({
      botId: '',
      chart: 'price',
    });
    expect(readBotNavigation('my-bots', { bot: 'a'.repeat(97) }).botId).toBe('');
  });

  it('builds links from an explicit allowlist without propagating unrelated route data', () => {
    expect(botWorkspaceLocation('simple', { composer: true, botId: 'private-bot', strategy: 'sma' })).toEqual({
      name: PageNames.Bots,
      params: { section: '' },
      query: {},
    });
    expect(readBotNavigation(undefined, { panel: 'composer' }).view).toBe('lab');
    expect(
      botWorkspaceLocation('lab', { strategy: 'sma', composer: true, botId: 'private-bot', chart: 'equity' })
    ).toEqual({ name: PageNames.Bots, params: { section: 'lab' }, query: { strategy: 'sma', panel: 'composer' } });
    expect(botWorkspaceLocation('bots', { botId: '../bad', composer: true, strategy: 'sma' })).toEqual({
      name: PageNames.Bots,
      params: { section: 'my-bots' },
      query: {},
    });
  });

  it('sends unknown and malformed subpages to the public lab', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: botTradingRoutes.map((route) => ({ ...route, component: inertPage })),
    });
    await router.push('/bots/not-a-page/extra?start=live');
    expect(router.currentRoute.value.path).toBe('/bots/lab');
    expect(readBotNavigation(router.currentRoute.value.params.section, router.currentRoute.value.query)).toMatchObject({
      view: 'lab',
      botId: '',
      composer: false,
    });
  });
});
