import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';

const {
  applyThemeMock,
  hideDropdownMock,
  listenForDeviceRotationMock,
  removeDeviceRotationListenerMock,
  setThemeMock,
  settingsStoreMock,
  walletStoreMock,
} = vi.hoisted(() => {
  const applyThemeMock = vi.fn();
  const setThemeMock = vi.fn();
  const hideDropdownMock = vi.fn();
  const listenForDeviceRotationMock = vi.fn();
  const removeDeviceRotationListenerMock = vi.fn();

  const settingsStoreMock = {
    disclaimerVisibility: true,
    userDisclaimerApprove: false,
    isRotatePhoneHideBalanceFeatureEnabled: false,
    isAccessRotationListener: true,
    isAccessAccelerometrEventDeclined: false,
    isThemePreference: false,
    screenBreakpointClass: 'desktop',
    isTMA: false,
    language: 'en',
    currency: 'usd',
    setIsRotatePhoneHideBalanceFeatureEnabled: vi.fn(),
    setRotatePhoneDialogVisibility: vi.fn(),
    setSelectLanguageDialogVisibility: vi.fn(),
    setSelectCurrencyDialogVisibility: vi.fn(),
    setAlertSettingsPopup: vi.fn(),
    toggleDisclaimerDialogVisibility: vi.fn(),
    setIsThemePreference: vi.fn(),
  };

  const walletStoreMock = {
    shouldBalanceBeHidden: false,
    theme: 'light',
    toggleHideBalance: vi.fn(),
    setTheme: setThemeMock,
  };

  return {
    applyThemeMock,
    hideDropdownMock,
    listenForDeviceRotationMock,
    removeDeviceRotationListenerMock,
    setThemeMock,
    settingsStoreMock,
    walletStoreMock,
  };
});

vi.mock('@/composables/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/stores/settings', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/stores/wallet', () => ({
  useWalletStore: () => walletStoreMock,
}));

vi.mock('@/utils/switchTheme', () => ({
  applyTheme: applyThemeMock,
}));

vi.mock('@/utils/telegram', () => ({
  tmaSdkService: {
    listenForDeviceRotation: listenForDeviceRotationMock,
    removeDeviceRotationListener: removeDeviceRotationListenerMock,
  },
}));

import AppHeaderMenu from '@/components/App/Header/AppHeaderMenu.vue';

const SButtonStub = defineComponent({
  name: 'SButtonStub',
  props: {
    type: {
      type: String,
      default: 'primary',
    },
    icon: {
      type: String,
      default: '',
    },
  },
  emits: ['click'],
  setup(props, { attrs, emit, slots }) {
    return () => {
      const children: Array<ReturnType<typeof h>> = [];

      if (props.type === 'action') {
        if (slots.icon) {
          children.push(...slots.icon());
        } else if (props.icon) {
          children.push(h('i', { class: 's-button-icon-stub', 'data-icon': props.icon }));
        }
        if (slots.default) {
          children.push(...slots.default());
        }
      } else {
        if (props.icon) {
          children.push(h('i', { class: 's-button-icon-stub', 'data-icon': props.icon }));
        }
        if (slots.default) {
          children.push(...slots.default());
        }
      }

      return h(
        'button',
        {
          class: ['s-button-stub', attrs.class],
          'data-type': props.type,
          'data-icon': props.icon || undefined,
          onClick: (event: Event) => emit('click', event),
        },
        children
      );
    };
  },
});

const SDropdownStub = defineComponent({
  name: 'SDropdownStub',
  props: {
    icon: {
      type: String,
      default: '',
    },
  },
  setup(props, { attrs, slots, expose }) {
    expose({
      hide: hideDropdownMock,
    });

    return () =>
      h('div', { class: ['s-dropdown-stub', attrs.class], 'data-icon': props.icon || undefined }, [
        slots.default ? h('div', { class: 's-dropdown-trigger-slot' }, slots.default()) : null,
        h('i', { class: 's-dropdown-icon-stub', 'data-icon': props.icon || undefined }),
        slots.menu ? h('div', { class: 's-dropdown-menu-slot' }, slots.menu()) : null,
      ]);
  },
});

