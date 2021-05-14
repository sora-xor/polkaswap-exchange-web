<template>
  <div class="container rewards" v-loading="parentLoading">
    <generic-page-header :title="t('rewards.title')" />
    <gradient-box class="rewards-block" :symbol="gradientSymbol">
      <div class="rewards-box">
        <tokens-row :symbols="rewardTokenSymbols" />
        <div v-if="claimingInProgressOrFinished" class="rewards-claiming-text">
          {{ claimingStatusMessage }}
        </div>
        <div v-if="isSoraAccountConnected && !rewardsFetching" class="rewards-amount">
          <rewards-amount-header :items="rewardsByAssetsList" />
          <template v-if="!claimingInProgressOrFinished">
            <rewards-amount-table v-if="formattedClaimableRewards.length" :items="formattedClaimableRewards" />
            <s-divider />
            <div class="rewards-footer">
              <div v-if="isExternalAccountConnected" class="rewards-account">
                <toggle-text-button
                  type="link"
                  size="mini"
                  :primary-text="formatAddress(ethAddress, 8)"
                  :secondary-text="t('rewards.changeAccount')"
                  @click="handleWalletChange"
                />
                <span>{{ t('rewards.connected') }}</span>
              </div>
              <s-button v-else class="rewards-connect-button" type="secondary" @click="connectExternalAccountProcess" :loading="isExternalWalletConnecting">
                {{ t('rewards.action.connectExternalWallet') }}
              </s-button>
              <div v-if="externalRewardsHintText" class="rewards-footer-hint">{{ externalRewardsHintText }}</div>
            </div>
          </template>
        </div>
        <div v-if="claimingInProgressOrFinished" class="rewards-claiming-text--transaction">
          {{ transactionStatusMessage }}
        </div>
      </div>
    </gradient-box>
    <div v-if="!claimingInProgressOrFinished && hintText" class="rewards-block rewards-hint">
      {{ hintText }}
    </div>
    <s-button
      v-if="!rewardsRecieved"
      class="rewards-block rewards-action-button"
      type="primary"
      @click="handleAction"
      :loading="actionButtonLoading"
      :disabled="actionButtonDisabled"
    >
      {{ actionButtonText }}
    </s-button>
    <info-line v-if="fee && isSoraAccountConnected && rewardsAvailable && !claimingInProgressOrFinished" v-bind="feeInfo" class="rewards-block" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'
import { AccountAsset, KnownSymbols, RewardInfo, RewardingEvents, CodecString } from '@sora-substrate/util'

import web3Util from '@/utils/web3-util'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { hasInsufficientXorForFee } from '@/utils'
import { RewardsAmountTableItem } from '@/types/rewards'

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin'
import TransactionMixin from '@/components/mixins/TransactionMixin'
import NumberFormatterMixin from '@/components/mixins/NumberFormatterMixin'

