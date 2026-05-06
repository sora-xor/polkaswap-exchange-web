<template>
  <app-header :loading="loading" @toggle-menu="toggleMenu"></app-header>
  <div :class="appClasses">
    <app-menu
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
          <router-view :parent-loading="routeParentLoading"></router-view>
        </div>
      </s-scrollbar>
    </div>
  </div>
  <app-footer></app-footer>
</template>

<script setup lang="ts">
import AppFooter from '@/components/App/Footer/AppFooter.vue';
import AppHeader from '@/components/App/Header/AppHeader.vue';
import AppDisclaimer from '@/components/App/Header/AppDisclaimer.vue';
import AppLogoButton from '@/components/App/Header/AppLogoButton.vue';
import AppMenu from '@/components/App/Menu/AppMenu.vue';

import { useAppShellContext } from './context';

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
</style>
