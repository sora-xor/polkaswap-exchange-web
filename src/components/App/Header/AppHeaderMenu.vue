<template>
  <div class="app-header-menu">
    <s-button
      type="action"
      :class="['settings-control', 's-pressed', { 'settings-control--open': isDropdownVisible }]"
      :tooltip="isDropdownVisible ? '' : t('headerMenu.settings')"
    >
      <template #icon>
        <s-dropdown
          ref="headerMenu"
          :popper-class="`header-menu el-dropdown-menu--medium ellipsis s-border-radius-small custom-z-index`"
          class="header-menu__button"
          icon="grid-block-align-left-24"
          type="ellipsis"
          placement="bottom-start"
          :hide-on-click="false"
          @update:show="handleDropdownVisibilityChange"
        >
          <template #menu>
            <div class="header-menu__settings">
              <p>{{ t('settingsText') }}</p>
              <s-button class="s-pressed" type="action" icon="x-16" @click="handleClickHeaderMenu"></s-button>
            </div>
            <el-divider class="s-divider-secondary"></el-divider>
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
                <el-divider
                  class="divider-between-items s-divider-secondary"
                  v-if="index < section.items.length - 1"
                ></el-divider>
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
  headerMenu.value?.hide?.();
  headerMenu.value?.dropdown?.hide?.();
  isDropdownVisible.value = false;
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
        handleClickHeaderMenu();
      }
      break;
    case HeaderMenuType.Language:
      store.commit.settings.setSelectLanguageDialogVisibility(true);
      handleClickHeaderMenu();
      break;
    case HeaderMenuType.Currency:
      store.commit.settings.setSelectCurrencyDialogVisibility(true);
      handleClickHeaderMenu();
      break;
    case HeaderMenuType.Notification:
      store.commit.settings.setAlertSettingsPopup(true);
      handleClickHeaderMenu();
      break;
    case HeaderMenuType.Disclaimer:
      if (disclaimerDisabled.value) break;
      store.commit.settings.toggleDisclaimerDialogVisibility();
      handleClickHeaderMenu();
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
  $dropdown-background: var(--s-color-utility-surface);
  $dropdown-item-line-height: 42px;
  transition: right 0.2s cubic-bezier(0.22, 0.77, 0.81, 0.61);

  &.custom-z-index {
    z-index: 1999 !important;
  }

  &.slide-in {
    right: 4px !important;
  }

  &.is-open {
    right: 4px !important;
  }

  &.el-dropdown-menu.el-popper {
    background-color: $dropdown-background;
    box-shadow: var(--s-shadow-element-pressed);
    position: fixed !important;
    top: -4px !important;
    right: 4px !important;
    left: auto !important;
    width: min(284px, calc(100vw - 8px));
    max-width: min(284px, calc(100vw - 8px)) !important;
    height: calc(100% - 28px) !important;
    border: unset;
    border-radius: unset;

    .popper__arrow {
      display: none;
    }
  }

  &__button i {
    font-size: $icon-size !important;
  }

  &__settings {
    min-width: 264px;
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
      color: var(--s-color-base-content-primary);
    }
  }

  & &__item.el-dropdown-menu__item {
    line-height: $dropdown-item-line-height;
    font-weight: 500;
    font-size: var(--s-font-size-small);
    font-feature-settings: 'case' on;
    color: var(--s-color-base-content-primary);
    display: flex;
    align-items: center;
    padding: 0 $item-padding;
    p {
      margin-left: $inner-spacing-small;
      margin-right: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    i {
      color: var(--s-color-base-content-tertiary);
      font-size: $icon-size;
    }

    .icontype {
      margin-left: auto;
    }

    &:focus {
      background-color: transparent;
      color: var(--s-color-base-content-primary);
    }

    &:hover,
    &:focus:hover {
      background-color: transparent;
      color: var(--s-color-base-content-secondary);
    }

    @include tablet(true) {
      &:hover {
        color: var(--s-color-base-content-primary) !important;
      }
    }

    .current-currency {
      min-width: 31px;
      text-align: center;
      color: var(--s-color-base-content-secondary);
    }
  }

  &__item .check {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 24px;
    height: 24px;
    border: 1px solid var(--s-color-base-content-secondary);
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
    background: var(--s-color-theme-accent);
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
  color: var(--s-color-base-content-secondary);
}

.el-dropdown-menu__item.header-menu__item.is-disabled {
  pointer-events: initial;
  cursor: not-allowed;
}
</style>
