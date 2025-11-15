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
      <app-marketing v-show="!isMobile"></app-marketing>
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
      <app-account-button :disabled="loading" @click="navigateToWallet"></app-account-button>
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
import store from '@/store';

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

const props = defineProps<{ loading?: boolean }>();
const loading = computed(() => props.loading ?? false);

const emit = defineEmits<{
  (e: 'toggle-menu'): void;
}>();

const { t } = useTranslation();
const { navigateToWallet } = useInternalConnect();
const route = useRoute();

const xor = XOR;
const eth = ETH;

const screenBreakpointClass = computed(() => store.state.settings.screenBreakpointClass as BreakpointClass);
const libraryTheme = computed(() => store.getters.libraryTheme as Theme);

const isMobile = computed(() => screenBreakpointClass.value === BreakpointClass.Mobile);
const isAnyMobile = computed(
  () =>
    screenBreakpointClass.value === BreakpointClass.Mobile ||
    screenBreakpointClass.value === BreakpointClass.LargeMobile
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
  }
  &-fiat-btn:hover {
    background-color: var(--s-color-base-surface-popover);
  }
}

.app-controls--middle {
  flex: 1;
  justify-content: center;
  align-items: center;
}

.payment-icon {
  margin-right: $inner-spacing-mini;
}

.app-menu-button {
  margin-right: $inner-spacing-mini;
}

@include desktop(true) {
  .app-menu-button {
    display: none;
  }
}
</style>
