<template>
  <header class="header">
    <s-button
      class="app-menu-button"
      type="action"
      primary
      icon="basic-more-horizontal-24"
      @click="toggleMenu"
    ></s-button>
    <app-logo-button
      class="app-logo--header"
      responsive
      :theme="libraryTheme"
      @click="goTo(PageNames.Swap)"
    ></app-logo-button>
    <div class="app-controls app-controls--middle s-flex">
      <app-marketing v-show="showMarketing"></app-marketing>
      <s-button :class="fiatBtnClass" :type="fiatBtnType" size="medium" @click="goTo(PageNames.DepositOptions)">
        <pair-token-logo
          class="payment-icon"
          :first-token="xor"
          :second-token="eth"
          :size="fiatBtnSize"
        ></pair-token-logo>
        <span v-if="!isAnyMobile">{{ t('moonpay.buttons.buy') }}</span>
      </s-button>
    </div>
    <div class="app-controls s-flex">
      <app-account-button @click="navigateToWallet"></app-account-button>
      <app-header-menu></app-header-menu>
    </div>
    <rotate-phone-dialog></rotate-phone-dialog>
    <acceleration-access-dialog></acceleration-access-dialog>
    <select-language-dialog></select-language-dialog>
    <select-currency-dialog></select-currency-dialog>
  </header>
</template>

<script lang="ts" setup>
import { ETH, XOR } from '@sora-substrate/sdk/build/assets/consts';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTranslation } from '@/composables/useTranslation';
import { Components, PageNames } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import { Theme } from '@/consts/theme';
import { goTo, lazyComponent } from '@/router';
import { useSettingsStore } from '@/stores/settings';

import AppAccountButton from './AppAccountButton.vue';
import AppHeaderMenu from './AppHeaderMenu.vue';

defineOptions({
  components: {
    AppAccountButton,
    AppHeaderMenu,
    AppMarketing: lazyComponent(Components.AppMarketing),
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    SelectLanguageDialog: lazyComponent(Components.SelectLanguageDialog),
    SelectCurrencyDialog: lazyComponent(Components.SelectCurrencyDialog),
    RotatePhoneDialog: lazyComponent(Components.RotatePhoneDialog),
    AccelerationAccessDialog: lazyComponent(Components.AccelerationAccessDialog),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
  },
});

defineProps<{ loading?: boolean }>();

const emit = defineEmits<{
  (e: 'toggle-menu'): void;
}>();

const { t } = useTranslation();
const { navigateToWallet } = useInternalConnect();
const route = useRoute();
const settingsStore = useSettingsStore();

const xor = XOR;
const eth = ETH;

const screenBreakpointClass = computed(() => settingsStore.screenBreakpointClass as BreakpointClass);
const libraryTheme = computed(() => (settingsStore.libraryTheme as Theme | null) ?? Theme.LIGHT);

const isMobile = computed(() => screenBreakpointClass.value === BreakpointClass.Mobile);
const isAnyMobile = computed(
  () =>
    screenBreakpointClass.value === BreakpointClass.Mobile ||
    screenBreakpointClass.value === BreakpointClass.LargeMobile
);
const showMarketing = computed(() =>
  [BreakpointClass.Desktop, BreakpointClass.LargeDesktop, BreakpointClass.HugeDesktop].includes(
    screenBreakpointClass.value
  )
);

const fiatBtnClass = computed(() => {
  const classes = ['app-controls-fiat-btn', 'active'];
  if ([PageNames.DepositOptions, PageNames.CedeStore].includes(route.name as PageNames)) {
    classes.push('app-controls-fiat-btn--active', 's-pressed');
  }
  return classes;
});

const fiatBtnType = computed(() => (isAnyMobile.value ? 'action' : 'tertiary'));
const fiatBtnSize = computed(() => (isAnyMobile.value ? 'mini' : 'small'));

function toggleMenu(): void {
  emit('toggle-menu');
}
</script>

<style lang="scss">
.app-controls-fiat-btn.app-controls-fiat-btn--active.neumorphic.active {
  box-shadow: var(--s-shadow-element);
  span {
    color: var(--s-color-theme-accent);
  }
}

.app-controls .app-controls-fiat-btn:not(.app-controls-fiat-btn--active),
.app-controls .settings-control {
  background-color: var(--s-color-utility-body) !important;
  border-color: transparent !important;
  color: var(--s-color-base-content-tertiary) !important;
}

.app-controls .app-controls-fiat-btn {
  display: block !important;
  height: 42px !important;
  min-height: 42px !important;
  padding: 5px 13px !important;
}

.app-controls .app-controls-fiat-btn .s-button__text {
  font-size: 14px !important;
  font-weight: 500 !important;
  line-height: 14px !important;
  text-transform: uppercase !important;
}

.app-controls .account-control:not(.s-pressed) {
  background-color: var(--s-color-utility-body) !important;
  border-color: transparent !important;
  color: var(--s-color-base-content-tertiary) !important;
}

