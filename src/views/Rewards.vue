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
          <rewards-amount-header v-if="rewardsChecked" :items="rewardsByAssetsList" />
          <rewards-amount-table v-if="formattedClaimableRewards.length" class="rewards-table" :items="formattedClaimableRewards" />
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
import { KnownSymbols, RewardInfo, RewardingEvents } from '@sora-substrate/util'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'

import WalletConnectMixin from '../components/mixins/WalletConnectMixin'
import NumberFormatterMixin from '../components/mixins/NumberFormatterMixin'
import LoadingMixin from '../components/mixins/LoadingMixin'

import { RewardAmountSymbol } from '../store/rewards'

const RewardsTableTitles = {
  [RewardingEvents.XorErc20]: 'XOR ERC-20',
  [RewardingEvents.SoraFarmHarvest]: 'SORA.farm harvest',
  [RewardingEvents.NtfAirdrop]: 'NFT Airdrop'
}

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
export default class Rewards extends Mixins(WalletConnectMixin, NumberFormatterMixin, LoadingMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @State(state => state.rewards.rewards) rewards
  @State(state => state.rewards.rewardsFetching) rewardsFetching!: boolean
  @State(state => state.rewards.rewardsClaiming) rewardsClaiming!: boolean
  @State(state => state.rewards.transactionStep) transactionStep!: number
  @State(state => state.rewards.transactionStepsCount) transactionStepsCount!: number

  @Getter('rewardsAvailable', { namespace: 'rewards' }) rewardsAvailable!: boolean
  @Getter('rewardsChecked', { namespace: 'rewards' }) rewardsChecked!: boolean
  @Getter('claimableRewards', { namespace: 'rewards' }) claimableRewards!: Array<RewardInfo>
  @Getter('rewardsByAssetsList', { namespace: 'rewards' }) rewardsByAssetsList!: Array<RewardAmountSymbol>

  @Action('reset', { namespace: 'rewards' }) reset!: () => void
  @Action('getRewards', { namespace: 'rewards' }) getRewards!: (address: string) => Promise<void>

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

  get formattedClaimableRewards () {
    return this.claimableRewards.map((item: RewardInfo) => ({
      title: RewardsTableTitles[item.type] ?? '',
      amount: this.formatCodecNumber(item.amount),
      symbol: item.asset.symbol
    }))
  }

  get rewardTokenSymbols (): Array<KnownSymbols> {
    return this.rewardsByAssetsList.map(item => item.symbol)
  }

  get gradientSymbol (): string {
    return this.rewardTokenSymbols.length === 1 ? this.rewardTokenSymbols[0] : ''
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
      await this.getRewards(this.ethAddress)
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
