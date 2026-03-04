<template>
  <div class="app-header-menu">
    <s-button
      type="action"
      class="settings-control s-pressed"
      :tooltip="isDropdownVisible ? '' : t('headerMenu.settings')"
    >
      <template #icon>
        <s-dropdown
          ref="headerMenu"
          :popper-class="`header-menu ${isDropdownVisible ? 'is-open' : 'is-closed'} custom-z-index`"
          class="header-menu__button"
          icon="grid-block-align-left-24"
          type="ellipsis"
          placement="bottom-start"
          :hide-on-click="false"
          @visible-change="handleDropdownVisibilityChange"
        >
          <template #menu>
            <div class="header-menu__settings">
              <p>{{ t('settingsText') }}</p>
              <s-button class="s-pressed" type="action" icon="x-16" @click="handleClickHeaderMenu"></s-button>
            </div>
            <s-divider></s-divider>
            <div v-for="section in dropdownHeaderMenuItems" :key="section.title">
              <p class="dropdown-section-title">{{ section.title.toUpperCase() }}</p>
              <div v-for="(item, index) in section.items" :key="item.value" @click="handleSelectHeaderMenu(item.value)">
                <s-dropdown-item
                  class="header-menu__item"
                  :data-test-name="item.value"
                  :icon="item.isTextInsteadIcon ? null : item.icon"
                  :value="item.value"
                  :disabled="item.disabled"
                >
                  <span v-if="item.isTextInsteadIcon" class="current-currency">
                    {{ getCurrencyOrLanguage(item.value).toUpperCase() }}
                  </span>

                  <p>{{ item.text }}</p>
                  <template v-if="item.isThemeItem">
                    <div class="check" :class="{ selected: selectedTheme === item.value }">
                      <s-icon name="basic-check-mark-24" size="12px"></s-icon>
                    </div>
                  </template>
                  <template v-else-if="item.value === HeaderMenuType.HideBalances">
                    <s-switch class="icontype" :value="shouldBalanceBeHidden"></s-switch>
                  </template>
                  <template v-else-if="item.value === HeaderMenuType.TurnPhoneHide">
                    <s-switch
                      v-if="isAccessRotationListener && !isAccessAccelerometrEventDeclined"
                      class="icontype"
                      :value="isRotatePhoneHideBalanceFeatureEnabled"
                    ></s-switch>
                    <s-icon v-else :name="item.iconType" size="14px" class="icontype"></s-icon>
                  </template>
                  <template v-else>
                    <s-icon :name="item.iconType" size="14px" class="icontype"></s-icon>
                  </template>
                </s-dropdown-item>
                <s-divider class="divider-between-items" v-if="index < section.items.length - 1"></s-divider>
              </div>
            </div>
          </template>
        </s-dropdown>
      </template>
    </s-button>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { useTranslation } from '@/composables/useTranslation';
import { Language, Languages } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import { Theme } from '@/consts/theme';
import store from '@/store';
import { useWalletStore } from '@/stores/wallet';
import { applyTheme } from '@/utils/switchTheme';
import { tmaSdkService } from '@/utils/telegram';

import type { Currency } from '@wallet/lib/types/currency';

enum HeaderMenuType {
  HideBalances = 'hide-balances',
  TurnPhoneHide = 'turn-phone-hide',
  Theme = 'theme',
  LightMode = 'light',
  NoirMode = 'noir',
  Language = 'language',
  Currency = 'currency',
  Notification = 'notification',
  Disclaimer = 'disclaimer',
}

type MenuItem = {
  value: HeaderMenuType;
  icon: string;
  iconType?: string;
  text: string;
  disabled?: boolean;
  isThemeItem?: boolean;
  isTextInsteadIcon?: boolean;
};

type MenuSection = {
  title: string;
  items: Array<MenuItem>;
};

const { t } = useTranslation();
const walletStore = useWalletStore();
const headerMenu = ref();
const isDropdownVisible = ref(false);
const selectedTheme = ref<HeaderMenuType | null>(null);

