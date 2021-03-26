<template>
  <div class="container rewards" v-loading="parentLoading">
    <generic-page-header :title="t('rewards.title')" />
    <gradient-box class="rewards-block" :symbol="gradientSymbol">
      <div class="rewards-box">
        <tokens-row :symbols="rewardTokenSymbols" />
        <div v-if="claimingInProgressOrFinished" class="rewards-claiming-text">
          {{ claimingStatusMessage }}
        </div>
        <div v-if="areNetworksConnected" class="rewards-amount">
          <rewards-amount-header v-if="rewardsChecked" :items="rewardsByAssetsList" />
          <template v-if="!claimingInProgressOrFinished">
            <rewards-amount-table v-if="formattedClaimableRewards.length" class="rewards-table" :items="formattedClaimableRewards" />
            <div class="rewards-footer">
              <s-divider />
              <rewards-amount-table v-if="feesTable.length" class="rewards-table" :items="feesTable" />
              <div class="rewards-account">
                <toggle-text-button
                  type="link"
                  size="mini"
                  :primary-text="formatAddress(ethAddress, 8)"
                  :secondary-text="t('rewards.changeWallet')"
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
    <s-button v-if="!rewardsRecieved" class="rewards-block rewards-action-button" type="primary" @click="handleAction" :loading="rewardsFetching" :disabled="actionButtonDisabled">
      {{ actionButtonText }}
    </s-button>
    <!-- TODO: REMOVE -->
    <s-button class="rewards-block rewards-action-button" @click="resetFaucet">
      Reset Rewards
    </s-button>
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'
import { AccountAsset, KnownSymbols, RewardInfo, RewardingEvents } from '@sora-substrate/util'
import { api } from '@soramitsu/soraneo-wallet-web'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import web3Util from '@/utils/web3-util'
import { hasInsufficientBalance } from '@/utils'

import WalletConnectMixin from '../components/mixins/WalletConnectMixin'
import TransactionMixin from '../components/mixins/TransactionMixin'
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
export default class Rewards extends Mixins(WalletConnectMixin, TransactionMixin, NumberFormatterMixin, LoadingMixin) {
  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @State(state => state.rewards.fee) fee

  @State(state => state.rewards.rewards) rewards
  @State(state => state.rewards.rewardsFetching) rewardsFetching!: boolean
  @State(state => state.rewards.rewardsClaiming) rewardsClaiming!: boolean
  @State(state => state.rewards.rewardsRecieved) rewardsRecieved!: boolean
  @State(state => state.rewards.transactionError) transactionError!: boolean
  @State(state => state.rewards.transactionStep) transactionStep!: number
  @State(state => state.rewards.transactionStepsCount) transactionStepsCount!: number

  @Getter('tokenXOR', { namespace: 'rewards' }) tokenXOR!: AccountAsset
  @Getter('rewardsAvailable', { namespace: 'rewards' }) rewardsAvailable!: boolean
  @Getter('rewardsChecked', { namespace: 'rewards' }) rewardsChecked!: boolean
  @Getter('claimableRewards', { namespace: 'rewards' }) claimableRewards!: Array<RewardInfo>
  @Getter('rewardsByAssetsList', { namespace: 'rewards' }) rewardsByAssetsList!: Array<RewardAmountSymbol>

  @Action('reset', { namespace: 'rewards' }) reset!: () => void
  @Action('getRewards', { namespace: 'rewards' }) getRewards!: (address: string) => Promise<void>
  @Action('claimRewards', { namespace: 'rewards' }) claimRewards!: (options: any) => Promise<void>
  @Action('getNetworkFee', { namespace: 'rewards' }) getNetworkFee!: () => Promise<void>

  created (): void {
    this.reset()
  }

  async mounted (): Promise<void> {
    await this.withApi(async () => {
      await this.setEthNetwork()
      await this.checkAccountRewards()

      web3Util.watchEthereum({
        onAccountChange: (addressList: string[]) => {
          if (addressList.length) {
            this.changeExternalAccountProcess({ address: addressList[0] })
          } else {
            this.disconnectExternalAccount()
          }
        },
        onNetworkChange: (networkId: string) => {
          this.setEthNetwork(networkId)
        },
        onDisconnect: (code: number, reason: string) => {
          this.disconnectExternalAccount()
        }
      })
    })
  }

  get isInsufficientBalance (): boolean {
    return hasInsufficientBalance(this.tokenXOR, 0, this.fee)
  }

  get feesTable () {
    return [
      !!this.fee && {
        title: this.t('rewards.networkFee'),
        amount: this.formatCodecNumber(this.fee),
        symbol: KnownSymbols.XOR
      }
    ].filter(Boolean)
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
    return this.findTranslationInCollection([
      (!this.areNetworksConnected || this.rewardsFetching) &&
      'rewards.hint.connectAccounts',
      !this.rewardsAvailable &&
      'rewards.hint.connectAnotherAccount',
      'rewards.hint.howToClaimRewards'
    ])
  }

  get actionButtonText (): string {
    if (this.rewardsFetching) return ''

    return this.findTranslationInCollection([
      !this.isSoraAccountConnected &&
      'rewards.action.connectWallet',
      !this.isExternalAccountConnected &&
      'rewards.action.connectExternalWallet',
      this.transactionError &&
      'rewards.action.retry',
      !this.rewardsAvailable &&
      'rewards.action.checkRewards',
      this.rewardsAvailable && this.isInsufficientBalance &&
      'rewards.action.insufficientBalance',
      this.rewardsAvailable && !this.rewardsClaiming &&
      'rewards.action.signAndClaim',
      this.transactionStep === 1 &&
      'rewards.action.pendingExternal',
      this.transactionStep === 2 &&
      'rewards.action.pendingInternal'
    ])
  }

  get actionButtonDisabled (): boolean {
    return this.rewardsClaiming || (this.rewardsAvailable && this.isInsufficientBalance)
  }

  findTranslationInCollection (collection) {
    const key = collection.find(Boolean)

    return typeof key === 'string' && this.te(key) ? this.t(key) : ''
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
    if (this.rewardsAvailable) {
      return await this.claimRewardsProcess()
    }
  }

  async handleWalletChange (): Promise<void> {
    await this.changeExternalAccountProcess()
  }

  async checkAccountRewards (): Promise<void> {
    if (this.areNetworksConnected) {
      try {
        await this.getNetworkFee()
        await this.getRewards(this.ethAddress)
      } catch (error) {
        const message = this.te(error.message) ? this.t(error.message) : error.message
        this.$notify({ message, title: '' })
      }
    }
  }

  async connectExternalAccountProcess (): Promise<void> {
    await this.connectExternalWallet()
    await this.checkAccountRewards()
  }

  async changeExternalAccountProcess (options?: any): Promise<void> {
    this.reset()
    await this.changeExternalWallet(options)
    await this.checkAccountRewards()
  }

  async claimRewardsProcess (): Promise<void> {
    const isConnected = await this.checkExternalAccountIsConnected()
    const internalAddress = this.getWalletAddress()
    const externalAddress = this.ethAddress

    if (isConnected && internalAddress) {
      await this.withNotifications(async () => {
        await this.claimRewards({ internalAddress, externalAddress })
      })
    }
  }

  async resetFaucet () {
    try {
      console.log(api.api.tx.faucet)
      const signer = api.accountPair
      await api.api.tx.faucet.resetRewards().signAndSend(signer.address)
    } catch (error) {
      console.error(error)
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
