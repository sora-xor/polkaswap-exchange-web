<template>
  <dialog-base :visible.sync="isVisible">
    <div id="cede-widget" />
  </dialog-base>
</template>

<script lang="ts">
import { renderSendWidget } from '@cedelabs/widgets-universal';
import { components, mixins, WALLET_CONSTS } from '@soramitsu/soraneo-wallet-web';
import Theme from '@soramitsu-ui/ui-vue2/lib/types/Theme';
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { getter, state } from '@/store/decorators';

@Component({
  components: {
    DialogBase: components.DialogBase,
  },
})
export default class CedeStoreWidget extends Mixins(mixins.DialogMixin, mixins.LoadingMixin, mixins.TranslationMixin) {
  @state.wallet.settings.soraNetwork soraNetwork!: Nullable<WALLET_CONSTS.SoraNetwork>;
  @state.wallet.account.address accountAddress!: string;
  @getter.libraryTheme libraryTheme!: Theme;

  rootSelector = '#cede-widget';

  @Watch('isVisible', { immediate: true })
  private loadCedeWidget(): void {
    if (this.isVisible) {
      try {
        this.$nextTick(() => {
          renderSendWidget(this.rootSelector, {
            config: {
              tokenSymbol: 'XOR',
              network: 'sora',
              address: this.accountAddress,
            },
            theme: {
              mode: this.libraryTheme,
              logoTheme: this.libraryTheme,
              width: '450px',
            },
          });
        });
      } catch (error) {
        console.error("[CEDE STORE] wasn't loaded.", error);
      }
    }
  }
}
</script>
