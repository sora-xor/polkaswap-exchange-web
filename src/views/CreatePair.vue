<template>
  <div class="container" v-loading="parentLoading">
    <generic-header :title="t('createPair.title')" :tooltip="t('pool.description')" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('createPair.deposit') }}</div>
          <div v-if="connected && firstToken" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(firstToken) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              :value="firstTokenValue"
              v-float
              class="s-input--token-value"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="setFirstTokenValue"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <!-- TODO 4 alexnatalia, stefashkaa: Add mini size here -->
            <s-button v-if="connected" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleFirstMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <token-logo :token="firstToken" size="small" />
              {{ firstToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>
      <s-icon class="icon-divider" name="plus-rounded" size="medium" />
      <div class="input-container">
        <div class="input-line">
          <div class="input-title">
            <span>{{ t('createPair.deposit') }}</span>
          </div>
          <div v-if="connected && secondToken" class="token-balance">
            <span class="token-balance-title">{{ t('exchange.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(secondToken) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              :value="secondTokenValue"
              v-float
              class="s-input--token-value"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="setSecondTokenValue"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <!-- TODO 4 alexnatalia, stefashkaa: Add mini size here -->
            <s-button v-if="connected" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleSecondMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectSecondTokenDialog">
              <token-logo :token="secondToken" size="small" />
              {{ secondToken.symbol }}
            </s-button>
          </div>
          <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectSecondTokenDialog">
            {{t('swap.chooseToken')}}
          </s-button>
        </div>
      </div>
        <s-button type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="handleConfirmCreatePair">
        <template v-if="!areTokensSelected">
          {{ t('swap.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('createPair.unsuitableAssets') }}
        </template>
        <template v-else-if="isEmptyBalance">
          {{ t('swap.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('createPair.insufficientBalance') }}
        </template>
        <template v-else>
          {{ t('createPair.supply') }}
        </template>
      </s-button>
    </s-form>

    <info-card v-if="areTokensSelected && isAvailable" class="card--first-liquidity" :title="t('createPair.firstLiquidityProvider')">
      <div class="card__data">
        <p v-html="t('createPair.firstLiquidityProviderInfo')" />
      </div>
    </info-card>

    <info-card v-if="areTokensSelected && isAvailable">
      <div class="card__data">
        <div>{{ t('createPair.networkFee') }}</div>
        <div>{{ fee }} {{ KnownSymbols.XOR }}</div>
      </div>
    </info-card>

    <select-token :visible.sync="showSelectFirstTokenDialog" accountAssetsOnly notNullBalanceOnly :asset="secondToken" @select="setFirstToken" />
    <select-token :visible.sync="showSelectSecondTokenDialog" accountAssetsOnly notNullBalanceOnly :asset="firstToken" @select="setSecondToken" />

    <confirm-create-pair :visible.sync="showConfirmCreatePairDialog" @confirm="confirmCreatePair" />
    <result-dialog :visible.sync="isCreatePairConfirmed" :type="t('createPair.add')" :message="resultMessage" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { KnownAssets, KnownSymbols, FPNumber } from '@sora-substrate/util'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import router, { lazyComponent } from '@/router'
import { formatNumber, isWalletConnected } from '@/utils'
import { Components, PageNames } from '@/consts'

const namespace = 'createPair'

@Component({
  components: {
    GenericHeader: lazyComponent(Components.GenericHeader),
    SelectToken: lazyComponent(Components.SelectToken),
    InfoCard: lazyComponent(Components.InfoCard),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ConfirmCreatePair: lazyComponent(Components.ConfirmCreatePair),
    ResultDialog: lazyComponent(Components.ResultDialog)
  }
})

export default class CreatePair extends Mixins(TransactionMixin, LoadingMixin) {
  readonly KnownSymbols = KnownSymbols

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number
  @Getter('isAvailable', { namespace }) isAvailable!: boolean
  @Getter('minted', { namespace }) minted!: string
  @Getter('fee', { namespace }) fee!: string

  @Action('setFirstToken', { namespace }) setFirstToken
  @Action('setSecondToken', { namespace }) setSecondToken
  @Action('setFirstTokenValue', { namespace }) setFirstTokenValue
  @Action('setSecondTokenValue', { namespace }) setSecondTokenValue
  @Action('createPair', { namespace }) createPair
  @Action('resetData', { namespace }) resetData
  @Action('getAccountAssets', { namespace: 'assets' }) getAccountAssets

  showSelectFirstTokenDialog = false
  showSelectSecondTokenDialog = false
  inputPlaceholder: string = formatNumber(0, 1)
  showConfirmCreatePairDialog = false
  isCreatePairConfirmed = false

  formatNumber = formatNumber

  async mounted () {
    await this.withApi(async () => {
      await this.getAccountAssets()
      await this.setFirstToken(KnownAssets.get(KnownSymbols.XOR))
    })
  }

  get connected (): boolean {
    return isWalletConnected()
  }

  get areTokensSelected (): boolean {
    return this.firstToken && this.secondToken
  }

  get isEmptyBalance (): boolean {
    return +this.firstTokenValue === 0 || +this.secondTokenValue === 0
  }

  get isInsufficientBalance (): boolean {
    if (this.areTokensSelected) {
      let firstValue = new FPNumber(this.firstTokenValue, this.firstToken.decimals)
      const firstBalance = new FPNumber(this.firstToken.balance, this.firstToken.decimals)
      let secondValue = new FPNumber(this.secondTokenValue, this.secondToken.decimals)
      const secondBalance = new FPNumber(this.secondToken.balance, this.secondToken.decimals)

      if (this.firstToken.symbol === KnownSymbols.XOR) {
        firstValue = firstValue.add(new FPNumber(this.fee, this.firstToken.decimals))
      } else {
        secondValue = secondValue.add(new FPNumber(this.fee, this.secondToken.decimals))
      }

      return FPNumber.gt(firstValue, firstBalance) || FPNumber.gt(secondValue, secondBalance)
    }

    return true
  }

  get resultMessage (): string {
    return this.t('createPair.transactionMessage', {
      firstToken: this.getTokenValue(this.firstToken, this.firstTokenValue),
      secondToken: this.getTokenValue(this.secondToken, this.secondTokenValue)
    })
  }

  getTokenValue (token: any, tokenValue: number): string {
    return token ? `${tokenValue} ${token.symbol}` : ''
  }

  openSelectFirstTokenDialog (): void {
    this.showSelectFirstTokenDialog = true
  }

  openSelectSecondTokenDialog (): void {
    this.showSelectSecondTokenDialog = true
  }

  handleFirstMaxValue (): void {
    this.setFirstTokenValue(this.firstToken.balance)
  }

  handleSecondMaxValue (): void {
    this.setSecondTokenValue(this.secondToken.balance)
  }

  getTokenBalance (token: any): string {
    return token ? token.balance : ''
  }

  handleConfirmCreatePair () {
    this.showConfirmCreatePairDialog = true
  }

  async confirmCreatePair (isCreatePairConfirmed: boolean) {
    try {
      await this.withNotifications(this.createPair)
      router.push({ name: PageNames.Pool })
    } catch (error) {
      console.error(error)
    }

    this.isCreatePairConfirmed = isCreatePairConfirmed
  }
}
</script>

<style lang="scss" scoped>
.container {
  .card--first-liquidity {
    margin-top: $inner-spacing-medium;
    font-feature-settings: $s-font-feature-settings-common;
    .card__data {
      margin-top: $inner-spacing-mini / 2;
      font-size: var(--s-font-size-mini);
    }
  }
}

.el-form--actions {
  @include input-form-styles;
  @include buttons;
  @include full-width-button;
}

@include vertical-divider;
@include vertical-divider('el-divider');
</style>