const RewardsTableTitles = {
  [RewardingEvents.XorErc20]: 'XOR ERC-20',
  [RewardingEvents.SoraFarmHarvest]: 'SORA.farm harvest',
  [RewardingEvents.NtfAirdrop]: 'NFT Airdrop',
  [RewardingEvents.LiquidityProvision]: 'PSWAP STRATEGIC REWARDS for liquidity provision',
  [RewardingEvents.BuyOnBondingCurve]: 'PSWAP STRATEGIC REWARDS for buying into TBC'
}

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    ToggleTextButton: lazyComponent(Components.ToggleTextButton),
    GradientBox: lazyComponent(Components.GradientBox),
    TokensRow: lazyComponent(Components.TokensRow),
    RewardsAmountHeader: lazyComponent(Components.RewardsAmountHeader),
    RewardsAmountTable: lazyComponent(Components.RewardsAmountTable),
    InfoLine: lazyComponent(Components.InfoLine)
  }
})
export default class Rewards extends Mixins(WalletConnectMixin, TransactionMixin, NumberFormatterMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @State(state => state.rewards.fee) fee!: CodecString
  @State(state => state.rewards.feeFetching) feeFetching!: boolean
  @State(state => state.rewards.rewardsFetching) rewardsFetching!: boolean
  @State(state => state.rewards.rewardsClaiming) rewardsClaiming!: boolean
  @State(state => state.rewards.rewardsRecieved) rewardsRecieved!: boolean
  @State(state => state.rewards.transactionError) transactionError!: boolean
  @State(state => state.rewards.transactionStep) transactionStep!: number

  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset
  @Getter('rewardsAvailable', { namespace: 'rewards' }) rewardsAvailable!: boolean
  @Getter('externalRewardsAvailable', { namespace: 'rewards' }) externalRewardsAvailable!: boolean
  @Getter('claimableRewards', { namespace: 'rewards' }) claimableRewards!: Array<RewardInfo>
  @Getter('rewardsByAssetsList', { namespace: 'rewards' }) rewardsByAssetsList!: Array<RewardsAmountTableItem>
  @Getter('transactionStepsCount', { namespace: 'rewards' }) transactionStepsCount!: number

  @Action('reset', { namespace: 'rewards' }) reset!: () => void
  @Action('getRewards', { namespace: 'rewards' }) getRewards!: (address: string) => Promise<Array<RewardInfo>>
  @Action('claimRewards', { namespace: 'rewards' }) claimRewards!: (options: any) => Promise<void>
  @Action('getNetworkFee', { namespace: 'rewards' }) getNetworkFee!: () => Promise<void>

  private unwatchEthereum!: any

  created (): void {
    this.reset()
  }

  async mounted (): Promise<void> {
    await this.withApi(async () => {
      await this.setEthNetwork()
      await this.syncExternalAccountWithAppState()
      await this.checkAccountRewards()

      this.unwatchEthereum = await web3Util.watchEthereum({
        onAccountChange: (addressList: string[]) => {
          if (addressList.length) {
            this.changeExternalAccountProcess({ address: addressList[0] })
          } else {
            this.disconnectExternalAccountProcess()
          }
        },
        onNetworkChange: (networkId: string) => {
          this.setEthNetwork(networkId)
        },
        onDisconnect: () => {
          this.disconnectExternalAccountProcess()
        }
      })
    })
  }

  beforeDestroy (): void {
    if (typeof this.unwatchEthereum === 'function') {
      this.unwatchEthereum()
    }
  }

  get isInsufficientBalance (): boolean {
    return hasInsufficientXorForFee(this.tokenXOR, this.fee)
  }

  get feeInfo (): object {
    return {
      label: this.t('rewards.networkFee'),
      tooltipContent: this.t('rewards.networkFeeTooltip'),
      value: this.formatCodecNumber(this.fee),
      assetSymbol: KnownSymbols.XOR
    }
  }

  get claimingInProgressOrFinished (): boolean {
    return this.rewardsClaiming || this.transactionError || this.rewardsRecieved
  }

  get claimingStatusMessage (): string {
    return this.rewardsRecieved ? this.t('rewards.claiming.success') : this.t('rewards.claiming.pending')
  }

  get transactionStatusMessage (): string {
    if (this.rewardsRecieved) {
      return this.t('rewards.transactions.success')
    }

    const order = this.tOrdinal(this.transactionStep)
    const translationKey = this.transactionError ? 'rewards.transactions.failed' : 'rewards.transactions.confimation'

    return this.t(translationKey, { order, total: this.transactionStepsCount })
  }

  get formattedClaimableRewards (): Array<RewardsAmountTableItem> {
    return this.claimableRewards.map((item: RewardInfo) => ({
      title: RewardsTableTitles[item.type] ?? '',
      amount: this.formatCodecNumber(item.amount),
      symbol: item.asset.symbol
    }) as RewardsAmountTableItem)
  }

  get rewardTokenSymbols (): Array<KnownSymbols> {
    return this.rewardsByAssetsList.map(item => item.symbol)
  }

  get gradientSymbol (): string {
    return this.rewardTokenSymbols.length === 1 ? this.rewardTokenSymbols[0] : ''
  }

  get hintText (): string {
    if (!this.isSoraAccountConnected) return this.t('rewards.hint.connectAccounts')
    if (this.rewardsAvailable) {
      const symbols = this.rewardTokenSymbols.join(` ${this.t('rewards.andText')} `)
      const transactions = this.tc('transactionText', this.transactionStepsCount)
      const count = this.transactionStepsCount > 1
        ? this.transactionStepsCount
        : ''
      const destination = this.transactionStepsCount > 1
        ? this.t('rewards.signing.accounts')
        : this.t('rewards.signing.extension')

      return this.t('rewards.hint.howToClaimRewards', { symbols, transactions, count, destination })
    }
    return ''
  }

  get externalRewardsHintText (): string {
    if (!this.isExternalAccountConnected) return this.t('rewards.hint.connectExternalAccount')
    if (!this.externalRewardsAvailable) return this.t('rewards.hint.connectAnotherAccount')
    return ''
  }

  get actionButtonText (): string {
    if (this.rewardsFetching) return ''
    if (!this.isSoraAccountConnected) return this.t('rewards.action.connectWallet')
    if (this.transactionError) return this.t('rewards.action.retry')
    if (!this.rewardsAvailable) return this.t('rewards.action.checkRewards')
    if (this.isInsufficientBalance) return this.t('rewards.action.insufficientBalance', { tokenSymbol: KnownSymbols.XOR })
    if (!this.rewardsClaiming) return this.t('rewards.action.signAndClaim')
    if (this.externalRewardsAvailable && this.transactionStep === 1) return this.t('rewards.action.pendingExternal')
    if (!this.externalRewardsAvailable || this.transactionStep === 2) return this.t('rewards.action.pendingInternal')
    return ''
  }

  get actionButtonDisabled (): boolean {
    return this.rewardsClaiming || (this.rewardsAvailable && this.isInsufficientBalance)
  }

  get actionButtonLoading (): boolean {
    return this.rewardsFetching || this.feeFetching
  }

  async handleAction (): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet()
    }
    if (!this.rewardsAvailable) {
      return await this.checkAccountRewards(true)
    }
    if (this.rewardsAvailable) {
      return await this.claimRewardsProcess()
    }
  }

  async handleWalletChange (): Promise<void> {
    await this.changeExternalAccountProcess()
  }

  private async checkAccountRewards (showNotification = false): Promise<void> {
    if (this.isSoraAccountConnected) {
      await this.getRewardsProcess(showNotification)
      await this.getNetworkFee()
    }
  }

  private async getRewardsProcess (showNotification = false): Promise<void> {
    await this.getRewards(this.ethAddress)

    if (!this.rewardsAvailable && showNotification) {
      this.$notify({
        message: this.t('rewards.notification.empty'),
        title: ''
      })
    }
  }

  async connectExternalAccountProcess (): Promise<void> {
    await this.connectExternalWallet()
    await this.checkAccountRewards()
  }

  private async disconnectExternalAccountProcess (): Promise<void> {
    this.reset()
    this.disconnectExternalAccount()
    await this.checkAccountRewards()
  }

  private async changeExternalAccountProcess (options?: any): Promise<void> {
    this.reset()
    await this.changeExternalWallet(options)
    await this.checkAccountRewards()
  }

  private async claimRewardsProcess (): Promise<void> {
    const internalAddress = this.getWalletAddress()
    const externalAddress = this.ethAddress

    if (!internalAddress) return

    if (externalAddress) {
      const isConnected = await web3Util.checkAccountIsConnected(externalAddress)

      if (!isConnected) return
    }

    await this.withNotifications(
      async () => await this.claimRewards({ internalAddress, externalAddress })
    )
  }
}
</script>

