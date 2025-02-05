<template>
  <header class="header">
    <app-logo-button class="app-logo--header" :theme="libraryTheme" @click="goTo(PageNames.Bridge)" />
    <div class="app-controls app-controls--middle s-flex">
      <app-header-menu />
    </div>
    <rotate-phone-dialog />
    <acceleration-access-dialog />
    <select-language-dialog />
    <select-currency-dialog />
  </header>
</template>

<script lang="ts">
import { XOR, ETH } from '@sora-substrate/sdk/build/assets/consts';
import { Component, Mixins, Prop } from 'vue-property-decorator';

import InternalConnectMixin from '../../../components/mixins/InternalConnectMixin';
import { PageNames, Components } from '../../../consts';
import { BreakpointClass } from '../../../consts/layout';
import { lazyComponent, goTo } from '../../../router';
import { state, getter } from '../../../store/decorators';

import AppHeaderMenu from './AppHeaderMenu.vue';

import type Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';

@Component({
  components: {
    AppHeaderMenu,
    AppLogoButton: lazyComponent(Components.AppLogoButton),
    SelectLanguageDialog: lazyComponent(Components.SelectLanguageDialog),
    SelectCurrencyDialog: lazyComponent(Components.SelectCurrencyDialog),
    RotatePhoneDialog: lazyComponent(Components.RotatePhoneDialog),
    AccelerationAccessDialog: lazyComponent(Components.AccelerationAccessDialog),
  },
})
export default class AppHeader extends Mixins(InternalConnectMixin) {
  readonly PageNames = PageNames;
  readonly xor = XOR;
  readonly eth = ETH;

  @Prop({ type: Boolean, default: false }) readonly loading!: boolean;

  @state.settings.screenBreakpointClass private screenBreakpointClass!: BreakpointClass;

  @getter.libraryTheme libraryTheme!: Theme;

  goTo = goTo;

  toggleMenu(): void {
    this.$emit('toggle-menu');
  }
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

  .el-button {
    + .el-button {
      margin-left: 0;
    }
  }

  &--middle {
    margin-left: auto;
  }
}
</style>
