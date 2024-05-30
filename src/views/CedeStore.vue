<template>
  <div class="container cede-store-page" v-loading="parentLoading">
    <generic-page-header has-button-back @back="goTo(PageNames.DepositOptions)">
      <template #title="">{{ brandName }}</template>
    </generic-page-header>
    <div id="cede-widget" />
  </div>
</template>

<script lang="ts">
import { renderSendWidget } from '@cedelabs/widgets-universal';
import { mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import { Component, Mixins } from 'vue-property-decorator';

import { Components, PageNames } from '../consts';
import { goTo, lazyComponent } from '../router';
import { getter, state } from '../store/decorators';

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
  },
})
export default class CedeStore extends Mixins(mixins.TranslationMixin, mixins.LoadingMixin) {
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @state.wallet.account.address accountAddress!: string;

  @getter.wallet.account.isLoggedIn isLoggedIn!: boolean;
  @getter.libraryTheme libraryTheme!: Theme;

  goTo = goTo;
  PageNames = PageNames;

  get brandName(): string {
    const name = this.TranslationConsts.CedeStore;
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  rootSelector = '#cede-widget';

  private loadCedeWidget(): void {
    try {
      this.$nextTick(() => {
        renderSendWidget(this.rootSelector, {
          config: {
            tokenSymbol: 'XOR',
            network: 'sora',
            address: this.accountAddress,
            lockNetwork: true,
          },
          theme: {
            mode: this.libraryTheme,
            logoTheme: this.libraryTheme,
            fontFamily: 'Sora',
            width: '420px',
            accentColor: '#f8087b',
            logoBorderColor: '#f8087b',
            warningColor: '#eba332',
            errorColor: '#f754a3',
          },
        });
      });
    } catch (error) {
      console.error("[CEDE STORE] wasn't loaded.", error);
    }
  }

  mounted(): void {
    this.loadCedeWidget();
  }
}
</script>

<style lang="scss">
.cede-store-page {
  .page-header .page-header-title {
    text-transform: none;
  }
}
</style>
