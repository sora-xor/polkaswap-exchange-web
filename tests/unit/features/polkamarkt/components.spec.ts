import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, reactive } from 'vue';

import type { PolkamarktMarket } from '@/features/polkamarkt/types';
import createMarketDialogSource from '@/features/polkamarkt/components/CreateMarketDialog.vue?raw';
import marketDetailSource from '@/features/polkamarkt/components/MarketDetail.vue?raw';
import marketListSource from '@/features/polkamarkt/components/MarketList.vue?raw';
import marketOutcomeChartSource from '@/features/polkamarkt/components/MarketOutcomeChart.vue?raw';
import marketProbabilitySparklineSource from '@/features/polkamarkt/components/MarketProbabilitySparkline.vue?raw';
import marketShareWidgetSource from '@/features/polkamarkt/components/MarketShareWidget.vue?raw';
import myPositionsPanelSource from '@/features/polkamarkt/components/MyPositionsPanel.vue?raw';
import polkamarktPageSource from '@/features/polkamarkt/pages/PolkamarktPage.vue?raw';
import pricingCurvePositionChartSource from '@/features/polkamarkt/components/PricingCurvePositionChart.vue?raw';
import { PageNames } from '@/consts';

const mocks = vi.hoisted(() => ({
  route: { params: {} as Record<string, unknown> },
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  fetchMarkets: vi.fn(),
  fetchHistory: vi.fn(),
  fetchActivity: vi.fn(),
  walletStore: {
    isLoggedIn: true,
    history: {} as Record<string, unknown>,
    accountAssetsAddressTable: {
      '0x02000c0000000000000000000000000000000000000000000000000000000000': {
        balance: { transferable: '1000000000000000000000' },
      },
      '0x0200000000000000000000000000000000000000000000000000000000000000': {
        balance: { transferable: '1000000000000000000000' },
      },
    },
  },
  settingsStore: { blockNumber: 100, appConnection: { connection: { api: null } } },
  connectSoraWallet: vi.fn(),
  withNotifications: vi.fn(async (handler: () => Promise<void>) => {
    await handler();
    return { submitted: true, transaction: { id: 'tx-polkamarkt', status: 'inblock' } };
  }),
  api: {
    polkamarkt: {
      estimateMarketCreationFee: vi.fn().mockResolvedValue({ totalFee: '1', conditionFee: '1', marketFee: '0' }),
      quoteBuyTrade: vi.fn(),
      quoteSellTrade: vi.fn(),
      estimateBuyTradeNetworkFee: vi.fn().mockResolvedValue('1'),
      estimateSellTradeNetworkFee: vi.fn().mockResolvedValue('1'),
      estimateReportEarlyResolutionNetworkFee: vi.fn().mockResolvedValue('1'),
      getClaimableInfo: vi.fn(),
      estimateClaimMarketNetworkFee: vi.fn().mockResolvedValue('1'),
      submitBuyTrade: vi.fn(),
      submitSellTrade: vi.fn(),
      reportEarlyResolution: vi.fn(),
      claimMarket: vi.fn(),
      claimCreatorFees: vi.fn(),
      createCondition: vi.fn().mockResolvedValue({ conditionId: 9 }),
      createMarket: vi.fn().mockResolvedValue({ marketId: 10 }),
    },
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.routerPush, replace: mocks.routerReplace }),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (!params) return key;
      return `${key} ${JSON.stringify(params)}`;
    },
  }),
}));

vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({
    isLoggedIn: { value: mocks.walletStore.isLoggedIn },
    soraAddress: { value: 'cnAccount' },
    connectSoraWallet: mocks.connectSoraWallet,
  }),
}));

vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({ loading: { value: false }, withNotifications: mocks.withNotifications }),
}));

vi.mock('@/composables/useNotification', () => ({
  useNotification: () => ({
    getErrorMessage: (error: unknown) => (error instanceof Error ? error.message : 'unknownErrorText'),
  }),
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => mocks.walletStore,
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => mocks.settingsStore,
}));

vi.mock('@/lib/soraneo-wallet/src/api', () => ({
  api: mocks.api,
}));

vi.mock('@/features/polkamarkt/services/markets', () => ({
  fetchPolkamarktMarkets: mocks.fetchMarkets,
}));

vi.mock('@/features/polkamarkt/services/marketHistory', () => ({
  fetchPolkamarktMarketHistory: mocks.fetchHistory,
}));

vi.mock('@/features/polkamarkt/services/accountActivity', () => ({
  fetchPolkamarktAccountActivity: mocks.fetchActivity,
}));

vi.mock('@/lib/soraneo-wallet/src/components/DialogBase.vue', () => ({
  default: defineComponent({
    name: 'DialogBase',
    props: ['visible', 'title'],
    emits: ['update:visible'],
    template: '<section v-if="visible" class="dialog-base-stub"><slot /></section>',
  }),
}));

import { KUSD, XOR } from '@/lib/substrate/sdk/assets/consts';
import { Operation } from '@/lib/substrate/sdk/types';
import CreateMarketDialog from '@/features/polkamarkt/components/CreateMarketDialog.vue';
import MarketDetail from '@/features/polkamarkt/components/MarketDetail.vue';
import MarketList from '@/features/polkamarkt/components/MarketList.vue';
import MarketProbabilitySparkline from '@/features/polkamarkt/components/MarketProbabilitySparkline.vue';
import MarketShareWidget from '@/features/polkamarkt/components/MarketShareWidget.vue';
import MyPositionsPanel from '@/features/polkamarkt/components/MyPositionsPanel.vue';
import TradeTicket from '@/features/polkamarkt/components/TradeTicket.vue';
import PolkamarktPage from '@/features/polkamarkt/pages/PolkamarktPage.vue';

const market = {
  id: 'm-1',
  chainId: 1,
  creator: 'cnAccount',
  title: 'Will Polkamarkt trade in Polkaswap?',
  description: 'Native market description',
  category: 'Crypto',
  liquidity: 1000,
  volume: 250,
  probability: 63,
  status: 'Open',
  closeBlock: 8000,
  mechanism: 'DynamicPariMutuel',
  virtualDepth: 100,
  dpmCollateral: 100,
  realYesShares: 26,
  realNoShares: 74,
} satisfies PolkamarktMarket;

const sButtonStub = defineComponent({
  props: ['loading', 'disabled', 'nativeType'],
  emits: ['click'],
  methods: {
    handleClick(event: MouseEvent) {
      this.$emit('click', event);
      if (this.nativeType !== 'submit') return;
      const form = (event.currentTarget as HTMLButtonElement | null)?.form;
      form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    },
  },
  template:
    '<button class="s-button-stub" :type="nativeType || \'button\'" :disabled="disabled" @click="handleClick"><slot /></button>',
});

const sSelectStub = {
  props: ['modelValue', 'options'],
  emits: ['update:modelValue'],
  template: `
    <select class="s-select-stub" :value="modelValue" @change="$emit('update:modelValue', $event.target.value)">
      <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
  `,
};

const sIconStub = {
  props: ['name', 'size'],
  template: '<i class="s-icon-stub" :data-name="name" :data-size="size"></i>',
};

const globalStubs = {
  's-button': sButtonStub,
  's-select': sSelectStub,
  's-icon': sIconStub,
};

function mockShareCanvas(): {
  canvas: () => HTMLCanvasElement | undefined;
  context: CanvasRenderingContext2D;
  restore: () => void;
} {
  const originalCreateElement = document.createElement.bind(document);
  const context = {
    arc: vi.fn(),
    beginPath: vi.fn(),
    clearRect: vi.fn(),
    closePath: vi.fn(),
    drawImage: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    lineTo: vi.fn(),
    measureText: vi.fn((text: string) => ({ width: text.length * 18 })),
    moveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    setLineDash: vi.fn(),
    stroke: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
  let canvas: HTMLCanvasElement | undefined;
  const createElement = vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
    const element = originalCreateElement(tagName, options);
    if (tagName.toLowerCase() === 'canvas') {
      canvas = element as HTMLCanvasElement;
      Object.defineProperty(element, 'getContext', { configurable: true, value: () => context });
      Object.defineProperty(element, 'toBlob', {
        configurable: true,
        value: (callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })),
      });
    }
    return element;
  });

  return {
    canvas: () => canvas,
    context,
    restore: () => createElement.mockRestore(),
  };
}

