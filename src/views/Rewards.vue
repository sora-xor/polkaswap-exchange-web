<template>
  <div class="container rewards" v-loading="parentLoading">
    <generic-page-header :title="t('rewards.title')" />
    <gradient-box :symbol="gradientSymbol">
      <div class="rewards-box">
        <tokens-row :symbols="rewardTokenSymbols" />
        <div v-if="rewardsClaiming" class="rewards-claiming-text">
          {{ t('rewards.claiming.pending') }}
        </div>
        <div v-if="connectedState" class="rewards-amount">
          <rewards-amount-header v-if="rewardsChecked" :items="rewardsHeader" />
          <rewards-amount-table v-if="rewardsAvailable" class="rewards-table" :items="rewards" />
          <div class="rewards-footer">
            <s-divider />
            <div class="rewards-account">
              <toggle-text-button
                type="link"
                size="mini"
                :primary-text="formatAddress(ethAddress, 8)"
                :secondary-text="t('rewards.changeWallet')"
                @click="changeExternalAccountProcess"
              />
              <span>{{ t('rewards.connected') }}</span>
            </div>
          </div>
        </div>
        <div v-if="rewardsClaiming" class="rewards-claiming-text--transaction">
          {{ transactionStatusMessage }}
        </div>
      </div>
    </gradient-box>
    <div class="rewards-hint">
      {{ hintText }}
    </div>
    <s-button class="rewards-action-button" type="primary" @click="handleAction" :loading="rewardsFetching">
      {{ actionButtonText }}
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

import WalletConnectMixin from '../components/mixins/WalletConnectMixin'
import LoadingMixin from '../components/mixins/LoadingMixin'

import { Reward } from '../store/rewards'

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
export default class Rewards extends Mixins(WalletConnectMixin, LoadingMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @State(state => state.rewards.rewards) rewards!: Array<Reward>
  @State(state => state.rewards.rewardsFetching) rewardsFetching
  @State(state => state.rewards.rewardsClaiming) rewardsClaiming
  @State(state => state.rewards.transactionStep) transactionStep
  @State(state => state.rewards.transactionStepsCount) transactionStepsCount

  @Getter('rewardsAvailable', { namespace: 'rewards' }) rewardsAvailable!: boolean
  @Getter('rewardsChecked', { namespace: 'rewards' }) rewardsChecked!: boolean

  @Action('reset', { namespace: 'rewards' }) reset!: () => void
  @Action('getRewards', { namespace: 'rewards' }) getRewards!: () => Promise<void>

  async created (): Promise<void> {
    await this.withApi(async () => {
      this.reset()
      await this.checkAccountRewards()
    })
  }

  get connectedState (): boolean {
    return this.isSoraAccountConnected && this.isExternalAccountConnected
  }

  get transactionStatusMessage (): string {
    const order = this.tOrdinal(this.transactionStep)

    return this.t('rewards.transactions.confimation', { order, total: this.transactionStepsCount })
  }

  get gradientSymbol (): string {
    return ''
  }

  get rewardsHeader (): Array<Reward> {
    if (!this.rewardsAvailable) {
      return [
        {
          amount: 0,
          symbol: 'PSWAP'
        },
        {
          amount: 0,
          symbol: 'VAL'
        }
      ]
    }

    return Object.entries(this.rewards.reduce((result, { symbol, amount }) => {
      result[symbol] = (result[symbol] || 0) + amount

      return result
    }, {}))
      .map(([symbol, amount]) => ({ symbol, amount }))
  }

  get rewardTokenSymbols (): Array<string> {
    return this.rewardsHeader.map(item => item.symbol)
  }

  get hintText (): string {
    const translationKey = [
      (!this.connectedState || this.rewardsFetching) &&
      'rewards.hint.connectAccounts',
      !this.rewardsAvailable &&
      'rewards.hint.connectAnotherAccount',
      'rewards.hint.howToClaimRewards'
    ].find(Boolean)

    return translationKey ? this.t(translationKey) : ''
  }

  get actionButtonText (): string {
    if (this.rewardsFetching) return ''

    const translationKey = [
      !this.isSoraAccountConnected &&
      'rewards.action.connectWallet',
      !this.isExternalAccountConnected &&
      'rewards.action.connectExternalWallet',
      !this.rewardsAvailable &&
      'rewards.action.checkRewards',
      this.rewardsAvailable &&
      'rewards.action.signAndClaim'
    ].find(Boolean)

    return translationKey ? this.t(translationKey) : ''
  }

  async handleAction (): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet()
    }
    if (!this.isExternalAccountConnected) {
      return await this.connectExternalAccountProcess()
    }
    if (!this.rewardsAvailable) {
      return await this.checkAccountRewards()
    }
  }

  async checkAccountRewards (): Promise<void> {
    if (this.connectedState) {
      await this.getRewards()
    }
  }

  async connectExternalAccountProcess (): Promise<void> {
    await this.connectExternalWallet()

    if (this.isExternalAccountConnected) {
      await this.checkAccountRewards()
    }
  }

  async changeExternalAccountProcess (): Promise<void> {
    this.reset()
    await this.changeExternalWallet()
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
