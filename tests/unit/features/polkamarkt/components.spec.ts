import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';

import type { PolkamarktMarket } from '@/features/polkamarkt/types';
import createMarketDialogSource from '@/features/polkamarkt/components/CreateMarketDialog.vue?raw';
import marketListSource from '@/features/polkamarkt/components/MarketList.vue?raw';
import marketOutcomeChartSource from '@/features/polkamarkt/components/MarketOutcomeChart.vue?raw';
import marketShareWidgetSource from '@/features/polkamarkt/components/MarketShareWidget.vue?raw';

const mocks = vi.hoisted(() => ({
  route: { params: {} as Record<string, unknown> },
  routerPush: vi.fn(),
  fetchMarkets: vi.fn(),
  fetchHistory: vi.fn(),
  fetchActivity: vi.fn(),
  walletStore: {
    isLoggedIn: true,
    accountAssetsAddressTable: {
      '0x02000c0000000000000000000000000000000000000000000000000000000000': {
        balance: { transferable: '1000000000000000000000' },
      },
      '0x0200000000000000000000000000000000000000000000000000000000000000': {
        balance: { transferable: '1000000000000000000000' },
      },
    },
  },
  settingsStore: { blockNumber: 100 },
  connectSoraWallet: vi.fn(),
  withNotifications: vi.fn(async (handler: () => Promise<void>) => handler()),
  api: {
    polkamarkt: {
      estimateMarketCreationFee: vi.fn().mockResolvedValue({ totalFee: '1', conditionFee: '1', marketFee: '0' }),
      quoteBuyTrade: vi.fn(),
      quoteSellTrade: vi.fn(),
      quoteAddLiquidity: vi.fn(),
      quoteFlipPosition: vi.fn(),
      estimateBuyTradeNetworkFee: vi.fn().mockResolvedValue('1'),
      estimateSellTradeNetworkFee: vi.fn().mockResolvedValue('1'),
      estimateFlipNetworkFee: vi.fn().mockResolvedValue('1'),
      estimateAddLiquidityNetworkFee: vi.fn().mockResolvedValue('1'),
      getClaimableInfo: vi.fn(),
      estimateClaimMarketNetworkFee: vi.fn().mockResolvedValue('1'),
      submitBuyTrade: vi.fn(),
      submitSellTrade: vi.fn(),
      flipPosition: vi.fn(),
      addLiquidity: vi.fn(),
      claimMarket: vi.fn(),
      claimCreatorFees: vi.fn(),
      claimCreatorLiquidity: vi.fn(),
      claimLiquidity: vi.fn(),
      createCondition: vi.fn().mockResolvedValue({ conditionId: 9 }),
      createMarket: vi.fn().mockResolvedValue({ marketId: 10 }),
    },
  },
}));

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.routerPush }),
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
  marketHistoryFallback: (market?: PolkamarktMarket) =>
    market?.probability === undefined
      ? []
      : [
          {
            id: `current-${market.id}`,
            marketId: market.chainId,
            probability: market.probability,
          },
        ],
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
import CreateMarketDialog from '@/features/polkamarkt/components/CreateMarketDialog.vue';
import MarketDetail from '@/features/polkamarkt/components/MarketDetail.vue';
import MarketList from '@/features/polkamarkt/components/MarketList.vue';
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

const globalStubs = {
  's-button': sButtonStub,
  's-select': sSelectStub,
};

