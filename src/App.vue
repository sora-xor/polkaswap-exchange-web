<template>
  <div id="app">
    <s-menu
      class="menu"
      mode="horizontal"
      background-color="#FFF"
      box-shadow="0px 1px 1px rgba(0, 0, 0, 0.05), 0px 1px 4px rgba(0, 0, 0, 0.05), 0px 1px 25px rgba(0, 0, 0, 0.1)"
      text-color="#0D0248"
      active-text-color="#ED145B"
      active-hover-color="#FFF"
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
      <div class="controls">
        <div class="buttons">
          <s-button class="wallet" type="action" icon="wallet" rounded @click="goTo(PageNames.Wallet)" />
          <s-button type="action" icon="settings" rounded @click="openSettingsDialog" />
          <s-button type="action" icon="search" rounded />
        </div>
      </div>
    </s-menu>
    <s-button class="polkaswap-logo" type="link" @click="goTo(PageNames.About)" />
    <div class="app-content"><router-view /></div>
    <settings :visible.sync="showSettings" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'

import { PageNames, MainMenu, Components } from '@/consts'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import router, { lazyComponent } from '@/router'

@Component({
  components: {
    Settings: lazyComponent(Components.Settings)
  }
})
export default class App extends Mixins(TranslationMixin) {
  readonly MainMenu = MainMenu
  readonly PageNames = PageNames

  showSettings = false

  getCurrentPath (): string {
    if ([PageNames.Swap, PageNames.Pool, PageNames.Wallet].includes(router.currentRoute.name as PageNames)) {
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
  font-size: $s-font-size-small;
  line-height: $s-line-height-small;
}
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Sora', sans-serif;
  color: var(--s-color-base-content-primary);
  height: 100vh;
}
</style>

<style lang="scss" scoped>
$logo-width: 151px;
$menu-height: 65px;

.polkaswap-logo {
  display: none;
  position: absolute;
  background-image: url('~@/assets/img/polkaswap-logo.svg');
  width: $logo-width;
  height: 40px;
  top: 6px;
  left: calc(50% - #{$logo-width / 2});
}
.menu {
  padding: 2px 12px;
  flex: 1;
  .el-menu-item {
    font-size: 1.285rem;
  }
  .controls {
    position: relative;
    .buttons {
      position: absolute;
      right: $basic-spacing;
      top: 12px;
      .wallet {
        color: var(--s-color-utility-surface);
        background-color: var(--s-color-theme-accent);
        &:hover {
          background-color: var(--s-color-theme-accent-hover);
        }
        &:active {
          background-color: var(--s-color-theme-accent-pressed);
        }
        &:focus {
          background-color: var(--s-color-theme-accent-focused);
        }
      }
    }
  }
}
.app-content {
  overflow-y: auto;
  height: calc(100vh - #{$menu-height});
}
@include desktop {
  .polkaswap-logo {
    display: initial; // TODO: add collapse state for s-menu component
  }
}
</style>
