import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

import { PageNames } from '@/consts';

const {
  routeMock,
  settingsStore,
  routerStore,
  setMenuCollapsedMock,
  resizeObserverObserveMock,
  resizeObserverDisconnectMock,
} = vi.hoisted(() => ({
  routeMock: {
    name: 'Swap',
  },
  settingsStore: {
    menuCollapsed: false,
    faucetUrl: '',
    libraryTheme: 'light',
    orderBookEnabled: true,
    debugEnabled: false,
    kensetsuEnabled: true,
    assetOwnerEnabled: true,
    setMenuCollapsed: vi.fn(),
  },
  routerStore: {
    loading: false,
  },
  setMenuCollapsedMock: vi.fn(),
  resizeObserverObserveMock: vi.fn(),
  resizeObserverDisconnectMock: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
}));

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStore,
}));

vi.mock('@/stores/router', () => ({
  useRouterStore: () => routerStore,
}));

import AppMenu from '@/components/App/Menu/AppMenu.vue';

const SidebarItemContentStub = defineComponent({
  name: 'AppSidebarItemContentStub',
  props: {
    icon: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
    href: {
      type: String,
      default: '',
    },
    tag: {
      type: String,
      default: 'div',
    },
  },
  setup(props, { attrs }) {
    return () =>
      h('div', {
        class: ['sidebar-item-content-stub', attrs.class],
        'data-icon': props.icon || undefined,
        'data-title': props.title || undefined,
        'data-href': props.href || undefined,
        'data-tag': props.tag || undefined,
      });
  },
});

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }
  observe(target: Element): void {
    resizeObserverObserveMock(target);
    this.callback([], this as unknown as ResizeObserver);
  }
  disconnect(): void {
    resizeObserverDisconnectMock();
  }
  unobserve(): void {}
}