describe('polkamarkt components', () => {
  beforeEach(() => {
    mocks.route.params = {};
    mocks.routerPush.mockReset();
    mocks.fetchMarkets.mockReset().mockResolvedValue([market]);
    mocks.fetchHistory.mockReset().mockResolvedValue([
      { id: 'h1', marketId: 1, timestamp: 1780229164, probability: 60 },
      { id: 'h2', marketId: 1, timestamp: 1780232764, probability: 63 },
    ]);
    mocks.fetchActivity.mockReset().mockResolvedValue({
      account: 'cnAccount',
      positions: [{ id: 'p1', marketId: 1, marketTitle: market.title, yesShares: 2, noShares: 0, lpShares: 1 }],
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
    mocks.api.polkamarkt.quoteBuyTrade.mockReset();
    mocks.api.polkamarkt.quoteSellTrade.mockReset();
    mocks.api.polkamarkt.quoteAddLiquidity.mockReset();
    mocks.api.polkamarkt.quoteFlipPosition.mockReset();
    mocks.api.polkamarkt.estimateBuyTradeNetworkFee.mockReset().mockResolvedValue('1');
    mocks.api.polkamarkt.estimateSellTradeNetworkFee.mockReset().mockResolvedValue('1');
    mocks.api.polkamarkt.estimateFlipNetworkFee.mockReset().mockResolvedValue('1');
    mocks.api.polkamarkt.estimateAddLiquidityNetworkFee.mockReset().mockResolvedValue('1');
    mocks.api.polkamarkt.submitBuyTrade.mockReset();
    mocks.api.polkamarkt.submitSellTrade.mockReset();
    mocks.api.polkamarkt.flipPosition.mockReset();
    mocks.api.polkamarkt.addLiquidity.mockReset();
    mocks.api.polkamarkt.getClaimableInfo.mockReset().mockResolvedValue({
      marketId: 1,
      account: 'cnAccount',
      status: 'Resolved',
      yesShares: '0',
      noShares: '0',
      netCollateralPaid: '0',
      traderPayout: '1000000000000000000',
      creatorFees: '0',
      creatorLiquidity: '0',
      isCreator: false,
    });
    mocks.api.polkamarkt.estimateClaimMarketNetworkFee.mockClear().mockResolvedValue('1');
    mocks.api.polkamarkt.createCondition.mockClear();
    mocks.api.polkamarkt.createMarket.mockClear();
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
    expect(wrapper.find('[data-testid="market-share-widget"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="market-share-actions"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="market-share-native"]').exists()).toBe(true);
    expect(wrapper.find('a[href^="https://t.me/share/url"]').exists()).toBe(true);
    expect(wrapper.find('a[href^="https://twitter.com/intent/tweet"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="market-history-line-yes"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="market-history-line-no"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="market-history-label-yes"]').text()).toContain('YES 63%');
    expect(wrapper.find('[data-testid="market-history-label-no"]').text()).toContain('NO 37%');
    expect(wrapper.find('svg [data-testid="market-history-label-yes"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="market-history-label-yes"]').element.tagName).toBe('SPAN');
  });

  it('keeps chart labels outside stretching SVG viewports', () => {
    expect(marketOutcomeChartSource).toContain('class="market-outcome-chart__plot-layer"');
    expect(marketOutcomeChartSource).toContain('gridLabelStyle(value)');
    expect(marketOutcomeChartSource).not.toContain('<text');
    expect(marketShareWidgetSource).toContain('chartGridLabelStyle(value)');
    expect(marketShareWidgetSource).not.toContain('<text');
  });

  it('renders trade ticket modes without quoting before an amount is entered', () => {
    const wrapper = mount(TradeTicket, {
      props: { market },
      global: { stubs: globalStubs },
    });

    expect(wrapper.text()).toContain('polkamarkt.ticket.title');
    expect(wrapper.text()).not.toContain('polkamarkt.ticket.subtitle');
    expect(wrapper.find('.trade-ticket__tabs').text()).not.toContain('polkamarkt.modes.claim');
    expect(wrapper.get('[data-testid="trade-ticket-outcome-yes"]').text()).toContain('0.63 KUSD');
    expect(wrapper.get('[data-testid="trade-ticket-outcome-yes"]').text()).toContain('63%');
    expect(wrapper.get('[data-testid="trade-ticket-outcome-no"]').text()).toContain('0.37 KUSD');
    expect(wrapper.get('[data-testid="trade-ticket-outcome-no"]').text()).toContain('37%');
    expect(wrapper.get('.trade-ticket__split').attributes('aria-label')).toContain('63%');
    expect(mocks.api.polkamarkt.quoteBuyTrade).not.toHaveBeenCalled();
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

  it('blocks trade signing until the current debounced quote is available', async () => {
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
        creatorFees: '0',
        creatorLiquidity: '0',
        isCreator: false,
      });
      mocks.api.polkamarkt.quoteBuyTrade.mockResolvedValueOnce({
        marketId: 1,
        outcome: 'Yes',
        collateralIn: '1000000000000000000',
        feeAmount: '0',
        pricingCollateral: '1000000000000000000',
        sharesOut: '2000000000000000000',
      });

      const wrapper = mount(TradeTicket, {
        props: { market },
        global: { stubs: globalStubs },
      });

      await wrapper.get('.trade-field--amount input').setValue('1');

      expect(wrapper.get('.trade-ticket__submit').attributes('disabled')).toBeDefined();
      expect(wrapper.text()).toContain('polkamarkt.ticket.refreshingQuote');
      expect(mocks.api.polkamarkt.submitBuyTrade).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(301);
      await vi.waitFor(() => expect(mocks.api.polkamarkt.estimateBuyTradeNetworkFee).toHaveBeenCalled());
      await vi.waitFor(() => expect(wrapper.get('.trade-ticket__submit').text()).toContain('polkamarkt.actions.buy'));

      await wrapper.get('.trade-ticket__submit').trigger('click');

      expect(mocks.api.polkamarkt.submitBuyTrade).toHaveBeenCalledWith(
        expect.objectContaining({
          collateralIn: '1000000000000000000',
          minSharesOut: '1990000000000000000',
        })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not sign trades when the quote RPC returns no output', async () => {
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
        creatorFees: '0',
        creatorLiquidity: '0',
        isCreator: false,
      });
      mocks.api.polkamarkt.quoteBuyTrade.mockResolvedValueOnce(null);

      const wrapper = mount(TradeTicket, {
        props: { market },
        global: { stubs: globalStubs },
      });

      await wrapper.get('.trade-field--amount input').setValue('1');
      await vi.advanceTimersByTimeAsync(301);
      await vi.waitFor(() => expect(wrapper.text()).toContain('polkamarkt.ticket.quoteFailed'));

      expect(wrapper.get('.trade-ticket__submit').attributes('disabled')).toBeDefined();
      await wrapper.get('.trade-ticket__submit').trigger('click');

      expect(mocks.withNotifications).not.toHaveBeenCalled();
      expect(mocks.api.polkamarkt.submitBuyTrade).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('invalidates a resolved quote when trade inputs change before submit', async () => {
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
        creatorFees: '0',
        creatorLiquidity: '0',
        isCreator: false,
      });
      mocks.api.polkamarkt.quoteBuyTrade.mockResolvedValueOnce({
        marketId: 1,
        outcome: 'Yes',
        collateralIn: '1000000000000000000',
        feeAmount: '0',
        pricingCollateral: '1000000000000000000',
        sharesOut: '2000000000000000000',
      });

      const wrapper = mount(TradeTicket, {
        props: { market },
        global: { stubs: globalStubs },
      });

      await wrapper.get('.trade-field--amount input').setValue('1');
      await vi.advanceTimersByTimeAsync(301);
      await vi.waitFor(() => expect(mocks.api.polkamarkt.estimateBuyTradeNetworkFee).toHaveBeenCalled());
      await vi.waitFor(() => expect(wrapper.get('.trade-ticket__submit').text()).toContain('polkamarkt.actions.buy'));

      await wrapper.get('.trade-field--amount input').setValue('2');

      expect(wrapper.get('.trade-ticket__submit').attributes('disabled')).toBeDefined();
      await wrapper.get('.trade-ticket__submit').trigger('click');
      expect(mocks.api.polkamarkt.submitBuyTrade).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
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
        expect.objectContaining({ question: '', seedLiquidity: '100000000000000000000' })
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

      expect((wrapper.get('input[type="datetime-local"]').element as HTMLInputElement).value).toBeTruthy();
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

  it('renders the My Markets / LP panel for created markets and positions', () => {
    const wrapper = mount(MyPositionsPanel, {
      props: {
        markets: [market],
        positions: [{ id: 'p1', marketId: 1, marketTitle: market.title, yesShares: 2, noShares: 0, lpShares: 1 }],
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
          MarketList: true,
          MarketDetail: true,
          TradeTicket: true,
          MyPositionsPanel: true,
          CreateMarketDialog: true,
        },
      },
    });

    await vi.waitFor(() => expect(mocks.fetchMarkets).toHaveBeenCalled());
    await vi.waitFor(() => expect(mocks.fetchHistory).toHaveBeenCalledWith(expect.objectContaining({ id: market.id })));
    await vi.waitFor(() => expect(mocks.fetchActivity).toHaveBeenCalledWith('cnAccount'));
    expect(wrapper.text()).toContain('pageTitle.Polkamarkt');
    expect(wrapper.text()).toContain('polkamarkt.disclaimer');
    expect(wrapper.get('.polkamarkt__external-link').attributes('href')).toBe('https://polkamarkt.com');
    expect(wrapper.get('.polkamarkt__external-link').attributes('rel')).toContain('noopener');
  });
});
