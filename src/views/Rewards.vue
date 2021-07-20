<template>
  <div v-loading="parentLoading" class="container rewards">
    <generic-page-header :title="t('rewards.title')" />
    <div class="rewards-content" v-loading="!parentLoading && loading">
      <gradient-box class="rewards-block" :symbol="gradientSymbol">
        <div class="rewards-box">
          <tokens-row :symbols="rewardTokenSymbols" />
          <div v-if="claimingInProgressOrFinished" class="rewards-claiming-text">
            {{ claimingStatusMessage }}
          </div>
          <div v-if="isSoraAccountConnected" class="rewards-amount">
            <rewards-amount-header :items="rewardsByAssetsList" />
            <template v-if="!claimingInProgressOrFinished">
              <rewards-amount-table
                class="rewards-table"
                v-if="internalRewards.length"
                v-model="selectedInternalRewardsModel"
                :item="internalRewards[0]"
              />
              <rewards-amount-table
                class="rewards-table"
                v-if="vestedRewards"
                v-model="selectedVestedRewardsModel"
                :item="vestedRewadsGroupItem"
              />
              <rewards-amount-table
                class="rewards-table"
                v-model="selectedExternalRewardsModel"
                :item="externalRewardsGroupItem"
                :show-table="!!externalRewards.length"
                :simple-group="true"
              >
                <div class="rewards-footer">
                  <s-divider />
                  <div v-if="isExternalAccountConnected" class="rewards-account">
                    <span>{{ formatAddress(evmAddress, 8) }}</span>
                    <span>{{ t('rewards.connected') }}</span>
                  </div>
                  <s-button v-else class="rewards-connect-button" type="tertiary" @click="connectExternalAccountProcess">
                    {{ t('rewards.action.connectExternalWallet') }}
                  </s-button>
                  <div v-if="externalRewardsHintText" class="rewards-footer-hint">{{ externalRewardsHintText }}</div>
                </div>
              </rewards-amount-table>
              <info-line v-if="fee && isSoraAccountConnected && rewardsAvailable && !claimingInProgressOrFinished" v-bind="feeInfo" class="rewards-fee" />
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
        v-if="!(rewardsRecieved || loading)"
        class="rewards-block rewards-action-button s-typography-button--large"
        type="primary"
        @click="handleAction"
        :loading="actionButtonLoading"
        :disabled="actionButtonDisabled"
      >
        {{ actionButtonText }}
      </s-button>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'
import { AccountAsset, KnownAssets, KnownSymbols, RewardInfo, RewardsInfo, CodecString, FPNumber } from '@sora-substrate/util'

import ethersUtil from '@/utils/ethers-util'
import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { hasInsufficientXorForFee } from '@/utils'
import { groupRewardsByAssetsList } from '@/utils/rewards'
import { RewardsAmountHeaderItem, RewardInfoGroup } from '@/types/rewards'

import WalletConnectMixin from '@/components/mixins/WalletConnectMixin'
import TransactionMixin from '@/components/mixins/TransactionMixin'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    GradientBox: lazyComponent(Components.GradientBox),
    TokensRow: lazyComponent(Components.TokensRow),
    RewardsAmountHeader: lazyComponent(Components.RewardsAmountHeader),
    RewardsAmountTable: lazyComponent(Components.RewardsAmountTable),
    InfoLine: lazyComponent(Components.InfoLine)
  }
})
export default class Rewards extends Mixins(WalletConnectMixin, TransactionMixin) {
  @State(state => state.rewards.fee) fee!: CodecString
  @State(state => state.rewards.feeFetching) feeFetching!: boolean
  @State(state => state.rewards.rewardsFetching) rewardsFetching!: boolean
  @State(state => state.rewards.rewardsClaiming) rewardsClaiming!: boolean
  @State(state => state.rewards.rewardsRecieved) rewardsRecieved!: boolean
  @State(state => state.rewards.transactionError) transactionError!: boolean
  @State(state => state.rewards.transactionStep) transactionStep!: number

