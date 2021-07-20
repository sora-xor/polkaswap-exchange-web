<template>
  <div v-loading="loading || parentLoading" class="container container--remove-liquidity">
    <generic-page-header has-button-back :title="t('removeLiquidity.title')" :tooltip="t('removeLiquidity.description')" @back="handleBack" />
    <s-form
      class="el-form--actions"
      :show-message="false"
    >
      <s-float-input
        ref="removePart"
        size="medium"
        :class="['s-input--token-value', 's-input--remove-part', removePartCharClass]"
        :value="String(removePartInput)"
        :decimals="0"
        :max="100"
        @input="handleRemovePartChange"
        @focus="setFocusedField('removePart')"
        @blur="resetFocusedField"
      >
        <div slot="top" class="amount">{{ t('removeLiquidity.amount') }}</div>
        <div slot="right"><span class="percent">%</span></div>
        <s-slider slot="bottom" :value="removePartInput" :showTooltip="false" @change="handleRemovePartChange" />
      </s-float-input>
      <s-icon class="icon-divider" name="arrows-arrow-bottom-24" />
      <s-float-input
        ref="firstTokenAmount"
        size="medium"
        class="s-input--token-value"
        :value="firstTokenAmount"
        :decimals="(firstToken || {}).decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="getTokenMaxAmount(firstTokenBalance)"
        @input="handleTokenChange($event, setFirstTokenAmount)"
        @focus="setFocusedField('firstTokenAmount')"
        @blur="resetFocusedField"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">{{ t('removeLiquidity.output') }}</span>
          </div>
          <div v-if="liquidity" class="input-title">-</div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <token-select-button class="el-button--select-token" :token="firstToken" />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <token-address v-if="firstToken" :name="firstToken.name" :symbol="firstToken.symbol" :address="firstToken.address" class="input-title" />
        </div>
      </s-float-input>

      <s-icon class="icon-divider" name="plus-16" />

      <s-float-input
        ref="secondTokenAmount"
        size="medium"
        class="s-input--token-value"
        :value="secondTokenAmount"
        :decimals="(secondToken || {}).decimals"
        has-locale-string
        :delimiters="delimiters"
        :max="getTokenMaxAmount(secondTokenBalance)"
        @input="handleTokenChange($event, setSecondTokenAmount)"
        @focus="setFocusedField('secondTokenAmount')"
        @blur="resetFocusedField"
      >
        <div slot="top" class="input-line">
          <div class="input-title">
            <span class="input-title--uppercase input-title--primary">{{ t('removeLiquidity.output') }}</span>
          </div>
          <div v-if="liquidity" class="input-title">-</div>
        </div>
        <div slot="right" class="s-flex el-buttons">
          <token-select-button class="el-button--select-token" :token="secondToken" />
        </div>
        <div slot="bottom" class="input-line input-line--footer">
          <token-address v-if="secondToken" :name="secondToken.name" :symbol="secondToken.symbol" :address="secondToken.address" class="input-title" />
        </div>
      </s-float-input>

      <div v-if="price || priceReversed || fee || shareOfPool" class="info-line-container">
        <info-line v-if="shareOfPool" :label="t('removeLiquidity.shareOfPool')" :value="`${shareOfPool}%`" />
        <info-line
          v-if="price || priceReversed"
          :label="t('removeLiquidity.price')"
          :value="`1 ${firstToken.symbol} = ${formatStringValue(priceReversed)}`"
          :asset-symbol="secondToken.symbol"
        />
        <info-line
          v-if="price || priceReversed"
          :value="`1 ${secondToken.symbol} = ${formatStringValue(price)}`"
          :asset-symbol="firstToken.symbol"
        />
        <info-line
          v-if="fee"
          :label="t('createPair.networkFee')"
          :value="formattedFee"
          :asset-symbol="KnownSymbols.XOR"
          :tooltip-content="t('networkFeeTooltipText')"
        />
      </div>

      <s-button type="primary" class="action-button s-typography-button--large" border-radius="small" :disabled="isEmptyAmount || isInsufficientBalance || isInsufficientXorForFee" @click="openConfirmDialog">
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
      <slippage-tolerance class="slippage-tolerance-settings" />
    </s-form>

    <confirm-remove-liquidity :visible.sync="showConfirmDialog" :parent-loading="loading" @confirm="handleConfirmRemoveLiquidity" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, Getter } from 'vuex-class'
import { FPNumber, KnownSymbols, AccountLiquidity, CodecString } from '@sora-substrate/util'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin'

import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'
import { hasInsufficientXorForFee, formatAssetBalance } from '@/utils'

const namespace = 'removeLiquidity'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    InfoCard: lazyComponent(Components.InfoCard),
    InfoLine: lazyComponent(Components.InfoLine),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmRemoveLiquidity: lazyComponent(Components.ConfirmRemoveLiquidity),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress)
  }
})
export default class RemoveLiquidity extends Mixins(TransactionMixin, ConfirmDialogMixin) {
  readonly KnownSymbols = KnownSymbols
  readonly delimiters = FPNumber.DELIMITERS_CONFIG

