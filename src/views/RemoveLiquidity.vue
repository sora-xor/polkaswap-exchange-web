<template>
  <div v-loading="parentLoading" class="container container--remove-liquidity">
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
        <s-slider slot="bottom" class="slider-container" :value="removePartInput" :showTooltip="false" @change="handleRemovePartChange" />
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
          <token-address v-if="firstToken" :name="firstToken.name" :symbol="firstToken.symbol" :address="firstToken.address" class="input-value" />
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
          <token-address v-if="secondToken" :name="secondToken.name" :symbol="secondToken.symbol" :address="secondToken.address" class="input-value" />
        </div>
      </s-float-input>

      <div v-if="price || priceReversed || networkFee || shareOfPool" class="info-line-container">
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
          v-if="networkFee"
          :label="t('createPair.networkFee')"
          :label-tooltip="t('networkFeeTooltipText')"
          :value="formattedFee"
          :asset-symbol="KnownSymbols.XOR"
          :fiat-value="getFiatAmountByCodecString(networkFee)"
          is-formatted
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

    <confirm-remove-liquidity :visible.sync="showConfirmDialog" :parent-loading="parentLoading" @confirm="handleConfirmRemoveLiquidity" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator'
import { Action, Getter, State } from 'vuex-class'
import { FPNumber, KnownSymbols, AccountLiquidity, CodecString, Operation, NetworkFeesObject, Asset, AccountAsset } from '@sora-substrate/util'
import { components, mixins } from '@soramitsu/soraneo-wallet-web'

import TransactionMixin from '@/components/mixins/TransactionMixin'
import ConfirmDialogMixin from '@/components/mixins/ConfirmDialogMixin'

import router, { lazyComponent } from '@/router'
import { Components, PageNames } from '@/consts'
import { hasInsufficientXorForFee } from '@/utils'

const namespace = 'removeLiquidity'

@Component({
  components: {
    GenericPageHeader: lazyComponent(Components.GenericPageHeader),
    TokenLogo: lazyComponent(Components.TokenLogo),
    SlippageTolerance: lazyComponent(Components.SlippageTolerance),
    ConfirmRemoveLiquidity: lazyComponent(Components.ConfirmRemoveLiquidity),
    TokenSelectButton: lazyComponent(Components.TokenSelectButton),
    TokenAddress: lazyComponent(Components.TokenAddress),
    InfoLine: components.InfoLine
  }
})
export default class RemoveLiquidity extends Mixins(mixins.FormattedAmountMixin, TransactionMixin, ConfirmDialogMixin) {
  readonly KnownSymbols = KnownSymbols
  readonly delimiters = FPNumber.DELIMITERS_CONFIG

  @Getter networkFees!: NetworkFeesObject

  @State(state => state[namespace].liquidityAmount) liquidityAmount!: string
  @State(state => state[namespace].firstTokenAmount) firstTokenAmount!: string
  @State(state => state[namespace].secondTokenAmount) secondTokenAmount!: string
  @State(state => state[namespace].removePart) removePart!: number
  @State(state => state[namespace].focusedField) focusedField!: string

  @Getter('liquidity', { namespace }) liquidity!: AccountLiquidity
  @Getter('firstToken', { namespace }) firstToken!: Asset
  @Getter('secondToken', { namespace }) secondToken!: Asset
  @Getter('liquidityBalance', { namespace }) liquidityBalance!: CodecString
  @Getter('firstTokenBalance', { namespace }) firstTokenBalance!: CodecString
  @Getter('secondTokenBalance', { namespace }) secondTokenBalance!: CodecString
  @Getter('shareOfPool', { namespace }) shareOfPool!: string
  @Getter('tokenXOR', { namespace: 'assets' }) tokenXOR!: AccountAsset
  @Getter('price', { namespace: 'prices' }) price!: string
  @Getter('priceReversed', { namespace: 'prices' }) priceReversed!: string

