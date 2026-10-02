<template>
  <header class="header" :class="{ 'header--checkout': checkout }">
    <s-button
      v-if="!checkout"
      class="app-menu-button"
      type="action"
      primary
      icon="basic-more-horizontal-24"
      aria-label="Menu"
      @click="toggleMenu"
    ></s-button>
    <app-logo-button
      v-if="!checkout"
      class="app-logo--header"
      responsive
      :theme="libraryTheme"
      @click="goTo(PageNames.Swap)"
    ></app-logo-button>
    <router-link
      v-if="checkout"
      class="checkout-brand"
      :to="isBuyXorCheckout ? '/buy-xor' : '/get-ts'"
      :aria-label="isBuyXorCheckout ? 'Polkaswap' : 'TONSWAP'"
    >
      <polkaswap-logo v-if="isBuyXorCheckout" :theme="libraryTheme" class="checkout-brand__polkaswap" />
      <template v-else><img :src="tonswapMark" alt="" /> TONSWAP</template>
    </router-link>
    <div v-if="!checkout" class="app-controls app-controls--middle s-flex">
      <app-marketing v-show="showMarketing"></app-marketing>
      <s-button
        :class="fiatBtnClass"
        type="primary"
        size="medium"
        :aria-label="t('buyXor.entry')"
        data-test-name="headerBuyXor"
        @click="goTo(PageNames.BuyXor)"
      >
        <pair-token-logo
          v-if="!isAnyMobile"
          class="payment-icon"
          :first-token="xor"
          :second-token="eth"
          size="small"
        ></pair-token-logo>
        <span>{{ t('buyXor.entry') }}</span>
      </s-button>
    </div>
    <div class="app-controls s-flex">
      <router-link v-if="checkout" class="checkout-exit" to="/swap">{{ t('getTs.exitCheckout') }}</router-link>
      <app-account-button v-else @click="navigateToWallet"></app-account-button>
      <app-header-menu></app-header-menu>
    </div>
    <rotate-phone-dialog v-if="showRotatePhoneDialog"></rotate-phone-dialog>
    <acceleration-access-dialog v-if="showAccelerationAccessDialog"></acceleration-access-dialog>
    <select-language-dialog v-if="showSelectLanguageDialog"></select-language-dialog>
    <select-currency-dialog v-if="showSelectCurrencyDialog"></select-currency-dialog>
  </header>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import { goTo } from '@/app/router';
import {
  AccelerationAccessDialog,
  AppLogoButton,
  AppMarketing,
  PairTokenLogo,
  RotatePhoneDialog,
  SelectCurrencyDialog,
  SelectLanguageDialog,
} from '@/app/shell/components';
import { useInternalConnect } from '@/composables/useInternalConnect';
import { useTranslation } from '@/composables/useTranslation';
import { PageNames } from '@/consts';
import { BreakpointClass } from '@/consts/layout';
import { Theme } from '@/consts/theme';
import { useSettingsStore } from '@/stores/settings';
import { ETH, XOR } from '@sora-substrate/sdk/build/assets/consts';

import AppAccountButton from './AppAccountButton.vue';
import AppHeaderMenu from './AppHeaderMenu.vue';
import PolkaswapLogo from '@/components/shared/Logo/Polkaswap.vue';
import { parseGetTsFundingPurpose } from '@/features/misc/lib/getTsFlow';
import tonswapMark from '@/assets/img/tonswap-mark.svg?url';

defineOptions({ name: 'AppHeader' });

defineProps<{ loading?: boolean; checkout?: boolean }>();

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
const isBuyXorCheckout = computed(
  () =>
    route.path === '/buy-xor' ||
    (/^\/bridge(?:\/|$)/.test(route.path) && parseGetTsFundingPurpose(route.query) === 'xor')
);

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
const showSelectLanguageDialog = computed(() => Boolean(settingsStore.selectLanguageDialogVisibility));
const showSelectCurrencyDialog = computed(() => Boolean(settingsStore.selectCurrencyDialogVisibility));
const showRotatePhoneDialog = computed(() => {
  const dialogVisible = Boolean(settingsStore.rotatePhoneDialogVisibility);
  const hideFeatureEnabled = Boolean(settingsStore.isRotatePhoneHideBalanceFeatureEnabled);
  const accessDeclined = Boolean(settingsStore.isAccessAccelerometrEventDeclined);
  const rotationListener = Boolean(settingsStore.isAccessRotationListener);

  return dialogVisible && !hideFeatureEnabled && !accessDeclined && !rotationListener;
});
const showAccelerationAccessDialog = computed(
  () =>
    Boolean(settingsStore.rotatePhoneDialogVisibility) &&
    !settingsStore.isAccessRotationListener &&
    Boolean(settingsStore.isAccessAccelerometrEventDeclined)
);

