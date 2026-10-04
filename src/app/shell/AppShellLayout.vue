<template>
  <app-header :loading="loading" :checkout="checkout" @toggle-menu="toggleMenu"></app-header>
  <div :class="[appClasses, { 'app-main--checkout': checkout }]">
    <app-menu
      v-if="!checkout"
      :visible="menuVisibility"
      :on-select="goTo"
      @open-product-dialog="openProductDialog"
      @click="handleAppMenuClick"
    >
      <template #head>
        <app-logo-button class="app-logo--menu" :theme="libraryTheme" @click="goToSwap"></app-logo-button>
      </template>
    </app-menu>
    <div class="app-body">
      <s-scrollbar class="app-body-scrollbar" v-loading="pageLoading">
        <div class="app-content">
          <app-disclaimer v-if="effectiveDisclaimerVisibility"></app-disclaimer>
          <tonswap-journey-notice />
          <router-view :parent-loading="routeParentLoading"></router-view>
        </div>
      </s-scrollbar>
    </div>
  </div>
  <app-footer v-if="!checkout"></app-footer>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { isGetTsCheckoutRoute } from '@/features/misc/lib/getTsFlow';

import { AppDisclaimer, AppFooter, AppHeader, AppLogoButton, AppMenu, TonswapJourneyNotice } from './chrome';
import { useAppShellContext } from './context';

const route = useRoute();
const checkout = computed(() => isGetTsCheckoutRoute(route.path, route.query));

const {
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
} = useAppShellContext();
</script>

<style lang="scss">
@include large-mobile {
  .app-logo--menu.app-logo.el-button {
    display: none !important;
  }
}
</style>

<style lang="scss" scoped>
.app {
  &-main {
    display: flex;
    align-items: stretch;
    height: calc(100vh - #{$header-height} - #{$footer-height});
    height: calc(100dvh - #{$header-height} - #{$footer-height});
    position: relative;
  }

  &-body {
    position: relative;
    display: flex;
    flex: 1;
    flex-flow: column nowrap;
    max-width: 100%;
    min-width: 0;
  }

  &-content {
    flex: 1;
    padding: $inner-spacing-medium;
    min-width: 0;
    border-color: var(--s-color-base-content-primary);
    border-style: none;
  }

  &-footer {
    display: flex;
    flex-direction: column-reverse;
    justify-content: flex-end;
    padding: $basic-spacing-medium;
  }
}

.app-logo--menu {
  margin-bottom: $inner-spacing-big;

  @include large-mobile {
    display: none;
  }
}

.app-main.app-main--checkout {
  height: calc(100vh - #{$header-height});
  height: calc(100dvh - #{$header-height});

  .app-content {
    padding: 0;
  }
}
</style>
