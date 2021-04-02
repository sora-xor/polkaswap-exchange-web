<template>
  <div class="container" v-loading="loading || parentLoading">
    <generic-page-header has-button-back :title="t('removeLiquidity.title')" :tooltip="t('removeLiquidity.description')" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
      <info-card class="slider-container" :title="t('removeLiquidity.amount')">
        <div class="slider-container__amount">
          <s-float-input
            ref="removePart"
            :class="['s-input--token-value', 's-input--remove-part', removePartCharClass]"
            :value="String(removePartInput)"
            :decimals="0"
            :max="100"
            @input="handleRemovePartChange"
            @focus="setFocusedField('removePart')"
            @blur="resetFocusedField"
          />
          <span class="percent">%</span>
        </div>
        <div>
          <s-slider :value="removePartInput" :showTooltip="false" @change="handleRemovePartChange" />
        </div>
      </info-card>
      <div class="input-container">
        <div class="input-line-header">
          <div class="input-title p4">{{ t('removeLiquidity.input') }}</div>
          <div v-if="isWalletConnected && liquidity" class="token-balance">
            <span class="token-balance-title">{{ t('createPair.balance') }}</span>
            <span class="token-balance-value">{{ getFormattedTokenBalance(liquidity) }}</span>
          </div>
        </div>
        <div class="input-line-content">
          <s-form-item>
            <s-float-input
              ref="liquidityAmount"
              class="s-input--token-value"
              :value="liquidityAmount"
              :decimals="(liquidity || {}).decimals"
              :max="getTokenMaxAmount(liquidityBalance)"
              @input="setLiquidityAmount"
              @focus="setFocusedField('liquidityAmount')"
              @blur="resetFocusedField"
            />
          </s-form-item>
          <div class="token">
            <s-button v-if="isMaxButtonAvailable" class="el-button--max" type="tertiary" size="small" border-radius="mini" @click="handleLiquidityMaxValue">
              {{ t('buttons.max') }}
            </s-button>
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <div class="liquidity-logo">
                <pair-token-logo :first-token="firstToken" :second-token="secondToken" size="mini" />
              </div>
              {{ firstToken.symbol }}-{{ secondToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>

      <s-icon class="icon-divider" name="arrows-arrow-bottom-24" />

      <div class="input-container">
        <div class="input-line-header">
          <div class="input-title p4">{{ t('removeLiquidity.output') }}</div>
          <div v-if="isWalletConnected && liquidity" class="token-balance">-</div>
        </div>
        <div class="input-line-content">
          <s-form-item>
            <s-float-input
              ref="firstTokenAmount"
              class="s-input--token-value"
              :value="firstTokenAmount"
              :decimals="(firstToken || {}).decimals"
              :max="getTokenMaxAmount(firstTokenBalance)"
              @input="handleTokenChange($event, setFirstTokenAmount)"
              @focus="setFocusedField('firstTokenAmount')"
              @blur="resetFocusedField"
            />
          </s-form-item>
          <div v-if="firstToken" class="token">
            <s-button class="el-button--choose-token" type="tertiary" size="small" border-radius="medium">
              <token-logo :token="firstToken" size="small" />
              {{ firstToken.symbol }}
            </s-button>
          </div>
        </div>
      </div>

      <s-icon class="icon-divider" name="plus-16" />

      <div class="input-container">
        <div class="input-line-header">
          <div class="input-title p4">{{ t('removeLiquidity.output') }}</div>
          <div v-if="isWalletConnected && liquidity" class="token-balance">-</div>
        </div>
        <div class="input-line-content">
          <s-form-item>
            <s-float-input
              ref="secondTokenAmount"
              class="s-input--token-value"
              :value="secondTokenAmount"
              :decimals="(secondToken || {}).decimals"
              :max="getTokenMaxAmount(secondTokenBalance)"
              @input="handleTokenChange($event, setSecondTokenAmount)"
              @focus="setFocusedField('secondTokenAmount')"
              @blur="resetFocusedField"
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

      <div v-if="price || priceReversed || fee" class="info-line-container">
        <info-line
          v-if="price || priceReversed"
          :label="t('removeLiquidity.price')"
          :value="`1 ${firstToken.symbol} = ${priceReversed}`"
          :asset-symbol="secondToken.symbol"
        />
        <info-line
          v-if="price || priceReversed"
          :value="`1 ${secondToken.symbol} = ${price}`"
          :asset-symbol="firstToken.symbol"
        />
        <info-line
          v-if="fee"
          :label="t('createPair.networkFee')"
          :value="formattedFee"
          :asset-symbol="KnownSymbols.XOR"
        />
      </div>

      <s-button type="primary" border-radius="small" :disabled="isEmptyAmount || isInsufficientBalance || isInsufficientXorForFee" @click="openConfirmDialog">
        <template v-if="isEmptyAmount">
          {{ t('buttons.enterAmount') }}
        </template>
        <template v-else-if="isInsufficientBalance">
          {{ t('exchange.insufficientBalance', { tokenSymbol: t('removeLiquidity.liquidity') }) }}
        </template>
        <template v-else-if="isInsufficientXorForFee">
          {{ t('exchange.insufficientBalance', { tokenSymbol: KnownSymbols.XOR }) }}
        </template>
        <template v-else>
          {{ t('removeLiquidity.remove') }}
        </template>
      </s-button>
    </s-form>

    <confirm-remove-liquidity :visible.sync="showConfirmDialog" :parent-loading="loading" @confirm="handleConfirmRemoveLiquidity" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch, Prop } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { FPNumber, KnownSymbols, AccountLiquidity, CodecString } from '@sora-substrate/util'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import LoadingMixin from '@/components/mixins/LoadingMixin'
import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin'

import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'
import { isMaxButtonAvailable, hasInsufficientXorForFee } from '@/utils'

const namespace = 'removeLiquidity'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    InfoCard: lazyComponent(Components.InfoCard),
    InfoLine: lazyComponent(Components.InfoLine),
    TokenLogo: lazyComponent(Components.TokenLogo),
    PairTokenLogo: lazyComponent(Components.PairTokenLogo),
    ConfirmRemoveLiquidity: lazyComponent(Components.ConfirmRemoveLiquidity)
  }
})
export default class RemoveLiquidity extends Mixins(TransactionMixin, LoadingMixin, ConfirmDialogMixin) {
  readonly KnownSymbols = KnownSymbols

