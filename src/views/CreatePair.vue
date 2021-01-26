<template>
  <div class="container">
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
              v-model="createPairModel.firstTokenValue"
              v-float
              class="s-input--token-value"
              :value="firstTokenValue"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="handleFirstTokenChange"
              @blur="handleInputBlur(true)"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <!-- TODO 4 alexnatalia, stefashkaa: Add mini size here -->
            <s-button v-if="connected && createPairModel.firstTokenValue !== firstToken.balance" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleFirstMaxValue">
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
              v-model="createPairModel.secondTokenValue"
              v-float
              class="s-input--token-value"
              :value="secondTokenValue"
              :placeholder="inputPlaceholder"
              :disabled="!areTokensSelected"
              @change="handleSecondTokeChange"
              @blur="handleInputBlur(false)"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <!-- TODO 4 alexnatalia, stefashkaa: Add mini size here -->
            <s-button v-if="connected && createPairModel.secondTokenValue !== secondToken.balance" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleSecondMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectSecondTokenDialog">
              <token-logo :token="secondToken" size="small" />
              {{ secondToken.symbol }}
            </s-button>
          </div>
          <s-button v-else class="el-button--empty-token" type="tertiary" size="small" border-radius="mini" icon="chevron-bottom-rounded" icon-position="right" @click="openSelectSecondTokenDialog">
            {{ t('exchange.chooseToken') }}
          </s-button>
        </div>
      </div>
        <s-button type="primary" :disabled="!areTokensSelected || isEmptyBalance || isInsufficientBalance || !isAvailable" @click="handleConfirmCreatePair">
        <template v-if="!areTokensSelected">
          {{ t('exchange.chooseTokens') }}
        </template>
        <template v-else-if="!isAvailable">
          {{ t('createPair.unsuitableAssets') }}
        </template>
        <template v-else-if="isEmptyBalance">
          {{ t('exchange.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('exchange.insufficientBalance') }}
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

    <!-- TODO: Add all missed blocks here (we can create special components for Prices and Position and use it in all needed components) -->
    <info-card v-if="areTokensSelected && isAvailable">
      <div class="card__data">
        <div>{{ t('createPair.networkFee') }}</div>
        <div>{{ fee }} XOR</div>
      </div>
    </info-card>

    <select-token :visible.sync="showSelectFirstTokenDialog" accountAssetsOnly notNullBalanceOnly :asset="secondToken" @select="setFirstToken" />
    <select-token :visible.sync="showSelectSecondTokenDialog" accountAssetsOnly notNullBalanceOnly :asset="firstToken" @select="setSecondToken" />

    <confirm-create-pair :visible.sync="showConfirmCreatePairDialog" @confirm="confirmCreatePair" />
    <result-dialog :visible.sync="isCreatePairConfirmed" :type="t('createPair.add')" :message="resultMessage" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import InputFormatterMixin from '@/components/mixins/InputFormatterMixin'
import { lazyComponent } from '@/router'
import { formatNumber, isNumberValue, isWalletConnected } from '@/utils'
import { Components } from '@/consts'
import { KnownAssets, KnownSymbols, FPNumber } from '@sora-substrate/util'

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

export default class CreatePair extends Mixins(TranslationMixin, LoadingMixin, InputFormatterMixin) {
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('firstTokenValue', { namespace }) firstTokenValue!: number
  @Getter('secondTokenValue', { namespace }) secondTokenValue!: number
  @Getter('isAvailable', { namespace }) isAvailable!: boolean
  @Getter('minted', { namespace }) minted!: string
  @Getter('fee', { namespace }) fee!: string
  @Getter('price', { namespace: 'prices' }) price!: string | number
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string | number

  @Action('setFirstToken', { namespace }) setFirstToken
  @Action('setSecondToken', { namespace }) setSecondToken
  @Action('setFirstTokenValue', { namespace }) setFirstTokenValue
  @Action('setSecondTokenValue', { namespace }) setSecondTokenValue
  @Action('createPair', { namespace }) createPair
  @Action('resetData', { namespace }) resetData
  @Action('getAccountAssets', { namespace: 'assets' }) getAccountAssets
  @Action('getPrices', { namespace: 'prices' }) getPrices
  @Action('resetPrices', { namespace: 'prices' }) resetPrices

  showSelectFirstTokenDialog = false
  showSelectSecondTokenDialog = false
  inputPlaceholder: string = formatNumber(0, 1);
  showConfirmCreatePairDialog = false
  isCreatePairConfirmed = false

  createPairModel = {
    firstTokenValue: '',
    secondTokenValue: ''
  }

  async mounted () {
    await this.withApi(async () => {
      this.resetPrices()
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
    return this.t('exchange.transactionMessage', {
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
    this.createPairModel.firstTokenValue = this.firstToken.balance
  }

  handleSecondMaxValue (): void {
    this.createPairModel.secondTokenValue = this.secondToken.balance
  }

  updatePrices (): void {
    this.getPrices({
      assetAAddress: this.firstToken.address,
      assetBAddress: this.secondToken.address,
      amountA: this.firstTokenValue,
      amountB: this.secondTokenValue
    })
  }

  async handleFirstTokenChange (): Promise<any> {
    this.createPairModel.firstTokenValue = this.formatNumberField(this.createPairModel.firstTokenValue)
    if (!isNumberValue(this.createPairModel.firstTokenValue)) {
      await this.promiseTimeout()
      this.resetInputField()
      return
    }
    this.setFirstTokenValue(this.createPairModel.firstTokenValue)
    this.updatePrices()
  }

  async handleSecondTokeChange (): Promise<any> {
    this.createPairModel.secondTokenValue = this.formatNumberField(this.createPairModel.secondTokenValue)
    if (!isNumberValue(this.createPairModel.secondTokenValue)) {
      await this.promiseTimeout()
      this.resetInputField(false)
      return
    }
    this.setSecondTokenValue(this.createPairModel.secondTokenValue)
    this.updatePrices()
  }

  resetInputField (isFirstTokenField = true): void {
    if (isFirstTokenField) {
      this.createPairModel.firstTokenValue = ''
      return
    }
    this.createPairModel.secondTokenValue = ''
  }

  handleInputBlur (isFirstToken: boolean): void {
    if (isFirstToken) {
      if (+this.createPairModel.firstTokenValue === 0) {
        this.resetInputField()
      } else {
        this.createPairModel.firstTokenValue = this.trimNeedlesSymbols(this.createPairModel.firstTokenValue)
      }
    } else {
      if (+this.createPairModel.secondTokenValue === 0) {
        this.resetInputField(false)
      } else {
        this.createPairModel.secondTokenValue = this.trimNeedlesSymbols(this.createPairModel.secondTokenValue)
      }
    }
  }

  getTokenBalance (token: any): string {
    return token ? token.balance : ''
  }

  handleConfirmCreatePair () {
    this.showConfirmCreatePairDialog = true
  }

  async confirmCreatePair (isCreatePairConfirmed: boolean) {
    try {
      await this.createPair()
    } catch (error) {
      console.error(error)
    }

    this.isCreatePairConfirmed = isCreatePairConfirmed
  }

  submitCreatePair (message: string): void {
    this.$notify({
      message: message,
      title: this.t('pool.createPair'),
      type: 'success'
    })
  }
}
</script>

<style lang="scss" scoped>
.container {
  @include container-styles;
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