describe('polkamarkt components', () => {
  beforeEach(() => {
    mocks.route.params = {};
    mocks.routerPush.mockReset();
    mocks.routerReplace.mockReset();
    mocks.fetchMarkets.mockReset().mockResolvedValue([market]);
    mocks.fetchHistory.mockReset().mockResolvedValue([
      { id: 'h1', marketId: 1, timestamp: 1780229164, probability: 60 },
      { id: 'h2', marketId: 1, timestamp: 1780232764, probability: 63 },
    ]);
    mocks.fetchActivity.mockReset().mockResolvedValue({
      account: 'cnAccount',
      positions: [{ id: 'p1', marketId: 1, marketTitle: market.title, yesShares: 2, noShares: 0 }],
      trades: [{ id: 't1', marketId: 1, marketTitle: market.title, side: 'buy' }],
    });
    mocks.connectSoraWallet.mockReset();
    mocks.withNotifications.mockClear();
    mocks.walletStore.isLoggedIn = true;
    mocks.walletStore.accountAssetsAddressTable[KUSD.address] = {
      balance: { transferable: '1000000000000000000000000000000' },
    };
    mocks.walletStore.accountAssetsAddressTable[XOR.address] = {
      balance: { transferable: '1000000000000000000000000000000' },
    };
    mocks.api.polkamarkt.estimateMarketCreationFee.mockClear().mockResolvedValue({
      totalFee: '1',
      conditionFee: '1',
      marketFee: '0',
    });
    mocks.api.polkamarkt.quoteBuyTrade.mockReset().mockResolvedValue({
      marketId: 1,
      outcome: 'Yes',
      collateralIn: '1000000000000000000',
      feeAmount: '10000000000000000',
      pricingCollateral: '990000000000000000',
      sharesOut: '2000000000000000000',
    });
    mocks.api.polkamarkt.quoteSellTrade.mockReset().mockResolvedValue({
      marketId: 1,
      outcome: 'Yes',
      sharesIn: '1000000000000000000',
      grossCollateralOut: '1010000000000000000',
      feeAmount: '10000000000000000',
      collateralOut: '1000000000000000000',
    });
    mocks.api.polkamarkt.estimateBuyTradeNetworkFee.mockReset().mockResolvedValue('1');
    mocks.api.polkamarkt.estimateSellTradeNetworkFee.mockReset().mockResolvedValue('1');
    mocks.api.polkamarkt.estimateReportEarlyResolutionNetworkFee.mockReset().mockResolvedValue('1');
    mocks.api.polkamarkt.submitBuyTrade.mockReset();
    mocks.api.polkamarkt.submitSellTrade.mockReset();
    mocks.api.polkamarkt.reportEarlyResolution.mockReset();
    mocks.api.polkamarkt.getClaimableInfo.mockReset().mockResolvedValue({
      marketId: 1,
      account: 'cnAccount',
      status: 'Resolved',
      yesShares: '0',
      noShares: '0',
      netCollateralPaid: '0',
      traderPayout: '1000000000000000000',
      claimablePayout: '1000000000000000000',
      creatorFees: '0',
      isCreator: false,
    });
    mocks.api.polkamarkt.estimateClaimMarketNetworkFee.mockClear().mockResolvedValue('1');
    mocks.api.polkamarkt.createCondition.mockClear();
    mocks.api.polkamarkt.createMarket.mockClear();
    mocks.walletStore.history = reactive({});
    mocks.withNotifications.mockReset().mockImplementation(async (handler: () => Promise<void>) => {
      await handler();
      return { submitted: true, transaction: { id: 'tx-polkamarkt', status: 'inblock' } };
    });
  });

  it('renders and filters active market list items', async () => {
    const wrapper = mount(MarketList, {
      props: { markets: [market], status: 'active' },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain(market.title);
    await wrapper.find('.market-card').trigger('click');
    expect(wrapper.emitted('select')?.[0]?.[0]).toEqual(market);
  });

  it('renders hot markets grouped by category with probability sparklines', () => {
    const aiMarket = {
      ...market,
      id: 'm-2',
      chainId: 2,
      category: 'AI' as const,
      liquidity: 800,
      title: 'Will AI markets heat up?',
      volume: 900,
    };
    const closedMarket = { ...market, id: 'm-3', chainId: 3, closeBlock: 99, title: 'Closed hidden market' };
    const wrapper = mount(MarketList, {
      props: {
        currentBlock: 100,
        historiesByMarketId: {
          '2': [
            { id: 'h1', marketId: 2, probability: 42, timestamp: 1 },
            { id: 'h2', marketId: 2, probability: 51, timestamp: 2 },
          ],
        },
        markets: [market, aiMarket, closedMarket],
        status: 'active',
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.findAll('.polkamarkt-market-group__header h3').map((item) => item.text())).toEqual(['AI', 'Crypto']);
    expect(wrapper.text()).toContain('polkamarkt.markets.hotTitle');
    expect(wrapper.text()).toContain(aiMarket.title);
    expect(wrapper.text()).not.toContain(closedMarket.title);
    expect(wrapper.findAll('[data-testid="market-card-sparkline-line-yes"]')).toHaveLength(1);
  });

  it('shows past-close-block markets as closed and removes them from the active filter', async () => {
    const expiredMarket = { ...market, id: 'm-2', chainId: 2, closeBlock: 99, title: 'Expired block market' };
    const activeWrapper = mount(MarketList, {
      props: { markets: [market, expiredMarket], status: 'active', currentBlock: 100 },
      global: { stubs: globalStubs },
    });

    expect(activeWrapper.text()).toContain(market.title);
    expect(activeWrapper.text()).not.toContain(expiredMarket.title);

    const finalizedWrapper = mount(MarketList, {
      props: { markets: [expiredMarket], status: 'finalized', currentBlock: 100 },
      global: { stubs: globalStubs },
    });

    expect(finalizedWrapper.text()).toContain(expiredMarket.title);
    expect(finalizedWrapper.text()).toContain('polkamarkt.status.closed');
  });

  it('offers a closed-market shortcut from an empty active filter', async () => {
    const expiredMarket = { ...market, id: 'm-2', chainId: 2, closeBlock: 99, title: 'Expired block market' };
    const emptyWrapper = mount(MarketList, {
      props: { markets: [], status: 'active', currentBlock: 100 },
      global: { stubs: globalStubs },
    });
    const wrapper = mount(MarketList, {
      props: { markets: [expiredMarket], status: 'active', currentBlock: 100 },
      global: { stubs: globalStubs },
    });

    expect(emptyWrapper.text()).toContain('polkamarkt.status.closed polkamarkt.markets.title');
    expect(wrapper.text()).toContain('polkamarkt.noMarkets');
    expect(wrapper.text()).toContain('polkamarkt.status.closed polkamarkt.markets.title');

    await wrapper.get('.polkamarkt-empty__action').trigger('click');

    expect(wrapper.emitted('update:status')?.[0]?.[0]).toBe('finalized');
  });

  it('switches market status with explicit filter buttons', async () => {
    const wrapper = mount(MarketList, {
      props: { markets: [market], status: 'active', currentBlock: 100 },
      global: { stubs: globalStubs },
    });

    expect(wrapper.get('.polkamarkt-status-toggle').attributes('aria-label')).toBe('polkamarkt.metrics.status');

    const closedButton = wrapper
      .findAll('.polkamarkt-status-toggle__option')
      .find((button) => button.text().includes('polkamarkt.status.closed'));
    await closedButton?.trigger('click');

    expect(wrapper.emitted('update:status')?.[0]?.[0]).toBe('finalized');
  });

  it('renders market detail metrics without settlement placeholders', () => {
    const wrapper = mount(MarketDetail, {
      props: {
        market,
        currentBlock: 100,
        history: [
          { id: 'h1', marketId: 1, timestamp: 1780229164, probability: 60 },
          { id: 'h2', marketId: 1, timestamp: 1780232764, probability: 63 },
        ],
      },
    });

    expect(wrapper.text()).toContain(market.title);
    expect(wrapper.text()).toContain('0.63 KUSD');
    expect(wrapper.text()).not.toContain('polkamarkt.details.settlement');
    expect(wrapper.text()).not.toContain('polkamarkt.fields.evidenceUri');
    expect(wrapper.find('[data-testid="market-history-chart"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="pricing-curve-position-chart"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="market-share-widget"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="market-share-actions"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="market-share-native"]').exists()).toBe(true);
    expect(wrapper.find('a[href^="https://t.me/share/url"]').exists()).toBe(true);
    expect(wrapper.find('a[href^="https://twitter.com/intent/tweet"]').exists()).toBe(true);
    expect(wrapper.text()).toMatch(/\d{4}\/\d{1,2}\/\d{1,2} \d{2}:\d{2} UTC[+-]\d{2}:\d{2}/);
    expect(wrapper.text()).not.toMatch(/\d{4}\/\d{1,2}\/\d{1,2} \d{2}:\d{2}:\d{2}/);
    expect(wrapper.find('[data-testid="market-history-line-yes"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="market-history-line-no"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="market-history-label-yes"]').text()).toContain('YES 63%');
    expect(wrapper.find('[data-testid="market-history-label-no"]').text()).toContain('NO 37%');
    expect(wrapper.find('svg [data-testid="market-history-label-yes"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="market-history-label-yes"]').element.tagName).toBe('SPAN');
    expect(wrapper.findAll('.market-detail__section')).toHaveLength(3);
    expect(wrapper.findAll('.market-detail__facts')).toHaveLength(2);
    expect(wrapper.findAll('.market-detail__fact')).toHaveLength(10);
    expect(wrapper.findAll('.market-detail__fact--wide')).toHaveLength(3);
  });

  it('renders the market detail status as closed when the close block has passed', () => {
    const wrapper = mount(MarketDetail, {
      props: {
        market: { ...market, closeBlock: 99 },
        currentBlock: 100,
      },
    });

    expect(wrapper.text()).toContain('polkamarkt.status.closed');
  });

  it('keeps market detail facts in responsive compact grids', () => {
    expect(marketDetailSource).toContain("grid-template-columns: repeat(auto-fit, #{'minmax(min(100%, 160px), 1fr)'})");
    expect(marketDetailSource).toContain("grid-template-columns: repeat(auto-fit, #{'minmax(min(100%, 340px), 1fr)'})");
    expect(marketDetailSource).toContain("grid-template-columns: repeat(auto-fit, #{'minmax(min(100%, 150px), 1fr)'})");
    expect(marketDetailSource).toContain('align-items: start;');
    expect(marketDetailSource).toContain('align-self: start;');
    expect(marketDetailSource).toContain('market-detail__fact--wide');
    expect(marketDetailSource).toContain('<details class="market-detail__section">');
  });

  it('escapes Polkamarkt CSS grid minmax functions from the Sass breakpoint helper', () => {
    expect(polkamarktPageSource).toContain('class="polkamarkt__market-discovery"');
    expect(polkamarktPageSource).toContain("grid-template-columns: #{'minmax(0, 1fr)'} #{'minmax(280px, 380px)'}");
    expect(polkamarktPageSource).toContain('@include huge-desktop(true)');
    expect(marketListSource).toContain('flex-wrap: wrap');
    expect(marketListSource).toContain('> .polkamarkt-status-toggle');
    expect(marketListSource).toContain("grid-template-columns: repeat(auto-fit, #{'minmax(min(100%, 260px), 1fr)'})");
    expect(marketListSource).not.toContain('max-content auto');
    expect(createMarketDialogSource).toContain('grid-template-columns: repeat(auto-fit, minmax(120px, 1fr))');
    expect(myPositionsPanelSource).toContain("grid-template-columns: #{'minmax(0, 1fr)'} auto auto");
  });

  it('keeps chart labels outside stretching SVG viewports', () => {
    expect(marketOutcomeChartSource).toContain('class="market-outcome-chart__plot-layer"');
    expect(marketOutcomeChartSource).toContain('gridLabelStyle(value)');
    expect(marketOutcomeChartSource).not.toContain('<text');
    expect(marketShareWidgetSource).toContain('chartGridLabelStyle(value)');
    expect(marketShareWidgetSource).not.toContain('<text');
    expect(pricingCurvePositionChartSource).toContain('data-testid="pricing-curve-position-chart"');
    expect(pricingCurvePositionChartSource).toContain(':stroke="`url(#${yesGradientId})`"');
    expect(marketProbabilitySparklineSource).toContain('data-testid="market-card-sparkline"');
    expect(marketProbabilitySparklineSource).not.toContain(`marketHistory${'Fallback'}`);
  });

  it('renders compact probability sparklines from indexed history and market probability labels', () => {
    const historyWrapper = mount(MarketProbabilitySparkline, {
      props: {
        market,
        points: [
          { id: 'h1', marketId: 1, probability: 60, timestamp: 1 },
          { id: 'h2', marketId: 1, probability: 70, timestamp: 2 },
        ],
      },
    });
    const noHistoryWrapper = mount(MarketProbabilitySparkline, {
      props: { market },
    });

    expect(historyWrapper.get('[data-testid="market-card-sparkline-line-yes"]').exists()).toBe(true);
    expect(historyWrapper.get('[data-testid="market-card-sparkline-line-no"]').exists()).toBe(true);
    expect(historyWrapper.text()).toContain('polkamarkt.outcomes.yes 70%');
    expect(historyWrapper.text()).toContain('polkamarkt.outcomes.no 30%');
    expect(noHistoryWrapper.text()).toContain('polkamarkt.outcomes.yes 63%');
    expect(noHistoryWrapper.find('[data-testid="market-card-sparkline-line-yes"]').exists()).toBe(false);
  });

  it('renders DPM trade ticket modes and expands the curve helper without quoting before an amount is entered', async () => {
    const wrapper = mount(TradeTicket, {
      props: { market },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('polkamarkt.ticket.title');
    expect(wrapper.text()).toContain('polkamarkt.ticket.dpmSubtitle');
    expect(wrapper.text()).not.toContain('polkamarkt.ticket.subtitle');
    expect(wrapper.find('.trade-ticket__tabs').text()).not.toContain('polkamarkt.modes.claim');
    expect(wrapper.find('.trade-ticket__tabs').text()).not.toContain('polkamarkt.modes.split');
    expect(wrapper.find('.trade-ticket__tabs').text()).not.toContain('polkamarkt.modes.merge');
    expect(wrapper.find('.trade-ticket__tabs').text()).not.toContain('polkamarkt.modes.flip');
    expect(wrapper.find('.trade-ticket__tabs').text()).not.toContain('polkamarkt.modes.liquidity');
    expect(wrapper.find('.trade-ticket__tabs').text()).toContain('polkamarkt.modes.report');
    expect(wrapper.get('[data-testid="trade-ticket-outcome-yes"]').text()).toContain('0.63 KUSD');
    expect(wrapper.get('[data-testid="trade-ticket-outcome-no"]').text()).toContain('0.37 KUSD');
    expect(wrapper.get('[data-testid="trade-ticket-outcome-yes"]').text()).toContain(
      'polkamarkt.ticket.impliedProbabilityShort {"value":"-"}'
    );
    expect(wrapper.find('[data-testid="pricing-curve-position-chart"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="pricing-curve-toggle"]').attributes('aria-expanded')).toBe('false');

    await wrapper.get('[data-testid="pricing-curve-toggle"]').trigger('click');

    expect(wrapper.get('[data-testid="pricing-curve-toggle"]').attributes('aria-expanded')).toBe('true');
    expect(wrapper.find('[data-testid="pricing-curve-position-chart"]').exists()).toBe(true);
    expect(wrapper.text()).toContain('polkamarkt.curve.steps.buy');
    expect(wrapper.find('[data-testid="polkamarkt-order-book"]').exists()).toBe(false);
    expect(mocks.api.polkamarkt.quoteBuyTrade).not.toHaveBeenCalled();
  });

  it('quotes and submits DPM buys with slippage protection', async () => {
    vi.useFakeTimers();
    try {
      mocks.api.polkamarkt.getClaimableInfo.mockResolvedValue({
        marketId: 1,
        account: 'cnAccount',
        status: 'Open',
        yesShares: '0',
        noShares: '0',
        netCollateralPaid: '0',
        traderPayout: '0',
        claimablePayout: '0',
        creatorFees: '0',
        isCreator: false,
      });

      const wrapper = mount(TradeTicket, {
        props: {
          market: {
            ...market,
            mechanism: 'DynamicPariMutuel',
            marginalYesPriceBps: 5100,
            impliedYesProbabilityBps: 6250,
          },
        },
        global: { stubs: globalStubs },
      });

      await wrapper.get('.trade-field input').setValue('1');
      await vi.advanceTimersByTimeAsync(301);

      await vi.waitFor(() => expect(mocks.api.polkamarkt.quoteBuyTrade).toHaveBeenCalled());
      expect(mocks.api.polkamarkt.quoteBuyTrade).toHaveBeenCalledWith({
        marketId: 1,
        outcome: 'Yes',
        collateralIn: '1000000000000000000',
      });
      expect(mocks.api.polkamarkt.estimateBuyTradeNetworkFee).toHaveBeenCalledWith(
        expect.objectContaining({
          collateralIn: '1000000000000000000',
          minSharesOut: '1990000000000000000',
        })
      );

      await wrapper.get('.trade-ticket__submit').trigger('click');

      expect(mocks.api.polkamarkt.submitBuyTrade).toHaveBeenCalledWith(
        expect.objectContaining({
          marketId: 1,
          outcome: 'Yes',
          collateralIn: '1000000000000000000',
          minSharesOut: '1990000000000000000',
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps a submitted Polkamarkt receipt visible until wallet history confirms the transaction', async () => {
    vi.useFakeTimers();
    try {
      mocks.api.polkamarkt.getClaimableInfo.mockResolvedValue({
        marketId: 1,
        account: 'cnAccount',
        status: 'Open',
        yesShares: '0',
        noShares: '0',
        netCollateralPaid: '0',
        traderPayout: '0',
        claimablePayout: '0',
        creatorFees: '0',
        isCreator: false,
      });
      mocks.withNotifications.mockImplementationOnce(async (handler: () => Promise<void>) => {
        await handler();
        return { submitted: true, transaction: { id: 'tx-pending', status: 'broadcast' } };
      });

      const wrapper = mount(TradeTicket, {
        props: { market: { ...market, mechanism: 'DynamicPariMutuel' } },
        global: { stubs: globalStubs },
      });

      const amountInput = wrapper.get<HTMLInputElement>('.trade-field input');
      await amountInput.setValue('1');
      await vi.advanceTimersByTimeAsync(301);
      await vi.waitFor(() => expect(mocks.api.polkamarkt.quoteBuyTrade).toHaveBeenCalled());

      await wrapper.get('.trade-ticket__submit').trigger('click');

      await vi.waitFor(() =>
        expect(wrapper.get('[data-testid="polkamarkt-ticket-receipt"]').text()).toContain(
          'polkamarkt.ticket.txStatus.submitted'
        )
      );
      expect(wrapper.get<HTMLInputElement>('.trade-field input').element.value).toBe('1');
      expect(wrapper.emitted('submitted')).toBeUndefined();

      mocks.walletStore.history['tx-pending'] = { id: 'tx-pending', status: 'inblock' };

      await vi.waitFor(() =>
        expect(wrapper.get('[data-testid="polkamarkt-ticket-receipt"]').text()).toContain(
          'polkamarkt.ticket.txStatus.confirmed'
        )
      );
      expect(wrapper.get<HTMLInputElement>('.trade-field input').element.value).toBe('');
      expect(wrapper.emitted('submitted')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('recovers a timed-out Polkamarkt receipt when wallet history arrives later', async () => {
    vi.useFakeTimers();
    try {
      mocks.api.polkamarkt.getClaimableInfo.mockResolvedValue({
        marketId: 1,
        account: 'cnAccount',
        status: 'Open',
        yesShares: '0',
        noShares: '0',
        netCollateralPaid: '0',
        traderPayout: '0',
        claimablePayout: '0',
        creatorFees: '0',
        isCreator: false,
      });
      mocks.withNotifications.mockImplementationOnce(async (handler: () => Promise<void>) => {
        await handler();
        return { submitted: true, submittedAt: 1_000, historyTimedOut: true };
      });

      const wrapper = mount(TradeTicket, {
        props: { market: { ...market, mechanism: 'DynamicPariMutuel' } },
        global: { stubs: globalStubs },
      });

      const amountInput = wrapper.get<HTMLInputElement>('.trade-field input');
      await amountInput.setValue('1');
      await vi.advanceTimersByTimeAsync(301);
      await vi.waitFor(() => expect(mocks.api.polkamarkt.quoteBuyTrade).toHaveBeenCalled());

      await wrapper.get('.trade-ticket__submit').trigger('click');

      await vi.waitFor(() =>
        expect(wrapper.get('[data-testid="polkamarkt-ticket-receipt"]').text()).toContain(
          'polkamarkt.ticket.txStatus.submitted'
        )
      );
      expect(wrapper.get<HTMLInputElement>('.trade-field input').element.value).toBe('1');
      expect(wrapper.emitted('submitted')).toBeUndefined();

      mocks.walletStore.history['unrelated-after-timeout'] = {
        id: 'unrelated-after-timeout',
        startTime: '1001',
        status: 'inblock',
        type: Operation.Transfer,
        payload: { marketId: 1 },
      };
      await wrapper.vm.$nextTick();

      expect(wrapper.get('[data-testid="polkamarkt-ticket-receipt"]').text()).toContain(
        'polkamarkt.ticket.txStatus.submitted'
      );
      expect(wrapper.get<HTMLInputElement>('.trade-field input').element.value).toBe('1');
      expect(wrapper.emitted('submitted')).toBeUndefined();

      mocks.walletStore.history['tx-after-timeout'] = {
        id: 'tx-after-timeout',
        startTime: '1002',
        status: 'inblock',
        type: Operation.PolkamarktBuy,
        payload: { marketId: 1, outcome: 'Yes' },
      };

      await vi.waitFor(() =>
        expect(wrapper.get('[data-testid="polkamarkt-ticket-receipt"]').text()).toContain(
          'polkamarkt.ticket.txStatus.confirmed'
        )
      );
      expect(wrapper.get<HTMLInputElement>('.trade-field input').element.value).toBe('');
      expect(wrapper.emitted('submitted')).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps Polkamarkt inputs visible when submission is rejected before a transaction is created', async () => {
    vi.useFakeTimers();
    try {
      mocks.api.polkamarkt.getClaimableInfo.mockResolvedValue({
        marketId: 1,
        account: 'cnAccount',
        status: 'Open',
        yesShares: '0',
        noShares: '0',
        netCollateralPaid: '0',
        traderPayout: '0',
        claimablePayout: '0',
        creatorFees: '0',
        isCreator: false,
      });
      mocks.withNotifications.mockImplementationOnce(async () => ({
        submitted: false,
        error: new Error('wallet rejected'),
      }));

      const wrapper = mount(TradeTicket, {
        props: { market: { ...market, mechanism: 'DynamicPariMutuel' } },
        global: { stubs: globalStubs },
      });

      await wrapper.get<HTMLInputElement>('.trade-field input').setValue('1');
      await vi.advanceTimersByTimeAsync(301);
      await vi.waitFor(() => expect(mocks.api.polkamarkt.quoteBuyTrade).toHaveBeenCalled());

      await wrapper.get('.trade-ticket__submit').trigger('click');

      await vi.waitFor(() =>
        expect(wrapper.get('[data-testid="polkamarkt-ticket-receipt"]').text()).toContain('wallet rejected')
      );
      expect(wrapper.get<HTMLInputElement>('.trade-field input').element.value).toBe('1');
      expect(wrapper.emitted('submitted')).toBeUndefined();
      expect(mocks.api.polkamarkt.submitBuyTrade).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders runtime share balances with indexer positions as secondary context', async () => {
    vi.useFakeTimers();
    try {
      mocks.api.polkamarkt.getClaimableInfo.mockResolvedValue({
        marketId: 1,
        account: 'cnAccount',
        status: 'Open',
        yesShares: '3000000000000000000',
        noShares: '1000000000000000000',
        netCollateralPaid: '0',
        traderPayout: '0',
        claimablePayout: '0',
        creatorFees: '0',
        isCreator: false,
      });

      const wrapper = mount(TradeTicket, {
        props: {
          market: { ...market, mechanism: 'DynamicPariMutuel' },
          accountPosition: { id: 'p1', marketId: 1, marketTitle: market.title, yesShares: 2, noShares: 0 },
        },
        global: { stubs: globalStubs },
      });

      await vi.advanceTimersByTimeAsync(301);
      await vi.waitFor(() => expect(mocks.api.polkamarkt.getClaimableInfo).toHaveBeenCalled());

      const balances = wrapper.get('.trade-ticket__balances').text();
      expect(balances).toContain('3');
      expect(balances).toContain('1');
      expect(balances).toContain('polkamarkt.ticket.indexedPosition');
    } finally {
      vi.useRealTimers();
    }
  });

  it('blocks Polkamarkt sells with a clear message when runtime share balances are unavailable', async () => {
    vi.useFakeTimers();
    try {
      mocks.api.polkamarkt.getClaimableInfo.mockResolvedValue(null);

      const wrapper = mount(TradeTicket, {
        props: { market: { ...market, mechanism: 'DynamicPariMutuel' } },
        global: { stubs: globalStubs },
      });
      const sellTab = wrapper
        .findAll('.trade-ticket__tabs button')
        .find((button) => button.text().includes('polkamarkt.modes.sell'));
      await sellTab?.trigger('click');
      await wrapper.get('.trade-field input').setValue('1');
      await vi.advanceTimersByTimeAsync(301);

      expect(wrapper.text()).toContain('polkamarkt.ticket.balanceUnavailable');
      expect(wrapper.get('.trade-ticket__submit').attributes('disabled')).toBeDefined();
      expect(mocks.api.polkamarkt.quoteSellTrade).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears stale DPM quotes synchronously before debounced refresh', async () => {
    vi.useFakeTimers();
    try {
      mocks.api.polkamarkt.getClaimableInfo.mockResolvedValue({
        marketId: 1,
        account: 'cnAccount',
        status: 'Open',
        yesShares: '0',
        noShares: '0',
        netCollateralPaid: '0',
        traderPayout: '0',
        claimablePayout: '0',
        creatorFees: '0',
        isCreator: false,
      });

      const wrapper = mount(TradeTicket, {
        props: { market: { ...market, mechanism: 'DynamicPariMutuel' } },
        global: { stubs: globalStubs },
      });

      await wrapper.get('.trade-field input').setValue('1');
      await vi.advanceTimersByTimeAsync(301);
      await vi.waitFor(() => expect(mocks.api.polkamarkt.quoteBuyTrade).toHaveBeenCalledTimes(1));

      await wrapper.get('.trade-field input').setValue('2');
      await wrapper.get('.trade-ticket__submit').trigger('click');

      expect(wrapper.text()).toContain('polkamarkt.ticket.quoteUnavailable');
      expect(mocks.api.polkamarkt.submitBuyTrade).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('quotes and submits DPM sells without exposing order-book controls', async () => {
    vi.useFakeTimers();
    try {
      mocks.api.polkamarkt.getClaimableInfo.mockResolvedValue({
        marketId: 1,
        account: 'cnAccount',
        status: 'Open',
        yesShares: '3000000000000000000',
        noShares: '0',
        netCollateralPaid: '0',
        traderPayout: '0',
        claimablePayout: '0',
        creatorFees: '0',
        isCreator: false,
      });

      const wrapper = mount(TradeTicket, {
        props: { market: { ...market, mechanism: 'DynamicPariMutuel' } },
        global: { stubs: globalStubs },
      });
      const sellTab = wrapper
        .findAll('.trade-ticket__tabs button')
        .find((button) => button.text().includes('polkamarkt.modes.sell'));
      await sellTab?.trigger('click');
      await wrapper.get('.trade-field input').setValue('1');
      await vi.advanceTimersByTimeAsync(301);

      await vi.waitFor(() => expect(mocks.api.polkamarkt.quoteSellTrade).toHaveBeenCalled());
      expect(wrapper.find('[data-testid="polkamarkt-order-book"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="polkamarkt-open-orders"]').exists()).toBe(false);
      expect(mocks.api.polkamarkt.estimateSellTradeNetworkFee).toHaveBeenCalledWith(
        expect.objectContaining({
          sharesIn: '1000000000000000000',
          minCollateralOut: '995000000000000000',
        })
      );

      await wrapper.get('.trade-ticket__submit').trigger('click');

      expect(mocks.api.polkamarkt.submitSellTrade).toHaveBeenCalledWith(
        expect.objectContaining({
          marketId: 1,
          outcome: 'Yes',
          sharesIn: '1000000000000000000',
          minCollateralOut: '995000000000000000',
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('estimates and submits permissionless early resolution reports', async () => {
    vi.useFakeTimers();
    try {
      mocks.api.polkamarkt.getClaimableInfo.mockResolvedValue({
        marketId: 1,
        account: 'cnAccount',
        status: 'Open',
        yesShares: '0',
        noShares: '0',
        netCollateralPaid: '0',
        traderPayout: '0',
        claimablePayout: '0',
        creatorFees: '0',
        isCreator: false,
      });

      const wrapper = mount(TradeTicket, {
        props: { market: { ...market, mechanism: 'DynamicPariMutuel' } },
        global: { stubs: globalStubs },
      });
      const reportTab = wrapper
        .findAll('.trade-ticket__tabs button')
        .find((button) => button.text().includes('polkamarkt.modes.report'));
      await reportTab?.trigger('click');
      await wrapper.get('[data-testid="early-report-evidence-uri"]').setValue('https://openai.com/news');
      await wrapper
        .get('[data-testid="early-report-evidence-hash"]')
        .setValue('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
      await vi.advanceTimersByTimeAsync(301);

      await vi.waitFor(() => expect(mocks.api.polkamarkt.estimateReportEarlyResolutionNetworkFee).toHaveBeenCalled());
      expect(mocks.api.polkamarkt.estimateReportEarlyResolutionNetworkFee).toHaveBeenCalledWith({
        marketId: 1,
        outcome: 'Yes',
        evidence: {
          uri: 'https://openai.com/news',
          hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
      });

      await wrapper.get('[data-testid="early-report-submit"]').trigger('click');

      expect(mocks.api.polkamarkt.reportEarlyResolution).toHaveBeenCalledWith({
        marketId: 1,
        outcome: 'Yes',
        evidence: {
          uri: 'https://openai.com/news',
          hash: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('blocks duplicate early reports even when the indexer still marks the market open', async () => {
    vi.useFakeTimers();
    try {
      mocks.api.polkamarkt.getClaimableInfo.mockResolvedValue({
        marketId: 1,
        account: 'cnAccount',
        status: 'Open',
        yesShares: '0',
        noShares: '0',
        netCollateralPaid: '0',
        traderPayout: '0',
        claimablePayout: '0',
        creatorFees: '0',
        isCreator: false,
      });

      const wrapper = mount(TradeTicket, {
        props: {
          market: {
            ...market,
            status: 'Open',
            mechanism: 'DynamicPariMutuel',
            earlyResolutionOutcome: 'YES',
          },
        },
        global: { stubs: globalStubs },
      });
      const reportTab = wrapper
        .findAll('.trade-ticket__tabs button')
        .find((button) => button.text().includes('polkamarkt.modes.report'));
      await reportTab?.trigger('click');
      await wrapper.get('[data-testid="early-report-evidence-uri"]').setValue('https://openai.com/news');
      await vi.advanceTimersByTimeAsync(301);

      expect(wrapper.text()).toContain('polkamarkt.ticket.earlyReportAlreadyExists');
      expect(mocks.api.polkamarkt.estimateReportEarlyResolutionNetworkFee).not.toHaveBeenCalled();

      await wrapper.get('[data-testid="early-report-submit"]').trigger('click');

      expect(mocks.api.polkamarkt.reportEarlyResolution).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not estimate or submit early reports with malformed evidence hashes', async () => {
    vi.useFakeTimers();
    try {
      mocks.api.polkamarkt.getClaimableInfo.mockResolvedValue({
        marketId: 1,
        account: 'cnAccount',
        status: 'Open',
        yesShares: '0',
        noShares: '0',
        netCollateralPaid: '0',
        traderPayout: '0',
        claimablePayout: '0',
        creatorFees: '0',
        isCreator: false,
      });

      const wrapper = mount(TradeTicket, {
        props: { market: { ...market, mechanism: 'DynamicPariMutuel' } },
        global: { stubs: globalStubs },
      });
      const reportTab = wrapper
        .findAll('.trade-ticket__tabs button')
        .find((button) => button.text().includes('polkamarkt.modes.report'));
      await reportTab?.trigger('click');
      await wrapper.get('[data-testid="early-report-evidence-uri"]').setValue('https://openai.com/news');
      await wrapper.get('[data-testid="early-report-evidence-hash"]').setValue('0x1234');
      await vi.advanceTimersByTimeAsync(301);

      expect(wrapper.text()).toContain('polkamarkt.ticket.invalidEvidenceHash');
      expect(mocks.api.polkamarkt.estimateReportEarlyResolutionNetworkFee).not.toHaveBeenCalled();

      await wrapper.get('[data-testid="early-report-submit"]').trigger('click');

      expect(mocks.api.polkamarkt.reportEarlyResolution).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders share links and copies the market snapshot', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const wrapper = mount(MarketShareWidget, {
      props: {
        market,
        history: [
          { id: 'h1', marketId: 1, timestamp: 1780229164, probability: 60 },
          { id: 'h2', marketId: 1, timestamp: 1780232764, probability: 63 },
        ],
        baseUrl: 'https://polkaswap.io/#/polkamarkt',
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain(market.title);
    expect(wrapper.text()).toContain('0.63 KUSD');
    expect(wrapper.find('.market-share__logo').exists()).toBe(true);
    expect(wrapper.find('[data-testid="market-share-chart-line"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="market-share-chart-no-line"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="market-share-grid-label-50"]').element.tagName).toBe('SPAN');
    expect(wrapper.find('svg [data-testid="market-share-grid-label-50"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="market-share-trade-link"]').attributes('href')).toBe(
      'https://polkaswap.io/#/polkamarkt/1'
    );
    expect(wrapper.find('a[href^="https://t.me/share/url"]').exists()).toBe(true);

    await wrapper.get('[data-testid="market-share-copy"]').trigger('click');

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('Trade on Polkaswap: https://polkaswap.io/#/polkamarkt/1')
    );
  });

  it('uses the primary share image action with the generated PNG when file sharing is available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    const shareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'share');
    const canShareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'canShare');
    const { restore } = mockShareCanvas();
    const imageComplete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const imageNaturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1133);
    const host = document.createElement('div');
    let wrapper: ReturnType<typeof mount> | undefined;
    document.body.appendChild(host);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare });

    try {
      wrapper = mount(MarketShareWidget, {
        attachTo: host,
        props: { market, baseUrl: 'https://polkaswap.io/#/polkamarkt' },
        global: { stubs: globalStubs },
      });

      await wrapper.get('[data-testid="market-share-native"]').trigger('click');

      await vi.waitFor(() => expect(share).toHaveBeenCalled());
      expect(canShare).toHaveBeenCalledWith({ files: [expect.any(File)] });
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({
          files: [expect.any(File)],
          text: expect.stringContaining('YES 63%'),
          url: 'https://polkaswap.io/#/polkamarkt/1',
        })
      );
      expect((share.mock.calls[0]?.[0] as ShareData).files?.[0]?.name).toBe('polkamarkt-market-1.png');
    } finally {
      if (shareDescriptor) Object.defineProperty(navigator, 'share', shareDescriptor);
      else Reflect.deleteProperty(navigator, 'share');
      if (canShareDescriptor) Object.defineProperty(navigator, 'canShare', canShareDescriptor);
      else Reflect.deleteProperty(navigator, 'canShare');
      restore();
      imageComplete.mockRestore();
      imageNaturalWidth.mockRestore();
      wrapper?.unmount();
      host.remove();
    }
  });

  it('prepares the PNG before opening Telegram when native file sharing is unavailable', async () => {
    const share = vi.fn();
    const canShare = vi.fn().mockReturnValue(false);
    const shareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'share');
    const canShareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'canShare');
    const { restore } = mockShareCanvas();
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:polkamarkt-share');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const linkClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const imageComplete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const imageNaturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1133);
    const host = document.createElement('div');
    let wrapper: ReturnType<typeof mount> | undefined;
    document.body.appendChild(host);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare });

    try {
      wrapper = mount(MarketShareWidget, {
        attachTo: host,
        props: { market, baseUrl: 'https://polkaswap.io/#/polkamarkt' },
        global: { stubs: globalStubs },
      });

      await wrapper.get('[data-testid="market-share-telegram"]').trigger('click');

      await vi.waitFor(() => expect(open).toHaveBeenCalled());
      expect(share).not.toHaveBeenCalled();
      expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
      expect(linkClick).toHaveBeenCalled();
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:polkamarkt-share');
      expect(open.mock.calls[0]?.[0]).toContain('https://t.me/share/url?');
      expect(wrapper.get('[data-testid="market-share-status"]').text()).toContain('polkamarkt.share.imageDownloaded');
    } finally {
      if (shareDescriptor) Object.defineProperty(navigator, 'share', shareDescriptor);
      else Reflect.deleteProperty(navigator, 'share');
      if (canShareDescriptor) Object.defineProperty(navigator, 'canShare', canShareDescriptor);
      else Reflect.deleteProperty(navigator, 'canShare');
      restore();
      createObjectUrl.mockRestore();
      revokeObjectUrl.mockRestore();
      linkClick.mockRestore();
      open.mockRestore();
      imageComplete.mockRestore();
      imageNaturalWidth.mockRestore();
      wrapper?.unmount();
      host.remove();
    }
  });

  it('creates an exact-size PNG share image', async () => {
    const originalCreateElement = document.createElement.bind(document);
    const context = {
      arc: vi.fn(),
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      closePath: vi.fn(),
      drawImage: vi.fn(),
      fill: vi.fn(),
      fillRect: vi.fn(),
      fillText: vi.fn(),
      lineTo: vi.fn(),
      measureText: vi.fn((text: string) => ({ width: text.length * 18 })),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      setLineDash: vi.fn(),
      stroke: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    let canvas: HTMLCanvasElement | undefined;
    let downloadLink: HTMLAnchorElement | undefined;
    let wrapper: ReturnType<typeof mount> | undefined;
    const host = document.createElement('div');
    document.body.appendChild(host);
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:polkamarkt-share');
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const imageComplete = vi.spyOn(HTMLImageElement.prototype, 'complete', 'get').mockReturnValue(true);
    const imageNaturalWidth = vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1133);
    const createElement = vi.spyOn(document, 'createElement').mockImplementation((tagName, options) => {
      const element = originalCreateElement(tagName, options);
      if (tagName.toLowerCase() === 'canvas') {
        canvas = element as HTMLCanvasElement;
        Object.defineProperty(element, 'getContext', { configurable: true, value: () => context });
        Object.defineProperty(element, 'toBlob', {
          configurable: true,
          value: (callback: BlobCallback) => callback(new Blob(['png'], { type: 'image/png' })),
        });
      }
      if (tagName.toLowerCase() === 'a') {
        Object.defineProperty(element, 'click', {
          configurable: true,
          value: vi.fn(() => {
            downloadLink = element as HTMLAnchorElement;
          }),
        });
      }
      return element;
    });

    try {
      wrapper = mount(MarketShareWidget, {
        attachTo: host,
        props: { market, baseUrl: 'https://polkaswap.io/#/polkamarkt' },
        global: { stubs: globalStubs },
      });

      await wrapper.get('[data-testid="market-share-png"]').trigger('click');
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      expect(canvas?.width).toBe(1337);
      expect(canvas?.height).toBe(753);
      expect(context.drawImage).toHaveBeenCalled();
      expect(context.stroke).toHaveBeenCalled();
      const drawnText = (context.fillText as ReturnType<typeof vi.fn>).mock.calls.map(([text]) => text);
      expect(drawnText).not.toContain('polkamarkt.share.tradeLink');
      expect(downloadLink?.download).toBe('polkamarkt-market-1.png');
      expect(downloadLink?.href).toBe('blob:polkamarkt-share');
      expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob));
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:polkamarkt-share');
    } finally {
      createElement.mockRestore();
      createObjectUrl.mockRestore();
      revokeObjectUrl.mockRestore();
      imageComplete.mockRestore();
      imageNaturalWidth.mockRestore();
      wrapper?.unmount();
      host.remove();
    }
  });

  it('only exposes claim mode after a market is finalized', async () => {
    const openWrapper = mount(TradeTicket, {
      props: { market },
      global: { stubs: globalStubs },
    });
    expect(openWrapper.find('.trade-ticket__tabs').text()).not.toContain('polkamarkt.modes.claim');

    const resolvedWrapper = mount(TradeTicket, {
      props: { market: { ...market, status: 'Resolved', resolutionOutcome: 'YES' } },
      global: { stubs: globalStubs },
    });
    expect(resolvedWrapper.find('.trade-ticket__tabs').text()).toContain('polkamarkt.modes.claim');
    expect(resolvedWrapper.find('.trade-ticket__tabs').text()).not.toContain('polkamarkt.modes.buy');
    expect(resolvedWrapper.find('.trade-ticket__claim-grid').exists()).toBe(true);

    const claimTab = resolvedWrapper
      .findAll('.trade-ticket__tabs button')
      .find((button) => button.text().includes('polkamarkt.modes.claim'));
    expect(claimTab).toBeDefined();
    await claimTab?.trigger('click');
    expect(resolvedWrapper.find('.trade-ticket__claim-grid').exists()).toBe(true);

    await resolvedWrapper.setProps({ market });

    expect(resolvedWrapper.find('.trade-ticket__tabs').text()).not.toContain('polkamarkt.modes.claim');
    expect(resolvedWrapper.find('.trade-ticket__claim-grid').exists()).toBe(false);

    const closedWrapper = mount(TradeTicket, {
      props: { market: { ...market, status: 'Closed' } },
      global: { stubs: globalStubs },
    });
    expect(closedWrapper.find('.trade-ticket__tabs').text()).not.toContain('polkamarkt.modes.claim');
    expect(closedWrapper.find('.trade-ticket__tabs').text()).toContain('polkamarkt.modes.buy');
  });

  it('disables trading actions after the market close block passes', () => {
    const wrapper = mount(TradeTicket, {
      props: { market: { ...market, closeBlock: 99 }, currentBlock: 100 },
      global: { stubs: globalStubs },
    });

    const submit = wrapper.get('.trade-ticket__submit');
    expect(submit.attributes('disabled')).toBeDefined();
    expect(submit.text()).toContain('polkamarkt.status.closed');
  });

  it('uses the primary trade action to connect disconnected accounts', async () => {
    mocks.walletStore.isLoggedIn = false;

    const wrapper = mount(TradeTicket, {
      props: { market },
      global: { stubs: globalStubs },
    });

    const submit = wrapper.get('.trade-ticket__submit');
    expect(submit.attributes('disabled')).toBeUndefined();
    expect(wrapper.find('.trade-ticket__connect').exists()).toBe(false);

    await submit.trigger('click');

    expect(mocks.connectSoraWallet).toHaveBeenCalled();
  });

  it('renders the create wizard with metadata and fee preview controls', () => {
    const wrapper = mount(CreateMarketDialog, {
      props: { visible: true },
      global: { stubs: globalStubs },
    });

    expect(wrapper.find('textarea').exists()).toBe(true);
    expect(wrapper.text()).toContain('polkamarkt.create.creationFee');
  });

  it('estimates create-market network fee without a connected account', async () => {
    vi.useFakeTimers();
    try {
      mocks.walletStore.isLoggedIn = false;
      mocks.api.polkamarkt.estimateMarketCreationFee.mockResolvedValueOnce({
        totalFee: '1000000000000000000',
        conditionFee: '600000000000000000',
        marketFee: '400000000000000000',
      });

      const wrapper = mount(CreateMarketDialog, {
        props: { visible: true },
        global: { stubs: globalStubs },
      });

      await vi.advanceTimersByTimeAsync(301);

      expect(mocks.api.polkamarkt.estimateMarketCreationFee).toHaveBeenCalledWith(
        expect.objectContaining({ question: '', closeBlock: expect.any(Number) })
      );
      expect(wrapper.text()).toContain('1 XOR');
      expect(wrapper.text()).not.toContain('0 XOR');
    } finally {
      mocks.walletStore.isLoggedIn = true;
      vi.useRealTimers();
    }
  });

  it('uses the create-market primary action to connect disconnected accounts', async () => {
    mocks.walletStore.isLoggedIn = false;

    const wrapper = mount(CreateMarketDialog, {
      props: { visible: true },
      global: { stubs: globalStubs },
    });

    const submit = wrapper.get('.create-market__button');
    expect(submit.attributes('disabled')).toBeUndefined();
    expect(submit.text()).toContain('connectWalletText');

    await submit.trigger('click');

    expect(mocks.connectSoraWallet).toHaveBeenCalled();
    expect(mocks.api.polkamarkt.createCondition).not.toHaveBeenCalled();
  });

  it('links create-market trading deadline and close block modes', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-05-31T00:00:00Z'));
      mocks.settingsStore.blockNumber = 100;

      const wrapper = mount(CreateMarketDialog, {
        props: { visible: true },
        global: { stubs: globalStubs },
      });

      await wrapper.get('input[type="datetime-local"]').setValue('2026-05-31T00:01');
      expect(wrapper.text()).toContain('7,300');

      await wrapper.get('[data-testid="polkamarkt-deadline-mode-block"]').trigger('click');
      const blockInput = wrapper.get('input[inputmode="numeric"]').element as HTMLInputElement;
      expect(blockInput.value).toBe('7300');

      await wrapper.get('input[inputmode="numeric"]').setValue('14500');
      await wrapper.get('[data-testid="polkamarkt-deadline-mode-date"]').trigger('click');

      const deadlineInput = wrapper.get('input[type="datetime-local"]');
      expect(deadlineInput.attributes('step')).toBeUndefined();
      expect((deadlineInput.element as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
      expect(wrapper.text()).toContain('14,500');
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps create-market form controls constrained to the dialog width', () => {
    expect(createMarketDialogSource).toContain('box-sizing: border-box;');
    expect(createMarketDialogSource).toContain('max-width: 100%;');
    expect(createMarketDialogSource).not.toContain('min-width: min(620px, calc(100vw - 48px))');
  });

  it('uses Polkaswap select controls instead of native browser selects', () => {
    expect(createMarketDialogSource).toContain('<s-select');
    expect(marketListSource).toContain('<s-select');
    expect(createMarketDialogSource).not.toContain('<select');
    expect(marketListSource).not.toContain('<select');
  });

  it('renders the My Markets panel for created markets and positions', () => {
    const wrapper = mount(MyPositionsPanel, {
      props: {
        markets: [market],
        positions: [{ id: 'p1', marketId: 1, marketTitle: market.title, yesShares: 2, noShares: 0 }],
        trades: [{ id: 't1', marketId: 1, marketTitle: market.title, side: 'buy' }],
        account: 'cnAccount',
        isLoggedIn: true,
      },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain(market.title);
    expect(wrapper.text()).toContain('polkamarkt.my.createdMarkets');
  });

  it('loads markets and account activity on the native page', async () => {
    const wrapper = mount(PolkamarktPage, {
      global: {
        stubs: {
          's-button': sButtonStub,
          's-icon': sIconStub,
          MarketList: true,
          MarketDetail: true,
          TradeTicket: true,
          MyPositionsPanel: true,
          CreateMarketDialog: true,
        },
      },
    });

    await vi.waitFor(() => expect(mocks.fetchMarkets).toHaveBeenCalled());
    await vi.waitFor(() =>
      expect(mocks.fetchHistory).toHaveBeenCalledWith(expect.objectContaining({ id: market.id }), 24)
    );
    await vi.waitFor(() => expect(mocks.fetchActivity).toHaveBeenCalledWith('cnAccount'));
    expect(wrapper.text()).toContain('pageTitle.Polkamarkt');
    expect(wrapper.text()).toContain('polkamarkt.disclaimer');
    expect(wrapper.find('.polkamarkt__market-discovery').exists()).toBe(true);
    expect(wrapper.find('.polkamarkt__workspace').exists()).toBe(false);
    expect(
      mocks.fetchHistory.mock.calls.some(([requested, limit]) => requested?.id === market.id && limit === undefined)
    ).toBe(false);
    expect(wrapper.get('.polkamarkt__external-link').attributes('href')).toBe('https://polkamarkt.com');
    expect(wrapper.get('.polkamarkt__external-link').attributes('rel')).toContain('noopener');
  });

  it('opens selected markets as a detail route and returns to the board', async () => {
    const marketListStub = defineComponent({
      props: ['markets'],
      emits: ['select'],
      template: `
        <section class="market-list-stub">
          <span class="market-list-count-stub">{{ markets.length }}</span>
          <button
            class="market-list-select-stub"
            type="button"
            :disabled="!markets.length"
            @click="$emit('select', markets[0])"
          >
            Select market
          </button>
        </section>
      `,
    });

    const wrapper = mount(PolkamarktPage, {
      global: {
        stubs: {
          's-button': sButtonStub,
          's-icon': sIconStub,
          MarketList: marketListStub,
          MarketDetail: defineComponent({
            props: ['market'],
            template: '<section class="market-detail-stub">{{ market?.title }}</section>',
          }),
          TradeTicket: defineComponent({ props: ['market'], template: '<aside class="trade-ticket-stub" />' }),
          MyPositionsPanel: defineComponent({ template: '<section class="my-positions-stub" />' }),
          CreateMarketDialog: true,
        },
      },
    });

    await vi.waitFor(() => expect(mocks.fetchMarkets).toHaveBeenCalled());
    await vi.waitFor(() => expect(wrapper.find('.market-list-count-stub').text()).toBe('1'));
    expect(wrapper.find('.polkamarkt__market-discovery').exists()).toBe(true);
    expect(wrapper.find('.polkamarkt__workspace').exists()).toBe(false);

    await wrapper.get('.market-list-select-stub').trigger('click');

    expect(mocks.routerPush).toHaveBeenCalledWith({ name: PageNames.Polkamarkt, params: { marketId: '1' } });
    await vi.waitFor(() => expect(wrapper.find('.market-detail-stub').text()).toContain(market.title));
    expect(wrapper.find('.polkamarkt__market-discovery').exists()).toBe(false);
    expect(wrapper.find('.polkamarkt__workspace').exists()).toBe(true);

    await wrapper.get('.polkamarkt__back').trigger('click');

    expect(mocks.routerReplace).toHaveBeenCalledWith({ name: PageNames.Polkamarkt });
    expect(wrapper.find('.polkamarkt__market-discovery').exists()).toBe(true);
    expect(wrapper.find('.polkamarkt__workspace').exists()).toBe(false);
  });

  it('collapses market workspace clutter when the active filter is empty', async () => {
    mocks.fetchMarkets.mockResolvedValueOnce([{ ...market, id: 'm-closed', chainId: 3, closeBlock: 99 }]);

    const wrapper = mount(PolkamarktPage, {
      global: {
        stubs: {
          's-button': sButtonStub,
          's-icon': sIconStub,
          MarketList: true,
          MarketDetail: defineComponent({ template: '<section class="market-detail-stub" />' }),
          TradeTicket: defineComponent({ template: '<aside class="trade-ticket-stub" />' }),
          MyPositionsPanel: defineComponent({ template: '<section class="my-positions-stub" />' }),
          CreateMarketDialog: true,
        },
      },
    });

    await vi.waitFor(() => expect(mocks.fetchMarkets).toHaveBeenCalled());

    expect(wrapper.find('.polkamarkt__workspace').exists()).toBe(false);
    expect(wrapper.find('.market-detail-stub').exists()).toBe(false);
    expect(wrapper.find('.trade-ticket-stub').exists()).toBe(false);
    expect(wrapper.find('.my-positions-stub').exists()).toBe(false);
  });

  it('keeps direct market routes selectable outside the active filter', async () => {
    const routedMarket = { ...market, id: 'm-closed', chainId: 3, closeBlock: 99, title: 'Direct closed route market' };
    mocks.route.params = { marketId: '3' };
    mocks.fetchMarkets.mockResolvedValueOnce([routedMarket, market]);

    const wrapper = mount(PolkamarktPage, {
      global: {
        stubs: {
          's-button': sButtonStub,
          's-icon': sIconStub,
          MarketList: true,
          MarketDetail: defineComponent({
            props: ['market'],
            template: '<section class="market-detail-stub">{{ market?.title }}</section>',
          }),
          TradeTicket: defineComponent({ template: '<aside class="trade-ticket-stub" />' }),
          MyPositionsPanel: defineComponent({ template: '<section class="my-positions-stub" />' }),
          CreateMarketDialog: true,
        },
      },
    });

    await vi.waitFor(() => expect(wrapper.find('.market-detail-stub').text()).toContain('Direct closed route market'));

    expect(wrapper.find('.polkamarkt__workspace').exists()).toBe(true);
    expect(wrapper.find('.polkamarkt__market-discovery').exists()).toBe(false);
  });
});
