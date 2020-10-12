<template>
  <div id="app">
    <s-menu
      class="menu"
      mode="horizontal"
      background-color="#FFF"
      text-color="#0D0248"
      active-text-color="#ED145B"
      active-hover-color="#FFF"
      :default-active="currentPath"
      @select="goTo"
    >
      <s-menu-item
        v-for="item in MainMenu"
        :key="item"
        :index="item"
      >
        <span style="font-size: 18px;">{{ t(`mainMenu.${item}`) }}</span>
      </s-menu-item>
      <div class="controls">
        <div class="buttons">
          <s-button class="wallet" type="action" size="medium" icon="wallet" rounded />
          <s-button type="action" size="medium" icon="settings" rounded />
          <s-button type="action" size="medium" icon="search" rounded />
        </div>
      </div>
    </s-menu>
    <i class="polkaswap" />
    <div class="app-content"><router-view /></div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import { PageNames, MainMenu } from '@/consts'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import router from '@/router'

@Component
export default class App extends Mixins(TranslationMixin) {
  readonly MainMenu = MainMenu

  get currentPath (): string {
    return router.currentRoute.name || PageNames.About
  }

  goTo (name: string): void {
    if (router.currentRoute.name === name) {
      return
    }
    router.push({ name })
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
  box-sizing: border-box;
  overflow-y: hidden;
}
*, *:before, *:after {
  box-sizing: border-box;
  margin: 0;
}
#app {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-family: 'Sora', sans-serif;
  color: var(--s-color-basic-black);
  height: 100vh;
}
</style>

<style lang="scss" scoped>
.polkaswap {
  position: absolute;
  background-image: url('~@/assets/polkaswap-logo.svg');
  width: 151px;
  height: 40px;
  top: 6px;
  left: calc(50% - 75px);
}
.menu {
  padding: 2px 12px;
  flex: 1;
  .controls {
    position: relative;
    .buttons {
      position: absolute;
      right: 10px;
      top: 12px;
      .wallet {
        color: #FFF;
        background-color: var(--s-color-main-brand);
        &:hover, &:active, &:focus {
          background-color: var(--s-color-main-hover);
        }
      }
    }
  }
}
.app-content {
  overflow-y: auto;
  height: calc(100vh - 65px);
}
@media (max-width: 1050px) {
  .polkaswap {
    display: none; // TODO: add collapse state for s-menu component
  }
}
</style>
