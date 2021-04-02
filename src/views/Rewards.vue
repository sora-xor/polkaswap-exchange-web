<template>
  <div class="container rewards" v-loading="parentLoading">
    <generic-page-header :title="t('rewards.title')" />
    <gradient-box class="rewards-block" :symbol="gradientSymbol">
      <div class="rewards-box">
        <tokens-row :symbols="rewardTokenSymbols" />
        <div v-if="claimingInProgressOrFinished" class="rewards-claiming-text">
          {{ claimingStatusMessage }}
        </div>
        <div v-if="areNetworksConnected && rewardsFetched" class="rewards-amount">
          <rewards-amount-header :items="rewardsByAssetsList" />
          <template v-if="!claimingInProgressOrFinished">
            <rewards-amount-table v-if="formattedClaimableRewards.length" :items="formattedClaimableRewards" />
            <div class="rewards-footer">
              <s-divider />
              <div class="rewards-account">
                <toggle-text-button
                  type="link"
                  size="mini"
                  :primary-text="formatAddress(ethAddress, 8)"
                  :secondary-text="t('rewards.changeAccount')"
                  @click="handleWalletChange"
                />
                <span>{{ t('rewards.connected') }}</span>
              </div>
            </div>
          </template>
        </div>
        <div v-if="claimingInProgressOrFinished" class="rewards-claiming-text--transaction">
          {{ transactionStatusMessage }}
        </div>
      </div>
    </gradient-box>
    <div v-if="!claimingInProgressOrFinished" class="rewards-block rewards-hint">
      {{ hintText }}
    </div>
    <s-button v-if="!rewardsRecieved" class="rewards-block rewards-action-button" type="primary" @click="handleAction" :loading="actionButtonLoading" :disabled="actionButtonDisabled">
      {{ actionButtonText }}
    </s-button>
    <info-line v-if="fee" v-bind="feeInfo" class="rewards-block" />
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
  [RewardingEvents.NtfAirdrop]: 'NFT Airdrop'
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
  @State(state => state.rewards.rewardsFetching) rewardsFetching!: boolean
  @State(state => state.rewards.rewardsClaiming) rewardsClaiming!: boolean
  @State(state => state.rewards.rewardsRecieved) rewardsRecieved!: boolean
  @State(state => state.rewards.transactionError) transactionError!: boolean
  @State(state => state.rewards.transactionStep) transactionStep!: number
  @State(state => state.rewards.transactionStepsCount) transactionStepsCount!: number

  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset
  @Getter('rewardsFetched', { namespace: 'rewards' }) rewardsFetched!: boolean
  @Getter('rewardsAvailable', { namespace: 'rewards' }) rewardsAvailable!: boolean
  @Getter('claimableRewards', { namespace: 'rewards' }) claimableRewards!: Array<RewardInfo>
  @Getter('rewardsByAssetsList', { namespace: 'rewards' }) rewardsByAssetsList!: Array<RewardsAmountTableItem>

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
    if (!this.areNetworksConnected || this.rewardsFetching) return this.t('rewards.hint.connectAccounts')
    if (!this.rewardsAvailable) return this.t('rewards.hint.connectAnotherAccount')
    return this.t('rewards.hint.howToClaimRewards')
  }

  get actionButtonText (): string {
    if (this.rewardsFetching) return ''
    if (!this.isSoraAccountConnected) return this.t('rewards.action.connectWallet')
    if (!this.isExternalAccountConnected) return this.t('rewards.action.connectExternalWallet')
    if (this.transactionError) return this.t('rewards.action.retry')
    if (!this.rewardsAvailable) return this.t('rewards.action.checkRewards')
    if (this.isInsufficientBalance) return this.t('rewards.action.insufficientBalance', { tokenSymbol: KnownSymbols.XOR })
    if (!this.rewardsClaiming) return this.t('rewards.action.signAndClaim')
    if (this.transactionStep === 1) return this.t('rewards.action.pendingExternal')
    if (this.transactionStep === 2) return this.t('rewards.action.pendingInternal')
    return ''
  }

  get actionButtonDisabled (): boolean {
    return this.rewardsClaiming || (this.rewardsAvailable && this.isInsufficientBalance)
  }

  get actionButtonLoading (): boolean {
    return this.isExternalWalletConnecting || this.rewardsFetching
  }

  async handleAction (): Promise<void> {
    if (!this.isSoraAccountConnected) {
      return this.connectInternalWallet()
    }
    if (!this.isExternalAccountConnected) {
      return await this.connectExternalAccountProcess()
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
    if (this.areNetworksConnected) {
      await Promise.all([
        this.getNetworkFee(),
        this.getRewardsProcess(showNotification)
      ])
    }
  }

  private async getRewardsProcess (showNotification = false): Promise<void> {
    const rewards = await this.getRewards(this.ethAddress)
    const areEmptyRewards = rewards.every(item => +item.amount === 0)

    if (areEmptyRewards && showNotification) {
      this.$notify({
        message: this.t('rewards.notification.empty'),
        title: ''
      })
    }
  }

  private async connectExternalAccountProcess (): Promise<void> {
    await this.connectExternalWallet()
    await this.checkAccountRewards()
  }

  private disconnectExternalAccountProcess (): void {
    this.reset()
    this.disconnectExternalAccount()
  }

  private async changeExternalAccountProcess (options?: any): Promise<void> {
    this.reset()
    await this.changeExternalWallet(options)
    await this.checkAccountRewards()
  }

  private async claimRewardsProcess (): Promise<void> {
    const internalAddress = this.getWalletAddress()
    const externalAddress = this.ethAddress
    const isConnected = await web3Util.checkAccountIsConnected(externalAddress)

    if (isConnected && internalAddress) {
      await this.withNotifications(
        async () => await this.claimRewards({ internalAddress, externalAddress })
      )
    }
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
    // padding: $inner-spacing-mini / 2; // to align with fee
  }

  &-action-button {
    & + & {
      margin-left: 0;
    }
  }

  @include full-width-button('rewards-action-button');
}
</style>