<style lang="scss" scoped>
.rewards {
  &-block {
    & + & {
      margin-top: $inner-spacing-medium;
    }
  }

  &-box {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    color: white;

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
    font-size: var(--s-font-size-mini);
    font-weight: 300;
    line-height: $s-line-height-base;
    color: var(--s-color-base-content-primary);
    padding: 0 46px;
    text-align: center;
  }

  &-amount {
    width: 100%;

    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-mini;
    }

    & .el-divider {
      background: var(--s-color-theme-secondary-focused);
      opacity: 0.5;
      margin: 0;
    }
  }

  &-footer {
    // display: flex;
    // flex-flow: column nowrap;
    // justify-content: center;

    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-small;
    }

    &-hint {
      padding: 0 $inner-spacing-medium;
      font-size: 13px;
      font-weight: 300;
      line-height: $s-line-height-base;
      text-align: center;
    }
  }

  &-account {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
    font-size: var(--s-font-size-mini);
    line-height: $s-line-height-big;
    margin-top: $inner-spacing-medium;
    padding: 0 $inner-spacing-mini / 2;
  }

  &-action-button {
    & + & {
      margin-left: 0;
    }
  }

  &-connect-button {
    text-transform: uppercase;
    font-size: var(--s-heading5-font-size);

    &, &:hover, &:focus, &:disabled {
      background: none;
      color: white;
      border-color: white;
    }
  }

  @include full-width-button('rewards-action-button');
  @include full-width-button('rewards-connect-button');
}
</style>