describe('AppMenu', () => {
  beforeEach(() => {
    routerStore.loading = false;
    settingsStore.menuCollapsed = false;
    settingsStore.faucetUrl = '';
    routeMock.name = PageNames.Swap;
    settingsStore.orderBookEnabled = true;
    settingsStore.debugEnabled = false;
    settingsStore.kensetsuEnabled = true;
    settingsStore.assetOwnerEnabled = true;
    settingsStore.setMenuCollapsed = setMenuCollapsedMock;
    setMenuCollapsedMock.mockReset();
    resizeObserverObserveMock.mockReset();
    resizeObserverDisconnectMock.mockReset();

    vi.clearAllMocks();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock as unknown as ResizeObserver);
  });

  function mountComponent(
    visible = true,
    appInfoPopperStub: { template: string; emits?: string[] } = {
      template: '<div class="app-info-popper-stub"><slot /></div>',
    }
  ) {
    return mount(AppMenu, {
      props: {
        visible,
        onSelect: vi.fn(),
      },
      global: {
        stubs: {
          's-button': { template: '<button class="s-button-stub"><slot name="icon" /><slot /></button>' },
          SButton: { template: '<button class="s-button-stub"><slot name="icon" /><slot /></button>' },
          's-scrollbar': { template: '<div class="s-scrollbar-stub"><slot /></div>' },
          SScrollbar: { template: '<div class="s-scrollbar-stub"><slot /></div>' },
          's-menu': { template: '<div class="s-menu-stub"><slot /></div>' },
          SMenu: { template: '<div class="s-menu-stub"><slot /></div>' },
          's-menu-item-group': { template: '<div class="s-menu-item-group-stub"><slot /></div>' },
          SMenuItemGroup: { template: '<div class="s-menu-item-group-stub"><slot /></div>' },
          's-menu-item': { template: '<div class="s-menu-item-stub"><slot /></div>' },
          SMenuItem: { template: '<div class="s-menu-item-stub"><slot /></div>' },
          AppInfoPopper: appInfoPopperStub,
          'app-info-popper': appInfoPopperStub,
          AppSidebarItemContent: SidebarItemContentStub,
          'app-sidebar-item-content': SidebarItemContentStub,
        },
        directives: {
          button: {},
        },
      },
    });
  }

  it('renders production sidebar icons by default', () => {
    const wrapper = mountComponent();

    const renderedRouteItems = wrapper
      .findAll('.sidebar-item-content-stub')
      .map((item) => ({
        href: item.attributes('data-href'),
        icon: item.attributes('data-icon'),
      }))
      .filter((item) => item.href?.startsWith('#/'));

    const expectedRouteItems = [
      { href: '#/swap', icon: 'arrows-swap-90-24' },
      { href: '#/trade', icon: 'music-CD-24' },
      { href: '#/points', icon: 'basic-circle-star-24' },
      { href: '#/pool', icon: 'basic-drop-24' },
      { href: '#/staking', icon: 'basic-layers-24' },
      { href: '#/bridge', icon: 'grid-block-distribute-vertically-24' },
      { href: '#/burn', icon: 'basic-flame-24' },
      { href: '#/wallet', icon: 'finance-wallet-24' },
      { href: '#/kensetsu', icon: 'call-phone-16' },
      { href: '#/explore', icon: 'various-items-24' },
      { href: '#/stats', icon: 'various-planet-24' },
      { href: '#/dashboard/owner', icon: 'various-rocket-24' },
    ];

    expect(renderedRouteItems).toEqual(expectedRouteItems);
  });

  it('keeps SCCP hidden from the sidebar even when debug flag is enabled', () => {
    settingsStore.debugEnabled = true;
    const wrapper = mountComponent();

    const renderedRouteItems = wrapper
      .findAll('.sidebar-item-content-stub')
      .map((item) => ({
        href: item.attributes('data-href'),
        icon: item.attributes('data-icon'),
      }))
      .filter((item) => item.href?.startsWith('#/'));

    expect(renderedRouteItems).not.toContainEqual({ href: '#/bridge/sccp', icon: 'various-planet-24' });
  });

  it('uses production icons for about and info footer entries', () => {
    const wrapper = mountComponent();
    const items = wrapper.findAll('.sidebar-item-content-stub');

    const about = items.find((item) => item.attributes('data-href') === 'https://about.polkaswap.io');
    const info = items.find((item) => item.attributes('data-title') === 'footerMenu.info');

    expect(about?.attributes('data-icon')).toBe('finance-PSWAP-24');
    expect(info?.attributes('data-icon')).toBe('info-16');
  });

  it('toggles visible class based on menu visibility', async () => {
    const wrapper = mountComponent(true);

    expect(wrapper.classes()).toContain('visible');

    await wrapper.setProps({ visible: false });

    expect(wrapper.classes()).not.toContain('visible');
  });

  it('tracks sidebar width and clears observer-driven sidebar styles on unmount', () => {
    const clientWidthSpy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function () {
      return this.classList?.contains('app-sidebar') ? 280 : 0;
    });

    const wrapper = mountComponent();

    expect(resizeObserverObserveMock).toHaveBeenCalledTimes(1);
    expect(document.documentElement.style.getPropertyValue('--sidebar-width')).toBe('280px');

    wrapper.unmount();

    expect(resizeObserverDisconnectMock).toHaveBeenCalledTimes(1);
    expect(document.documentElement.style.getPropertyValue('--sidebar-width')).toBe('');

    clientWidthSpy.mockRestore();
  });

  it('forwards product popup requests from the info popper', async () => {
    const wrapper = mountComponent(true, {
      emits: ['open-product-dialog'],
      template:
        '<button class="app-info-popper-trigger" @click="$emit(\'open-product-dialog\', \'soraMobile\')"><slot /></button>',
    });

    await wrapper.get('.app-info-popper-trigger').trigger('click');

    expect(wrapper.emitted('open-product-dialog')).toHaveLength(1);
    expect(wrapper.emitted('open-product-dialog')?.[0]).toEqual(['soraMobile']);
  });
});
