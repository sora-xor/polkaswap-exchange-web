<template>
  <!-- TODO: add parentLoading -->
  <div class="container rewards" v-loading="false">
    <generic-page-header :title="t('rewards.title')" />
    <gradient-box :symbol="gradientSymbol">
      <div class="rewards-box">
        <tokens-row :symbols="rewardTokenSymbols" />
        <div class="rewards-claiming-text">
          {{ t('rewards.claiming.pending') }}
        </div>
        <div class="rewards-amount">
          <rewards-amount-header :items="rewardsAmountHeader" />
          <rewards-amount-table class="rewards-table" :items="rewardsAmountTable" />
          <div class="rewards-footer" v-if="isExternalAccountConnected">
            <s-divider />
            <div class="rewards-account">
              <toggle-text-button
                type="link"
                size="mini"
                :primary-text="formatAddress(ethAddress, 8)"
                :secondary-text="t('rewards.changeWallet')"
              />
              <span>{{ t('rewards.connected') }}</span>
            </div>
          </div>
        </div>
        <div class="rewards-claiming-text--transaction">
          {{ transactionStatusMessage }}
        </div>
      </div>
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
    ToggleTextButton: lazyComponent(Components.ToggleTextButton),
    GradientBox: lazyComponent(Components.GradientBox),
    TokensRow: lazyComponent(Components.TokensRow),
    RewardsAmountHeader: lazyComponent(Components.RewardsAmountHeader),
    RewardsAmountTable: lazyComponent(Components.RewardsAmountTable)
  }
})
export default class Rewards extends Mixins(WalletConnectMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  transactionStep = 2
  transactionSteps = 2

  get transactionStatusMessage (): string {
    const order = this.tOrdinal(this.transactionStep)

    return this.t('rewards.transactions.confimation', { order, total: this.transactionSteps })
  }

  get gradientSymbol (): string {
    return ''
  }

  get rewardTokenSymbols (): Array<string> {
    return ['PSWAP', 'VAL']
  }

  get rewardsAmountHeader (): Array<object> {
    return [
      {
        amount: '2,132,437.1',
        symbol: 'PSWAP'
      },
      {
        amount: '234.7428',
        symbol: 'VAL'
      }
    ]
  }

  get rewardsAmountTable (): Array<object> {
    return [
      {
        title: 'SORA.farm harvest',
        amount: '12,137.1304',
        symbol: 'PSWAP'
      },
      {
        title: 'NFT Airdrop',
        amount: '442.4502',
        symbol: 'PSWAP'
      },
      {
        title: 'XOR ERC-20',
        amount: '234.1322',
        symbol: 'VAL'
      }
    ]
  }

  get hintText (): string {
    return this.t([
      'rewards.hint.connectAccounts' && (!this.isSoraAccountConnected || !this.isExternalAccountConnected),
      'rewards.hint.howToClaimRewards'
    ].find(Boolean))
  }

  get actionButtonText (): string {
    return this.t([
      'rewards.action.connectWallet' && !this.isSoraAccountConnected,
      'rewards.action.connectExternalWallet' && !this.isExternalAccountConnected,
      'rewards.action.signAndClaim'
    ].find(Boolean))
  }

  async handleAction (): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet()
    }
    if (!this.isExternalAccountConnected) {
      return await this.connectExternalWallet()
    }
  }
}
</script>

<style lang="scss" scoped>
.rewards {
  &-box {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    color: var(--s-color-base-on-accent);

    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-mini;
    }
  }

  &-claiming-text {
    font-size: var(--s-heading5-font-size);
    line-height: $s-line-height-big;

    &--transaction {
      font-size: var(--s-font-size-mini);
      line-height: $s-line-height-big;
    }
  }

  &-hint {
    margin: $inner-spacing-medium 0;
    font-size: var(--s-font-size-mini);
    line-height: $s-line-height-big;
    color: var(--s-color-base-content-secondary)
  }

  &-amount {
    width: 100%;

    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-small;
    }

    & .el-divider {
      background: var(--s-color-base-on-accent);
      opacity: 0.5;
      margin: $inner-spacing-small 0;
    }
  }

  &-account {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
    font-size: var(--s-font-size-mini);
    line-height: $s-line-height-big;
    padding: $inner-spacing-mini / 2;
  }

  @include full-width-button('rewards-action-button', 0);
}
</style>