const fiatBtnClass = computed(() => {
  const classes = ['app-controls-fiat-btn', 'active'];
  if (route.name === PageNames.BuyXor) {
    classes.push('app-controls-fiat-btn--active', 's-pressed');
  }
  return classes;
});

function toggleMenu(): void {
  emit('toggle-menu');
}
</script>

<style lang="scss">
.header--checkout {
  justify-content: space-between;
  padding-inline: clamp(16px, 4vw, 48px);

  .checkout-brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--s-color-base-content-primary);
    font-weight: 700;
    font-size: 15px;
    letter-spacing: 0.06em;
    text-decoration: none;

    img {
      width: 28px;
      height: 28px;
    }
    .checkout-brand__polkaswap {
      width: 146px;
      height: 40px;
    }
  }

  .checkout-exit {
    color: var(--s-color-base-content-secondary);
    font-size: 12px;
    text-decoration: none;
    padding: 12px;
  }

  a:focus-visible {
    outline: 2px solid var(--s-color-theme-accent);
    outline-offset: 3px;
  }
}

.app-controls .settings-control {
  background-color: var(--s-color-utility-body) !important;
  border-color: transparent !important;
  color: var(--s-color-base-content-secondary) !important;
  font-weight: 500 !important;
}

.app-controls .app-controls-fiat-btn {
  display: block !important;
  position: relative;
  isolation: isolate;
  height: 44px !important;
  min-height: 44px !important;
  padding: 5px 13px !important;
  line-height: 14px !important;
  font-weight: 600 !important;
  background-color: var(--s-color-action-fill) !important;
  border-color: transparent !important;
  color: var(--s-color-on-action) !important;
  box-shadow: 0 3px 12px color-mix(in srgb, var(--s-color-action-fill) 20%, transparent) !important;

  &:hover {
    background-color: var(--s-color-action-fill-hover) !important;
  }

  &:focus-visible {
    outline: 2px solid var(--s-color-focus-ring) !important;
    outline-offset: 4px;
  }

  // Two gentle halo pulses introduce the shared purchase action without moving its hit target.
  &::before {
    content: '';
    position: absolute;
    inset: -3px;
    z-index: -1;
    border: 1px solid var(--s-color-action-fill);
    border-radius: inherit;
    box-shadow: 0 0 12px color-mix(in srgb, var(--s-color-action-fill) 25%, transparent);
    opacity: 0;
    pointer-events: none;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .app-controls .app-controls-fiat-btn::before {
    animation: buy-xor-halo 2.4s ease-out 0.6s 2;
  }
}

@keyframes buy-xor-halo {
  0%,
  100% {
    opacity: 0;
    transform: scale(1);
  }
  30% {
    opacity: 0.45;
  }
  80% {
    opacity: 0;
    transform: scale(1.08, 1.18);
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-controls .app-controls-fiat-btn {
    transition: none !important;

    &::before {
      animation: none !important;
    }
  }
}

.app-controls .account-control.el-button,
.app-controls .settings-control.el-button {
  display: block !important;
}

.app-controls .settings-control.el-button {
  width: 42px !important;
  height: 42px !important;
  line-height: 14px !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
}

.app-controls .app-controls-fiat-btn .s-button__text {
  font-size: 14px !important;
  font-weight: 600 !important;
  line-height: 14px !important;
  text-transform: uppercase !important;
}

.app-controls .account-control:not(.s-pressed) {
  background-color: var(--s-color-utility-body) !important;
  border-color: transparent !important;
  color: var(--s-color-base-content-secondary) !important;
}

.app-controls .account-control.s-pressed {
  background-color: var(--s-color-utility-surface) !important;
  border-color: var(--s-color-base-border-primary) !important;
  color: var(--s-color-base-content-secondary) !important;
}

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
  color: var(--s-color-base-content-secondary) !important;
}

.app-controls .settings-control.settings-control--open,
.app-controls .settings-control.settings-control--open i,
.app-controls .settings-control.settings-control--open .header-menu__button i {
  color: var(--s-color-base-content-secondary) !important;
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
  background-color: var(--s-color-action-fill) !important;
  border-color: var(--s-color-base-border-secondary) !important;
  color: var(--s-color-on-action) !important;
  font-weight: 500 !important;
  line-height: 14px !important;
  position: static !important;
  box-shadow:
    1px 1px 5px #fff,
    -1px -1px 5px #fff !important;
}

.app-menu-button.el-button.neumorphic.s-action.s-primary:not(.is-disabled):hover,
.app-menu-button.el-button.neumorphic.s-action.s-primary:not(.is-disabled):focus {
  background-color: var(--s-color-action-fill-hover) !important;
  box-shadow:
    1px 1px 5px rgba(255, 255, 255, 0.7),
    -1px -1px 5px #fff,
    0 0 20px rgba(247, 84, 163, 0.5) !important;
}

.app-menu-button.el-button.neumorphic.s-action.s-primary i {
  color: var(--s-color-on-action) !important;
}

[design-system-theme='dark'] .app-controls .account-control {
  background-color: var(--s-color-utility-body) !important;
  border-color: transparent !important;
  color: var(--s-color-base-content-secondary) !important;
}

[design-system-theme='dark'] .app-controls .settings-control {
  background-color: var(--s-color-utility-body) !important;
  border-color: transparent !important;
  color: var(--s-color-base-content-secondary) !important;
}

[design-system-theme='dark'] .app-controls .settings-control.settings-control--open,
[design-system-theme='dark'] .app-controls .settings-control.settings-control--open i,
[design-system-theme='dark'] .app-controls .settings-control.settings-control--open .header-menu__button i {
  color: var(--s-color-base-content-secondary) !important;
}

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

[design-system-theme='dark'] .app-menu-button.el-button.neumorphic.s-action.s-primary:not(.is-disabled):hover,
[design-system-theme='dark'] .app-menu-button.el-button.neumorphic.s-action.s-primary:not(.is-disabled):focus {
  background-color: var(--s-color-action-fill-hover) !important;
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

html[dir='rtl'] {
  .app-controls {
    &:not(:last-child),
    .header > &:not(.app-controls--middle),
    & > *:not(:last-child),
    .payment-icon {
      margin-right: 0;
      margin-left: $inner-spacing-mini;
    }

    &.app-controls--middle {
      @include desktop {
        margin-left: 0;
        margin-right: 0;
      }
    }
  }

  .header > .app-controls:not(.app-controls--middle) {
    @include desktop {
      margin-left: 0 !important;
      margin-right: auto !important;
    }
  }
}

@include large-mobile(true) {
  .app-logo--header.app-logo.el-button {
    display: none !important;
    position: static !important;
  }

  .app-controls .settings-control.el-button {
    display: block !important;
    width: 42px !important;
    height: 42px !important;
    line-height: 14px !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
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

  .header > &:not(.app-controls--middle) {
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

  @include large-mobile(true) {
    .account-control.el-button,
    .settings-control.el-button {
      display: block !important;
      width: 42px !important;
      height: 42px !important;
      line-height: 14px !important;
    }

    .settings-control.el-button {
      padding-left: 0 !important;
      padding-right: 0 !important;
    }

    .app-controls-fiat-btn.el-button {
      width: auto !important;
      min-width: 88px;
      min-height: 44px !important;
      height: auto !important;
      padding: 10px 12px !important;
      .s-button__text {
        white-space: normal;
        text-transform: none !important;
        font-size: 13px !important;
        line-height: 16px !important;
      }
    }

    .account-control.el-button {
      padding: 5px !important;
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
  width: 42px !important;
  height: 42px !important;
  min-height: 42px !important;

  @include large-mobile(true) {
    display: block !important;
    line-height: 14px !important;
  }

  @include large-mobile {
    display: none;
  }
}

.app-logo--header {
  @include large-mobile(true) {
    display: none;
  }
}

html[dir='rtl'] {
  .header {
    direction: rtl;
  }

  .app-controls--middle {
    margin-right: auto;
    margin-left: 0;

    @include desktop {
      right: 42.5%;
      left: auto;
      margin-right: 0;
      transform: translate(50%, -50%);
    }

    @media (minmax(1220px, false)) {
      right: 50%;
    }
  }
}
</style>
