<template>
  <header class="header">
    <s-button class="polkaswap-menu" type="action" primary icon="basic-more-horizontal-24" @click="toggleMenu" />
    <s-button class="polkaswap-logo polkaswap-logo--tablet" type="link" size="large" @click="goTo(PageNames.Swap)">
      <polkaswap-logo :theme="libraryTheme" class="polkaswap-logo__image" />
    </s-button>
    <div class="app-controls s-flex">
      <s-button type="action" class="theme-control s-pressed" @click="toggleHideBalance">
        {{ shouldBalanceBeHidden ? 'H' : 'V' }}
      </s-button>
      <s-button type="action" class="theme-control s-pressed" @click="switchTheme">
        <s-icon :name="themeIcon" size="28" />
      </s-button>
      <s-button type="action" class="lang-control s-pressed" @click="openSelectLanguageDialog">
        <s-icon name="basic-globe-24" size="28" />
      </s-button>
      <s-button type="action" class="node-control s-pressed" :tooltip="nodeTooltip" @click="openSelectNodeDialog">
        <token-logo class="node-control__logo" v-bind="nodeLogo" />
      </s-button>
      <s-button
        type="tertiary"
        :class="['account-control', { 's-pressed': isLoggedIn }]"
        size="medium"
        :tooltip="accountTooltip"
        :disabled="loading"
        @click="goTo(PageNames.Wallet)"
      >
        <div :class="['account-control-title', { name: isLoggedIn }]">{{ accountInfo }}</div>
        <div class="account-control-icon">
          <s-icon v-if="!isLoggedIn" name="finance-wallet-24" size="28" />
          <WalletAvatar v-else :address="account.address" />
        </div>
      </s-button>
    </div>

    <select-node-dialog :visible.sync="showSelectNodeDialog" />
    <select-language-dialog :visible.sync="showSelectLanguageDialog" />
  </header>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator';
import { Getter, State, Action } from 'vuex-class';
import { components } from '@soramitsu/soraneo-wallet-web';
import { switchTheme } from '@soramitsu/soramitsu-js-ui/lib/utils';
import Theme from '@soramitsu/soramitsu-js-ui/lib/types/Theme';
import { KnownSymbols } from '@sora-substrate/util';

import TranslationMixin from '@/components/mixins/TranslationMixin';
import NodeErrorMixin from '@/components/mixins/NodeErrorMixin';
import PolkaswapLogo from '@/components/logo/Polkaswap.vue';

import { lazyComponent, goTo } from '@/router';
import { PageNames, Components, LogoSize } from '@/consts';
import { formatAddress } from '@/utils';

@Component({
  components: {
    WalletAvatar: components.WalletAvatar,
    PolkaswapLogo,
    SelectNodeDialog: lazyComponent(Components.SelectNodeDialog),
    SelectLanguageDialog: lazyComponent(Components.SelectLanguageDialog),
    TokenLogo: lazyComponent(Components.TokenLogo),
  },
})
export default class AppHeader extends Mixins(TranslationMixin, NodeErrorMixin) {
  readonly PageNames = PageNames;

  @Prop({ type: Boolean, default: false }) readonly loading!: boolean;

  @State((state) => state.settings.selectNodeDialogVisibility) selectNodeDialogVisibility!: boolean;

  @Getter shouldBalanceBeHidden!: boolean;
  @Getter libraryTheme!: Theme;
  @Getter isLoggedIn!: boolean;
  @Getter account!: any; // TODO: WALLET ACCOUNT TYPE

  @Action toggleHideBalance!: AsyncVoidFn;

  switchTheme: AsyncVoidFn = switchTheme;
  goTo = goTo;
  showSelectLanguageDialog = false;

  get accountTooltip(): string {
    return this.t(`${this.isLoggedIn ? 'connectedAccount' : 'connectWalletTextTooltip'}`);
  }

  get accountInfo(): string {
    if (!this.isLoggedIn) {
      return this.t('connectWalletText');
    }
    return this.account.name || formatAddress(this.account.address, 8);
  }

  get nodeTooltip(): string {
    if (this.nodeIsConnected) {
      return this.t('selectNodeConnected', { chain: this.node.chain });
    }
    return this.t('selectNodeText');
  }

  get nodeLogo(): any {
    return {
      size: LogoSize.MEDIUM,
      tokenSymbol: KnownSymbols.XOR,
    };
  }

  get themeIcon(): string {
    return this.libraryTheme === Theme.LIGHT ? 'various-brightness-low-24' : 'various-moon-24';
  }

  get showSelectNodeDialog(): boolean {
    return this.selectNodeDialogVisibility;
  }

  set showSelectNodeDialog(flag: boolean) {
    this.setSelectNodeDialogVisibility(flag);
  }

  openSelectNodeDialog(): void {
    this.setSelectNodeDialogVisibility(true);
  }

  openSelectLanguageDialog(): void {
    this.showSelectLanguageDialog = true;
  }

  toggleMenu(): void {
    this.$emit('toggle-menu');
  }
}
</script>

<style lang="scss">
.account-control {
  &-icon {
    svg circle:first-child {
      fill: var(--s-color-utility-surface);
    }
  }
  span {
    flex-direction: row-reverse;
  }
  [class^='s-icon-'] {
    @include icon-styles;
  }
}
</style>

<style lang="scss" scoped>
$account-control-name-max-width: 200px;

@include polkaswap-logo;

.polkaswap-menu {
  @include large-mobile {
    display: none;
  }
}

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
  &:after {
    content: '';
    position: absolute;
    height: 1px;
    bottom: 0;
    left: $inner-spacing-mini;
    right: $inner-spacing-mini;
    background-color: var(--s-color-base-border-secondary);
  }
}

.app-controls {
  margin-left: auto;
  & > *:not(:last-child) {
    margin-right: $inner-spacing-mini;
  }
  .el-button {
    + .el-button {
      margin-left: 0;
    }
  }
}

.node-control {
  @include element-size('token-logo', 28px);
  .token-logo {
    display: block;
    margin: auto;
  }
}

.account-control {
  letter-spacing: var(--s-letter-spacing-small);
  &-title {
    font-size: var(--s-font-size-small);
    max-width: $account-control-name-max-width;
    overflow: hidden;
    text-overflow: ellipsis;
    &.name {
      text-transform: none;
    }
  }
  &.s-tertiary {
    &.el-button {
      padding-left: $basic-spacing-mini;
    }
    .account-control-title {
      margin-left: $basic-spacing-mini;
    }
  }
  &-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--s-size-small);
    height: var(--s-size-small);
    overflow: hidden;
    border-radius: 50%;
  }
}
</style>