  @Action('setLiquidity', { namespace }) setLiquidity!: ({ firstAddress, secondAddress }: { firstAddress: string; secondAddress: string }) => Promise<void>
  @Action('setRemovePart', { namespace }) setRemovePart!: (removePart: number) => Promise<void>
  @Action('setFirstTokenAmount', { namespace }) setFirstTokenAmount!: (amount: string) => Promise<void>
  @Action('setSecondTokenAmount', { namespace }) setSecondTokenAmount!: (amount: string) => Promise<void>
  @Action('setFocusedField', { namespace }) setFocusedField!: (field: string) => Promise<void>
  @Action('resetFocusedField', { namespace }) resetFocusedField!: AsyncVoidFn
  @Action('removeLiquidity', { namespace }) removeLiquidity!: AsyncVoidFn
  @Action('resetData', { namespace }) resetData!: AsyncVoidFn
  @Action('getPrices', { namespace: 'prices' }) getPrices!: (options: any) => Promise<void>
  @Action('resetPrices', { namespace: 'prices' }) resetPrices!: AsyncVoidFn

  @Watch('removePart')
  private removePartChange (newValue: number): void {
    this.handleRemovePartChange(String(newValue))
  }

  @Watch('liquidity')
  private liquidityChange (): void {
    this.updatePrices()

    switch (this.focusedField) {
      case 'firstTokenAmount':
      case 'secondTokenAmount': {
        const isFirstToken = this.focusedField === 'firstTokenAmount'

        const balance = Number(this.getTokenMaxAmount(isFirstToken ? this.firstTokenBalance : this.secondTokenBalance))
        const amount = Number(isFirstToken ? this.firstTokenAmount : this.secondTokenAmount)

        const setValue = isFirstToken ? this.setFirstTokenAmount : this.setSecondTokenAmount
        const value = String(Number.isFinite(balance) ? Math.min(balance, amount) : amount)

        setValue(value)
        break
      }
      default: {
        this.handleRemovePartChange(String(this.removePart))
      }
    }
  }

  removePartInput = 0
  sliderInput: any
  sliderDragButton: any

  async mounted (): Promise<void> {
    await this.withParentLoading(async () => {
      await this.setLiquidity({
        firstAddress: this.firstTokenAddress,
        secondAddress: this.secondTokenAddress
      })
      // If user don't have the liquidity (navigated through the address bar) redirect to the Pool page
      if (!this.liquidity) {
        return this.handleBack()
      }
      this.updatePrices()
      this.addListenerToSliderDragButton()
    })
  }

  async beforeDestroy (): Promise<void> {
    this.removeListenerFromSliderDragButton()
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
    return hasInsufficientXorForFee(this.tokenXOR, this.networkFee)
  }

  get removePartCharClass (): string {
    const charClassName = ({
      3: 'three',
      2: 'two'
    })[this.removePartInput.toString().length] ?? 'one'

    return `${charClassName}-char`
  }

  get networkFee (): CodecString {
    return this.networkFees[Operation.RemoveLiquidity]
  }

  get formattedFee (): string {
    return this.formatCodecNumber(this.networkFee)
  }

  handleRemovePartChange (value: string): void {
    const newValue = parseFloat(value) || 0
    this.removePartInput = Math.min(Math.max(newValue, 0), 100)
    this.setRemovePart(this.removePartInput)
  }

  focusSliderInput (): void {
    this.setFocusedField('removePart')
    if (this.sliderInput) {
      this.sliderInput.focus()
    }
  }

  getTokenMaxAmount (tokenBalance: CodecString, decimals?: number): string | undefined {
    if (!tokenBalance) {
      return undefined
    }
    return this.getStringFromCodec(tokenBalance, decimals)
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

  private addListenerToSliderDragButton (): void {
    this.sliderDragButton = this.$el.querySelector('.slider-container .el-slider__button')
    this.sliderInput = this.$el.querySelector('.s-input--remove-part .el-input__inner')

    if (this.sliderDragButton) {
      this.sliderDragButton.addEventListener('mousedown', this.focusSliderInput)
    }
  }

  private removeListenerFromSliderDragButton (): void {
    if (this.sliderDragButton) {
      this.$el.removeEventListener('mousedown', this.sliderDragButton)
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
