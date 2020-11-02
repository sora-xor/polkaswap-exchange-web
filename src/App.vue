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
        {{ t(`mainMenu.${item}`) }}
      </s-menu-item>
      <div class="controls">
        <div class="buttons">
          <s-button class="wallet" type="action" size="medium" icon="wallet" rounded />
          <s-button type="action" size="medium" icon="settings" rounded />
          <s-button type="action" size="medium" icon="search" rounded />
        </div>
      </div>
    </s-menu>
    <i class="polkaswap-logo" />
    <select-token :visible="dialogVisible" @close="onClose" />
    <div class="app-content"><router-view /></div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'

import { PageNames, MainMenu } from '@/consts'
import TranslationMixin from '@/components/mixins/TranslationMixin'
import router from '@/router'
import SelectToken from '@/components/SelectToken.vue'

@Component({
  components: {
    SelectToken
  }
})
export default class App extends Mixins(TranslationMixin) {
  readonly MainMenu = MainMenu
  dialogVisible = true
  get currentPath (): string {
    return router.currentRoute.name || PageNames.About
  }

  onClose () {
    this.dialogVisible = false
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
@import './styles/typography';

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
  font-size: $font-size_basic;
  line-height: $line-height_basic;
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
@import '/styles/soramitsu-variables';
@import '/styles/colors';
@import '/styles/breakpoints';
@import '/styles/layout';

$logo-width: 151px;

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
        color: $color-wight;
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
@include desktop {
  .polkaswap-logo {
    display: initial; // TODO: add collapse state for s-menu component
  }
}
</style>