  @State(state => state.rewards.internalRewards) internalRewards!: Array<RewardInfo>
  @State(state => state.rewards.externalRewards) externalRewards!: Array<RewardInfo>
  @State(state => state.rewards.vestedRewards) vestedRewards!: RewardsInfo | null | undefined
  @State(state => state.rewards.selectedVestedRewards) selectedVestedRewards!: RewardsInfo | null | undefined
  @State(state => state.rewards.selectedInternalRewards) selectedInternalRewards!: Array<RewardInfo>
  @State(state => state.rewards.selectedExternalRewards) selectedExternalRewards!: Array<RewardInfo>

  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset
  @Getter('rewardsAvailable', { namespace: 'rewards' }) rewardsAvailable!: boolean
  @Getter('externalRewardsAvailable', { namespace: 'rewards' }) externalRewardsAvailable!: boolean
  @Getter('rewardsByAssetsList', { namespace: 'rewards' }) rewardsByAssetsList!: Array<RewardsAmountHeaderItem>
  @Getter('transactionStepsCount', { namespace: 'rewards' }) transactionStepsCount!: number

  @Action('reset', { namespace: 'rewards' }) reset!: () => Promise<void>
  @Action('setSelectedRewards', { namespace: 'rewards' }) setSelectedRewards!: (params: any) => Promise<void>
  @Action('getRewards', { namespace: 'rewards' }) getRewards!: (address: string) => Promise<Array<RewardInfo>>
  @Action('claimRewards', { namespace: 'rewards' }) claimRewards!: (options: any) => Promise<void>

  private unwatchEthereum!: any

  destroyed (): void {
    this.reset()
  }

