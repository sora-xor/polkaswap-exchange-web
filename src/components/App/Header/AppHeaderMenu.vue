<template>
  <div class="app-header-menu">
    <s-button
      type="action"
      class="settings-control s-pressed"
      :tooltip="isDropdownVisible ? '' : t('headerMenu.settings')"
      @click="handleClickHeaderMenu"
    >
      <s-dropdown
        ref="headerMenu"
        :popper-class="`header-menu ${!isDropdownVisible ? 'slide-in' : ''} custom-z-index`"
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
  LightMode = 'light',
  NoirMode = 'noir',
  Theme = 'theme',
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
const isRotatePhoneHideBalanceFeatureEnabled = computed(
  () => store.state.settings.isRotatePhoneHideBalanceFeatureEnabled
);
const isAccessRotationListener = computed(() => store.state.settings.isAccessRotationListener);
const isAccessAccelerometrEventDeclined = computed(() => store.state.settings.isAccessAccelerometrEventDeclined);
const isThemePreference = computed(() => store.state.settings.isThemePreference);
const screenBreakpointClass = computed(() => store.state.settings.screenBreakpointClass as BreakpointClass);

const locale = computed(() => store.state.settings.language as Language);
const currentCurrency = computed(() => store.state.wallet.settings.currency as Currency);
const shouldBalanceBeHidden = computed(() => store.state.wallet.settings.shouldBalanceBeHidden as boolean);
const walletTheme = computed(() => store.state.wallet.settings.theme as Theme);

const dropdownHeaderMenuItems = computed<MenuSection[]>(() => [
  {
    title: t('headerMenu.general'),
    items: [
      {
        value: HeaderMenuType.HideBalances,
        icon: 'basic-eye-24',
        text: t('headerMenu.hideBalances'),
      },
      {
        value: HeaderMenuType.TurnPhoneHide,
        icon: 'mobile-rotate-24',
        iconType: isRotatePhoneHideBalanceFeatureEnabled.value ? 'basic-check-mark-24' : 'basic-plus-24',
        text: t('headerMenu.turnPhoneHide'),
      },
    ],
  },
  {
    title: t('headerMenu.preference'),
    items: [
      {
        value: HeaderMenuType.Language,
        icon: 'communication-language-24',
        text: t('headerMenu.language'),
        isTextInsteadIcon: true,
      },
      {
        value: HeaderMenuType.Currency,
        icon: 'finance-currency-circle-24',
        text: t('headerMenu.currency'),
        isTextInsteadIcon: true,
      },
      {
        value: HeaderMenuType.LightMode,
        icon: 'basic-sun-24',
        iconType: 'basic-sun-24',
        text: t('headerMenu.lightMode'),
        isThemeItem: true,
      },
      {
        value: HeaderMenuType.NoirMode,
        icon: 'basic-moon-24',
        iconType: 'basic-moon-24',
        text: t('headerMenu.noirMode'),
        isThemeItem: true,
      },
    ],
  },
  {
    title: t('headerMenu.legal'),
    items: [
      {
        value: HeaderMenuType.Notification,
        icon: 'notification-bell-on-24',
        iconType: 'notification-bell-on-24',
        text: t('headerMenu.notifications'),
      },
      {
        value: HeaderMenuType.Disclaimer,
        icon: 'basic-info-24',
        iconType: 'basic-info-24',
        text: t('headerMenu.disclaimer'),
        disabled: userDisclaimerApprove.value,
      },
    ],
  },
]);

function getCurrencyOrLanguage(type: HeaderMenuType): string {
  if (type === HeaderMenuType.Currency) {
    return currentCurrency.value?.toLocaleLowerCase() ?? '';
  }

  if (type === HeaderMenuType.Language) {
    return languageToString(locale.value);
  }

  return '';
}

function languageToString(language: Language): string {
  return Languages[language] ?? language;
}

function handleDropdownVisibilityChange(visible: boolean): void {
  isDropdownVisible.value = visible;
}

function handleClickHeaderMenu(): void {
  headerMenu.value?.hide();
}

async function handleSelectHeaderMenu(type: HeaderMenuType): Promise<void> {
  switch (type) {
    case HeaderMenuType.HideBalances:
      store.commit.wallet.settings.toggleHideBalance();
      break;
    case HeaderMenuType.TurnPhoneHide:
      toggleRotatePhoneFeature();
      break;
    case HeaderMenuType.LightMode:
    case HeaderMenuType.NoirMode:
      await updateTheme(type);
      break;
    case HeaderMenuType.Language:
      store.commit.settings.setSelectLanguageDialogVisibility(true);
      break;
    case HeaderMenuType.Currency:
      store.commit.settings.setSelectCurrencyDialogVisibility(true);
      break;
    case HeaderMenuType.Notification:
      store.commit.settings.setAlertSettingsPopup(true);
      break;
    case HeaderMenuType.Disclaimer:
      store.commit.settings.toggleDisclaimerDialogVisibility();
      break;
  }
}

function toggleRotatePhoneFeature(): void {
  if (isRotatePhoneHideBalanceFeatureEnabled.value) {
    store.commit.settings.setIsRotatePhoneHideBalanceFeatureEnabled(false);
    return;
  }

  if (!isAccessRotationListener.value) {
    tmaSdkService.enableAccelerationAccess();
  } else {
    store.commit.settings.setIsRotatePhoneHideBalanceFeatureEnabled(true);
  }
}

async function updateTheme(type: HeaderMenuType): Promise<void> {
  selectedTheme.value = type;
  const theme = type === HeaderMenuType.LightMode ? Theme.LIGHT : Theme.DARK;
  applyTheme(theme);
  await walletStore.setTheme(theme);
  store.commit.settings.setIsThemePreference(true);
}

watch(
  [walletTheme, isThemePreference],
  ([theme, preference]) => {
    if (!preference) {
      selectedTheme.value = null;
      return;
    }
    selectedTheme.value = theme === Theme.DARK ? HeaderMenuType.NoirMode : HeaderMenuType.LightMode;
  },
  { immediate: true }
);
</script>