.app-controls .account-control.s-pressed {
  background-color: var(--s-color-utility-surface) !important;
  border-color: var(--s-color-base-border-primary) !important;
  color: var(--s-color-base-content-tertiary) !important;
}

.app-controls .app-controls-fiat-btn,
.app-controls .account-control {
  box-shadow:
    -5px -5px 10px #fff,
    1px 1px 10px rgba(0, 0, 0, 0.1),
    inset 1px 1px 2px rgba(255, 255, 255, 0.8) !important;
}

.app-controls .settings-control {
  box-shadow:
    1px 1px 5px #fff,
    -5px -5px 5px rgba(255, 255, 255, 0.5) inset,
    1px 1px 10px rgba(0, 0, 0, 0.1) inset !important;
}

.app-controls .account-control i,
.app-controls .settings-control i,
.app-controls .settings-control .header-menu__button i {
  color: var(--s-color-base-content-tertiary) !important;
}

.app-controls .settings-control i,
.app-controls .settings-control .header-menu__button i,
.app-controls .account-control i[class*='s-icon-'] {
  font-size: 28px !important;
  line-height: 28px !important;
  width: 28px !important;
  height: 28px !important;
}

.app-menu-button.el-button.neumorphic.s-action.s-primary {
  background-color: var(--s-color-theme-accent) !important;
  border-color: var(--s-color-base-border-secondary) !important;
  color: #fff !important;
  box-shadow:
    1px 1px 5px #fff,
    -1px -1px 5px #fff !important;
}

.app-menu-button.el-button.neumorphic.s-action.s-primary i {
  color: #fff !important;
}

[design-system-theme='dark'] .app-controls .app-controls-fiat-btn:not(.app-controls-fiat-btn--active),
[design-system-theme='dark'] .app-controls .account-control,
[design-system-theme='dark'] .app-controls .settings-control {
  background-color: var(--s-color-utility-body) !important;
  border-color: transparent !important;
  color: var(--s-color-base-content-tertiary) !important;
}

[design-system-theme='dark'] .app-controls .app-controls-fiat-btn,
[design-system-theme='dark'] .app-controls .account-control {
  box-shadow:
    -5px -5px 10px rgba(155, 111, 165, 0.25),
    2px 2px 15px #492067,
    inset 1px 1px 2px rgba(155, 111, 165, 0.25) !important;
}

[design-system-theme='dark'] .app-controls .settings-control {
  box-shadow:
    1px 1px 2px rgba(255, 255, 255, 0.1),
    -5px -5px 5px rgba(255, 255, 255, 0.05) inset,
    1px 1px 10px rgba(41, 0, 71, 0.33) inset !important;
}

[design-system-theme='dark'] .app-menu-button.el-button.neumorphic.s-action.s-primary {
  color: #592d71 !important;
  box-shadow:
    1px 1px 5px #391057,
    -1px -1px 5px #9b6fa5 !important;
}

[design-system-theme='dark'] .app-menu-button.el-button.neumorphic.s-action.s-primary i {
  color: #592d71 !important;
}

.settings-control:hover > span > .header-menu__button i {
  color: var(--s-color-base-content-secondary);
}
</style>

<style lang="scss" scoped>
.header {
  display: flex;
  align-items: center;
  padding: $inner-spacing-mini;
  min-height: $header-height;
  position: relative;

  &:after {
    content: '';
    position: absolute;
    height: 1px;
    bottom: 0;
    left: $inner-spacing-mini;
    right: $inner-spacing-mini;
    background-color: var(--s-color-base-border-secondary);
  }
  @include tablet {
    padding: $inner-spacing-mini $inner-spacing-medium;

    &:after {
      left: $inner-spacing-medium;
      right: $inner-spacing-medium;
    }
  }
}

.app-controls {
  &:not(:last-child) {
    margin-right: $inner-spacing-mini;
  }

  & > *:not(:last-child) {
    margin-right: $inner-spacing-mini;
  }

  .node-control {
    @include element-size('token-logo', 32px);

    &__logo {
      display: block;
      margin: auto;
    }
  }

  &-fiat-btn.s-action .payment-icon {
    margin: auto;
    margin-top: 2px;
  }

  .el-button {
    + .el-button {
      margin-left: 0;
    }
  }

  @include desktop {
    margin-left: auto;
  }
}

.app-controls--middle {
  margin-left: auto;

  @include desktop {
    position: absolute;
    top: 50%;
    left: 42.5%;
    transform: translate(-50%, -50%);
    margin-right: 0;
  }

  @media (minmax(1220px, false)) {
    left: 50%;
  }
}

.payment-icon {
  margin-right: $inner-spacing-mini;
}

.app-menu-button {
  flex-shrink: 0;

  @include large-mobile {
    display: none;
  }
}

.app-logo--header {
  @include large-mobile(true) {
    display: none;
  }
}
</style>