const disclaimerVisibility = computed(() => store.state.settings.disclaimerVisibility);
const userDisclaimerApprove = computed(() => store.state.settings.userDisclaimerApprove);
const isThemePreference = computed(() => store.state.settings.isThemePreference);
const isRotatePhoneHideBalanceFeatureEnabled = computed(
  () => store.state.settings.isRotatePhoneHideBalanceFeatureEnabled as boolean
);
const isAccessRotationListener = computed(() => store.state.settings.isAccessRotationListener as boolean);
const isAccessAccelerometrEventDeclined = computed(
  () => store.state.settings.isAccessAccelerometrEventDeclined as boolean
);
const isTMA = computed(() => store.state.settings.isTMA as boolean);
const screenBreakpointClass = computed(() => store.state.settings.screenBreakpointClass as BreakpointClass);

const locale = computed(() => store.state.settings.language as Language);
const currentCurrency = computed(() => store.state.wallet.settings.currency as Currency);
const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden as boolean);
const walletTheme = computed(() => store.state.wallet.settings.theme as Theme);
const isMobile = computed(() => screenBreakpointClass.value === BreakpointClass.Mobile);
const disclaimerDisabled = computed(() => disclaimerVisibility.value && !userDisclaimerApprove.value);
const disclaimerMenuText = computed(() =>
  t(`headerMenu.${disclaimerVisibility.value ? 'hideDisclaimer' : 'showDisclaimer'}`)
);
const lightThemeText = computed(() => t('headerMenu.switchTheme', { theme: t('light') }));
const noirThemeText = computed(() => t('headerMenu.switchTheme', { theme: t('noir') }));
const currentLanguageName = computed(() => languageToDisplayName(locale.value));

const dropdownHeaderMenuItems = computed<MenuSection[]>(() => [
  {
    title: t('headerMenu.titleBalance'),
    items: [
      {
        value: HeaderMenuType.HideBalances,
        icon: getHideBalancesIcon(true),
        iconType: 'arrows-chevron-right-rounded-24',
        text: t(`headerMenu.${shouldBalanceBeHidden.value ? 'showBalances' : 'hideBalances'}`),
      },
      ...(isTMA.value && isMobile.value
        ? [
            {
              value: HeaderMenuType.TurnPhoneHide,
              icon: 'gadgets-iPhone-24',
              text: t('headerMenu.turnPhoneHideBalances'),
              iconType: 'arrows-chevron-right-rounded-24',
            },
          ]
        : []),
    ],
  },
  {
    title: t('headerMenu.titleTheme'),
    items: [
      {
        value: HeaderMenuType.Theme,
        icon: 'basic-lightning-24',
        text: t('headerMenu.systemPreferencesTheme'),
        isThemeItem: true,
      },
      {
        value: HeaderMenuType.LightMode,
        icon: 'various-brightness-low-24',
        text: lightThemeText.value,
        isThemeItem: true,
      },
      {
        value: HeaderMenuType.NoirMode,
        icon: 'finance-PSWAP-24',
        text: noirThemeText.value,
        isThemeItem: true,
      },
    ],
  },
  {
    title: t('headerMenu.titleCurrency'),
    items: [
      {
        value: HeaderMenuType.Currency,
        icon: 'various-lightbulb-24',
        iconType: 'arrows-chevron-right-rounded-24',
        text: t('headerMenu.selectCurrency'),
        isTextInsteadIcon: true,
      },
    ],
  },
  {
    title: t('headerMenu.titleMisc'),
    items: [
      {
        value: HeaderMenuType.Notification,
        icon: 'notifications-bell-24',
        iconType: 'arrows-chevron-right-rounded-24',
        text: t('browserNotificationDialog.title'),
      },
      {
        value: HeaderMenuType.Disclaimer,
        icon: 'info-16',
        iconType: 'arrows-chevron-right-rounded-24',
        text: disclaimerMenuText.value,
        disabled: disclaimerDisabled.value,
      },
      {
        value: HeaderMenuType.Language,
        icon: 'basic-globe-24',
        iconType: 'arrows-chevron-right-rounded-24',
        text: currentLanguageName.value,
        isTextInsteadIcon: true,
      },
    ],
  },
]);

