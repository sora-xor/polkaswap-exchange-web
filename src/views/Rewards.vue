<template>
  <!-- TODO: add parentLoading -->
  <div class="container rewards" v-loading="false">
    <generic-page-header :title="t('rewards.title')" />
    <gradient-box :symbol="gradientSymbol">
      <tokens-row :symbols="rewardTokenSymbols" />
    </gradient-box>
    <div class="rewards-hint">
      {{ hintText }}
    </div>
    <s-button class="rewards-action-button" type="primary" @click="handleAction">
      {{ actionButtonText }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

import WalletConnectMixin from '../components/mixins/WalletConnectMixin'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    GradientBox: lazyComponent(Components.GradientBox),
    TokensRow: lazyComponent(Components.TokensRow)
  }
})
export default class Rewards extends Mixins(WalletConnectMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  // TODO: check reward tokens
  get gradientSymbol (): string {
    return 'PSWAP'
  }

  get rewardTokenSymbols (): Array<string> {
    return ['PSWAP', 'VAL', 'XOR']
  }

  get hintText (): string {
    if (!this.isSoraAccountConnected || !this.isEthAccountConnected) {
      return this.t('rewards.hint.connectAccounts')
    }

    return this.t('rewards.hint.howToClaimRewards')
  }

  get actionButtonText (): string {
    if (!this.isSoraAccountConnected) {
      return this.t('rewards.action.connectWallet')
    }
    if (!this.isEthAccountConnected) {
      return this.t('rewards.action.connectEthereumWallet')
    }

    return this.t('rewards.action.signAndClaim')
  }

  async handleAction (): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet()
    }
    if (!this.isEthAccountConnected) {
      return await this.connectExternalWallet()
    }
  }
}
</script>

<style lang="scss" scoped>
.rewards {
  &-hint {
    margin: $inner-spacing-medium 0;
    font-size: var(--s-font-size-mini);
    line-height: $s-line-height-big;
    color: var(--s-color-base-content-secondary)
  }

  @include full-width-button('rewards-action-button', 0);
}
</style>