  @Getter('focusedField', { namespace }) focusedField!: string | null | undefined
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
  @Getter('shareOfPool', { namespace }) shareOfPool!: string
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: any
  @Getter('price', { namespace: 'prices' }) price!: string
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string

  @Action('getLiquidity', { namespace }) getLiquidity
  @Action('setRemovePart', { namespace }) setRemovePart
  @Action('setFirstTokenAmount', { namespace }) setFirstTokenAmount
  @Action('setSecondTokenAmount', { namespace }) setSecondTokenAmount
  @Action('setFocusedField', { namespace }) setFocusedField
  @Action('resetFocusedField', { namespace }) resetFocusedField
  @Action('removeLiquidity', { namespace }) removeLiquidity
  @Action('getAssets', { namespace: 'assets' }) getAssets!: () => Promise<void>
  @Action('resetData', { namespace }) resetData!: () => Promise<void>
  @Action('getPrices', { namespace: 'prices' }) getPrices
  @Action('resetPrices', { namespace: 'prices' }) resetPrices!: () => Promise<void>
  @Action('getAccountLiquidity', { namespace: 'pool' }) getAccountLiquidity!: () => Promise<void>
  @Action('createAccountLiquiditySubscription', { namespace: 'pool' }) createAccountLiquiditySubscription!: () => Promise<() => void>

  removePartInput = 0
  sliderInput: any
  sliderDragButton: any
  accountLiquiditySubscription!: () => void

  async created (): Promise<void> {
    this.accountLiquiditySubscription = await this.createAccountLiquiditySubscription()

    await this.withApi(async () => {
      await Promise.all([
        this.getAssets(),
        this.getAccountLiquidity()
      ])

      await this.getLiquidity({
        firstAddress: this.firstTokenAddress,
        secondAddress: this.secondTokenAddress
      })

      // If user don't have the liquidity (navigated through the address bar) redirect to the Pool page
      if (!this.liquidity) {
        return this.handleBack()
      }

      this.updatePrices()
    })
  }

  mounted (): void {
    this.sliderDragButton = this.$el.querySelector('.slider-container .el-slider__button')
    this.sliderInput = this.$el.querySelector('.s-input--remove-part .el-input__inner')
    if (this.sliderDragButton) {
      this.sliderDragButton.addEventListener('mousedown', this.focusSliderInput)
    }
  }

  beforeDestroy (): void {
    if (this.sliderDragButton) {
      this.$el.removeEventListener('mousedown', this.sliderDragButton)
    }
    if (typeof this.accountLiquiditySubscription === 'function') {
      this.accountLiquiditySubscription() // unsubscribe
    }
    this.resetData()
    this.resetPrices()
  }

  get firstTokenAddress (): string {
    return this.$route.params.firstAddress
  }

  get secondTokenAddress (): string {
    return this.$route.params.secondAddress
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

  get formattedFee (): string {
    return this.formatCodecNumber(this.fee)
  }

  @Watch('removePart')
  removePartChange (newValue: string): void {
    this.handleRemovePartChange(newValue)
  }

  handleRemovePartChange (value: string): void {
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

  getFormattedLiquidityBalance (liquidity: any): string {
    return formatAssetBalance(liquidity, { parseAsLiquidity: true })
  }

  getTokenMaxAmount (tokenBalance: CodecString, decimals?: number): string | undefined {
    if (!tokenBalance) {
      return undefined
    }
    return this.getStringFromCodec(tokenBalance, decimals)
  }

  handleLiquidityMaxValue (): void {
    this.setRemovePart(100)
    this.handleRemovePartChange('100')
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
      this.handleBack()
    })
  }

  handleBack (): void {
    if (router.currentRoute.name === PageNames.RemoveLiquidity) {
      router.push({ name: PageNames.Pool })
    }
  }
}
</script>

<style lang="scss" scoped>
.el-form--actions {
  @include generic-input-lines;
  @include buttons;
  @include full-width-button('action-button');
}

@include vertical-divider('icon-divider', $inner-spacing-medium);

.amount {
  line-height: var(--s-line-height-big);
  font-weight: 600;
}

.percent {
  font-size: var(--s-heading1-font-size);
}
</style>

<style lang="scss">
.s-input.s-input--remove-part.s-input--token-value {
  display: inline-block;

  &.one-char .el-input__inner {
    width: 1ch;
  }
  &.two-char .el-input__inner {
    width: 2ch;
  }
  &.three-char .el-input__inner {
    width: 3ch;
  }

  .s-input__input {
    flex: 0;
  }

  .el-input__inner {
    font-size: var(--s-heading1-font-size) !important;
    line-height: var(--s-line-height-mini) !important;
    letter-spacing: var(--s-letter-spacing-mini) !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: none !important;
    height: auto !important;
    min-width: 1ch;
    max-width: 3ch;
  }

  .el-slider__runway {
    background-color: var(--s-color-base-content-tertiary);
  }
}
</style>