  async created (): Promise<void> {
    this.loading = true

    await this.withApi(async () => {
      await this.setEvmNetworkType()
      await this.syncExternalAccountWithAppState()
      await this.checkAccountRewards()

      this.unwatchEthereum = await ethersUtil.watchEthereum({
        onAccountChange: (addressList: string[]) => {
          if (addressList.length) {
            this.changeExternalAccountProcess({ address: addressList[0] })
          } else {
            this.disconnectExternalAccountProcess()
          }
        },
        onNetworkChange: (networkId: string) => {
          this.setEvmNetworkType(networkId)
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

  get externalRewardsGroupItem (): RewardInfoGroup {
    return {
      type: this.t('rewards.groups.external'),
      limit: groupRewardsByAssetsList(this.externalRewards),
      rewards: this.externalRewards
    }
  }

  get vestedRewadsGroupItem (): RewardInfoGroup {
    const rewards = this.vestedRewards?.rewards ?? []
    const pswap = KnownAssets.get(KnownSymbols.PSWAP)

    return {
      type: this.t('rewards.groups.strategic'),
      title: this.t('rewards.claimableAmountDoneVesting'),
      limit: [{
        symbol: pswap.symbol as KnownSymbols,
        amount: FPNumber.fromCodecValue(this.vestedRewards?.limit ?? 0, pswap.decimals).toLocaleString()
      }],
      total: {
        symbol: pswap.symbol as KnownSymbols,
        amount: FPNumber.fromCodecValue(this.vestedRewards?.total ?? 0, pswap.decimals).toLocaleString()
      },
      rewards
    }
  }

  get selectedInternalRewardsModel (): boolean {
    return this.selectedInternalRewards.length !== 0
  }

  set selectedInternalRewardsModel (flag: boolean) {
    const internal = flag ? this.internalRewards : []
    this.setSelectedRewards({ internal, external: this.selectedExternalRewards, vested: this.selectedVestedRewards })
  }

  get selectedExternalRewardsModel (): boolean {
    return this.selectedExternalRewards.length !== 0
  }

  set selectedExternalRewardsModel (flag: boolean) {
    const external = flag ? this.externalRewards : []
    this.setSelectedRewards({ internal: this.selectedInternalRewards, external, vested: this.selectedVestedRewards })
  }

  get selectedVestedRewardsModel (): boolean {
    return this.selectedVestedRewards !== null
  }

  set selectedVestedRewardsModel (flag: boolean) {
    const vested = flag && this.vestedRewards ? this.vestedRewards : null
    this.setSelectedRewards({ internal: this.selectedInternalRewards, external: this.selectedExternalRewards, vested })
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
    if (this.actionButtonLoading) return ''
    if (!this.isSoraAccountConnected) return this.t('rewards.action.connectWallet')
    if (this.transactionError) return this.t('rewards.action.retry')
    if (!this.rewardsAvailable) return this.t('rewards.action.checkRewards')
    if (this.isInsufficientBalance) return this.t('rewards.action.insufficientBalance', { tokenSymbol: KnownSymbols.XOR })
    if (!this.rewardsClaiming) return this.t('rewards.action.signAndClaim')
    if (this.externalRewardsAvailable && this.transactionStep === 1) return this.t('rewards.action.pendingExternal')
    if (!this.externalRewardsAvailable || this.transactionStep === 2) return this.t('rewards.action.pendingInternal')
    return ''
  }

  get actionButtonLoading (): boolean {
    return this.rewardsFetching || this.feeFetching
  }

  get actionButtonDisabled (): boolean {
    return this.rewardsClaiming || (this.rewardsAvailable && this.isInsufficientBalance)
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
    }
  }

  private async getRewardsProcess (showNotification = false): Promise<void> {
    await this.getRewards(this.evmAddress)

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
    this.disconnectExternalAccount()
    await this.checkAccountRewards()
  }

  private async changeExternalAccountProcess (options?: any): Promise<void> {
    await this.changeExternalWallet(options)
    await this.checkAccountRewards()
  }

  private async claimRewardsProcess (): Promise<void> {
    const internalAddress = this.getWalletAddress()
    const externalAddress = this.evmAddress

    if (!internalAddress) return

    if (externalAddress) {
      const isConnected = await ethersUtil.checkAccountIsConnected(externalAddress)

      if (!isConnected) return
    }

    await this.withNotifications(
      async () => await this.claimRewards({ internalAddress, externalAddress })
    )
  }
}
</script>

<style lang="scss">
.container.rewards .el-loading-mask {
  border-radius: var(--s-border-radius-small);
}
.rewards-connect-button.el-button.neumorphic {
  &, &:hover, &.focusing {
    background: transparent;
    color: var(--s-color-base-on-accent);
    border: 1px solid var(--s-color-base-on-accent);
    box-shadow: none;
  }
}
.rewards-action-button i {
  top: $inner-spacing-mini;
}
</style>

<style lang="scss" scoped>
$hint-font-size: 13px;

.rewards {
  &-block {
    & + & {
      margin-top: $inner-spacing-medium;
    }
  }

  &-content {
    position: relative;
  }

  &-box {
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    color: var(--s-color-base-on-accent); // TODO: use color variable from ui library

    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-mini;
    }
  }

  &-claiming-text {
    font-size: var(--s-heading5-font-size);
    line-height: var(--s-line-height-big);

    &--transaction {
      font-size: var(--s-font-size-mini);
      line-height: var(--s-line-height-big);
    }
  }

  &-hint {
    font-size: $hint-font-size;
    font-weight: 300;
    line-height: var(--s-line-height-base);
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
      opacity: 0.5;
      margin: 0;
    }
  }

  &-footer {
    & > *:not(:last-child) {
      margin-bottom: $inner-spacing-small;
    }

    &-hint {
      padding: 0 $inner-spacing-medium;
      font-size: $hint-font-size;
      font-weight: 300;
      line-height: var(--s-line-height-base);
      text-align: center;
    }
  }

  &-account {
    display: flex;
    flex-flow: row wrap;
    justify-content: space-between;
    font-size: var(--s-font-size-mini);
    line-height: var(--s-line-height-big);
    margin-top: $inner-spacing-small;
    padding: 0 $inner-spacing-mini / 2;
  }

  &-fee.info-line {
    color: var(--s-olor-base-on-acccent);
    margin-top: $inner-spacing-medium;
  }

  @include full-width-button('rewards-action-button');
  @include full-width-button('rewards-connect-button', 0);
}
</style>
