import { mount } from '@vue/test-utils';
import { defineComponent, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const appClasses = ref(['app-main', 'app-main--swap']);
const effectiveDisclaimerVisibility = ref(true);
const libraryTheme = ref('dark');
const loading = ref(true);
const menuVisibility = ref(true);
const pageLoading = ref(true);
const routeParentLoading = ref(false);

const goTo = vi.fn();
const goToSwap = vi.fn();
const handleAppMenuClick = vi.fn();
const openProductDialog = vi.fn();
const toggleMenu = vi.fn();

vi.mock('@/app/shell/context', () => ({
  useAppShellContext: () => ({
    appClasses,
    effectiveDisclaimerVisibility,
    goTo,
    goToSwap,
    handleAppMenuClick,
    libraryTheme,
    loading,
    menuVisibility,
    openProductDialog,
    pageLoading,
    routeParentLoading,
    toggleMenu,
  }),
}));

vi.mock('@/shared/ui/async', () => {
  const { defineComponent } = require('vue') as typeof import('vue');

  return {
    createAsyncComponent: (loader: () => Promise<unknown>) => {
      const source = String(loader);
      if (source.includes('AppHeader')) {
        return defineComponent({
          name: 'AppHeaderStub',
          props: ['loading'],
          emits: ['toggle-menu'],
          template: '<button class="app-header-stub" @click="$emit(\'toggle-menu\')" />',
        });
      }
      if (source.includes('AppDisclaimer')) {
        return defineComponent({ name: 'AppDisclaimerStub', template: '<div class="app-disclaimer-stub" />' });
      }
      if (source.includes('AppFooter')) {
        return defineComponent({ name: 'AppFooterStub', template: '<div class="app-footer-stub" />' });
      }
      if (source.includes('AppLogoButton')) {
        return defineComponent({
          name: 'AppLogoButtonStub',
          props: ['theme'],
          emits: ['click'],
          template: '<button class="app-logo-button-stub" @click="$emit(\'click\')" />',
        });
      }
      if (source.includes('AppMenu')) {
        return defineComponent({
          name: 'AppMenuStub',
          props: ['visible', 'onSelect'],
          emits: ['open-product-dialog', 'click'],
          template: '<div class="app-menu-stub"><slot name="head" /></div>',
        });
      }
      return defineComponent({ name: 'AsyncComponentStub', template: '<div class="async-component-stub" />' });
    },
  };
});

vi.mock('@/components/App/Footer/AppFooter.vue', () => ({
  default: defineComponent({ name: 'AppFooterStub', template: '<div class="app-footer-stub" />' }),
}));
vi.mock('@/components/App/Header/AppDisclaimer.vue', () => ({
  default: defineComponent({ name: 'AppDisclaimerStub', template: '<div class="app-disclaimer-stub" />' }),
  __isTeleport: false,
  __isKeepAlive: false,
  name: 'AppDisclaimerStub',
}));
let AppShellLayout: (typeof import('@/app/shell/AppShellLayout.vue'))['default'];

beforeEach(async () => {
  appClasses.value = ['app-main', 'app-main--swap'];
  effectiveDisclaimerVisibility.value = true;
  libraryTheme.value = 'dark';
  loading.value = true;
  menuVisibility.value = true;
  pageLoading.value = true;
  routeParentLoading.value = false;
  goTo.mockClear();
  goToSwap.mockClear();
  handleAppMenuClick.mockClear();
  openProductDialog.mockClear();
  toggleMenu.mockClear();

  AppShellLayout = (await import('@/app/shell/AppShellLayout.vue')).default;
});

describe('AppShellLayout', () => {
  it('renders shell state from the app shell context', async () => {
    const wrapper = mount(AppShellLayout, {
      global: {
        stubs: {
          'router-view': defineComponent({
            name: 'RouterViewStub',
            props: ['parentLoading'],
            template: '<div class="router-view-stub" />',
          }),
          's-scrollbar': defineComponent({
            name: 'SScrollbarStub',
            template: '<div class="s-scrollbar-stub"><slot /></div>',
          }),
        },
      },
    });

    await vi.dynamicImportSettled();
    await nextTick();

    expect(wrapper.findComponent({ name: 'AppHeaderStub' }).props('loading')).toBe(true);
    expect(wrapper.findComponent({ name: 'AppMenuStub' }).props('visible')).toBe(true);
    expect(wrapper.findComponent({ name: 'AppMenuStub' }).props('onSelect')).toBe(goTo);
    expect(wrapper.findComponent({ name: 'AppLogoButtonStub' }).props('theme')).toBe('dark');
    expect(wrapper.findComponent({ name: 'RouterViewStub' }).props('parentLoading')).toBe(false);
    expect(wrapper.findComponent({ name: 'AppDisclaimerStub' }).exists()).toBe(true);
    expect(wrapper.find('.app-main--swap').exists()).toBe(true);
  });

  it('routes layout interactions back through the shell context', async () => {
    const wrapper = mount(AppShellLayout, {
      global: {
        stubs: {
          'router-view': defineComponent({
            name: 'RouterViewStub',
            props: ['parentLoading'],
            template: '<div class="router-view-stub" />',
          }),
          's-scrollbar': defineComponent({
            name: 'SScrollbarStub',
            template: '<div class="s-scrollbar-stub"><slot /></div>',
          }),
        },
      },
    });

    await wrapper.findComponent({ name: 'AppHeaderStub' }).trigger('click');
    await wrapper.findComponent({ name: 'AppMenuStub' }).vm.$emit('open-product-dialog', 'soraMobile');
    await wrapper.findComponent({ name: 'AppMenuStub' }).vm.$emit('click', new Event('click'));
    await wrapper.findComponent({ name: 'AppLogoButtonStub' }).trigger('click');

    expect(toggleMenu).toHaveBeenCalledTimes(1);
    expect(openProductDialog).toHaveBeenCalledWith('soraMobile');
    expect(handleAppMenuClick).toHaveBeenCalledTimes(1);
    expect(goToSwap).toHaveBeenCalledTimes(1);
  });
});
