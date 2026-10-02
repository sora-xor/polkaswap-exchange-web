import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import en from '@/lang/en.json';
import tradeTicketSource from '@/features/polkamarkt/components/TradeTicket.vue?raw';
import type { PolkamarktMarket } from '@/features/polkamarkt/types';

const mocks = vi.hoisted(() => ({
  quoteBuyTrade: vi.fn(),
  quoteSellTrade: vi.fn(),
  estimateBuyTradeNetworkFee: vi.fn().mockResolvedValue('1'),
  estimateSellTradeNetworkFee: vi.fn().mockResolvedValue('1'),
  getClaimableInfo: vi.fn(),
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params: Record<string, unknown> = {}) => {
      const value = key.split('.').reduce<unknown>((item, part) => {
        return item && typeof item === 'object' ? (item as Record<string, unknown>)[part] : undefined;
      }, en);
      return String(value ?? key).replace(/\{([^}]+)\}/g, (match, parameter: string) =>
        parameter in params ? String(params[parameter]) : match
      );
    },
  }),
}));
vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({ isLoggedIn: true, soraAddress: 'cnAccount', connectSoraWallet: vi.fn() }),
}));
vi.mock('@/composables/useTransaction', () => ({
  useTransaction: () => ({ loading: false, withNotifications: vi.fn() }),
}));
vi.mock('@/composables/useNotification', () => ({
  useNotification: () => ({ getErrorMessage: (error: Error) => error.message }),
}));
vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => ({ soraNetwork: 'main', history: {}, accountAssetsAddressTable: {} }),
}));
vi.mock('@/lib/soraneo-wallet/src/api', () => ({ api: { polkamarkt: mocks } }));

import TradeTicket from '@/features/polkamarkt/components/TradeTicket.vue';

const market: PolkamarktMarket = {
  id: 'm-1',
  chainId: 1,
  title: 'Will the event happen?',
  description: '',
  category: 'Crypto',
  liquidity: 1000,
  volume: 250,
  probability: 50,
  status: 'Open',
  closeBlock: 8000,
  mechanism: 'DynamicPariMutuel',
};

/** Mounts the ticket without any wallet, chart or network side effects. */
function mountTicket() {
  return mount(TradeTicket, {
    props: { market },
    global: {
      stubs: {
        SButton: { template: '<button><slot /></button>' },
        PricingCurvePositionChart: { template: '<div data-testid="always-visible-pricing-curve" />' },
      },
    },
  });
}

describe('Polkamarkt share purchase language and progressive disclosure', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.getClaimableInfo.mockResolvedValue({ status: 'Open', yesShares: '0', noShares: '0' });
    mocks.quoteBuyTrade.mockReset().mockResolvedValue({
      marketId: 1,
      outcome: 'Yes',
      collateralIn: '5000000000000000000',
      sharesOut: '10000000000000000000',
      feeAmount: '0',
    });
    mocks.quoteSellTrade.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('clearly distinguishes currency paid from shares received while preserving the buy amount', async () => {
    const wrapper = mountTicket();
    expect(wrapper.get('.trade-ticket__tabs').text()).toContain('Buy shares');
    expect(wrapper.findAll('.trade-field')[0].text()).toBe('You pay (KUSD)');
    expect(wrapper.get('.trade-ticket__quote-primary').text()).toContain('Shares you receive');
    expect(wrapper.text()).not.toMatch(/collateral/i);

    await wrapper.findAll('.trade-field input')[0].setValue('5');
    await vi.advanceTimersByTimeAsync(300);
    await flushPromises();

    expect(mocks.quoteBuyTrade).toHaveBeenCalledWith({
      marketId: 1,
      outcome: 'Yes',
      collateralIn: '5000000000000000000',
    });
    expect(wrapper.get('.trade-ticket__quote-primary').text()).toContain('10 shares');
    wrapper.unmount();
  });

  it('keeps optional settings collapsed, shows the curve, and shows holdings when selling', async () => {
    const wrapper = mountTicket();
    const settings = wrapper.get('[data-testid="trade-settings"]');
    expect(settings.element.tagName).toBe('DETAILS');
    expect(settings.attributes('open')).toBeUndefined();
    expect(settings.get('summary').text()).toBe('Trade settings');
    expect(settings.get('input').element.value).toBe('0.5');
    expect(wrapper.get('[data-testid="always-visible-pricing-curve"]').element.closest('details')).toBeNull();
    expect(wrapper.get('.trade-ticket__holdings').attributes('open')).toBeUndefined();

    const sell = wrapper.findAll('.trade-ticket__tabs button').find((button) => button.text() === 'Sell shares');
    await sell!.trigger('click');
    expect(wrapper.findAll('.trade-field')[0].text()).toBe('Shares to sell');
    expect(wrapper.get('.trade-ticket__quote-primary').text()).toContain('You receive');
    expect(wrapper.get('.trade-ticket__holdings').attributes('open')).toBeDefined();
    wrapper.unmount();
  });

  it('uses quiet empty estimates and shows probability labels only when values are available', async () => {
    const wrapper = mountTicket();
    expect(wrapper.findAll('.trade-ticket__quote strong').map((value) => value.text())).toEqual(['—', '—', '—']);
    expect(wrapper.findAll('.trade-ticket__outcomes small')).toHaveLength(0);
    expect(wrapper.get('.trade-ticket__submit').text()).toBe('Enter an amount');
    expect(wrapper.get('.trade-ticket__submit').attributes('disabled')).toBeDefined();

    await wrapper.setProps({
      market: { ...market, impliedYesProbabilityBps: 0, impliedNoProbabilityBps: 10000 },
    });
    expect(wrapper.findAll('.trade-ticket__outcomes small').map((label) => label.text())).toEqual([
      'Chance 0.00%',
      'Chance 100.00%',
    ]);
    wrapper.unmount();
  });

  it('puts the trade action before the always-visible curve and keeps shares below it', () => {
    const wrapper = mountTicket();
    const submit = wrapper.get('.trade-ticket__submit').element;
    const curve = wrapper.get('[data-testid="pricing-curve-ticket-helper"]').element;
    const holdings = wrapper.get('.trade-ticket__holdings').element;
    expect(submit.compareDocumentPosition(curve) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(curve.compareDocumentPosition(holdings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(curve.closest('details')).toBeNull();
    wrapper.unmount();
  });

  it('preserves the two-column outcome layout without invoking the Sass breakpoint helper', () => {
    expect(tradeTicketSource).toContain("grid-template-columns: repeat(2, #{'minmax(0, 1fr)'})");
    expect(tradeTicketSource).toContain("grid-template-columns: repeat(auto-fit, #{'minmax(120px, 1fr)'})");
    expect(tradeTicketSource).toContain('text-align: start;');
    expect(tradeTicketSource).toContain('text-align: end;');
  });
});