  @Prop({ type: Boolean, default: false }) readonly parentLoading!: boolean

  @Getter('focusedField', { namespace }) focusedField!: null | string
  @Getter('liquidity', { namespace }) liquidity!: AccountLiquidity
  @Getter('firstToken', { namespace }) firstToken!: any
  @Getter('secondToken', { namespace }) secondToken!: any
  @Getter('removePart', { namespace }) removePart!: any
  @Getter('liquidityBalance', { namespace }) liquidityBalance!: CodecString
  @Getter('liquidityAmount', { namespace }) liquidityAmount!: any
  @Getter('firstTokenAmount', { namespace }) firstTokenAmount!: any
  @Getter('firstTokenBalance', { namespace }) firstTokenBalance!: CodecString
  @Getter('secondTokenAmount', { namespace }) secondTokenAmount!: any
  @Getter('secondTokenBalance', { namespace }) secondTokenBalance!: CodecString
  @Getter('fee', { namespace }) fee!: CodecString
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: any
  @Getter('price', { namespace: 'prices' }) price!: string
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string

  @Action('getLiquidity', { namespace }) getLiquidity
  @Action('setRemovePart', { namespace }) setRemovePart
  @Action('setLiquidityAmount', { namespace }) setLiquidityAmount
  @Action('setFirstTokenAmount', { namespace }) setFirstTokenAmount
  @Action('setSecondTokenAmount', { namespace }) setSecondTokenAmount
  @Action('setFocusedField', { namespace }) setFocusedField
  @Action('resetFocusedField', { namespace }) resetFocusedField
  @Action('removeLiquidity', { namespace }) removeLiquidity
  @Action('getAssets', { namespace: 'assets' }) getAssets
  @Action('resetData', { namespace }) resetData
  @Action('getPrices', { namespace: 'prices' }) getPrices
  @Action('resetPrices', { namespace: 'prices' }) resetPrices

