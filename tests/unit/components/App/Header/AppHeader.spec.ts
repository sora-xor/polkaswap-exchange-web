import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

import { PageNames } from '@/consts';
import { BreakpointClass } from '@/consts/layout';

const { goToMock, routeMock, settingsStoreMock } = vi.hoisted(() => ({
  goToMock: vi.fn(),
  routeMock: { path: '/swap', name: 'Swap', query: {} },
  settingsStoreMock: {
    screenBreakpointClass: 'min-desktop',
    libraryTheme: 'light',
  },
}));

vi.mock('@/app/router', () => ({ goTo: goToMock }));
vi.mock('vue-router', () => ({ useRoute: () => routeMock }));
vi.mock('@/stores/settings', () => ({ useSettingsStore: () => settingsStoreMock }));
vi.mock('@/composables/useInternalConnect', () => ({
  useInternalConnect: () => ({ navigateToWallet: vi.fn() }),
}));
vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => (key === 'buyXor.entry' ? 'Buy XOR' : key) }),
}));

vi.mock('@/app/shell/components', () => {
  const stub = { template: '<div />' };
  return {
    AccelerationAccessDialog: stub,
    AppLogoButton: stub,
    AppMarketing: stub,
    BotRunsButton: { template: '<button data-testid="bot-runs-button" />' },
    PairTokenLogo: { template: '<span data-test-name="paymentTokenPair" />' },
    RotatePhoneDialog: stub,
    SelectCurrencyDialog: stub,
    SelectLanguageDialog: stub,
  };
});
vi.mock('@/components/App/Header/AppAccountButton.vue', () => ({ default: { template: '<button />' } }));
vi.mock('@/components/App/Header/AppHeaderMenu.vue', () => ({ default: { template: '<div />' } }));
vi.mock('@/components/shared/Logo/Polkaswap.vue', () => ({ default: { template: '<span />' } }));

import AppHeader from '@/components/App/Header/AppHeader.vue';
import { botRunsHint } from '@/features/bot-trading/run-hint';

/** Mounts the header without wallet providers or asynchronous shell components. */
function mountHeader(checkout = false) {
  return mount(AppHeader, {
    props: { checkout },
    global: {
      stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } },
    },
  });
}

beforeEach(() => {
  goToMock.mockClear();
  routeMock.path = '/swap';
  routeMock.name = PageNames.Swap;
  routeMock.query = {};
  settingsStoreMock.screenBreakpointClass = BreakpointClass.Desktop;
  botRunsHint.value = false;
});

describe('AppHeader Buy XOR entry', () => {
  it.each([
    [BreakpointClass.Mobile, false],
    [BreakpointClass.LargeMobile, false],
    [BreakpointClass.Desktop, true],
    [BreakpointClass.LargeDesktop, true],
  ])('keeps one named primary purchase action at %s', async (breakpoint, showsTokenPair) => {
    settingsStoreMock.screenBreakpointClass = breakpoint;
    const wrapper = mountHeader();
    const actions = wrapper.findAll('button[aria-label="Buy XOR"]');

    expect(actions).toHaveLength(1);
    const action = actions[0];
    expect(action.isVisible()).toBe(true);
    expect(action.attributes('data-test-name')).toBe('headerBuyXor');
    expect(action.text()).toBe('Buy XOR');
    expect(action.classes()).toContain('s-button-stub--primary');
    expect(action.find('[data-test-name="paymentTokenPair"]').exists()).toBe(showsTokenPair);

    await action.trigger('click');
    expect(goToMock).toHaveBeenCalledExactlyOnceWith(PageNames.BuyXor);
  });

  it.each(['/buy-xor', '/get-ts'])('hides the purchase entry within the %s checkout', (path) => {
    routeMock.path = path;
    const wrapper = mountHeader(true);

    expect(wrapper.find('[data-test-name="headerBuyXor"]').exists()).toBe(false);
    expect(wrapper.get('.checkout-brand').attributes('href')).toBe(path);
    expect(wrapper.get('.checkout-exit').attributes('href')).toBe('/swap');
    expect(goToMock).not.toHaveBeenCalled();
  });
});

describe('AppHeader bot runs', () => {
  it('shows the bots button only when this browser has bots to show', async () => {
    const wrapper = mountHeader();
    expect(wrapper.find('[data-testid="bot-runs-button"]').exists()).toBe(false);

    botRunsHint.value = true;
    await nextTick();
    const button = wrapper.get('[data-testid="bot-runs-button"]');
    // It sits with the account controls, before the account button.
    expect(button.element.parentElement?.classList.contains('app-controls')).toBe(true);
    expect(button.element.parentElement?.classList.contains('app-controls--middle')).toBe(false);
  });

  it('keeps checkout focused on the purchase', () => {
    botRunsHint.value = true;
    routeMock.path = '/buy-xor';
    expect(mountHeader(true).find('[data-testid="bot-runs-button"]').exists()).toBe(false);
  });
});