function getHideBalancesIcon(reverse = false): string {
  return reverse
    ? shouldBalanceBeHidden.value
      ? 'basic-eye-no-24'
      : 'basic-filterlist-24'
    : shouldBalanceBeHidden.value
      ? 'basic-filterlist-24'
      : 'basic-eye-no-24';
}

function getCurrencyOrLanguage(type: HeaderMenuType): string {
  if (type === HeaderMenuType.Currency) {
    return currentCurrency.value?.toLocaleLowerCase() ?? '';
  }

  if (type === HeaderMenuType.Language) {
    return languageToCode(locale.value);
  }

  return '';
}

function languageToCode(language: Language): string {
  return language.split('-')[0] ?? language;
}

function languageToDisplayName(language: Language): string {
  const selectedLanguage = Languages.find((value) => value.key === language);
  return selectedLanguage?.name ?? selectedLanguage?.value ?? language;
}

function handleDropdownVisibilityChange(visible: boolean): void {
  isDropdownVisible.value = visible;
}

function handleClickHeaderMenu(): void {
  headerMenu.value?.hide();
}

function closeHeaderMenu(): void {
  headerMenu.value?.hide();
}

async function handleSelectHeaderMenu(type: HeaderMenuType): Promise<void> {
  switch (type) {
    case HeaderMenuType.HideBalances:
      store.commit.wallet.settings.toggleHideBalance();
      break;
    case HeaderMenuType.Theme:
      if (selectedTheme.value === type) break;
      store.commit.settings.setIsThemePreference(true);
      break;
    case HeaderMenuType.LightMode:
    case HeaderMenuType.NoirMode:
      if (selectedTheme.value === type) break;
      await updateTheme(type);
      break;
    case HeaderMenuType.TurnPhoneHide:
      if (isRotatePhoneHideBalanceFeatureEnabled.value) {
        store.commit.settings.setIsRotatePhoneHideBalanceFeatureEnabled(false);
        tmaSdkService.removeDeviceRotationListener();
        (store.commit.settings as any).setRotatePhoneDialogVisibility?.(false);
      } else if (!isRotatePhoneHideBalanceFeatureEnabled.value && isAccessRotationListener.value) {
        tmaSdkService.listenForDeviceRotation();
        store.commit.settings.setIsRotatePhoneHideBalanceFeatureEnabled(true);
      } else {
        (store.commit.settings as any).setRotatePhoneDialogVisibility?.(true);
        closeHeaderMenu();
      }
      break;
    case HeaderMenuType.Language:
      store.commit.settings.setSelectLanguageDialogVisibility(true);
      closeHeaderMenu();
      break;
    case HeaderMenuType.Currency:
      store.commit.settings.setSelectCurrencyDialogVisibility(true);
      closeHeaderMenu();
      break;
    case HeaderMenuType.Notification:
      store.commit.settings.setAlertSettingsPopup(true);
      closeHeaderMenu();
      break;
    case HeaderMenuType.Disclaimer:
      if (disclaimerDisabled.value) break;
      store.commit.settings.toggleDisclaimerDialogVisibility();
      closeHeaderMenu();
      break;
  }
}

async function updateTheme(type: HeaderMenuType): Promise<void> {
  selectedTheme.value = type;
  const theme = type === HeaderMenuType.LightMode ? Theme.LIGHT : Theme.DARK;
  applyTheme(theme === Theme.DARK);
  await walletStore.setTheme(theme);
  store.commit.settings.setIsThemePreference(false);
}

watch(
  [walletTheme, isThemePreference],
  ([theme, preference]) => {
    selectedTheme.value = preference
      ? HeaderMenuType.Theme
      : theme === Theme.DARK
        ? HeaderMenuType.NoirMode
        : HeaderMenuType.LightMode;
  },
  { immediate: true }
);
</script>

<style lang="scss">
$icon-size: 28px;
$item-padding: 17px;

.app-header-menu {
  display: flex;
}