  removePartInput = 0
  sliderInput: any
  sliderDragButton: any

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
    // If user don't have the liquidity (navigated through the address bar) redirect to the Pool page
    if (!this.liquidity) {
      router.push({ name: PageNames.Pool })
      return
    }
    this.updatePrices()
    this.sliderDragButton = this.$el.querySelector('.slider-container .el-slider__button')
    this.sliderInput = this.$el.querySelector('.s-input--remove-part .el-input__inner')
    if (this.sliderDragButton) {
      this.sliderDragButton.addEventListener('mousedown', this.focusSliderInput)
    }
  }

  destroyed () {
    if (this.sliderDragButton) {
      this.$el.removeEventListener('mousedown', this.sliderDragButton)
    }
  }

  isWalletConnected = true

  get firstTokenAddress (): string {
    return this.$route.params.firstAddress
  }

  get secondTokenAddress (): string {
    return this.$route.params.secondAddress
  }

  // TODO: could be reused from TokenPairMixin
  get areTokensSelected (): boolean {
    return !!this.firstToken && !!this.secondToken
  }

  get isMaxButtonAvailable (): boolean {
    return isMaxButtonAvailable(this.areTokensSelected, this.liquidity, this.liquidityAmount, this.fee, this.tokenXOR)
  }

  get isEmptyAmount (): boolean {
    return !this.removePart || !this.liquidityAmount || !this.firstTokenAmount || !this.secondTokenAmount
  }

  get isInsufficientBalance (): boolean {
    const balance = this.getFPNumberFromCodec(this.liquidityBalance)
    const firstTokenBalance = this.getFPNumberFromCodec(this.firstTokenBalance)
    const secondTokenBalance = this.getFPNumberFromCodec(this.secondTokenBalance)
    const amount = this.getFPNumber(this.liquidityAmount)
    const firstTokenAmount = this.getFPNumber(this.firstTokenAmount)
    const secondTokenAmount = this.getFPNumber(this.secondTokenAmount)
    return (
      FPNumber.gt(amount, balance) ||
      FPNumber.gt(firstTokenAmount, firstTokenBalance) ||
      FPNumber.gt(secondTokenAmount, secondTokenBalance)
    )
  }

  get isInsufficientXorForFee (): boolean {
    return hasInsufficientXorForFee(this.tokenXOR, this.fee)
  }

  get removePartCharClass (): string {
    const charClassName = ({
      3: 'three',
      2: 'two'
    })[this.removePartInput.toString().length] ?? 'one'

    return `${charClassName}-char`
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

  focusSliderInput (): void {
    this.setFocusedField('removePart')
    if (this.sliderInput) {
      this.sliderInput.focus()
    }
  }

  getFormattedTokenBalance (token: any): string {
    if (!token?.balance) {
      return ''
    }
    return this.formatCodecNumber(token.balance, token.decimals)
  }

  getTokenMaxAmount (tokenBalance: CodecString, decimals?: number): string | undefined {
    if (!tokenBalance) {
      return undefined
    }
    return this.getStringFromCodec(tokenBalance, decimals)
  }

  get formattedFee (): string {
    return this.formatCodecNumber(this.fee)
  }

  handleLiquidityMaxValue (): void {
    this.setRemovePart(100)
    this.handleRemovePartChange(100)
  }

  private updatePrices (): void {
    const firstTokenBalance = this.getFPNumberFromCodec(this.firstTokenBalance)
    const secondTokenBalance = this.getFPNumberFromCodec(this.secondTokenBalance)
    this.getPrices({
      assetAAddress: this.firstTokenAddress ?? this.firstToken.address,
      assetBAddress: this.secondTokenAddress ?? this.secondToken.address,
      amountA: firstTokenBalance.toString(),
      amountB: secondTokenBalance.toString()
    })
  }

  async handleTokenChange (value: string, setValue: (v: any) => Promise<any>): Promise<any> {
    await setValue(value)
  }

  async handleConfirmRemoveLiquidity (): Promise<void> {
    await this.handleConfirmDialog(async () => {
      await this.withNotifications(this.removeLiquidity)
      router.push({ name: PageNames.Pool })
    })
  }
}
</script>

<style lang="scss" scoped>
.icon-divider {
  padding: $inner-spacing-medium;
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
