<template>
  <div id="app">
    <header class="header">
      <s-menu
        class="menu"
        mode="horizontal"
        background-color="transparent"
        box-shadow="none"
        text-color="var(--s-color-base-content-primary)"
        active-text-color="var(--s-color-theme-accent)"
        active-hover-color="transparent"
        :default-active="getCurrentPath()"
        @select="goTo"
      >
        <s-menu-item
          v-for="item in MainMenu"
          :key="item"
          :index="item"
        >
          {{ t(`mainMenu.${item}`) }}
        </s-menu-item>
      </s-menu>
      <s-button class="polkaswap-logo" type="link" @click="goTo(PageNames.About)" />
      <div class="buttons">
        <s-button class="wallet" type="action" icon="wallet" rounded :disabled="loading" @click="goTo(PageNames.Wallet)" />
        <s-button type="action" icon="settings" rounded @click="openSettingsDialog" />
        <!-- TODO: The button is hidden because we don't have a Search page right now -->
        <!-- <s-button type="action" icon="search" rounded /> -->
      </div>
    </header>
    <div class="app-content"><router-view /></div>
    <settings :visible.sync="showSettings" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import { PageNames, MainMenu, Components } from '@/consts'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import router, { lazyComponent } from '@/router'
import { dexApi } from '@soramitsu/soraneo-wallet-web'

@Component({
  components: {
    Settings: lazyComponent(Components.Settings)
  }
})
export default class App extends Mixins(TranslationMixin, LoadingMixin) {
  readonly MainMenu = MainMenu
  readonly PageNames = PageNames
  readonly exchangePages = [
    PageNames.Swap,
    PageNames.Pool,
    PageNames.AddLiquidity,
    PageNames.AddLiquidityId,
    PageNames.RemoveLiquidity,
    PageNames.CreatePair,
    PageNames.Wallet
  ]

  showSettings = false

  async created () {
    if (!dexApi.api) {
      await this.withLoading(() => dexApi.initialize())
      console.info('Connected to blockchain', dexApi.endpoint)
    }
  }

  getCurrentPath (): string {
    if (this.exchangePages.includes(router.currentRoute.name as PageNames)) {
      return PageNames.Exchange
    }
    return router.currentRoute.name as string
  }

  goTo (name: PageNames): void {
    if (router.currentRoute.name === name) {
      return
    }
    if (name !== PageNames.Exchange) {
      router.push({ name })
      return
    }
    if (name === PageNames.Exchange && router.currentRoute.name !== PageNames.Swap) {
      router.push({ name: PageNames.Swap })
    }
  }

  openSettingsDialog (): void {
    this.showSettings = true
  }

  destroyed (): void {
    dexApi.disconnect()
  }
}
</script>

<style lang="scss">
@font-face {
  font-family: "SoraB";
  src: url("~@/assets/fonts/Sora-Bold.otf");
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: "SoraEB";
  src: url("~@/assets/fonts/Sora-ExtraBold.otf");
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: "SoraSB";
  src: url("~@/assets/fonts/Sora-SemiBold.otf");
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: "Sora";
  src: url("~@/assets/fonts/Sora-Regular.otf");
  font-weight: normal;
  font-style: normal;
}
html {
  overflow-y: hidden;
  font-size: var(--s-font-size-small);
  line-height: $s-line-height-base;
}
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Sora', sans-serif;
  color: var(--s-color-base-content-primary);
  height: 100vh;
}
.el-tooltip__popper.info-tooltip {
  padding: $inner-spacing-mini;
  max-width: 320px;
  border: none !important;
  box-shadow: var(--s-shadow-tooltip);
  font-size: var(--s-font-size-small);
  line-height: $s-line-height-medium;
}
.el-form--actions {
  $swap-input-class: ".el-input";
  .s-input--token-value {
    #{$swap-input-class} {
      #{$swap-input-class}__inner {
        padding-top: 0;
      }
    }
    #{$swap-input-class}__inner {
      height: var(--s-size-small);
      padding-right: 0;
      padding-left: 0;
      border-radius: 0;
      color: var(--s-color-base-content-primary);
      font-size: $s-font-size-input;
      line-height: $s-line-height-small;
      &, &:hover, &:focus {
        background-color: var(--s-color-base-background);
        border-color: var(--s-color-base-background);
      }
      &:disabled {
        color: var(--s-color-base-content-tertiary);
      }
      &:not(:disabled) {
        &:hover, &:focus {
          color: var(--s-color-base-content-primary);
        }
      }
    }
    .s-placeholder {
      display: none;
    }
  }
  .el-button {
    // TODO: Check all icons settings after fix in UI Lib
    &--choose-token,
    &--empty-token {
      > span {
        display: inline-flex;
        align-items: center;
        > i[class^=s-icon-] {
          font-size: $s-font-size-input;
        }
      }
    }
    &.el-button--empty-token {
      > span {
        > i[class^=s-icon-] {
          margin-left: $inner-spacing-mini / 2;
        }
      }
    }
    &--choose-token {
      font-feature-settings: $s-font-feature-settings-title;
      > span {
        > i[class^=s-icon-] {
          margin-left: $inner-spacing-mini;
        }
      }
    }
  }
}
</style>

<style lang="scss" scoped>
$logo-width: 150px;
$logo-horizontal-maring: $inner-spacing-big;
$menu-height: 65px;

.header {
  display: flex;
  align-items: center;
  padding: 2px $inner-spacing-small;
  box-shadow: 0px 1px 1px rgba(0, 0, 0, 0.05), 0px 1px 4px rgba(0, 0, 0, 0.05), 0px 1px 25px rgba(0, 0, 0, 0.1);
}

.menu {
  padding: 0;
  &.s-menu {
    border-bottom: none;
    .el-menu-item {
      margin-right: 0;
    }
  }
  .el-menu-item {
    padding-top: 1px;
    padding-right: $inner-spacing-mini;
    padding-left: $inner-spacing-mini;
    font-size: var(--s-heading4-font-size);
    letter-spacing: $s-letter-spacing-small;
    font-feature-settings: $s-font-feature-settings-title;
    &.is-active:hover {
      color: var(--s-color-theme-accent-hover) !important;
    }
    &:hover {
      color: var(--s-color-base-content-secondary) !important;
    }
    &:focus {
      background-color: transparent !important;
    }
  }
}

.polkaswap-logo {
  margin-right: $logo-horizontal-maring;
  margin-left: $logo-horizontal-maring;
  display: none;
  width: $logo-width;
  height: var(--s-size-medium);
  padding: 0;
  background-image: url('~@/assets/img/polkaswap-logo.svg');
}

.buttons {
  margin-left: auto;
  .wallet {
    color: var(--s-color-utility-surface);
    background-color: var(--s-color-theme-accent);
    border-color: var(--s-color-theme-accent);
    &:hover {
      background-color: var(--s-color-theme-accent-hover);
      border-color: var(--s-color-theme-accent-hover);
    }
    &:active {
      background-color: var(--s-color-theme-accent-pressed);
      border-color: var(--s-color-theme-accent-pressed);
    }
    &:focus {
      background-color: var(--s-color-theme-accent-focused);
      border-color: var(--s-color-theme-accent-focused);
    }
  }
  .el-button + .el-button {
    margin-left: $inner-spacing-mini;
  }
}

.app-content {
  overflow-y: auto;
  height: calc(100vh - #{$menu-height});
}

@include tablet {
  .menu {
    width: calc(50% - #{$logo-width + $logo-horizontal-maring * 2} / 2);
  }
  .polkaswap-logo {
    display: block; // TODO: add collapse state for s-menu component
  }
}
</style>