const SDropdownItemStub = defineComponent({
  name: 'SDropdownItemStub',
  inheritAttrs: false,
  props: {
    icon: {
      type: [String, null],
      default: null,
    },
    value: {
      type: String,
      default: '',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['click', 'keydown'],
  setup(props, { attrs, slots, emit }) {
    const forwardEvent = (listener: unknown, event: Event): void => {
      if (typeof listener === 'function') {
        listener(event);
      }
    };

    return () =>
      h(
        'div',
        {
          class: ['s-dropdown-item-stub', attrs.class],
          'data-test-name': attrs['data-test-name'] as string | undefined,
          'data-value': props.value || undefined,
          'data-disabled': props.disabled ? 'true' : 'false',
          tabindex: attrs.tabindex as string | number | undefined,
          role: attrs.role as string | undefined,
          onClick: (event: Event) => {
            forwardEvent(attrs.onClick, event);
            emit('click', event);
          },
          onKeydown: (event: KeyboardEvent) => {
            forwardEvent(attrs.onKeydown, event);
            emit('keydown', event);
          },
        },
        [props.icon ? h('i', { class: 's-dropdown-item-icon-stub', 'data-icon': props.icon }) : null, slots.default?.()]
      );
  },
});

const SIconStub = defineComponent({
  name: 'SIconStub',
  props: {
    name: {
      type: String,
      default: '',
    },
    size: {
      type: String,
      default: '',
    },
  },
  setup(props, { attrs }) {
    return () =>
      h('i', {
        class: ['s-icon-stub', attrs.class],
        'data-icon': props.name || undefined,
        'data-size': props.size || undefined,
      });
  },
});

describe('AppHeaderMenu', () => {
  const wrappers: ReturnType<typeof mount>[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
    settingsStoreMock.disclaimerVisibility = true;
    settingsStoreMock.userDisclaimerApprove = false;
    settingsStoreMock.isRotatePhoneHideBalanceFeatureEnabled = false;
    settingsStoreMock.isAccessRotationListener = true;
    settingsStoreMock.isAccessAccelerometrEventDeclined = false;
    settingsStoreMock.isThemePreference = false;
    settingsStoreMock.screenBreakpointClass = 'min-desktop';
    settingsStoreMock.isTMA = false;
    settingsStoreMock.language = 'en';
    settingsStoreMock.currency = 'usd';
    walletStoreMock.shouldBalanceBeHidden = false;
    walletStoreMock.theme = 'light';
  });

  afterEach(() => {
    while (wrappers.length) {
      wrappers.pop()?.unmount();
    }
  });

  function mountComponent() {
    const wrapper = mount(AppHeaderMenu, {
      global: {
        stubs: {
          's-button': SButtonStub,
          SButton: SButtonStub,
          's-dropdown': SDropdownStub,
          SDropdown: SDropdownStub,
          's-dropdown-item': SDropdownItemStub,
          SDropdownItem: SDropdownItemStub,
          's-divider': { template: '<hr class="s-divider-stub" />' },
          SDivider: { template: '<hr class="s-divider-stub" />' },
          's-icon': SIconStub,
          SIcon: SIconStub,
          's-switch': { template: '<div class="s-switch-stub" />' },
          SSwitch: { template: '<div class="s-switch-stub" />' },
        },
      },
    });

    wrappers.push(wrapper);

    return wrapper;
  }

  it('renders the dropdown trigger as header settings control', () => {
    const wrapper = mountComponent();

    const trigger = wrapper.find('.header-menu__button[data-icon="grid-block-align-left-24"]');
    const settingsButton = wrapper.find('.settings-control');

    expect(trigger.exists()).toBe(true);
    expect(settingsButton.exists()).toBe(true);
  });

  it('renders settings sections and items in the same order as polkaswap', () => {
    const wrapper = mountComponent();

    const sectionTitles = wrapper.findAll('.dropdown-section-title').map((title) => title.text().trim());
    const itemOrder = wrapper.findAll('.header-menu__item').map((item) => item.attributes('data-test-name'));

    expect(sectionTitles).toEqual([
      'HEADERMENU.TITLEBALANCE',
      'HEADERMENU.TITLETHEME',
      'HEADERMENU.TITLECURRENCY',
      'HEADERMENU.TITLEMISC',
    ]);
    expect(itemOrder).toEqual([
      'hide-balances',
      'theme',
      'light',
      'noir',
      'currency',
      'notification',
      'disclaimer',
      'language',
    ]);
  });

  it('renders static divider blocks without relying on legacy el-divider components', () => {
    const wrapper = mountComponent();

    expect(wrapper.findAll('.el-divider.el-divider--horizontal')).toHaveLength(5);
  });

  it('shows language code and selected language label in the language row', () => {
    const wrapper = mountComponent();
    const languageItem = wrapper.find('[data-test-name="language"]');
    const languageCode = languageItem.find('.current-currency');
    const languageLabel = languageItem.find('p');

    expect(languageCode.text()).toBe('EN');
    expect(languageLabel.text()).toBe('English (UK)');
  });

  it('uses the same settings icons as polkaswap menu', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('[data-test-name="hide-balances"] .s-dropdown-item-icon-stub').attributes('data-icon')).toBe(
      'basic-filterlist-24'
    );
    expect(wrapper.find('[data-test-name="theme"] .s-dropdown-item-icon-stub').attributes('data-icon')).toBe(
      'basic-lightning-24'
    );
    expect(wrapper.find('[data-test-name="light"] .s-dropdown-item-icon-stub').attributes('data-icon')).toBe(
      'various-brightness-low-24'
    );
    expect(wrapper.find('[data-test-name="noir"] .s-dropdown-item-icon-stub').attributes('data-icon')).toBe(
      'finance-PSWAP-24'
    );
    expect(wrapper.find('[data-test-name="notification"] .s-dropdown-item-icon-stub').attributes('data-icon')).toBe(
      'notifications-bell-24'
    );
    expect(wrapper.find('[data-test-name="disclaimer"] .s-dropdown-item-icon-stub').attributes('data-icon')).toBe(
      'info-16'
    );
  });

  it('switches hide balances icon based on hidden balances state', () => {
    walletStoreMock.shouldBalanceBeHidden = true;
    const wrapper = mountComponent();

    expect(wrapper.find('[data-test-name="hide-balances"] .s-dropdown-item-icon-stub').attributes('data-icon')).toBe(
      'basic-eye-no-24'
    );
  });

  it('renders turn-phone-hide with the same icon as polkaswap in TMA mobile mode', () => {
    settingsStoreMock.isTMA = true;
    settingsStoreMock.screenBreakpointClass = 'min-mobile';
    const wrapper = mountComponent();

    const turnPhoneItem = wrapper.find('[data-test-name="turn-phone-hide"]');

    expect(turnPhoneItem.exists()).toBe(true);
    expect(turnPhoneItem.find('.s-dropdown-item-icon-stub').attributes('data-icon')).toBe('gadgets-iPhone-24');
    expect(turnPhoneItem.find('.s-switch-stub').exists()).toBe(true);
  });

  it('uses chevron indicator for turn-phone-hide when rotation access is unavailable', () => {
    settingsStoreMock.isTMA = true;
    settingsStoreMock.screenBreakpointClass = 'min-mobile';
    settingsStoreMock.isAccessRotationListener = false;
    const wrapper = mountComponent();

    const turnPhoneIndicator = wrapper.find('[data-test-name="turn-phone-hide"] .icontype.s-icon-stub');
    expect(turnPhoneIndicator.attributes('data-icon')).toBe('arrows-chevron-right-rounded-24');
  });

  it('uses chevron indicators for currency, language, notification and disclaimer rows', () => {
    const wrapper = mountComponent();

    const currencyIndicator = wrapper.find('[data-test-name="currency"] .icontype.s-icon-stub');
    const languageIndicator = wrapper.find('[data-test-name="language"] .icontype.s-icon-stub');
    const notificationIndicator = wrapper.find('[data-test-name="notification"] .icontype.s-icon-stub');
    const disclaimerIndicator = wrapper.find('[data-test-name="disclaimer"] .icontype.s-icon-stub');

    expect(currencyIndicator.attributes('data-icon')).toBe('arrows-chevron-right-rounded-24');
    expect(languageIndicator.attributes('data-icon')).toBe('arrows-chevron-right-rounded-24');
    expect(notificationIndicator.attributes('data-icon')).toBe('arrows-chevron-right-rounded-24');
    expect(disclaimerIndicator.attributes('data-icon')).toBe('arrows-chevron-right-rounded-24');
  });

  it('does not toggle disclaimer when disclaimer entry is disabled', async () => {
    const wrapper = mountComponent();
    const disclaimerItem = wrapper.find('[data-test-name="disclaimer"]');

    expect(disclaimerItem.attributes('data-disabled')).toBe('true');
    await disclaimerItem.trigger('click');

    expect(settingsStoreMock.toggleDisclaimerDialogVisibility).not.toHaveBeenCalled();
    expect(hideDropdownMock).not.toHaveBeenCalled();
  });

  it('marks system preferences as selected when theme preference is enabled', () => {
    settingsStoreMock.isThemePreference = true;
    walletStoreMock.theme = 'dark';

    const wrapper = mountComponent();
    const systemThemeCheck = wrapper.find('[data-test-name="theme"] .check');
    const noirThemeCheck = wrapper.find('[data-test-name="noir"] .check');

    expect(systemThemeCheck.classes()).toContain('selected');
    expect(noirThemeCheck.classes()).not.toContain('selected');
  });

  it('closes the dropdown when the close action is clicked', async () => {
    const wrapper = mountComponent();

    const closeButton = wrapper.find('[data-icon="x-16"]');
    await closeButton.trigger('click');

    expect(hideDropdownMock).toHaveBeenCalled();
  });

  it('does not force-hide dropdown when pressing settings trigger button', async () => {
    const wrapper = mountComponent();

    await wrapper.find('.settings-control').trigger('click');

    expect(hideDropdownMock).not.toHaveBeenCalled();
  });

  it('enables system theme preference when system preferences is selected', async () => {
    const wrapper = mountComponent();

    await wrapper.find('[data-test-name="theme"]').trigger('click');

    expect(settingsStoreMock.setIsThemePreference).toHaveBeenCalledWith(true);
    expect(applyThemeMock).not.toHaveBeenCalled();
    expect(setThemeMock).not.toHaveBeenCalled();
  });

  it('applies light mode as manual theme selection', async () => {
    walletStoreMock.theme = 'dark';
    const wrapper = mountComponent();

    await wrapper.find('[data-test-name="light"]').trigger('click');

    expect(applyThemeMock).toHaveBeenCalledWith(false);
    expect(setThemeMock).toHaveBeenCalledWith('light');
    expect(settingsStoreMock.setIsThemePreference).toHaveBeenCalledWith(false);
  });

  it('applies noir mode as manual theme selection', async () => {
    const wrapper = mountComponent();

    await wrapper.find('[data-test-name="noir"]').trigger('click');

    expect(applyThemeMock).toHaveBeenCalledWith(true);
    expect(setThemeMock).toHaveBeenCalledWith('dark');
    expect(settingsStoreMock.setIsThemePreference).toHaveBeenCalledWith(false);
  });

  it('dispatches actions for currency, language, notifications and disclaimer', async () => {
    settingsStoreMock.disclaimerVisibility = false;
    const wrapper = mountComponent();

    await wrapper.find('[data-test-name="hide-balances"]').trigger('click');
    await wrapper.find('[data-test-name="currency"]').trigger('click');
    await wrapper.find('[data-test-name="language"]').trigger('click');
    await wrapper.find('[data-test-name="notification"]').trigger('click');
    await wrapper.find('[data-test-name="disclaimer"]').trigger('click');

    expect(walletStoreMock.toggleHideBalance).toHaveBeenCalledTimes(1);
    expect(settingsStoreMock.setSelectCurrencyDialogVisibility).toHaveBeenCalledWith(true);
    expect(settingsStoreMock.setSelectLanguageDialogVisibility).toHaveBeenCalledWith(true);
    expect(settingsStoreMock.setAlertSettingsPopup).toHaveBeenCalledWith(true);
    expect(settingsStoreMock.toggleDisclaimerDialogVisibility).toHaveBeenCalledTimes(1);
    expect(hideDropdownMock).toHaveBeenCalledTimes(4);
  });

  it('keeps the Akkadian language row keyboard-selectable without opening alerts', async () => {
    settingsStoreMock.language = 'akk';
    settingsStoreMock.disclaimerVisibility = false;

    const wrapper = mountComponent();
    const languageItem = wrapper.find('[data-test-name="language"]');

    expect(languageItem.attributes('tabindex')).toBe('0');
    expect(languageItem.find('.current-currency').text()).toBe('AKK');
    expect(languageItem.find('p').text()).toBe('Akkadian');

    await languageItem.trigger('keydown', { key: 'Enter' });

    expect(settingsStoreMock.setSelectLanguageDialogVisibility).toHaveBeenCalledWith(true);
    expect(settingsStoreMock.setAlertSettingsPopup).not.toHaveBeenCalled();
    expect(hideDropdownMock).toHaveBeenCalledTimes(1);
  });

  it('enables turn-phone-hide rotation listener when access is available', async () => {
    settingsStoreMock.isTMA = true;
    settingsStoreMock.screenBreakpointClass = 'min-mobile';
    settingsStoreMock.isRotatePhoneHideBalanceFeatureEnabled = false;
    settingsStoreMock.isAccessRotationListener = true;
    const wrapper = mountComponent();

    await wrapper.find('[data-test-name="turn-phone-hide"]').trigger('click');

    expect(listenForDeviceRotationMock).toHaveBeenCalledTimes(1);
    expect(settingsStoreMock.setIsRotatePhoneHideBalanceFeatureEnabled).toHaveBeenCalledWith(true);
  });

  it('disables turn-phone-hide rotation listener when already enabled', async () => {
    settingsStoreMock.isTMA = true;
    settingsStoreMock.screenBreakpointClass = 'min-mobile';
    settingsStoreMock.isRotatePhoneHideBalanceFeatureEnabled = true;
    settingsStoreMock.isAccessRotationListener = true;
    const wrapper = mountComponent();

    await wrapper.find('[data-test-name="turn-phone-hide"]').trigger('click');

    expect(removeDeviceRotationListenerMock).toHaveBeenCalledTimes(1);
    expect(settingsStoreMock.setIsRotatePhoneHideBalanceFeatureEnabled).toHaveBeenCalledWith(false);
    expect(settingsStoreMock.setRotatePhoneDialogVisibility).toHaveBeenCalledWith(false);
  });

  it('opens rotate-phone dialog when turn-phone-hide has no access permission', async () => {
    settingsStoreMock.isTMA = true;
    settingsStoreMock.screenBreakpointClass = 'min-mobile';
    settingsStoreMock.isRotatePhoneHideBalanceFeatureEnabled = false;
    settingsStoreMock.isAccessRotationListener = false;
    const wrapper = mountComponent();

    await wrapper.find('[data-test-name="turn-phone-hide"]').trigger('click');

    expect(settingsStoreMock.setRotatePhoneDialogVisibility).toHaveBeenCalledWith(true);
    expect(listenForDeviceRotationMock).not.toHaveBeenCalled();
    expect(hideDropdownMock).toHaveBeenCalledTimes(1);
  });
});