.header-menu {
  $dropdown-background: var(--s-color-utility-surface, #fdf7fb);
  $dropdown-shadow: var(--s-shadow-element-pressed, 0 6px 16px rgba(0, 0, 0, 0.08));
  $dropdown-content-primary: var(--s-color-base-content-primary, #2a171f);
  $dropdown-content-secondary: var(--s-color-base-content-secondary, #a19a9d);
  $dropdown-content-tertiary: var(--s-color-base-content-tertiary, #d5cdd0);
  $dropdown-item-line-height: 42px;

  transform: translateX(100%);
  transition: transform 0.2s cubic-bezier(0.22, 0.77, 0.81, 0.61);
  pointer-events: none;

  &.custom-z-index {
    z-index: 1999 !important;
  }

  &.is-open {
    transform: translateX(0);
    pointer-events: auto;
  }

  &.is-closed {
    transform: translateX(100%);
    pointer-events: none;
  }

  &.el-dropdown-menu.el-popper {
    background-color: $dropdown-background;
    box-shadow: $dropdown-shadow;
    position: fixed !important;
    top: 0 !important;
    max-width: $menu-setting-max-width;
    width: min(#{$menu-setting-max-width}, calc(100vw - #{$inner-spacing-mini}));
    max-width: calc(100vw - #{$inner-spacing-mini});
    height: calc(100vh - #{$footer-height});
    max-height: calc(100vh - #{$footer-height});
    height: calc(100dvh - #{$footer-height});
    max-height: calc(100dvh - #{$footer-height});
    right: 0;
    left: auto !important;
    border-radius: unset;
    border: unset;
    box-sizing: border-box;
    overflow-y: auto;
    overflow-x: hidden;

    .popper__arrow {
      display: none;
    }
  }

  &__button i {
    font-size: $icon-size !important;
  }

  &__settings {
    min-width: min(264px, 100%);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 17px;
    width: 100%;

    i {
      font-size: 24px !important;
    }

    p {
      font-weight: 500;
      font-size: 15px;
      color: $dropdown-content-primary;
    }
  }

  & &__item.el-dropdown-menu__item {
    line-height: $dropdown-item-line-height;
    font-weight: 500;
    font-size: var(--s-font-size-small);
    font-feature-settings: 'case' on;
    color: $dropdown-content-primary;
    display: flex;
    align-items: center;

    p {
      margin-left: $inner-spacing-small;
      margin-right: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    i {
      color: $dropdown-content-tertiary;
      font-size: $icon-size;
    }

    .icontype {
      margin-left: auto;
    }

    &:focus {
      background-color: transparent;
      color: $dropdown-content-primary;
    }

    &:hover,
    &:focus:hover {
      background-color: transparent;
      color: $dropdown-content-secondary;
    }

    @include tablet(true) {
      &:hover {
        color: $dropdown-content-primary !important;
      }
    }

    .current-currency {
      min-width: 31px;
      text-align: center;
      color: $dropdown-content-secondary;
    }
  }

  &__item .check {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 24px;
    height: 24px;
    border: 1px solid $dropdown-content-secondary;
    border-radius: 50%;
    transition:
      opacity 150ms,
      border-color 150ms,
      background-color 150ms;
    margin-left: auto;

    i {
      margin: unset;
    }
  }

  .check i {
    opacity: 0;
  }

  .selected {
    background: var(--s-color-theme-accent, #f8087b);
    border: 1px solid transparent;

    i {
      opacity: 1;

      &::before {
        color: #fff;
      }
    }
  }

  .el-divider--horizontal {
    margin: unset;
  }

  .divider-between-items {
    margin-left: 64px;
  }
}

.dropdown-section-title {
  margin-top: 16px;
  margin-bottom: 19px;
  padding: 0 $item-padding;
  font-size: 13px;
  font-weight: 700;
  color: var(--s-color-base-content-secondary, #a19a9d);
}

.el-dropdown-menu__item.header-menu__item.is-disabled {
  pointer-events: initial;
  cursor: not-allowed;
}
</style>
