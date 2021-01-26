<template>
  <div class="container" v-loading="loading">
    <generic-header :title="t('removeLiquidity.title')" :tooltip="t('removeLiquidity.description')" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
      <info-card class="slider-container" :title="t('removeLiquidity.amount')">
        <div class="slider-container__amount">
          <s-input
            v-float
            :class="`s-input--token-value s-input--remove-part ${
              removePartInput.toString().length === 3
              ? 'three-char'
              : removePartInput.toString().length === 2
              ? 'two-char'
              : 'one-char'
            }`"
            maxlength="3"
            :value="removePartInput"
            @input="handleRemovePartChange"
            @blur="handleInputBlur('removePart')"
          />
          <span class="percent">%</span>
        </div>
        <div>
          <s-slider :value="removePartInput" :showTooltip="false" @change="handleRemovePartChange" />
        </div>
      </info-card>
      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('removeLiquidity.input') }}</div>
          <div v-if="isWalletConnected && liquidity" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ getTokenBalance(liquidity) }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              v-float
              class="s-input--token-value"
              :value="liquidityAmount"
              :placeholder="inputPlaceholder"
              @input="handleLiquidityAmountChange"
              @blur="handleInputBlur('input')"
            />
          </s-form-item>
          <div class="token">
            <s-button v-if="isWalletConnected && liquidityAmount !== liquidityBalance" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleLiquidityMaxValue">
              {{ t('exchange.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <div class="liquidity-logo">
                <pair-token-logo :first-token="firstToken" :second-token="secondToken" size="mini" />
              </div>
              {{ getAssetSymbol(firstToken.symbol) }}-{{ getAssetSymbol(secondToken.symbol) }}
            </s-button>
          </div>
        </div>
      </div>

      <s-icon class="icon-divider" name="arrow-bottom" size="medium" />

      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('removeLiquidity.output') }}</div>
          <div v-if="isWalletConnected && firstToken" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ firstTokenBalance }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              v-float
              class="s-input--token-value"
              :value="firstTokenAmount"
              :placeholder="inputPlaceholder"
              @input="handleFirstTokenAmountChange"
              @blur="handleInputBlur('firstTokenAmount')"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <token-logo :token="firstToken" size="small" />
              {{ getAssetSymbol(firstToken.symbol) }}
            </s-button>
          </div>
        </div>
      </div>

      <s-icon class="icon-divider" name="plus-rounded" size="medium" />

      <div class="input-container">
        <div class="input-line">
          <div class="input-title">{{ t('removeLiquidity.output') }}</div>
          <div v-if="isWalletConnected && secondToken" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ secondTokenBalance }}</span>
          </div>
        </div>
        <div class="input-line">
          <s-form-item>
            <s-input
              v-float
              class="s-input--token-value"
              :value="secondTokenAmount"
              :placeholder="inputPlaceholder"
              @input="handleSecondTokenAmountChange"
              @blur="handleInputBlur('secondTokenAmount')"
            />
          </s-form-item>
          <div v-if="secondToken" class="token">
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <token-logo :token="secondToken" size="small" />
              {{ secondToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>

      <div v-if="price || priceReversed || fee" class="price-container">
        <s-row v-if="price || priceReversed" flex justify="space-between">
          <div>{{ t('removeLiquidity.price') }}</div>
          <div class="price">
            <div>1 {{ getAssetSymbol(firstToken.symbol) }} = {{ price }} {{ getAssetSymbol(secondToken.symbol) }}</div>
            <div>1 {{ getAssetSymbol(secondToken.symbol) }} = {{ priceReversed }} {{ getAssetSymbol(firstToken.symbol) }}</div>
          </div>
        </s-row>
        <s-row v-if="fee" flex justify="space-between">
          <!-- TODO: Add tooltip here -->
          <div>{{ t('createPair.networkFee') }}</div>
          <div>{{ fee }} XOR</div>
        </s-row>
      </div>

      <s-button type="primary" border-radius="small" :disabled="isEmptyAmount || isInsufficientBalance" @click="showConfirmDialog = true">
        <template v-if="isEmptyAmount">
          {{ t('exchange.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('exchange.insufficientBalance', { tokenSymbol: insufficientBalanceTokenSymbol }) }}
        </template>
        <template v-else>
          {{ t('removeLiquidity.remove') }}
        </template>
      </s-button>
    </s-form>

    <confirm-remove-liquidity :visible.sync="showConfirmDialog" @confirm="handleConfirmRemoveLiquidity" />
    <result-dialog :visible.sync="isRemoveLiquidityConfirmed" :type="t('removeLiquidity.remove')" :message="resultMessage" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'

import TranslationMixin from '@/components/mixins/TranslationMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import InputFormatterMixin from '@/components/mixins/InputFormatterMixin'

import { lazyComponent } from '@/router'
import { Components } from '@/consts'
import { formatNumber, isNumberValue, getAssetSymbol } from '@/utils'
import { KnownSymbols, FPNumber } from '@sora-substrate/util'

const namespace = 'removeLiquidity'

@Component({
  components: {
    GenericHeader: lazyComponent(Components.GenericHeader),
    InfoCard: lazyComponent(Components.InfoCard),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ConfirmRemoveLiquidity: lazyComponent(Components.ConfirmRemoveLiquidity),
    ResultDialog: lazyComponent(Components.ResultDialog)
  }
})
export default class RemoveLiquidity extends Mixins(TranslationMixin, LoadingMixin, InputFormatterMixin) {
  @Getter('liquidity', { namespace }) liquidity!: any
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('removePart', { namespace }) removePart!: any
  @Getter('liquidityBalance', { namespace }) liquidityBalance!: any
  @Getter('liquidityAmount', { namespace }) liquidityAmount!: any
  @Getter('firstTokenAmount', { namespace }) firstTokenAmount!: any
  @Getter('firstTokenBalance', { namespace }) firstTokenBalance!: any
  @Getter('secondTokenAmount', { namespace }) secondTokenAmount!: any
  @Getter('secondTokenBalance', { namespace }) secondTokenBalance!: any
  @Getter('fee', { namespace }) fee!: any
  @Getter('xorBalance', { namespace: 'assets' }) xorBalance!: any
  @Getter('xorAsset', { namespace: 'assets' }) xorAsset!: any
  @Getter('price', { namespace: 'prices' }) price!: string | number
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string | number

  @Action('getLiquidity', { namespace }) getLiquidity
  @Action('setRemovePart', { namespace }) setRemovePart
  @Action('setLiquidityAmount', { namespace }) setLiquidityAmount
  @Action('setFirstTokenAmount', { namespace }) setFirstTokenAmount
  @Action('setSecondTokenAmount', { namespace }) setSecondTokenAmount
  @Action('resetFocusedField', { namespace }) resetFocusedField
  @Action('removeLiquidity', { namespace }) removeLiquidity
  @Action('getAssets', { namespace: 'assets' }) getAssets
  @Action('resetData', { namespace }) resetData
  @Action('getPrices', { namespace: 'prices' }) getPrices
  @Action('resetPrices', { namespace: 'prices' }) resetPrices

  removePartInput = 0

  getAssetSymbol = getAssetSymbol

  async mounted () {
    this.resetData()
    this.resetPrices()
    await this.withApi(async () => {
      await this.getAssets()
      await this.getLiquidity({
        firstAddress: this.firstTokenAddress,
        secondAddress: this.secondTokenAddress
      })
    })
  }

  isWalletConnected = true
  inputPlaceholder: string = formatNumber(0, 1);
  insufficientBalanceTokenSymbol = ''
  showConfirmDialog = false
  isRemoveLiquidityConfirmed = false

  get firstTokenAddress (): string {
    return this.$route.params.firstAddress
  }

  get secondTokenAddress (): string {
    return this.$route.params.secondAddress
  }

  get areTokensSelected (): boolean {
    return !!this.firstToken && !!this.secondToken
  }

  get isEmptyAmount (): boolean {
    return !this.removePart || !this.liquidityAmount || !this.firstTokenAmount || !this.secondTokenAmount
  }

  get isInsufficientBalance (): boolean {
    // TODO: Play with other variants
    this.insufficientBalanceTokenSymbol = KnownSymbols.XOR
    return (
      this.liquidityAmount > this.liquidityBalance ||
      this.firstTokenAmount > this.firstTokenBalance ||
      this.secondTokenAmount > this.secondTokenBalance
    )
  }

  get isInsufficientXorBalance (): boolean {
    if (this.areTokensSelected) {
      const xorValue = new FPNumber(this.fee, this.xorAsset.decimals)
      const xorBalance = new FPNumber(this.xorBalance, this.xorAsset.decimals)

      return FPNumber.gt(xorValue, xorBalance)
    }

    return true
  }

  get resultMessage (): string {
    return this.t('exchange.transactionMessage', {
      firstToken: this.getTokenValue(this.firstToken, this.firstTokenAmount),
      secondToken: this.getTokenValue(this.secondToken, this.secondTokenAmount)
    })
  }

  @Watch('removePart')
  removePartChange (newValue): void {
    this.handleRemovePartChange(newValue)
  }

  handleRemovePartChange (value): void {
    const newValue = parseFloat(value) || 0
    this.removePartInput = newValue > 100 ? 100 : newValue < 0 ? 0 : newValue

    this.setRemovePart(this.removePartInput)
  }

  getTokenValue (token: any, tokenValue: number): string {
    return token ? `${tokenValue} ${token.symbol}` : ''
  }

  getTokenBalance (token: any): string {
    return token ? token.balance : ''
  }

  handleLiquidityMaxValue (): void {
    this.setRemovePart(100)
    this.handleRemovePartChange(100)
  }

  updatePrices (): void {
    this.getPrices({
      assetAAddress: this.firstTokenAddress ? this.firstTokenAddress : this.firstToken.address,
      assetBAddress: this.secondTokenAddress ? this.secondTokenAddress : this.secondToken.address,
      amountA: this.firstTokenAmount,
      amountB: this.secondTokenAmount
    })
  }

  async handleLiquidityAmountChange (): Promise<any> {
    // const liquidityAmount = this.formatNumberField(this.liquidityAmount)
    // if (!isNumberValue(liquidityAmount)) {
    //   await this.promiseTimeout()
    //   this.resetInputField('input')
    //   return
    // }
    this.setLiquidityAmount(this.liquidityAmount)
  }

  async handleFirstTokenAmountChange (): Promise<any> {
    // const firstTokenAmount = this.formatNumberField(this.firstTokenAmount)
    // if (!isNumberValue(firstTokenAmount)) {
    //   await this.promiseTimeout()
    //   this.resetInputField('firstTokenAmount')
    //   return
    // }
    this.setFirstTokenAmount(this.firstTokenAmount)
    this.updatePrices()
  }

  async handleSecondTokenAmountChange (): Promise<any> {
    // const secondTokenAmount = this.formatNumberField(this.secondTokenAmount)
    // if (!isNumberValue(secondTokenAmount)) {
    //   await this.promiseTimeout()
    //   this.resetInputField('secondTokenAmount')
    //   return
    // }
    this.setSecondTokenAmount(this.secondTokenAmount)
    this.updatePrices()
  }

  resetInputField (field: string): void {
    switch (field) {
      case 'removePart': {
        this.setRemovePart(0)
        break
      }
      case 'liquidityAmount': {
        this.setLiquidityAmount(0)
        break
      }
      case 'firstTokenAmount': {
        this.setFirstTokenAmount(0)
        break
      }
      case 'secondTokenAmount': {
        this.setSecondTokenAmount(0)
      }
    }
  }

  handleInputBlur (field: string): void {
    switch (field) {
      case 'removePart': {
        if (+this.removePartInput === 0) {
          this.resetInputField('removePart')
        } else {
          this.setRemovePart(+this.trimNeedlesSymbols(this.removePartInput.toString()))
        }
        break
      }
      case 'liquidityAmount': {
        if (+this.liquidityAmount === 0) {
          this.resetInputField('liquidityAmount')
        } else {
          this.setLiquidityAmount(this.trimNeedlesSymbols(this.liquidityAmount))
        }
        break
      }
      case 'firstTokenAmount': {
        if (+this.firstTokenAmount === 0) {
          this.resetInputField('firstTokenAmount')
        } else {
          this.setFirstTokenAmount(this.trimNeedlesSymbols(this.firstTokenAmount))
        }
        break
      }
      case 'secondTokenAmount': {
        if (+this.secondTokenAmount === 0) {
          this.resetInputField('secondTokenAmount')
        } else {
          this.setSecondTokenAmount(this.trimNeedlesSymbols(this.secondTokenAmount))
        }
        break
      }
    }
    this.resetFocusedField()
  }

  async handleConfirmRemoveLiquidity (): Promise<void> {
    try {
      await this.removeLiquidity()
      this.showConfirmDialog = false
      this.isRemoveLiquidityConfirmed = true
    } catch (error) {
      console.error(error)
      this.$alert(this.t(error.message), { title: this.t('errorText') })
    }
  }
}
</script>

<style lang="scss" scoped>
.container {
  @include container-styles;
}

.icon-divider {
  padding: $inner-spacing-medium;
}

.price-container {
  width: 100%;
  .s-row {
    margin: $inner-spacing-medium $inner-spacing-medium 0;
    color: var(--s-color-base-content-secondary);
    line-height: $s-line-height-big;
    font-feature-settings: $s-font-feature-settings-common;
  }
}
.price {
  text-align: right;
}

.el-form--actions {
  .slider-container {
    width: 100%;

    &__amount {
      font-size: var(--s-heading1-font-size);
      line-height: $s-line-height-mini;
      letter-spacing: $s-letter-spacing-mini;
    }
    .percent {
      color: var(--s-color-base-content-secondary)
    }
  }
  @include input-form-styles;
  @include buttons(true);
  @include full-width-button;
}

@include vertical-divider;
</style>

<style lang="scss">
.s-input--remove-part {
  display: inline-block;

  &.one-char {
    width: 1ch;
  }
  &.two-char {
    width: 2ch;
  }
  &.three-char {
    width: 3ch;
  }

  .el-input__inner {
    font-size: var(--s-heading1-font-size) !important;
    line-height: $s-line-height-mini !important;
    letter-spacing: $s-letter-spacing-mini !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: none !important;
    height: auto !important;
  }
}
</style>
